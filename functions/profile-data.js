import { createClerkClient } from "@clerk/backend";
import { z } from "zod";
import {
  authErrorResponse,
  requireD1User,
  syncClerkMetadataForD1User,
  syncClerkMetadataFromD1,
} from "./_clerk-auth.js";
import { SITE_FRANCHISEE_ID, siteRebuildStatements } from "./_site-publish-queue.js";

const OWNER_LISTING_EDIT_INTERVAL_HOURS = 6;
const RECOMMENDATION_LIMIT = 6;

const AccountSchema = z.object({
  action: z.literal("update_account"),
  display_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
});

const FranchiseeProfileSchema = z.object({
  action: z.literal("update_franchisee_profile"),
  country_code: optionalText(12),
  whatsapp: optionalText(40),
  city_origin: optionalText(120),
  interest_category: optionalText(120),
  budget_range: optionalText(120),
  location_plan: optionalText(120),
  message: optionalText(1200),
});

const FranchisorProfileSchema = z.object({
  action: z.literal("update_franchisor_profile"),
  company_name: optionalText(180),
  country_code: optionalText(12),
  whatsapp: optionalText(40),
  website_url: optionalText(500),
  instagram_url: optionalText(500),
  facebook_url: optionalText(500),
  tiktok_url: optionalText(500),
  youtube_url: optionalText(500),
  linkedin_url: optionalText(500),
  nib_number: optionalText(32),
  haki_status: z.enum(["registered", "process", "none", ""]).optional(),
  haki_number: optionalText(80),
});

const ListingSchema = z.object({
  action: z.literal("update_listing"),
  franchise_id: z.string().trim().min(3).max(120),
  brand_name: optionalText(180),
  category: optionalText(120),
  year_established: optionalInt(),
  city_origin: optionalText(120),
  outlet_type: optionalText(120),
  location_requirement: optionalText(240),
  rent_cost_text: optionalText(240),
  fee_license_idr: optionalMoney(),
  fee_capex_idr: optionalMoney(),
  fee_construction_idr: optionalMoney(),
  total_investment_idr: optionalMoney(),
  min_investment_idr: optionalMoney(),
  max_investment_idr: optionalMoney(),
  estimated_bep_months: optionalInt(),
  net_profit_percent: optionalNumber(),
  royalty_percent: optionalNumber(),
  royalty_basis: optionalText(80),
  short_desc: optionalText(280),
  full_desc: optionalText(5000),
  support_system: optionalText(2000),
  phone: optionalText(80),
  office_address: optionalText(800),
  outlets_location: optionalText(800),
  logo_url: optionalText(500),
  cover_url: optionalText(500),
  gallery_urls: optionalText(2000),
  video_url: optionalText(500),
  proposal_url: optionalText(500),
});

const AddPublicRoleSchema = z.object({
  action: z.literal("add_public_role"),
  role: z.enum(["franchisee", "franchisor"]),
});

const FranchiseInquirySchema = z.object({
  action: z.literal("create_franchise_inquiry"),
  franchise_id: z.string().trim().min(3).max(120),
  message: optionalText(1200),
});

const MutationSchema = z.discriminatedUnion("action", [
  AccountSchema,
  FranchiseeProfileSchema,
  FranchisorProfileSchema,
  ListingSchema,
  AddPublicRoleSchema,
  FranchiseInquirySchema,
]);

export async function onRequestGet({ request, env }) {
  try {
    const db = getDb(env);
    const actor = await requireD1User(request, env, db);
    const data = await loadProfileData(db, actor);
    return jsonResponse({ success: true, ...data });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
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

    return jsonResponse({ success: false, message: "Aksi profil tidak dikenali." }, { status: 400 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
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

  const inquiryHistory = await loadFranchiseeInquiryHistory(db, actor.id, franchiseeProfile?.id || null);
  const recommendations = franchiseeProfile
    ? await loadFranchiseeRecommendations(db, franchiseeProfile, new Set((owned.results || []).map((row) => row.id)))
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
    owned_franchises: (owned.results || []).map((row) => ({
      ...row,
      edit_locked: Number(row.owner_edits_window || 0) > 0,
      edit_interval_hours: OWNER_LISTING_EDIT_INTERVAL_HOURS,
    })),
    claims: claims.results || [],
    franchisee_recommendations: recommendations,
    inquiry_history: inquiryHistory,
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
    return jsonResponse({ success: false, message: "Lengkapi minat usaha terlebih dahulu agar kami bisa mengirim info dengan data kontak Anda." }, { status: 404 });
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

  return jsonResponse({
    success: true,
    lead: await loadFranchiseeLead(db, leadId),
    inquiry_history: await loadFranchiseeInquiryHistory(db, actor.id, franchiseeProfile.id),
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

async function loadFranchiseeRecommendations(db, profile, ownedIds) {
  const result = await db
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
       ORDER BY f.updated_at DESC, f.brand_name ASC
       LIMIT 220`
    )
    .bind(SITE_FRANCHISEE_ID)
    .all();

  const rows = result.results || [];
  return rows
    .filter((row) => !ownedIds.has(row.id))
    .map((row) => {
      const budget = budgetFit(row, profile.budget_range);
      const categoryMatch = matchesInterest(row.category, profile.interest_category);
      const reasons = recommendationReasons(row, profile, budget, categoryMatch);
      return {
        id: row.id,
        brand_name: row.brand_name,
        slug: row.slug,
        category: row.category,
        city_origin: row.city_origin,
        verification_tier: row.verification_tier,
        min_investment_idr: row.min_investment_idr,
        max_investment_idr: row.max_investment_idr,
        total_investment_idr: row.total_investment_idr,
        estimated_bep_months: row.estimated_bep_months,
        short_desc: row.short_desc,
        logo_url: row.logo_url,
        cover_url: row.cover_url,
        canonical_url: row.canonical_url || (row.slug ? `/peluang-usaha/${row.slug}` : ""),
        budget_fit: budget.fit,
        budget_label: budget.label,
        reasons,
        score: recommendationScore(row, budget, categoryMatch, reasons),
      };
    })
    .sort((a, b) => b.score - a.score || String(a.brand_name || "").localeCompare(String(b.brand_name || "")))
    .slice(0, RECOMMENDATION_LIMIT);
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

function listingPatch(data) {
  const fields = [
    "brand_name",
    "category",
    "year_established",
    "city_origin",
    "outlet_type",
    "location_requirement",
    "rent_cost_text",
    "fee_license_idr",
    "fee_capex_idr",
    "fee_construction_idr",
    "total_investment_idr",
    "min_investment_idr",
    "max_investment_idr",
    "estimated_bep_months",
    "net_profit_percent",
    "royalty_percent",
    "royalty_basis",
    "short_desc",
    "full_desc",
    "support_system",
    "phone",
    "office_address",
    "outlets_location",
    "logo_url",
    "cover_url",
    "gallery_urls",
    "video_url",
    "proposal_url",
  ];
  const patch = {};
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      patch[field] = normalizePatchValue(field, data[field]);
    }
  });
  return patch;
}

function normalizePatchValue(field, value) {
  if (value === undefined || value === "") return null;
  if (field.endsWith("_idr") || field === "year_established" || field === "estimated_bep_months") return intOrNull(value);
  if (field === "net_profit_percent" || field === "royalty_percent") return numberOrNull(value);
  return textOrNull(value);
}

function buildUpdate(table, patch, idColumn) {
  const keys = Object.keys(patch);
  return {
    sql: `UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE ${idColumn} = ?`,
    values: keys.map((key) => patch[key]),
  };
}

function recommendationScore(row, budget, categoryMatch, reasons) {
  let score = 0;
  if (categoryMatch) score += 50;
  if (budget.fit === "fit") score += 35;
  if (budget.fit === "near") score += 18;
  if (budget.fit === "unknown") score += 6;
  if (row.verification_tier === "premium") score += 8;
  if (row.verification_tier === "verified") score += 6;
  if (Number(row.estimated_bep_months || 0) > 0 && Number(row.estimated_bep_months) <= 24) score += 5;
  score += Math.min(reasons.length, 3);
  return score;
}

function recommendationReasons(row, profile, budget, categoryMatch) {
  const reasons = [];
  if (categoryMatch) reasons.push("Sesuai minat kategori");
  if (budget.fit === "fit") reasons.push("Cocok dengan budget Anda");
  if (budget.fit === "near") reasons.push("Dekat dengan budget Anda");
  if (profile.location_plan === "ready") reasons.push("Siap dibandingkan dengan lokasi Anda");
  if (Number(row.estimated_bep_months || 0) > 0) reasons.push(`Estimasi BEP ${row.estimated_bep_months} bulan`);
  if (!reasons.length) reasons.push("Peluang aktif di direktori");
  return reasons.slice(0, 3);
}

function matchesInterest(category, interest) {
  const text = normalizeForMatch(category);
  const aliases = {
    fb: ["fnb", "food", "makanan", "minuman", "restoran", "restaurant", "cafe", "kopi", "teh"],
    retail: ["retail", "minimarket", "toko", "mart", "sembako", "produk"],
    service: ["jasa", "layanan", "service", "laundry", "logistik", "otomotif", "travel"],
    edu: ["pendidikan", "kursus", "edukasi", "education", "training", "belajar", "sekolah"],
    beauty: ["kecantikan", "kesehatan", "beauty", "health", "salon", "spa", "aesthetic"],
  };
  const keys = aliases[normalizeForMatch(interest)] || [];
  return keys.some((key) => text.includes(key));
}

function budgetFit(row, budgetRange) {
  if (!textOrNull(budgetRange)) return { fit: "unknown", label: "Budget belum diisi" };
  const range = parseBudgetRange(budgetRange);
  const amount = Number(row.min_investment_idr || row.total_investment_idr || row.max_investment_idr || 0);
  if (!amount) return { fit: "unknown", label: "Budget belum tersedia" };
  if (!range.max && range.min) {
    return amount >= range.min ? { fit: "fit", label: "Sesuai budget" } : { fit: "fit", label: "Di bawah budget" };
  }
  if (range.max && amount <= range.max) return { fit: "fit", label: "Sesuai budget" };
  if (range.max && amount <= Math.round(range.max * 1.25)) return { fit: "near", label: "Sedikit di atas budget" };
  return { fit: "over", label: "Di atas budget" };
}

function parseBudgetRange(value) {
  const text = normalizeForMatch(value);
  if (text.includes("<50")) return { min: 0, max: 50000000 };
  if (text.includes("50-100")) return { min: 50000000, max: 100000000 };
  if (text.includes("100-500")) return { min: 100000000, max: 500000000 };
  if (text.includes(">500")) return { min: 500000000, max: null };
  return { min: 0, max: null };
}

function normalizeForMatch(value) {
  return normalizeText(value).toLowerCase().replace(/&/g, "and");
}

function splitDisplayName(displayName) {
  const parts = normalizeText(displayName).split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || displayName,
    lastName: parts.join(" ") || undefined,
  };
}

function getPrimaryEmail(clerkUser) {
  const primaryId = clerkUser?.primaryEmailAddressId;
  const primary = (clerkUser?.emailAddresses || []).find((email) => email.id === primaryId) || clerkUser?.emailAddresses?.[0];
  return primary?.emailAddress || "";
}

function optionalText(max) {
  return z.string().trim().max(max).optional().or(z.literal(""));
}

function optionalInt() {
  return z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : Number(value)), z.number().int().optional());
}

function optionalNumber() {
  return z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : Number(value)), z.number().optional());
}

function optionalMoney() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return Number(String(value).replace(/[^\d.-]/g, ""));
  }, z.number().int().optional());
}

function getDb(env) {
  if (!env.franchise_db) {
    throw new Error("Layanan profil belum siap. Silakan coba lagi nanti.");
  }
  return env.franchise_db;
}

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function validationError(error) {
  return jsonResponse(
    {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Data profil belum valid.",
      issues: error.issues,
    },
    { status: 400 }
  );
}

function auditStatement(db, action, entityType, entityId, metadata = {}, actorUserId = null) {
  return db
    .prepare(
      `INSERT INTO audit_events (id, actor_user_id, source_site_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      `audit_${randomId()}`,
      actorUserId,
      SITE_FRANCHISEE_ID,
      action,
      entityType,
      entityId,
      JSON.stringify(metadata)
    );
}

function normalizeWhatsapp(value) {
  const text = textOrNull(value);
  if (!text) return null;
  return text.replace(/[^\d+]/g, "");
}

function textOrNull(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeText(value) {
  return (value ?? "").toString().trim().replace(/\s+/g, " ");
}

function intOrNull(value) {
  const clean = String(value ?? "").replace(/[^\d-]/g, "");
  if (!clean) return null;
  const parsed = Number.parseInt(clean, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}
