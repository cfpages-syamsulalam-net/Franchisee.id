import { assertAdmin, isAdmin, jsonResponse, auditStatement } from "./_dashboard-utils.js";
import {
  credentialLooksEncrypted,
  decryptCredentialValue,
  hasStoredCredential,
  prepareStoredCredential,
} from "./_ocr-credential-crypto.js";

const SCHEDULER_TABLE_ERROR = /ocr_scheduler_configs|ocr_batch_runs|batch_id|no such table|no such column/i;
const DEFAULT_WORKER_URL = "https://franchisee.id/ocr-worker";
const QSTASH_PUBLISH_URL = "https://qstash.upstash.io/v2/publish/";
const QSTASH_NEXT_DELAY = "75s";

export const OCR_SCHEDULER_PROVIDER_KEYS = ["upstash_qstash", "cron_job_org", "inngest", "trigger_dev"];

export async function getOcrSchedulerState(db, auth, env = {}) {
  if (!isAdmin(auth)) return { admin_only: true, migration_required: false, providers: [], active_provider_count: 0 };
  try {
    const rows = await db
      .prepare(
        `SELECT provider_key, display_name, provider_type, endpoint_url, schedule_external_id,
                schedule_cron, request_url, request_body, is_enabled, health_status,
                last_error, last_checked_at, api_key, api_secret, updated_at
         FROM ocr_scheduler_configs
         ORDER BY CASE provider_key
           WHEN 'upstash_qstash' THEN 1
           WHEN 'cron_job_org' THEN 2
           WHEN 'inngest' THEN 3
           WHEN 'trigger_dev' THEN 4
           ELSE 99
         END, display_name`,
      )
      .all();
    const providers = (rows.results || []).map(maskSchedulerProvider);
    return {
      admin_only: false,
      migration_required: false,
      worker_url: resolveWorkerUrl(env),
      providers,
      active_provider_count: providers.filter((provider) => provider.is_enabled && provider.has_api_key).length,
      recommended_provider_key: "upstash_qstash",
    };
  } catch (error) {
    if (SCHEDULER_TABLE_ERROR.test(error?.message || "")) {
      return { admin_only: false, migration_required: true, providers: [], active_provider_count: 0 };
    }
    throw error;
  }
}

export async function handleUpdateOcrSchedulerConfig(db, auth, data, env = {}) {
  assertAdmin(auth);
  if (!data.provider_key) {
    return jsonResponse({ success: false, error: "OCR_SCHEDULER_PROVIDER_REQUIRED", message: "Pilih provider scheduler terlebih dahulu." }, { status: 400 });
  }
  const current = await loadSchedulerConfig(db, data.provider_key);
  if (!current) {
    return jsonResponse({ success: false, error: "OCR_SCHEDULER_PROVIDER_NOT_FOUND", message: "Provider scheduler tidak ditemukan." }, { status: 404 });
  }
  const rootSecret = env.OCR_KEY;
  const apiKey = await prepareStoredCredential({
    currentValue: current.api_key,
    newValue: data.api_key,
    clear: data.clear_api_key,
    rootSecret,
    aad: schedulerCredentialAad(data.provider_key, "api_key"),
  });
  const apiSecret = await prepareStoredCredential({
    currentValue: current.api_secret,
    newValue: data.api_secret,
    clear: data.clear_api_secret,
    rootSecret,
    aad: schedulerCredentialAad(data.provider_key, "api_secret"),
  });
  const nextEnabled = Boolean(data.is_enabled && apiKey);
  const nextHealth = nextEnabled ? "ready" : apiKey ? "disabled" : "unconfigured";
  const requestUrl = textOrNull(data.request_url) || current.request_url || resolveWorkerUrl(env);
  const requestBody = textOrNull(data.request_body) || current.request_body || defaultRequestBody(data.provider_key);

  await db.batch([
    db
      .prepare(
        `UPDATE ocr_scheduler_configs
         SET api_key = ?, api_secret = ?, endpoint_url = ?, schedule_cron = ?,
             request_url = ?, request_body = ?, is_enabled = ?, health_status = ?,
             last_error = CASE WHEN ? = 1 THEN NULL ELSE last_error END,
             updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE provider_key = ?`,
      )
      .bind(
        apiKey,
        apiSecret,
        textOrNull(data.endpoint_url) || current.endpoint_url,
        textOrNull(data.schedule_cron) || current.schedule_cron,
        requestUrl,
        requestBody,
        nextEnabled ? 1 : 0,
        nextHealth,
        nextEnabled ? 1 : 0,
        auth.id,
        data.provider_key,
      ),
    auditStatement(db, "dashboard.ocr_scheduler.update", "ocr_scheduler_configs", data.provider_key, {
      provider_key: data.provider_key,
      enabled: nextEnabled,
      has_api_key: Boolean(apiKey),
    }, auth.id),
  ]);
  return jsonResponse({ success: true, provider_key: data.provider_key, is_enabled: nextEnabled });
}

export async function handleToggleOcrSchedulerEnabled(db, auth, data) {
  assertAdmin(auth);
  const current = await loadSchedulerConfig(db, data.provider_key);
  if (!current) {
    return jsonResponse({ success: false, error: "OCR_SCHEDULER_PROVIDER_NOT_FOUND", message: "Provider scheduler tidak ditemukan." }, { status: 404 });
  }
  if (data.is_enabled && !hasStoredCredential(current.api_key)) {
    return jsonResponse({
      success: false,
      error: "OCR_SCHEDULER_CREDENTIAL_REQUIRED",
      message: "Isi token/API key provider scheduler sebelum mengaktifkannya.",
    }, { status: 400 });
  }
  await db.batch([
    db
      .prepare(
        `UPDATE ocr_scheduler_configs
         SET is_enabled = ?, health_status = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE provider_key = ?`,
      )
      .bind(data.is_enabled ? 1 : 0, data.is_enabled ? "ready" : "disabled", auth.id, data.provider_key),
    auditStatement(db, "dashboard.ocr_scheduler.toggle", "ocr_scheduler_configs", data.provider_key, {
      provider_key: data.provider_key,
      enabled: Boolean(data.is_enabled),
    }, auth.id),
  ]);
  return jsonResponse({ success: true, provider_key: data.provider_key, is_enabled: Boolean(data.is_enabled) });
}

export async function triggerOcrScheduler(db, env, batch, options = {}) {
  const provider = await loadPreferredScheduler(db, options.providerKey);
  if (!provider) {
    return { triggered: false, provider_key: "", message: "Belum ada scheduler pihak ketiga yang aktif. Jalankan batch manual atau aktifkan Upstash QStash." };
  }
  if (provider.provider_key === "upstash_qstash") {
    return triggerQstash(db, env, provider, batch, options);
  }
  return {
    triggered: false,
    provider_key: provider.provider_key,
    message: `${provider.display_name} sudah aktif sebagai trigger eksternal. Pastikan provider tersebut memanggil /ocr-worker secara berkala.`,
  };
}

export async function preflightOcrScheduler(db, env, options = {}) {
  const provider = await loadPreferredScheduler(db, options.providerKey);
  if (!provider) {
    return {
      ok: false,
      provider_key: "",
      message: "Belum ada scheduler pihak ketiga yang aktif. Aktifkan Upstash QStash sebelum menjalankan batch OCR besar.",
    };
  }
  if (provider.provider_key === "upstash_qstash") {
    return preflightQstash(db, env, provider);
  }
  return {
    ok: false,
    provider_key: provider.provider_key,
    message: `${provider.display_name} belum punya preflight otomatis di dashboard ini. Gunakan Upstash QStash untuk batch OCR 100 yang dijalankan dari dashboard.`,
  };
}

async function triggerQstash(db, env, provider, batch, options = {}) {
  const token = normalizeBearerToken(await readSchedulerApiKey(env, provider, "api_key"));
  const workerSecret = textOrNull(env.OCR_SECRET);
  if (!token || !workerSecret) {
    const message = !workerSecret
      ? "Cloudflare Pages secret OCR_SECRET belum tersedia untuk worker OCR."
      : "Token Upstash QStash belum tersimpan.";
    await markSchedulerFailure(db, provider.provider_key, message);
    return { triggered: false, provider_key: provider.provider_key, message };
  }
  const workerUrl = normalizeWorkerUrl(textOrNull(provider.request_url) || resolveWorkerUrl(env));
  if (!workerUrl) {
    const message = "Worker URL scheduler tidak valid. Gunakan URL lengkap, contoh: https://franchisee.id/ocr-worker.";
    await markSchedulerFailure(db, provider.provider_key, message);
    return { triggered: false, provider_key: provider.provider_key, message };
  }
  const body = {
    source: "upstash_qstash",
    batch_id: batch.id,
    limit: options.limit || 5,
  };
  const response = await fetch(`${QSTASH_PUBLISH_URL}${workerUrl}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Forward-Authorization": `Bearer ${workerSecret}`,
      "Upstash-Delay": options.delay || QSTASH_NEXT_DELAY,
    },
    body: JSON.stringify(body),
  });
  const responseText = await response.text().catch(() => "");
  if (!response.ok) {
    const authHint = response.status === 401 ? " Pastikan token yang disimpan adalah QSTASH_TOKEN dari Upstash, bukan signing key, current signing key, atau URL endpoint." : "";
    const message = cleanError(`Upstash QStash gagal menjadwalkan OCR (${response.status}): ${responseText || response.statusText}${authHint}`);
    await markSchedulerFailure(db, provider.provider_key, message);
    return { triggered: false, provider_key: provider.provider_key, message };
  }
  await db.batch([
    db
      .prepare(
        `UPDATE ocr_scheduler_configs
         SET health_status = 'ready', last_error = NULL, last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE provider_key = ?`,
      )
      .bind(provider.provider_key),
    db
      .prepare(
        `UPDATE ocr_batch_runs
         SET scheduler_provider_key = ?, scheduler_external_id = ?, last_message = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(provider.provider_key, qstashMessageId(responseText), `Trigger QStash terjadwal (${options.delay || QSTASH_NEXT_DELAY}).`, batch.id),
  ]);
  return {
    triggered: true,
    provider_key: provider.provider_key,
    message: `Trigger QStash terjadwal (${options.delay || QSTASH_NEXT_DELAY}).`,
  };
}

async function preflightQstash(db, env, provider) {
  const token = normalizeBearerToken(await readSchedulerApiKey(env, provider, "api_key"));
  const workerSecret = textOrNull(env.OCR_SECRET);
  if (!token || !workerSecret) {
    const message = !workerSecret
      ? "Cloudflare Pages secret OCR_SECRET belum tersedia untuk worker OCR."
      : "Token Upstash QStash belum tersimpan.";
    await markSchedulerFailure(db, provider.provider_key, message);
    return { ok: false, provider_key: provider.provider_key, message };
  }
  const workerUrl = normalizeWorkerUrl(textOrNull(provider.request_url) || resolveWorkerUrl(env));
  if (!workerUrl) {
    const message = "Worker URL scheduler tidak valid. Gunakan URL lengkap, contoh: https://franchisee.id/ocr-worker.";
    await markSchedulerFailure(db, provider.provider_key, message);
    return { ok: false, provider_key: provider.provider_key, message };
  }
  const response = await fetch(`${QSTASH_PUBLISH_URL}${workerUrl}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Forward-Authorization": `Bearer ${workerSecret}`,
    },
    body: JSON.stringify({
      source: "upstash_qstash",
      preflight: true,
      limit: 1,
    }),
  });
  const responseText = await response.text().catch(() => "");
  if (!response.ok) {
    const authHint = response.status === 401 ? " Pastikan token yang disimpan adalah QSTASH_TOKEN dari Upstash, bukan signing key, current signing key, atau URL endpoint." : "";
    const message = cleanError(`Preflight Upstash QStash gagal (${response.status}): ${responseText || response.statusText}${authHint}`);
    await markSchedulerFailure(db, provider.provider_key, message);
    return { ok: false, provider_key: provider.provider_key, message };
  }
  await db
    .prepare(
      `UPDATE ocr_scheduler_configs
       SET health_status = 'ready', last_error = NULL, last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE provider_key = ?`,
    )
    .bind(provider.provider_key)
    .run();
  return {
    ok: true,
    provider_key: provider.provider_key,
    message: "Preflight scheduler OCR berhasil. Batch aman dibuat.",
  };
}

export async function loadPreferredScheduler(db, providerKey = "") {
  const scoped = textOrNull(providerKey);
  const query = scoped
    ? `SELECT * FROM ocr_scheduler_configs WHERE provider_key = ? AND is_enabled = 1 AND COALESCE(api_key, '') <> '' LIMIT 1`
    : `SELECT * FROM ocr_scheduler_configs
       WHERE is_enabled = 1 AND COALESCE(api_key, '') <> ''
       ORDER BY CASE provider_key WHEN 'upstash_qstash' THEN 1 WHEN 'cron_job_org' THEN 2 WHEN 'inngest' THEN 3 WHEN 'trigger_dev' THEN 4 ELSE 99 END
       LIMIT 1`;
  const statement = db.prepare(query);
  return scoped ? statement.bind(scoped).first() : statement.first();
}

export async function readSchedulerApiKey(env, provider, fieldName) {
  const value = provider?.[fieldName];
  if (!hasStoredCredential(value)) return "";
  return decryptCredentialValue(env.OCR_KEY, value, schedulerCredentialAad(provider.provider_key, fieldName));
}

export function resolveWorkerUrl(env = {}) {
  return textOrNull(env.OCR_WORKER_URL) || DEFAULT_WORKER_URL;
}

export function schedulerCredentialAad(providerKey, fieldName) {
  return `ocr_scheduler_configs:${providerKey}:${fieldName}`;
}

function maskSchedulerProvider(row) {
  return {
    provider_key: row.provider_key,
    display_name: row.display_name,
    provider_type: row.provider_type,
    endpoint_url: row.endpoint_url || "",
    schedule_external_id: row.schedule_external_id || "",
    schedule_cron: row.schedule_cron || "",
    request_url: row.request_url || "",
    request_body: row.request_body || "",
    is_enabled: Boolean(row.is_enabled),
    health_status: row.health_status || "unconfigured",
    last_error: row.last_error || "",
    last_checked_at: row.last_checked_at || null,
    updated_at: row.updated_at || null,
    has_api_key: hasStoredCredential(row.api_key),
    has_api_secret: hasStoredCredential(row.api_secret),
    api_key_encrypted: credentialLooksEncrypted(row.api_key),
    api_secret_encrypted: credentialLooksEncrypted(row.api_secret),
  };
}

async function loadSchedulerConfig(db, providerKey) {
  return db.prepare("SELECT * FROM ocr_scheduler_configs WHERE provider_key = ? LIMIT 1").bind(providerKey).first();
}

async function markSchedulerFailure(db, providerKey, message) {
  await db
    .prepare(
      `UPDATE ocr_scheduler_configs
       SET health_status = 'failed', last_error = ?, last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE provider_key = ?`,
    )
    .bind(cleanError(message), providerKey)
    .run();
}

function qstashMessageId(responseText) {
  try {
    const parsed = JSON.parse(responseText || "{}");
    return parsed.messageId || parsed.message_id || parsed.id || null;
  } catch (_error) {
    return null;
  }
}

function defaultRequestBody(providerKey) {
  return JSON.stringify({ source: providerKey || "scheduled", limit: 5 });
}

function normalizeWorkerUrl(value) {
  const raw = textOrNull(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    return url.toString();
  } catch (_error) {
    return "";
  }
}

function normalizeBearerToken(value) {
  const raw = textOrNull(value) || "";
  return raw.replace(/^Bearer\s+/i, "").trim();
}

function textOrNull(value) {
  const normalized = (value ?? "").toString().trim();
  return normalized || null;
}

function cleanError(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 900);
}
