import { z } from "zod";

export const OcrProviderKeySchema = z.enum([
  "ocr_space",
  "azure_vision",
  "cloudflare_workers_ai",
  "google_vision",
  "groq_vision",
  "aws_textract",
  "veryfi",
  "mindee",
  "pdf_co",
  "api4ai",
]);

export const OcrSchedulerProviderKeySchema = z.enum([
  "upstash_qstash",
  "cron_job_org",
  "inngest",
  "trigger_dev",
]);

export const UpdateOcrProviderConfigSchema = z.object({
  action: z.literal("update_ocr_provider_config"),
  provider_key: OcrProviderKeySchema,
  api_key: z.string().max(2000).optional().default(""),
  api_secret: z.string().max(4000).optional().default(""),
  clear_api_key: z.boolean().optional().default(false),
  clear_api_secret: z.boolean().optional().default(false),
  account_id: z.string().trim().max(240).optional().default(""),
  endpoint_url: z.string().trim().max(500).refine((value) => !value || /^https:\/\//i.test(value), "Endpoint harus memakai HTTPS.").optional().default(""),
  region: z.string().trim().max(120).optional().default(""),
  model: z.string().trim().max(240).optional().default(""),
  priority: z.coerce.number().int().min(1).max(1000).default(100),
  is_enabled: z.boolean().optional().default(false),
  free_quota_limit: z.coerce.number().int().min(0).max(100000000).optional().default(0),
  free_quota_period: z.enum(["daily", "monthly", "trial", "compute_daily", "account_specific"]).default("account_specific"),
  quota_unit: z.enum(["requests", "transactions", "pages", "neurons", "documents", "credits"]).default("requests"),
  trial_ends_at: z.string().trim().max(40).optional().default(""),
});

export const ToggleOcrProviderEnabledSchema = z.object({
  action: z.literal("toggle_ocr_provider_enabled"),
  provider_key: OcrProviderKeySchema,
  is_enabled: z.boolean(),
});

export const EnqueueOcrJobsSchema = z.object({
  action: z.literal("enqueue_ocr_jobs"),
  franchise_id: z.string().trim().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  priority: z.coerce.number().int().min(1).max(1000).optional().default(100),
  force: z.boolean().optional().default(false),
});

export const RunOcrJobsSchema = z.object({
  action: z.literal("run_ocr_jobs"),
  max_jobs: z.coerce.number().int().min(1).max(5).optional().default(1),
  batch_id: z.string().trim().max(160).optional().default(""),
});

export const RunOcrDryRunSchema = z.object({
  action: z.literal("run_ocr_dry_run"),
  franchise_id: z.string().trim().max(120).optional().default(""),
});

export const RetryOcrJobSchema = z.object({
  action: z.literal("retry_ocr_job"),
  job_id: z.string().trim().min(1).max(160),
});

export const MarkOcrJobNoTextSchema = z.object({
  action: z.literal("mark_ocr_job_no_text"),
  job_id: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(600).optional().default(""),
});

export const RetryFailedOcrJobsSchema = z.object({
  action: z.literal("retry_failed_ocr_jobs"),
  franchise_id: z.string().trim().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export const UpdateOcrSchedulerConfigSchema = z.object({
  action: z.literal("update_ocr_scheduler_config"),
  provider_key: OcrSchedulerProviderKeySchema,
  api_key: z.string().max(4000).optional().default(""),
  api_secret: z.string().max(4000).optional().default(""),
  clear_api_key: z.boolean().optional().default(false),
  clear_api_secret: z.boolean().optional().default(false),
  endpoint_url: z.string().trim().max(500).refine((value) => !value || /^https:\/\//i.test(value), "Endpoint harus memakai HTTPS.").optional().default(""),
  schedule_cron: z.string().trim().max(120).optional().default(""),
  request_url: z.string().trim().max(500).refine((value) => !value || /^https:\/\//i.test(value), "URL worker harus memakai HTTPS.").optional().default(""),
  request_body: z.string().trim().max(1200).optional().default(""),
  is_enabled: z.boolean().optional().default(false),
});

export const ToggleOcrSchedulerEnabledSchema = z.object({
  action: z.literal("toggle_ocr_scheduler_enabled"),
  provider_key: OcrSchedulerProviderKeySchema,
  is_enabled: z.boolean(),
});

export const StartOcrBatchRunSchema = z.object({
  action: z.literal("start_ocr_batch_run"),
  target_count: z.coerce.number().int().min(1).max(100).optional().default(100),
  scheduler_provider_key: OcrSchedulerProviderKeySchema.optional().default("upstash_qstash"),
});

export const RetryOcrBatchRunSchema = z.object({
  action: z.literal("retry_ocr_batch_run"),
  batch_id: z.string().trim().min(1).max(160),
  scheduler_provider_key: OcrSchedulerProviderKeySchema.optional().default("upstash_qstash"),
});

export const SearchOcrResultsSchema = z.object({
  action: z.literal("search_ocr_results"),
  query: z.string().trim().max(120).optional().default(""),
  status: z.enum(["all", "extracted", "needs_ocr", "failed"]).optional().default("all"),
  franchise_id: z.string().trim().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).optional().default(40),
  offset: z.coerce.number().int().min(0).max(5000).optional().default(0),
});

export const SearchOcrJobsSchema = z.object({
  action: z.literal("search_ocr_jobs"),
  status: z.enum(["all", "unqueued", "pending", "running", "succeeded", "needs_review", "failed"]).optional().default("all"),
  franchise_id: z.string().trim().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(120).optional().default(80),
  offset: z.coerce.number().int().min(0).max(5000).optional().default(0),
});

export const DASHBOARD_OCR_ACTION_SCHEMAS = [
  UpdateOcrProviderConfigSchema,
  ToggleOcrProviderEnabledSchema,
  EnqueueOcrJobsSchema,
  RunOcrJobsSchema,
  RunOcrDryRunSchema,
  RetryOcrJobSchema,
  MarkOcrJobNoTextSchema,
  RetryFailedOcrJobsSchema,
  UpdateOcrSchedulerConfigSchema,
  ToggleOcrSchedulerEnabledSchema,
  StartOcrBatchRunSchema,
  RetryOcrBatchRunSchema,
  SearchOcrResultsSchema,
  SearchOcrJobsSchema,
];
