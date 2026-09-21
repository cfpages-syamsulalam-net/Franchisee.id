# Final hardening review — accept

Bound dispatch: `C:\Users\THINKPAD\Franchisee.id\.context\hardening-review-final-dispatch.json` SHA-256 `c45739d17a6085374315df31a57283acfa15e7623bb33930cdd625edf754521e`. All frozen target hashes in `hardening-review-final-hashes.json` matched after verification. No frozen target was edited; no Astro build, remote operation, commit, or push was run.

## Acceptance evidence

- **OAuth identity and persistence:** `pnpm run google-contacts:check` passed. The behavioral fixture now executes the connection upsert, asserts persisted `google_sub`, decrypts the reused same-account refresh token, verifies a fresh account switch with a new refresh token, rejects account switching without a fresh refresh token without overwriting the old connection, rejects revoked connections and missing userinfo identity, and covers expired/denied/nonstaff callbacks, replay, and concurrent callbacks with exactly one connection write.
- **Public privacy boundary:** `pnpm exec tsx scripts/check-public-franchise-privacy.ts` passed. Anonymous `FRANCHISEE` requests using both D1 and Sheets sources return 403/no-store before either backend is touched; public `UNCLAIMED` claim search remains 200.
- **Static export and stale generated data:** `pnpm exec node scripts/check-static-export.mjs` passed. Private generated snapshots and dotfiles are excluded, stale private output is removed from an existing `dist`, and the legacy shell stylesheet is retained.
- **Mobile and desktop navigation:** `pnpm exec node C:\Users\THINKPAD\temp\franchisee-browser-audit\menu-check.cjs` passed against the live-built local UI with the current CSS. At 390px the toggle is right-aligned at x=332.8125, the expanded menu is x=15 / width=360 / height=134, and document scroll width remains 390; the 1440px desktop check also passed.
- **404 recovery:** `src/pages/404.astro` presents a clear directory and home recovery path; no stale export or route-404 blocker was found in the focused checks.

## Verdict

**ACCEPT.** The two blockers from the prior review are resolved with executable evidence, and the frozen implementation inputs remain byte-identical.
