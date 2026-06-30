-- Premium email delivery metadata, renewal reminders, and duplicate-order guardrails.

PRAGMA foreign_keys = ON;

ALTER TABLE notification_email_queue ADD COLUMN provider TEXT;
ALTER TABLE notification_email_queue ADD COLUMN provider_message_id TEXT;
ALTER TABLE notification_email_queue ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notification_email_queue ADD COLUMN next_attempt_at TEXT;
ALTER TABLE notification_email_queue ADD COLUMN locked_at TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_email_queue_due
  ON notification_email_queue(status, next_attempt_at, created_at);

CREATE TABLE IF NOT EXISTS premium_subscription_reminders (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  franchise_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('renewal_30d', 'renewal_14d', 'renewal_7d', 'renewal_1d')),
  queued_email_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES franchise_subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (queued_email_id) REFERENCES notification_email_queue(id) ON DELETE SET NULL,
  UNIQUE (subscription_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_premium_subscription_reminders_franchise
  ON premium_subscription_reminders(franchise_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_orders_one_active_pending
  ON premium_orders(franchise_id, user_id, plan_code)
  WHERE status IN ('pending_payment', 'confirmation_submitted');

CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_subscriptions_source_order
  ON franchise_subscriptions(source_order_id)
  WHERE source_order_id IS NOT NULL;
