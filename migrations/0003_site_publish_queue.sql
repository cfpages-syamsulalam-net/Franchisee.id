-- D1-to-static publish queue for D1-backed public SEO pages.
-- Public-page writes enqueue site-scoped rebuild requests; scheduled automation
-- coalesces those requests into guarded Cloudflare Pages publishes.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS site_publish_state (
  site_id TEXT PRIMARY KEY,
  publish_mode TEXT NOT NULL DEFAULT 'cloudflare_deploy_hook'
    CHECK (publish_mode IN ('cloudflare_deploy_hook', 'github_direct_deploy')),
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  dirty_since TEXT,
  last_change_at TEXT,
  last_publish_triggered_at TEXT,
  last_published_at TEXT,
  pending_count INTEGER NOT NULL DEFAULT 0,
  queued_count INTEGER NOT NULL DEFAULT 0,
  daily_publish_count INTEGER NOT NULL DEFAULT 0,
  daily_publish_date TEXT,
  daily_publish_limit INTEGER NOT NULL DEFAULT 12,
  min_publish_interval_minutes INTEGER NOT NULL DEFAULT 30,
  stale_queued_after_minutes INTEGER NOT NULL DEFAULT 120,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS site_rebuild_requests (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  franchise_id TEXT,
  reason TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'queued', 'deployed', 'failed_retryable', 'cancelled')),
  requested_by_user_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  queued_at TEXT,
  deployed_at TEXT,
  failed_at TEXT,
  error_message TEXT,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE SET NULL,
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_site_rebuild_requests_site_status
  ON site_rebuild_requests(site_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_site_rebuild_requests_franchise
  ON site_rebuild_requests(franchise_id, status);

INSERT OR IGNORE INTO site_publish_state (
  site_id,
  publish_mode,
  daily_publish_limit,
  min_publish_interval_minutes,
  stale_queued_after_minutes
) VALUES (
  'site_franchisee_id',
  'cloudflare_deploy_hook',
  12,
  30,
  120
);
