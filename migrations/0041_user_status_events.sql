-- 0041_user_status_events.sql
--
-- Append-only account status timeline.
--
-- Why: `users.status` holds only the current value, so nothing records when it changed, why, or who changed
-- it. That is how a resolver could overwrite a suspension without anyone noticing. This table makes every
-- transition a row, and the current status is the row with the greatest `effective_at` (tie-broken by
-- `recorded_at`, because `effective_at` is when the change took effect while `recorded_at` is when we learned
-- about it — they differ for backfills and manual corrections).
--
-- `blocked` is a valid status here. It is deliberately not added to the `users.status` CHECK constraint:
-- SQLite cannot alter a CHECK without rebuilding the table, and a block has to survive erasure anyway, so it
-- lives in `user_blocks` with this table recording that it happened.
--
-- Idempotent: table, index and backfill all tolerate re-running.

CREATE TABLE IF NOT EXISTS user_status_events (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('active', 'pending', 'suspended', 'blocked')),
  reason        TEXT,
  actor_user_id TEXT,
  effective_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_status_events_current
  ON user_status_events(user_id, effective_at DESC, recorded_at DESC);

-- Backfill: record each user's current status as their baseline event, dated from when the row was created so
-- the timeline starts where the account did. The reason preserves the original value, because the new CHECK
-- has no `deleted` member (erasure is expressed by `user_blocks`), so a legacy `deleted` row is recorded as
-- `suspended` with its true former value kept in the text rather than silently reinterpreted.
-- `NOT EXISTS` keeps it idempotent.
INSERT INTO user_status_events (id, user_id, status, reason, effective_at, recorded_at)
SELECT
  'status_' || lower(hex(randomblob(8))),
  u.id,
  CASE
    WHEN u.status IN ('active', 'pending', 'suspended') THEN u.status
    ELSE 'suspended'
  END,
  'backfill: users.status was ' || COALESCE(u.status, 'null'),
  COALESCE(u.created_at, CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_status_events e WHERE e.user_id = u.id);
