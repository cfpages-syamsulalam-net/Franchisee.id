import { authErrorResponse, requireD1User } from "./_clerk-auth.js";
import {
  handleLogOutreach,
  handleManageNotificationEmail,
  handleRefreshQualityChecks,
  handleReviewPremiumPayment,
  handleReviewClaim,
  handleReviewEditSuggestion,
  handleSuggestEdit,
  handleUpdatePaymentMethod,
  handleUpdatePremiumSettings,
  handleUpdateListingLocations,
  handleUpdatePublication,
} from "./_dashboard-actions.js";
import {
  getDataQuality,
  getEditableListings,
  getEditSuggestions,
  getLeadSummary,
  getOverview,
  getPendingClaims,
  getPendingPremiumPayments,
  getPremiumOperations,
  getPublishState,
  getPublicationControls,
  getRecentOutreach,
  getSystemHealth,
  getUnclaimedOutreachQueue,
  getUnclaimedOutreachSummary,
} from "./_dashboard-queries.js";
import { DashboardActionSchema, EDITABLE_LISTING_FIELD_DEFS, SITE_ID } from "./_dashboard-schemas.js";
import { jsonResponse } from "./_dashboard-utils.js";
import { logOperationEvent } from "./_telemetry.js";

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireDashboardAccess(request, env);
    const db = env.franchise_db;

    const [overview, dataQuality, publishState, publicationControls, outreachQueue, outreachSummary, pendingClaims, pendingPremiumPayments, premiumOperations, recentOutreach, editSuggestions, editableListings, leadSummary, systemHealth] = await Promise.all([
      getOverview(db),
      getDataQuality(db),
      getPublishState(db),
      getPublicationControls(db),
      getUnclaimedOutreachQueue(db),
      getUnclaimedOutreachSummary(db),
      getPendingClaims(db),
      getPendingPremiumPayments(db),
      getPremiumOperations(db),
      getRecentOutreach(db),
      getEditSuggestions(db),
      getEditableListings(db),
      getLeadSummary(db),
      getSystemHealth(db, env),
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
      publication_controls: publicationControls,
      outreach_queue: outreachQueue,
      outreach_summary: outreachSummary,
      pending_claims: pendingClaims,
      pending_premium_payments: pendingPremiumPayments,
      premium_operations: premiumOperations,
      recent_outreach: recentOutreach,
      edit_suggestions: editSuggestions,
      editable_listings: editableListings,
      editable_fields: EDITABLE_LISTING_FIELD_DEFS,
      lead_summary: leadSummary,
      system_health: systemHealth,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    await logOperationEvent(env.franchise_db, {
      eventType: "api.dashboard.get.failed",
      severity: "error",
      route: "/dashboard-data",
      message: error.message,
    });
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
    if (data.action === "review_premium_payment") return handleReviewPremiumPayment(env.franchise_db, auth, data);
    if (data.action === "update_payment_method") return handleUpdatePaymentMethod(env.franchise_db, auth, data);
    if (data.action === "manage_notification_email") return handleManageNotificationEmail(env.franchise_db, auth, data);
    if (data.action === "update_premium_settings") return handleUpdatePremiumSettings(env.franchise_db, auth, data);
    if (data.action === "refresh_quality_checks") return handleRefreshQualityChecks(env.franchise_db, auth);
    if (data.action === "update_publication") return handleUpdatePublication(env.franchise_db, auth, data);
    if (data.action === "update_listing_locations") return handleUpdateListingLocations(env.franchise_db, auth, data);

    return jsonResponse({ success: false, error: "UNKNOWN_DASHBOARD_ACTION" }, { status: 400 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    await logOperationEvent(env.franchise_db, {
      eventType: "api.dashboard.post.failed",
      severity: "error",
      route: "/dashboard-data",
      message: error.message,
    });
    return jsonResponse({ success: false, error: "DASHBOARD_ACTION_FAILED", message: error.message }, { status: 500 });
  }
}

async function requireDashboardAccess(request, env) {
  if (!env.franchise_db) {
    throw new Error("Cloudflare D1 binding `franchise_db` is required for dashboard data.");
  }
  return requireD1User(request, env, env.franchise_db, { requiredRole: "staff" });
}
