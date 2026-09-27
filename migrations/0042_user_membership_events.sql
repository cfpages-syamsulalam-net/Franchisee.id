-- 0042_user_membership_events.sql
--
-- Append-only membership (premium) status timeline.
--
-- Why: a premium user is never deleted, only downgraded. Each downgrade and each later upgrade is a row with
-- its own timestamp, and the current membership is the row with the greatest `effective_at`. That way every
-- site can see what this person's status was at any point, and a later upgrade simply adds a newer row rather
-- than rewriting history.
--
-- `franchise_subscriptions` and `premium_orders` remain the billing record; this table is the status timeline.
-- An expiry, purchase, renewal or manual change materialises an event, so a site reads the latest row instead
-- of re-deriving expiry itself.
--
-- Idempotent: table, index and backfill all tolerate re-running.

CREATE TABLE IF NOT EXISTS user_membership_events (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('free', 'premium')),
  reason              TEXT,
  source_site_id      TEXT,
  effective_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_by_user_id TEXT,
  recorded_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_membership_events_current
  ON user_membership_events(user_id, effective_at DESC, recorded_at DESC);

-- Backfill: one baseline event per user who has none. `free` is the correct baseline for anyone without a live
-- subscription, and the CASE below promotes anyone who does have one, so a paying user is never mislabelled.
INSERT INTO user_membership_events (id, user_id, status, reason, effective_at, recorded_at)
SELECT
  'member_' || lower(hex(randomblob(8))),
  u.id,
  CASE WHEN EXISTS (
    SELECT 1 FROM franchise_subscriptions s
    WHERE s.user_id = u.id
      AND (s.status IS NULL OR s.status NOT IN ('expired', 'cancelled'))
  ) THEN 'premium' ELSE 'free' END,
  'backfill: baseline at migration time',
  COALESCE(u.created_at, CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_membership_events e WHERE e.user_id = u.id);
