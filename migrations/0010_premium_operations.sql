-- Premium operations: payment methods, funnel analytics, and account notifications.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  method_type TEXT NOT NULL CHECK (method_type IN ('bank_transfer', 'qris', 'ewallet', 'gateway', 'other')),
  label TEXT NOT NULL,
  account_name TEXT,
  account_number TEXT,
  provider TEXT,
  instructions TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO payment_methods (
  id, code, method_type, label, account_name, account_number, provider, instructions, sort_order, is_active
) VALUES (
  'payment_method_manual_bca',
  'manual_bca',
  'bank_transfer',
  'Transfer BCA',
  'Syamsul Alam',
  '0183579751',
  'BCA',
  'Transfer sesuai nominal yang muncul di halaman Membership agar pembayaran mudah dicocokkan.',
  10,
  1
);

CREATE TABLE IF NOT EXISTS premium_funnel_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  franchise_id TEXT,
  order_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'premium_page_view',
    'premium_cta_click',
    'premium_order_created',
    'premium_confirmation_submitted',
    'premium_payment_approved',
    'premium_payment_rejected',
    'premium_activated'
  )),
  surface TEXT,
  channel TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES premium_orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_premium_funnel_events_type_created
  ON premium_funnel_events(event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_premium_funnel_events_franchise_created
  ON premium_funnel_events(franchise_id, created_at);

CREATE TABLE IF NOT EXISTS premium_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  franchise_id TEXT,
  order_id TEXT,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'payment_submitted',
    'payment_approved',
    'payment_rejected',
    'premium_activated',
    'premium_expiring'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES premium_orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_premium_notifications_user_created
  ON premium_notifications(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_premium_notifications_unread
  ON premium_notifications(user_id, read_at, created_at);
