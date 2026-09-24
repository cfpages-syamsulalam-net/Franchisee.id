# Claim Transition Matrix

Last updated: 2026-09-24 (Asia/Jakarta)

> **Implementation gap found 24 September 2026:** `functions/_form-submit-franchisor.js` currently updates the unclaimed listing owner and inserts an `approved` claim at submit time. The expected `pending` then admin-review behavior below does not describe the current submit path. See [the owner-claim priority](../product/NEXT_STEPS.md) before using this matrix as an acceptance claim.

## Scope
This matrix covers franchise listing claims written by `/form-submit` and reviewed in `/dashboard`.

| Scenario | Expected behavior | Current owner |
| --- | --- | --- |
| New claim for unclaimed listing | Create `franchise_claims.status = pending`; keep listing unclaimed until admin approval. | `functions/_form-submit-franchisor.js` |
| Duplicate pending claim from same user/listing | Return existing pending state or block duplicate creation with a clear message. Do not create multiple active claims for the same claimant/listing. | Form-submit claim guard |
| Duplicate claim from different user | Return 409 while another claim is pending; admin must finish or reject first. Never auto-reassign owner. | Dashboard claim review |
| Approve pending claim | Set claim `approved`, attach `owner_user_id`/`franchisor_profile_id` when empty, move unclaimed listing to `free`, audit owner application, and enqueue static rebuild. | `functions/_dashboard-actions.js` |
| Listing already has owner when claim is approved | Return 409 and keep claim pending: existing owner must never be overwritten or the conflicting claim marked approved. | `functions/_dashboard-actions.js` |
| Reject pending claim | Set claim `rejected`, write review notes, keep listing owner/status unchanged, and do not enqueue rebuild unless public claim indicators are later added. | `functions/_dashboard-actions.js` |
| Reject after owner edited listing | Keep owner edits untouched. Claim rejection only affects the claim row. | Dashboard claim review |
| Publish queue coalescing after approval | Rebuild request is coalesced by site/listing/reason/entity while active; `site_publish_state.pending_count` is recalculated from queue rows. | `functions/_site-publish-queue.js` |
| Publish queue write failure | D1 batch should fail as one transaction-like unit for the action. Admin should retry after the API returns an error; no silent partial success should be shown. | Cloudflare D1 batch behavior |

## Done Conditions
- Every claim review writes actor, timestamp, review status, and audit event.
- Owner assignment never overwrites an existing owner without an explicit future conflict-resolution flow.
- Public-page-affecting approval enqueues a static rebuild through the shared queue helper.
- Duplicate and already-reviewed claims return clear conflict states.

## Verification standard

A submitted brand name, NIB, HAKI number, business email or uploaded marketing material is a **claim**, not independent proof. The admin checks the applicant's authority using a brand-controlled channel outside applicant-supplied details, records the source and result in review notes, and only then approves. A stranger can otherwise pass all required fields and divert customer inquiries or payments. The guard in migration `0035_guard_franchise_claims.sql` rejects racing/late approvals at the database boundary.
