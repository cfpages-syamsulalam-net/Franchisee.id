-- Admin/staff dashboard operations for Franchisee.id.
-- Staff can suggest edits and log outreach; admin approves edit suggestions unless
-- a staff user has an active auto-approval rule.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS listing_outreach_events (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  site_id TEXT NOT NULL DEFAULT 'site_franchisee_id',
  staff_user_id TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'phone', 'email', 'note')),
  contact_label TEXT,
  contact_value TEXT,
  message_template_key TEXT,
  message_text TEXT,
  outcome TEXT NOT NULL DEFAULT 'contacted'
    CHECK (outcome IN ('queued', 'contacted', 'replied', 'claim_started', 'claimed', 'invalid_contact', 'no_response', 'note')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listing_outreach_events_franchise
  ON listing_outreach_events(franchise_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_outreach_events_staff
  ON listing_outreach_events(staff_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS staff_auto_approval_rules (
  id TEXT PRIMARY KEY,
  staff_user_id TEXT NOT NULL,
  site_id TEXT NOT NULL DEFAULT 'site_franchisee_id',
  scope TEXT NOT NULL DEFAULT 'listing_suggestions'
    CHECK (scope IN ('listing_suggestions', 'outreach_notes')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  approved_by_user_id TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (staff_user_id, site_id, scope)
);

CREATE TABLE IF NOT EXISTS listing_edit_suggestions (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  site_id TEXT NOT NULL DEFAULT 'site_franchisee_id',
  suggested_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved', 'cancelled')),
  field_name TEXT NOT NULL,
  old_value TEXT,
  suggested_value TEXT,
  reason TEXT,
  reviewed_by_user_id TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  FOREIGN KEY (suggested_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_listing_edit_suggestions_status
  ON listing_edit_suggestions(site_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_edit_suggestions_franchise
  ON listing_edit_suggestions(franchise_id, status, created_at DESC);
