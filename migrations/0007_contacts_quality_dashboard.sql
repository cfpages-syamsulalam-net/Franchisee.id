-- Normalized contact data and persistent quality checks for dashboard operations.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS franchise_contacts (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  source_site_id TEXT NOT NULL DEFAULT 'site_franchisee_id',
  contact_type TEXT NOT NULL
    CHECK (contact_type IN ('phone', 'whatsapp', 'email', 'website', 'address', 'instagram', 'facebook', 'tiktok', 'youtube', 'linkedin')),
  label TEXT,
  value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  url TEXT,
  source_field TEXT,
  confidence TEXT NOT NULL DEFAULT 'high'
    CHECK (confidence IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invalid', 'archived')),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (source_site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  UNIQUE (franchise_id, source_site_id, contact_type, normalized_value)
);

CREATE INDEX IF NOT EXISTS idx_franchise_contacts_franchise
  ON franchise_contacts(franchise_id, source_site_id, status, contact_type);

CREATE INDEX IF NOT EXISTS idx_franchise_contacts_type
  ON franchise_contacts(source_site_id, contact_type, status);

CREATE TABLE IF NOT EXISTS franchise_quality_checks (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  site_id TEXT NOT NULL DEFAULT 'site_franchisee_id',
  check_type TEXT NOT NULL
    CHECK (check_type IN ('missing_image', 'missing_contact', 'missing_description', 'missing_category', 'likely_all_caps', 'suspicious_contact', 'stale_listing', 'invalid_url')),
  severity TEXT NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'critical')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'ignored')),
  message TEXT NOT NULL,
  details_json TEXT,
  reviewer_user_id TEXT,
  reviewer_notes TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (franchise_id, site_id, check_type)
);

CREATE INDEX IF NOT EXISTS idx_franchise_quality_checks_site_status
  ON franchise_quality_checks(site_id, status, severity, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_franchise_quality_checks_franchise
  ON franchise_quality_checks(franchise_id, site_id, status);
