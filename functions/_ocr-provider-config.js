import { auditStatement, assertAdmin, jsonResponse } from "./_dashboard-utils.js";

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
                quota_reset_at, trial_ends_at, health_status, last_error,
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

export async function handleUpdateOcrProviderConfig(db, auth, data) {
  assertAdmin(auth);
  const current = await db
    .prepare("SELECT * FROM ocr_provider_configs WHERE provider_key = ? LIMIT 1")
    .bind(data.provider_key)
    .first();
  if (!current) return jsonResponse({ success: false, error: "OCR_PROVIDER_NOT_FOUND", message: "Provider OCR tidak ditemukan." }, { status: 404 });

  const apiKey = data.clear_api_key ? null : data.api_key || current.api_key || null;
  const apiSecret = data.clear_api_secret ? null : data.api_secret || current.api_secret || null;
  const missingRequirement = data.is_enabled ? providerRequirementError(data.provider_key, { ...data, apiKey, apiSecret }) : "";
  if (missingRequirement) {
    return jsonResponse({ success: false, error: "OCR_PROVIDER_CONFIG_INCOMPLETE", message: missingRequirement }, { status: 400 });
  }

  const healthStatus = data.is_enabled ? "ready" : apiKey ? "disabled" : "unconfigured";
  await db.batch([
    db
      .prepare(
        `UPDATE ocr_provider_configs
         SET api_key = ?, api_secret = ?, account_id = ?, endpoint_url = ?,
             region = ?, model = ?, priority = ?, is_enabled = ?,
             free_quota_limit = ?, free_quota_period = ?, quota_unit = ?,
             trial_ends_at = ?, health_status = ?, last_error = NULL,
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
        data.free_quota_limit || null,
        data.free_quota_period,
        data.quota_unit,
        textOrNull(data.trial_ends_at),
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
      free_quota_limit: data.free_quota_limit || null,
      free_quota_period: data.free_quota_period,
      quota_unit: data.quota_unit,
    }, auth.id),
  ]);

  return jsonResponse({
    success: true,
    provider: maskProviderConfig({
      ...current,
      ...data,
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

function providerRequirementError(providerKey, config) {
  if (!config.apiKey) return "Masukkan API key sebelum mengaktifkan provider ini.";
  if (providerKey === "azure_vision" && !config.endpoint_url) return "Masukkan endpoint resource Azure sebelum mengaktifkan provider ini.";
  if (providerKey === "cloudflare_workers_ai" && !config.account_id) return "Masukkan Cloudflare account ID sebelum mengaktifkan provider ini.";
  if (providerKey === "aws_textract" && (!config.apiSecret || !config.region)) return "Masukkan AWS secret access key dan region sebelum mengaktifkan Textract.";
  if (providerKey === "veryfi" && (!config.apiSecret || !config.account_id)) return "Masukkan Veryfi client ID dan username/secret sebelum mengaktifkan provider ini.";
  return "";
}
