import { z } from "zod";
import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";

export const PRODUCT_EVENT_TYPES = ["listing_view", "save", "unsave", "inquiry", "claim", "contact_click"];

export const ProductEventSchema = z.object({
  franchise_id: z.string().trim().min(3).max(120),
  event_type: z.enum(PRODUCT_EVENT_TYPES),
  surface: z.string().trim().max(80).optional().default(""),
  channel: z.string().trim().max(80).optional().default(""),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function recordProductEvent(db, input, options = {}) {
  const parsed = ProductEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid_event" };
  try {
    await db
      .prepare(
        `INSERT INTO franchise_product_events (
          id, franchise_id, site_id, user_id, event_type, surface, channel, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `product_event_${randomId()}`,
        parsed.data.franchise_id,
        options.siteId || SITE_FRANCHISEE_ID,
        options.userId || null,
        parsed.data.event_type,
        parsed.data.surface || null,
        parsed.data.channel || null,
        JSON.stringify(limitMetadata(parsed.data.metadata)),
      )
      .run();
    return { ok: true };
  } catch (error) {
    if (/franchise_product_events|no such table/i.test(error?.message || "")) return { ok: false, reason: "table_missing" };
    throw error;
  }
}

export async function loadProductEventCounts(db, franchiseIds, options = {}) {
  const ids = Array.from(new Set((franchiseIds || []).filter(Boolean))).slice(0, 250);
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  const days = Number(options.days || 90);
  try {
    const result = await db
      .prepare(
        `SELECT franchise_id, event_type, COUNT(*) AS count
         FROM franchise_product_events
         WHERE site_id = ?
           AND franchise_id IN (${placeholders})
           AND created_at >= datetime('now', ?)
         GROUP BY franchise_id, event_type`
      )
      .bind(options.siteId || SITE_FRANCHISEE_ID, ...ids, `-${days} days`)
      .all();

    const byFranchise = new Map();
    for (const row of result.results || []) {
      const current = byFranchise.get(row.franchise_id) || {};
      current[row.event_type] = Number(row.count || 0);
      byFranchise.set(row.franchise_id, current);
    }
    return byFranchise;
  } catch (error) {
    if (/franchise_product_events|no such table/i.test(error?.message || "")) return new Map();
    throw error;
  }
}

export function analyticsScore(counts = {}) {
  return (
    Number(counts.listing_view || 0) * 1 +
    Number(counts.save || 0) * 6 +
    Number(counts.inquiry || 0) * 12 +
    Number(counts.claim || 0) * 10 +
    Number(counts.contact_click || 0) * 4
  );
}

function limitMetadata(metadata) {
  const clean = {};
  for (const [key, value] of Object.entries(metadata || {}).slice(0, 8)) {
    if (typeof value === "string") clean[key.slice(0, 40)] = value.slice(0, 240);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) clean[key.slice(0, 40)] = value;
  }
  return clean;
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}
