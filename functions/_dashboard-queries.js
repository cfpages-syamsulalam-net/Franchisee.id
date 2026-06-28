import { SITE_ID } from "./_dashboard-schemas.js";
import { computeQualityChecks } from "./_quality-checks.js";
import {
  buildWhatsAppUrl,
  normalizeGroupedCounts,
  normalizeNumberObject,
  parseJson,
  parseWhatsAppContacts,
} from "./_dashboard-utils.js";

const OUTREACH_QUEUE_LIMIT = 250;

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
  return (result.results || []).map((row) => ({
    ...row,
    public_url: `/peluang-usaha/${row.slug}`,
  }));
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

export async function getSystemHealth(db) {
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
