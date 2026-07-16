# Claim Transition Matrix

Last updated: 2026-07-17 00:28 (Asia/Jakarta)

## Scope
This matrix covers franchise listing claims written by `/form-submit` and reviewed in `/dashboard`.

| Scenario | Expected behavior | Current owner |
| --- | --- | --- |
| New claim for unclaimed listing | Create `franchise_claims.status = pending`; keep listing unclaimed until admin approval. | `functions/_form-submit-franchisor.js` |
| Duplicate pending claim from same user/listing | Return existing pending state or block duplicate creation with a clear message. Do not create multiple active claims for the same claimant/listing. | Form-submit claim guard |
| Duplicate claim from different user | Allow admin to review with evidence; do not auto-reassign owner. | Dashboard claim review |
| Approve pending claim | Set claim `approved`, attach `owner_user_id`/`franchisor_profile_id` when empty, move unclaimed listing to `free`, audit owner application, and enqueue static rebuild. | `functions/_dashboard-actions.js` |
| Listing already has owner when claim is approved | Preserve existing owner via `COALESCE`; approval records review outcome but must not overwrite another owner silently. Admin should inspect conflict before approval. | `functions/_dashboard-actions.js` |
| Reject pending claim | Set claim `rejected`, write review notes, keep listing owner/status unchanged, and do not enqueue rebuild unless public claim indicators are later added. | `functions/_dashboard-actions.js` |
| Reject after owner edited listing | Keep owner edits untouched. Claim rejection only affects the claim row. | Dashboard claim review |
| Publish queue coalescing after approval | Rebuild request is coalesced by site/listing/reason/entity while active; `site_publish_state.pending_count` is recalculated from queue rows. | `functions/_site-publish-queue.js` |
| Publish queue write failure | D1 batch should fail as one transaction-like unit for the action. Admin should retry after the API returns an error; no silent partial success should be shown. | Cloudflare D1 batch behavior |

## Done Conditions
- Every claim review writes actor, timestamp, review status, and audit event.
- Owner assignment never overwrites an existing owner without an explicit future conflict-resolution flow.
- Public-page-affecting approval enqueues a static rebuild through the shared queue helper.
- Duplicate and already-reviewed claims return clear conflict states.
