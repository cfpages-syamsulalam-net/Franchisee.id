-- Persist logged-in franchisee saved opportunities across devices.

CREATE TABLE IF NOT EXISTS franchise_saved_opportunities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  franchise_id TEXT NOT NULL,
  source_site_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (source_site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  UNIQUE (user_id, franchise_id, source_site_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_opportunities_user_created
  ON franchise_saved_opportunities(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_opportunities_franchise
  ON franchise_saved_opportunities(franchise_id);
