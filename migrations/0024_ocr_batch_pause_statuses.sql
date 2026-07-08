-- Allow OCR batch runs to pause cleanly when provider rate limits or quota are hit.
-- The worker keeps affected jobs pending instead of marking every page as failed.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS ocr_batch_runs_new (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'paused_rate_limit', 'paused_quota', 'completed', 'failed', 'cancelled')),
  target_count INTEGER NOT NULL DEFAULT 100,
  assigned_count INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  succeeded_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  needs_review_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  scheduler_provider_key TEXT,
  scheduler_external_id TEXT,
  last_message TEXT,
  requested_by_user_id TEXT,
  started_at TEXT,
  last_run_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO ocr_batch_runs_new (
  id, status, target_count, assigned_count, processed_count, succeeded_count,
  failed_count, needs_review_count, skipped_count, scheduler_provider_key,
  scheduler_external_id, last_message, requested_by_user_id, started_at,
  last_run_at, completed_at, cancelled_at, created_at, updated_at
)
SELECT
  id, status, target_count, assigned_count, processed_count, succeeded_count,
  failed_count, needs_review_count, skipped_count, scheduler_provider_key,
  scheduler_external_id, last_message, requested_by_user_id, started_at,
  last_run_at, completed_at, cancelled_at, created_at, updated_at
FROM ocr_batch_runs;

DROP TABLE ocr_batch_runs;

ALTER TABLE ocr_batch_runs_new RENAME TO ocr_batch_runs;

CREATE INDEX IF NOT EXISTS idx_ocr_batch_runs_status_created
  ON ocr_batch_runs(status, created_at DESC);

PRAGMA foreign_keys = ON;
