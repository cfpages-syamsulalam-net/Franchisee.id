-- Add a final OCR job status for proposal pages that an admin has verified as having no useful text.
-- This separates "needs human review" from "reviewed and acceptable as no/low text".

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS ocr_jobs_new (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  franchise_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'succeeded', 'needs_review', 'no_text', 'failed', 'cancelled')),
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
  batch_id TEXT,
  FOREIGN KEY (asset_id) REFERENCES franchise_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_key) REFERENCES ocr_provider_configs(provider_key) ON DELETE SET NULL,
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (asset_id)
);

INSERT INTO ocr_jobs_new (
  id, asset_id, franchise_id, status, priority, source_url, mime_type, content_hash,
  provider_key, attempt_count, error_message, requested_by_user_id, started_at,
  completed_at, created_at, updated_at, batch_id
)
SELECT
  id, asset_id, franchise_id,
  CASE
    WHEN status = 'needs_review'
      AND (
        error_message LIKE 'Admin sudah cek gambar:%'
        OR error_message LIKE 'Ditandai admin:%'
        OR error_message LIKE '%tidak memiliki teks yang cukup%'
      )
    THEN 'no_text'
    ELSE status
  END,
  priority, source_url, mime_type, content_hash, provider_key, attempt_count,
  error_message, requested_by_user_id, started_at, completed_at, created_at,
  updated_at, batch_id
FROM ocr_jobs;

DROP TABLE ocr_jobs;

ALTER TABLE ocr_jobs_new RENAME TO ocr_jobs;

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status_priority
  ON ocr_jobs(status, priority, created_at);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_franchise
  ON ocr_jobs(franchise_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_batch_status
  ON ocr_jobs(batch_id, status, updated_at);

PRAGMA foreign_keys = ON;
