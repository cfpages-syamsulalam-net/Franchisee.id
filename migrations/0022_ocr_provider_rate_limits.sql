-- Provider-level OCR rate-limit metadata for bounded manual/worker batches.
-- Values are local conservative guards, not a replacement for provider-side limits.

ALTER TABLE ocr_provider_configs ADD COLUMN rate_limit_window_seconds INTEGER;
ALTER TABLE ocr_provider_configs ADD COLUMN rate_limit_max_requests INTEGER;
ALTER TABLE ocr_provider_configs ADD COLUMN cooldown_until TEXT;

CREATE INDEX IF NOT EXISTS idx_ocr_provider_cooldown
  ON ocr_provider_configs(is_enabled, health_status, cooldown_until);

UPDATE ocr_provider_configs
SET rate_limit_window_seconds = CASE provider_key
    WHEN 'ocr_space' THEN 60
    WHEN 'azure_vision' THEN 60
    WHEN 'cloudflare_workers_ai' THEN 60
    WHEN 'google_vision' THEN 60
    WHEN 'groq_vision' THEN 60
    WHEN 'aws_textract' THEN 60
    WHEN 'veryfi' THEN 60
    WHEN 'mindee' THEN 60
    WHEN 'pdf_co' THEN 60
    WHEN 'api4ai' THEN 60
    ELSE rate_limit_window_seconds
  END,
  rate_limit_max_requests = CASE provider_key
    WHEN 'ocr_space' THEN 10
    WHEN 'azure_vision' THEN 20
    WHEN 'cloudflare_workers_ai' THEN 20
    WHEN 'google_vision' THEN 30
    WHEN 'groq_vision' THEN 20
    WHEN 'aws_textract' THEN 10
    WHEN 'veryfi' THEN 10
    WHEN 'mindee' THEN 10
    WHEN 'pdf_co' THEN 10
    WHEN 'api4ai' THEN 10
    ELSE rate_limit_max_requests
  END
WHERE provider_key IN (
  'ocr_space',
  'azure_vision',
  'cloudflare_workers_ai',
  'google_vision',
  'groq_vision',
  'aws_textract',
  'veryfi',
  'mindee',
  'pdf_co',
  'api4ai'
);
