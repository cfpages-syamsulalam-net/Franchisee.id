# Production source audit

Date: 2026-09-21 (Asia/Jakarta)

Dispatch: `production-source-audit-dispatch.json` (SHA256 `2da348ec8d2e5d4a4cbe3ed0a371f58ebc7a6e1b61e3ea42fea6b94a11564e39`)

Requested/verified lane: `gpt-5.6-luna`, medium effort, default tier. This is a read-only source audit; no repository implementation files were changed.

## Markdown coverage

I read every tracked project Markdown file from `git ls-files -- '*.md'`, including repository governance, architecture, UX, form, dashboard, and session-context documents. Coverage: 188 files, 1,671,376 UTF-8 bytes, 18,793 lines. The path-manifest digest (newline-joined tracked paths, UTF-8 SHA256) is `6920fda624cea78dee170007e6abcda5b0c3b7a24ea1c66180cb1e1d7025c9d2`. `node_modules` Markdown was excluded because it is not tracked project documentation.

## Findings

### P0 — public endpoint exposes franchisee applicant PII and enables shared caching

Evidence: `functions/get-franchises.js:4-5` defines an unauthenticated `GET` handler. The query schema permits `tab=FRANCHISEE` (`functions/_shared-schemas.js:8,115,171-177`). The D1 branch selects `SELECT * FROM franchisee_profiles` (`functions/get-franchises.js:146-150`) and `mapD1FranchiseeProfileRow` returns `email`, `whatsapp`, `location_plan`, and the free-text `message` (`functions/get-franchises.js:202-219`). The response explicitly sets `Cache-Control: public, max-age=3600` and `Access-Control-Allow-Origin: *` (`functions/get-franchises.js:32-48`).

Reproduction: request `GET /get-franchises?tab=FRANCHISEE&source=d1` without an Authorization header. Any returned row includes the applicant contact fields and message, and an intermediary/shared cache is permitted to retain the response for one hour. `q` also searches email and WhatsApp (`functions/get-franchises.js:136-143`), making targeted discovery straightforward.

Impact: applicant contact details and private intent/location notes become public API data and may persist in caches. This conflicts with the repository’s protected-form and D1 authorization rules in `AGENTS.md`/`CODEBASE.md`.

Recommended fix: remove the public `FRANCHISEE` export path or require staff authorization before querying it; project only the minimum fields needed by the authorized consumer; use `Cache-Control: no-store` for any applicant response. Add one focused request-level regression proving anonymous `FRANCHISEE` access is denied and that no response contains email, WhatsApp, location plan, or message.

Verification status: source-confirmed; production exposure still needs parent’s live request check.

### P1 — Google Contacts account switch can preserve the previous account’s refresh token

Evidence: OAuth callback loads the existing connection for the D1 user (`functions/_google-contacts-oauth.js:87-88`), then accepts the newly exchanged access token and userinfo identity. It sets `refreshToken = token.refresh_token || ""` and, when Google omits a new refresh token, reuses `current?.refresh_token_encrypted` (`functions/_google-contacts-oauth.js:90-94`). The subsequent upsert writes the new `userinfo.sub`/`userinfo.email` together with that possibly old refresh token (`functions/_google-contacts-oauth.js:99-124`).

Reproduction: connect Google account A, then reconnect through consent as account B when Google returns an access token without a new refresh token (normal for some re-consent flows). The row records B’s `google_sub`/email and B’s access token but retains A’s encrypted refresh token. After B’s access token expires, `getStaffGoogleContactsAccessToken` refreshes A’s token (`functions/_google-contacts-oauth.js:210-228`), so later contact writes can silently target A while the dashboard labels the connection as B.

Impact: contacts can be written to the wrong staff member’s Google account, a privacy and data-integrity failure. The existing reconnect fallback is safe only when the Google identity is unchanged.

Recommended fix: compare the existing stored `google_sub` with the new `userinfo.sub`. If the identity changes, require a new refresh token and refuse the upsert when it is absent; if identity is unchanged, retaining the old refresh token is acceptable. Add a focused unit/integration check for same-account token rotation and account-switch-without-refresh-token.

Verification status: source-confirmed; provider-specific callback behavior should be validated with a test token fixture.

### P2 — OAuth callback does not re-check staff authorization before persisting the connection

Evidence: `google-contacts-start.js:5-10` requires `requiredRole: "staff"`, but `google-contacts-callback.js:3-10` calls `completeGoogleContactsAuthorization` without a Clerk session, and the callback only validates the stored state row, expiry, and unconsumed status (`_google-contacts-oauth.js:59-79`). It then persists the connection and audit event (`_google-contacts-oauth.js:99-129`).

Impact: a staff role revoked after authorization starts can still complete the pending OAuth state and retain a Google Contacts connection. This is a smaller window than the P0/P1 issues, but the callback should enforce the same authorization lifecycle or invalidate outstanding states on role removal.

Recommended fix: bind the pending state to a short-lived authenticated browser/session proof that the callback can validate, or invalidate pending states when staff authorization is revoked and re-check the user’s current role through a server-side callback-safe mechanism. Add an expiry/revocation regression.

Verification status: source-confirmed; severity depends on operational role-revocation expectations.

## Decision packet

- Requested model/effort/tier: `gpt-5.6-luna` / medium / default.
- Exact question: inspect all tracked repository Markdown, then source-audit authentication, Google Contacts, public export security paths, and key UI paths for concrete production defects.
- Source boundary: repository `C:\Users\THINKPAD\Franchisee.id`, its tracked Markdown, dispatch-owned source files, and the installed `franchisee-ui-ux-audit` skill. No cloud/API mutation or live production browser work was performed.
- Recommended decision: treat the public franchisee profile export as an immediate production blocker; fix the Google account-switch token invariant before relying on reconnect; schedule callback authorization hardening with the same OAuth work.
- Contradictions/caveats: repository documentation describes protected form submission and D1 authorization, while `get-franchises` exposes the `FRANCHISEE` branch without auth. The report does not claim the endpoint is currently indexed or cached by a specific CDN; the response headers demonstrably permit that behavior. Confidence: high for source behavior, medium for live exposure until parent verifies the deployed route.
- Authority still required: parent/coordinator decides implementation and any production deployment or live verification.
