-- Resumable OCR processing for image-based proposal pages.
-- External OCR results remain review-only input for franchise_asset_knowledge.

CREATE TABLE IF NOT EXISTS ocr_content_cache (
  content_hash TEXT PRIMARY KEY,
  source_url TEXT,
  mime_type TEXT,
  text TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  confidence REAL,
  text_length INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_key) REFERENCES ocr_provider_configs(provider_key) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS ocr_jobs (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  franchise_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'succeeded', 'needs_review', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 100,
  source_url TEXT NOT NULL,
  mime_type TEXT,
  content_hash TEXT,
  provider_key TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  requested_by_user_id TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES franchise_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_key) REFERENCES ocr_provider_configs(provider_key) ON DELETE SET NULL,
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (asset_id)
);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status_priority
  ON ocr_jobs(status, priority, created_at);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_franchise
  ON ocr_jobs(franchise_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS ocr_attempts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  provider_key TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('cache_hit', 'succeeded', 'failed', 'quota_exhausted', 'skipped')),
  http_status INTEGER,
  latency_ms INTEGER,
  text_length INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES ocr_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_key) REFERENCES ocr_provider_configs(provider_key) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ocr_attempts_job
  ON ocr_attempts(job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ocr_provider_usage_events (
  id TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL,
  job_id TEXT,
  content_hash TEXT,
  units INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'counted'
    CHECK (status IN ('counted', 'refunded', 'ignored')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_key) REFERENCES ocr_provider_configs(provider_key) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES ocr_jobs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ocr_provider_usage_events_provider
  ON ocr_provider_usage_events(provider_key, created_at DESC);
