-- Admin-managed OCR provider configuration. Credentials are intentionally
-- never returned by dashboard read APIs, but remain application-readable in D1.

CREATE TABLE IF NOT EXISTS ocr_provider_configs (
  provider_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'ocr',
  api_key TEXT,
  api_secret TEXT,
  account_id TEXT,
  endpoint_url TEXT,
  region TEXT,
  model TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  is_enabled INTEGER NOT NULL DEFAULT 0 CHECK (is_enabled IN (0, 1)),
  free_quota_limit INTEGER,
  free_quota_period TEXT NOT NULL DEFAULT 'account_specific'
    CHECK (free_quota_period IN ('daily', 'monthly', 'trial', 'compute_daily', 'account_specific')),
  quota_unit TEXT NOT NULL DEFAULT 'requests',
  quota_used INTEGER NOT NULL DEFAULT 0,
  quota_reset_at TEXT,
  trial_ends_at TEXT,
  health_status TEXT NOT NULL DEFAULT 'unconfigured'
    CHECK (health_status IN ('unconfigured', 'ready', 'cooldown', 'exhausted', 'blocked', 'disabled')),
  last_error TEXT,
  last_checked_at TEXT,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ocr_provider_rotation
  ON ocr_provider_configs(is_enabled, priority, health_status);

INSERT OR IGNORE INTO ocr_provider_configs (
  provider_key, display_name, provider_type, endpoint_url, region, model,
  priority, free_quota_limit, free_quota_period, quota_unit
) VALUES
  ('ocr_space', 'OCR.Space', 'ocr', 'https://api.ocr.space/parse/image', NULL, NULL, 10, 500, 'daily', 'requests'),
  ('azure_vision', 'Azure AI Vision', 'ocr', NULL, NULL, 'Read', 20, 5000, 'monthly', 'transactions'),
  ('cloudflare_workers_ai', 'Cloudflare Workers AI', 'vision', 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}', NULL, '@cf/meta/llama-3.2-11b-vision-instruct', 30, 10000, 'compute_daily', 'neurons'),
  ('google_vision', 'Google Cloud Vision', 'ocr', 'https://vision.googleapis.com/v1/images:annotate', NULL, 'DOCUMENT_TEXT_DETECTION', 40, 1000, 'monthly', 'pages'),
  ('groq_vision', 'Groq Vision', 'vision', 'https://api.groq.com/openai/v1/chat/completions', NULL, 'meta-llama/llama-4-scout-17b-16e-instruct', 50, 1000, 'daily', 'requests'),
  ('aws_textract', 'Amazon Textract', 'ocr', NULL, 'ap-southeast-1', 'DetectDocumentText', 60, 1000, 'trial', 'pages'),
  ('veryfi', 'Veryfi', 'document_ai', 'https://api.veryfi.com/api/v8/partner/documents', NULL, NULL, 70, 100, 'monthly', 'documents'),
  ('mindee', 'Mindee', 'document_ai', 'https://api-v2.mindee.net/v2/inferences/enqueue', NULL, NULL, 80, 200, 'trial', 'pages'),
  ('pdf_co', 'PDF.co', 'document_ai', 'https://api.pdf.co/v1/pdf/convert/to/text', NULL, NULL, 90, 10000, 'trial', 'credits'),
  ('api4ai', 'API4AI OCR', 'ocr', 'https://api4ai.cloud/ocr/v1/results', NULL, 'simple-text', 100, NULL, 'account_specific', 'requests');
