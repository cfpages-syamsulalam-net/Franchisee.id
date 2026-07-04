import { z } from "zod";
import { recordPremiumEvent } from "./_premium-ops.js";

const PublicPremiumEventSchema = z.object({
  event_type: z.enum(["premium_page_view", "premium_cta_click", "promo_ribbon_view", "promo_ribbon_click"]),
  surface: z.string().trim().max(80).optional().default("premium"),
  channel: z.string().trim().max(80).optional().default("web"),
  metadata: z.record(z.unknown()).optional().default({}),
});

export async function onRequestPost({ request, env }) {
  try {
    if (!env.franchise_db) throw new Error("Event belum bisa dicatat.");
    const parsed = PublicPremiumEventSchema.safeParse(await request.json());
    if (!parsed.success) return jsonResponse({ success: false }, { status: 400 });
    await recordPremiumEvent(env.franchise_db, {
      ...parsed.data,
      metadata: trimMetadata(parsed.data.metadata),
    });
    return jsonResponse({ success: true });
  } catch (_error) {
    return jsonResponse({ success: false }, { status: 202 });
  }
}

function trimMetadata(metadata) {
  const clean = {};
  for (const [key, value] of Object.entries(metadata || {}).slice(0, 8)) {
    const safeKey = String(key || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    if (!safeKey) continue;
    clean[safeKey] = String(value == null ? "" : value).slice(0, 160);
  }
  return clean;
}

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}
