-- Premium membership orders, manual payment confirmations, and active subscriptions.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS premium_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  franchise_id TEXT NOT NULL,
  plan_code TEXT NOT NULL DEFAULT 'premium_network_yearly',
  base_amount INTEGER NOT NULL DEFAULT 3000000,
  unique_code INTEGER NOT NULL CHECK (unique_code BETWEEN 1 AND 999),
  payable_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmation_submitted', 'paid', 'expired', 'cancelled', 'rejected')),
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_provider TEXT NOT NULL DEFAULT 'manual_bca',
  provider_invoice_id TEXT,
  provider_payment_url TEXT,
  expires_at TEXT NOT NULL,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_premium_orders_user_status
  ON premium_orders(user_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_premium_orders_franchise_status
  ON premium_orders(franchise_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_premium_orders_unique_active
  ON premium_orders(payable_amount, status, expires_at);

CREATE TABLE IF NOT EXISTS premium_payment_confirmations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  franchise_id TEXT NOT NULL,
  payer_name TEXT,
  payer_bank TEXT,
  submitted_amount INTEGER NOT NULL,
  submitted_paid_at TEXT,
  proof_asset_id TEXT,
  notes TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by_user_id TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES premium_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (proof_asset_id) REFERENCES franchise_assets(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_premium_confirmations_status_created
  ON premium_payment_confirmations(review_status, created_at);

CREATE INDEX IF NOT EXISTS idx_premium_confirmations_order
  ON premium_payment_confirmations(order_id);

CREATE TABLE IF NOT EXISTS franchise_subscriptions (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  plan_code TEXT NOT NULL DEFAULT 'premium_network_yearly',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  renewal_status TEXT NOT NULL DEFAULT 'none' CHECK (renewal_status IN ('none', 'pending', 'renewed', 'cancelled')),
  source_order_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_order_id) REFERENCES premium_orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_franchise_subscriptions_franchise_status
  ON franchise_subscriptions(franchise_id, status, ends_at);

CREATE INDEX IF NOT EXISTS idx_franchise_subscriptions_user_status
  ON franchise_subscriptions(user_id, status, ends_at);
