-- 0045_franchise_removals.sql
--
-- Lets a proven brand owner take their brand out of the network, and records why.
--
-- Syamsul's rule: this is allowed once ownership is *proven* — the person claimed the brand and was approved as
-- its owner. `franchises.owner_user_id` alone is not proof, because nothing in the schema binds it to a claim
-- or a review, so a direct SQL write produces ownership with no trace. The application therefore requires an
-- approved `franchise_claims` row or an approved `franchise_submission_reviews` row naming the same user, and
-- this table records which basis was used.
--
-- Removal is a DELIST, never a delete. `DELETE FROM franchises` cascades into twenty tables, including
-- `franchise_site_publications`, `premium_orders`, `premium_payment_confirmations`, `franchise_subscriptions`,
-- `franchise_claims` and `franchise_submission_reviews` — it would destroy paid-order history and the very rows
-- that prove ownership. So publications are hidden instead, and `previous_publications` keeps a snapshot so an
-- administrator can restore faithfully.
--
-- `reason_code` exists because `franchises.status = 'archived'` already means "a rejected pending brand";
-- recording the reason separately keeps the two situations distinguishable.
--
-- Idempotent: table and index tolerate re-running.

CREATE TABLE IF NOT EXISTS franchise_removals (
  id                    TEXT PRIMARY KEY,
  franchise_id          TEXT NOT NULL UNIQUE REFERENCES franchises(id) ON DELETE CASCADE,
  requested_by_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  basis                 TEXT NOT NULL CHECK (basis IN ('owner_verified', 'admin')),
  reason_code           TEXT NOT NULL CHECK (reason_code IN ('no_longer_offering', 'bankrupt', 'seasonal', 'other')),
  note                  TEXT,
  previous_publications TEXT,
  requested_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_at          TEXT,
  revoked_at            TEXT,
  revoked_by_user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  revoke_note           TEXT
);

CREATE INDEX IF NOT EXISTS idx_franchise_removals_active
  ON franchise_removals(franchise_id) WHERE revoked_at IS NULL;
