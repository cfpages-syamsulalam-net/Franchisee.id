import {
  PREMIUM_BASE_AMOUNT,
  PREMIUM_PAYMENT,
} from "./_premium.js";
import { clampNumber, parseDateMillis, textOrNull } from "./_premium-ops-utils.js";

export const PREMIUM_SETTINGS_DEFAULTS = {
  grace_period_days: 3,
  grace_daily_email_enabled: 1,
  annual_report_enabled: 1,
  multi_brand_discount_enabled: 0,
  multi_brand_discount_percent: 0,
  multi_brand_min_owned_brands: 2,
  promo_enabled: 0,
  promo_discount_percent: 0,
  promo_label: "",
  promo_message: "",
  promo_bonus_text: "",
  promo_cta_label: "Lihat Premium",
  promo_cta_url: "/premium/",
  promo_starts_at: "",
  promo_ends_at: "",
};

const PREMIUM_NUMERIC_SETTINGS = new Set([
  "grace_period_days",
  "grace_daily_email_enabled",
  "annual_report_enabled",
  "multi_brand_discount_enabled",
  "multi_brand_discount_percent",
  "multi_brand_min_owned_brands",
  "promo_enabled",
  "promo_discount_percent",
]);

export async function loadActivePaymentMethod(db, code = "manual_bca") {
  try {
    const row = await db
      .prepare(
        `SELECT id, code, method_type, label, account_name, account_number, provider, instructions,
                sort_order, is_active, qris_image_url, qris_image_alt
         FROM payment_methods
         WHERE code = ? AND is_active = 1
         LIMIT 1`,
      )
      .bind(code)
      .first();
    return row || fallbackPaymentMethod();
  } catch (_error) {
    return fallbackPaymentMethod();
  }
}

export async function loadPaymentMethods(db) {
  try {
    const result = await db
      .prepare(
        `SELECT id, code, method_type, label, account_name, account_number, provider, instructions,
                sort_order, is_active, updated_at, qris_image_url, qris_image_alt
         FROM payment_methods
         ORDER BY is_active DESC, sort_order ASC, label ASC`,
      )
      .all();
    return result.results || [];
  } catch (_error) {
    return [fallbackPaymentMethod()];
  }
}

export function fallbackPaymentMethod() {
  return {
    id: "payment_method_manual_bca",
    code: "manual_bca",
    method_type: "bank_transfer",
    label: PREMIUM_PAYMENT.label,
    account_name: PREMIUM_PAYMENT.accountName,
    account_number: PREMIUM_PAYMENT.accountNumber,
    provider: PREMIUM_PAYMENT.bankName,
    instructions: PREMIUM_PAYMENT.instructions,
    qris_image_url: null,
    qris_image_alt: null,
    sort_order: 10,
    is_active: 1,
  };
}

export async function loadPremiumSettings(db) {
  const settings = { ...PREMIUM_SETTINGS_DEFAULTS };
  try {
    const result = await db
      .prepare(
        `SELECT setting_key, value_number, value_text
         FROM premium_settings`,
      )
      .all();
    for (const row of result.results || []) {
      if (!(row.setting_key in settings)) continue;
      settings[row.setting_key] = PREMIUM_NUMERIC_SETTINGS.has(row.setting_key)
        ? Number(row.value_number !== null && row.value_number !== undefined ? row.value_number : settings[row.setting_key] || 0)
        : textOrNull(row.value_text) || settings[row.setting_key] || "";
    }
  } catch (_error) {
    return settings;
  }
  return normalizePremiumSettings(settings);
}

export async function updatePremiumSettings(db, data, actorUserId = null) {
  const settings = normalizePremiumSettings(data || {});
  const statements = Object.keys(PREMIUM_SETTINGS_DEFAULTS).map((key) => {
    const isNumeric = PREMIUM_NUMERIC_SETTINGS.has(key);
    return db
      .prepare(
        `INSERT INTO premium_settings (setting_key, value_number, value_text, updated_by_user_id)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(setting_key) DO UPDATE SET
           value_number = excluded.value_number,
           value_text = excluded.value_text,
           updated_by_user_id = excluded.updated_by_user_id,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(key, isNumeric ? Number(settings[key] || 0) : null, isNumeric ? null : textOrNull(settings[key]) || "", actorUserId);
  });
  await db.batch(statements);
  return settings;
}

export async function premiumOrderPricing(db, actor, listing) {
  const settings = await loadPremiumSettings(db);
  const enabled = Number(settings.multi_brand_discount_enabled || 0) === 1;
  const percent = clampNumber(settings.multi_brand_discount_percent, 0, 90);
  const minOwnedBrands = Math.max(2, Math.floor(Number(settings.multi_brand_min_owned_brands || 2)));
  if (!enabled || percent <= 0) {
    return {
      base_amount: PREMIUM_BASE_AMOUNT,
      discount_amount: 0,
      discount_reason: null,
      settings,
    };
  }

  const ownedCount = await countOwnedListings(db, actor, listing);
  const discountAmount = ownedCount >= minOwnedBrands
    ? Math.round((PREMIUM_BASE_AMOUNT * percent) / 100)
    : 0;
  return {
    base_amount: PREMIUM_BASE_AMOUNT,
    discount_amount: discountAmount,
    discount_reason: discountAmount ? `Diskon multi-brand ${percent}%` : null,
    settings,
  };
}

export async function loadPublicPremiumPromo(db) {
  const settings = await loadPremiumSettings(db);
  if (Number(settings.promo_enabled || 0) !== 1) return { enabled: false };
  const now = Date.now();
  const startsAt = parseDateMillis(settings.promo_starts_at);
  const endsAt = parseDateMillis(settings.promo_ends_at);
  if (startsAt && now < startsAt) return { enabled: false };
  if (endsAt && now > endsAt) return { enabled: false };
  const discount = clampNumber(settings.promo_discount_percent, 0, 90);
  const bonus = textOrNull(settings.promo_bonus_text);
  const reason = textOrNull(settings.promo_label);
  const message = textOrNull(settings.promo_message)
    || [
      reason || "Promo Premium",
      discount ? `diskon ${discount}%` : "",
      bonus ? `bonus ${bonus}` : "",
    ].filter(Boolean).join(" - ");
  if (!message) return { enabled: false };
  return {
    enabled: true,
    label: reason || "Promo Premium",
    message,
    discount_percent: discount,
    bonus_text: bonus || "",
    cta_label: textOrNull(settings.promo_cta_label) || "Lihat Premium",
    cta_url: textOrNull(settings.promo_cta_url) || "/premium/",
    starts_at: textOrNull(settings.promo_starts_at) || "",
    ends_at: textOrNull(settings.promo_ends_at) || "",
  };
}

function normalizePremiumSettings(value) {
  const settings = { ...PREMIUM_SETTINGS_DEFAULTS, ...(value || {}) };
  return {
    grace_period_days: clampNumber(settings.grace_period_days, 0, 30),
    grace_daily_email_enabled: Number(settings.grace_daily_email_enabled) ? 1 : 0,
    annual_report_enabled: Number(settings.annual_report_enabled) ? 1 : 0,
    multi_brand_discount_enabled: Number(settings.multi_brand_discount_enabled) ? 1 : 0,
    multi_brand_discount_percent: clampNumber(settings.multi_brand_discount_percent, 0, 90),
    multi_brand_min_owned_brands: Math.max(2, Math.floor(Number(settings.multi_brand_min_owned_brands || 2))),
    promo_enabled: Number(settings.promo_enabled) ? 1 : 0,
    promo_discount_percent: clampNumber(settings.promo_discount_percent, 0, 90),
    promo_label: textOrNull(settings.promo_label) || "",
    promo_message: textOrNull(settings.promo_message) || "",
    promo_bonus_text: textOrNull(settings.promo_bonus_text) || "",
    promo_cta_label: textOrNull(settings.promo_cta_label) || "Lihat Premium",
    promo_cta_url: textOrNull(settings.promo_cta_url) || "/premium/",
    promo_starts_at: textOrNull(settings.promo_starts_at) || "",
    promo_ends_at: textOrNull(settings.promo_ends_at) || "",
  };
}

async function countOwnedListings(db, actor, listing) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM franchises
       WHERE owner_user_id = ?
          OR (? IS NOT NULL AND franchisor_profile_id = ?)`,
    )
    .bind(actor.id, listing?.franchisor_profile_id || null, listing?.franchisor_profile_id || null)
    .first()
    .catch(() => null);
  return Number(row?.count || 0);
}
