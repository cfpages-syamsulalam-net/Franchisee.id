import { normalizeOcrText } from "./_ocr-provider-adapters.js";

export const STALE_RUNNING_JOB_MINUTES = 15;

export async function claimPendingJobs(db, maxJobs, jobId = "", batchId = "") {
  const scopedJobId = textOrNull(jobId);
  const scopedBatchId = textOrNull(batchId);
  await releaseStaleRunningJobs(db, scopedBatchId, scopedJobId);
  if (scopedJobId) {
    const exact = await db
      .prepare(
        `SELECT j.id, j.asset_id, j.franchise_id, j.source_url, j.mime_type, j.attempt_count,
                j.requested_by_user_id,
                COALESCE(a.display_order, 0) display_order
         FROM ocr_jobs j
         LEFT JOIN franchise_assets a ON a.id = j.asset_id
         WHERE j.status = 'pending'
           AND j.id = ?
           AND (? IS NULL OR j.batch_id = ?)
         LIMIT 1`,
      )
      .bind(scopedJobId, scopedBatchId, scopedBatchId)
      .all();
    const jobs = exact.results || [];
    if (!jobs.length) return [];
    await markJobsRunning(db, jobs);
    return jobs;
  }

  const target = await db
    .prepare(
      `SELECT j.franchise_id, MIN(j.created_at) first_created, MIN(j.priority) min_priority
       FROM ocr_jobs j
       WHERE j.status = 'pending'
         AND (? IS NULL OR j.batch_id = ?)
       GROUP BY j.franchise_id
       ORDER BY first_created, min_priority, j.franchise_id
       LIMIT 1`,
    )
    .bind(scopedBatchId, scopedBatchId)
    .first();
  if (!target?.franchise_id) return [];

  const result = await db
    .prepare(
      `SELECT j.id, j.asset_id, j.franchise_id, j.source_url, j.mime_type, j.attempt_count,
              j.requested_by_user_id,
              COALESCE(a.display_order, 0) display_order
       FROM ocr_jobs j
       LEFT JOIN franchise_assets a ON a.id = j.asset_id
       WHERE j.status = 'pending'
         AND j.franchise_id = ?
         AND (? IS NULL OR j.batch_id = ?)
       ORDER BY COALESCE(a.display_order, 0), j.priority, j.created_at
       LIMIT ?`,
    )
    .bind(target.franchise_id, scopedBatchId, scopedBatchId, maxJobs)
    .all();
  const jobs = result.results || [];
  if (!jobs.length) return [];
  await markJobsRunning(db, jobs);
  return jobs;
}

export async function releaseUnprocessedJobs(db, jobs, reason) {
  if (!jobs.length) return;
  await db.batch(jobs.map((job) => db
    .prepare(
      `UPDATE ocr_jobs
       SET status = 'pending', error_message = COALESCE(error_message, ?),
           started_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'running'`,
    )
    .bind(cleanOcrError(reason), job.id)));
}

export async function releaseStaleRunningJobs(db, batchId = "", jobId = "") {
  const scopedBatchId = textOrNull(batchId);
  const scopedJobId = textOrNull(jobId);
  const result = await db
    .prepare(
      `UPDATE ocr_jobs
       SET status = 'pending',
           provider_key = NULL,
           error_message = ?,
           started_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE status = 'running'
         AND started_at <= datetime('now', ?)
         AND (? IS NULL OR batch_id = ?)
         AND (? IS NULL OR id = ?)`,
    )
    .bind(
      `Job running lebih dari ${STALE_RUNNING_JOB_MINUTES} menit; otomatis dikembalikan ke antrean.`,
      `-${STALE_RUNNING_JOB_MINUTES} minutes`,
      scopedBatchId,
      scopedBatchId,
      scopedJobId,
      scopedJobId,
    )
    .run();
  return Number(result?.meta?.changes || 0);
}

export function retryJobStatement(db, jobId, userId) {
  return db
    .prepare(
      `UPDATE ocr_jobs
       SET status = 'pending', provider_key = NULL, error_message = NULL,
           started_at = NULL, completed_at = NULL, requested_by_user_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status IN ('failed', 'needs_review', 'no_text')`,
    )
    .bind(userId, jobId);
}

export function cleanOcrError(value) {
  return normalizeOcrText(value).slice(0, 500);
}

export function textOrNull(value) {
  const normalized = (value ?? "").toString().trim();
  return normalized || null;
}

async function markJobsRunning(db, jobs) {
  await db.batch(jobs.map((job) => db
    .prepare(
      `UPDATE ocr_jobs
       SET status = 'running', started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP, error_message = NULL
       WHERE id = ? AND status = 'pending'`,
    )
    .bind(job.id)));
}
