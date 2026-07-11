# OCR Batch Scheduling Strategy

Last updated: 2026-07-11 (Asia/Jakarta)

## Goal

Make the `/dashboard` OCR action feel like “klik sekali untuk proses sampai 100 job”, while still respecting provider quota, provider rate limit, Cloudflare request limits, and the current rule that brochure OCR only runs after an explicit admin action.

The safe design is not a single dashboard HTTP request that sleeps until 100 images finish. The safe design is:

1. Admin clicks `Jalankan batch berikutnya`.
2. Dashboard runs scheduler preflight before creating work. For Upstash QStash this publishes a harmless `{ "preflight": true }` message to `/ocr-worker`, validating the QStash token, destination URL shape, and worker secret path without running OCR.
3. If preflight fails, dashboard returns the scheduler error and does not create the `ocr_batch_runs` record or assign 100 jobs.
4. If preflight succeeds, dashboard creates an `ocr_batch_runs` record with `target_count = 100`, a generated batch id, and assigned pending jobs.
5. A third-party scheduler/queue triggers `/ocr-worker`, and the existing Pages Function drains that batch in small chunks, for example 1-5 OCR jobs per invocation.
6. Each invocation uses existing D1 provider cooldown/quota metadata to decide whether it can call a provider now, should wait, or should stop for the day. Provider rate-limit/quota errors pause the batch and return the active job to `pending`; they do not mark every remaining page as failed.
7. Dashboard polls batch progress and shows processed/succeeded/failed/needs-review/skipped counts.
8. The dashboard also runs one immediate scoped chunk after creating or retrying a scheduler batch, so the admin gets visible progress even before the delayed scheduler trigger arrives.

This gives the admin the intended UX without relying on a long browser tab, long Pages Function request, or uncontrolled sleep loop.

## What is needed

| Need | Why | Proposed implementation |
| --- | --- | --- |
| Batch-run state | A 100-job run needs progress, cancel/resume, and clear accounting. | Add `ocr_batch_runs` and optionally `ocr_batch_run_events` in D1. |
| Job leasing | Prevent two workers from processing the same OCR job if a scheduler fires twice. | Add/keep atomic claim updates with `status = pending -> running`, plus `locked_until` if we want crash recovery. |
| Rate-aware drain loop | Provider limits are not uniform. Some providers allow a few calls/minute, some are daily or monthly. | Keep current provider `cooldown_until`, short-window counters, and quota counters as the source of truth. |
| Scheduler or queue | A 100-job run should continue even if the admin closes the dashboard. | Use a third-party cron/queue provider to call `/ocr-worker` repeatedly until the batch is done. Do not add a new Cloudflare Cron or GitHub Actions scheduler for this OCR path. |
| Idempotent worker endpoint | Scheduler retries must be safe. | `/ocr-worker` should accept `batch_id`, process only claimable jobs, and return progress. |
| Admin UX | Admin needs to see why it pauses. | Dashboard should show `Menunggu rate limit`, `Kuota harian tercapai`, `Provider nonaktif`, or `Selesai`. |

## Recommended architecture

### Implemented phase - third-party scheduler, existing worker endpoint

Use the existing protected `/ocr-worker`, but change semantics from “one run drains 5 jobs” to “one batch run can target up to 100 jobs, drained across repeated third-party-triggered invocations.”

Implementation sketch:

- Added `ocr_batch_runs`:
  - `id`
  - `requested_by_user_id`
  - `target_count`
  - `processed_count`
  - `succeeded_count`
  - `failed_count`
  - `needs_review_count`
  - `skipped_count`
  - `status`: `queued`, `running`, `paused_rate_limit`, `paused_quota`, `completed`, `cancelled`, `failed`
  - `started_at`, `last_run_at`, `completed_at`, `updated_at`
  - `scheduler_trigger_status`, `scheduler_trigger_delay_seconds`, `scheduler_trigger_due_at`, `scheduler_last_triggered_at`
  - `last_message`
- Added optional `batch_id` to `ocr_jobs` so the dashboard-created batch owns a stable slice of work.
- Added dashboard action `start_ocr_batch_run` with `target_count` bounded to 100.
- `start_ocr_batch_run` runs automatic scheduler preflight before creating the batch; failed preflight blocks batch creation.
- `/ocr-worker` accepts `{ "preflight": true }` for scheduler checks and `{ "batch_id": "...", "limit": 5 }` for real batch drains.
- Third-party scheduler calls `/ocr-worker`; the worker exits quickly when no claimable batch job exists.
- Keep each worker invocation small. The “100 jobs” target is achieved by repeated safe invocations, not one long request.
- `/ocr-worker` no longer defaults to an internal 100-job cap. It computes the combined remaining quota of active providers with known limits, while still checking each provider's individual quota before assignment. Optional `OCR_WORKER_DAILY_CAP` is a safety cap only; if it is reached, the scoped batch is marked `paused_quota` with an actionable message. The dashboard shows combined used/remaining/reset state and per-provider quota detail so admins can tell whether combined quota, provider quota, or provider rate limit is blocking progress.
- When a provider returns a rate-limit/quota error such as OCR.Space `E553`, the runner marks the provider cooldown/exhausted state, moves the current job back to `pending`, releases other already-claimed but unprocessed jobs, sets the batch to `paused_rate_limit` or `paused_quota`, and stops scheduling the next trigger until an admin retries after cooldown or enables another provider.
- Provider quota exhaustion messages must tell admins the next action: activate another OCR provider to continue now, or wait until the exhausted provider resets.
- QStash trigger ETA is stored as structured batch data (`scheduler_trigger_due_at`, delay seconds, status, and last-trigger timestamp). The dashboard countdown uses these fields instead of parsing the human-readable `last_message`; message parsing remains only as a legacy fallback for old rows.

This is the lowest-risk path because it keeps the current D1 queue/cache/failover code and only adds batch orchestration plus encrypted scheduler credential storage.

### Provider integration direction

The OCR scheduler path intentionally avoids adding another Cloudflare Cron/Worker or GitHub Actions workflow because those are already used for other responsibilities. The current implementation supports third-party scheduler providers from `/dashboard`, with credential values encrypted by `OCR_KEY` before storage in D1.

Current provider behavior:

1. Upstash QStash: implemented as the recommended automatic queue/delay provider. `start_ocr_batch_run` first publishes a harmless QStash preflight message to `/ocr-worker`; only after that succeeds does it create the batch and publish the real QStash message. Each worker chunk schedules the next delayed message while the batch is still running. The dashboard should store `QSTASH_TOKEN`; if an admin pastes `Bearer ...`, the dispatch layer strips the prefix before calling QStash.
2. cron-job.org: configurable in dashboard as an external cron trigger provider. Use it to call `/ocr-worker` on a fixed cadence if a plain minutely cron is preferred.
3. Inngest and Trigger.dev: configurable as external workflow trigger providers for later deeper integration, without putting secrets in code or environment variables beyond `OCR_KEY`.

## Scheduler provider ranking

Sorted for this project: free/generous first, fits Cloudflare/D1 second, then operational complexity.

| Rank | Provider | Free/generous limit found | Fit for OCR 100-job drain | Recommendation |
| ---: | --- | --- | --- | --- |
| 1 | Upstash QStash | Free plan: 1,000 messages/day, 10 active schedules, max queue parallelism 2, max delay 7 days. | Strong fit for delayed delivery, queueing, and automatic retry. 100 OCR jobs/day is comfortably inside 1,000 messages/day if each worker call processes a few jobs. | Implemented as recommended automatic scheduler. |
| 2 | cron-job.org | Free service, jobs up to once per minute, custom HTTP method/headers/body, execution history, REST API. | Very good external trigger for `/ocr-worker`. It can POST with headers/body, so it fits `OCR_SECRET`. | Configurable in dashboard as external cron option. |
| 3 | Inngest | Hobby: 50k executions/month, 500k events/month, 5 concurrent executions, 100k queue depth. | Strong durable workflow product with throttling/retries, but needs SDK/app integration for full workflow ownership. | Configurable credential placeholder; deeper adapter can be added later. |
| 4 | Trigger.dev | Free: $5/month credits, 20 concurrent runs, unlimited tasks, 10 schedules. | Good durable background-task product with schedules and queues, but adds another runtime/integration layer. | Configurable credential placeholder; deeper adapter can be added later. |
| 5 | Google Cloud Scheduler | 3 jobs/month free per billing account; after that $0.10/job/month. | Reliable minutely HTTP trigger, but requires GCP project/billing and gives only scheduler, not queue semantics. | Not selected for this repo. |
| 6 | UptimeRobot | Free includes 5-minute intervals for monitoring. | Can ping HTTP endpoints, but it is a monitor, not a job orchestrator. POST/custom authenticated calls may require higher plan/features. | Not recommended for OCR execution; OK only as a heartbeat monitor. |
| 7 | Netlify Scheduled Functions | Available on all plans; scheduled functions have 30-second execution limit and cannot be invoked directly by URL. | Would require deploying a Netlify function just to trigger our Cloudflare endpoint. Not useful for this stack. | Not recommended. |
| 8 | Vercel Cron Jobs | Hobby supports 100 cron jobs but only once per day with per-hour timing precision; Pro supports once per minute. | Hobby free is too slow for interactive OCR batch drain. Pro is fine, but this project is not hosted on Vercel. | Not recommended for free-tier OCR drain. |

## Recommended choice

Use this order:

1. Upstash QStash for automatic delayed chunking from the dashboard.
2. cron-job.org if a plain minutely external cron is preferred.
3. Inngest or Trigger.dev only if OCR orchestration grows into a multi-step workflow that needs a managed workflow dashboard.
4. Avoid Vercel/Netlify for this because they add a second hosting platform for little benefit.

## Dashboard behavior after implementation

`Jalankan batch berikutnya` should become:

- Button label: `Jalankan 100`
- On click: run automatic scheduler preflight first. If preflight succeeds, create the server-side batch run and return immediately. If preflight fails, show the scheduler error and do not create a batch.
- Status panel:
  - `Batch berjalan: 17/100 diproses`
  - `Sukses 12 · Perlu cek 3 · Gagal 1 · Skip rate limit 1`
  - `Jeda rate limit` or `Jeda kuota` when provider limits are hit; pending jobs remain pending for retry.
  - `Lanjut otomatis oleh Upstash QStash` or `Menunggu trigger eksternal`
- Actions:
  - `Refresh`
  - `Retry` for a failed scheduler trigger after fixing scheduler credential/URL configuration
  - `Batalkan`
  - `Lanjutkan sekarang` for admin-triggered one-off drain

If no scheduler is configured, dashboard should say:

> Batch sudah dibuat, tapi worker otomatis belum aktif. Klik “Lanjutkan sekarang” untuk memproses chunk berikutnya, atau aktifkan scheduler.

## Why not one HTTP request with delay?

For 100 OCR images, a single request is fragile:

- The admin browser can close or lose connection.
- Pages/Workers request limits and provider latency can interrupt the run.
- Sleep loops hide progress and make cancellation hard.
- Retry after partial failure can duplicate provider calls unless every job is leased and persisted.

The persisted batch + repeated worker model is slower to build but safer, observable, resumable, and consistent with the current D1 OCR queue.

## Source links checked

- Cloudflare Workers limits and Cron Triggers: https://developers.cloudflare.com/workers/platform/limits/ and https://developers.cloudflare.com/workers/configuration/cron-triggers/
- GitHub Actions billing and scheduled workflows: https://docs.github.com/en/billing/concepts/product-billing/github-actions and https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- cron-job.org: https://cron-job.org/en/
- Upstash QStash pricing: https://upstash.com/pricing/qstash
- Inngest pricing: https://www.inngest.com/pricing
- Trigger.dev pricing: https://trigger.dev/pricing
- Google Cloud Scheduler pricing: https://cloud.google.com/scheduler/pricing
- UptimeRobot pricing: https://uptimerobot.com/pricing/
- Netlify Scheduled Functions: https://docs.netlify.com/build/functions/scheduled-functions/
- Vercel Cron Jobs usage/pricing: https://vercel.com/docs/cron-jobs/usage-and-pricing
