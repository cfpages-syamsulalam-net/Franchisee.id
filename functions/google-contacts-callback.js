import { completeGoogleContactsAuthorization } from "./_google-contacts-oauth.js";

export async function onRequestGet({ request, env }) {
  if (!env.franchise_db) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/dashboard/?google_contacts=failed#outreach" },
    });
  }
  return completeGoogleContactsAuthorization(env.franchise_db, request, env);
}
