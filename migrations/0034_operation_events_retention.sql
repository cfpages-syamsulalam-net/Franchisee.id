-- Keep operational telemetry bounded; preserve current incidents and all business data.
CREATE INDEX IF NOT EXISTS idx_operation_events_created_at
ON operation_events(created_at);

CREATE TRIGGER IF NOT EXISTS operation_events_retention
AFTER INSERT ON operation_events
BEGIN
  DELETE FROM operation_events WHERE rowid IN (
    SELECT rowid FROM operation_events
    WHERE created_at < datetime('now', '-30 day')
    ORDER BY created_at LIMIT 100
  );
END;
