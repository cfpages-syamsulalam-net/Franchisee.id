import { recordProductEvent } from "./_analytics.js";
import { auditStatement, isMissingSavedTableError, jsonResponse, normalizeWhatsapp, randomId, textOrNull } from "./_profile-utils.js";
import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";

export async function updateFranchiseeProfile(db, actor, data, loaders) {
  const existing = await db
    .prepare("SELECT id FROM franchisee_profiles WHERE user_id = ? LIMIT 1")
    .bind(actor.id)
    .first();
  if (!existing) {
    return jsonResponse({ success: false, message: "Silakan lengkapi form minat usaha terlebih dahulu." }, { status: 404 });
  }

  await db.batch([
    db
      .prepare(
        `UPDATE franchisee_profiles
            SET country_code = ?, whatsapp = ?, city_origin = ?, interest_category = ?,
                budget_range = ?, location_plan = ?, message = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?`,
      )
      .bind(
        textOrNull(data.country_code),
        normalizeWhatsapp(data.whatsapp),
        textOrNull(data.city_origin),
        textOrNull(data.interest_category),
        textOrNull(data.budget_range),
        textOrNull(data.location_plan),
        textOrNull(data.message),
        actor.id,
      ),
    auditStatement(db, "profile.franchisee.update", "franchisee_profiles", existing.id, { source: "profile" }, actor.id),
  ]);

  return jsonResponse({ success: true, profile: await loaders.loadFranchiseeProfile(db, actor.id) });
}

export async function createFranchiseInquiry(db, actor, data, loaders) {
  const franchiseeProfile = await loaders.loadFranchiseeProfile(db, actor.id);
  if (!franchiseeProfile) {
    return incompleteFranchiseeProfileResponse("Lengkapi minat usaha terlebih dahulu agar kami bisa mengirim info dengan data kontak Anda.");
  }

  const franchise = await db
    .prepare(
      `SELECT f.id, f.brand_name, f.slug
       FROM franchises f
       INNER JOIN franchise_site_publications p
          ON p.franchise_id = f.id
         AND p.site_id = ?
         AND p.publication_status = 'published'
       WHERE f.id = ?
       LIMIT 1`,
    )
    .bind(SITE_FRANCHISEE_ID, data.franchise_id)
    .first();

  if (!franchise) {
    return jsonResponse({ success: false, message: "Peluang franchise tidak ditemukan." }, { status: 404 });
  }

  const existing = await db
    .prepare(
      `SELECT id, status, created_at
       FROM franchise_leads
       WHERE franchise_id = ?
         AND franchisee_user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(franchise.id, actor.id)
    .first();

  if (existing) {
    return jsonResponse({
      success: true,
      already_sent: true,
      message: "Anda sudah pernah meminta info untuk brand ini.",
      lead: existing,
      inquiry_history: await loaders.loadFranchiseeInquiryHistory(db, actor.id, franchiseeProfile.id),
    });
  }

  const leadId = `lead_${randomId()}`;
  const message = textOrNull(data.message) || franchiseeProfile.message || `Saya tertarik dengan ${franchise.brand_name}.`;
  await db.batch([
    db
      .prepare(
        `INSERT INTO franchise_leads (
           id, franchise_id, franchisee_user_id, franchisee_profile_id, source_site_id,
           name, email, country_code, whatsapp, city_origin, budget_range, message, status, raw_payload
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
      )
      .bind(
        leadId,
        franchise.id,
        actor.id,
        franchiseeProfile.id,
        SITE_FRANCHISEE_ID,
        franchiseeProfile.name || actor.display_name || null,
        franchiseeProfile.email || actor.primary_email || null,
        franchiseeProfile.country_code || null,
        franchiseeProfile.whatsapp || null,
        franchiseeProfile.city_origin || null,
        franchiseeProfile.budget_range || null,
        message,
        JSON.stringify({ source: "profile_opportunity", franchise_slug: franchise.slug }),
      ),
    auditStatement(db, "profile.franchisee.inquiry", "franchise_leads", leadId, { franchise_id: franchise.id, brand_name: franchise.brand_name }, actor.id),
  ]);
  await recordProductEvent(db, {
    franchise_id: franchise.id,
    event_type: "inquiry",
    surface: "profile",
    metadata: { brand_name: franchise.brand_name },
  }, { userId: actor.id });

  return jsonResponse({
    success: true,
    lead: await loaders.loadFranchiseeLead(db, leadId),
    inquiry_history: await loaders.loadFranchiseeInquiryHistory(db, actor.id, franchiseeProfile.id),
  });
}

export async function saveFranchiseOpportunity(db, actor, data, loaders) {
  const franchiseeProfile = await loaders.loadFranchiseeProfile(db, actor.id);
  if (!franchiseeProfile) {
    return incompleteFranchiseeProfileResponse("Lengkapi minat usaha terlebih dahulu agar peluang bisa disimpan.");
  }

  const franchise = await loaders.loadPublicOpportunity(db, data.franchise_id);
  if (!franchise) {
    return jsonResponse({ success: false, message: "Peluang franchise tidak ditemukan." }, { status: 404 });
  }

  try {
    const savedId = `saved_${randomId()}`;
    await db.batch([
      db
        .prepare(
          `INSERT INTO franchise_saved_opportunities (id, user_id, franchise_id, source_site_id, note)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id, franchise_id, source_site_id)
           DO UPDATE SET note = excluded.note, updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(savedId, actor.id, franchise.id, SITE_FRANCHISEE_ID, textOrNull(data.note)),
      auditStatement(db, "profile.franchisee.save_opportunity", "franchises", franchise.id, { brand_name: franchise.brand_name }, actor.id),
    ]);
    await recordProductEvent(db, {
      franchise_id: franchise.id,
      event_type: "save",
      surface: "profile",
      metadata: { brand_name: franchise.brand_name },
    }, { userId: actor.id });
  } catch (error) {
    if (isMissingSavedTableError(error)) {
      return jsonResponse({ success: false, message: "Fitur simpan peluang belum siap. Silakan coba lagi nanti." }, { status: 503 });
    }
    throw error;
  }

  return jsonResponse({
    success: true,
    saved_opportunities: await loaders.loadSavedOpportunities(db, actor.id),
  });
}

export async function removeFranchiseOpportunity(db, actor, data, loaders) {
  try {
    await db.batch([
      db
        .prepare(
          `DELETE FROM franchise_saved_opportunities
           WHERE user_id = ?
             AND franchise_id = ?
             AND source_site_id = ?`,
        )
        .bind(actor.id, data.franchise_id, SITE_FRANCHISEE_ID),
      auditStatement(db, "profile.franchisee.remove_opportunity", "franchises", data.franchise_id, {}, actor.id),
    ]);
    await recordProductEvent(db, {
      franchise_id: data.franchise_id,
      event_type: "unsave",
      surface: "profile",
    }, { userId: actor.id });
  } catch (error) {
    if (isMissingSavedTableError(error)) {
      return jsonResponse({ success: false, message: "Fitur simpan peluang belum siap. Silakan coba lagi nanti." }, { status: 503 });
    }
    throw error;
  }

  return jsonResponse({
    success: true,
    saved_opportunities: await loaders.loadSavedOpportunities(db, actor.id),
  });
}

function incompleteFranchiseeProfileResponse(message) {
  return jsonResponse(
    {
      success: false,
      code: "FRANCHISEE_PROFILE_REQUIRED",
      message,
      action_label: "Lengkapi minat usaha",
      action_url: "/daftar/?role=franchisee&continue=1",
      action_hint: "Isi form minat usaha sekali saja, lalu kembali untuk menyimpan peluang.",
    },
    { status: 404 },
  );
}
