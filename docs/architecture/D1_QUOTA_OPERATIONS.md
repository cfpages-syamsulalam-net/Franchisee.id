# D1 quotas and maintenance budget

Verified 2026-09-21 against Cloudflare's official pricing documentation and the local incident evidence. Read before production D1 diagnostics or maintenance.

| Limit | Workers Free | Scope/reset |
|---|---|---|
| Rows read | 5,000,000 per day | Account-wide; 00:00 UTC (07:00 WIB) |
| Rows written | 100,000 per day | Account-wide; same reset |
| Total storage | 5 GB | Across account databases; not a daily allowance |
| Individual database | 500 MB | Observed incident ceiling; separate from total storage |

Sources: https://developers.cloudflare.com/d1/platform/pricing/ and https://developers.cloudflare.com/d1/platform/limits/ . Pricing source retrieved from Cloudflare's official cloudflare-docs repository when the rendered page returned 403.

## What consumes the budget

Rows read means rows scanned, not rows returned. COUNT, MIN/MAX, GROUP BY, filtered queries without suitable indexes, cleanup selection, and index creation can consume substantial reads. INSERT, UPDATE and DELETE consume writes; indexed writes add index work. Dashboard/Wrangler/API maintenance also counts. Deleting data releases storage, not today's used read/write allowance. Repeated retries after a daily-limit error cannot restore service.

## 2026-09-21 incident and responsibility

An inbound Clerk webhook wrote metadata back to Clerk, emitting another user.updated webhook. The resulting operational telemetry accumulated 1,424,476 rows and the database reached 500,154,368 bytes. The inbound write-back was removed and deployed in commit 108d201. Old telemetry was deleted; measured storage afterward was 6,279,168 bytes.

The assistant's diagnostic scans and cleanup also consumed quota. The successful operation-event COUNT and MIN/MAX each reported 1,424,476 rows read; the grouped event summary reported 1,424,481. These three queries alone total 4,273,433 reads, before other inspections and deletes. A successful 50,000-row cleanup batch reported 200,000 reads and 50,000 writes. Small batches avoided CPU timeouts but did not make the total operation quota-safe. The later free-tier row-read error means storage recovery was not end-to-end login recovery. Exact account-wide daily attribution has not been fetched; do not invent it or assume other network databases are idle.

## Deployed protections and remaining risks

- Inbound webhook no longer calls syncClerkMetadataFromD1. The auth check rejects reintroducing that direct feedback loop.
- Migration 0034 indexes created_at and expires up to 100 telemetry rows older than 30 days per insert. Verified locally and remotely. This bounds expiry work but is not a daily quota cap and does not prevent a same-day event flood.
- Database insert/delete probe succeeded immediately after cleanup, before the subsequent quota error. Actual signed-in login is not yet confirmed.
- Remaining: webhook replay deduplication, unchanged-metadata write suppression, duplicate auth-sync requests, dashboard aggregate query plans, worker/poller usage, and other databases sharing the account should be reviewed before claiming free-tier readiness. These are not completed protections.

## Operating procedure

1. Start with repository quota notes and provider usage metrics, not table scans. Check account-wide remaining read/write budget in Cloudflare Metrics/Row Metrics; do not use D1 SQL just to estimate every table's size.
2. For an indexed bounded query, inspect the local query plan first. Establish a maintenance budget that reserves service capacity; inspect one bounded production result's rows_read/rows_written before authorizing a larger run. Count deletion and index work as well as reads.
3. If the projected work exceeds the remaining allowance, defer or discuss a paid-plan change with Syamsul. Never change billing automatically. Do not repeatedly run broad DELETEs after timeout/429 errors; first determine the actual error and execution outcome.
4. For this account's current daily-limit incident, wait for 00:00 UTC / 07:00 WIB or obtain explicit approval for a plan change. Avoid rebuilds/backfills/repeated login attempts while exhausted. After reset, test one login and inspect provider metrics before resuming optional jobs.
5. There is no guarantee that a free plan cannot be exhausted by traffic, retries, maintenance, or another project. Set usage alerts where available and choose a production plan based on measured demand, with explicit billing approval.
