import { proposalKnowledgeStatements, extractProposalCandidatesFromText } from "./_proposal-knowledge.js";
import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";
import { auditStatement, assertAdmin, isAdmin, jsonResponse, randomId } from "./_dashboard-utils.js";
import { callOcrProvider, normalizeOcrText } from "./_ocr-provider-adapters.js";
import { maskBatchRow, refreshBatchProgress } from "./_ocr-batch-runs.js";
import { getActiveOcrRunLease, requireOcrRunLease } from "./_ocr-run-lease.js";

const MAX_ENQUEUE_LIMIT = 200;
const MAX_RUN_LIMIT = 5;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MIN_OCR_TEXT_CHARS = 20;
const CACHE_TEXT_CHARS = 60_000;
const DEFAULT_WORKER_DAILY_CAP = 100;
const JOB_TABLE_ERROR = /ocr_jobs|ocr_attempts|ocr_content_cache|ocr_provider_usage_events|ocr_batch_runs|ocr_run_leases|batch_id|no such table|no such column/i;
const PAUSE_RATE_LIMIT_NOTE = "OCR_PAUSED_RATE_LIMIT";
const PAUSE_QUOTA_NOTE = "OCR_PAUSED_QUOTA";

export async function getOcrJobState(db, auth, env = {}) {
  if (!isAdmin(auth)) return { admin_only: true, counts: {}, recent: [], results: [], migration_required: false };
  try {
    const [counts, recent, candidates, results, batches, activeRunLease, workerUsage] = await Promise.all([
      db.prepare("SELECT status, COUNT(*) count FROM ocr_jobs GROUP BY status").all(),
      db
        .prepare(
          `SELECT j.id, j.asset_id, j.franchise_id, j.status, j.provider_key, j.attempt_count,
                  j.error_message, j.created_at, j.updated_at, j.batch_id, f.brand_name, f.slug,
                  COALESCE(a.display_order, 0) display_order,
                  COALESCE(j.source_url, a.public_url, a.legacy_url) source_url
           FROM ocr_jobs j
           LEFT JOIN franchises f ON f.id = j.franchise_id
           LEFT JOIN franchise_assets a ON a.id = j.asset_id
           ORDER BY j.updated_at DESC
           LIMIT 120`,
        )
        .all(),
      db
        .prepare(
          `SELECT COUNT(*) count
           FROM franchise_assets a
           LEFT JOIN ocr_jobs j ON j.asset_id = a.id
           LEFT JOIN franchise_asset_knowledge k ON k.asset_id = a.id
           WHERE a.asset_type = 'proposal'
             AND a.status = 'active'
             AND COALESCE(a.public_url, '') <> ''
             AND LOWER(COALESCE(a.mime_type, '')) LIKE 'image/%'
             AND j.id IS NULL
             AND COALESCE(k.extraction_status, '') NOT IN ('extracted')`,
        )
        .first(),
      db
        .prepare(
          `SELECT k.id, k.asset_id, k.franchise_id, k.extraction_method, k.extraction_status,
                  SUBSTR(COALESCE(k.source_text, ''), 1, 900) source_text_preview,
                  LENGTH(COALESCE(k.source_text, '')) text_length,
                  k.structured_data, k.updated_at, f.brand_name, f.slug,
                  COALESCE(a.display_order, 0) display_order, a.public_url, a.legacy_url,
                  (
                    SELECT s.id
                    FROM listing_edit_suggestions s
                    WHERE s.franchise_id = k.franchise_id
                      AND s.field_name = 'proposal_extraction'
                    ORDER BY s.created_at DESC
                    LIMIT 1
                  ) suggestion_id,
                  (
                    SELECT s.status
                    FROM listing_edit_suggestions s
                    WHERE s.franchise_id = k.franchise_id
                      AND s.field_name = 'proposal_extraction'
                    ORDER BY s.created_at DESC
                    LIMIT 1
                  ) suggestion_status
           FROM franchise_asset_knowledge k
           LEFT JOIN franchises f ON f.id = k.franchise_id
           LEFT JOIN franchise_assets a ON a.id = k.asset_id
           WHERE k.extraction_status IN ('extracted', 'needs_ocr', 'failed')
           ORDER BY k.updated_at DESC
           LIMIT 120`,
        )
        .all(),
      db
        .prepare(
          `SELECT id, status, target_count, assigned_count, processed_count, succeeded_count,
                  failed_count, needs_review_count, skipped_count, scheduler_provider_key,
                  scheduler_external_id, scheduler_trigger_status, scheduler_trigger_delay_seconds,
                  scheduler_trigger_due_at, scheduler_last_triggered_at, last_message, started_at,
                  last_run_at, completed_at, cancelled_at, created_at, updated_at
           FROM ocr_batch_runs
           ORDER BY created_at DESC
           LIMIT 8`,
        )
        .all(),
      getActiveOcrRunLease(db),
      getOcrWorkerUsage(db, env),
    ]);
    const refreshedBatches = [];
    for (const batch of batches.results || []) {
      if (["queued", "running"].includes(batch.status)) {
        refreshedBatches.push(await refreshBatchProgress(db, batch.id));
      } else {
        refreshedBatches.push(maskBatchRow(batch));
      }
    }
    return {
      admin_only: false,
      migration_required: false,
      counts: Object.fromEntries((counts.results || []).map((row) => [row.status, Number(row.count || 0)])),
      recent: (recent.results || []).map(maskJobRow),
      results: (results.results || []).map(maskResultRow),
      batches: refreshedBatches.filter(Boolean),
      enqueue_candidates: Number(candidates?.count || 0),
      active_run_lease: activeRunLease,
      worker_usage: workerUsage,
    };
  } catch (error) {
    if (JOB_TABLE_ERROR.test(error?.message || "")) {
      return { admin_only: false, migration_required: true, counts: {}, recent: [], results: [], enqueue_candidates: 0, worker_usage: null };
    }
    throw error;
  }
}

async function getOcrWorkerUsage(db, env = {}) {
  const cap = boundedWorkerDailyCap(env.OCR_WORKER_DAILY_CAP);
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(units), 0) used
       FROM ocr_provider_usage_events
       WHERE status = 'counted'
         AND datetime(created_at) >= datetime(?)`,
    )
    .bind(midnight.toISOString())
    .first();
  const used = Number(row?.used || 0);
  return {
    cap,
    used,
    remaining: Math.max(0, cap - used),
    reset_at: new Date(midnight.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    status: used >= cap ? "exhausted" : used >= Math.max(1, Math.floor(cap * 0.8)) ? "near_limit" : "available",
  };
}

function boundedWorkerDailyCap(value) {
  const number = Number(value || DEFAULT_WORKER_DAILY_CAP);
  if (!Number.isFinite(number)) return DEFAULT_WORKER_DAILY_CAP;
  return Math.min(Math.max(Math.trunc(number), 1), 500);
}

export async function handleEnqueueOcrJobs(db, auth, data) {
  assertAdmin(auth);
  const limit = Math.min(Math.max(Number(data.limit || 50), 1), MAX_ENQUEUE_LIMIT);
  const rows = await db
    .prepare(
      `SELECT a.id asset_id, a.franchise_id, COALESCE(a.public_url, a.legacy_url) source_url,
              a.mime_type, COALESCE(a.display_order, 0) display_order
       FROM franchise_assets a
       LEFT JOIN ocr_jobs j ON j.asset_id = a.id
       LEFT JOIN franchise_asset_knowledge k ON k.asset_id = a.id
       WHERE a.asset_type = 'proposal'
         AND a.status = 'active'
         AND COALESCE(a.public_url, a.legacy_url, '') <> ''
         AND LOWER(COALESCE(a.mime_type, '')) LIKE 'image/%'
         AND (? IS NULL OR a.franchise_id = ?)
         AND (? = 1 OR j.id IS NULL)
         AND (? = 1 OR COALESCE(k.extraction_status, '') NOT IN ('extracted'))
       ORDER BY a.franchise_id, COALESCE(a.display_order, 0), a.created_at
       LIMIT ?`,
    )
    .bind(textOrNull(data.franchise_id), textOrNull(data.franchise_id), data.force ? 1 : 0, data.force ? 1 : 0, limit)
    .all();

  const statements = [];
  const nowPriority = Number(data.priority || 100);
  let currentFranchiseId = "";
  let franchiseIndex = -1;
  for (const row of rows.results || []) {
    if (!isSafeExternalUrl(row.source_url)) continue;
    if (row.franchise_id !== currentFranchiseId) {
      currentFranchiseId = row.franchise_id;
      franchiseIndex += 1;
    }
    statements.push(
      db
        .prepare(
          `INSERT INTO ocr_jobs (
             id, asset_id, franchise_id, status, priority, source_url, mime_type, requested_by_user_id
           ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
           ON CONFLICT(asset_id) DO UPDATE SET
             status = CASE WHEN ? = 1 THEN 'pending' ELSE ocr_jobs.status END,
             priority = excluded.priority,
             source_url = excluded.source_url,
             mime_type = excluded.mime_type,
             error_message = CASE WHEN ? = 1 THEN NULL ELSE ocr_jobs.error_message END,
             requested_by_user_id = excluded.requested_by_user_id,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          `ocrjob_${randomId()}`,
          row.asset_id,
          row.franchise_id,
          nowPriority + (franchiseIndex * 1000) + Number(row.display_order || 0),
          row.source_url,
          row.mime_type || null,
          auth.id,
          data.force ? 1 : 0,
          data.force ? 1 : 0,
        ),
    );
  }

  statements.push(auditStatement(db, "dashboard.ocr_jobs.enqueue", "ocr_jobs", null, {
    requested: (rows.results || []).length,
    inserted_or_refreshed: statements.length,
    franchise_id: textOrNull(data.franchise_id),
    force: Boolean(data.force),
  }, auth.id));
  if (statements.length) await db.batch(statements);
  return jsonResponse({ success: true, enqueued: Math.max(0, statements.length - 1) });
}

export async function handleRunOcrJobs(db, auth, data, env, options = {}) {
  assertAdmin(auth);
  const maxJobs = Math.min(Math.max(Number(data.max_jobs || 1), 1), MAX_RUN_LIMIT);
  if (!textOrNull(data.batch_id) && maxJobs > 1) {
    const lease = await requireOcrRunLease(db, auth, data.lease_id);
    if (!lease.ok) return lease.response;
  }
  const result = await runOcrJobs(db, env, auth, { ...options, maxJobs, batchId: data.batch_id });
  return jsonResponse({ success: true, ...result });
}

export async function handleRunOcrDryRun(db, auth, data, env, options = {}) {
  assertAdmin(auth);
  if (!textOrNull(env.OCR_KEY)) {
    return jsonResponse({
      success: false,
      error: "OCR_KEY_REQUIRED",
      message: "Tambahkan Cloudflare Pages secret OCR_KEY sebelum menjalankan dry-run OCR.",
    }, { status: 400 });
  }

  const providers = await loadRunnableProviders(db);
  if (!providers.length) {
    return jsonResponse({
      success: false,
      error: "OCR_PROVIDER_REQUIRED",
      message: "Aktifkan minimal satu provider OCR yang sudah memiliki credential sebelum menjalankan dry-run.",
    }, { status: 400 });
  }

  const prepared = await prepareOneDryRunJob(db, auth, data);
  if (!prepared.job) {
    return jsonResponse({
      success: false,
      error: "OCR_DRY_RUN_NO_CANDIDATE",
      message: "Belum ada proposal gambar yang bisa dipakai untuk dry-run OCR.",
    }, { status: 404 });
  }

  const result = await runOcrJobs(db, env, auth, { ...options, maxJobs: 1, jobId: prepared.job.id });
  return jsonResponse({
    success: true,
    dry_run: true,
    enqueued: prepared.enqueued ? 1 : 0,
    target_job: maskJobRow(prepared.job),
    ...result,
  });
}

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

export async function handleSearchOcrResults(db, auth, data) {
  assertAdmin(auth);
  const limit = Math.min(Math.max(Number(data.limit || 40), 1), 100);
  const offset = Math.min(Math.max(Number(data.offset || 0), 0), 5000);
  const status = textOrNull(data.status) || "all";
  const franchiseId = textOrNull(data.franchise_id);
  const query = textOrNull(data.query);
  const where = ["k.extraction_status IN ('extracted', 'needs_ocr', 'failed')"];
  const binds = [];

  if (status !== "all") {
    where.push("k.extraction_status = ?");
    binds.push(status);
  }
  if (franchiseId) {
    where.push("k.franchise_id = ?");
    binds.push(franchiseId);
  }
  if (query) {
    const like = `%${query.toLowerCase()}%`;
    where.push(`(
      LOWER(COALESCE(f.brand_name, '')) LIKE ?
      OR LOWER(COALESCE(f.slug, '')) LIKE ?
      OR LOWER(COALESCE(k.source_text, '')) LIKE ?
    )`);
    binds.push(like, like, like);
  }

  const whereSql = where.join(" AND ");
  const count = await bindStatement(db
    .prepare(
      `SELECT COUNT(*) count
       FROM franchise_asset_knowledge k
       LEFT JOIN franchises f ON f.id = k.franchise_id
       LEFT JOIN franchise_assets a ON a.id = k.asset_id
       WHERE ${whereSql}`,
    ), binds)
    .first();
  const rows = await bindStatement(db
    .prepare(
      `SELECT k.id, k.asset_id, k.franchise_id, k.extraction_method, k.extraction_status,
              SUBSTR(COALESCE(k.source_text, ''), 1, 900) source_text_preview,
              LENGTH(COALESCE(k.source_text, '')) text_length,
              k.structured_data, k.updated_at, f.brand_name, f.slug,
              COALESCE(a.display_order, 0) display_order, a.public_url, a.legacy_url,
              (
                SELECT s.id
                FROM listing_edit_suggestions s
                WHERE s.franchise_id = k.franchise_id
                  AND s.field_name = 'proposal_extraction'
                ORDER BY s.created_at DESC
                LIMIT 1
              ) suggestion_id,
              (
                SELECT s.status
                FROM listing_edit_suggestions s
                WHERE s.franchise_id = k.franchise_id
                  AND s.field_name = 'proposal_extraction'
                ORDER BY s.created_at DESC
                LIMIT 1
              ) suggestion_status
       FROM franchise_asset_knowledge k
       LEFT JOIN franchises f ON f.id = k.franchise_id
       LEFT JOIN franchise_assets a ON a.id = k.asset_id
       WHERE ${whereSql}
       ORDER BY COALESCE(f.brand_name, k.franchise_id), COALESCE(a.display_order, 0), k.updated_at DESC
       LIMIT ? OFFSET ?`,
    ), [...binds, limit, offset])
    .all();
  const total = Number(count?.count || 0);
  const results = (rows.results || []).map(maskResultRow);
  return jsonResponse({
    success: true,
    results,
    total,
    limit,
    offset,
    has_more: offset + results.length < total,
    filters: { query: query || "", status, franchise_id: franchiseId || "" },
  });
}

export async function handleSearchOcrJobs(db, auth, data) {
  assertAdmin(auth);
  const limit = Math.min(Math.max(Number(data.limit || 120), 1), 120);
  const offset = Math.min(Math.max(Number(data.offset || 0), 0), 5000);
  const status = textOrNull(data.status) || "all";
  const franchiseId = textOrNull(data.franchise_id);

  if (status === "unqueued") {
    return searchUnqueuedOcrAssets(db, { franchiseId, limit, offset, status });
  }

  const where = [];
  const binds = [];
  if (status !== "all") {
    where.push("j.status = ?");
    binds.push(status);
  }
  if (franchiseId) {
    where.push("j.franchise_id = ?");
    binds.push(franchiseId);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const count = await bindStatement(db
    .prepare(
      `SELECT COUNT(*) count
       FROM ocr_jobs j
       ${whereSql}`,
    ), binds)
    .first();
  const rows = await bindStatement(db
    .prepare(
      `SELECT j.id, j.asset_id, j.franchise_id, j.status, j.provider_key, j.attempt_count,
              j.error_message, j.created_at, j.updated_at, j.batch_id, f.brand_name, f.slug,
              COALESCE(a.display_order, 0) display_order,
              COALESCE(j.source_url, a.public_url, a.legacy_url) source_url
       FROM ocr_jobs j
       LEFT JOIN franchises f ON f.id = j.franchise_id
       LEFT JOIN franchise_assets a ON a.id = j.asset_id
       ${whereSql}
       ORDER BY COALESCE(f.brand_name, j.franchise_id), COALESCE(a.display_order, 0), j.updated_at DESC
       LIMIT ? OFFSET ?`,
    ), [...binds, limit, offset])
    .all();
  const total = Number(count?.count || 0);
  const jobs = (rows.results || []).map(maskJobRow);
  return jsonResponse({
    success: true,
    jobs,
    total,
    limit,
    offset,
    has_more: offset + jobs.length < total,
    filters: { status, franchise_id: franchiseId || "" },
  });
}

async function searchUnqueuedOcrAssets(db, options) {
  const where = [
    "a.asset_type = 'proposal'",
    "a.status = 'active'",
    "COALESCE(a.public_url, a.legacy_url, '') <> ''",
    "LOWER(COALESCE(a.mime_type, '')) LIKE 'image/%'",
    "j.id IS NULL",
    "COALESCE(k.extraction_status, '') NOT IN ('extracted')",
  ];
  const binds = [];
  if (options.franchiseId) {
    where.push("a.franchise_id = ?");
    binds.push(options.franchiseId);
  }
  const whereSql = where.join(" AND ");
  const count = await bindStatement(db
    .prepare(
      `SELECT COUNT(*) count
       FROM franchise_assets a
       LEFT JOIN ocr_jobs j ON j.asset_id = a.id
       LEFT JOIN franchise_asset_knowledge k ON k.asset_id = a.id
       WHERE ${whereSql}`,
    ), binds)
    .first();
  const rows = await bindStatement(db
    .prepare(
      `SELECT a.id asset_id, a.franchise_id, COALESCE(a.public_url, a.legacy_url) source_url,
              COALESCE(a.display_order, 0) display_order, a.created_at, a.updated_at,
              f.brand_name, f.slug
       FROM franchise_assets a
       LEFT JOIN ocr_jobs j ON j.asset_id = a.id
       LEFT JOIN franchise_asset_knowledge k ON k.asset_id = a.id
       LEFT JOIN franchises f ON f.id = a.franchise_id
       WHERE ${whereSql}
       ORDER BY COALESCE(f.brand_name, a.franchise_id), COALESCE(a.display_order, 0), a.created_at
       LIMIT ? OFFSET ?`,
    ), [...binds, options.limit, options.offset])
    .all();
  const total = Number(count?.count || 0);
  const jobs = (rows.results || []).map(maskUnqueuedJobRow);
  return jsonResponse({
    success: true,
    jobs,
    total,
    limit: options.limit,
    offset: options.offset,
    has_more: options.offset + jobs.length < total,
    filters: { status: options.status, franchise_id: options.franchiseId || "" },
  });
}

export async function runOcrJobs(db, env, auth, options = {}) {
  if (!textOrNull(env.OCR_KEY)) throw new Error("Tambahkan Cloudflare Pages secret OCR_KEY sebelum menjalankan OCR.");
  const maxJobs = Math.min(Math.max(Number(options.maxJobs || 1), 1), MAX_RUN_LIMIT);
  const jobs = await claimPendingJobs(db, maxJobs, options.jobId, options.batchId);
  const processed = [];
  let claimedIndex = 0;
  let providerCount = 0;
  while (claimedIndex < jobs.length) {
    const providerState = await loadRunnableProviderState(db);
    providerCount = Math.max(providerCount, Number(providerState.providers?.length || 0));
    const concurrency = concurrentOcrJobLimit(providerState, jobs.length - claimedIndex, options);
    const wave = jobs.slice(claimedIndex, claimedIndex + concurrency);
    const waveResults = concurrency > 1
      ? await Promise.all(wave.map((job, index) => processJob(db, env, auth, job, rotateProviderState(providerState, index), options)))
      : [await processJob(db, env, auth, wave[0], providerState, options)];
    processed.push(...waveResults);
    claimedIndex += wave.length;
    const pause = waveResults.find(isPausedResult);
    if (pause) {
      await releaseUnprocessedJobs(db, jobs.slice(claimedIndex), pause.note);
      break;
    }
  }
  const pause = processed.find(isPausedResult);
  const batch = options.batchId ? await refreshBatchProgress(db, options.batchId, batchProgressOptions(processed, pause)) : null;
  return {
    processed_count: processed.filter((item) => !isPausedResult(item)).length,
    processed,
    provider_count: processed.length ? Math.max(providerCount, Number(processed[processed.length - 1]?.provider_count || 0)) : providerCount,
    batch,
  };
}

function concurrentOcrJobLimit(providerState, remainingJobs, options = {}) {
  if (options.jobId) return 1;
  const providers = Array.isArray(providerState?.providers) ? providerState.providers : [];
  if (providers.length <= 1) return 1;
  return Math.max(1, Math.min(Number(remainingJobs || 1), providers.length, MAX_RUN_LIMIT));
}

function rotateProviderState(providerState, offset) {
  const providers = Array.isArray(providerState?.providers) ? providerState.providers : [];
  if (providers.length <= 1) return providerState;
  const start = Math.abs(Number(offset || 0)) % providers.length;
  return {
    ...providerState,
    providers: providers.slice(start).concat(providers.slice(0, start)),
  };
}

async function claimPendingJobs(db, maxJobs, jobId = "", batchId = "") {
  const scopedJobId = textOrNull(jobId);
  const scopedBatchId = textOrNull(batchId);
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

async function loadRunnableProviderState(db) {
  const result = await db
    .prepare(
      `SELECT *
       FROM ocr_provider_configs
       WHERE is_enabled = 1
         AND COALESCE(api_key, '') <> ''
         AND COALESCE(health_status, 'ready') IN ('ready', 'cooldown', 'exhausted')
       ORDER BY priority, display_name`,
    )
    .all();
  const rows = result.results || [];
  const now = new Date();
  const providers = rows.filter((provider) => {
    if (provider.health_status === "exhausted") return false;
    const cooldownUntil = provider.cooldown_until ? new Date(provider.cooldown_until) : null;
    return !cooldownUntil || cooldownUntil <= now;
  });
  const exhaustedCount = rows.filter((provider) => provider.health_status === "exhausted").length;
  const cooldowns = rows
    .map((provider) => provider.cooldown_until ? new Date(provider.cooldown_until) : null)
    .filter((date) => date && date > now)
    .sort((a, b) => a.getTime() - b.getTime());
  return {
    providers,
    configuredCount: rows.length,
    exhaustedCount,
    cooldownUntil: cooldowns.length ? cooldowns[0].toISOString() : "",
  };
}

async function loadRunnableProviders(db) {
  return (await loadRunnableProviderState(db)).providers;
}

async function prepareOneDryRunJob(db, auth, data) {
  const scopedFranchiseId = textOrNull(data.franchise_id);
  const candidate = await db
    .prepare(
      `SELECT a.id asset_id, a.franchise_id, COALESCE(a.public_url, a.legacy_url) source_url,
              a.mime_type, COALESCE(a.display_order, 0) display_order
       FROM franchise_assets a
       LEFT JOIN franchise_asset_knowledge k ON k.asset_id = a.id
       WHERE a.asset_type = 'proposal'
         AND a.status = 'active'
         AND COALESCE(a.public_url, a.legacy_url, '') <> ''
         AND LOWER(COALESCE(a.mime_type, '')) LIKE 'image/%'
         AND (? IS NULL OR a.franchise_id = ?)
         AND COALESCE(k.extraction_status, '') NOT IN ('extracted')
       ORDER BY a.franchise_id, COALESCE(a.display_order, 0), a.created_at
       LIMIT 1`,
    )
    .bind(scopedFranchiseId, scopedFranchiseId)
    .first();

  if (!candidate || !isSafeExternalUrl(candidate.source_url)) {
    const pending = await db
      .prepare(
        `SELECT j.id, j.asset_id, j.franchise_id, j.source_url, j.mime_type, j.status,
                j.provider_key, j.attempt_count, j.error_message, j.created_at, j.updated_at,
                f.brand_name
         FROM ocr_jobs j
         LEFT JOIN franchises f ON f.id = j.franchise_id
         WHERE j.status = 'pending'
           AND (? IS NULL OR j.franchise_id = ?)
         ORDER BY j.priority, j.created_at
         LIMIT 1`,
      )
      .bind(scopedFranchiseId, scopedFranchiseId)
      .first();
    return { job: pending || null, enqueued: false };
  }

  await db.batch([
    db
      .prepare(
        `INSERT INTO ocr_jobs (
           id, asset_id, franchise_id, status, priority, source_url, mime_type, requested_by_user_id
         ) VALUES (?, ?, ?, 'pending', 1, ?, ?, ?)
         ON CONFLICT(asset_id) DO UPDATE SET
           status = 'pending',
           priority = 1,
           source_url = excluded.source_url,
           mime_type = excluded.mime_type,
           error_message = NULL,
           requested_by_user_id = excluded.requested_by_user_id,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(`ocrdry_${randomId()}`, candidate.asset_id, candidate.franchise_id, candidate.source_url, candidate.mime_type || null, auth.id),
    auditStatement(db, "dashboard.ocr_jobs.dry_run_prepare", "franchise_assets", candidate.asset_id, {
      franchise_id: candidate.franchise_id,
      source_url: candidate.source_url,
    }, auth.id),
  ]);

  const job = await db
    .prepare(
      `SELECT j.id, j.asset_id, j.franchise_id, j.source_url, j.mime_type, j.status,
              j.provider_key, j.attempt_count, j.error_message, j.created_at, j.updated_at,
              f.brand_name
       FROM ocr_jobs j
       LEFT JOIN franchises f ON f.id = j.franchise_id
       WHERE j.asset_id = ?
       LIMIT 1`,
    )
    .bind(candidate.asset_id)
    .first();
  return { job, enqueued: true };
}

async function processJob(db, env, auth, job, providerState, options) {
  const providers = Array.isArray(providerState) ? providerState : providerState.providers || [];
  try {
    const image = await loadImage(job, options.fetchImpl || fetch);
    const contentHash = await sha256Base64Url(image.bytes);
    const cacheHit = await db.prepare("SELECT * FROM ocr_content_cache WHERE content_hash = ? LIMIT 1").bind(contentHash).first();
    if (cacheHit) {
      await db.batch([
        db.prepare("UPDATE ocr_content_cache SET last_used_at = CURRENT_TIMESTAMP WHERE content_hash = ?").bind(contentHash),
        attemptStatement(db, job.id, cacheHit.provider_key, "cache_hit", null, null, Number(cacheHit.text_length || 0), null, null),
        ...await successStatements(db, auth, job, {
          contentHash,
          providerKey: cacheHit.provider_key,
          text: cacheHit.text,
          textLength: Number(cacheHit.text_length || 0),
          method: `ocr_cache_${cacheHit.provider_key}`,
        }),
      ]);
      return processedResult(job, "succeeded", cacheHit.provider_key, Number(cacheHit.text_length || 0), "cache_hit");
    }

    if (!providers.length) {
      if (providerState?.configuredCount && providerState?.exhaustedCount) {
        const message = "Semua provider OCR aktif sedang kehabisan kuota harian/bulanan. Batch dijeda; aktifkan provider OCR lain untuk lanjut sekarang, atau tunggu kuota provider reset.";
        await pauseJob(db, job, message);
        return processedResult(job, "paused", "", 0, PAUSE_QUOTA_NOTE, providers.length, message);
      }
      if (providerState?.configuredCount && providerState?.cooldownUntil) {
        const message = `Semua provider OCR aktif sedang cooldown/rate limit. Batch dijeda sampai ${providerState.cooldownUntil}.`;
        await pauseJob(db, job, message);
        return processedResult(job, "paused", "", 0, PAUSE_RATE_LIMIT_NOTE, providers.length, message);
      }
      await failJob(db, job, "Belum ada provider OCR aktif yang siap dipakai.");
      return processedResult(job, "failed", "", 0, "NO_PROVIDER", providers.length);
    }

    let lastError = null;
    let textTooShortCount = 0;
    let hardFailureCount = 0;
    let rateLimitPauseCount = 0;
    let quotaPauseCount = 0;
    for (const provider of providers) {
      const quota = await prepareQuota(db, provider);
      if (!quota.allowed) {
        quotaPauseCount += 1;
        lastError = providerAttemptError("OCR_PROVIDER_QUOTA_EXHAUSTED", providerQuotaExhaustedMessage(provider, quota.reason), null, 0);
        await db.batch([
          attemptStatement(db, job.id, provider.provider_key, "quota_exhausted", null, null, 0, "OCR_PROVIDER_QUOTA_EXHAUSTED", providerQuotaExhaustedMessage(provider, quota.reason)),
          providerHealthStatement(db, provider.provider_key, "exhausted", providerQuotaExhaustedMessage(provider, quota.reason)),
        ]);
        continue;
      }
      const rateLimit = await prepareRateLimit(db, provider);
      if (!rateLimit.allowed) {
        rateLimitPauseCount += 1;
        await db.batch([
          attemptStatement(db, job.id, provider.provider_key, "skipped", null, null, 0, "OCR_PROVIDER_RATE_LIMITED", rateLimit.reason),
          providerCooldownStatement(db, provider.provider_key, rateLimit.cooldownUntil, rateLimit.reason),
        ]);
        continue;
      }

      const started = Date.now();
      try {
        const result = await callOcrProvider(provider, image, env, options);
        const latency = Date.now() - started;
        if (result.textLength < MIN_OCR_TEXT_CHARS) {
          throw providerAttemptError("OCR_TEXT_TOO_SHORT", "Provider tidak mengembalikan teks yang cukup untuk dipakai.", result.httpStatus, result.textLength);
        }
        const text = result.text.slice(0, CACHE_TEXT_CHARS);
        await db.batch([
          db
            .prepare(
              `INSERT INTO ocr_content_cache (
                 content_hash, source_url, mime_type, text, provider_key, confidence, text_length
               ) VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(content_hash) DO UPDATE SET
                 source_url = excluded.source_url,
                 mime_type = excluded.mime_type,
                 text = excluded.text,
                 provider_key = excluded.provider_key,
                 confidence = excluded.confidence,
                 text_length = excluded.text_length,
                 last_used_at = CURRENT_TIMESTAMP`,
            )
            .bind(contentHash, job.source_url, image.mimeType, text, provider.provider_key, null, text.length),
          attemptStatement(db, job.id, provider.provider_key, "succeeded", result.httpStatus || null, latency, text.length, null, null),
          usageStatement(db, provider.provider_key, job.id, contentHash, 1, "counted"),
          quotaIncrementStatement(db, provider.provider_key),
          providerHealthStatement(db, provider.provider_key, "ready", null),
          ...await successStatements(db, auth, job, {
            contentHash,
            providerKey: provider.provider_key,
            text,
            textLength: text.length,
            method: `ocr_${provider.provider_key}_v1`,
          }),
        ]);
        return processedResult(job, "succeeded", provider.provider_key, text.length, "provider");
      } catch (error) {
        lastError = error;
        const latency = Date.now() - started;
        const textTooShort = isTextTooShortFailure(error);
        const quotaFailure = isQuotaFailure(error);
        const rateLimitFailure = isRateLimitFailure(error);
        if (textTooShort) textTooShortCount += 1;
        else if (rateLimitFailure) rateLimitPauseCount += 1;
        else if (quotaFailure) quotaPauseCount += 1;
        else hardFailureCount += 1;
        const failureStatements = [
          attemptStatement(
            db,
            job.id,
            provider.provider_key,
            textTooShort ? "skipped" : quotaFailure ? "quota_exhausted" : "failed",
            error.httpStatus || null,
            latency,
            Number(error.textLength || 0),
            error.code || "OCR_PROVIDER_FAILED",
            cleanError(error.message),
          ),
        ];
        if (textTooShort) {
          failureStatements.push(providerHealthStatement(db, provider.provider_key, "ready", null));
        } else {
          failureStatements.push(rateLimitFailure
            ? providerCooldownStatement(db, provider.provider_key, nextRateCooldown(provider), cleanError(error.message))
            : providerHealthStatement(db, provider.provider_key, quotaFailure ? "exhausted" : "ready", cleanError(error.message)));
        }
        await db.batch(failureStatements);
      }
    }

    if (rateLimitPauseCount > 0 && hardFailureCount === 0) {
      const message = cleanError(lastError?.message || "Provider OCR terkena rate limit. Batch dijeda dan job akan dicoba lagi setelah cooldown.");
      await pauseJob(db, job, message);
      return processedResult(job, "paused", "", 0, PAUSE_RATE_LIMIT_NOTE, providers.length, message);
    }

    if (quotaPauseCount > 0 && hardFailureCount === 0) {
      const message = cleanError(lastError?.message || "Kuota provider OCR habis. Batch dijeda; aktifkan provider OCR lain untuk lanjut sekarang, atau tunggu kuota provider reset.");
      await pauseJob(db, job, message);
      return processedResult(job, "paused", "", 0, PAUSE_QUOTA_NOTE, providers.length, message);
    }

    if (lastError && isRateLimitFailure(lastError)) {
      const message = cleanError(lastError.message || "Provider OCR terkena rate limit. Batch dijeda dan job akan dicoba lagi setelah cooldown.");
      await pauseJob(db, job, message);
      return processedResult(job, "paused", "", 0, PAUSE_RATE_LIMIT_NOTE, providers.length, message);
    }

    if (lastError && isQuotaFailure(lastError)) {
      const message = cleanError(lastError.message || "Kuota provider OCR habis. Batch dijeda; aktifkan provider OCR lain untuk lanjut sekarang, atau tunggu kuota provider reset.");
      await pauseJob(db, job, message);
      return processedResult(job, "paused", "", 0, PAUSE_QUOTA_NOTE, providers.length, message);
    }

    if (textTooShortCount > 0 && hardFailureCount === 0) {
      const message = "OCR selesai, tetapi halaman brosur ini tidak memiliki teks yang cukup untuk dipakai. Lihat gambar untuk memastikan.";
      await markJobNeedsReview(db, auth, job, message);
      return processedResult(job, "needs_review", "", 0, "OCR_TEXT_TOO_SHORT", providers.length);
    }

    await failJob(db, job, lastError?.message || "Semua provider OCR gagal atau sudah mencapai limit.");
    return processedResult(job, "failed", "", 0, cleanError(lastError?.message || "FAILED"), providers.length);
  } catch (error) {
    await failJob(db, job, error.message);
    return processedResult(job, "failed", "", 0, cleanError(error.message), providers.length);
  }
}

async function successStatements(db, auth, job, result) {
  const listing = await loadListing(db, job.franchise_id);
  const candidates = extractProposalCandidatesFromText(result.text);
  const actorUserId = effectiveActorUserId(auth, job);
  return [
    ...proposalKnowledgeStatements(db, {
      assetId: job.asset_id,
      listing,
      result: {
        method: result.method,
        status: "extracted",
        sourceText: result.text,
        pageCount: 1,
        candidates: onlyMissingCandidates(candidates, listing),
      },
      actorUserId,
      siteId: SITE_FRANCHISEE_ID,
    }),
    db
      .prepare(
        `UPDATE ocr_jobs
         SET status = 'succeeded', provider_key = ?, content_hash = ?, attempt_count = attempt_count + 1,
             completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, error_message = NULL
         WHERE id = ?`,
      )
      .bind(result.providerKey, result.contentHash, job.id),
    auditStatement(db, "dashboard.ocr_jobs.succeeded", "ocr_jobs", job.id, {
      asset_id: job.asset_id,
      franchise_id: job.franchise_id,
      provider_key: result.providerKey,
      text_length: result.textLength,
    }, actorUserId),
  ];
}

async function loadListing(db, franchiseId) {
  const row = await db
    .prepare(
      `SELECT id, brand_name, slug,
              outlet_type, location_requirement, total_investment_idr, fee_license_idr,
              estimated_bep_months, royalty_percent, net_profit_percent, support_system
       FROM franchises
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(franchiseId)
    .first();
  if (!row) throw new Error("Listing untuk job OCR tidak ditemukan.");
  return row;
}

async function loadImage(job, fetchImpl) {
  if (!isSafeExternalUrl(job.source_url)) throw new Error("URL aset proposal tidak valid untuk OCR.");
  const response = await fetchImpl(job.source_url, { cf: { cacheTtl: 300 } });
  if (!response.ok) throw new Error(`Aset proposal gagal diambil untuk OCR (${response.status}).`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Aset proposal terlalu besar untuk OCR batch.");
  const mimeType = response.headers.get("content-type")?.split(";")[0] || job.mime_type || "application/octet-stream";
  if (!String(mimeType).toLowerCase().startsWith("image/")) throw new Error("OCR batch saat ini hanya untuk gambar proposal.");
  return {
    sourceUrl: job.source_url,
    bytes,
    base64: arrayBufferToBase64(bytes),
    mimeType,
  };
}

async function prepareRateLimit(db, provider) {
  const windowSeconds = Number(provider.rate_limit_window_seconds || 0);
  const maxRequests = Number(provider.rate_limit_max_requests || 0);
  const now = new Date();
  const cooldownUntil = provider.cooldown_until ? new Date(provider.cooldown_until) : null;
  if (cooldownUntil && cooldownUntil > now) {
    return {
      allowed: false,
      cooldownUntil: cooldownUntil.toISOString(),
      reason: `Provider cooldown sampai ${cooldownUntil.toISOString()}.`,
    };
  }
  if (!windowSeconds || !maxRequests) return { allowed: true };

  const windowStart = new Date(now.getTime() - (windowSeconds * 1000)).toISOString();
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(units), 0) used
       FROM ocr_provider_usage_events
       WHERE provider_key = ?
         AND status = 'counted'
         AND datetime(created_at) >= datetime(?)`,
    )
    .bind(provider.provider_key, windowStart)
    .first();
  const used = Number(row?.used || 0);
  if (used < maxRequests) return { allowed: true };
  const nextWindow = new Date(now.getTime() + (windowSeconds * 1000)).toISOString();
  return {
    allowed: false,
    cooldownUntil: nextWindow,
    reason: `Rate limit lokal provider tercapai (${used}/${maxRequests} dalam ${windowSeconds} detik).`,
  };
}

async function prepareQuota(db, provider) {
  const limit = Number(provider.free_quota_limit || 0);
  const period = provider.free_quota_period || "account_specific";
  if (!limit) return { allowed: true };

  const now = new Date();
  if (provider.trial_ends_at && new Date(provider.trial_ends_at) < now) {
    return { allowed: false, reason: "Trial provider sudah berakhir." };
  }

  const resetAt = provider.quota_reset_at ? new Date(provider.quota_reset_at) : null;
  if (resetAt && resetAt <= now && ["daily", "monthly", "compute_daily"].includes(period)) {
    await db
      .prepare("UPDATE ocr_provider_configs SET quota_used = 0, quota_reset_at = ?, health_status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE provider_key = ?")
      .bind(nextQuotaReset(period, now), provider.provider_key)
      .run();
    provider.quota_used = 0;
    provider.quota_reset_at = nextQuotaReset(period, now);
  } else if (!resetAt && ["daily", "monthly", "compute_daily"].includes(period)) {
    await db
      .prepare("UPDATE ocr_provider_configs SET quota_reset_at = ?, updated_at = CURRENT_TIMESTAMP WHERE provider_key = ?")
      .bind(nextQuotaReset(period, now), provider.provider_key)
      .run();
  }

  return Number(provider.quota_used || 0) < limit
    ? { allowed: true }
    : { allowed: false, reason: "Limit gratis provider sudah tercapai di sistem." };
}

function nextQuotaReset(period, now) {
  const next = new Date(now);
  if (period === "monthly") {
    next.setUTCMonth(next.getUTCMonth() + 1, 1);
    next.setUTCHours(0, 0, 0, 0);
    return next.toISOString();
  }
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString();
}

function attemptStatement(db, jobId, providerKey, status, httpStatus, latencyMs, textLength, errorCode, errorMessage) {
  return db
    .prepare(
      `INSERT INTO ocr_attempts (
         id, job_id, provider_key, status, http_status, latency_ms, text_length, error_code, error_message
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(`ocrattempt_${randomId()}`, jobId, providerKey || null, status, httpStatus, latencyMs, textLength || 0, errorCode, errorMessage);
}

function usageStatement(db, providerKey, jobId, contentHash, units, status) {
  return db
    .prepare(
      `INSERT INTO ocr_provider_usage_events (id, provider_key, job_id, content_hash, units, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(`ocrusage_${randomId()}`, providerKey, jobId, contentHash, units, status);
}

function quotaIncrementStatement(db, providerKey) {
  return db
    .prepare(
      `UPDATE ocr_provider_configs
       SET quota_used = COALESCE(quota_used, 0) + 1,
           last_checked_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE provider_key = ?`,
    )
    .bind(providerKey);
}

function providerHealthStatement(db, providerKey, healthStatus, errorMessage) {
  return db
    .prepare(
      `UPDATE ocr_provider_configs
       SET health_status = ?, last_error = ?, cooldown_until = NULL,
           last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE provider_key = ?`,
    )
    .bind(healthStatus, errorMessage || null, providerKey);
}

function providerCooldownStatement(db, providerKey, cooldownUntil, errorMessage) {
  return db
    .prepare(
      `UPDATE ocr_provider_configs
       SET health_status = 'cooldown', cooldown_until = ?, last_error = ?,
           last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE provider_key = ?`,
    )
    .bind(cooldownUntil || null, errorMessage || null, providerKey);
}

async function failJob(db, job, message) {
  await db
    .prepare(
      `UPDATE ocr_jobs
       SET status = 'failed', error_message = ?, attempt_count = attempt_count + 1,
           completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(cleanError(message), job.id)
    .run();
}

async function pauseJob(db, job, message) {
  await db
    .prepare(
      `UPDATE ocr_jobs
       SET status = 'pending', error_message = ?,
           started_at = NULL, completed_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(cleanError(message), job.id)
    .run();
}

async function releaseUnprocessedJobs(db, jobs, reason) {
  if (!jobs.length) return;
  await db.batch(jobs.map((job) => db
    .prepare(
      `UPDATE ocr_jobs
       SET status = 'pending', error_message = COALESCE(error_message, ?),
           started_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'running'`,
    )
    .bind(cleanError(reason), job.id)));
}

async function markJobNeedsReview(db, auth, job, message) {
  const actorUserId = effectiveActorUserId(auth, job);
  await db.batch([
    markJobNeedsReviewStatement(db, job.id, message, actorUserId),
    auditStatement(db, "dashboard.ocr_jobs.needs_review", "ocr_jobs", job.id, {
      asset_id: job.asset_id,
      franchise_id: job.franchise_id,
      reason: message,
    }, actorUserId),
  ]);
}

function markJobNeedsReviewStatement(db, jobId, message, userId) {
  return db
    .prepare(
      `UPDATE ocr_jobs
       SET status = 'needs_review', error_message = ?, requested_by_user_id = ?,
           completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(cleanError(message), userId, jobId);
}

function markJobNoTextStatement(db, jobId, message, userId) {
  return db
    .prepare(
      `UPDATE ocr_jobs
       SET status = 'no_text', error_message = ?, requested_by_user_id = ?,
           provider_key = NULL, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(cleanError(message), userId, jobId);
}

function retryJobStatement(db, jobId, userId) {
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

function onlyMissingCandidates(candidates, listing) {
  return Object.fromEntries(Object.entries(candidates || {}).filter(([field]) => !hasValue(listing?.[field])));
}

function effectiveActorUserId(auth, job) {
  const authId = textOrNull(auth?.id);
  if (authId && authId !== "ocr_worker") return authId;
  return textOrNull(job?.requested_by_user_id);
}

function bindStatement(statement, values) {
  return values && values.length ? statement.bind(...values) : statement;
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function maskJobRow(row) {
  return {
    id: row.id,
    asset_id: row.asset_id,
    franchise_id: row.franchise_id,
    batch_id: row.batch_id || "",
    brand_name: row.brand_name || "",
    slug: row.slug || "",
    page_number: Number(row.display_order || 0) > 0 ? Number(row.display_order || 0) : null,
    source_url: row.source_url || "",
    status: row.status,
    provider_key: row.provider_key || "",
    attempt_count: Number(row.attempt_count || 0),
    error_message: row.error_message || "",
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function maskUnqueuedJobRow(row) {
  return {
    id: "",
    asset_id: row.asset_id,
    franchise_id: row.franchise_id,
    batch_id: "",
    brand_name: row.brand_name || "",
    slug: row.slug || "",
    page_number: Number(row.display_order || 0) > 0 ? Number(row.display_order || 0) : null,
    source_url: row.source_url || "",
    status: "unqueued",
    provider_key: "",
    attempt_count: 0,
    error_message: "",
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function maskResultRow(row) {
  const structuredData = parseJsonObject(row.structured_data);
  return {
    id: row.id,
    asset_id: row.asset_id,
    franchise_id: row.franchise_id,
    brand_name: row.brand_name || "",
    slug: row.slug || "",
    page_number: Number(row.display_order || 0) > 0 ? Number(row.display_order || 0) : null,
    source_url: row.public_url || row.legacy_url || "",
    extraction_method: row.extraction_method || "",
    extraction_status: row.extraction_status || "",
    source_text_preview: row.source_text_preview || "",
    text_length: Number(row.text_length || 0),
    candidate_count: Object.keys(structuredData).length,
    candidate_fields: Object.keys(structuredData),
    suggestion_id: row.suggestion_id || "",
    suggestion_status: row.suggestion_status || "",
    updated_at: row.updated_at || null,
  };
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function processedResult(job, status, providerKey, textLength, note, providerCount = 0, message = "") {
  return {
    job_id: job.id,
    asset_id: job.asset_id,
    franchise_id: job.franchise_id,
    status,
    provider_key: providerKey || "",
    text_length: Number(textLength || 0),
    note: note || "",
    provider_count: Number(providerCount || 0),
    message: message || "",
  };
}

function providerAttemptError(code, message, httpStatus, textLength) {
  const error = new Error(message);
  error.code = code;
  error.httpStatus = httpStatus || null;
  error.textLength = Number(textLength || 0);
  return error;
}

function isTextTooShortFailure(error) {
  return error?.code === "OCR_TEXT_TOO_SHORT";
}

function isQuotaFailure(error) {
  return error?.httpStatus === 429 || /quota|limit|rate|E553/i.test(error?.message || "") || /QUOTA|LIMIT|RATE/i.test(error?.code || "");
}

function isRateLimitFailure(error) {
  return error?.httpStatus === 429 || /rate limit|rate-limit|too many requests|E553/i.test(error?.message || "") || /RATE/i.test(error?.code || "");
}

function isPausedResult(result) {
  return result?.note === PAUSE_RATE_LIMIT_NOTE || result?.note === PAUSE_QUOTA_NOTE;
}

function batchProgressOptions(processed, pause) {
  if (pause?.note === PAUSE_RATE_LIMIT_NOTE) {
    return {
      status: "paused_rate_limit",
      message: pause.message || "Batch OCR dijeda karena provider mencapai rate limit. Retry setelah cooldown selesai.",
    };
  }
  if (pause?.note === PAUSE_QUOTA_NOTE) {
    return {
      status: "paused_quota",
      message: pause.message || "Batch OCR dijeda karena kuota provider habis. Aktifkan provider OCR lain untuk lanjut sekarang, atau tunggu reset kuota provider.",
    };
  }
  return {
    message: processed.length ? `Memproses ${processed.length} job terakhir.` : "Tidak ada job pending di batch ini.",
  };
}

function providerQuotaExhaustedMessage(provider, reason = "") {
  const label = provider?.display_name || provider?.provider_key || "Provider OCR";
  const detail = cleanError(reason || "kuota provider habis");
  return `${label} kehabisan kuota OCR. ${detail}. Aktifkan provider OCR lain untuk melanjutkan batch sekarang, atau tunggu kuota provider ini reset.`;
}

function nextRateCooldown(provider) {
  const windowSeconds = Math.max(Number(provider?.rate_limit_window_seconds || 60), 30);
  return new Date(Date.now() + (windowSeconds * 1000)).toISOString();
}

function cleanError(value) {
  return normalizeOcrText(value).slice(0, 500);
}

function textOrNull(value) {
  const normalized = (value ?? "").toString().trim();
  return normalized || null;
}

function isSafeExternalUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host !== "localhost" && !host.endsWith(".localhost") && !/^\d+\.\d+\.\d+\.\d+$/.test(host);
  } catch (_error) {
    return false;
  }
}

async function sha256Base64Url(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return arrayBufferToBase64Url(digest);
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  new Uint8Array(buffer).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function arrayBufferToBase64Url(buffer) {
  return arrayBufferToBase64(buffer).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
