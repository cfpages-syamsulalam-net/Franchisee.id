-- The signed forfeiture contract for a self-service account erasure.
--
-- When a paid member erases their own account, the remaining paid time is forfeited with no refund, and they must
-- prove they saw that before agreeing. This row is that proof.
--
-- It is the deliberate exception to the promise that erasure deletes everything: the signer's full name and their
-- signature survive, on purpose, and the contract they sign says so explicitly. It therefore must NOT be added to
-- the erasure's delete set — `auth:status:check` asserts that.
--
-- `signature_payload` holds the encoded stroke path, not an image. A gesture is ~100-300 samples and encodes to
-- under a kilobyte, against tens of kilobytes for any raster: this table is retained for years in a database with
-- a hard 500 MB ceiling, so the representation matters more than the convenience of storing a picture.
--
-- Additive only: creates a table and its indexes, touches nothing that already exists.

CREATE TABLE IF NOT EXISTS account_erasure_consents (
  id                          TEXT PRIMARY KEY,
  -- Points at the anonymous shell the erasure leaves behind, never at an identifiable person.
  user_id                     TEXT REFERENCES users(id) ON DELETE SET NULL,
  -- Links this evidence to the `user_blocks` tombstone without storing the address it is derived from.
  email_hash                  TEXT,
  signer_full_name            TEXT NOT NULL,
  signature_format            TEXT NOT NULL DEFAULT 'path/v1'
                              CHECK (signature_format IN ('path/v1', 'image/webp', 'image/png')),
  signature_payload           TEXT NOT NULL,
  -- Lets a reader validate the payload before attempting to render it.
  signature_point_count       INTEGER,
  contract_version            TEXT NOT NULL,
  -- Which consequence text was on screen, matching `user_blocks.acknowledgement_version`.
  acknowledgement_version     TEXT NOT NULL,
  -- What they held when they signed, so the forfeiture can be shown to have applied to a real entitlement.
  membership_status_at_signing TEXT,
  membership_effective_at     TEXT,
  signed_at                   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_erasure_consents_user
  ON account_erasure_consents (user_id);

CREATE INDEX IF NOT EXISTS idx_account_erasure_consents_email
  ON account_erasure_consents (email_hash);
