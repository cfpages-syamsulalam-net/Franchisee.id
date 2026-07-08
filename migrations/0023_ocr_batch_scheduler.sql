-- Third-party scheduler support for OCR batch backfills.
-- Keeps batch state in D1 while external providers trigger /ocr-worker in small chunks.

ALTER TABLE ocr_jobs ADD COLUMN batch_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_batch_status
  ON ocr_jobs(batch_id, status, updated_at);

CREATE TABLE IF NOT EXISTS ocr_batch_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
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

CREATE INDEX IF NOT EXISTS idx_ocr_batch_runs_status_created
  ON ocr_batch_runs(status, created_at DESC);

CREATE TABLE IF NOT EXISTS ocr_scheduler_configs (
  provider_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'scheduler',
  endpoint_url TEXT,
  api_key TEXT,
  api_secret TEXT,
  schedule_external_id TEXT,
  schedule_cron TEXT,
  request_url TEXT,
  request_headers TEXT,
  request_body TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 0,
  health_status TEXT NOT NULL DEFAULT 'unconfigured'
    CHECK (health_status IN ('unconfigured', 'ready', 'warning', 'failed', 'disabled')),
  last_error TEXT,
  last_checked_at TEXT,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO ocr_scheduler_configs (
  provider_key, display_name, provider_type, endpoint_url, schedule_cron, request_url, request_body, health_status
) VALUES
  (
    'upstash_qstash',
    'Upstash QStash',
    'queue_delay',
    'https://qstash.upstash.io',
    '',
    'https://franchisee.id/ocr-worker',
    '{"source":"upstash_qstash","limit":5}',
    'unconfigured'
  ),
  (
    'cron_job_org',
    'cron-job.org',
    'external_cron',
    'https://api.cron-job.org',
    '* * * * *',
    'https://franchisee.id/ocr-worker',
    '{"source":"cron_job_org","limit":5}',
    'unconfigured'
  ),
  (
    'inngest',
    'Inngest',
    'external_workflow',
    'https://api.inngest.com',
    '',
    'https://franchisee.id/ocr-worker',
    '{"source":"inngest","limit":5}',
    'unconfigured'
  ),
  (
    'trigger_dev',
    'Trigger.dev',
    'external_workflow',
    'https://api.trigger.dev',
    '',
    'https://franchisee.id/ocr-worker',
    '{"source":"trigger_dev","limit":5}',
    'unconfigured'
  )
ON CONFLICT(provider_key) DO UPDATE SET
  display_name = excluded.display_name,
  provider_type = excluded.provider_type,
  endpoint_url = COALESCE(ocr_scheduler_configs.endpoint_url, excluded.endpoint_url),
  request_url = COALESCE(ocr_scheduler_configs.request_url, excluded.request_url),
  request_body = COALESCE(ocr_scheduler_configs.request_body, excluded.request_body),
  updated_at = CURRENT_TIMESTAMP;
