import { findExistingBrands, jsonResponse } from "./_form-submit-utils.js";

export async function onRequestGet({ request, env }) {
  const brandName = new URL(request.url).searchParams.get("name")?.trim() || "";
  if (brandName.length < 3 || brandName.length > 120)
    return jsonResponse({ success: false, error: "INVALID_BRAND_NAME" }, { status: 400 });
  if (!env.franchise_db)
    return jsonResponse({ success: false, error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  try {
    const matches = await findExistingBrands(env.franchise_db, brandName);
    return jsonResponse({ success: true, matches }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonResponse({ success: false, error: "MATCH_UNAVAILABLE", message: "Brand belum bisa diperiksa. Coba lagi nanti." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
