# AGENTS.md - Working Rules

Last updated: 2026-06-21 05:45 (Asia/Jakarta)

## Persistent Rules
- Every file create/update/delete in this repository must be recorded in `CHANGELOG.md` in the same work session.
- Keep `CODEBASE.md` current whenever relevant files, functions, data contracts, routes, generated assets, or backend responsibilities change. Treat stale codebase maps as a project risk.
- Keep high-level migration decisions in `docs/architecture/TECH_STACK_DECISIONS.md`; do not duplicate long strategy notes across model-specific docs.
- Keep per-session context snapshots in `/.context` using timestamped Markdown files (`session-YYYYMMDD-HHmm.md`) for new-session continuity.
- Be proactive with engineering judgment: when a request can be improved for maintainability, security, performance, UX, data integrity, or migration safety, surface the recommendation clearly before or during implementation. Prefer actionable suggestions with tradeoffs while respecting explicit user decisions.
- Use pnpm exclusively. Run `pnpm install`, `pnpm run <script>`, and `pnpm exec <tool>`. Keep `pnpm-lock.yaml` committed and do not create alternate lockfiles.

## Current Stack Direction
- Astro static routes are the target for public SEO pages, starting with `/peluang-usaha/`, `/peluang-usaha/[slug]`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, and D1-backed category archive routes.
- Cloudflare D1 `franchise_db` is the shared source of truth across Franchisee.id, Franchisor.id, Franchise.id, Waralaba.id, Franchise.co.id, Waralaba.co.id, and future owned network sites.
- Cloudflare R2 is the target for franchise media and proposal assets.
- Clerk handles login/register and identity; D1 authorizes roles and permissions.
- Clerk integration uses custom UI and existing CSS. Do not switch to Clerk prebuilt components unless the user explicitly asks.
- Keep Clerk and D1 synchronized: Clerk user lifecycle flows into D1 through `/clerk-webhook`; D1 role changes must use `/user-role` or be followed by `/sync-clerk-metadata`. D1 remains authoritative for authorization; Clerk metadata is only a UI/routing snapshot.
- TypeScript is the default for new app, backend, importer, schema, and migration-adjacent work.
- Zod validates untrusted runtime data before business logic or D1 writes: form submissions, query params, CSV/Sheets imports, Clerk webhooks, environment/config, and admin actions.
- D1 schema changes must go through committed SQL migrations. Do not rely on ad hoc production table edits as the database contract.
- Roles are D1-authoritative: `franchisee`, `franchisor`, `admin`, and `staff`. Clerk metadata can be a UI hint only.
- Google Sheets is archive/import-only. Do not add new Google Sheets write paths; new writes must target D1 after validation and authorization.
- `/form-submit` writes require Clerk session tokens and D1 role checks. Do not reintroduce anonymous D1 writes for franchisee/franchisor/profile/listing/claim/test-data actions.
- Existing CSS remains the styling foundation unless the user explicitly approves a styling dependency.

## D1 And Cloudflare Rules
- The active D1 binding/database is `franchise_db`; UUID: `812cd8ac-edd0-45d9-981f-c9a15358317b`.
- Multi-site writes must preserve source-site attribution and update shared canonical records rather than duplicating brands per domain.
- Use `network_sites`, `franchise_site_publications`, subscriptions, entitlements, and `audit_events` to track where data came from and where it is published.
- Use `cfman` for Cloudflare multi-account operations. Prefer an explicit account alias such as `franchise-network`: `npx cfman wrangler --account franchise-network d1 list`.
- Run `cfman wrangler` commands sequentially; repeated immediate invocations can intermittently fail in this environment.
- Do not add `account_id` to `wrangler.toml`; Cloudflare Pages config validation rejects it. Use the Cloudflare Pages project/account context, `cfman`, or GitHub `CLOUDFLARE_ACCOUNT_ID` env/vars for account selection.
- Never commit Cloudflare tokens or paste them into repository files. Store tokens only through `cfman token add` or the local shell environment.
- Never commit Clerk secret keys. Clerk env requirements are documented in `docs/architecture/CLERK_SETUP.md`.
- Clerk webhook signing secrets are required for `/clerk-webhook`; do not accept unverified webhook payloads.

## Public Page Generation
- Public franchise listing/detail pages must be generated from D1 for SEO.
- Current bridge: `scripts/build-d1-franchise-pages.ts` queries D1, renders legacy template HTML, writes `json/d1-franchise-static-data.json`, updates `json/d1-generated-pages-manifest.json`, and refreshes `json/unclaimed-brands.json`.
- Astro target: `src/pages/peluang-usaha/index.astro`, `src/pages/peluang-usaha/[slug].astro`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/kategori/[slug]`, and top-level category slug routes consume the D1 snapshot through `src/lib/franchise-static.ts` and generate static HTML during `pnpm run build:astro`.
- Category permalink policy: canonical category URLs are Indonesian `/kategori/...`. Legacy `/category/...` paths should redirect to `/kategori/...`, not generate duplicate indexable pages.
- Directory list cards must use the CSS-only placeholder from `src/lib/franchise-static.ts` when a franchise has no cover/logo URL. Do not point missing images at legacy WooCommerce placeholder assets unless that asset is restored and intentionally owned.
- Franchise listing detail pages are directory/listing pages, not blog posts. Do not show fake WordPress author/date blocks such as `By admin`; show franchise facts and real D1 timestamps only after the snapshot/query includes trustworthy publication/submission dates.
- Franchise detail physical output should be flat `/peluang-usaha/[slug].html`, with extensionless links `/peluang-usaha/[slug]` for Cloudflare Pages routing.
- D1 writes do not automatically trigger static rebuilds. Public-page-affecting writes enqueue `site_rebuild_requests` through `functions/_site-publish-queue.js`; `/form-submit` currently queues franchisor listing, claim, and dev test listing changes. `.github/workflows/d1-static-publish.yaml` polls D1 every 30 minutes and calls the Cloudflare Pages Deploy Hook only when dirty and allowed by guardrails. GitHub direct `dist/` deploy is the fallback if Cloudflare build quota becomes constrained. Do not let the poller commit generated output to `main`, because that can trigger an extra Cloudflare Git build. Manual admin deploys are for urgent exceptions. See `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md` before changing publish automation.
- Cloudflare Pages Git/Deploy Hook builds must have the project build command set to `pnpm run build` or `pnpm run build:astro`, with output directory `dist`. Without a build command, Pages skips dependency installation and Functions bundling fails on npm imports such as `zod` and `@clerk/backend`.
- Cloudflare Pages builds also need `CLOUDFLARE_API_TOKEN` as a Pages secret so `scripts/build-d1-franchise-pages.ts` can read remote D1 through the Cloudflare D1 HTTP API during `pnpm run build`. GitHub secrets do not automatically exist inside Cloudflare Pages builds.
- The Cloudflare Pages output is hybrid. `astro build` creates D1-backed routes, then `scripts/copy-legacy-static.mjs` copies the legacy static export into `dist` without overwriting Astro output. Keep legacy `/peluang-usaha` excluded from that copy so Astro owns the D1-backed directory route.
- When cleaning stale generated franchise pages, delete only pages tracked in `json/d1-generated-pages-manifest.json` and marked with `d1-generated:franchisee.id`. Do not delete untracked legacy/example `/peluang-usaha` folders during the transition.

## Form Rules
- Before making form/logic edits, check `FORM_SCHEMA.md`, `FORM_PRESERVATION_MANDATE.md`, `TECHNICAL_INVENTORY.md`, and relevant files under `docs/forms/`.
- **Critical**: read `FORM_PRESERVATION_MANDATE.md` before editing `/daftar/index.html` or any form-related files. Never remove form fields without explicit user request.
- Preserve strict claim-search brand sanitization consistently across `js/build-listing.js`, `functions/get-franchises.js`, `scripts/import-csv-to-d1.ts`, `scripts/build-d1-franchise-pages.ts`, and modular form scripts.
- Do not reintroduce naive CSV parsing for sheet/CSV fallbacks; keep quote-aware parsing to avoid `brand_name` column shifts.
- Keep form runtime logic modular in flat prefixed files (`js/form-01-*.js` through `js/form-09-*.js`); avoid reintroducing monolithic `js/form-franchise.js` logic.
- For large legacy files such as `/daftar/index.html`, avoid full rewrites; use targeted edits with enough surrounding context to prevent accidental loss.
- After editing files larger than 500 lines, verify line count immediately to catch unintended truncation.
- When adding or refactoring form/logic features, sync `FORM_SCHEMA.md`, `TECHNICAL_INVENTORY.md`, `CODEBASE.md`, and `CHANGELOG.md` if fields, functions, or key variables change.

## Documentation Map
- `docs/README.md`: centralized documentation index and source-of-truth rules.
- `CODEBASE.md`: living map of relevant logic, data flows, routes, and contracts.
- `AUDIT.md`: technology migration audit and progress tracker.
- `docs/architecture/TECH_STACK_DECISIONS.md`: stack decisions, D1/Clerk/R2/Drizzle direction, migration status.
- `docs/architecture/CLERK_SETUP.md`: Clerk env setup, custom auth UI, D1 user sync, and role authorization rules.
- `FORM_SCHEMA.md`: canonical form input inventory.
- `FORM_PRESERVATION_MANDATE.md`: binding form preservation constraints.
- `TECHNICAL_INVENTORY.md`: key functions/variables in `/js`, `/functions`, `/scripts`, and `/src`.
- `docs/forms/*.md`: detailed form behavior, claim flow, validation, autosave, and franchise form UX references.
- `docs/testing/*.md`: debug/test-data references.
- `README.md`: currently generated sitemap URL listing; treat as generated artifact.
- `CHANGELOG.md`: mandatory running log of repository modifications.
- `/.context/*.md`: timestamped session continuity snapshots.

## Historical Notes
- `/daftar/index.html` was historically developed under `/pendaftaran/index.html`; older commits and notes may use the old path.
- The large WordPress-exported HTML files are mostly static surface. Prefer learning runtime behavior from `/js`, `/functions`, `/scripts`, `/src`, `/templates`, `/json`, `/csv`, and the docs above.
