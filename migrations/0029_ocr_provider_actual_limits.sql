-- Calibrate OCR provider free limits from current public/provider documentation.
-- Credential values and enablement are intentionally untouched.

UPDATE ocr_provider_configs
SET free_quota_limit = 500,
    free_quota_period = 'daily',
    quota_unit = 'requests',
    rate_limit_window_seconds = 3600,
    rate_limit_max_requests = 180,
    updated_at = CURRENT_TIMESTAMP
WHERE provider_key = 'ocr_space';

UPDATE ocr_provider_configs
SET free_quota_limit = 5000,
    free_quota_period = 'monthly',
    quota_unit = 'transactions',
    rate_limit_window_seconds = 60,
    rate_limit_max_requests = 20,
    updated_at = CURRENT_TIMESTAMP
WHERE provider_key = 'azure_vision';

UPDATE ocr_provider_configs
SET free_quota_limit = 10000,
    free_quota_period = 'compute_daily',
    quota_unit = 'neurons',
    rate_limit_window_seconds = 60,
    rate_limit_max_requests = 20,
    updated_at = CURRENT_TIMESTAMP
WHERE provider_key = 'cloudflare_workers_ai';

UPDATE ocr_provider_configs
SET free_quota_limit = 1000,
    free_quota_period = 'monthly',
    quota_unit = 'units',
    rate_limit_window_seconds = 60,
    rate_limit_max_requests = 30,
    updated_at = CURRENT_TIMESTAMP
WHERE provider_key = 'google_vision';

UPDATE ocr_provider_configs
SET free_quota_limit = 1000,
    free_quota_period = 'daily',
    quota_unit = 'requests',
    rate_limit_window_seconds = 60,
    rate_limit_max_requests = 30,
    updated_at = CURRENT_TIMESTAMP
WHERE provider_key = 'groq_vision';

UPDATE ocr_provider_configs
SET free_quota_limit = 1000,
    free_quota_period = 'trial',
    quota_unit = 'pages',
    rate_limit_window_seconds = 60,
    rate_limit_max_requests = 10,
    updated_at = CURRENT_TIMESTAMP
WHERE provider_key = 'aws_textract';

UPDATE ocr_provider_configs
SET free_quota_limit = 100,
    free_quota_period = 'monthly',
    quota_unit = 'documents',
    rate_limit_window_seconds = 60,
    rate_limit_max_requests = 10,
    updated_at = CURRENT_TIMESTAMP
WHERE provider_key = 'veryfi';

UPDATE ocr_provider_configs
SET free_quota_limit = NULL,
    free_quota_period = 'account_specific',
    quota_unit = 'pages',
    rate_limit_window_seconds = 60,
    rate_limit_max_requests = 10,
    updated_at = CURRENT_TIMESTAMP
WHERE provider_key = 'mindee';

UPDATE ocr_provider_configs
SET free_quota_limit = NULL,
    free_quota_period = 'account_specific',
    quota_unit = 'credits',
    rate_limit_window_seconds = 60,
    rate_limit_max_requests = 10,
    updated_at = CURRENT_TIMESTAMP
WHERE provider_key = 'pdf_co';

UPDATE ocr_provider_configs
SET free_quota_limit = NULL,
    free_quota_period = 'account_specific',
    quota_unit = 'requests',
    rate_limit_window_seconds = 60,
    rate_limit_max_requests = 10,
    updated_at = CURRENT_TIMESTAMP
WHERE provider_key = 'api4ai';
