-- 0043_user_blocks.sql
--
-- The tombstone that survives erasure.
--
-- A person may ask from settings to have their data deleted and their account blocked. After that: their data
-- is gone, they cannot sign in, and the same email can never register again. This table is the only thing that
-- remains, which is why it is separate from `users` and carries no foreign key — the block must not depend on
-- a user row existing, and it must not be collateral damage of any future cleanup.
--
-- `email_hash` rather than the raw address: the block is enforced by comparing a salted hash of the normalised
-- email, so the tombstone cannot be read back as personal data. The consequence is that the salt is
-- load-bearing — if it changes, existing hashes stop matching and previously blocked addresses could register
-- again. It is therefore a stored secret (`USER_BLOCK_SALT` in the Pages environment) and must never be
-- rotated without re-hashing every row here.
--
-- `acknowledgement_version` records which consequence text the person agreed to, because the user was told
-- exactly what would be lost and we should be able to show what they were told.
--
-- Idempotent: the table and its indexes tolerate re-running.

CREATE TABLE IF NOT EXISTS user_blocks (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT,
  email_hash              TEXT NOT NULL,
  hash_algorithm          TEXT NOT NULL DEFAULT 'sha256+salt-v1',
  reason                  TEXT,
  request_source          TEXT CHECK (request_source IS NULL OR request_source IN ('self_service', 'admin')),
  acknowledged_at         TEXT NOT NULL,
  acknowledgement_version TEXT NOT NULL,
  blocked_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at              TEXT,
  revoked_by_user_id      TEXT,
  revoke_note             TEXT,
  UNIQUE (email_hash)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_user
  ON user_blocks(user_id);

CREATE INDEX IF NOT EXISTS idx_user_blocks_active
  ON user_blocks(email_hash) WHERE revoked_at IS NULL;
