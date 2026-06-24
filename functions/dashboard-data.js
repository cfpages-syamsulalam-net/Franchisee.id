import { z } from "zod";
import { AuthError, authErrorResponse, requireD1User } from "./_clerk-auth.js";
import { SITE_FRANCHISEE_ID, siteRebuildStatements } from "./_site-publish-queue.js";

const SITE_ID = SITE_FRANCHISEE_ID;
const EDIT_FIELD_NAME = "json_diff";

const EDITABLE_LISTING_FIELDS = new Set([
  "brand_name",
  "category",
  "subcategory",
  "label",
  "status",
  "verification_tier",
  "year_established",
  "city_origin",
  "outlet_type",
  "location_requirement",
  "rent_cost_text",
  "contract_duration_months",
  "fee_license_idr",
  "fee_capex_idr",
  "fee_construction_idr",
  "total_investment_idr",
  "min_investment_idr",
  "max_investment_idr",
  "estimated_bep_months",
  "omzet_monthly_idr",
  "hpp_percent",
  "net_profit_percent",
  "royalty_percent",
  "royalty_basis",
  "royalty_period",
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
]);

const INTEGER_FIELDS = new Set([
  "year_established",
  "contract_duration_months",
  "fee_license_idr",
  "fee_capex_idr",
  "fee_construction_idr",
  "total_investment_idr",
  "min_investment_idr",
  "max_investment_idr",
  "estimated_bep_months",
  "omzet_monthly_idr",
]);

const REAL_FIELDS = new Set(["hpp_percent", "net_profit_percent", "royalty_percent"]);
const STATUS_VALUES = new Set(["unclaimed", "draft", "pending_review", "free", "verified", "premium", "suspended", "archived"]);
const TIER_VALUES = new Set(["unclaimed", "free", "verified", "premium"]);
const ROYALTY_BASIS_VALUES = new Set(["omzet", "profit", "fixed", "none"]);

const OutreachEventSchema = z.object({
  action: z.literal("log_outreach"),
  franchise_id: z.string().trim().min(1),
  contact_label: z.string().trim().max(80).optional().default("WhatsApp"),
  contact_value: z.string().trim().max(120).optional().default(""),
  message_text: z.string().trim().max(1200).optional().default(""),
  outcome: z
    .enum(["queued", "contacted", "replied", "claim_started", "claimed", "invalid_contact", "no_response", "note"])
    .optional()
    .default("contacted"),
  notes: z.string().trim().max(1000).optional().default(""),
});

const SuggestEditSchema = z.object({
  action: z.literal("suggest_edit"),
  franchise_id: z.string().trim().min(1),
  changes: z.record(z.unknown()),
  reason: z.string().trim().max(1200).optional().default(""),
});

const ReviewEditSuggestionSchema = z.object({
  action: z.literal("review_edit_suggestion"),
  suggestion_id: z.string().trim().min(1),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(1200).optional().default(""),
});

const ReviewClaimSchema = z.object({
  action: z.literal("review_claim"),
  claim_id: z.string().trim().min(1),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(1200).optional().default(""),
});

const DashboardActionSchema = z.discriminatedUnion("action", [
  OutreachEventSchema,
  SuggestEditSchema,
  ReviewEditSuggestionSchema,
  ReviewClaimSchema,
]);

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireDashboardAccess(request, env);
    const db = env.franchise_db;

    const [overview, dataQuality, publishState, outreachQueue, pendingClaims, recentOutreach, editSuggestions, editableListings, leadSummary, systemHealth] = await Promise.all([
      getOverview(db),
      getDataQuality(db),
      getPublishState(db),
      getUnclaimedOutreachQueue(db),
      getPendingClaims(db),
      getRecentOutreach(db),
      getEditSuggestions(db),
      getEditableListings(db),
      getLeadSummary(db),
      getSystemHealth(db),
    ]);

    return jsonResponse({
      success: true,
      site: {
        id: SITE_ID,
        domain: "franchisee.id",
        scope: "site",
      },
      user: {
        id: auth.id,
        email: auth.primary_email,
        name: auth.display_name,
        roles: auth.roles.map((role) => role.role),
      },
      overview,
      data_quality: dataQuality,
      publish_state: publishState,
      outreach_queue: outreachQueue,
      pending_claims: pendingClaims,
      recent_outreach: recentOutreach,
      edit_suggestions: editSuggestions,
      editable_listings: editableListings,
      lead_summary: leadSummary,
      system_health: systemHealth,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return jsonResponse({ success: false, error: "DASHBOARD_ERROR", message: error.message }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const auth = await requireDashboardAccess(request, env);
    const parsed = DashboardActionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonResponse(
        { success: false, error: "INVALID_DASHBOARD_ACTION", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    if (data.action === "log_outreach") return handleLogOutreach(env.franchise_db, auth, data);
    if (data.action === "suggest_edit") return handleSuggestEdit(env.franchise_db, auth, data);
    if (data.action === "review_edit_suggestion") return handleReviewEditSuggestion(env.franchise_db, auth, data);
    if (data.action === "review_claim") return handleReviewClaim(env.franchise_db, auth, data);

    return jsonResponse({ success: false, error: "UNKNOWN_DASHBOARD_ACTION" }, { status: 400 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return jsonResponse({ success: false, error: "DASHBOARD_ACTION_FAILED", message: error.message }, { status: 500 });
  }
}

async function handleLogOutreach(db, auth, data) {
    const eventId = `outreach_${randomId()}`;
    await db
      .prepare(
        `INSERT INTO listing_outreach_events (
          id, franchise_id, site_id, staff_user_id, channel, contact_label, contact_value,
          message_template_key, message_text, outcome, notes
        ) VALUES (?, ?, ?, ?, 'whatsapp', ?, ?, 'unclaimed_claim_notice_v1', ?, ?, ?)`,
      )
      .bind(
        eventId,
        data.franchise_id,
        SITE_ID,
        auth.id,
        data.contact_label,
        data.contact_value,
        data.message_text,
        data.outcome,
        data.notes,
      )
      .run();

    await db
      .prepare(
        `INSERT INTO audit_events (id, actor_user_id, source_site_id, action, entity_type, entity_id, metadata)
         VALUES (?, ?, ?, 'dashboard.outreach.log', 'franchise', ?, ?)`,
      )
      .bind(`audit_${randomId()}`, auth.id, SITE_ID, data.franchise_id, JSON.stringify({ outcome: data.outcome, contact: data.contact_value }))
      .run();

    return jsonResponse({ success: true, event_id: eventId });
}

async function handleSuggestEdit(db, auth, data) {
  const changes = sanitizeChanges(data.changes);
  const listing = await getListingSnapshot(db, data.franchise_id);
  if (!listing) return jsonResponse({ success: false, error: "LISTING_NOT_FOUND" }, { status: 404 });

  const oldValues = {};
  Object.keys(changes).forEach((field) => {
    oldValues[field] = listing[field] ?? null;
  });

  const admin = isAdmin(auth);
  const autoApproved = admin || (await hasAutoApproval(db, auth.id));
  const status = admin ? "approved" : autoApproved ? "auto_approved" : "pending";
  const suggestionId = `suggestion_${randomId()}`;
  const statements = [
    db
      .prepare(
        `INSERT INTO listing_edit_suggestions (
          id, franchise_id, site_id, suggested_by_user_id, status, field_name,
          old_value, suggested_value, reason, reviewed_by_user_id, reviewed_at, review_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        suggestionId,
        data.franchise_id,
        SITE_ID,
        auth.id,
        status,
        EDIT_FIELD_NAME,
        JSON.stringify(oldValues),
        JSON.stringify(changes),
        data.reason,
        autoApproved ? auth.id : null,
        autoApproved ? new Date().toISOString() : null,
        autoApproved ? "Applied from dashboard edit form." : null,
      ),
    auditStatement(db, "dashboard.edit.suggest", "franchise", data.franchise_id, {
      suggestion_id: suggestionId,
      status,
      fields: Object.keys(changes),
    }, auth.id),
  ];

  if (autoApproved) {
    statements.push(
      updateListingStatement(db, data.franchise_id, changes),
      auditStatement(db, "dashboard.edit.apply", "franchise", data.franchise_id, {
        suggestion_id: suggestionId,
        fields: Object.keys(changes),
        auto_approved: !admin,
      }, auth.id),
      ...siteRebuildStatements(db, {
        siteId: SITE_ID,
        franchiseId: data.franchise_id,
        reason: "dashboard_listing_edit",
        entityType: "listing_edit_suggestions",
        entityId: suggestionId,
        actorUserId: auth.id,
        source: "dashboard",
        metadata: { fields: Object.keys(changes), status },
      }),
    );
  }

  await db.batch(statements);
  return jsonResponse({ success: true, suggestion_id: suggestionId, status, applied: autoApproved });
}

async function handleReviewEditSuggestion(db, auth, data) {
  assertAdmin(auth);
  const suggestion = await db
    .prepare(
      `SELECT les.*, f.brand_name
       FROM listing_edit_suggestions les
       JOIN franchises f ON f.id = les.franchise_id
       WHERE les.id = ? AND les.site_id = ?
       LIMIT 1`
    )
    .bind(data.suggestion_id, SITE_ID)
    .first();

  if (!suggestion) return jsonResponse({ success: false, error: "SUGGESTION_NOT_FOUND" }, { status: 404 });
  if (suggestion.status !== "pending") {
    return jsonResponse({ success: false, error: "SUGGESTION_ALREADY_REVIEWED", status: suggestion.status }, { status: 409 });
  }

  const approved = data.decision === "approve";
  const status = approved ? "approved" : "rejected";
  const statements = [
    db
      .prepare(
        `UPDATE listing_edit_suggestions
         SET status = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP, review_notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(status, auth.id, data.notes, data.suggestion_id),
    auditStatement(db, approved ? "dashboard.edit.approve" : "dashboard.edit.reject", "listing_edit_suggestions", data.suggestion_id, {
      franchise_id: suggestion.franchise_id,
      notes: data.notes,
    }, auth.id),
  ];

  if (approved) {
    const changes = sanitizeChanges(parseJson(suggestion.suggested_value, {}));
    statements.push(
      updateListingStatement(db, suggestion.franchise_id, changes),
      auditStatement(db, "dashboard.edit.apply", "franchise", suggestion.franchise_id, {
        suggestion_id: data.suggestion_id,
        fields: Object.keys(changes),
      }, auth.id),
      ...siteRebuildStatements(db, {
        siteId: SITE_ID,
        franchiseId: suggestion.franchise_id,
        reason: "dashboard_listing_edit_approved",
        entityType: "listing_edit_suggestions",
        entityId: data.suggestion_id,
        actorUserId: auth.id,
        source: "dashboard",
        metadata: { fields: Object.keys(changes) },
      }),
    );
  }

  await db.batch(statements);
  return jsonResponse({ success: true, status });
}

async function handleReviewClaim(db, auth, data) {
  assertAdmin(auth);
  const claim = await db
    .prepare(
      `SELECT fc.*, f.brand_name, f.status AS franchise_status, f.verification_tier
       FROM franchise_claims fc
       JOIN franchises f ON f.id = fc.franchise_id
       WHERE fc.id = ? AND fc.source_site_id = ?
       LIMIT 1`
    )
    .bind(data.claim_id, SITE_ID)
    .first();

  if (!claim) return jsonResponse({ success: false, error: "CLAIM_NOT_FOUND" }, { status: 404 });
  if (claim.status !== "pending") {
    return jsonResponse({ success: false, error: "CLAIM_ALREADY_REVIEWED", status: claim.status }, { status: 409 });
  }

  const approved = data.decision === "approve";
  const status = approved ? "approved" : "rejected";
  const statements = [
    db
      .prepare(
        `UPDATE franchise_claims
         SET status = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP, review_notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(status, auth.id, data.notes, data.claim_id),
    auditStatement(db, approved ? "dashboard.claim.approve" : "dashboard.claim.reject", "franchise_claims", data.claim_id, {
      franchise_id: claim.franchise_id,
      claimant_user_id: claim.claimant_user_id,
      notes: data.notes,
    }, auth.id),
  ];

  if (approved) {
    statements.push(
      db
        .prepare(
          `UPDATE franchises
           SET owner_user_id = COALESCE(?, owner_user_id),
               franchisor_profile_id = COALESCE(?, franchisor_profile_id),
               status = CASE WHEN status = 'unclaimed' THEN 'free' ELSE status END,
               verification_tier = CASE WHEN verification_tier = 'unclaimed' THEN 'free' ELSE verification_tier END,
               source_sheet = 'FRANCHISOR',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
        .bind(claim.claimant_user_id, claim.franchisor_profile_id, claim.franchise_id),
      auditStatement(db, "dashboard.claim.apply_owner", "franchise", claim.franchise_id, {
        claim_id: data.claim_id,
        claimant_user_id: claim.claimant_user_id,
      }, auth.id),
      ...siteRebuildStatements(db, {
        siteId: SITE_ID,
        franchiseId: claim.franchise_id,
        reason: "dashboard_claim_approved",
        entityType: "franchise_claims",
        entityId: data.claim_id,
        actorUserId: auth.id,
        source: "dashboard",
        metadata: { claimant_user_id: claim.claimant_user_id },
      }),
    );
  }

  await db.batch(statements);
  return jsonResponse({ success: true, status });
}

async function requireDashboardAccess(request, env) {
  if (!env.franchise_db) {
    throw new Error("Cloudflare D1 binding `franchise_db` is required for dashboard data.");
  }
  return requireD1User(request, env, env.franchise_db, { requiredRole: "staff" });
}

async function getOverview(db) {
  const row = await db
    .prepare(
      `SELECT
        COUNT(*) AS total_listings,
        SUM(CASE WHEN f.source_sheet = 'UNCLAIMED' OR f.verification_tier = 'unclaimed' OR f.status = 'unclaimed' THEN 1 ELSE 0 END) AS unclaimed_listings,
        SUM(CASE WHEN f.verification_tier = 'verified' THEN 1 ELSE 0 END) AS verified_listings,
        SUM(CASE WHEN f.verification_tier = 'premium' THEN 1 ELSE 0 END) AS premium_listings,
        SUM(CASE WHEN p.publication_status = 'published' THEN 1 ELSE 0 END) AS published_listings,
        SUM(CASE WHEN COALESCE(f.logo_url, '') = '' AND COALESCE(f.cover_url, '') = '' THEN 1 ELSE 0 END) AS missing_images,
        SUM(CASE WHEN COALESCE(f.phone, '') = '' AND COALESCE(fp.whatsapp, '') = '' THEN 1 ELSE 0 END) AS missing_contact,
        SUM(CASE WHEN COALESCE(f.full_desc, f.short_desc, '') = '' THEN 1 ELSE 0 END) AS missing_description
      FROM franchise_site_publications p
      JOIN franchises f ON f.id = p.franchise_id
      LEFT JOIN franchisor_profiles fp ON fp.id = f.franchisor_profile_id
      WHERE p.site_id = ?`,
    )
    .bind(SITE_ID)
    .first();

  return normalizeNumberObject(row);
}

async function getDataQuality(db) {
  const result = await db
    .prepare(
      `SELECT
        f.id,
        p.slug,
        f.brand_name,
        f.category,
        f.verification_tier,
        f.updated_at,
        CASE WHEN COALESCE(f.logo_url, '') = '' AND COALESCE(f.cover_url, '') = '' THEN 1 ELSE 0 END AS missing_image,
        CASE WHEN COALESCE(f.phone, '') = '' AND COALESCE(fp.whatsapp, '') = '' THEN 1 ELSE 0 END AS missing_contact,
        CASE WHEN COALESCE(f.full_desc, f.short_desc, '') = '' THEN 1 ELSE 0 END AS missing_description,
        CASE WHEN COALESCE(f.category, '') = '' THEN 1 ELSE 0 END AS missing_category,
        f.short_desc,
        f.full_desc
      FROM franchise_site_publications p
      JOIN franchises f ON f.id = p.franchise_id
      LEFT JOIN franchisor_profiles fp ON fp.id = f.franchisor_profile_id
      WHERE p.site_id = ?
      ORDER BY
        (missing_image + missing_contact + missing_description + missing_category) DESC,
        f.updated_at DESC
      LIMIT 80`,
    )
    .bind(SITE_ID)
    .all();

  return (result.results || [])
    .map((row) => {
      const likelyAllCaps = isLikelyAllCapsDescription(row.full_desc || row.short_desc || "");
      const warnings = [
        row.missing_image ? "missing_image" : "",
        row.missing_contact ? "missing_contact" : "",
        row.missing_description ? "missing_description" : "",
        row.missing_category ? "missing_category" : "",
        likelyAllCaps ? "likely_all_caps" : "",
      ].filter(Boolean);
      return {
        ...row,
        likely_all_caps: likelyAllCaps ? 1 : 0,
        full_desc: undefined,
        short_desc: undefined,
        public_url: `/peluang-usaha/${row.slug}`,
        warnings,
      };
    })
    .sort((left, right) => {
      const warningDiff = right.warnings.length - left.warnings.length;
      if (warningDiff) return warningDiff;
      return String(right.updated_at || "").localeCompare(String(left.updated_at || ""));
    })
    .slice(0, 20);
}

async function getPublishState(db) {
  const state = await db.prepare("SELECT * FROM site_publish_state WHERE site_id = ? LIMIT 1").bind(SITE_ID).first();
  const pending = await db
    .prepare(
      `SELECT status, COUNT(*) AS count
       FROM site_rebuild_requests
       WHERE site_id = ?
       GROUP BY status`,
    )
    .bind(SITE_ID)
    .all();

  return {
    ...(state || { site_id: SITE_ID, is_enabled: 0, pending_count: 0, queued_count: 0 }),
    requests_by_status: normalizeGroupedCounts(pending.results || [], "status"),
  };
}

async function getUnclaimedOutreachQueue(db) {
  const result = await db
    .prepare(
      `SELECT
        f.id,
        p.slug,
        f.brand_name,
        f.category,
        f.phone,
        f.office_address,
        f.total_investment_idr,
        f.min_investment_idr,
        f.updated_at,
        MAX(loe.created_at) AS last_outreach_at,
        COUNT(loe.id) AS outreach_count
      FROM franchise_site_publications p
      JOIN franchises f ON f.id = p.franchise_id
      LEFT JOIN listing_outreach_events loe ON loe.franchise_id = f.id AND loe.site_id = p.site_id
      WHERE p.site_id = ?
        AND p.publication_status = 'published'
        AND (f.source_sheet = 'UNCLAIMED' OR f.verification_tier = 'unclaimed' OR f.status = 'unclaimed')
        AND COALESCE(f.phone, '') != ''
      GROUP BY f.id, p.slug
      ORDER BY
        CASE WHEN last_outreach_at IS NULL THEN 0 ELSE 1 END,
        f.total_investment_idr DESC,
        f.updated_at DESC
      LIMIT 75`,
    )
    .bind(SITE_ID)
    .all();

  return (result.results || []).map((row) => {
    const contacts = parseWhatsAppContacts(row.phone);
    return {
      ...row,
      public_url: `/peluang-usaha/${row.slug}`,
      claim_url: `/daftar?claim=${row.slug}`,
      contacts,
      primary_whatsapp_url: contacts[0] ? buildWhatsAppUrl(contacts[0].international_digits, row) : "",
    };
  });
}

async function getPendingClaims(db) {
  const result = await db
    .prepare(
      `SELECT
        fc.id,
        fc.status,
        fc.evidence_text,
        fc.created_at,
        f.brand_name,
        p.slug,
        u.primary_email AS claimant_email,
        u.display_name AS claimant_name
      FROM franchise_claims fc
      JOIN franchises f ON f.id = fc.franchise_id
      LEFT JOIN franchise_site_publications p ON p.franchise_id = f.id AND p.site_id = ?
      LEFT JOIN users u ON u.id = fc.claimant_user_id
      WHERE fc.source_site_id = ? AND fc.status = 'pending'
      ORDER BY fc.created_at DESC
      LIMIT 25`,
    )
    .bind(SITE_ID, SITE_ID)
    .all();
  return result.results || [];
}

async function getEditableListings(db) {
  const result = await db
    .prepare(
      `SELECT
        f.id,
        p.slug,
        f.brand_name,
        f.category,
        f.status,
        f.verification_tier,
        f.phone,
        f.office_address,
        f.updated_at
      FROM franchise_site_publications p
      JOIN franchises f ON f.id = p.franchise_id
      WHERE p.site_id = ?
      ORDER BY f.updated_at DESC, f.brand_name ASC
      LIMIT 250`,
    )
    .bind(SITE_ID)
    .all();
  return (result.results || []).map((row) => ({
    ...row,
    public_url: `/peluang-usaha/${row.slug}`,
  }));
}

async function getRecentOutreach(db) {
  const result = await db
    .prepare(
      `SELECT
        loe.id,
        loe.outcome,
        loe.contact_label,
        loe.contact_value,
        loe.created_at,
        f.brand_name,
        p.slug,
        u.display_name AS staff_name,
        u.primary_email AS staff_email
      FROM listing_outreach_events loe
      JOIN franchises f ON f.id = loe.franchise_id
      LEFT JOIN franchise_site_publications p ON p.franchise_id = f.id AND p.site_id = loe.site_id
      LEFT JOIN users u ON u.id = loe.staff_user_id
      WHERE loe.site_id = ?
      ORDER BY loe.created_at DESC
      LIMIT 20`,
    )
    .bind(SITE_ID)
    .all();
  return result.results || [];
}

async function getEditSuggestions(db) {
  const [summary, pending] = await Promise.all([
    db
      .prepare(
        `SELECT status, COUNT(*) AS count
         FROM listing_edit_suggestions
         WHERE site_id = ?
         GROUP BY status`,
      )
      .bind(SITE_ID)
      .all(),
    db
      .prepare(
        `SELECT
          les.id,
          les.franchise_id,
          les.status,
          les.field_name,
          les.old_value,
          les.suggested_value,
          les.reason,
          les.created_at,
          f.brand_name,
          p.slug,
          u.display_name AS suggested_by_name,
          u.primary_email AS suggested_by_email
         FROM listing_edit_suggestions les
         JOIN franchises f ON f.id = les.franchise_id
         LEFT JOIN franchise_site_publications p ON p.franchise_id = f.id AND p.site_id = les.site_id
         LEFT JOIN users u ON u.id = les.suggested_by_user_id
         WHERE les.site_id = ? AND les.status = 'pending'
         ORDER BY les.created_at DESC
         LIMIT 50`,
      )
      .bind(SITE_ID)
      .all(),
  ]);

  return {
    summary: normalizeGroupedCounts(summary.results || [], "status"),
    pending: (pending.results || []).map((row) => ({
      ...row,
      old_value: parseJson(row.old_value, {}),
      suggested_value: parseJson(row.suggested_value, {}),
      public_url: row.slug ? `/peluang-usaha/${row.slug}` : "",
    })),
  };
}

async function getLeadSummary(db) {
  const [statusRows, recentRows] = await Promise.all([
    db
      .prepare(
        `SELECT status, COUNT(*) AS count
         FROM franchise_leads
         WHERE source_site_id = ?
         GROUP BY status`,
      )
      .bind(SITE_ID)
      .all(),
    db
      .prepare(
        `SELECT
          fl.id,
          fl.status,
          fl.name,
          fl.email,
          fl.whatsapp,
          fl.created_at,
          f.brand_name
         FROM franchise_leads fl
         LEFT JOIN franchises f ON f.id = fl.franchise_id
         WHERE fl.source_site_id = ?
         ORDER BY fl.created_at DESC
         LIMIT 10`,
      )
      .bind(SITE_ID)
      .all(),
  ]);

  return {
    by_status: normalizeGroupedCounts(statusRows.results || [], "status"),
    recent: recentRows.results || [],
  };
}

async function getSystemHealth(db) {
  const [latestMigration, recentRebuild] = await Promise.all([
    safeFirst(db, "SELECT name, applied_at FROM d1_migrations ORDER BY applied_at DESC LIMIT 1"),
    safeFirst(
      db,
      `SELECT id, status, reason, error_message, created_at, updated_at
       FROM site_rebuild_requests
       WHERE site_id = ?
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1`,
      [SITE_ID],
    ),
  ]);

  return {
    d1: { ok: true, latest_migration: latestMigration || null },
    clerk: { ok: true, note: "Dashboard session verified through Clerk before D1 queries run." },
    publish: { recent_rebuild: recentRebuild || null },
  };
}

async function safeFirst(db, sql, bindings = []) {
  try {
    const statement = db.prepare(sql);
    return await (bindings.length ? statement.bind(...bindings).first() : statement.first());
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function getListingSnapshot(db, franchiseId) {
  return db
    .prepare(
      `SELECT
        f.*,
        p.slug AS public_slug
       FROM franchises f
       LEFT JOIN franchise_site_publications p ON p.franchise_id = f.id AND p.site_id = ?
       WHERE f.id = ?
       LIMIT 1`,
    )
    .bind(SITE_ID, franchiseId)
    .first();
}

async function hasAutoApproval(db, userId) {
  const row = await db
    .prepare(
      `SELECT id
       FROM staff_auto_approval_rules
       WHERE staff_user_id = ? AND site_id = ? AND scope = 'listing_suggestions' AND is_active = 1
       LIMIT 1`,
    )
    .bind(userId, SITE_ID)
    .first();
  return Boolean(row);
}

function sanitizeChanges(changes) {
  const clean = {};
  for (const [field, value] of Object.entries(changes || {})) {
    if (!EDITABLE_LISTING_FIELDS.has(field)) {
      throw new Error(`Field cannot be edited from dashboard: ${field}`);
    }

    clean[field] = normalizeFieldValue(field, value);
  }

  if (!Object.keys(clean).length) {
    throw new Error("At least one valid field change is required.");
  }

  return clean;
}

function normalizeFieldValue(field, value) {
  if (value === undefined) return null;
  if (value === null) return null;

  if (INTEGER_FIELDS.has(field)) {
    if (value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${field} must be a number.`);
    return Math.round(number);
  }

  if (REAL_FIELDS.has(field)) {
    if (value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${field} must be a number.`);
    return number;
  }

  const text = normalizeText(value);
  if (!text) return null;
  if (field === "status" && !STATUS_VALUES.has(text)) throw new Error("Invalid listing status.");
  if (field === "verification_tier" && !TIER_VALUES.has(text)) throw new Error("Invalid verification tier.");
  if (field === "royalty_basis" && !ROYALTY_BASIS_VALUES.has(text)) throw new Error("Invalid royalty basis.");
  return text.slice(0, field.endsWith("_desc") || field === "support_system" ? 12000 : 2000);
}

function updateListingStatement(db, franchiseId, changes) {
  const fields = Object.keys(changes);
  return db
    .prepare(
      `UPDATE franchises
       SET ${fields.map((field) => `${field} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(...fields.map((field) => changes[field]), franchiseId);
}

function auditStatement(db, action, entityType, entityId, metadata, actorUserId) {
  return db
    .prepare(
      `INSERT INTO audit_events (id, actor_user_id, source_site_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(`audit_${randomId()}`, actorUserId || null, SITE_ID, action, entityType, entityId || null, JSON.stringify(metadata || {}));
}

function assertAdmin(auth) {
  if (!isAdmin(auth)) throw new AuthError("Aksi ini hanya boleh dilakukan admin.", 403, "ADMIN_REQUIRED");
}

function isAdmin(auth) {
  return (auth.roles || []).some((role) => role.role === "admin");
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch (error) {
    return fallback;
  }
}

function parseWhatsAppContacts(value) {
  const text = normalizeText(value);
  if (!text) return [];

  const contacts = [];
  const matches = text.matchAll(/(?:\(\s*)?(?:\+?62|0)(?:[\s().-]*\d){7,15}/g);
  for (const match of matches) {
    const digits = match[0].replace(/\D/g, "");
    const normalized = normalizeIndonesianDigits(digits);
    if (!/^08\d{7,12}$/.test(normalized)) continue;
    contacts.push({
      label: inferLabel(text, match.index || 0),
      display: groupDigits(normalized, 4),
      local_digits: normalized,
      international_digits: `62${normalized.slice(1)}`,
    });
  }

  return contacts.filter((contact, index, items) => items.findIndex((item) => item.international_digits === contact.international_digits) === index);
}

function buildWhatsAppUrl(internationalDigits, row) {
  const listingUrl = `https://franchisee.id/peluang-usaha/${row.slug}`;
  const claimUrl = `https://franchisee.id/daftar?claim=${row.slug}`;
  const message = [
    `Halo, kami menemukan listing ${row.brand_name} (${row.category || "franchise"}) di Franchisee.id: ${listingUrl}.`,
    "Status listing ini belum diklaim, jadi informasi franchise, kontak, dan alamatnya belum dikelola langsung oleh pemilik brand.",
    `Mohon tim/pemilik ${row.brand_name} klaim listing ini agar data publiknya bisa diperbarui resmi: ${claimUrl}`,
  ].join(" ");
  return `https://wa.me/${internationalDigits}?text=${encodeURIComponent(message)}`;
}

function inferLabel(text, start) {
  const before = text.slice(Math.max(0, start - 40), start).toLowerCase();
  if (before.includes("marketing")) return "Marketing";
  if (before.includes("wa") || before.includes("whatsapp")) return "WhatsApp";
  if (before.includes("kantor") || before.includes("office")) return "Kantor";
  return "WhatsApp";
}

function normalizeIndonesianDigits(digits) {
  if (digits.startsWith("620")) return `0${digits.slice(3)}`;
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

function groupDigits(value, size) {
  const groups = [];
  for (let index = 0; index < value.length; index += size) groups.push(value.slice(index, index + size));
  return groups.join(" ");
}

function normalizeNumberObject(row) {
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key, typeof value === "number" ? value : Number(value || 0)]));
}

function normalizeGroupedCounts(rows, keyName) {
  return rows.reduce((acc, row) => {
    acc[row[keyName] || "unknown"] = Number(row.count || 0);
    return acc;
  }, {});
}

function normalizeText(value) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}

function isLikelyAllCapsDescription(value) {
  const text = normalizeText(value);
  if (text.length < 24) return false;
  const letters = text.match(/[A-Za-z]/g) || [];
  if (letters.length < 16) return false;
  const uppercase = letters.filter((letter) => letter === letter.toUpperCase() && letter !== letter.toLowerCase()).length;
  return uppercase / letters.length >= 0.82 && /[A-Z]{5,}/.test(text);
}

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}
