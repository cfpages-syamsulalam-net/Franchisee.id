import { createClerkClient } from "@clerk/backend";
import {
  authErrorResponse,
  requireD1User,
  syncClerkMetadataForD1User,
  syncClerkMetadataFromD1,
} from "./_clerk-auth.js";
import { recordProductEvent } from "./_analytics.js";
import { buildUpdate, listingPatch } from "./_profile-listing-patch.js";
import { confirmPremiumPayment, createPremiumOrder, loadPremiumMembershipData } from "./_profile-premium.js";
import { loadFranchiseeRecommendations } from "./_profile-recommendations.js";
import { MutationSchema } from "./_profile-schemas.js";
import {
  auditStatement,
  getDb,
  getPrimaryEmail,
  isMissingSavedTableError,
  jsonResponse,
  normalizeText,
  normalizeWhatsapp,
  randomId,
  splitDisplayName,
  textOrNull,
  validationError,
} from "./_profile-utils.js";
import { SITE_FRANCHISEE_ID, siteRebuildStatements } from "./_site-publish-queue.js";
import { logOperationEvent } from "./_telemetry.js";

const OWNER_LISTING_EDIT_INTERVAL_HOURS = 6;
const RECOMMENDATION_LIMIT = 6;

export async function onRequestGet({ request, env }) {
  try {
    const db = getDb(env);
    const actor = await requireD1User(request, env, db);
    const data = await loadProfileData(db, actor);
    return jsonResponse({ success: true, ...data });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    await logOperationEvent(env.franchise_db, {
      eventType: "api.profile.get.failed",
      severity: "error",
      route: "/profile-data",
      message: error.message,
    });
    return jsonResponse({ success: false, message: error.message || "Profil gagal dimuat." }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const db = getDb(env);
    const actor = await requireD1User(request, env, db);
    const raw = await request.json();
    const parsed = MutationSchema.safeParse(raw);
    if (!parsed.success) return validationError(parsed.error);

    if (parsed.data.action === "update_account") {
      return await updateAccount(env, db, actor, parsed.data);
    }
    if (parsed.data.action === "update_franchisee_profile") {
      return await updateFranchiseeProfile(db, actor, parsed.data);
    }
    if (parsed.data.action === "update_franchisor_profile") {
      return await updateFranchisorProfile(db, actor, parsed.data);
    }
    if (parsed.data.action === "update_listing") {
      return await updateOwnedListing(db, actor, parsed.data);
    }
    if (parsed.data.action === "add_public_role") {
      return await addPublicRole(env, db, actor, parsed.data);
    }
    if (parsed.data.action === "create_franchise_inquiry") {
      return await createFranchiseInquiry(db, actor, parsed.data);
    }
    if (parsed.data.action === "save_franchise_opportunity") {
      return await saveFranchiseOpportunity(db, actor, parsed.data);
    }
    if (parsed.data.action === "remove_franchise_opportunity") {
      return await removeFranchiseOpportunity(db, actor, parsed.data);
    }
    if (parsed.data.action === "update_franchise_lead_status") {
      return await updateFranchiseLeadStatus(db, actor, parsed.data);
    }
    if (parsed.data.action === "create_premium_order") {
      return await createPremiumOrder(db, actor, parsed.data);
    }
    if (parsed.data.action === "confirm_premium_payment") {
      return await confirmPremiumPayment(db, actor, parsed.data);
    }

    return jsonResponse({ success: false, message: "Aksi profil tidak dikenali." }, { status: 400 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    await logOperationEvent(env.franchise_db, {
      eventType: "api.profile.post.failed",
      severity: "error",
      route: "/profile-data",
      message: error.message,
    });
    return jsonResponse({ success: false, message: error.message || "Perubahan profil gagal disimpan." }, { status: 500 });
  }
}

async function loadProfileData(db, actor) {
  const franchiseeProfile = await db
    .prepare(
      `SELECT id, user_id, name, email, country_code, whatsapp, city_origin, interest_category,
              budget_range, location_plan, message, created_at, updated_at
       FROM franchisee_profiles
       WHERE user_id = ?
       LIMIT 1`
    )
    .bind(actor.id)
    .first();

  const franchisorProfile = await db
    .prepare(
      `SELECT id, user_id, company_name, pic_name, email_contact, country_code, whatsapp,
              website_url, instagram_url, facebook_url, tiktok_url, youtube_url, linkedin_url,
              nib_number, haki_status, haki_number, created_at, updated_at
       FROM franchisor_profiles
       WHERE user_id = ?
       LIMIT 1`
    )
    .bind(actor.id)
    .first();

  const owned = await db
    .prepare(
      `SELECT f.id, f.brand_name, f.slug, f.category, f.status, f.verification_tier,
              f.year_established, f.city_origin, f.outlet_type, f.location_requirement,
              f.rent_cost_text, f.fee_license_idr, f.fee_capex_idr, f.fee_construction_idr,
              f.total_investment_idr, f.min_investment_idr, f.max_investment_idr,
              f.estimated_bep_months, f.net_profit_percent, f.royalty_percent, f.royalty_basis,
              f.short_desc, f.full_desc, f.support_system, f.phone, f.office_address,
              f.outlets_location, f.logo_url, f.cover_url, f.gallery_urls, f.video_url,
              f.proposal_url, f.updated_at,
              p.publication_status, p.canonical_url, p.last_synced_at,
              (SELECT MAX(a.created_at)
                 FROM audit_events a
                WHERE a.actor_user_id = ?
                  AND a.action = 'profile.listing.update'
                  AND a.entity_type = 'franchises'
                  AND a.entity_id = f.id) AS last_owner_edit_at,
              (SELECT COUNT(*)
                 FROM audit_events a
                WHERE a.actor_user_id = ?
                  AND a.action = 'profile.listing.update'
                  AND a.entity_type = 'franchises'
                  AND a.entity_id = f.id
                  AND a.created_at >= datetime('now', ?)) AS owner_edits_window
       FROM franchises f
       LEFT JOIN franchise_site_publications p
         ON p.franchise_id = f.id
        AND p.site_id = ?
       WHERE f.owner_user_id = ?
          OR (? IS NOT NULL AND f.franchisor_profile_id = ?)
       ORDER BY f.updated_at DESC, f.brand_name ASC`
    )
    .bind(
      actor.id,
      actor.id,
      `-${OWNER_LISTING_EDIT_INTERVAL_HOURS} hours`,
      SITE_FRANCHISEE_ID,
      actor.id,
      franchisorProfile?.id || null,
      franchisorProfile?.id || null
    )
    .all();

  const claims = await db
    .prepare(
      `SELECT c.id, c.franchise_id, c.status, c.evidence_text, c.review_notes, c.created_at, c.reviewed_at,
              f.brand_name, f.slug
       FROM franchise_claims c
       LEFT JOIN franchises f ON f.id = c.franchise_id
       WHERE c.claimant_user_id = ?
       ORDER BY c.created_at DESC
       LIMIT 20`
    )
    .bind(actor.id)
    .all();

  const ownedRows = owned.results || [];
  const publicationDistribution = await loadOwnedPublicationDistribution(db, ownedRows.map((row) => row.id));
  const inquiryHistory = await loadFranchiseeInquiryHistory(db, actor.id, franchiseeProfile?.id || null);
  const savedOpportunities = await loadSavedOpportunities(db, actor.id);
  const franchisorLeads = await loadFranchisorLeadInbox(db, actor.id, franchisorProfile?.id || null);
  const premiumMembership = await loadPremiumMembershipData(db, actor.id, ownedRows.map((row) => row.id));
  const recommendations = franchiseeProfile
    ? await loadFranchiseeRecommendations(db, franchiseeProfile, new Set(ownedRows.map((row) => row.id)), RECOMMENDATION_LIMIT)
    : [];

  const roles = (actor.roles || []).map((role) => role.role).filter(Boolean);
  const email = actor.primary_email || getPrimaryEmail(actor.clerk_user) || "";
  const displayName = actor.display_name || actor.clerk_user?.fullName || actor.clerk_user?.firstName || email.split("@")[0] || "";

  return {
    user: {
      id: actor.id,
      email,
      display_name: displayName,
      status: actor.status || "active",
      roles,
      is_staff_access: roles.includes("admin") || roles.includes("staff"),
    },
    completion: {
      franchisee: Boolean(franchiseeProfile),
      franchisor: Boolean(franchisorProfile && (owned.results || []).length),
    },
    franchisee_profile: franchiseeProfile || null,
    franchisor_profile: franchisorProfile || null,
    owned_franchises: ownedRows.map((row) => ({
      ...row,
      publication_distribution: publicationDistribution.get(row.id) || [],
      edit_locked: Number(row.owner_edits_window || 0) > 0,
      edit_interval_hours: OWNER_LISTING_EDIT_INTERVAL_HOURS,
    })),
    claims: claims.results || [],
    franchisee_recommendations: recommendations,
    saved_opportunities: savedOpportunities,
    inquiry_history: inquiryHistory,
    franchisor_leads: franchisorLeads,
    premium_membership: premiumMembership,
  };
}

async function updateAccount(env, db, actor, data) {
  const nextEmail = data.email.toLowerCase();
  const currentEmail = (actor.primary_email || getPrimaryEmail(actor.clerk_user) || "").toLowerCase();
  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  const nameParts = splitDisplayName(data.display_name);

  let clerkUser = await clerk.users.updateUser(actor.clerk_user_id, {
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
  });

  if (nextEmail !== currentEmail) {
    if (typeof clerk.users.replaceUserEmailAddress !== "function") {
      throw new Error("Perubahan email belum tersedia. Coba ubah nama terlebih dahulu, atau hubungi tim kami.");
    }
    await clerk.users.replaceUserEmailAddress(actor.clerk_user_id, { emailAddress: nextEmail });
    clerkUser = await clerk.users.getUser(actor.clerk_user_id);
  }

  await db.batch([
    db
      .prepare("UPDATE users SET primary_email = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(nextEmail, data.display_name, actor.id),
    db
      .prepare("UPDATE franchisee_profiles SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?")
      .bind(data.display_name, nextEmail, actor.id),
    db
      .prepare("UPDATE franchisor_profiles SET pic_name = ?, email_contact = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?")
      .bind(data.display_name, nextEmail, actor.id),
    auditStatement(db, "profile.account.update", "users", actor.id, { email_changed: nextEmail !== currentEmail }, actor.id),
  ]);

  const updatedUser = {
    id: actor.id,
    clerk_user_id: actor.clerk_user_id,
    primary_email: nextEmail,
    display_name: data.display_name,
    status: actor.status || "active",
  };
  await syncClerkMetadataFromD1(env, updatedUser, actor.roles || []);

  return jsonResponse({
    success: true,
    user: {
      id: actor.id,
      email: getPrimaryEmail(clerkUser) || nextEmail,
      display_name: data.display_name,
      roles: (actor.roles || []).map((role) => role.role).filter(Boolean),
    },
  });
}

async function updateFranchiseeProfile(db, actor, data) {
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
          WHERE user_id = ?`
      )
      .bind(
        textOrNull(data.country_code),
        normalizeWhatsapp(data.whatsapp),
        textOrNull(data.city_origin),
        textOrNull(data.interest_category),
        textOrNull(data.budget_range),
        textOrNull(data.location_plan),
        textOrNull(data.message),
        actor.id
      ),
    auditStatement(db, "profile.franchisee.update", "franchisee_profiles", existing.id, { source: "profile" }, actor.id),
  ]);

  return jsonResponse({ success: true, profile: await loadFranchiseeProfile(db, actor.id) });
}

async function updateFranchisorProfile(db, actor, data) {
  const existing = await db
    .prepare("SELECT id FROM franchisor_profiles WHERE user_id = ? LIMIT 1")
    .bind(actor.id)
    .first();
  if (!existing) {
    return jsonResponse({ success: false, message: "Silakan lengkapi form data brand terlebih dahulu." }, { status: 404 });
  }

  await db.batch([
    db
      .prepare(
        `UPDATE franchisor_profiles
            SET company_name = ?, country_code = ?, whatsapp = ?, website_url = ?, instagram_url = ?,
                facebook_url = ?, tiktok_url = ?, youtube_url = ?, linkedin_url = ?,
                nib_number = ?, haki_status = ?, haki_number = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?`
      )
      .bind(
        textOrNull(data.company_name),
        textOrNull(data.country_code),
        normalizeWhatsapp(data.whatsapp),
        textOrNull(data.website_url),
        textOrNull(data.instagram_url),
        textOrNull(data.facebook_url),
        textOrNull(data.tiktok_url),
        textOrNull(data.youtube_url),
        textOrNull(data.linkedin_url),
        textOrNull(data.nib_number),
        textOrNull(data.haki_status),
        textOrNull(data.haki_number),
        actor.id
      ),
    auditStatement(db, "profile.franchisor.update", "franchisor_profiles", existing.id, { source: "profile" }, actor.id),
  ]);

  return jsonResponse({ success: true, profile: await loadFranchisorProfile(db, actor.id) });
}

async function updateOwnedListing(db, actor, data) {
  const franchisorProfile = await loadFranchisorProfile(db, actor.id);
  const listing = await db
    .prepare(
      `SELECT id, owner_user_id, franchisor_profile_id, brand_name, slug
       FROM franchises
       WHERE id = ?
         AND (owner_user_id = ? OR (? IS NOT NULL AND franchisor_profile_id = ?))
       LIMIT 1`
    )
    .bind(data.franchise_id, actor.id, franchisorProfile?.id || null, franchisorProfile?.id || null)
    .first();

  if (!listing) {
    return jsonResponse({ success: false, message: "Listing tidak ditemukan atau bukan milik akun ini." }, { status: 404 });
  }

  const rate = await db
    .prepare(
      `SELECT MAX(created_at) AS last_edit_at, COUNT(*) AS edits
       FROM audit_events
       WHERE actor_user_id = ?
         AND action = 'profile.listing.update'
         AND entity_type = 'franchises'
         AND entity_id = ?
         AND created_at >= datetime('now', ?)`
    )
    .bind(actor.id, listing.id, `-${OWNER_LISTING_EDIT_INTERVAL_HOURS} hours`)
    .first();

  if (Number(rate?.edits || 0) > 0) {
    return jsonResponse(
      {
        success: false,
        error: "LISTING_EDIT_RATE_LIMITED",
        message: `Listing hanya bisa diedit sekali setiap ${OWNER_LISTING_EDIT_INTERVAL_HOURS} jam. Silakan coba lagi nanti.`,
        last_owner_edit_at: rate.last_edit_at,
        edit_interval_hours: OWNER_LISTING_EDIT_INTERVAL_HOURS,
      },
      { status: 429 }
    );
  }

  const patch = listingPatch(data);
  if (!Object.keys(patch).length) {
    return jsonResponse({ success: false, message: "Tidak ada field listing yang berubah." }, { status: 400 });
  }

  const update = buildUpdate("franchises", patch, "id");
  const statements = [
    db.prepare(update.sql).bind(...update.values, listing.id),
    auditStatement(db, "profile.listing.update", "franchises", listing.id, { source: "profile", fields: Object.keys(patch) }, actor.id),
    ...siteRebuildStatements(db, {
      siteId: SITE_FRANCHISEE_ID,
      franchiseId: listing.id,
      reason: "owner_listing_update",
      entityType: "franchises",
      entityId: listing.id,
      actorUserId: actor.id,
      source: "profile",
      metadata: {
        slug: listing.slug,
        brand_name: patch.brand_name || listing.brand_name,
        fields: Object.keys(patch),
      },
    }),
  ];

  await db.batch(statements);

  return jsonResponse({
    success: true,
    franchise: await loadOwnedListing(db, actor, listing.id, franchisorProfile?.id || null),
    edit_interval_hours: OWNER_LISTING_EDIT_INTERVAL_HOURS,
  });
}

async function addPublicRole(env, db, actor, data) {
  const currentRoles = new Set((actor.roles || []).map((row) => row.role));
  if (currentRoles.has("admin") || currentRoles.has("staff")) {
    return jsonResponse({ success: false, message: "Akses ini sudah tersedia untuk akun Anda." }, { status: 400 });
  }
  if (currentRoles.has(data.role)) {
    return jsonResponse({ success: true, already_has_role: true, role: data.role, profile: await loadProfileData(db, actor) });
  }

  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO user_roles (id, user_id, role, scope_type, scope_id, site_id, assigned_by_user_id)
         VALUES (?, ?, ?, 'network', 'network', ?, ?)`
      )
      .bind(`role_${randomId()}`, actor.id, data.role, SITE_FRANCHISEE_ID, actor.id),
    auditStatement(db, "profile.role.add", "users", actor.id, { role: data.role, source: "profile" }, actor.id),
  ]);

  const synced = await syncClerkMetadataForD1User(env, db, {
    id: actor.id,
    clerk_user_id: actor.clerk_user_id,
    primary_email: actor.primary_email,
    display_name: actor.display_name,
    status: actor.status || "active",
  });

  return jsonResponse({
    success: true,
    role: data.role,
    profile: await loadProfileData(db, { ...actor, roles: synced.roles || [] }),
  });
}

async function createFranchiseInquiry(db, actor, data) {
  const franchiseeProfile = await loadFranchiseeProfile(db, actor.id);
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
       LIMIT 1`
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
       LIMIT 1`
    )
    .bind(franchise.id, actor.id)
    .first();

  if (existing) {
    return jsonResponse({
      success: true,
      already_sent: true,
      message: "Anda sudah pernah meminta info untuk brand ini.",
      lead: existing,
      inquiry_history: await loadFranchiseeInquiryHistory(db, actor.id, franchiseeProfile.id),
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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`
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
        JSON.stringify({ source: "profile_opportunity", franchise_slug: franchise.slug })
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
    lead: await loadFranchiseeLead(db, leadId),
    inquiry_history: await loadFranchiseeInquiryHistory(db, actor.id, franchiseeProfile.id),
  });
}

async function saveFranchiseOpportunity(db, actor, data) {
  const franchiseeProfile = await loadFranchiseeProfile(db, actor.id);
  if (!franchiseeProfile) {
    return incompleteFranchiseeProfileResponse("Lengkapi minat usaha terlebih dahulu agar peluang bisa disimpan.");
  }

  const franchise = await loadPublicOpportunity(db, data.franchise_id);
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
           DO UPDATE SET note = excluded.note, updated_at = CURRENT_TIMESTAMP`
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
    saved_opportunities: await loadSavedOpportunities(db, actor.id),
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
    { status: 404 }
  );
}

async function removeFranchiseOpportunity(db, actor, data) {
  try {
    await db.batch([
      db
        .prepare(
          `DELETE FROM franchise_saved_opportunities
           WHERE user_id = ?
             AND franchise_id = ?
             AND source_site_id = ?`
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
    saved_opportunities: await loadSavedOpportunities(db, actor.id),
  });
}

async function updateFranchiseLeadStatus(db, actor, data) {
  const lead = await db
    .prepare(
      `SELECT fl.id, fl.franchise_id, f.owner_user_id, f.franchisor_profile_id
       FROM franchise_leads fl
       INNER JOIN franchises f ON f.id = fl.franchise_id
       LEFT JOIN franchisor_profiles fp ON fp.id = f.franchisor_profile_id
       WHERE fl.id = ?
         AND (f.owner_user_id = ? OR fp.user_id = ?)
       LIMIT 1`
    )
    .bind(data.lead_id, actor.id, actor.id)
    .first();

  if (!lead) {
    return jsonResponse({ success: false, message: "Lead tidak ditemukan atau bukan milik akun ini." }, { status: 404 });
  }

  await db.batch([
    db
      .prepare("UPDATE franchise_leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(data.status, lead.id),
    auditStatement(db, "profile.franchisor.lead_status", "franchise_leads", lead.id, { status: data.status, franchise_id: lead.franchise_id }, actor.id),
  ]);

  const franchisorProfile = await loadFranchisorProfile(db, actor.id);
  return jsonResponse({
    success: true,
    franchisor_leads: await loadFranchisorLeadInbox(db, actor.id, franchisorProfile?.id || null),
  });
}

async function loadFranchiseeProfile(db, userId) {
  return await db
    .prepare(
      `SELECT id, user_id, name, email, country_code, whatsapp, city_origin, interest_category,
              budget_range, location_plan, message, created_at, updated_at
       FROM franchisee_profiles
       WHERE user_id = ?
       LIMIT 1`
    )
    .bind(userId)
    .first();
}

async function loadPublicOpportunity(db, franchiseId) {
  return await db
    .prepare(
      `SELECT f.id, f.brand_name, f.slug, f.category, f.city_origin, f.status, f.verification_tier,
              f.min_investment_idr, f.max_investment_idr, f.total_investment_idr,
              f.estimated_bep_months, f.short_desc, f.logo_url, f.cover_url,
              p.canonical_url, p.publication_status
       FROM franchises f
       INNER JOIN franchise_site_publications p
          ON p.franchise_id = f.id
         AND p.site_id = ?
         AND p.publication_status = 'published'
       WHERE f.id = ?
       LIMIT 1`
    )
    .bind(SITE_FRANCHISEE_ID, franchiseId)
    .first();
}

async function loadOwnedPublicationDistribution(db, franchiseIds) {
  const ids = Array.from(new Set((franchiseIds || []).filter(Boolean)));
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  try {
    const result = await db
      .prepare(
        `SELECT
          p.franchise_id,
          p.site_id,
          p.slug,
          p.canonical_url,
          p.publication_status,
          p.is_primary,
          p.updated_at,
          ns.domain,
          ns.name,
          ns.site_type
         FROM franchise_site_publications p
         LEFT JOIN network_sites ns ON ns.id = p.site_id
         WHERE p.franchise_id IN (${placeholders})
         ORDER BY p.is_primary DESC, ns.domain ASC`
      )
      .bind(...ids)
      .all();
    const byFranchise = new Map();
    for (const row of result.results || []) {
      const rows = byFranchise.get(row.franchise_id) || [];
      rows.push(row);
      byFranchise.set(row.franchise_id, rows);
    }
    return byFranchise;
  } catch (_error) {
    return new Map();
  }
}

async function loadSavedOpportunities(db, userId) {
  try {
    const result = await db
      .prepare(
        `SELECT s.id AS saved_id, s.note, s.created_at AS saved_at,
                f.id, f.brand_name, f.slug, f.category, f.city_origin, f.status, f.verification_tier,
                f.min_investment_idr, f.max_investment_idr, f.total_investment_idr,
                f.estimated_bep_months, f.short_desc, f.logo_url, f.cover_url,
                p.canonical_url, p.publication_status
         FROM franchise_saved_opportunities s
         INNER JOIN franchises f ON f.id = s.franchise_id
         LEFT JOIN franchise_site_publications p
           ON p.franchise_id = f.id
          AND p.site_id = s.source_site_id
         WHERE s.user_id = ?
           AND s.source_site_id = ?
         ORDER BY s.updated_at DESC, s.created_at DESC
         LIMIT 24`
      )
      .bind(userId, SITE_FRANCHISEE_ID)
      .all();

    return (result.results || []).map((row) => ({
      ...row,
      canonical_url: row.canonical_url || (row.slug ? `/peluang-usaha/${row.slug}` : ""),
      budget_fit: "unknown",
      budget_label: "Tersimpan",
      reasons: ["Tersimpan di akun Anda"],
    }));
  } catch (error) {
    if (isMissingSavedTableError(error)) return [];
    throw error;
  }
}

async function loadFranchiseeInquiryHistory(db, userId, franchiseeProfileId) {
  const result = await db
    .prepare(
      `SELECT fl.id, fl.franchise_id, fl.status, fl.message, fl.created_at, fl.updated_at,
              f.brand_name, f.slug, f.category,
              p.canonical_url
       FROM franchise_leads fl
       LEFT JOIN franchises f ON f.id = fl.franchise_id
       LEFT JOIN franchise_site_publications p
         ON p.franchise_id = fl.franchise_id
        AND p.site_id = ?
       WHERE fl.franchisee_user_id = ?
          OR (? IS NOT NULL AND fl.franchisee_profile_id = ?)
       ORDER BY fl.created_at DESC
       LIMIT 20`
    )
    .bind(SITE_FRANCHISEE_ID, userId, franchiseeProfileId || null, franchiseeProfileId || null)
    .all();
  return result.results || [];
}

async function loadFranchisorLeadInbox(db, userId, franchisorProfileId) {
  const result = await db
    .prepare(
      `SELECT fl.id, fl.franchise_id, fl.franchisee_user_id, fl.name, fl.email, fl.country_code,
              fl.whatsapp, fl.city_origin, fl.budget_range, fl.message, fl.status,
              fl.created_at, fl.updated_at,
              f.brand_name, f.slug,
              p.canonical_url
       FROM franchise_leads fl
       INNER JOIN franchises f ON f.id = fl.franchise_id
       LEFT JOIN franchise_site_publications p
         ON p.franchise_id = f.id
        AND p.site_id = ?
       WHERE f.owner_user_id = ?
          OR (? IS NOT NULL AND f.franchisor_profile_id = ?)
       ORDER BY fl.created_at DESC
       LIMIT 80`
    )
    .bind(SITE_FRANCHISEE_ID, userId, franchisorProfileId || null, franchisorProfileId || null)
    .all();

  return result.results || [];
}

async function loadFranchiseeLead(db, leadId) {
  return await db
    .prepare(
      `SELECT fl.id, fl.franchise_id, fl.status, fl.message, fl.created_at, fl.updated_at,
              f.brand_name, f.slug, f.category,
              p.canonical_url
       FROM franchise_leads fl
       LEFT JOIN franchises f ON f.id = fl.franchise_id
       LEFT JOIN franchise_site_publications p
         ON p.franchise_id = fl.franchise_id
        AND p.site_id = ?
       WHERE fl.id = ?
       LIMIT 1`
    )
    .bind(SITE_FRANCHISEE_ID, leadId)
    .first();
}

async function loadFranchisorProfile(db, userId) {
  return await db
    .prepare(
      `SELECT id, user_id, company_name, pic_name, email_contact, country_code, whatsapp,
              website_url, instagram_url, facebook_url, tiktok_url, youtube_url, linkedin_url,
              nib_number, haki_status, haki_number, created_at, updated_at
       FROM franchisor_profiles
       WHERE user_id = ?
       LIMIT 1`
    )
    .bind(userId)
    .first();
}

async function loadOwnedListing(db, actor, franchiseId, franchisorProfileId) {
  return await db
    .prepare(
      `SELECT f.*, p.publication_status, p.canonical_url, p.last_synced_at
       FROM franchises f
       LEFT JOIN franchise_site_publications p
         ON p.franchise_id = f.id
        AND p.site_id = ?
       WHERE f.id = ?
         AND (f.owner_user_id = ? OR (? IS NOT NULL AND f.franchisor_profile_id = ?))
       LIMIT 1`
    )
    .bind(SITE_FRANCHISEE_ID, franchiseId, actor.id, franchisorProfileId || null, franchisorProfileId || null)
    .first();
}
