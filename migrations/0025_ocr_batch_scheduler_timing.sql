-- Store OCR batch scheduler timing as structured fields.
-- This removes dashboard dependence on parsing human-readable last_message text.

ALTER TABLE ocr_batch_runs ADD COLUMN scheduler_trigger_status TEXT;
ALTER TABLE ocr_batch_runs ADD COLUMN scheduler_trigger_delay_seconds INTEGER;
ALTER TABLE ocr_batch_runs ADD COLUMN scheduler_trigger_due_at TEXT;
ALTER TABLE ocr_batch_runs ADD COLUMN scheduler_last_triggered_at TEXT;

CREATE INDEX IF NOT EXISTS idx_ocr_batch_runs_scheduler_due
  ON ocr_batch_runs(scheduler_trigger_status, scheduler_trigger_due_at);
