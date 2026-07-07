# OCR Provider Strategy

Last updated: 2026-07-08 (Asia/Jakarta)

## Decision

Use local selectable-text extraction first. Send only image-only/scanned brochure pages to external OCR. Provider failover must use one legitimate account per provider, stop on quota/rate errors, and continue with the next enabled provider. Do not create extra accounts or projects to evade a provider's limits.

Provider credential metadata is still managed from D1 because the admin explicitly requested dashboard-managed configuration, but credential values must be encrypted before storage with a root key held outside D1. The root key is the Cloudflare Pages secret `OCR_KEY`. The dashboard must never return stored credential values, must use blank password fields to preserve existing values, and must audit only configuration metadata. Without `OCR_KEY`, new credential saves and provider enablement must fail closed so plaintext is not written to D1.

## Ranked provider shortlist

Free limits change frequently. Verify the provider console before enabling production rotation. “Recurring” means the cited allowance resets; “trial” means it is not durable capacity.

| Rank | Provider | Official free allowance | Reset/type | Brochure fit | Integration notes |
| ---: | --- | --- | --- | --- | --- |
| 1 | OCR.Space | 500 requests/day per IP on the free endpoint | Recurring daily | Strong first fallback for page images | Simple OCR-specific API. Treat each raster page as one request. Free endpoint availability and file limits are less enterprise-grade than hyperscalers. Source: https://ocr.space/ocrapi |
| 2 | Azure AI Vision | 5,000 free transactions/month; 20 transactions/minute on F0 | Recurring monthly | Strong OCR accuracy and predictable quota | Multipage PDF pages count separately. Requires endpoint plus key; F0 availability varies by region. Source: https://azure.microsoft.com/en-us/pricing/details/computer-vision/ |
| 3 | Cloudflare Workers AI | 10,000 neurons/day at no charge | Recurring daily, compute-based | Best infrastructure fit; useful vision fallback | Not a fixed page quota. Use a vision-capable model and measure actual neurons/page before setting a local page limit. Can use account ID plus scoped API token through REST. Source: https://developers.cloudflare.com/workers-ai/platform/pricing/ |
| 4 | Google Cloud Vision | First 1,000 OCR units/month free | Recurring monthly | Mature dense-document OCR | Each image/PDF page is a billable unit. Simple image calls can use an API key; async PDF processing has additional Google Cloud storage/auth requirements. Source: https://cloud.google.com/vision/pricing |
| 5 | Groq vision model | Llama 4 Scout free-plan limit currently 1,000 requests/day | Recurring daily, model/token limited | Useful multimodal fallback for image pages | Not a dedicated OCR endpoint; output must be constrained to transcription only and validated. Organization-level token limits may be reached before request limits. Source: https://console.groq.com/docs/rate-limits |
| 6 | Amazon Textract | New AWS customers: Detect Document Text up to 1,000 pages/month for three months | Trial, three months | Strong scanned-document OCR | Not a permanent free pool. Requires access key, secret, and region; disable automatically when the trial ends. Source: https://aws.amazon.com/textract/pricing/ |
| 7 | Veryfi | 100 documents/month on the API free plan | Recurring monthly | Useful for testing structured extraction | The published free allowance focuses on receipts/invoices, so validate general brochure support before production use. Source: https://faq.veryfi.com/en/articles/3743986-what-are-the-plans-prices-for-ocr-api |
| 8 | Mindee | 200 pages or 14 days | Trial | Good PDF/document pipeline evaluation | Trial only; supports raw text and large PDFs but should not be counted as recurring capacity. Source: https://docs.mindee.com/account-management/plans |
| 9 | PDF.co | 10,000 credits for one month, no card required | Trial | Useful for PDF-to-text/OCR experiments | Credits are endpoint-dependent rather than a fixed page count. Disable after trial/credits end. Source: https://pdf.co/ |
| 10 | API4AI OCR | A free RapidAPI plan is advertised; current public docs do not publish a stable quota | Account-specific/unverified | Supports JPEG, PNG, and multipage PDF | Keep disabled until the provider console confirms the exact free quota and commercial terms. Each PDF page is charged separately. Source: https://api4.ai/docs/ocr |

## Rotation policy

1. Compute a content hash and reuse successful OCR text; never resend an unchanged page.
2. Try selectable PDF text extraction before any external provider.
3. Sort enabled providers by admin priority, then skip providers in cooldown or whose configured quota counter reached its reset limit.
4. Retry transient `408`, `429`, and `5xx` responses with bounded backoff; after the retry budget, move to the next provider.
5. Mark authentication/configuration failures as blocked and require an admin action instead of repeatedly sending requests.
6. Record page count, provider, latency, response status, quota headers, and extraction confidence without logging credentials or brochure contents.
7. Trial providers must have an optional expiry date and automatically leave rotation after expiry.
8. Never spread one brochure across providers unless failover is required; this reduces privacy exposure and inconsistent OCR output.
9. Normalize every provider response into the existing proposal-knowledge text/candidate contract before admin review.
10. Keep human approval mandatory before OCR-derived values update canonical listing fields.

## D1 and dashboard implementation plan

- [x] Research and rank ten providers with official source links and free-limit caveats.
- [x] Add committed D1 storage for provider metadata, masked credential state, priority, enablement, quota, reset period, trial expiry, and health status. Migration `0020_ocr_provider_configs.sql` was applied remotely on 2026-07-07 and seeded ten disabled providers with no credentials.
- [x] Add admin-only read/update helpers that never return stored key/secret values.
- [x] Encrypt saved credential values with AES-GCM envelopes using Cloudflare Pages secret `OCR_KEY` as the external root secret. Existing plaintext values, if any, are re-encrypted on the next save instead of being returned to the browser.
- [x] Add a dedicated `/dashboard` OCR tab with provider selector, provider-specific password credential fields, only the endpoint/account/region/model fields required by the selected provider, read-only quota/free-limit metadata, priority, enable toggle, and explicit credential-clear controls only when a stored credential exists.
- [x] Add Zod validation, audit events without secret values, regression checks, documentation maps, changelog, and session context.
- [x] Add provider adapters, quota counters, OCR job queue, content-hash cache, and bounded failover. OCR execution remains admin-triggered from `/dashboard`; provider credentials/configuration alone does not send brochure data externally.
- [x] Store OCR job state in committed migration `0021_ocr_job_queue.sql`: `ocr_jobs`, `ocr_attempts`, `ocr_content_cache`, and `ocr_provider_usage_events`.
- [x] Add `/dashboard-data` actions `enqueue_ocr_jobs` and `run_ocr_jobs`. Enqueue only creates local D1 jobs for active proposal image assets; `run_ocr_jobs` is the explicit action that fetches the image and sends it to enabled providers.
- [x] Add `/dashboard-data` action `run_ocr_dry_run` and a `/dashboard` button for a one-asset production dry-run before broad backfills. The action requires `OCR_KEY` and at least one enabled provider, prepares at most one candidate job, and runs only that job.
- [x] Normalize successful OCR output into `franchise_asset_knowledge` plus pending `proposal_extraction` suggestions, preserving the human review requirement before canonical listing fields change.
- [x] Clarify dashboard execution semantics: Dry run is a real OCR call for one asset, while “Jalankan batch berikutnya” processes a bounded batch of up to five jobs per click to avoid request timeout and uncontrolled provider quota usage.
- [x] Add copyable provider error status in `/dashboard` so an admin can paste provider health/error context into troubleshooting without exposing stored credentials.
- [x] Add protected `/ocr-worker` and optional GitHub Actions cron for larger queued backfills. The route requires `OCR_SECRET`, processes at most ten jobs per request, defaults to five jobs, enforces a daily counted-usage cap, logs summaries to `operation_events`, and reuses the same queue/cache/failover runner as the dashboard.

## Dashboard credential field rules

The admin form intentionally hides fields that do not apply to the selected provider. Free allowances, reset period, quota unit, endpoint defaults, and trial status are displayed as provider metadata instead of editable admin inputs because those values come from the provider/account terms, not from Franchisee.id.

The provider field/requirement contract lives in `src/lib/ocr-provider-metadata.js`. Dashboard field visibility, server-side activation validation, and OCR regression checks must use that shared module so browser and backend behavior do not drift when provider adapters are added.

| Provider | Visible credential/config fields |
| --- | --- |
| OCR.Space | API key only |
| Azure AI Vision | Azure Vision key, Azure Vision endpoint |
| Cloudflare Workers AI | Cloudflare API token, account ID, vision model |
| Google Cloud Vision | API key only for the initial simple image OCR path |
| Groq Vision | Groq API key, vision model |
| Amazon Textract | AWS access key ID, AWS secret access key, AWS region |
| Veryfi | Veryfi API key, Veryfi username/auth secret, client ID |
| Mindee | API key only |
| PDF.co | API key only |
| API4AI OCR | API4AI/RapidAPI key only |

## Required production setup

Set the Cloudflare Pages secret `OCR_KEY` before saving or enabling OCR providers. Use a long random value and rotate it only with a planned re-encryption pass, because existing encrypted D1 envelopes depend on this root key.

Set the shared worker trigger secret as `OCR_SECRET` in both Cloudflare Pages and GitHub Actions before using the OCR worker. The current project has this secret installed without exposing its value.

Manual workflow runs are allowed without the enable variable so one-off testing stays easy. Scheduled cron runs remain inert until repository variable `OCR_WORKER_ENABLED=true` is set, because cron can spend OCR quota without an admin watching it. Optional controls:

- `OCR_WORKER_SITE_URL`: GitHub repository variable; defaults to `https://franchisee.id`.
- `OCR_WORKER_DAILY_CAP`: Cloudflare Pages environment value; defaults to 25 counted OCR units/day.

The scheduled worker does not enqueue new work by itself. Admins still enqueue proposal assets from `/dashboard`; the worker only drains pending `ocr_jobs` in small quota-aware batches.

To enable scheduled runs from PowerShell:

```powershell
gh variable set OCR_WORKER_ENABLED --body true -R cfpages-syamsulalam-net/Franchisee.id
```

To disable scheduled runs:

```powershell
gh variable set OCR_WORKER_ENABLED --body false -R cfpages-syamsulalam-net/Franchisee.id
```
