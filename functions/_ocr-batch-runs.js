import { assertAdmin, jsonResponse, randomId, auditStatement } from "./_dashboard-utils.js";
import { preflightOcrScheduler, triggerOcrScheduler } from "./_ocr-scheduler-config.js";

const MAX_BATCH_TARGET = 100;
const MAX_RUN_LIMIT = 5;
const PAUSED_BATCH_STATUSES = new Set(["paused_rate_limit", "paused_quota"]);

export async function handleStartOcrBatchRun(db, auth, data, env, options = {}) {
  assertAdmin(auth);
  if (!textOrNull(env.OCR_KEY)) {
    return jsonResponse({ success: false, error: "OCR_KEY_REQUIRED", message: "Tambahkan Cloudflare Pages secret OCR_KEY sebelum menjalankan OCR." }, { status: 400 });
  }
  if (!await hasRunnableOcrProvider(db)) {
    return jsonResponse({
      success: false,
      error: "OCR_PROVIDER_REQUIRED",
      message: "Aktifkan minimal satu provider OCR yang sudah memiliki credential sebelum menjalankan batch.",
    }, { status: 400 });
  }
  const preflight = await preflightOcrScheduler(db, env, { providerKey: data.scheduler_provider_key });
  if (!preflight.ok) {
    return jsonResponse({
      success: false,
      error: "OCR_SCHEDULER_PREFLIGHT_FAILED",
      message: preflight.message || "Preflight scheduler OCR gagal. Perbaiki scheduler sebelum menjalankan batch besar.",
      preflight,
    }, { status: 400 });
  }

  const targetCount = Math.min(Math.max(Number(data.target_count || MAX_BATCH_TARGET), 1), MAX_BATCH_TARGET);
  const batchId = `ocrbatch_${randomId()}`;
  await ensurePendingJobsForBatch(db, auth, targetCount);
  const assignedJobs = await assignPendingJobsToBatch(db, auth, batchId, targetCount);
  if (!assignedJobs.length) {
    return jsonResponse({
      success: false,
      error: "OCR_BATCH_NO_JOBS",
      message: "Belum ada job pending untuk diproses. Klik Antrekan 100 terlebih dahulu atau pastikan masih ada brosur gambar yang belum punya hasil OCR.",
    }, { status: 404 });
  }

  const batch = {
    id: batchId,
    target_count: targetCount,
    assigned_count: assignedJobs.length,
  };
  await db.batch([
    db
      .prepare(
        `INSERT INTO ocr_batch_runs (
           id, status, target_count, assigned_count, requested_by_user_id, started_at, last_message
         ) VALUES (?, 'queued', ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      )
      .bind(batchId, targetCount, assignedJobs.length, auth.id, "Batch OCR dibuat dan menunggu trigger scheduler pihak ketiga."),
    auditStatement(db, "dashboard.ocr_batch.start", "ocr_batch_runs", batchId, {
      target_count: targetCount,
      assigned_count: assignedJobs.length,
      scheduler_provider_key: data.scheduler_provider_key || "",
    }, auth.id),
  ]);

  const trigger = await triggerOcrScheduler(db, env, batch, {
    providerKey: data.scheduler_provider_key,
    delay: options.delay || "10s",
    limit: MAX_RUN_LIMIT,
  });
  await updateBatchAfterTrigger(db, batchId, trigger, trigger.triggered ? "queued" : "failed");

  return jsonResponse({
    success: true,
    batch_id: batchId,
    assigned_count: assignedJobs.length,
    preflight,
    scheduler: trigger,
  });
}

export async function handleRetryOcrBatchRun(db, auth, data, env, options = {}) {
  assertAdmin(auth);
  const batch = await db.prepare("SELECT * FROM ocr_batch_runs WHERE id = ? LIMIT 1").bind(data.batch_id).first();
  if (!batch) {
    return jsonResponse({ success: false, error: "OCR_BATCH_NOT_FOUND", message: "Batch OCR tidak ditemukan." }, { status: 404 });
  }
  if (["completed", "cancelled"].includes(batch.status)) {
    return jsonResponse({
      success: false,
      error: "OCR_BATCH_NOT_RETRYABLE",
      message: "Batch yang sudah selesai atau dibatalkan tidak perlu dijadwalkan ulang.",
    }, { status: 409 });
  }
  if (!await hasRunnableOcrProvider(db)) {
    return jsonResponse({
      success: false,
      error: "OCR_PROVIDER_REQUIRED",
      message: "Aktifkan minimal satu provider OCR yang sudah memiliki credential sebelum retry batch.",
    }, { status: 400 });
  }

  const reset = await resetFailedJobsInBatch(db, batch.id, auth.id);
  const trigger = await triggerOcrScheduler(db, env, batch, {
    providerKey: data.scheduler_provider_key,
    delay: options.delay || "10s",
    limit: MAX_RUN_LIMIT,
  });
  await db.batch([
    db
      .prepare(
        `UPDATE ocr_batch_runs
         SET status = ?, last_message = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(trigger.triggered ? "queued" : "failed", trigger.message || "Retry scheduler batch selesai.", batch.id),
    auditStatement(db, "dashboard.ocr_batch.retry_schedule", "ocr_batch_runs", batch.id, {
      scheduler_provider_key: trigger.provider_key || data.scheduler_provider_key || "",
      triggered: Boolean(trigger.triggered),
      message: trigger.message || "",
      reset_failed_jobs: reset,
    }, auth.id),
  ]);
  return jsonResponse({ success: true, batch_id: batch.id, reset_failed_jobs: reset, scheduler: trigger });
}

export async function refreshBatchProgress(db, batchId, options = {}) {
  const id = textOrNull(batchId);
  if (!id) return null;
  const counts = await db
    .prepare(
      `SELECT status, COUNT(*) count
       FROM ocr_jobs
       WHERE batch_id = ?
       GROUP BY status`,
    )
    .bind(id)
    .all();
  const byStatus = Object.fromEntries((counts.results || []).map((row) => [row.status, Number(row.count || 0)]));
  const processed = Number(byStatus.succeeded || 0) + Number(byStatus.failed || 0) + Number(byStatus.needs_review || 0) + Number(byStatus.cancelled || 0);
  const assigned = processed + Number(byStatus.pending || 0) + Number(byStatus.running || 0);
  const completed = assigned > 0 && processed >= assigned;
  const failed = assigned > 0 && !Number(byStatus.pending || 0) && !Number(byStatus.running || 0) && Number(byStatus.succeeded || 0) === 0 && (Number(byStatus.failed || 0) > 0);
  const requestedStatus = textOrNull(options.status);
  const canPause = requestedStatus && PAUSED_BATCH_STATUSES.has(requestedStatus) && !completed;
  const nextStatus = canPause ? requestedStatus : completed ? (failed ? "failed" : "completed") : "running";
  const message = options.message || (completed ? "Batch OCR selesai." : "Batch OCR masih berjalan.");
  await db
    .prepare(
      `UPDATE ocr_batch_runs
       SET status = ?, assigned_count = ?, processed_count = ?, succeeded_count = ?,
           failed_count = ?, needs_review_count = ?, skipped_count = ?,
           last_run_at = CURRENT_TIMESTAMP,
           completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE completed_at END,
           last_message = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(
      nextStatus,
      assigned,
      processed,
      Number(byStatus.succeeded || 0),
      Number(byStatus.failed || 0),
      Number(byStatus.needs_review || 0),
      Number(byStatus.cancelled || 0),
      completed ? 1 : 0,
      message,
      id,
    )
    .run();
  const batch = await db.prepare("SELECT * FROM ocr_batch_runs WHERE id = ? LIMIT 1").bind(id).first();
  return batch ? maskBatchRow(batch) : null;
}

export function maskBatchRow(row) {
  return {
    id: row.id,
    status: row.status || "queued",
    target_count: Number(row.target_count || 0),
    assigned_count: Number(row.assigned_count || 0),
    processed_count: Number(row.processed_count || 0),
    succeeded_count: Number(row.succeeded_count || 0),
    failed_count: Number(row.failed_count || 0),
    needs_review_count: Number(row.needs_review_count || 0),
    skipped_count: Number(row.skipped_count || 0),
    scheduler_provider_key: row.scheduler_provider_key || "",
    scheduler_external_id: row.scheduler_external_id || "",
    last_message: row.last_message || "",
    started_at: row.started_at || null,
    last_run_at: row.last_run_at || null,
    completed_at: row.completed_at || null,
    cancelled_at: row.cancelled_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

async function updateBatchAfterTrigger(db, batchId, trigger, fallbackStatus) {
  if (trigger.triggered) return;
  await db
    .prepare("UPDATE ocr_batch_runs SET status = ?, last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(fallbackStatus, trigger.message || "Batch siap. Jalankan manual atau aktifkan scheduler pihak ketiga.", batchId)
    .run();
}

async function resetFailedJobsInBatch(db, batchId, userId) {
  const result = await db
    .prepare(
      `UPDATE ocr_jobs
       SET status = 'pending', provider_key = NULL, error_message = NULL,
           started_at = NULL, completed_at = NULL, requested_by_user_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE batch_id = ?
         AND status = 'failed'`,
    )
    .bind(userId, batchId)
    .run();
  return Number(result?.meta?.changes || 0);
}

async function hasRunnableOcrProvider(db) {
  const row = await db
    .prepare(
      `SELECT provider_key
       FROM ocr_provider_configs
       WHERE is_enabled = 1
         AND COALESCE(api_key, '') <> ''
         AND COALESCE(health_status, 'ready') = 'ready'
         AND (cooldown_until IS NULL OR datetime(cooldown_until) <= CURRENT_TIMESTAMP)
       LIMIT 1`,
    )
    .first();
  return Boolean(row?.provider_key);
}

async function ensurePendingJobsForBatch(db, auth, targetCount) {
  const pending = await db.prepare("SELECT COUNT(*) count FROM ocr_jobs WHERE status = 'pending' AND batch_id IS NULL").first();
  const needed = Math.max(0, targetCount - Number(pending?.count || 0));
  if (!needed) return 0;

  const rows = await db
    .prepare(
      `SELECT a.id asset_id, a.franchise_id, COALESCE(a.public_url, a.legacy_url) source_url,
              a.mime_type, COALESCE(a.display_order, 0) display_order
       FROM franchise_assets a
       LEFT JOIN ocr_jobs j ON j.asset_id = a.id
       LEFT JOIN franchise_asset_knowledge k ON k.asset_id = a.id
       WHERE a.asset_type = 'proposal'
         AND a.status = 'active'
         AND COALESCE(a.public_url, a.legacy_url, '') <> ''
         AND LOWER(COALESCE(a.mime_type, '')) LIKE 'image/%'
         AND j.id IS NULL
         AND COALESCE(k.extraction_status, '') NOT IN ('extracted')
       ORDER BY a.franchise_id, COALESCE(a.display_order, 0), a.created_at
       LIMIT ?`,
    )
    .bind(needed)
    .all();
  const statements = [];
  let currentFranchiseId = "";
  let franchiseIndex = -1;
  for (const row of rows.results || []) {
    if (!isSafeExternalUrl(row.source_url)) continue;
    if (row.franchise_id !== currentFranchiseId) {
      currentFranchiseId = row.franchise_id;
      franchiseIndex += 1;
    }
    statements.push(
      db
        .prepare(
          `INSERT INTO ocr_jobs (
             id, asset_id, franchise_id, status, priority, source_url, mime_type, requested_by_user_id
           ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
           ON CONFLICT(asset_id) DO NOTHING`,
        )
        .bind(
          `ocrjob_${randomId()}`,
          row.asset_id,
          row.franchise_id,
          100 + (franchiseIndex * 1000) + Number(row.display_order || 0),
          row.source_url,
          row.mime_type || null,
          auth.id,
        ),
    );
  }
  if (statements.length) await db.batch(statements);
  return statements.length;
}

async function assignPendingJobsToBatch(db, auth, batchId, targetCount) {
  const rows = await db
    .prepare(
      `SELECT id, asset_id, franchise_id
       FROM ocr_jobs
       WHERE status = 'pending'
         AND batch_id IS NULL
       ORDER BY franchise_id, priority, created_at
       LIMIT ?`,
    )
    .bind(targetCount)
    .all();
  const jobs = rows.results || [];
  if (!jobs.length) return [];
  await db.batch(jobs.map((job) => db
    .prepare(
      `UPDATE ocr_jobs
       SET batch_id = ?, requested_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'pending' AND batch_id IS NULL`,
    )
    .bind(batchId, auth.id, job.id)));
  return jobs;
}

function isSafeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch (_error) {
    return false;
  }
}

function textOrNull(value) {
  const normalized = (value ?? "").toString().trim();
  return normalized || null;
}
