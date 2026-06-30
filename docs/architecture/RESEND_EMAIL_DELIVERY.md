# Resend Email Delivery

Last updated: 2026-06-30 10:24 (Asia/Jakarta)

## Purpose
This document records how Franchisee.id sends operational Premium emails through Resend from Cloudflare Pages Functions.

## Current Implementation
- Queued emails are stored in D1 table `notification_email_queue`.
- `/premium-email-worker` is a protected Pages Function that processes due rows.
- `.github/workflows/premium-email-worker.yaml` calls the worker every 30 minutes and can be run manually.
- `functions/_premium-email-worker.js` sends through Resend's HTTP API using the Cloudflare Pages secret `RESEND_API_KEY`.
- The code does not hardcode the API key. Do not paste `re_...` keys into repository files.

## Required Secrets
Cloudflare Pages production secrets:
- `RESEND_API_KEY`
- `PREMIUM_EMAIL_WORKER_SECRET`
- `PREMIUM_EMAIL_FROM`
- Optional: `PREMIUM_EMAIL_REPLY_TO`

GitHub Actions secret:
- `PREMIUM_EMAIL_WORKER_SECRET`

Optional GitHub Actions variable:
- `FRANCHISEE_SITE_URL=https://franchisee.id`

## Sender
`PREMIUM_EMAIL_FROM` must use a sender/domain verified in Resend, for example:

```text
Franchisee.id <premium@franchisee.id>
```

## Queue Fields
- `body_text`: plain-text fallback and required content.
- `body_html`: optional HTML body used when present.
- `provider`: currently `resend`.
- `provider_message_id`: Resend message id when send succeeds.
- `attempt_count`, `next_attempt_at`, and `last_error`: retry state.

## Worker Behavior
Each run:
1. Processes Premium lifecycle jobs: annual reports, grace-period emails, and expired Premium downgrade after grace.
2. Queues renewal reminders.
3. Sends due queued emails when `RESEND_API_KEY` is configured.
4. Marks sent rows as `sent`.
5. Marks failed rows as `failed` with retry backoff.

## Latest Production Check
GitHub Actions successfully reached the worker after secrets/domain setup. The latest reported summary was:

```json
{"success":true,"summary":{"delivery_configured":true,"expired_subscriptions":0,"grace_emails_queued":0,"annual_reports_queued":0,"renewal_reminders_queued":0,"attempted":0,"sent":0,"failed":0,"skipped":0}}
```

This confirms the scheduled worker can authenticate and see delivery configuration. The zero send count is expected when no queued email is due.

## Admin Recovery
Dashboard Premium Operations shows recent queued email rows. Admin can:
- Retry failed/cancelled email rows.
- Cancel pending/failed email rows.

## References
- Resend send email API: https://resend.com/docs/api-reference/emails/send-email
- Resend Cloudflare Workers guide: https://resend.com/docs/send-with-cloudflare-workers
- Resend pricing: https://resend.com/pricing
