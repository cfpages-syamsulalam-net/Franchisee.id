const MAX_WORKER_SAFETY_CAP = 100_000;
const RESETTABLE_QUOTA_PERIODS = ["daily", "monthly", "compute_daily"];

export async function getOcrWorkerUsage(db, env = {}) {
  const capacity = await getActiveProviderQuotaCapacity(db);
  const safetyCap = boundedOptionalWorkerDailyCap(env.OCR_WORKER_DAILY_CAP);
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(units), 0) used
       FROM ocr_provider_usage_events
       WHERE status = 'counted'
         AND datetime(created_at) >= datetime(?)`,
    )
    .bind(midnight.toISOString())
    .first();
  const usedToday = Number(row?.used || 0);
  const hasOnlyUnknownQuotaProviders = capacity.known_count === 0 && capacity.unknown_count > 0;
  const knownRemaining = hasOnlyUnknownQuotaProviders ? MAX_WORKER_SAFETY_CAP : capacity.known_remaining;
  const safetyRemaining = safetyCap === null ? null : Math.max(0, safetyCap - usedToday);
  const remaining = safetyRemaining === null ? knownRemaining : Math.min(knownRemaining, safetyRemaining);
  const cap = safetyCap === null
    ? (hasOnlyUnknownQuotaProviders ? 0 : capacity.known_limit)
    : (hasOnlyUnknownQuotaProviders ? safetyCap : Math.min(capacity.known_limit, safetyCap));
  const used = safetyCap === null ? capacity.known_used : Math.max(cap - remaining, usedToday);
  const resetAt = capacity.next_reset_at || new Date(midnight.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const status = capacity.active_count <= 0
    ? "no_provider"
    : hasOnlyUnknownQuotaProviders
      ? "account_specific"
      : remaining <= 0
        ? "exhausted"
        : remaining <= Math.max(1, Math.floor(Math.max(cap, 1) * 0.2))
          ? "near_limit"
          : "available";
  return {
    cap,
    used,
    used_today: usedToday,
    remaining,
    reset_at: resetAt,
    status,
    active_provider_count: capacity.active_count,
    known_provider_count: capacity.known_count,
    unknown_provider_count: capacity.unknown_count,
    safety_cap: safetyCap,
    is_combined_provider_quota: safetyCap === null,
    has_only_unknown_quota_providers: hasOnlyUnknownQuotaProviders,
    providers: capacity.providers,
  };
}

export function providerQuotaCanReset(provider, now = new Date()) {
  const period = provider.free_quota_period || "account_specific";
  const resetAt = provider.quota_reset_at ? new Date(provider.quota_reset_at) : null;
  return Boolean(Number(provider.free_quota_limit || 0) && RESETTABLE_QUOTA_PERIODS.includes(period) && resetAt && resetAt <= now);
}

export async function prepareQuota(db, provider) {
  const limit = Number(provider.free_quota_limit || 0);
  const period = provider.free_quota_period || "account_specific";
  if (!limit) return { allowed: true };

  const now = new Date();
  if (provider.trial_ends_at && new Date(provider.trial_ends_at) < now) {
    return { allowed: false, reason: "Trial provider sudah berakhir." };
  }

  const resetAt = provider.quota_reset_at ? new Date(provider.quota_reset_at) : null;
  if (resetAt && resetAt <= now && RESETTABLE_QUOTA_PERIODS.includes(period)) {
    const nextReset = nextQuotaReset(period, now);
    await db
      .prepare("UPDATE ocr_provider_configs SET quota_used = 0, quota_reset_at = ?, health_status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE provider_key = ?")
      .bind(nextReset, provider.provider_key)
      .run();
    provider.quota_used = 0;
    provider.quota_reset_at = nextReset;
  } else if (!resetAt && RESETTABLE_QUOTA_PERIODS.includes(period)) {
    await db
      .prepare("UPDATE ocr_provider_configs SET quota_reset_at = ?, updated_at = CURRENT_TIMESTAMP WHERE provider_key = ?")
      .bind(nextQuotaReset(period, now), provider.provider_key)
      .run();
  }

  return Number(provider.quota_used || 0) < limit
    ? { allowed: true }
    : { allowed: false, reason: "Limit gratis provider sudah tercapai di sistem." };
}

export function quotaIncrementStatement(db, providerKey) {
  return db
    .prepare(
      `UPDATE ocr_provider_configs
       SET quota_used = COALESCE(quota_used, 0) + 1,
           last_checked_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE provider_key = ?`,
    )
    .bind(providerKey);
}

async function getActiveProviderQuotaCapacity(db) {
  const result = await db
    .prepare(
      `SELECT provider_key, display_name, free_quota_limit, free_quota_period, quota_unit,
              quota_used, quota_reset_at, is_enabled, health_status,
              CASE WHEN COALESCE(api_key, '') <> '' THEN 1 ELSE 0 END has_api_key
       FROM ocr_provider_configs
       WHERE is_enabled = 1
         AND COALESCE(api_key, '') <> ''
       ORDER BY priority, display_name`,
    )
    .all();
  const now = new Date();
  const providers = (result.results || []).map((provider) => providerQuotaSnapshot(provider, now));
  const knownProviders = providers.filter((provider) => Number(provider.limit || 0) > 0);
  const unknownProviders = providers.filter((provider) => !Number(provider.limit || 0));
  const nextReset = knownProviders
    .map((provider) => provider.reset_at ? new Date(provider.reset_at) : null)
    .filter((date) => date && date > now)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return {
    active_count: providers.length,
    known_count: knownProviders.length,
    unknown_count: unknownProviders.length,
    known_limit: knownProviders.reduce((sum, provider) => sum + Number(provider.limit || 0), 0),
    known_used: knownProviders.reduce((sum, provider) => sum + Number(provider.used || 0), 0),
    known_remaining: knownProviders.reduce((sum, provider) => sum + Number(provider.remaining || 0), 0),
    next_reset_at: nextReset ? nextReset.toISOString() : "",
    providers,
  };
}

function providerQuotaSnapshot(provider, now) {
  const limit = Number(provider.free_quota_limit || 0);
  const period = provider.free_quota_period || "account_specific";
  const resetAt = provider.quota_reset_at ? new Date(provider.quota_reset_at) : null;
  const shouldReset = Boolean(limit && RESETTABLE_QUOTA_PERIODS.includes(period) && resetAt && resetAt <= now);
  const used = shouldReset ? 0 : Number(provider.quota_used || 0);
  return {
    provider_key: provider.provider_key,
    display_name: provider.display_name || provider.provider_key,
    limit: limit || null,
    period,
    quota_unit: provider.quota_unit || "requests",
    used,
    remaining: limit ? Math.max(0, limit - used) : null,
    reset_at: shouldReset ? nextQuotaReset(period, now) : (provider.quota_reset_at || null),
    status: limit && used >= limit ? "exhausted" : provider.health_status || "ready",
  };
}

function boundedOptionalWorkerDailyCap(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(Math.max(Math.trunc(number), 1), MAX_WORKER_SAFETY_CAP);
}

function nextQuotaReset(period, now) {
  const next = new Date(now);
  if (period === "monthly") {
    next.setUTCMonth(next.getUTCMonth() + 1, 1);
    next.setUTCHours(0, 0, 0, 0);
    return next.toISOString();
  }
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString();
}
