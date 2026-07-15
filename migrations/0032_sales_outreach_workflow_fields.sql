-- Durable sales workflow metadata for measurable Outreach operations.

PRAGMA foreign_keys = ON;

ALTER TABLE listing_outreach_statuses ADD COLUMN next_follow_up_at TEXT;
ALTER TABLE listing_outreach_statuses ADD COLUMN burned_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_listing_outreach_statuses_follow_up
  ON listing_outreach_statuses(site_id, next_follow_up_at, status);
