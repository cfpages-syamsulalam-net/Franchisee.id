import { loadPublicPremiumPromo } from "./_premium-ops.js";

export async function onRequestGet({ env }) {
  try {
    const promo = await loadPublicPremiumPromo(env.franchise_db);
    return json(promo, {
      headers: {
        "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      },
    });
  } catch (_error) {
    return json({ enabled: false }, { status: 200 });
  }
}

function json(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}
