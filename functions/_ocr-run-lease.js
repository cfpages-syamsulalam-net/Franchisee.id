import { auditStatement, assertAdmin, jsonResponse, randomId } from "./_dashboard-utils.js";

const CONTINUOUS_LEASE_KEY = "dashboard_continuous";
const LEASE_SECONDS = 90;

export async function getActiveOcrRunLease(db) {
  await cleanupExpiredLeases(db);
  const row = await db
    .prepare(
      `SELECT *
       FROM ocr_run_leases
       WHERE lease_key = ?
         AND datetime(expires_at) > CURRENT_TIMESTAMP
       LIMIT 1`,
    )
    .bind(CONTINUOUS_LEASE_KEY)
    .first();
  return maskLease(row);
}

export async function handleAcquireOcrRunLease(db, auth, data) {
  assertAdmin(auth);
  await cleanupExpiredLeases(db);
  const existing = await getActiveLeaseRow(db);
  if (existing) {
    return jsonResponse({
      success: false,
      error: "OCR_RUN_LEASE_ACTIVE",
      message: activeLeaseMessage(existing),
      active_run_lease: maskLease(existing),
    }, { status: 409 });
  }

  const runId = `ocrrun_${randomId()}`;
  const label = userLabel(auth);
  const insert = await db
    .prepare(
      `INSERT OR IGNORE INTO ocr_run_leases (
         lease_key, run_id, owner_user_id, owner_email, owner_label,
         acquired_at, heartbeat_at, expires_at, metadata
       )
       SELECT ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
              datetime(CURRENT_TIMESTAMP, '+' || ? || ' seconds'), ?
       WHERE NOT EXISTS (
         SELECT 1
         FROM ocr_run_leases
         WHERE lease_key = ?
           AND datetime(expires_at) > CURRENT_TIMESTAMP
       )`,
    )
    .bind(
      CONTINUOUS_LEASE_KEY,
      runId,
      auth.id || null,
      auth.primary_email || "",
      label,
      LEASE_SECONDS,
      JSON.stringify({ source: data.source || "dashboard" }),
      CONTINUOUS_LEASE_KEY,
    )
    .run();

  if (!Number(insert?.meta?.changes || 0)) {
    const active = await getActiveLeaseRow(db);
    return jsonResponse({
      success: false,
      error: "OCR_RUN_LEASE_ACTIVE",
      message: activeLeaseMessage(active),
      active_run_lease: maskLease(active),
    }, { status: 409 });
  }

  await db.batch([
    auditStatement(db, "dashboard.ocr_run_lease.acquire", "ocr_run_leases", runId, {
      lease_key: CONTINUOUS_LEASE_KEY,
      lease_seconds: LEASE_SECONDS,
    }, auth.id),
  ]);

  const lease = await getLeaseByRunId(db, runId);
  return jsonResponse({ success: true, lease: maskLease(lease), lease_seconds: LEASE_SECONDS });
}

export async function handleHeartbeatOcrRunLease(db, auth, data) {
  assertAdmin(auth);
  const result = await touchOcrRunLease(db, auth, data.lease_id);
  if (!result.ok) return leaseLostResponse(result.active);
  return jsonResponse({ success: true, lease: maskLease(result.lease), lease_seconds: LEASE_SECONDS });
}

export async function handleReleaseOcrRunLease(db, auth, data) {
  assertAdmin(auth);
  const leaseId = cleanLeaseId(data.lease_id);
  if (!leaseId) return jsonResponse({ success: true, released: false });
  const lease = await getLeaseByRunId(db, leaseId);
  const result = await db
    .prepare(
      `DELETE FROM ocr_run_leases
       WHERE lease_key = ?
         AND run_id = ?`,
    )
    .bind(CONTINUOUS_LEASE_KEY, leaseId)
    .run();
  const released = Number(result?.meta?.changes || 0) > 0;
  if (released) {
    await db.batch([
      auditStatement(db, "dashboard.ocr_run_lease.release", "ocr_run_leases", leaseId, {
        lease_key: CONTINUOUS_LEASE_KEY,
        owner_user_id: lease?.owner_user_id || "",
      }, auth.id),
    ]);
  }
  return jsonResponse({ success: true, released });
}

export async function requireOcrRunLease(db, auth, leaseId) {
  const result = await touchOcrRunLease(db, auth, leaseId);
  if (result.ok) return { ok: true, lease: maskLease(result.lease) };
  return {
    ok: false,
    response: leaseLostResponse(result.active),
  };
}

async function touchOcrRunLease(db, auth, leaseId) {
  const runId = cleanLeaseId(leaseId);
  if (!runId) {
    return { ok: false, active: await getActiveLeaseRow(db) };
  }
  await cleanupExpiredLeases(db);
  const update = await db
    .prepare(
      `UPDATE ocr_run_leases
       SET heartbeat_at = CURRENT_TIMESTAMP,
           expires_at = datetime(CURRENT_TIMESTAMP, '+' || ? || ' seconds')
       WHERE lease_key = ?
         AND run_id = ?
         AND owner_user_id = ?
         AND datetime(expires_at) > CURRENT_TIMESTAMP`,
    )
    .bind(LEASE_SECONDS, CONTINUOUS_LEASE_KEY, runId, auth.id || "")
    .run();
  if (!Number(update?.meta?.changes || 0)) {
    return { ok: false, active: await getActiveLeaseRow(db) };
  }
  return { ok: true, lease: await getLeaseByRunId(db, runId) };
}

async function cleanupExpiredLeases(db) {
  await db
    .prepare(
      `DELETE FROM ocr_run_leases
       WHERE datetime(expires_at) <= CURRENT_TIMESTAMP`,
    )
    .run();
}

async function getActiveLeaseRow(db) {
  return db
    .prepare(
      `SELECT *
       FROM ocr_run_leases
       WHERE lease_key = ?
         AND datetime(expires_at) > CURRENT_TIMESTAMP
       LIMIT 1`,
    )
    .bind(CONTINUOUS_LEASE_KEY)
    .first();
}

async function getLeaseByRunId(db, runId) {
  return db
    .prepare(
      `SELECT *
       FROM ocr_run_leases
       WHERE lease_key = ?
         AND run_id = ?
       LIMIT 1`,
    )
    .bind(CONTINUOUS_LEASE_KEY, runId)
    .first();
}

function leaseLostResponse(active) {
  return jsonResponse({
    success: false,
    error: "OCR_RUN_LEASE_REQUIRED",
    message: active
      ? activeLeaseMessage(active)
      : "Run OCR beruntun sudah kedaluwarsa atau dihentikan. Klik Jalankan OCR lagi untuk memulai ulang.",
    active_run_lease: maskLease(active),
  }, { status: 409 });
}

function activeLeaseMessage(row) {
  const label = row?.owner_label || row?.owner_email || "admin lain";
  return `OCR beruntun sedang berjalan oleh ${label}. Tunggu sampai selesai atau coba lagi setelah lease kedaluwarsa.`;
}

function maskLease(row) {
  if (!row) return null;
  return {
    run_id: row.run_id || "",
    owner_label: row.owner_label || row.owner_email || "Admin",
    acquired_at: row.acquired_at || null,
    heartbeat_at: row.heartbeat_at || null,
    expires_at: row.expires_at || null,
  };
}

function userLabel(auth) {
  return auth.display_name || auth.primary_email || auth.id || "Admin";
}

function cleanLeaseId(value) {
  const text = (value || "").toString().trim();
  return /^ocrrun_[a-f0-9]{16}$/i.test(text) ? text : "";
}
