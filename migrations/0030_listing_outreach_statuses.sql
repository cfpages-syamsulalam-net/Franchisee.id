-- Current sales pipeline status for dashboard outreach Kanban.
-- Event history remains in listing_outreach_events; this table stores the latest stage.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS listing_outreach_statuses (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  site_id TEXT NOT NULL DEFAULT 'site_franchisee_id',
  status TEXT NOT NULL DEFAULT 'uncontacted'
    CHECK (status IN (
      'uncontacted',
      'saved_contact',
      'contacted',
      'responded',
      'qualified',
      'claim_started',
      'claimed',
      'subscribed',
      'renewal_risk',
      'burned'
    )),
  assigned_staff_user_id TEXT,
  notes TEXT,
  last_contacted_at TEXT,
  last_response_at TEXT,
  last_claimed_at TEXT,
  last_subscribed_at TEXT,
  last_status_changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_staff_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (franchise_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_outreach_statuses_site_status
  ON listing_outreach_statuses(site_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_outreach_statuses_staff
  ON listing_outreach_statuses(assigned_staff_user_id, updated_at DESC);
