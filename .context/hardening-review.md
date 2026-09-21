# Hardening review — reject

Bound dispatch: `C:\Users\THINKPAD\Franchisee.id\.context\hardening-review-dispatch.json` SHA-256 `64a846f670c37b2e47c5f115e7a0441d96f72931ed2f62bab49c555a4808e1bf`. Frozen target hashes matched at review start; no frozen target was edited. No Astro build, remote operation, commit, or push was run.

## Blockers

1. **P0 — The OAuth regression check does not prove the security-critical persistence and refresh-subject paths.** `scripts/check-google-contacts.ts` implements `MockDb.batch()` as a no-op. A successful callback therefore proves only its redirect, not that the connection upsert writes the userinfo `sub`, clears/replaces tokens as intended, or remains subject-bound. Its claimed same-account case supplies a fresh `refresh_token` and sets `refresh_token_encrypted: null`, so it never executes the reuse/decrypt branch; the fresh-account case is absent. The account-switch and active-nonstaff redirect cases are useful, and replay is exercised, but they do not cover the required persisted-state guarantee. Make the mock execute/persist the connection upsert (or use a small focused fake with observable bound values), then cover: initial connection with returned refresh token, same `google_sub` with no returned refresh token reusing the existing encrypted refresh token, different `google_sub` with no returned token failing without overwriting the stored connection, and a revoked/nonstaff role failing before token exchange. Assert the stored `google_sub`, encrypted refresh outcome, state consumption, and no connection mutation on forbidden/replay paths.

2. **P1 — Mobile header navigation is misplaced.** `css/legacy-shell.css` constrains `.elementor-element-66d02b6` with `max-width: calc(100% - 120px)` and then only removes that constraint below 640px. The captured 390px preview has no horizontal overflow, but the hamburger sits around x=129 beside the logo instead of the right edge around x=305. This breaks the primary mobile navigation journey. Use the existing header layout’s alignment rule to put the menu trigger at the end of the row, then rerun the 390px screenshot check.

## Verified evidence

`pnpm exec tsx scripts/check-public-franchise-privacy.ts` passed. It invokes the real handler for `tab=FRANCHISEE` with both D1 and Sheets selected, receives 403/no-store, and proves neither backend is touched. It also preserves the intended public `UNCLAIMED` claim-search route.

`pnpm exec tsx scripts/check-static-export.mjs` passed. Its disposable export fixture proves the listed private generated snapshots are excluded and a stale copy is removed when the source remains present. Static export review found the policy properly blocks dotfiles and the named generated JSON files. The changed 404 source provides a usable recovery link; final built-route evidence is intentionally absent because this review forbids an Astro build.

`pnpm run google-contacts:check` passed, but is insufficient for the P0 acceptance requirement above.
