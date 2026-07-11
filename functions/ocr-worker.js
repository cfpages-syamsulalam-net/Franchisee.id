import { jsonResponse } from "./_dashboard-utils.js";
import { runOcrJobs } from "./_ocr-job-runner.js";
import { getOcrWorkerUsage } from "./_ocr-quota-policy.js";
import { refreshBatchProgress } from "./_ocr-batch-runs.js";
import { triggerOcrScheduler } from "./_ocr-scheduler-config.js";
import { logOperationEvent } from "./_telemetry.js";

const DEFAULT_BATCH_LIMIT = 5;
const MAX_BATCH_LIMIT = 10;

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
    if (payload.preflight) {
      const summary = {
        source: payload.source || "scheduled",
        preflight: true,
        processed_count: 0,
        provider_count: 0,
      };
      await logWorkerEvent(env, summary, "info");
      return jsonResponse({ success: true, summary });
    }

    const requestedLimit = boundedNumber(payload.limit, 1, MAX_BATCH_LIMIT, DEFAULT_BATCH_LIMIT);
    const workerUsage = await getOcrWorkerUsage(env.franchise_db, env);
    const remainingToday = Math.max(0, Number(workerUsage.remaining || 0));
    const maxJobs = Math.min(requestedLimit, remainingToday);
    const batchId = String(payload.batch_id || "").trim();

    if (maxJobs <= 0) {
      let batch = null;
      if (batchId) {
        batch = await refreshBatchProgress(env.franchise_db, batchId, {
          status: "paused_quota",
          message: workerUsage.active_provider_count
            ? `Batch OCR dijeda: combined quota provider aktif sudah habis (${workerUsage.used}/${workerUsage.cap}). Aktifkan provider OCR lain atau tunggu kuota reset.`
            : "Batch OCR dijeda: belum ada provider OCR aktif dengan credential tersimpan.",
        });
      }
      const summary = {
        source: payload.source || "scheduled",
        batch_id: batchId,
        processed_count: 0,
        provider_count: 0,
        used_today: workerUsage.used_today,
        used_quota: workerUsage.used,
        daily_cap: workerUsage.cap,
        remaining_quota: workerUsage.remaining,
        skipped: workerUsage.active_provider_count ? "combined_provider_quota_reached" : "no_active_provider",
        batch,
      };
      await logWorkerEvent(env, summary, "info");
      return jsonResponse({ success: true, summary });
    }

    const auth = {
      id: "ocr_worker",
      roles: [{ role: "admin" }],
    };
    const result = await runOcrJobs(env.franchise_db, env, auth, { maxJobs, batchId });
    let next_trigger = null;
    if (batchId && result.batch && !["completed", "failed", "cancelled", "paused_rate_limit", "paused_quota"].includes(result.batch.status)) {
      next_trigger = await triggerOcrScheduler(env.franchise_db, env, { id: batchId }, {
        providerKey: payload.source || "",
        limit: requestedLimit,
        delay: payload.next_delay || "75s",
      });
    }
    const summary = {
      source: payload.source || "scheduled",
      batch_id: batchId,
      requested_limit: requestedLimit,
      processed_count: result.processed_count,
      provider_count: result.provider_count,
      used_today: workerUsage.used_today + Number(result.processed_count || 0),
      used_quota: workerUsage.used + Number(result.processed_count || 0),
      daily_cap: workerUsage.cap,
      remaining_quota: Math.max(0, workerUsage.remaining - Number(result.processed_count || 0)),
      processed: result.processed,
      batch: result.batch,
      next_trigger,
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

async function logWorkerEvent(env, summary, severity) {
  const message = summary.preflight
    ? `preflight=true source=${summary.source || "scheduled"}`
    : `processed=${summary.processed_count} providers=${summary.provider_count} used_today=${summary.used_today}/${summary.daily_cap}`;
  await logOperationEvent(env.franchise_db, {
    eventType: "ocr.worker.run",
    severity,
    route: "/ocr-worker",
    message,
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
