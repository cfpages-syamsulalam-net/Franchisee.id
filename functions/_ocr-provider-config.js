import { auditStatement, assertAdmin, jsonResponse } from "./_dashboard-utils.js";
import { credentialAad, hasStoredCredential, prepareStoredCredential } from "./_ocr-credential-crypto.js";
import { getOcrProviderRequirementError } from "../src/lib/ocr-provider-metadata.js";

export async function getOcrProviderConfigs(db, auth) {
  if (!isAdmin(auth)) return { admin_only: true, providers: [] };
  try {
    const result = await db
      .prepare(
        `SELECT provider_key, display_name, provider_type,
                CASE WHEN COALESCE(api_key, '') <> '' THEN 1 ELSE 0 END AS has_api_key,
                CASE WHEN COALESCE(api_secret, '') <> '' THEN 1 ELSE 0 END AS has_api_secret,
                account_id, endpoint_url, region, model, priority, is_enabled,
                free_quota_limit, free_quota_period, quota_unit, quota_used,
                quota_reset_at, trial_ends_at, rate_limit_window_seconds,
                rate_limit_max_requests, cooldown_until, health_status, last_error,
                last_checked_at, updated_at
         FROM ocr_provider_configs
         ORDER BY priority, display_name`,
      )
      .all();
    return {
      admin_only: false,
      providers: (result.results || []).map(maskProviderConfig),
    };
  } catch (error) {
    if (/ocr_provider_configs|no such table/i.test(error?.message || "")) {
      return { admin_only: false, providers: [], migration_required: true };
    }
    throw error;
  }
}

export async function handleUpdateOcrProviderConfig(db, auth, data, env = {}) {
  assertAdmin(auth);
  const current = await db
    .prepare("SELECT * FROM ocr_provider_configs WHERE provider_key = ? LIMIT 1")
    .bind(data.provider_key)
    .first();
  if (!current) return jsonResponse({ success: false, error: "OCR_PROVIDER_NOT_FOUND", message: "Provider OCR tidak ditemukan." }, { status: 404 });

  let apiKey = null;
  let apiSecret = null;
  try {
    apiKey = await prepareStoredCredential({
      currentValue: current.api_key,
      newValue: data.api_key,
      clear: data.clear_api_key,
      rootSecret: env.OCR_KEY,
      aad: credentialAad(data.provider_key, "api_key"),
    });
    apiSecret = await prepareStoredCredential({
      currentValue: current.api_secret,
      newValue: data.api_secret,
      clear: data.clear_api_secret,
      rootSecret: env.OCR_KEY,
      aad: credentialAad(data.provider_key, "api_secret"),
    });
  } catch (error) {
    if (error?.message === "OCR_KEY_REQUIRED" || error?.message === "OCR_KEY_REQUIRED_FOR_PLAINTEXT_CREDENTIAL") {
      return jsonResponse({
        success: false,
        error: "OCR_KEY_REQUIRED",
        message: "Tambahkan Cloudflare Pages secret OCR_KEY sebelum menyimpan credential OCR.",
      }, { status: 400 });
    }
    throw error;
  }

  if (data.is_enabled && !textOrNull(env.OCR_KEY)) {
    return jsonResponse({
      success: false,
      error: "OCR_KEY_REQUIRED",
      message: "Tambahkan Cloudflare Pages secret OCR_KEY sebelum mengaktifkan provider OCR.",
    }, { status: 400 });
  }

  const apiKeyPresent = hasStoredCredential(apiKey);
  const apiSecretPresent = hasStoredCredential(apiSecret);
  const missingRequirement = data.is_enabled
    ? getOcrProviderRequirementError(data.provider_key, { ...data, apiKeyPresent, apiSecretPresent })
    : "";
  if (missingRequirement) {
    return jsonResponse({ success: false, error: "OCR_PROVIDER_CONFIG_INCOMPLETE", message: missingRequirement }, { status: 400 });
  }

  const healthStatus = data.is_enabled ? "ready" : apiKeyPresent ? "disabled" : "unconfigured";
  await db.batch([
    db
      .prepare(
        `UPDATE ocr_provider_configs
         SET api_key = ?, api_secret = ?, account_id = ?, endpoint_url = ?,
             region = ?, model = ?, priority = ?, is_enabled = ?,
             free_quota_limit = ?, free_quota_period = ?, quota_unit = ?,
             trial_ends_at = ?, health_status = ?, last_error = NULL, cooldown_until = NULL,
             updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE provider_key = ?`,
      )
      .bind(
        apiKey,
        apiSecret,
        textOrNull(data.account_id),
        textOrNull(data.endpoint_url),
        textOrNull(data.region),
        textOrNull(data.model),
        data.priority,
        data.is_enabled ? 1 : 0,
        current.free_quota_limit || null,
        current.free_quota_period || "account_specific",
        current.quota_unit || "requests",
        current.trial_ends_at || null,
        healthStatus,
        auth.id,
        data.provider_key,
      ),
    auditStatement(db, "dashboard.ocr_provider.update", "ocr_provider_configs", data.provider_key, {
      is_enabled: data.is_enabled,
      priority: data.priority,
      has_api_key: Boolean(apiKey),
      has_api_secret: Boolean(apiSecret),
      api_key_changed: Boolean(data.api_key || data.clear_api_key),
      api_secret_changed: Boolean(data.api_secret || data.clear_api_secret),
      credentials_encrypted: Boolean(apiKeyPresent || apiSecretPresent),
      free_quota_limit: current.free_quota_limit || null,
      free_quota_period: current.free_quota_period || "account_specific",
      quota_unit: current.quota_unit || "requests",
    }, auth.id),
  ]);

  return jsonResponse({
    success: true,
    provider: maskProviderConfig({
      ...current,
      ...data,
      free_quota_limit: current.free_quota_limit,
      free_quota_period: current.free_quota_period,
      quota_unit: current.quota_unit,
      quota_used: current.quota_used,
      quota_reset_at: current.quota_reset_at,
      trial_ends_at: current.trial_ends_at,
      api_key: apiKey,
      api_secret: apiSecret,
      health_status: healthStatus,
    }),
  });
}

function maskProviderConfig(row) {
  return {
    provider_key: row.provider_key,
    display_name: row.display_name,
    provider_type: row.provider_type,
    has_api_key: Boolean(row.has_api_key || row.api_key),
    has_api_secret: Boolean(row.has_api_secret || row.api_secret),
    account_id: row.account_id || "",
    endpoint_url: row.endpoint_url || "",
    region: row.region || "",
    model: row.model || "",
    priority: Number(row.priority || 100),
    is_enabled: Boolean(row.is_enabled),
    free_quota_limit: row.free_quota_limit === null || row.free_quota_limit === undefined ? null : Number(row.free_quota_limit),
    free_quota_period: row.free_quota_period || "account_specific",
    quota_unit: row.quota_unit || "requests",
    quota_used: Number(row.quota_used || 0),
    quota_reset_at: row.quota_reset_at || null,
      trial_ends_at: row.trial_ends_at || "",
    rate_limit_window_seconds: Number(row.rate_limit_window_seconds || 0),
    rate_limit_max_requests: Number(row.rate_limit_max_requests || 0),
    cooldown_until: row.cooldown_until || null,
    health_status: row.health_status || "unconfigured",
    last_error: row.last_error || "",
    last_checked_at: row.last_checked_at || null,
    updated_at: row.updated_at || null,
  };
}

function isAdmin(auth) {
  return (auth.roles || []).some((role) => role.role === "admin");
}

function textOrNull(value) {
  const normalized = (value ?? "").toString().trim();
  return normalized || null;
}
