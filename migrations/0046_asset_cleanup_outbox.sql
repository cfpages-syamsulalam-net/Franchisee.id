-- Durable outbox for R2 object cleanup that could not be completed inline.
--
-- Erasure reports the D1 half of a deletion as soon as its batch commits, but deleting the objects themselves
-- talks to R2, which can fail. Previously a failed delete was swallowed and the only trace was a count in a log
-- line that scrolled away, so private media could outlive the account it belonged to with nothing left to retry
-- from — while the settings screen said the media had been removed.
--
-- Keys are now recorded here in the SAME batch that drops their ownership rows, so the two cannot disagree: if the
-- rows are gone, the keys to clean up are on record. A failure stays 'failed_retryable' until it succeeds.
--
-- Additive only: creates a table and its indexes, touches nothing that already exists.

CREATE TABLE IF NOT EXISTS asset_cleanup_outbox (
  id            TEXT PRIMARY KEY,
  r2_bucket     TEXT,
  r2_key        TEXT NOT NULL,
  reason        TEXT NOT NULL DEFAULT 'account_erasure',
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  franchise_id  TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'failed_retryable', 'done')),
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  TEXT
);

-- One open row per object. Partial, so completed rows are ignored and a key can be queued again later if a
-- different account ever uploads it under the same name. Re-running an erasure therefore cannot double-queue.
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_cleanup_outbox_open_key
  ON asset_cleanup_outbox (r2_bucket, r2_key)
  WHERE status IN ('pending', 'failed_retryable');

-- How the drain finds work: oldest outstanding first.
CREATE INDEX IF NOT EXISTS idx_asset_cleanup_outbox_status
  ON asset_cleanup_outbox (status, created_at);
