DELETE FROM operation_events WHERE rowid IN (SELECT rowid FROM operation_events WHERE created_at < '2026-08-10 00:00:00' LIMIT 50000);
