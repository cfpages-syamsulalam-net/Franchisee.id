import { auditStatement, assertAdmin, jsonResponse } from "./_dashboard-utils.js";
import { runOcrJobs } from "./_ocr-job-runner.js";
import { cleanOcrError as cleanError, retryJobStatement, textOrNull } from "./_ocr-job-claiming.js";

const MAX_ENQUEUE_LIMIT = 200;

export async function handleRetryOcrJob(db, auth, data, env, options = {}) {
  assertAdmin(auth);
  const job = await db
    .prepare("SELECT id, asset_id, franchise_id, status FROM ocr_jobs WHERE id = ? LIMIT 1")
    .bind(data.job_id)
    .first();
  if (!job) return jsonResponse({ success: false, error: "OCR_JOB_NOT_FOUND", message: "Job OCR tidak ditemukan." }, { status: 404 });
  if (!["failed", "needs_review", "no_text"].includes(job.status)) {
    return jsonResponse({
      success: false,
      error: "OCR_JOB_NOT_RETRYABLE",
      message: "Hanya job OCR berstatus gagal, perlu cek, atau tanpa teks yang bisa di-retry manual.",
    }, { status: 409 });
  }

  await db.batch([
    retryJobStatement(db, job.id, auth.id),
    auditStatement(db, "dashboard.ocr_jobs.retry", "ocr_jobs", job.id, {
      asset_id: job.asset_id,
      franchise_id: job.franchise_id,
      run_now: true,
    }, auth.id),
  ]);
  const runResult = await runOcrJobs(db, env, auth, { ...options, maxJobs: 1, jobId: job.id });
  return jsonResponse({ success: true, retried: 1, job_id: job.id, run_now: true, ...runResult });
}

export async function handleMarkOcrJobNoText(db, auth, data) {
  assertAdmin(auth);
  const job = await db
    .prepare("SELECT id, asset_id, franchise_id, status FROM ocr_jobs WHERE id = ? LIMIT 1")
    .bind(data.job_id)
    .first();
  if (!job) return jsonResponse({ success: false, error: "OCR_JOB_NOT_FOUND", message: "Job OCR tidak ditemukan." }, { status: 404 });
  if (!["failed", "needs_review"].includes(job.status)) {
    return jsonResponse({
      success: false,
      error: "OCR_JOB_NOT_REVIEWABLE",
      message: "Hanya job OCR gagal atau perlu cek yang bisa ditandai sebagai gambar tanpa teks.",
    }, { status: 409 });
  }

  const message = cleanError(data.notes || "Ditandai admin: halaman brosur tidak memiliki teks yang cukup untuk OCR.");
  await db.batch([
    markJobNoTextStatement(db, job.id, message, auth.id),
    auditStatement(db, "dashboard.ocr_jobs.no_text", "ocr_jobs", job.id, {
      asset_id: job.asset_id,
      franchise_id: job.franchise_id,
      previous_status: job.status,
      notes: message,
    }, auth.id),
  ]);
  return jsonResponse({ success: true, job_id: job.id, status: "no_text", message });
}

export async function handleRetryFailedOcrJobs(db, auth, data) {
  assertAdmin(auth);
  const limit = Math.min(Math.max(Number(data.limit || 100), 1), MAX_ENQUEUE_LIMIT);
  const franchiseId = textOrNull(data.franchise_id);
  const rows = await db
    .prepare(
      `SELECT id, asset_id, franchise_id
       FROM ocr_jobs
       WHERE status = 'failed'
         AND (? IS NULL OR franchise_id = ?)
       ORDER BY updated_at, created_at
       LIMIT ?`,
    )
    .bind(franchiseId, franchiseId, limit)
    .all();
  const jobs = rows.results || [];
  if (!jobs.length) return jsonResponse({ success: true, retried: 0 });

  await db.batch([
    ...jobs.map((job) => retryJobStatement(db, job.id, auth.id)),
    auditStatement(db, "dashboard.ocr_jobs.retry_failed_batch", "ocr_jobs", null, {
      retried: jobs.length,
      franchise_id: franchiseId,
      job_ids: jobs.slice(0, 20).map((job) => job.id),
    }, auth.id),
  ]);
  return jsonResponse({ success: true, retried: jobs.length });
}

function markJobNoTextStatement(db, jobId, message, userId) {
  return db
    .prepare(
      `UPDATE ocr_jobs
       SET status = 'no_text', error_message = ?, requested_by_user_id = ?,
           provider_key = NULL, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(message, userId, jobId);
}
