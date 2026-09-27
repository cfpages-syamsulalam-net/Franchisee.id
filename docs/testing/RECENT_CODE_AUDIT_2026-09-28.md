# Franchisee.id recent-code audit — 2026-09-28

**Decision:** the new cross-site identity and account-deletion work needs failure-path fixes before the deletion journey is called production complete. This is a documentation-only review. No application code, D1 data, R2 object, provider setting, or deployment was changed.

## Scope and architecture checked

- Reviewed `d4cf04f22f99388e534c5b19a6f5694485dde796..474a768bda4131c7662e85de1a1c20193e30c3d6` on `main`, matching `origin/main` at review time. Deterministic `ocr delegate preview` selected 27 reviewable code/config files; a read-only Luna reviewer traced all 27 and resolved the OCR rules. The three Markdown exclusions (`CHANGELOG.md`, `CODEBASE.md`, and `docs/architecture/CLERK_SETUP.md`) were read manually for relevant claims.
- Franchisee owns shared D1 migrations 0040–0045. Both sites use one `users` row through separate Clerk applications and `user_identities`; verified email is the cross-app link. `users.clerk_user_id` remains the home identity. This site uses `/peluang-usaha/` for its directory and `/peluang-usaha/{slug}` for brand details. Franchisor's directory remains `/peluang-usaha/`, while its detail uses `/usaha/{slug}`.
- `auth:status:check`, `resolver:parity:check`, and `auth:check` passed locally. They cover successful identity, block, and erasure paths, but not the injected failures below. A local check does not prove static pages already deployed to Cloudflare have been retired.

## E1 — Account erasure hides D1 publications without rebuilding either site (high; release blocker)

**Evidence.** [`eraseAccount`](../../functions/_account-erasure.js) at lines 209–278 hides all publication rows for a proven owned brand and archives the brand. It never uses the existing [`siteRebuildStatements` helper](../../functions/_site-publish-queue.js) to enqueue `site_rebuild_requests`. The caller [`deleteAccount`](../../functions/_profile-account.js) likewise returns after erasure without cross-site rebuild requests. The settings screen promises removal across the network. D1 publication state alone does not remove a previously deployed static detail page or directory card.

The Franchisor companion audit adds a second route-specific problem: its retained legacy HTML copy can recreate `/usaha/{slug}` after a later build even when the D1-generated detail is omitted. Both paths must be fixed together; adding a Franchisee-only queue leaves the sibling URL public.

**Fix handoff.** Put rebuild requests for every affected `site_id` in the same D1 batch as hiding its publication. Include Franchisee and Franchisor wherever they were published. Ensure the Franchisor build suppresses removed legacy brand detail. Retain the pre-removal publication snapshot needed for admin restoration. Define what an old detail URL returns after removal and apply the same rule to directory, sitemap, canonical, and detail output.

**Acceptance.** Seed a proven owner with a published brand on both sites, request erasure, assert queued requests for each site, consume each queue, deploy the resulting builds, and verify both detail URLs and cards no longer expose the brand. Include a Franchisor slug that collides with a retained legacy page. Test restoration separately. Record live HTTP results, not just D1 row values.

## E2 — A failed D1 erasure batch leaves the person blocked with no self-service recovery (high)

**Evidence.** [`deleteAccount`](../../functions/_profile-account.js) at lines 48–69 commits `blockAccount` and a status event before calling `eraseAccount`. Erasure then executes a separate multi-table D1 batch. If that batch fails, the handler returns an error while the block remains. The [`/profile-data` route](../../functions/profile-data.js) requires an authenticated D1 user before dispatch, and [`_clerk-auth.js`](../../functions/_clerk-auth.js) rejects that blocked user, so the person cannot retry the erasure through the same screen. The successful-path test does not inject a batch failure. This is especially important because the workflow promises deletion of personal data, and earlier schema constraints have already caused an erasure batch to abort.

**Fix handoff.** Use an explicit, durable deletion state with an authorized server-side retry/reconciliation path, or commit the D1 block and erasure in a single atomic batch. Keep the fail-closed access guarantee, but make incomplete erasure visible to operators and retryable without asking a blocked user to sign in. R2 cleanup needs its own post-commit recovery path (E5). Do not report `erased: true` until the D1 erasure commits.

**Acceptance.** Force a D1 statement in the erasure batch to fail after the request starts. Verify either the block and erasure both roll back or an operator/worker can resume an explicitly pending erasure to completion. Confirm identity, profile, contact, ownership, publication, and status rows reach the intended terminal state; retrying must be safe and must not restore sign-in access.

## E3 — Email changes can succeed in Clerk and then fail D1 uniqueness (high)

**Evidence.** [`updateAccount`](../../functions/_profile-account.js) at lines 103–113 updates Clerk name/email before its D1 update at lines 128–177. [`0044_unique_user_email.sql`](../../migrations/0044_unique_user_email.sql) makes normalized `users.primary_email` unique across both sites. Separate Clerk applications can each accept an address that D1 already assigns to another user in the sibling application. Clerk then holds the new email while D1 rejects it, leaving the same person with conflicting identity state; a later resolver/webhook may encounter the same unique-index failure. A generic server error does not explain the collision to the user.

**Fix handoff.** Check normalized D1 email ownership before mutating Clerk and return a clear conflict result for an address already linked to another person. Treat the unique index as the final race guard, and design compensation/reconciliation if Clerk succeeds but D1 rejects because another request won the race. Preserve verification requirements: a newly entered unverified address must not become a cross-app identity link or inherit another user's roles and brands.

**Acceptance.** Have two D1 users in different Clerk applications; attempt to change one to the other's email. Assert no lasting Clerk/D1 mismatch and no account takeover. Inject a race between the pre-check and final D1 write, and verify compensation plus actionable response. Test ordinary same-user email change and verified-email linking still work.

## E4 — Block-status query errors permit sign-in (high; shared resolver)

**Evidence.** [`assertEmailNotBlocked`](../../functions/_clerk-auth.js) at lines 365–388 catches errors in both `user_blocks` lookups and substitutes `null`. With `USER_BLOCK_SALT` missing, an unreadable `user_blocks` table looks empty. With the salt present, a failed hash lookup looks like an unblocked address. [`upsertD1User`](../../functions/_clerk-auth.js) calls this guard before linking/creating a user. A transient D1 error or unapplied migration can therefore make a blocked address pass this specific gate. The Franchisor resolver is a hand-maintained copy; `resolver:parity:check` passed, so this defect should be fixed in both repositories.

**Fix handoff.** Make failure to determine block status a 503 and stop the identity transaction. If an old-schema compatibility path is still required, distinguish a specific missing-table condition and decide explicitly whether account creation can proceed; never treat an arbitrary query failure as “no block.” Confirm the `USER_BLOCK_SALT` required/optional production policy in both sites and preserve the salt across rotations while active tombstones exist.

**Acceptance.** Inject rejection of each block lookup, with and without a configured salt. Assert no user insert, identity link, or successful authenticated response. A genuinely empty `user_blocks` table should still permit normal sign-in. A blocked address remains refused on both domains.

## E5 — Failed R2 deletion loses the only retry information (medium; privacy)

**Evidence.** [`eraseAccount`](../../functions/_account-erasure.js) at lines 179–190 reads R2 keys before its D1 batch deletes the asset rows. At lines 280–290 it catches every bucket-delete error and continues. The return/log records only a count of successful deletions; after the request ends, failed object keys have no durable row or retry job. The settings screen says media will be removed. R2 failure can thus leave private media stored indefinitely even though the API reports full erasure.

**Fix handoff.** Persist exact cleanup keys in a durable outbox before dropping their ownership rows, process after D1 commit, and retain failures until acknowledged or retried. Keep the public page hidden while cleanup proceeds. Report incomplete cleanup separately from the completed D1 erasure; avoid logging sensitive keys to public/client output.

**Acceptance.** Make one bucket delete throw. Verify the key remains in durable retry state after the HTTP request, then retry and confirm the object is removed and the retry state closes. Confirm one failed object does not prevent the other keys from being deleted.

## E6 — Membership remains Premium after self-erasure (medium; policy and accounting)

**Evidence.** [`erasurePlan`](../../functions/_account-erasure.js) clears actor pointers on retained business records, but no terminal membership event is appended and active subscription status is unchanged. [`getCurrentMembership`](../../functions/_clerk-auth.js) reads the newest membership event; a deleted paid user can therefore still be represented as Premium. The deletion UI says access ends, while billing history is intentionally retained. The current auth-status test checks preservation of membership rows, not the effective post-erasure state.

**Fix handoff.** Record the product policy for paid time remaining, renewal, refund, and account restoration. Separate immutable billing history from current access. Once the policy is chosen, make the terminal access/membership state part of the same retry-safe deletion transition and stop future Premium effects (including publication or mail) for the deleted account. Do not delete financial records to make the display look right.

**Acceptance.** Erase an owner with a live paid subscription; assert sign-in is blocked, current entitlement and publication match the chosen policy, billing/subscription history survives, and expiry workers do not resurrect access. Test the final paid-subscription expiry separately.

## E7 — Repository guidance is internally stale (documentation)

[`CODEBASE.md`](../../CODEBASE.md) lines 457–459 still says delete-and-block and its settings UI remain to be built, while lines 472–477 describe `erasure_pending: true` and claim erasure does not yet exist. The same document later describes the implemented erasure. This can cause another AI to duplicate or bypass shipped behavior. [`CLERK_SETUP.md`](../architecture/CLERK_SETUP.md) correctly describes the two-app link but its older surrounding setup text and `USER_BLOCK_SALT` policy should be reconciled with E4. The Franchisor `CODEBASE.md`, manual checklist, and provider record also retain satellite-era instructions. Update those operational documents after fixing the code paths and label historical rollout records by date.

## Review inventory and validation limits

All 27 OCR-selected files were traced: account/auth modules and UI, Premium lifecycle, migrations 0040–0045, schemas and profile route, new deletion page, directory/detail templates, and local auth/parity checks. The delegated report is preserved as a hashed terminal receipt in the local agent receipts directory. `pnpm run auth:status:check`, `resolver:parity:check`, and `auth:check` passed; no failure injection for E1–E6 was present in those checks. No production D1, R2, Clerk, or Cloudflare mutation was performed.

**Recommended sequence:** close E4 and E3 before allowing new identity/email transitions; make E2 and E5 retry safe; close E1 in both publishers and verify the deployed URLs; settle E6 as an explicit product policy; then reconcile E7 and obtain an independent review of the fix commits. The Franchisor companion audit also identifies an independent Premium expiry lookup failure that can wrongly downgrade a user.
