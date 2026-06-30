-- Premium lifecycle settings, grace-period emails, annual reports, and order discounts.

PRAGMA foreign_keys = ON;

ALTER TABLE premium_orders ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE premium_orders ADD COLUMN discount_reason TEXT;
ALTER TABLE notification_email_queue ADD COLUMN body_html TEXT;

CREATE TABLE IF NOT EXISTS premium_settings (
  setting_key TEXT PRIMARY KEY,
  value_text TEXT,
  value_number REAL,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT OR IGNORE INTO premium_settings (setting_key, value_number, value_text) VALUES
  ('grace_period_days', 3, NULL),
  ('grace_daily_email_enabled', 1, NULL),
  ('annual_report_enabled', 1, NULL),
  ('multi_brand_discount_enabled', 0, NULL),
  ('multi_brand_discount_percent', 0, NULL),
  ('multi_brand_min_owned_brands', 2, NULL);

CREATE TABLE IF NOT EXISTS premium_grace_notifications (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  franchise_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  grace_day INTEGER NOT NULL,
  queued_email_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES franchise_subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (queued_email_id) REFERENCES notification_email_queue(id) ON DELETE SET NULL,
  UNIQUE (subscription_id, grace_day)
);

CREATE INDEX IF NOT EXISTS idx_premium_grace_notifications_franchise
  ON premium_grace_notifications(franchise_id, created_at);

CREATE TABLE IF NOT EXISTS premium_annual_reports (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  franchise_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  period_start_at TEXT NOT NULL,
  period_end_at TEXT NOT NULL,
  listing_views INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  inquiries INTEGER NOT NULL DEFAULT 0,
  contact_clicks INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  queued_email_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES franchise_subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (queued_email_id) REFERENCES notification_email_queue(id) ON DELETE SET NULL,
  UNIQUE (subscription_id, period_start_at, period_end_at)
);

CREATE INDEX IF NOT EXISTS idx_premium_annual_reports_franchise
  ON premium_annual_reports(franchise_id, created_at);
