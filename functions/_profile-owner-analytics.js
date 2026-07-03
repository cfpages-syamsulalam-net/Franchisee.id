import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";

const METRIC_KEYS = ["listing_view", "save", "inquiry", "contact_click"];

export async function loadOwnerAnalytics(db, ownedRows) {
  const ids = Array.from(new Set((ownedRows || []).map((row) => row.id).filter(Boolean))).slice(0, 100);
  if (!ids.length) {
    return { generated_at: new Date().toISOString(), summary: emptyMetrics(), listings: [] };
  }

  const byId = new Map(ids.map((id) => [id, emptyListingMetrics(id)]));
  const placeholders = ids.map(() => "?").join(",");

  try {
    const result = await db
      .prepare(
        `SELECT franchise_id, event_type,
                COUNT(*) AS total_count,
                SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS last_30d_count
         FROM franchise_product_events
         WHERE site_id = ?
           AND franchise_id IN (${placeholders})
         GROUP BY franchise_id, event_type`,
      )
      .bind(SITE_FRANCHISEE_ID, ...ids)
      .all();

    for (const row of result.results || []) {
      if (!METRIC_KEYS.includes(row.event_type)) continue;
      const current = byId.get(row.franchise_id) || emptyListingMetrics(row.franchise_id);
      current.total[row.event_type] = Number(row.total_count || 0);
      current.last_30d[row.event_type] = Number(row.last_30d_count || 0);
      byId.set(row.franchise_id, current);
    }
  } catch (error) {
    if (!/franchise_product_events|no such table/i.test(error?.message || "")) throw error;
  }

  const listings = (ownedRows || []).map((row) => {
    const metrics = byId.get(row.id) || emptyListingMetrics(row.id);
    return {
      ...metrics,
      brand_name: row.brand_name || "",
      slug: row.slug || "",
      status: row.status || "",
      verification_tier: row.verification_tier || "",
      conversion_rate_30d: conversionRate(metrics.last_30d),
    };
  });

  return {
    generated_at: new Date().toISOString(),
    summary: summarizeListings(listings),
    listings,
  };
}

function summarizeListings(listings) {
  const summary = emptyMetrics();
  for (const listing of listings) {
    for (const key of METRIC_KEYS) {
      summary.total[key] += Number(listing.total?.[key] || 0);
      summary.last_30d[key] += Number(listing.last_30d?.[key] || 0);
    }
  }
  summary.conversion_rate_30d = conversionRate(summary.last_30d);
  return summary;
}

function emptyListingMetrics(franchiseId) {
  return {
    franchise_id: franchiseId,
    total: metricObject(),
    last_30d: metricObject(),
  };
}

function emptyMetrics() {
  return {
    total: metricObject(),
    last_30d: metricObject(),
    conversion_rate_30d: 0,
  };
}

function metricObject() {
  return Object.fromEntries(METRIC_KEYS.map((key) => [key, 0]));
}

function conversionRate(metrics) {
  const views = Number(metrics?.listing_view || 0);
  if (!views) return 0;
  return Math.round((Number(metrics?.inquiry || 0) / views) * 1000) / 10;
}
