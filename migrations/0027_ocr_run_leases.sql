-- Short-lived server-side leases for dashboard-driven continuous OCR runs.
-- Prevents two admin browser tabs from running the same visible backfill concurrently.

CREATE TABLE IF NOT EXISTS ocr_run_leases (
  lease_key TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  owner_user_id TEXT,
  owner_email TEXT,
  owner_label TEXT,
  acquired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  heartbeat_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ocr_run_leases_expires
  ON ocr_run_leases(expires_at);
