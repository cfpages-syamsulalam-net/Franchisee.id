import {
  OWNER_LISTING_EDIT_INTERVAL_HOURS,
  loadFranchisorLeadInbox,
  loadOwnedPublicationDistribution,
  loadOwnedStructuredLocations,
} from "./_profile-franchisor-actions.js";
import { loadPremiumMembershipData } from "./_profile-premium.js";
import { loadOwnerAnalytics } from "./_profile-owner-analytics.js";
import { loadFranchiseeRecommendations } from "./_profile-recommendations.js";
import { getPrimaryEmail, isMissingSavedTableError } from "./_profile-utils.js";
import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";

const RECOMMENDATION_LIMIT = 6;

export const profileLoaders = {
  loadFranchiseeInquiryHistory,
  loadFranchiseeLead,
  loadFranchiseeProfile,
  loadPublicOpportunity,
  loadSavedOpportunities,
};

export async function loadProfileData(db, actor) {
  const franchiseeProfile = await loadFranchiseeProfile(db, actor.id);
  const franchisorProfile = await db
    .prepare(
      `SELECT id, user_id, company_name, pic_name, email_contact, country_code, whatsapp,
              website_url, instagram_url, facebook_url, tiktok_url, youtube_url, linkedin_url,
              nib_number, haki_status, haki_number, created_at, updated_at
       FROM franchisor_profiles
       WHERE user_id = ?
       LIMIT 1`,
    )
    .bind(actor.id)
    .first();

  const owned = await db
    .prepare(
      `SELECT f.id, f.brand_name, f.slug, f.category, f.status, f.verification_tier,
              f.year_established, f.city_origin, f.brand_country, f.outlet_type, f.target_market, f.location_requirement,
              f.min_area_sqm, f.min_staff_count, f.setup_duration_days,
              f.rent_cost_text, f.fee_license_idr, f.fee_capex_idr, f.fee_construction_idr,
              f.working_capital_idr, f.additional_cost_notes,
              f.total_investment_idr, f.min_investment_idr, f.max_investment_idr,
              f.estimated_bep_months, f.estimated_bep_min_months, f.estimated_bep_max_months,
              f.omzet_monthly_idr, f.omzet_monthly_min_idr, f.omzet_monthly_max_idr,
              f.net_profit_percent, f.net_profit_monthly_min_idr, f.net_profit_monthly_max_idr,
              f.royalty_percent, f.royalty_basis,
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
       ORDER BY f.updated_at DESC, f.brand_name ASC`,
    )
    .bind(
      actor.id,
      actor.id,
      `-${OWNER_LISTING_EDIT_INTERVAL_HOURS} hours`,
      SITE_FRANCHISEE_ID,
      actor.id,
      franchisorProfile?.id || null,
      franchisorProfile?.id || null,
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
       LIMIT 20`,
    )
    .bind(actor.id)
    .all();

  const ownedRows = owned.results || [];
  const publicationDistribution = await loadOwnedPublicationDistribution(db, ownedRows.map((row) => row.id));
  const structuredLocations = await loadOwnedStructuredLocations(db, ownedRows.map((row) => row.id));
  const inquiryHistory = await loadFranchiseeInquiryHistory(db, actor.id, franchiseeProfile?.id || null);
  const savedOpportunities = await loadSavedOpportunities(db, actor.id);
  const franchisorLeads = await loadFranchisorLeadInbox(db, actor.id, franchisorProfile?.id || null);
  const premiumMembership = await loadPremiumMembershipData(db, actor.id, ownedRows.map((row) => row.id));
  const ownerAnalytics = await loadOwnerAnalytics(db, ownedRows);
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
      structured_locations: structuredLocations.get(row.id) || [],
      location_override_active: (structuredLocations.get(row.id) || []).some((item) => item.source_field === "owner_profile"),
      edit_locked: Number(row.owner_edits_window || 0) > 0,
      edit_interval_hours: OWNER_LISTING_EDIT_INTERVAL_HOURS,
    })),
    claims: claims.results || [],
    franchisee_recommendations: recommendations,
    saved_opportunities: savedOpportunities,
    inquiry_history: inquiryHistory,
    franchisor_leads: franchisorLeads,
    premium_membership: premiumMembership,
    owner_analytics: ownerAnalytics,
  };
}

async function loadFranchiseeProfile(db, userId) {
  return await db
    .prepare(
      `SELECT id, user_id, name, email, country_code, whatsapp, city_origin, interest_category,
              budget_range, location_plan, message, created_at, updated_at
       FROM franchisee_profiles
       WHERE user_id = ?
       LIMIT 1`,
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
       LIMIT 1`,
    )
    .bind(SITE_FRANCHISEE_ID, franchiseId)
    .first();
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
         LIMIT 24`,
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
       LIMIT 20`,
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
       LIMIT 1`,
    )
    .bind(SITE_FRANCHISEE_ID, leadId)
    .first();
}
