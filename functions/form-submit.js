// /functions/form-submit.js
import { z } from "zod";
import { authErrorResponse, requireD1User } from "./_clerk-auth.js";
import { SITE_FRANCHISEE_ID, siteRebuildStatements } from "./_site-publish-queue.js";

const BaseSubmissionSchema = z
  .object({
    form_type: z.enum(["FRANCHISEE", "FRANCHISOR", "claim"]).optional(),
    test_action: z.enum(["create_unclaimed", "clear_test_data"]).optional(),
    is_test_data: z.string().optional(),
  })
  .passthrough();

const FranchiseeSchema = BaseSubmissionSchema.extend({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  country_code: z.string().trim().optional(),
  whatsapp: z.string().trim().min(8),
  city_origin: z.string().trim().optional(),
  interest_category: z.string().trim().optional(),
  budget_range: z.string().trim().optional(),
  location_plan: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

const FranchisorSchema = BaseSubmissionSchema.extend({
  brand_name: z.string().trim().min(2),
  company_name: z.string().trim().optional(),
  category: z.string().trim().optional(),
  pic_name: z.string().trim().optional(),
  email_contact: z.string().trim().email(),
  country_code: z.string().trim().optional(),
  whatsapp: z.string().trim().min(8),
  website_url: z.string().trim().optional(),
  instagram_url: z.string().trim().optional(),
  facebook_url: z.string().trim().optional(),
  tiktok_url: z.string().trim().optional(),
  youtube_url: z.string().trim().optional(),
  linkedin_url: z.string().trim().optional(),
  unclaimed_id: z.string().trim().optional(),
}).passthrough();

export async function onRequestPost({ request, env }) {
  try {
    if (!env.franchise_db) {
      return jsonResponse(
        {
          success: false,
          error: "D1_BINDING_MISSING",
          message: "Layanan formulir belum siap. Silakan coba lagi nanti.",
        },
        { status: 503 }
      );
    }

    const rawData = await request.json();
    const baseParsed = BaseSubmissionSchema.safeParse(rawData);
    if (!baseParsed.success) return validationError(baseParsed.error);

    if (baseParsed.data.test_action === "create_unclaimed") {
      const actor = await requireD1User(request, env, env.franchise_db, { requiredRole: "staff" });
      return await handleCreateUnclaimed(env.franchise_db, rawData, actor);
    }

    if (baseParsed.data.test_action === "clear_test_data") {
      const actor = await requireD1User(request, env, env.franchise_db, { requiredRole: "staff" });
      return await handleClearTestData(env.franchise_db, actor);
    }

    const formType = rawData.form_type || "FRANCHISEE";
    if (formType === "FRANCHISEE") {
      const parsed = FranchiseeSchema.safeParse(rawData);
      if (!parsed.success) return validationError(parsed.error);
      const actor = await requireD1User(request, env, env.franchise_db, { requiredRole: "franchisee" });
      return await handleFranchiseeSubmit(env.franchise_db, parsed.data, actor);
    }

    if (formType === "FRANCHISOR" || formType === "claim") {
      const parsed = FranchisorSchema.safeParse(rawData);
      if (!parsed.success) return validationError(parsed.error);
      const actor = await requireD1User(request, env, env.franchise_db, { requiredRole: "franchisor" });
      return await handleFranchisorSubmit(env.franchise_db, parsed.data, formType === "claim", actor);
    }

    return jsonResponse(
      {
        success: false,
        error: "INVALID_FORM_TYPE",
        message: "Tipe form tidak dikenali.",
      },
      { status: 400 }
    );
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;

    return jsonResponse(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}

async function handleFranchiseeSubmit(db, data, actor) {
  const duplicate = await hasDuplicateFranchisee(db, data.email, data.whatsapp);
  if (duplicate) return duplicateResponse();

  const publicId = shortPublicId();
  const profileId = `franchisee_profile_${randomId()}`;
  const payload = cleanPayload(data);

  await db.batch([
    db
      .prepare(
        `INSERT INTO franchisee_profiles (
          id, user_id, source_site_id, name, email, country_code, whatsapp, city_origin,
          interest_category, budget_range, location_plan, message, legacy_row_id,
          legacy_timestamp, raw_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        profileId,
        actor.id,
        "site_franchisee_id",
        normalizeText(data.name),
        lowerOrNull(data.email),
        textOrNull(data.country_code),
        normalizeWhatsapp(data.whatsapp),
        textOrNull(data.city_origin),
        textOrNull(data.interest_category),
        textOrNull(data.budget_range),
        textOrNull(data.location_plan),
        textOrNull(data.message),
        publicId,
        jakartaTimestamp(),
        JSON.stringify(payload)
      ),
    legacySourceStatement(db, "FRANCHISEE", publicId, data.email || data.whatsapp || data.name, "franchisee_profiles", profileId, payload),
    auditStatement(db, "franchisee.submit", "franchisee_profiles", profileId, { source: "form-submit" }, actor.id),
  ]);

  return jsonResponse({
    success: true,
    id: publicId,
    profile_id: profileId,
  });
}

async function handleFranchisorSubmit(db, data, isClaim, actor) {
  const duplicate = await hasDuplicateFranchisor(db, data.email_contact, data.whatsapp);
  if (duplicate) return duplicateResponse();

  const publicId = shortPublicId();
  const profileId = `franchisor_profile_${randomId()}`;
  const payload = cleanPayload(data);
  const claimSource = isClaim ? await findClaimSource(db, data) : null;
  const franchiseId = claimSource?.id || `franchise_${randomId()}`;
  const slug = claimSource?.slug || (await uniqueSlug(db, data.brand_name, publicId));
  const investment = moneyOrNull(data.total_investment_value) || moneyOrNull(data.min_capital) || moneyOrNull(data.pkg_price_1);
  const now = jakartaTimestamp();

  const statements = [
    db
      .prepare(
        `INSERT INTO franchisor_profiles (
          id, user_id, source_site_id, company_name, pic_name, email_contact, country_code,
          whatsapp, website_url, instagram_url, facebook_url, tiktok_url, youtube_url, linkedin_url,
          nib_number, haki_status, haki_number,
          legacy_row_id, legacy_timestamp, raw_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        profileId,
        actor.id,
        "site_franchisee_id",
        textOrNull(data.company_name),
        textOrNull(data.pic_name),
        lowerOrNull(data.email_contact),
        textOrNull(data.country_code),
        normalizeWhatsapp(data.whatsapp),
        textOrNull(data.website_url),
        textOrNull(data.instagram_url),
        textOrNull(data.facebook_url),
        textOrNull(data.tiktok_url),
        textOrNull(data.youtube_url),
        textOrNull(data.linkedin_url),
        textOrNull(data.nib_number),
        normalizeHakiStatus(data.haki_status),
        textOrNull(data.haki_number),
        publicId,
        now,
        JSON.stringify(payload)
      ),
  ];

  if (claimSource) {
    statements.push(
      db
        .prepare(
        `UPDATE franchises
          SET owner_user_id = ?,
              franchisor_profile_id = ?,
              source_site_id = ?,
              brand_name = ?,
              category = ?,
              status = 'free',
              verification_tier = 'free',
              source_type = 'claim',
              source_sheet = 'FRANCHISOR',
              legacy_row_id = ?,
              legacy_timestamp = ?,
              year_established = ?,
              city_origin = ?,
              outlet_type = ?,
              location_requirement = ?,
              rent_cost_text = ?,
              fee_license_idr = ?,
              fee_capex_idr = ?,
              fee_construction_idr = ?,
              total_investment_idr = ?,
              min_investment_idr = ?,
              estimated_bep_months = ?,
              net_profit_percent = ?,
              royalty_percent = ?,
              royalty_basis = ?,
              short_desc = ?,
              full_desc = ?,
              support_system = ?,
              phone = ?,
              logo_url = ?,
              cover_url = ?,
              gallery_urls = ?,
              video_url = ?,
              proposal_url = ?,
              raw_payload = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`
        )
        .bind(actor.id, ...franchiseBindValues(data, profileId, publicId, now, investment), franchiseId)
    );
  } else {
    statements.push(
      db
        .prepare(
          `INSERT INTO franchises (
            id, owner_user_id, franchisor_profile_id, source_site_id, brand_name, slug, category,
            status, verification_tier, source_type, source_sheet, legacy_row_id,
            legacy_timestamp, year_established, city_origin, outlet_type,
            location_requirement, rent_cost_text, fee_license_idr, fee_capex_idr,
            fee_construction_idr, total_investment_idr, min_investment_idr,
            estimated_bep_months, net_profit_percent, royalty_percent, royalty_basis,
            short_desc, full_desc, support_system, phone, logo_url, cover_url,
            gallery_urls, video_url, proposal_url, raw_payload
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'free', 'free', 'franchisor_form', 'FRANCHISOR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(franchiseId, actor.id, profileId, "site_franchisee_id", normalizeText(data.brand_name), slug, textOrNull(data.category), ...franchiseBindValues(data, profileId, publicId, now, investment).slice(4))
    );

    statements.push(
      db
        .prepare(
          `INSERT INTO franchise_site_publications (
            id, franchise_id, site_id, slug, canonical_url, publication_status, is_primary, first_published_at, last_synced_at
          ) VALUES (?, ?, ?, ?, ?, 'published', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .bind(
          `publication_${randomId()}`,
          franchiseId,
          "site_franchisee_id",
          slug,
          `https://franchisee.id/peluang-usaha/${slug}`
        )
    );
  }

  const packagePrice = moneyOrNull(data.pkg_price_1) || investment;
  if (packagePrice) {
    statements.push(
      db
        .prepare(
          `INSERT INTO franchise_packages (
            id, franchise_id, package_name, package_label, price_idr, min_capital_idr, description, display_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
        )
        .bind(
          `package_${randomId()}`,
          franchiseId,
          textOrNull(data.pkg_name_1) || "Paket Standard",
          textOrNull(data.pkg_name_1) || "Paket Standard",
          packagePrice,
          packagePrice,
          textOrNull(data.pkg_desc_1)
        )
    );
  }

  if (isClaim) {
    statements.push(
      db
        .prepare(
          `INSERT INTO franchise_claims (
            id, franchise_id, claimant_user_id, franchisor_profile_id, source_site_id, unclaimed_legacy_row_id,
            status, evidence_text, reviewed_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, CURRENT_TIMESTAMP)`
        )
        .bind(`claim_${randomId()}`, franchiseId, actor.id, profileId, "site_franchisee_id", textOrNull(data.unclaimed_id), `Claim submitted from /daftar for ${normalizeText(data.brand_name)}`)
    );
  }

  statements.push(
    legacySourceStatement(db, "FRANCHISOR", publicId, data.brand_name, "franchises", franchiseId, payload),
    auditStatement(db, isClaim ? "franchise.claim_submit" : "franchise.submit", "franchises", franchiseId, {
      source: "form-submit",
      profile_id: profileId,
    }, actor.id)
  );
  statements.push(
    ...siteRebuildStatements(db, {
      siteId: SITE_FRANCHISEE_ID,
      franchiseId,
      reason: isClaim ? "franchise_claim_published" : "franchise_listing_submitted",
      entityType: "franchises",
      entityId: franchiseId,
      actorUserId: actor.id,
      source: "form-submit",
      metadata: {
        slug,
        brand_name: normalizeText(data.brand_name),
        claim: isClaim,
      },
    })
  );

  await db.batch(statements);

  return jsonResponse({
    success: true,
    id: publicId,
    franchise_id: franchiseId,
    profile_id: profileId,
  });
}

function franchiseBindValues(data, profileId, publicId, now, investment) {
  return [
    profileId,
    "site_franchisee_id",
    normalizeText(data.brand_name),
    textOrNull(data.category),
    publicId,
    now,
    intOrNull(data.year_established),
    textOrNull(data.city_origin),
    textOrNull(data.outlet_type),
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
    textOrNull(data.royalty_basis),
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

async function hasDuplicateFranchisee(db, email, whatsapp) {
  const cleanWhatsapp = digitsOnly(whatsapp);
  const result = await db
    .prepare("SELECT email, whatsapp FROM franchisee_profiles WHERE LOWER(COALESCE(email, '')) = LOWER(?) OR whatsapp = ? LIMIT 20")
    .bind(lowerOrNull(email), normalizeWhatsapp(whatsapp))
    .all();

  return (result.results || []).some((row) => lowerOrNull(row.email) === lowerOrNull(email) || digitsOnly(row.whatsapp) === cleanWhatsapp);
}

async function hasDuplicateFranchisor(db, email, whatsapp) {
  const cleanWhatsapp = digitsOnly(whatsapp);
  const result = await db
    .prepare("SELECT email_contact, whatsapp FROM franchisor_profiles WHERE LOWER(COALESCE(email_contact, '')) = LOWER(?) OR whatsapp = ? LIMIT 20")
    .bind(lowerOrNull(email), normalizeWhatsapp(whatsapp))
    .all();

  return (result.results || []).some((row) => lowerOrNull(row.email_contact) === lowerOrNull(email) || digitsOnly(row.whatsapp) === cleanWhatsapp);
}

async function findClaimSource(db, data) {
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

async function uniqueSlug(db, brandName, fallbackId) {
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

function legacySourceStatement(db, source, legacyId, normalizedKey, targetTable, targetId, payload) {
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

function auditStatement(db, action, entityType, entityId, metadata, actorUserId = null) {
  return db
    .prepare(
      `INSERT INTO audit_events (id, actor_user_id, source_site_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(`audit_${randomId()}`, actorUserId, "site_franchisee_id", action, entityType, entityId, JSON.stringify(metadata));
}

async function handleCreateUnclaimed(db, data, actor) {
  const parsed = BaseSubmissionSchema.extend({
    brand_name: z.string().trim().min(2),
    category: z.string().trim().optional(),
    min_capital: z.string().trim().optional(),
    city: z.string().trim().optional(),
  }).safeParse(data);
  if (!parsed.success) return validationError(parsed.error);

  const publicId = `TEST_${shortPublicId()}`;
  const franchiseId = `franchise_${randomId()}`;
  const slug = await uniqueSlug(db, parsed.data.brand_name, publicId);
  const payload = cleanPayload({ ...parsed.data, is_test_data: "TRUE" });

  await db.batch([
    db
      .prepare(
        `INSERT INTO franchises (
          id, source_site_id, brand_name, slug, category, status, verification_tier,
          source_type, source_sheet, legacy_row_id, legacy_timestamp, city_origin,
          min_investment_idr, raw_payload
        ) VALUES (?, ?, ?, ?, ?, 'unclaimed', 'unclaimed', 'manual', 'UNCLAIMED', ?, ?, ?, ?, ?)`
      )
      .bind(
        franchiseId,
        "site_franchisee_id",
        normalizeText(parsed.data.brand_name),
        slug,
        textOrNull(parsed.data.category),
        publicId,
        jakartaTimestamp(),
        textOrNull(parsed.data.city),
        moneyOrNull(parsed.data.min_capital),
        JSON.stringify(payload)
      ),
    db
      .prepare(
        `INSERT INTO franchise_site_publications (
          id, franchise_id, site_id, slug, canonical_url, publication_status, is_primary, first_published_at, last_synced_at
        ) VALUES (?, ?, ?, ?, ?, 'published', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(`publication_${randomId()}`, franchiseId, "site_franchisee_id", slug, `https://franchisee.id/peluang-usaha/${slug}/`),
    legacySourceStatement(db, "UNCLAIMED", publicId, parsed.data.brand_name, "franchises", franchiseId, payload),
    auditStatement(db, "franchise.test_create_unclaimed", "franchises", franchiseId, { source: "form-submit" }, actor.id),
    ...siteRebuildStatements(db, {
      siteId: SITE_FRANCHISEE_ID,
      franchiseId,
      reason: "test_unclaimed_created",
      entityType: "franchises",
      entityId: franchiseId,
      actorUserId: actor.id,
      source: "form-submit",
      metadata: {
        slug,
        brand_name: normalizeText(parsed.data.brand_name),
      },
    }),
  ]);

  return jsonResponse({
    success: true,
    id: publicId,
    franchise_id: franchiseId,
    message: "Test data berhasil dibuat.",
  });
}

async function handleClearTestData(db, actor) {
  const testRows = await db
    .prepare("SELECT id FROM franchises WHERE legacy_row_id LIKE 'TEST_%' OR raw_payload LIKE '%\"is_test_data\":\"TRUE\"%'")
    .all();
  const ids = (testRows.results || []).map((row) => row.id);

  if (!ids.length) {
    return jsonResponse({
      success: true,
      deleted: 0,
      message: "Cleared 0 test records",
    });
  }

  const statements = ids.flatMap((id) => [
    db.prepare("DELETE FROM franchise_site_publications WHERE franchise_id = ?").bind(id),
    db.prepare("DELETE FROM franchise_packages WHERE franchise_id = ?").bind(id),
    db.prepare("DELETE FROM franchise_claims WHERE franchise_id = ?").bind(id),
    db.prepare("DELETE FROM franchises WHERE id = ?").bind(id),
  ]);
  statements.push(
    ...siteRebuildStatements(db, {
      siteId: SITE_FRANCHISEE_ID,
      reason: "test_data_cleared",
      entityType: "franchises",
      actorUserId: actor.id,
      source: "form-submit",
      metadata: {
        deleted: ids.length,
        franchise_ids: ids,
      },
    })
  );

  await db.batch(statements);
  await auditStatement(db, "franchise.test_clear_data", "franchises", null, { source: "form-submit", deleted: ids.length }, actor.id).run();

  return jsonResponse({
    success: true,
    deleted: ids.length,
    message: `Cleared ${ids.length} test records`,
  });
}

function validationError(error) {
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

function duplicateResponse() {
  return jsonResponse(
    {
      success: false,
      error: "DUPLICATE_ENTRY",
      message: "Email atau Nomor WhatsApp ini sudah terdaftar sebelumnya.",
    },
    { status: 409 }
  );
}

function cleanPayload(data) {
  const payload = { ...data };
  delete payload.form_type;
  delete payload.test_action;
  return payload;
}

function textOrNull(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function lowerOrNull(value) {
  const normalized = normalizeText(value).toLowerCase();
  return normalized || null;
}

function normalizeText(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function normalizeWhatsapp(value) {
  const digits = digitsOnly(value);
  return digits || null;
}

function digitsOnly(value) {
  return (value || "").toString().replace(/\D/g, "");
}

function moneyOrNull(value) {
  const digits = digitsOnly(value);
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : null;
}

function intOrNull(value) {
  const amount = Number.parseInt((value || "").toString(), 10);
  return Number.isFinite(amount) ? amount : null;
}

function numberOrNull(value) {
  const amount = Number.parseFloat((value || "").toString().replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
}

function normalizeHakiStatus(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (["registered", "process", "none"].includes(normalized)) return normalized;
  return null;
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function shortPublicId() {
  return randomId().slice(0, 8).toUpperCase();
}

function jakartaTimestamp() {
  return new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}
