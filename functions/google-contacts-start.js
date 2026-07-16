import { authErrorResponse, requireD1User } from "./_clerk-auth.js";
import { createGoogleContactsAuthorization } from "./_google-contacts-oauth.js";
import { jsonResponse } from "./_dashboard-utils.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.franchise_db) throw new Error("Cloudflare D1 binding `franchise_db` is required.");
    const auth = await requireD1User(request, env, env.franchise_db, { requiredRole: "staff" });
    const result = await createGoogleContactsAuthorization(env.franchise_db, auth, request, env);
    return jsonResponse({ success: true, ...result });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return jsonResponse({
      success: false,
      error: "GOOGLE_CONTACTS_START_FAILED",
      message: error.message || "Koneksi Google Contacts belum bisa dimulai.",
    }, { status: 500 });
  }
}

export async function onRequestGet() {
  return jsonResponse({
    success: false,
    error: "METHOD_NOT_ALLOWED",
    message: "Mulai koneksi Google Contacts dari tombol di dashboard.",
  }, { status: 405, headers: { Allow: "POST" } });
}
