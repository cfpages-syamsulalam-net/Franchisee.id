import {
  normalizeHakiStatusValue,
  normalizeRoyaltyBasisValue,
} from "./_shared-schemas.js";

export function franchiseBindValues(data, profileId, publicId, now, investment) {
  return [
    profileId,
    "site_franchisee_id",
    normalizeText(data.brand_name),
    textOrNull(data.category),
    publicId,
    now,
    intOrNull(data.year_established),
    textOrNull(data.city_origin),
    listingBrandCountry(data),
    textOrNull(data.outlet_type),
    listingTargetMarket(data),
    textOrNull(data.location_requirement),
    textOrNull(data.rent_cost),
    moneyOrNull(data.fee_license),
    moneyOrNull(data.fee_capex),
    moneyOrNull(data.fee_construction),
    investment,
    investment,
    intOrNull(data.estimated_bep_months),
    numberOrNull(data.net_profit_percent),
    numberOrNull(data.royalty_percent),
    normalizeRoyaltyBasis(data.royalty_basis),
    textOrNull(data.short_desc),
    textOrNull(data.full_desc),
    textOrNull(data.support_system),
    normalizeWhatsapp(data.whatsapp),
    textOrNull(data.logo_url),
    textOrNull(data.cover_url),
    textOrNull(data.gallery_urls),
    textOrNull(data.video_url),
    textOrNull(data.proposal_url),
    JSON.stringify(cleanPayload(data)),
  ];
}

function listingBrandCountry(data) {
  return textOrNull(data.brand_country) || countryFromDialCode(data.country_code) || "Indonesia";
}

function listingTargetMarket(data) {
  return textOrNull(data.target_market) || "Indonesia";
}

function countryFromDialCode(value) {
  const code = `+${(value || "").toString().replace(/\D/g, "") || "62"}`;
  const countries = {
    "+62": "Indonesia",
    "+60": "Malaysia",
    "+65": "Singapore",
    "+673": "Brunei",
    "+855": "Cambodia",
    "+670": "Timor-Leste",
    "+856": "Laos",
    "+95": "Myanmar",
    "+63": "Philippines",
    "+66": "Thailand",
    "+84": "Vietnam",
    "+86": "China",
    "+852": "Hong Kong",
    "+853": "Macau",
    "+886": "Taiwan",
    "+81": "Japan",
    "+82": "South Korea",
    "+91": "India",
    "+880": "Bangladesh",
    "+92": "Pakistan",
    "+94": "Sri Lanka",
    "+977": "Nepal",
    "+61": "Australia",
    "+1": "United States",
  };
  return countries[code] || null;
}

export async function hasDuplicateFranchisee(db, email, whatsapp) {
  const cleanWhatsapp = digitsOnly(whatsapp);
  const result = await db
    .prepare("SELECT email, whatsapp FROM franchisee_profiles WHERE LOWER(COALESCE(email, '')) = LOWER(?) OR whatsapp = ? LIMIT 20")
    .bind(lowerOrNull(email), normalizeWhatsapp(whatsapp))
    .all();

  return (result.results || []).some((row) => lowerOrNull(row.email) === lowerOrNull(email) || digitsOnly(row.whatsapp) === cleanWhatsapp);
}

export async function hasDuplicateFranchisor(db, email, whatsapp) {
  const cleanWhatsapp = digitsOnly(whatsapp);
  const result = await db
    .prepare("SELECT email_contact, whatsapp FROM franchisor_profiles WHERE LOWER(COALESCE(email_contact, '')) = LOWER(?) OR whatsapp = ? LIMIT 20")
    .bind(lowerOrNull(email), normalizeWhatsapp(whatsapp))
    .all();

  return (result.results || []).some((row) => lowerOrNull(row.email_contact) === lowerOrNull(email) || digitsOnly(row.whatsapp) === cleanWhatsapp);
}

export async function findClaimSource(db, data) {
  if (data.unclaimed_id) {
    const byId = await db
      .prepare("SELECT id, slug FROM franchises WHERE source_sheet = 'UNCLAIMED' AND legacy_row_id = ? LIMIT 1")
      .bind(data.unclaimed_id)
      .first();
    if (byId) return byId;
  }

  if (data.brand_name) {
    return await db
      .prepare("SELECT id, slug FROM franchises WHERE source_sheet = 'UNCLAIMED' AND LOWER(brand_name) = LOWER(?) LIMIT 1")
      .bind(normalizeText(data.brand_name))
      .first();
  }

  return null;
}

export async function uniqueSlug(db, brandName, fallbackId) {
  const base = slugify(brandName) || `brand-${fallbackId.toLowerCase()}`;
  let candidate = base;
  let suffix = 2;

  while (await slugExists(db, candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function slugExists(db, slug) {
  const row = await db
    .prepare(
      `SELECT slug FROM franchises WHERE slug = ?
       UNION ALL
       SELECT slug FROM franchise_site_publications WHERE slug = ?
       LIMIT 1`
    )
    .bind(slug, slug)
    .first();
  return Boolean(row);
}

export function legacySourceStatement(db, source, legacyId, normalizedKey, targetTable, targetId, payload) {
  return db
    .prepare(
      `INSERT INTO legacy_source_rows (
        id, source_sheet, legacy_row_id, normalized_key, target_table, target_id, raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_sheet, normalized_key) DO UPDATE SET
        legacy_row_id = excluded.legacy_row_id,
        target_table = excluded.target_table,
        target_id = excluded.target_id,
        raw_payload = excluded.raw_payload`
    )
    .bind(`legacy_${randomId()}`, source, legacyId, normalizeText(normalizedKey).toLowerCase() || legacyId, targetTable, targetId, JSON.stringify(payload));
}

export function auditStatement(db, action, entityType, entityId, metadata, actorUserId = null) {
  return db
    .prepare(
      `INSERT INTO audit_events (id, actor_user_id, source_site_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(`audit_${randomId()}`, actorUserId, "site_franchisee_id", action, entityType, entityId, JSON.stringify(metadata));
}

export function validationError(error) {
  return jsonResponse(
    {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Data form belum valid.",
      details: error.flatten(),
    },
    { status: 400 }
  );
}

export function duplicateResponse() {
  return jsonResponse(
    {
      success: false,
      error: "DUPLICATE_ENTRY",
      message: "Email atau Nomor WhatsApp ini sudah terdaftar sebelumnya.",
    },
    { status: 409 }
  );
}

export function cleanPayload(data) {
  const payload = { ...data };
  delete payload.form_type;
  delete payload.test_action;
  return payload;
}

export function textOrNull(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

export function lowerOrNull(value) {
  const normalized = normalizeText(value).toLowerCase();
  return normalized || null;
}

export function normalizeText(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

export function normalizeWhatsapp(value) {
  const digits = digitsOnly(value);
  return digits || null;
}

export function digitsOnly(value) {
  return (value || "").toString().replace(/\D/g, "");
}

export function moneyOrNull(value) {
  const digits = digitsOnly(value);
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : null;
}

export function intOrNull(value) {
  const amount = Number.parseInt((value || "").toString(), 10);
  return Number.isFinite(amount) ? amount : null;
}

export function numberOrNull(value) {
  const amount = Number.parseFloat((value || "").toString().replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
}

export function normalizeHakiStatus(value) {
  return normalizeHakiStatusValue(value);
}

export function normalizeRoyaltyBasis(value) {
  return normalizeRoyaltyBasisValue(value);
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export function shortPublicId() {
  return randomId().slice(0, 8).toUpperCase();
}

export function jakartaTimestamp() {
  return new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

export function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}
