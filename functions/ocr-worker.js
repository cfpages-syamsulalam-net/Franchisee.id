import { jsonResponse } from "./_dashboard-utils.js";
import { runOcrJobs } from "./_ocr-job-runner.js";
import { logOperationEvent } from "./_telemetry.js";

const DEFAULT_BATCH_LIMIT = 5;
const MAX_BATCH_LIMIT = 10;
const DEFAULT_DAILY_CAP = 25;

export async function onRequestPost({ request, env }) {
  try {
    const expectedSecret = String(env.OCR_SECRET || "").trim();
    if (!expectedSecret) {
      return jsonResponse({ success: false, error: "OCR_SECRET_NOT_CONFIGURED" }, { status: 503 });
    }
    if (!hasValidSecret(request, expectedSecret)) {
      return jsonResponse({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!env.franchise_db) {
      return jsonResponse({ success: false, error: "D1_REQUIRED", message: "D1 binding franchise_db belum tersedia." }, { status: 503 });
    }

    const payload = await request.json().catch(() => ({}));
    const dailyCap = boundedNumber(env.OCR_WORKER_DAILY_CAP || payload.daily_cap, 1, 500, DEFAULT_DAILY_CAP);
    const requestedLimit = boundedNumber(payload.limit, 1, MAX_BATCH_LIMIT, DEFAULT_BATCH_LIMIT);
    const usedToday = await countTodayUsage(env.franchise_db);
    const remainingToday = Math.max(0, dailyCap - usedToday);
    const maxJobs = Math.min(requestedLimit, remainingToday);

    if (maxJobs <= 0) {
      const summary = {
        source: payload.source || "scheduled",
        processed_count: 0,
        provider_count: 0,
        used_today: usedToday,
        daily_cap: dailyCap,
        skipped: "daily_cap_reached",
      };
      await logWorkerEvent(env, summary, "info");
      return jsonResponse({ success: true, summary });
    }

    const auth = {
      id: "ocr_worker",
      roles: [{ role: "admin" }],
    };
    const result = await runOcrJobs(env.franchise_db, env, auth, { maxJobs });
    const summary = {
      source: payload.source || "scheduled",
      requested_limit: requestedLimit,
      processed_count: result.processed_count,
      provider_count: result.provider_count,
      used_today: usedToday + Number(result.processed_count || 0),
      daily_cap: dailyCap,
      processed: result.processed,
    };
    await logWorkerEvent(env, summary, result.processed?.some((item) => item.status === "failed") ? "warning" : "info");
    return jsonResponse({ success: true, summary });
  } catch (error) {
    await logOperationEvent(env.franchise_db, {
      eventType: "ocr.worker.failed",
      severity: "error",
      route: "/ocr-worker",
      message: error.message,
    }).catch(() => {});
    return jsonResponse({ success: false, error: "OCR_WORKER_FAILED", message: error.message }, { status: 500 });
  }
}

export async function onRequestGet() {
  return jsonResponse({ success: false, error: "METHOD_NOT_ALLOWED" }, { status: 405 });
}

async function countTodayUsage(db) {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(units), 0) used
       FROM ocr_provider_usage_events
       WHERE status = 'counted'
         AND created_at >= ?`,
    )
    .bind(midnight.toISOString())
    .first();
  return Number(row?.used || 0);
}

async function logWorkerEvent(env, summary, severity) {
  await logOperationEvent(env.franchise_db, {
    eventType: "ocr.worker.run",
    severity,
    route: "/ocr-worker",
    message: `processed=${summary.processed_count} providers=${summary.provider_count} used_today=${summary.used_today}/${summary.daily_cap}`,
    metadata: summary,
  }).catch(() => {});
}

function hasValidSecret(request, expectedSecret) {
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = request.headers.get("x-worker-secret") || "";
  return bearer === expectedSecret || headerSecret === expectedSecret;
}

function boundedNumber(value, min, max, fallback) {
  const number = Number(value || fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), min), max);
}
