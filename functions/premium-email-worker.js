import { processPremiumEmailWorker } from "./_premium-email-worker.js";
import { jsonResponse } from "./_dashboard-utils.js";
import { logOperationEvent } from "./_telemetry.js";

export async function onRequestPost({ request, env }) {
  try {
    const expectedSecret = String(env.PREMIUM_EMAIL_WORKER_SECRET || "").trim();
    if (!expectedSecret) {
      return jsonResponse({ success: false, error: "WORKER_SECRET_NOT_CONFIGURED" }, { status: 503 });
    }
    if (!hasValidSecret(request, expectedSecret)) {
      return jsonResponse({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const summary = await processPremiumEmailWorker(env, {
      limit: payload.limit,
      source: payload.source || "manual",
    });
    await logOperationEvent(env.franchise_db, {
      eventType: "premium.email_worker.run",
      severity: summary.failed ? "warning" : "info",
      route: "/premium-email-worker",
      message: `sent=${summary.sent} failed=${summary.failed} renewal=${summary.renewal_reminders_queued} grace=${summary.grace_emails_queued} reports=${summary.annual_reports_queued}`,
      metadata: summary,
    });
    return jsonResponse({ success: true, summary });
  } catch (error) {
    await logOperationEvent(env.franchise_db, {
      eventType: "premium.email_worker.failed",
      severity: "error",
      route: "/premium-email-worker",
      message: error.message,
    });
    return jsonResponse({ success: false, error: "PREMIUM_EMAIL_WORKER_FAILED", message: error.message }, { status: 500 });
  }
}

export async function onRequestGet() {
  return jsonResponse({ success: false, error: "METHOD_NOT_ALLOWED" }, { status: 405 });
}

function hasValidSecret(request, expectedSecret) {
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = request.headers.get("x-worker-secret") || "";
  return bearer === expectedSecret || headerSecret === expectedSecret;
}
