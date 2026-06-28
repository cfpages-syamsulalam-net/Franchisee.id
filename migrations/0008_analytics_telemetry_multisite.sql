-- Product analytics, operations telemetry, and multi-site publication controls.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS franchise_product_events (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('listing_view', 'save', 'unsave', 'inquiry', 'claim', 'contact_click')),
  surface TEXT,
  channel TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_events_franchise_type_created
  ON franchise_product_events(franchise_id, event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_product_events_site_created
  ON franchise_product_events(site_id, created_at);

CREATE TABLE IF NOT EXISTS operation_events (
  id TEXT PRIMARY KEY,
  source_site_id TEXT,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  route TEXT,
  message TEXT,
  entity_type TEXT,
  entity_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  FOREIGN KEY (source_site_id) REFERENCES network_sites(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_operation_events_site_created
  ON operation_events(source_site_id, created_at);

CREATE INDEX IF NOT EXISTS idx_operation_events_type_status
  ON operation_events(event_type, status, severity);
