# Franchisee.id latest-diff re-audit — 2026-09-28

**Scope.** This review follows [the earlier audit](RECENT_CODE_AUDIT_2026-09-28.md). The application diff is `95388761c478f20cef098c2cc2061dd4dd760a1c..197a26e2158202994049d27a6ffd43433c0ac9b4` (13 OCR-selected code/config files plus `CODEBASE.md` read manually). Two subsequent documentation-only commits, `127ae47` and `e80f5c4`, added Clerk email DNS and inbound-routing notes; they did not alter the reviewed application code. The review uses deterministic OCR file/rule selection and a read-only delegated source trace. No OCR-managed model or TokenHarbor call was made. The delegated runtime model identity was not independently attested. Repository and production state must be rechecked before applying fixes.

**Decision.** E2 and E4 from the earlier audit are fixed in local code. E1 still needs deployed URL proof; E3, E5 and E6 are partial. The findings below prevent calling account deletion and the two-app identity transition production complete. Code, database, provider settings and deployment were not changed in this audit.

## F1 — R2 cleanup can acknowledge the wrong bucket (high)

`functions/profile-upload.js:108` and `functions/premium-receipt-upload.js:81` save the Pages **binding label** `FRANCHISE_ASSETS` in `franchise_assets.r2_bucket`. `functions/_account-erasure.js` copies that value to the new outbox. `scripts/asset-cleanup-drain.mjs:95` prefers the row value over `ASSET_BUCKET=franchise-assets`, then sends it as the physical bucket name to [Cloudflare's Delete Object route](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/delete/). Its `deleteObject` path treats any HTTP 404 as an already absent object and marks the outbox row `done`. The API route documents a bucket-name path parameter; it does not justify treating every 404 as object absence. A wrong-bucket response can therefore close the only retry record while the real object remains.

**Repair:** map the historical binding label to the physical bucket name at the consumer boundary (or migrate and validate stored names), reject unknown buckets, and acknowledge absence only when the response proves that condition. Preserve retry state and a bounded operational alert for other 404s. **Acceptance:** seed an outbox row containing `FRANCHISE_ASSETS` and an object in `franchise-assets`; exercise the HTTP consumer and verify the actual object disappears. Inject bucket-not-found and object-not-found responses separately; only proven object absence may become `done`. Run against both repositories' byte-identical consumer copies.

## F2 — A second Clerk email can re-enter after erasure (high; live reachability conditional)

`functions/_profile-account.js:175-176` updates the current app's Clerk identity, then writes its email to the shared D1 user. The sibling app's Clerk identity remains unchanged. On a later sign-in, `functions/_clerk-auth.js:630-638` can overwrite `users.primary_email` with that sibling email. Erasure blocks the one selected email and deletes `user_identities` (`_profile-account.js:80-89`; `_account-erasure.js:183-185,294-302`). The other verified address has no email tombstone and may create a fresh D1 account on the sibling app. The current check proves same-email re-entry is blocked, not this two-address sequence. Production reachability depends on completing Franchisor's separate-app rollout step 0.12; do not claim it is already live.

**Repair:** establish a stable cross-app person block or collect and atomically block every verified email bound to the person before identity links are removed. Define how an email changed in one Clerk app reconciles with the sibling before its next login. **Acceptance:** use two Clerk IDs with distinct verified addresses linked to one D1 user; run deletion from each site in separate cases, then prove neither address can create or link a new D1 account. Include the sequence where sibling sign-in changes `primary_email` before deletion. Do not rely on the new `CLERK_SETUP.md` statement that a person-bound hash exists without proving the resolver checks it after identity rows are gone.

## F3 — Erasure commits before terminal membership and status events (high)

`_profile-account.js:116-121` commits the block, consent and D1 erasure batch. Its `free` membership event (`:127-132`) and blocked-status event (`:138-145`) are separate later writes. Failure in either makes the handler return an error after deletion; the blocked person cannot retry and effective Premium can remain in the event timeline. The happy-path test at `scripts/check-auth-status.ts:544-591` does not exercise either failure.

**Repair:** put required terminal events in the erasure batch, or persist an explicit incomplete state that a retry worker reconciles exactly once. **Acceptance:** inject a failure in each event write and show either the entire erasure rolls back, or an operator/worker finishes the terminal events without re-enabling access. Check the effective membership read, not just row presence.

## F4 — Consent proof is accepted without structural or version checks (high)

`_profile-schemas.js:102-114` accepts arbitrary nonempty contract/acknowledgement versions and a 1–8,000-character signature payload declaring `path/v1`, WebP or PNG; point count is optional. `_profile-account.js:48-62` checks presence, then stores it with an irreversible deletion. An authenticated direct request can supply meaningless signature evidence or a fabricated contract version. The browser's `path/v1` writer flattens separate pen strokes (`js/settings-delete-account.js:95,116-174`); the renderer connects consecutive points (`scripts/render-signature.mjs:57-64,96-139`), so the displayed signature can differ from what was drawn. The renderer also accepts dimensions up to 32,767 and allocates width × height × 4 bytes (`:47-73`), allowing an oversized input to exhaust memory.

**Repair:** validate the payload by declared format and limit decoded bytes, geometry, total pixels and point count before any destructive statement. Bind the server to accepted current contract/acknowledgement versions; retain a versioned path format that records stroke boundaries or preserve the drawn raster. **Acceptance:** malformed base64, empty or oversized geometry, point-count mismatch, wrong version and a multi-stroke signature fail or render exactly as specified; valid current-version signatures pass. Add a renderer memory-bound check.

## F5 — Email compensation covers only recognized uniqueness failures (medium)

`_profile-account.js:175-292` mutates Clerk before the D1 batch. It prechecks D1 email ownership and attempts rollback for a recognized unique-index failure. A generic D1 outage or rollback failure can still leave Clerk and D1 divergent; the 409 response is not a durable reconciliation record. Current tests cover the preflight conflict (`check-auth-status.ts:836-871`), not a race or post-Clerk D1 failure.

**Repair:** make the pending transition observable/retryable, compensate every failed D1 commit when safe, and record operator reconciliation if compensation itself fails. **Acceptance:** inject a competing D1 write between precheck and commit, a generic D1 failure, and a Clerk rollback failure; verify final identity resolution or an explicit recoverable state in each case.

## F6 — Cleanup-pending result is missing from response and operations evidence (medium)

`_account-erasure.js:363` computes `cleanupPending`, but `_profile-account.js:154-170` logs only `objects_deleted` and returns `success`, `blocked`, `erased` and a completed-sounding message. `CODEBASE.md:474-481` says the response contains `cleanupPending`, while `js/settings-delete-account.js:249-258` only displays the message and the deletion page says media is deleted. The durable outbox helps only if incomplete work stays visible.

**Repair:** propagate pending count/status to the response and private operational audit or status surface; use accurate user copy without leaking object keys. Correct `CODEBASE.md` after the contract changes. **Acceptance:** force R2 deletion failure; prove D1 erasure succeeds, the outbox remains pending, and the UI/operator evidence states that media cleanup is pending until drain completion.

## Disposition of earlier audit

| Earlier item | Current code evidence and remaining gate |
| --- | --- |
| E1, missing static rebuild | Partly fixed: `_account-erasure.js:228-277` now queues affected site IDs within the erasure batch. Neither a Franchisor legacy suppression build nor both deployed URLs/cards was proven; keep E1 open for deployed acceptance. |
| E2, pre-committed block stranded user | Fixed locally: block and consent statements now join the erasure batch (`_profile-account.js:80-121`, `_account-erasure.js:331-335`); injected D1-batch failure test passes. F3 is a separate later-write gap. |
| E3, Clerk/D1 email conflict | Partly fixed by precheck and unique-error compensation; F5 and the sibling-email F2 remain. |
| E4, block lookup failed open | Fixed locally: `_clerk-auth.js:370-430` returns unavailable/503 on lookup errors; salted and unsalted failure tests pass. |
| E5, R2 failure lost retry key | Partly fixed by migration 0046 outbox and scheduled drain. F1 can falsely mark a key done; actual REST consumer behavior is untested. |
| E6, erased user retained Premium | Partly fixed on the happy path; F3 can leave the effective timeline Premium after a post-commit failure. |
| E7, stale deletion prose | The top of `CODEBASE.md` now labels older text historical. F6 identifies a new response-contract mismatch. |

## Evidence and release checks

`pnpm run auth:status:check` passed on the reviewed application commit. Migrations 0046–0047 exist locally; application to remote D1 was not verified. No production D1/R2/Clerk mutation, Pages build, deployment or live deletion test was run. The two later email-routing documentation commits record DNS/rule observations, but explicitly do not prove Clerk email delivery; no application finding here depends on them.

Suggested order for the next AI: repair F1 and F3 before presenting deletion as complete; settle F2 and F4 before enabling the separate-app account-deletion journey; then close F5/F6 and test failure recovery. Re-run the relevant local gates and obtain independent review before production acceptance. Verify both public directory/detail families: Franchisee uses `/peluang-usaha/` for directory and detail; Franchisor uses `/peluang-usaha/` for directory and `/usaha/{slug}` for detail.
