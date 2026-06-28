import { recordProductEvent, ProductEventSchema } from "./_analytics.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.franchise_db) {
      return jsonResponse({ success: false, message: "Aktivitas belum bisa dicatat." }, { status: 503 });
    }
    const parsed = ProductEventSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonResponse({ success: false, message: "Aktivitas tidak dikenali." }, { status: 400 });
    }
    const result = await recordProductEvent(env.franchise_db, parsed.data);
    return jsonResponse({ success: true, recorded: result.ok });
  } catch (_error) {
    return jsonResponse({ success: true, recorded: false });
  }
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
