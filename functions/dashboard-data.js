import { authErrorResponse, requireD1User } from "./_clerk-auth.js";
import {
  handleLogOutreach,
  handleReviewClaim,
  handleReviewEditSuggestion,
  handleSuggestEdit,
} from "./_dashboard-actions.js";
import {
  getDataQuality,
  getEditableListings,
  getEditSuggestions,
  getLeadSummary,
  getOverview,
  getPendingClaims,
  getPublishState,
  getRecentOutreach,
  getSystemHealth,
  getUnclaimedOutreachQueue,
  getUnclaimedOutreachSummary,
} from "./_dashboard-queries.js";
import { DashboardActionSchema, SITE_ID } from "./_dashboard-schemas.js";
import { jsonResponse } from "./_dashboard-utils.js";

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireDashboardAccess(request, env);
    const db = env.franchise_db;

    const [overview, dataQuality, publishState, outreachQueue, outreachSummary, pendingClaims, recentOutreach, editSuggestions, editableListings, leadSummary, systemHealth] = await Promise.all([
      getOverview(db),
      getDataQuality(db),
      getPublishState(db),
      getUnclaimedOutreachQueue(db),
      getUnclaimedOutreachSummary(db),
      getPendingClaims(db),
      getRecentOutreach(db),
      getEditSuggestions(db),
      getEditableListings(db),
      getLeadSummary(db),
      getSystemHealth(db),
    ]);

    return jsonResponse({
      success: true,
      site: {
        id: SITE_ID,
        domain: "franchisee.id",
        scope: "site",
      },
      user: {
        id: auth.id,
        email: auth.primary_email,
        name: auth.display_name,
        roles: auth.roles.map((role) => role.role),
      },
      overview,
      data_quality: dataQuality,
      publish_state: publishState,
      outreach_queue: outreachQueue,
      outreach_summary: outreachSummary,
      pending_claims: pendingClaims,
      recent_outreach: recentOutreach,
      edit_suggestions: editSuggestions,
      editable_listings: editableListings,
      lead_summary: leadSummary,
      system_health: systemHealth,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return jsonResponse({ success: false, error: "DASHBOARD_ERROR", message: error.message }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const auth = await requireDashboardAccess(request, env);
    const parsed = DashboardActionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonResponse(
        { success: false, error: "INVALID_DASHBOARD_ACTION", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    if (data.action === "log_outreach") return handleLogOutreach(env.franchise_db, auth, data);
    if (data.action === "suggest_edit") return handleSuggestEdit(env.franchise_db, auth, data);
    if (data.action === "review_edit_suggestion") return handleReviewEditSuggestion(env.franchise_db, auth, data);
    if (data.action === "review_claim") return handleReviewClaim(env.franchise_db, auth, data);

    return jsonResponse({ success: false, error: "UNKNOWN_DASHBOARD_ACTION" }, { status: 400 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return jsonResponse({ success: false, error: "DASHBOARD_ACTION_FAILED", message: error.message }, { status: 500 });
  }
}

async function requireDashboardAccess(request, env) {
  if (!env.franchise_db) {
    throw new Error("Cloudflare D1 binding `franchise_db` is required for dashboard data.");
  }
  return requireD1User(request, env, env.franchise_db, { requiredRole: "staff" });
}
