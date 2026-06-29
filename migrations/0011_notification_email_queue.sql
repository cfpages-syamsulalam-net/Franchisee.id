-- Queue outbound account/payment emails before a delivery provider is connected.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notification_email_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  related_entity_type TEXT,
  related_entity_id TEXT,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_email_queue_status_created
  ON notification_email_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_email_queue_user_created
  ON notification_email_queue(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_email_queue_related
  ON notification_email_queue(related_entity_type, related_entity_id);
