import { SITE_ID } from "./_dashboard-schemas.js";
import { attachDocumentSuggestionEvidence } from "./_dashboard-review-evidence.js";
import { computeQualityChecks } from "./_quality-checks.js";
import {
  buildWhatsAppUrl,
  normalizeGroupedCounts,
  normalizeNumberObject,
  parseJson,
  parseWhatsAppContacts,
} from "./_dashboard-utils.js";
import {
  loadAdminPremiumNotifications,
  loadExpiringPremiumSubscriptions,
  loadNotificationEmailQueueRows,
  loadNotificationEmailQueueSummary,
  loadPaymentMethods,
  loadPremiumAnnualReports,
  loadPremiumFunnelSummary,
  loadPremiumSettings,
  premiumReadinessForListing,
} from "./_premium-ops.js";

const OUTREACH_QUEUE_LIMIT = 250;
const LOCATION_QUERY_CHUNK_SIZE = 80;

export async function getOverview(db) {
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

export async function getDataQuality(db) {
  const persisted = await getPersistedDataQuality(db);
  if (persisted) return persisted;
  return getComputedDataQuality(db);
}

async function getPersistedDataQuality(db) {
  try {
    const result = await db
      .prepare(
        `SELECT
          f.id,
          p.slug,
          f.brand_name,
          f.category,
          f.verification_tier,
          f.updated_at,
          GROUP_CONCAT(q.check_type) AS warning_list,
          GROUP_CONCAT(q.message, '||') AS message_list,
          SUM(CASE WHEN q.severity = 'critical' THEN 1 ELSE 0 END) AS critical_count,
          COUNT(q.id) AS warning_count,
          MAX(q.last_seen_at) AS last_seen_at
         FROM franchise_quality_checks q
         JOIN franchises f ON f.id = q.franchise_id
         LEFT JOIN franchise_site_publications p ON p.franchise_id = f.id AND p.site_id = q.site_id
         WHERE q.site_id = ? AND q.status = 'open'
         GROUP BY f.id, p.slug
         ORDER BY critical_count DESC, warning_count DESC, last_seen_at DESC
         LIMIT 20`,
      )
      .bind(SITE_ID)
      .all();

    const rows = result.results || [];
    if (!rows.length) return null;

    return rows.map((row) => ({
      ...row,
      public_url: row.slug ? `/peluang-usaha/${row.slug}` : "",
      warnings: String(row.warning_list || "").split(",").filter(Boolean),
      messages: String(row.message_list || "").split("||").filter(Boolean),
    }));
  } catch (_error) {
    return null;
  }
}

async function getComputedDataQuality(db) {
  const result = await db
    .prepare(
      `SELECT
        f.id,
        p.slug,
        f.brand_name,
        f.category,
        f.verification_tier,
        f.updated_at,
        f.phone,
        f.office_address,
        f.logo_url,
        f.cover_url,
        f.short_desc,
        f.full_desc,
        fp.email_contact,
        fp.whatsapp,
        fp.website_url,
        fp.instagram_url,
        fp.facebook_url,
        fp.tiktok_url,
        fp.youtube_url,
        fp.linkedin_url
      FROM franchise_site_publications p
      JOIN franchises f ON f.id = p.franchise_id
      LEFT JOIN franchisor_profiles fp ON fp.id = f.franchisor_profile_id
      WHERE p.site_id = ?
      ORDER BY
        f.updated_at DESC
      LIMIT 80`,
    )
    .bind(SITE_ID)
    .all();

  return (result.results || [])
    .map((row) => {
      const checks = computeQualityChecks(row);
      const warnings = checks.map((check) => check.check_type);
      return {
        ...row,
        likely_all_caps: warnings.includes("likely_all_caps") ? 1 : 0,
        full_desc: undefined,
        short_desc: undefined,
        public_url: `/peluang-usaha/${row.slug}`,
        warnings,
        messages: checks.map((check) => check.message),
      };
    })
    .sort((left, right) => {
      const warningDiff = right.warnings.length - left.warnings.length;
      if (warningDiff) return warningDiff;
      return String(right.updated_at || "").localeCompare(String(left.updated_at || ""));
    })
    .slice(0, 20);
}

export async function getPublishState(db) {
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

export async function getPublicationControls(db) {
  const [sites, rows] = await Promise.all([
    safeAll(
      db,
      `SELECT id, domain, name, site_type, is_active
       FROM network_sites
       ORDER BY is_active DESC, domain ASC`,
    ),
    safeAll(
      db,
      `SELECT
        f.id AS franchise_id,
        f.brand_name,
        f.owner_user_id,
        p.id AS publication_id,
        p.site_id,
        p.slug,
        p.canonical_url,
        p.publication_status,
        p.is_primary,
        p.updated_at
       FROM franchise_site_publications p
       JOIN franchises f ON f.id = p.franchise_id
       ORDER BY f.updated_at DESC, f.brand_name ASC, p.site_id ASC
       LIMIT 300`,
    ),
  ]);

  const grouped = new Map();
  for (const row of rows || []) {
    const item = grouped.get(row.franchise_id) || {
      franchise_id: row.franchise_id,
      brand_name: row.brand_name,
      publications: [],
    };
    item.publications.push({
      publication_id: row.publication_id,
      site_id: row.site_id,
      slug: row.slug,
      canonical_url: row.canonical_url,
      publication_status: row.publication_status,
      is_primary: row.is_primary,
      updated_at: row.updated_at,
    });
    grouped.set(row.franchise_id, item);
  }

  return {
    sites: sites || [],
    listings: Array.from(grouped.values()).slice(0, 80),
  };
}

export async function getPendingPremiumPayments(db) {
  try {
    const result = await db
      .prepare(
        `SELECT
          c.id,
          c.order_id,
          c.franchise_id,
          c.user_id,
          c.payer_name,
          c.payer_bank,
          c.submitted_amount,
          c.submitted_paid_at,
          c.proof_asset_id,
          c.notes,
          c.created_at,
          o.payable_amount,
          o.unique_code,
          o.expires_at,
          f.brand_name,
          f.logo_url,
          f.cover_url,
          f.short_desc,
          f.full_desc,
          f.phone,
          f.total_investment_idr,
          f.min_investment_idr,
          f.proposal_url,
          fp.whatsapp,
          fp.email_contact,
          a.public_url AS proof_url,
          a.mime_type AS proof_mime_type,
          u.primary_email,
          u.display_name
         FROM premium_payment_confirmations c
         JOIN premium_orders o ON o.id = c.order_id
         JOIN franchises f ON f.id = c.franchise_id
         LEFT JOIN franchisor_profiles fp ON fp.id = f.franchisor_profile_id
         LEFT JOIN franchise_assets a ON a.id = c.proof_asset_id
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.review_status = 'pending'
         ORDER BY c.created_at ASC
         LIMIT 50`,
      )
      .all();
    return (result.results || []).map((row) => ({
      ...row,
      readiness: premiumReadinessForListing(row),
    }));
  } catch (_error) {
    return [];
  }
}

export async function getPremiumOperations(db) {
  const [funnel, paymentMethods, notifications, expiringSubscriptions, emailQueue, emailQueueRows, settings, annualReports] = await Promise.all([
    loadPremiumFunnelSummary(db),
    loadPaymentMethods(db),
    loadAdminPremiumNotifications(db),
    loadExpiringPremiumSubscriptions(db),
    loadNotificationEmailQueueSummary(db),
    loadNotificationEmailQueueRows(db),
    loadPremiumSettings(db),
    loadPremiumAnnualReports(db),
  ]);
  return {
    funnel,
    payment_methods: paymentMethods,
    notifications,
    expiring_subscriptions: expiringSubscriptions,
    email_queue: emailQueue,
    email_queue_rows: emailQueueRows,
    settings,
    annual_reports: annualReports,
  };
}

export async function getUnclaimedOutreachQueue(db) {
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
      LIMIT ${OUTREACH_QUEUE_LIMIT}`,
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

export async function getUnclaimedOutreachSummary(db) {
  const row = await db
    .prepare(
      `SELECT
        COUNT(*) AS published_unclaimed,
        SUM(CASE WHEN COALESCE(f.phone, '') != '' THEN 1 ELSE 0 END) AS contact_ready,
        SUM(CASE WHEN COALESCE(f.phone, '') = '' THEN 1 ELSE 0 END) AS missing_phone
      FROM franchise_site_publications p
      JOIN franchises f ON f.id = p.franchise_id
      WHERE p.site_id = ?
        AND p.publication_status = 'published'
        AND (f.source_sheet = 'UNCLAIMED' OR f.verification_tier = 'unclaimed' OR f.status = 'unclaimed')`,
    )
    .bind(SITE_ID)
    .first();

  return {
    ...normalizeNumberObject(row),
    queue_limit: OUTREACH_QUEUE_LIMIT,
  };
}

export async function getPendingClaims(db) {
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

export async function getEditableListings(db) {
  const result = await db
    .prepare(
      `SELECT
        f.*,
        p.slug,
        p.publication_status
      FROM franchise_site_publications p
      JOIN franchises f ON f.id = p.franchise_id
      WHERE p.site_id = ?
      ORDER BY f.updated_at DESC, f.brand_name ASC
      LIMIT 250`,
    )
    .bind(SITE_ID)
    .all();
  const rows = result.results || [];
  const locationsByFranchise = await getStructuredLocationsForListings(db, rows.map((row) => row.id));
  return (result.results || []).map((row) => ({
    ...row,
    structured_locations: locationsByFranchise.get(row.id) || [],
    location_override_active: (locationsByFranchise.get(row.id) || []).some((item) => item.source_field === "owner_profile"),
    public_url: `/peluang-usaha/${row.slug}`,
  }));
}

async function getStructuredLocationsForListings(db, franchiseIds) {
  const ids = Array.from(new Set((franchiseIds || []).filter(Boolean)));
  if (!ids.length) return new Map();
  const locationRows = [];
  for (const chunk of chunkList(ids, LOCATION_QUERY_CHUNK_SIZE)) {
    const placeholders = chunk.map(() => "?").join(",");
    const result = await db
      .prepare(
        `SELECT
          fl.franchise_id,
          fl.location_text,
          fl.location_type,
          fl.source_field,
          fl.confidence_score,
          l.city,
          l.slug,
          l.province
         FROM franchise_locations fl
         LEFT JOIN locations l ON l.id = fl.location_id
         WHERE fl.franchise_id IN (${placeholders})
           AND COALESCE(l.city, fl.location_text) IS NOT NULL
         ORDER BY
           CASE fl.source_field WHEN 'owner_profile' THEN 0 ELSE 1 END,
           CASE fl.location_type WHEN 'head_office' THEN 0 WHEN 'origin' THEN 1 WHEN 'outlet' THEN 2 ELSE 3 END,
           COALESCE(l.city, fl.location_text) ASC`,
      )
      .bind(...chunk)
      .all();
    locationRows.push(...(result.results || []));
  }
  const byFranchise = new Map();
  for (const row of locationRows) {
    const list = byFranchise.get(row.franchise_id) || [];
    list.push({
      ...row,
      city: row.city || row.location_text || "",
      source_label: row.source_field === "owner_profile" ? "Diatur pemilik/admin" : "Data awal",
    });
    byFranchise.set(row.franchise_id, list);
  }
  return byFranchise;
}

function chunkList(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function getRecentOutreach(db) {
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

export async function getEditSuggestions(db) {
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

  const pendingRows = (pending.results || []).map((row) => ({
    ...row,
    old_value: parseJson(row.old_value, {}),
    suggested_value: parseJson(row.suggested_value, {}),
    public_url: row.slug ? `/peluang-usaha/${row.slug}` : "",
  }));

  return {
    summary: normalizeGroupedCounts(summary.results || [], "status"),
    pending: await attachDocumentSuggestionEvidence(db, pendingRows),
  };
}

export async function getLeadSummary(db) {
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

export async function getSystemHealth(db, env = {}) {
  const [latestMigration, recentRebuild, qualityOpen, operationSummary, recentOperations, recentAudit, webhookSummary, analyticsSummary] = await Promise.all([
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
    safeFirst(
      db,
      `SELECT
        COUNT(*) AS open_checks,
        MAX(last_seen_at) AS last_seen_at
       FROM franchise_quality_checks
       WHERE site_id = ? AND status = 'open'`,
      [SITE_ID],
    ),
    safeAll(
      db,
      `SELECT severity, COUNT(*) AS count
       FROM operation_events
       WHERE source_site_id = ? AND created_at >= datetime('now', '-24 hours')
       GROUP BY severity`,
      [SITE_ID],
    ),
    safeAll(
      db,
      `SELECT event_type, severity, route, message, created_at
       FROM operation_events
       WHERE source_site_id = ?
       ORDER BY created_at DESC
       LIMIT 8`,
      [SITE_ID],
    ),
    safeAll(
      db,
      `SELECT action, entity_type, entity_id, created_at
       FROM audit_events
       WHERE source_site_id = ?
       ORDER BY created_at DESC
       LIMIT 8`,
      [SITE_ID],
    ),
    safeAll(
      db,
      `SELECT event_type, severity, COUNT(*) AS count, MAX(created_at) AS latest_at
       FROM operation_events
       WHERE source_site_id = ?
         AND event_type LIKE 'clerk.webhook.%'
       GROUP BY event_type, severity
       ORDER BY latest_at DESC`,
      [SITE_ID],
    ),
    safeAll(
      db,
      `SELECT event_type, COUNT(*) AS count
       FROM franchise_product_events
       WHERE site_id = ? AND created_at >= datetime('now', '-30 days')
       GROUP BY event_type`,
      [SITE_ID],
    ),
  ]);

  return {
    d1: { ok: true, latest_migration: latestMigration || null },
    clerk: { ok: true, note: "Dashboard session verified through Clerk before D1 queries run." },
    publish: { recent_rebuild: recentRebuild || null },
    quality: qualityOpen || null,
    operations: {
      last_24h_by_severity: normalizeGroupedCounts(Array.isArray(operationSummary) ? operationSummary : [], "severity"),
      recent: Array.isArray(recentOperations) ? recentOperations : [],
      recent_audit: Array.isArray(recentAudit) ? recentAudit : [],
    },
    webhooks: Array.isArray(webhookSummary) ? webhookSummary : [],
    analytics: {
      last_30d_by_type: normalizeGroupedCounts(Array.isArray(analyticsSummary) ? analyticsSummary : [], "event_type"),
    },
    traffic_guardrails: getTrafficGuardrails(env),
  };
}

function getTrafficGuardrails(env = {}) {
  const analyticsConfigured = Boolean(
    env.CLOUDFLARE_API_TOKEN &&
      env.CLOUDFLARE_ACCOUNT_ID &&
      (env.CLOUDFLARE_PAGES_PROJECT_NAME || env.CLOUDFLARE_WORKER_SCRIPT_NAME),
  );

  return {
    plan: "Cloudflare Workers / Pages Functions Free",
    daily_limit: 100000,
    warning_threshold: 90000,
    reset_utc: "00:00",
    actual_usage: {
      configured: analyticsConfigured,
      status: analyticsConfigured ? "Cloudflare analytics credentials are present, but automatic querying is intentionally disabled." : "Actual Cloudflare usage is not connected.",
      requirements: [
        "CLOUDFLARE_API_TOKEN with read-only analytics permission",
        "CLOUDFLARE_ACCOUNT_ID",
        "CLOUDFLARE_PAGES_PROJECT_NAME or CLOUDFLARE_WORKER_SCRIPT_NAME",
      ],
    },
    active_controls: [
      { label: "Listing detail view events", value: "3% sample + 6-hour per-listing dedupe" },
      { label: "Listing contact events", value: "1-hour per-listing/channel dedupe" },
      { label: "Browser event budget", value: "16 public product events per browser per day" },
      { label: "Premium promo config", value: "Only loaded on Premium/Profile surfaces, 30-minute browser cache, 15-minute response cache" },
      { label: "Premium promo visibility", value: "Dashboard-configured per-day view cap, default once per visitor/device/day" },
      { label: "Premium promo events", value: "24-hour per-promo dedupe" },
      { label: "Premium page events", value: "6-hour page-view dedupe + 10-minute CTA dedupe" },
    ],
    docs: [
      "https://developers.cloudflare.com/pages/functions/pricing/",
      "https://developers.cloudflare.com/pages/functions/metrics/",
    ],
  };
}

export async function getListingSnapshot(db, franchiseId) {
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

export async function hasAutoApproval(db, userId) {
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

async function safeFirst(db, sql, bindings = []) {
  try {
    const statement = db.prepare(sql);
    return await (bindings.length ? statement.bind(...bindings).first() : statement.first());
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function safeAll(db, sql, bindings = []) {
  try {
    const statement = db.prepare(sql);
    const result = await (bindings.length ? statement.bind(...bindings).all() : statement.all());
    return result.results || [];
  } catch (_error) {
    return [];
  }
}
