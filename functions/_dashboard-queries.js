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
import { OUTREACH_PIPELINE_STATUSES, outreachPipelineStatusMeta, normalizeOutreachPipelineStatus } from "../src/lib/outreach-pipeline.js";

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
      `WITH active_subscriptions AS (
        SELECT franchise_id, MAX(ends_at) AS active_subscription_ends_at
        FROM franchise_subscriptions
        WHERE status = 'active' AND ends_at > CURRENT_TIMESTAMP
        GROUP BY franchise_id
      ),
      latest_subscriptions AS (
        SELECT franchise_id, MAX(ends_at) AS latest_subscription_ends_at
        FROM franchise_subscriptions
        GROUP BY franchise_id
      ),
      claim_state AS (
        SELECT
          franchise_id,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_claim_count,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_claim_count,
          MAX(created_at) AS latest_claim_at
        FROM franchise_claims
        WHERE source_site_id = ?
        GROUP BY franchise_id
      ),
      pending_orders AS (
        SELECT franchise_id, COUNT(*) AS pending_order_count, MAX(created_at) AS latest_order_at
        FROM premium_orders
        WHERE status IN ('pending_payment', 'confirmation_submitted')
        GROUP BY franchise_id
      )
      SELECT
        f.id,
        p.slug,
        f.brand_name,
        f.category,
        f.status AS listing_status,
        f.verification_tier,
        f.owner_user_id,
        f.phone,
        f.office_address,
        f.total_investment_idr,
        f.min_investment_idr,
        f.updated_at,
        los.status AS outreach_status,
        los.notes AS outreach_notes,
        los.last_status_changed_at,
        los.last_contacted_at,
        los.last_response_at,
        los.last_claimed_at,
        los.last_subscribed_at,
        los.assigned_staff_user_id,
        los.next_follow_up_at,
        los.burned_reason,
        active_subscriptions.active_subscription_ends_at,
        latest_subscriptions.latest_subscription_ends_at,
        claim_state.pending_claim_count,
        claim_state.approved_claim_count,
        claim_state.latest_claim_at,
        pending_orders.pending_order_count,
        pending_orders.latest_order_at,
        MAX(loe.created_at) AS last_outreach_at,
        COUNT(loe.id) AS outreach_count
      FROM franchise_site_publications p
      JOIN franchises f ON f.id = p.franchise_id
      LEFT JOIN listing_outreach_events loe ON loe.franchise_id = f.id AND loe.site_id = p.site_id
      LEFT JOIN listing_outreach_statuses los ON los.franchise_id = f.id AND los.site_id = p.site_id
      LEFT JOIN active_subscriptions ON active_subscriptions.franchise_id = f.id
      LEFT JOIN latest_subscriptions ON latest_subscriptions.franchise_id = f.id
      LEFT JOIN claim_state ON claim_state.franchise_id = f.id
      LEFT JOIN pending_orders ON pending_orders.franchise_id = f.id
      WHERE p.site_id = ?
        AND p.publication_status = 'published'
        AND (
          f.source_sheet = 'UNCLAIMED'
          OR f.verification_tier = 'unclaimed'
          OR f.status = 'unclaimed'
          OR f.owner_user_id IS NOT NULL
          OR los.franchise_id IS NOT NULL
          OR active_subscriptions.franchise_id IS NOT NULL
          OR latest_subscriptions.franchise_id IS NOT NULL
        )
        AND COALESCE(f.phone, '') != ''
      GROUP BY f.id, p.slug
      ORDER BY
        CASE COALESCE(los.status, CASE WHEN active_subscriptions.franchise_id IS NOT NULL THEN 'subscribed' WHEN latest_subscriptions.franchise_id IS NOT NULL THEN 'renewal_risk' ELSE 'uncontacted' END)
          WHEN 'uncontacted' THEN 0
          WHEN 'saved_contact' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'responded' THEN 3
          WHEN 'qualified' THEN 4
          WHEN 'claim_started' THEN 5
          WHEN 'claimed' THEN 6
          WHEN 'subscribed' THEN 7
          WHEN 'renewal_risk' THEN 8
          WHEN 'burned' THEN 9
          ELSE 10
        END,
        CASE WHEN last_outreach_at IS NULL THEN 0 ELSE 1 END,
        f.total_investment_idr DESC,
        f.updated_at DESC
      LIMIT ${OUTREACH_QUEUE_LIMIT}`,
    )
    .bind(SITE_ID, SITE_ID)
    .all();

  return (result.results || []).map((row) => {
    const contacts = parseWhatsAppContacts(row.phone);
    const defaultStatus = defaultOutreachStatus(row);
    const currentStatus = normalizeOutreachPipelineStatus(row.outreach_status, defaultStatus);
    const effectiveStatus = effectiveOutreachStatus(currentStatus, row);
    const stageMeta = outreachPipelineStatusMeta(effectiveStatus);
    const overdue = isOutreachOverdue(row.next_follow_up_at, effectiveStatus);
    return {
      ...row,
      current_status: effectiveStatus,
      status_badge: effectiveStatus,
      subscription_health: row.active_subscription_ends_at ? "active" : row.latest_subscription_ends_at ? "not_active" : "none",
      sales_next_action: stageMeta.next_action || "",
      sales_next_action_detail: nextActionDetail(stageMeta, row, effectiveStatus),
      sales_reason: salesReason(row, effectiveStatus),
      is_overdue: overdue,
      overdue_label: overdue ? overdueLabel(row.next_follow_up_at) : "",
      urgency_rank: urgencyRank(row, effectiveStatus, overdue),
      public_url: `/peluang-usaha/${row.slug}`,
      claim_url: `/daftar?claim=${row.slug}`,
      contacts,
      primary_whatsapp_url: contacts[0] ? buildWhatsAppUrl(contacts[0].international_digits, row) : "",
    };
  }).sort((left, right) => {
    const urgencyDiff = Number(left.urgency_rank || 0) - Number(right.urgency_rank || 0);
    if (urgencyDiff) return urgencyDiff;
    return String(left.next_follow_up_at || left.updated_at || "").localeCompare(String(right.next_follow_up_at || right.updated_at || ""));
  });
}

export async function getUnclaimedOutreachSummary(db) {
  const [row, statusRows] = await Promise.all([
    db
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
    .first(),
    safeAll(
      db,
      `WITH active_subscriptions AS (
        SELECT franchise_id
        FROM franchise_subscriptions
        WHERE status = 'active' AND ends_at > CURRENT_TIMESTAMP
        GROUP BY franchise_id
      ),
      latest_subscriptions AS (
        SELECT franchise_id
        FROM franchise_subscriptions
        GROUP BY franchise_id
      )
      SELECT
        CASE
          WHEN los.status = 'burned' THEN 'burned'
          WHEN active_subscriptions.franchise_id IS NOT NULL THEN 'subscribed'
          WHEN latest_subscriptions.franchise_id IS NOT NULL AND COALESCE(los.status, '') IN ('', 'subscribed', 'claimed') THEN 'renewal_risk'
          ELSE COALESCE(los.status, 'uncontacted')
        END AS status,
        COUNT(*) AS count
      FROM franchise_site_publications p
      JOIN franchises f ON f.id = p.franchise_id
      LEFT JOIN listing_outreach_statuses los ON los.franchise_id = f.id AND los.site_id = p.site_id
      LEFT JOIN active_subscriptions ON active_subscriptions.franchise_id = f.id
      LEFT JOIN latest_subscriptions ON latest_subscriptions.franchise_id = f.id
      WHERE p.site_id = ?
        AND p.publication_status = 'published'
        AND COALESCE(f.phone, '') != ''
        AND (
          f.source_sheet = 'UNCLAIMED'
          OR f.verification_tier = 'unclaimed'
          OR f.status = 'unclaimed'
          OR f.owner_user_id IS NOT NULL
          OR los.franchise_id IS NOT NULL
          OR active_subscriptions.franchise_id IS NOT NULL
          OR latest_subscriptions.franchise_id IS NOT NULL
        )
      GROUP BY status`,
      [SITE_ID],
    ),
  ]);

  return {
    ...normalizeNumberObject(row),
    by_pipeline_status: normalizeGroupedCounts(statusRows || [], "status"),
    conversion_metrics: outreachConversionMetrics(normalizeGroupedCounts(statusRows || [], "status")),
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

function defaultOutreachStatus(row) {
  if (row.active_subscription_ends_at) return "subscribed";
  if (row.latest_subscription_ends_at) return "renewal_risk";
  if (Number(row.pending_claim_count || 0) > 0) return "claim_started";
  if (row.owner_user_id || Number(row.approved_claim_count || 0) > 0) return "claimed";
  return "uncontacted";
}

function effectiveOutreachStatus(status, row) {
  if (status === "burned") return "burned";
  if (row.active_subscription_ends_at) return "subscribed";
  if (row.latest_subscription_ends_at && ["subscribed", "claimed", "uncontacted"].includes(status)) return "renewal_risk";
  if (Number(row.pending_claim_count || 0) > 0 && ["uncontacted", "saved_contact", "contacted", "responded", "qualified"].includes(status)) return "claim_started";
  if ((row.owner_user_id || Number(row.approved_claim_count || 0) > 0) && ["uncontacted", "saved_contact", "contacted", "responded", "qualified", "claim_started"].includes(status)) return "claimed";
  return status;
}

function nextActionDetail(meta, row, status) {
  if (status === "claim_started" && Number(row.pending_claim_count || 0) > 0) return "Klaim sudah masuk. Cek bukti, bantu admin menyelesaikan review, dan follow-up brand jika data kurang.";
  if (status === "claimed" && Number(row.pending_order_count || 0) > 0) return "Brand sudah membuat order Premium. Cek konfirmasi pembayaran dan bantu sampai subscription aktif.";
  if (status === "subscribed" && row.active_subscription_ends_at) return `Subscription aktif sampai ${row.active_subscription_ends_at}. Siapkan renewal sebelum masa aktif habis.`;
  if (status === "renewal_risk" && row.latest_subscription_ends_at) return `Subscription terakhir berakhir ${row.latest_subscription_ends_at}. Hubungi owner untuk recovery atau catat alasan burned.`;
  return meta.next_action_detail || "";
}

function salesReason(row, status) {
  if (status === "subscribed") return "Subscription aktif terdeteksi.";
  if (status === "renewal_risk") return row.latest_subscription_ends_at ? "Subscription tidak aktif atau mendekati risiko renewal." : "Perlu follow-up renewal.";
  if (status === "claim_started") return Number(row.pending_claim_count || 0) > 0 ? "Ada klaim pending." : "Status pipeline menunjukkan klaim sedang berjalan.";
  if (status === "claimed") return row.owner_user_id ? "Listing sudah punya owner." : "Klaim pernah disetujui.";
  if (status === "burned") return row.burned_reason ? `Ditutup: ${row.burned_reason}.` : "Ditutup dari pipeline aktif.";
  if (row.last_outreach_at) return `Outreach terakhir ${row.last_outreach_at}.`;
  return "Kontak siap tetapi belum ada aksi yang tercatat.";
}

function isOutreachOverdue(nextFollowUpAt, status) {
  if (!nextFollowUpAt || ["subscribed", "burned"].includes(status)) return false;
  const due = new Date(nextFollowUpAt);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}

function overdueLabel(nextFollowUpAt) {
  const due = new Date(nextFollowUpAt);
  if (Number.isNaN(due.getTime())) return "Overdue";
  const days = Math.max(0, Math.floor((Date.now() - due.getTime()) / 86_400_000));
  return days <= 0 ? "Jatuh tempo hari ini" : `Terlambat ${days} hari`;
}

function urgencyRank(row, status, overdue) {
  if (overdue) return 0;
  if (status === "renewal_risk") return 1;
  if (Number(row.pending_claim_count || 0) > 0) return 2;
  if (status === "responded") return 3;
  if (status === "qualified") return 4;
  if (status === "uncontacted" || status === "saved_contact") return 5;
  if (status === "subscribed") return 8;
  if (status === "burned") return 9;
  return 6;
}

function outreachConversionMetrics(counts) {
  const count = (key) => Number(counts[key] || 0);
  const contacted = count("contacted") + count("responded") + count("qualified") + count("claim_started") + count("claimed") + count("subscribed") + count("renewal_risk");
  const responded = count("responded") + count("qualified") + count("claim_started") + count("claimed") + count("subscribed") + count("renewal_risk");
  const claimTrack = count("claim_started") + count("claimed") + count("subscribed") + count("renewal_risk");
  const claimed = count("claimed") + count("subscribed") + count("renewal_risk");
  const subscribed = count("subscribed");
  const renewalRisk = count("renewal_risk");
  return {
    response_rate: ratio(responded, contacted),
    response_to_claim_rate: ratio(claimTrack, responded),
    claim_to_subscription_rate: ratio(subscribed, claimed),
    renewal_recovery_rate: ratio(subscribed, subscribed + renewalRisk),
    actionable_open: OUTREACH_PIPELINE_STATUSES
      .filter((status) => !["subscribed", "burned"].includes(status.value))
      .reduce((sum, status) => sum + count(status.value), 0),
  };
}

function ratio(numerator, denominator) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
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
