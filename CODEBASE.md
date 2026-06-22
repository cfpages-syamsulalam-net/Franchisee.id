# Franchisee.id Codebase Map

Last updated: 2026-06-22 06:05 (Asia/Jakarta)

## Purpose
`CODEBASE.md` is the living map of project-owned logic. Keep it current whenever relevant files, functions, data contracts, routes, generated assets, or backend responsibilities change. The large WordPress-exported HTML files are mostly static surface; this document focuses on the runtime, builders, data files, templates, workflows, and integration points that define application behavior.

## Current Shape
Franchisee.id is a WordPress-to-static conversion hosted on Cloudflare Pages. Most pages are static HTML/CSS/JS exported from WordPress/Astra/Elementor. The interactive layer is custom JavaScript in `/js`, Cloudflare Pages Functions in `/functions`, generated/static data in `/json` and `/csv`, TypeScript D1 import/public-page generation pipelines in `/scripts`, and GitHub Actions that currently rebuild generated directory pages from Google Sheets.

The legacy data source is Google Sheets:
- `FRANCHISOR`: claimed/listed franchise brands.
- `UNCLAIMED`: scraped or imported potential brands that owners can claim.
- `FRANCHISEE`: prospective buyers/leads.

CSV files in `/csv` are local fallback/source snapshots and the current import source for D1 seeding. JSON files in `/json` are frontend runtime data assets, especially the sanitized claim-search list.

The first CSV snapshot has been imported into remote Cloudflare D1 `franchise_db`:
- `franchises`: 197
- `franchise_packages`: 190
- `franchise_site_publications`: 197
- `franchisee_profiles`: 2
- `franchisor_profiles`: 1
- `legacy_source_rows`: 199

## Target Upgrade Direction
The current Sheets/CSV/functions implementation is a transition layer. The project direction is:
- Astro on Cloudflare for new public directory and application pages.
- Cloudflare D1 `franchise_db` as the shared source of truth for users, franchisees, franchisors, franchises, claims, leads, packages, locations, assets metadata, network-site publication, subscriptions, and audit events.
- Cloudflare R2 for franchise media and proposal assets.
- Clerk for login/register, identity/session handling, and protected franchisee/franchisor/admin route entry.
- TypeScript by default for new app/backend/importer/schema work.
- Zod for runtime validation of forms, API inputs, imports, Clerk webhooks, env/config, and D1 write inputs.
- Source-controlled SQL migrations for all D1 schema changes.
- D1-authoritative roles: `franchisee`, `franchisor`, `staff`, and `admin`; Clerk metadata is a UI hint only.
- Drizzle can be added when D1-backed route handlers need shared typed queries, but initial schema migrations should remain explicit and reviewable.
- Existing CSS and form field names remain compatibility contracts until `FORM_SCHEMA.md`, `AUDIT.md`, and this file are updated together.

## Project-Owned Logic Files

| File | Role | Connected To |
| --- | --- | --- |
| `js/build-listing.js` | Static-site builder for `/peluang-usaha/index.html`; fetches `FRANCHISOR` and `UNCLAIMED`, merges/sorts tiers, renders listing cards, and regenerates `json/unclaimed-brands.json`. | `templates/peluang-usaha-tpl.html`, `csv/franchisors.csv`, `csv/unclaimed.csv`, Google Sheets, `json/unclaimed-brands.json` |
| `js/build-details.js` | Static-site builder for individual `/peluang-usaha/{slug}/index.html` pages; injects brand fields, JSON-LD, breadcrumbs, unclaimed disclaimers, tabs, and sticky claim CTA. | `templates/detail-franchise-tpl.html`, Google Sheets, `/daftar?claim={slug}` |
| `js/build-sitemap.js` | Generates `sitemap-complete.xml` from franchisor and unclaimed brands. | Google Sheets, CSV fallback, generated detail URLs |
| `functions/get-franchises.js` | Cloudflare Function API for directory/claim-search reads. D1-first through the `franchise_db` binding, validates query params with Zod, preserves `purpose=claim-search` sanitization, and keeps a Sheets read fallback only when D1 is unavailable or explicitly requested. | Cloudflare D1 `franchise_db`, `js/form-02-claim-workflow.js`, legacy Sheets read fallback |
| `functions/form-submit.js` | Cloudflare Function API for franchisee, franchisor, claim, and dev test-data submissions. D1-only writes with Zod payload validation, duplicate checks, D1 claim cleanup, D1 profile/listing/package/publication/claim/audit writes, D1 static rebuild queue writes for public-page-affecting listing changes, and no new Google Sheets writes. | `js/form-06-submit-validation.js`, Cloudflare D1 `franchise_db`, `franchisee_profiles`, `franchisor_profiles`, `franchises`, `franchise_claims`, `franchise_packages`, `franchise_site_publications`, `site_rebuild_requests`, `site_publish_state`, `legacy_source_rows`, `audit_events` |
| `functions/_site-publish-queue.js` | Shared Pages Functions helper for public-page dirty queue writes. Exposes `SITE_FRANCHISEE_ID` and `siteRebuildStatements()` so D1 mutations can enqueue rebuild requests and update per-site publish state in the same batch. | `functions/form-submit.js`, D1 `site_rebuild_requests`, D1 `site_publish_state` |
| `functions/_clerk-auth.js` | Shared Clerk/D1 auth helper for Pages Functions. Verifies Clerk bearer tokens, fetches Clerk user data, upserts D1 `users`, assigns only self-assignable roles, checks D1 roles before writes, and pushes D1 role snapshots to Clerk metadata. | `@clerk/backend`, `functions/auth-sync.js`, `functions/form-submit.js`, `functions/clerk-webhook.js`, D1 `users`, `user_roles` |
| `functions/auth-config.js` | Public same-origin config endpoint for Clerk publishable key. Keeps static HTML environment-neutral and accepts `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` with `CLERK_PUBLISHABLE_KEY` fallback. | `js/auth-clerk.js`, Cloudflare env |
| `functions/auth-sync.js` | Authenticated Clerk-to-D1 user sync endpoint. Maps the active Clerk user into D1 and self-assigns `franchisee` or `franchisor` when requested. | `functions/_clerk-auth.js`, `js/auth-clerk.js`, D1 `users`, `user_roles` |
| `functions/clerk-webhook.js` | Clerk-to-D1 lifecycle sync endpoint. Verifies Clerk webhooks and upserts/deletes D1 users from Clerk `user.created`, `user.updated`, and `user.deleted` events. | `@clerk/backend/webhooks`, Cloudflare env `CLERK_WEBHOOK_SIGNING_SECRET`, D1 `users` |
| `functions/user-role.js` | Admin-only D1 role mutation endpoint. Assigns/removes D1 roles and then pushes the D1 role snapshot to Clerk metadata. | `functions/_clerk-auth.js`, D1 `user_roles`, Clerk `users.updateUserMetadata` |
| `functions/sync-clerk-metadata.js` | Admin-only repair/backfill endpoint for pushing D1 user/role state into Clerk metadata after manual SQL changes. | `functions/_clerk-auth.js`, D1 `users`, `user_roles`, Clerk metadata |
| `js/auth-clerk.js` | Custom ClerkJS client integration. Replaces the legacy `/login` WPForms block with custom login/register forms, powers `/register`, exposes `window.FranchiseAuth`, and supplies bearer tokens to protected form writes. | `/auth-config`, `/auth-sync`, `/login`, `/register`, `/daftar`, `js/form-06-submit-validation.js` |
| `css/auth-clerk.css` | Custom auth UI styling built on existing Astra/global colors. | `/login`, `/register`, `/daftar` |
| `js/form-01-state-helpers.js` | Shared `window.FranchiseForm` state, constants, sanitizers, claim persistence, and franchisor draft persistence. | All form modules, `localStorage`, claim search, autosave |
| `js/form-02-claim-workflow.js` | Claim-search data loading, autocomplete UI, claim-mode prefill, and claim-mode exit. | `json/unclaimed-brands.json`, `/get-franchises`, `window.openTab`, franchisor form |
| `js/form-03-navigation-steps.js` | Registration tab switching and franchisor 5-step navigation/validation. | `/daftar/index.html` onclick handlers, `form-utils.js`, `localStorage` |
| `js/form-04-calculation-city.js` | Investment/BEP calculation and city autocomplete loader. | `/json/data-kota-id.json` if present, remote city JSON fallback, form fields |
| `js/form-05-country-whatsapp.js` | Country-code dropdown rendering, flag fallback, and WhatsApp normalization. | `json/country-codes.json`, submit pipeline |
| `js/form-06-submit-validation.js` | Live validation binding, unified submit pipeline to `/form-submit`, Clerk bearer-token attachment through `window.FranchiseAuth`, and aggressive franchisor autosave triggers. | `functions/form-submit.js`, `js/auth-clerk.js`, `form-utils.js`, `form-01-state-helpers.js` |
| `js/form-07-init.js` | DOMContentLoaded bootstrap for form modules, HAKI conditional display, state restoration, and compatibility globals. | All form modules, `/daftar/index.html` |
| `js/form-08-franchisee-steps.js` | Separate 2-step franchisee form navigation and validation. | `franchiseeForm`, `localStorage` key `franchisee_form_step` |
| `js/form-09-test-data-generator.js` | Dev-only `?dev=1` form filler and test data cleanup UI. | `/form-submit`, form modules, Google Sheets test-data helpers |
| `js/form-utils.js` | Shared formatting, validation, UI helpers, and progress helpers exposed as globals. | Form modules and `/daftar/index.html` |
| `js/form-franchise.js` | Legacy non-executing shim. Do not add runtime logic here. | Historical compatibility only |
| `scripts/import-csv-to-d1.ts` | TypeScript/Zod importer that validates `csv/franchisors.csv`, `csv/unclaimed.csv`, and `csv/franchisee.csv`, generates idempotent SQL for `franchise_db`, preserves strict `UNCLAIMED` claim-search sanitization, and can apply remotely through `cfman`. | `migrations/0001_initial_network_schema.sql`, `/csv`, `.context/d1-import-franchise-data.sql`, Cloudflare D1 `franchise_db` |
| `scripts/build-d1-franchise-pages.ts` | TypeScript/Zod D1-backed public page bridge. Reads published `site_franchisee_id` rows from `franchise_db` through the Cloudflare D1 HTTP API when `CLOUDFLARE_API_TOKEN` is available, with Wrangler/cfman as local fallback; renders `/peluang-usaha/index.html` and flat `/peluang-usaha/{slug}.html` detail files, includes public `phone`/`office_address` plus franchisor contact/social fields in the Astro snapshot, regenerates claim-search JSON, skips unchanged pages by manifest hash, and prunes only previously D1-generated pages. | `templates/peluang-usaha-tpl.html`, `templates/detail-franchise-tpl.html`, `json/d1-franchise-static-data.json`, `json/d1-generated-pages-manifest.json`, `json/unclaimed-brands.json`, `/peluang-usaha`, Cloudflare D1 HTTP API, Wrangler |
| `scripts/copy-legacy-static.mjs` | Post-Astro build copier for the hybrid deployment. Copies legacy static HTML/assets/directories into `dist` without overwriting existing Astro output, skips legacy duplicate directory/category routes, and rewrites copied legacy HTML links from old archive URLs to canonical `/peluang-usaha` query URLs. | `package.json` `copy:legacy-static`, Cloudflare Pages output `dist`, legacy root static export |
| `scripts/d1-static-publish-poller.mjs` | Dependency-free Node poller for GitHub Actions. Calls the Cloudflare D1 HTTP API to expire stale queued requests, check pending rebuild work, enforce per-site guardrails, call the Cloudflare Pages Deploy Hook in the default mode, and mark direct-deploy fallback status. | `.github/workflows/d1-static-publish.yaml`, D1 `site_rebuild_requests`, D1 `site_publish_state`, GitHub secrets `CLOUDFLARE_API_TOKEN` and `PAGES_DEPLOY_HOOK_FRANCHISEE_ID` |
| `src/lib/franchise-static.ts` | Astro-side renderer and Zod validator for the D1 franchise static snapshot. Converts D1 snapshot rows into listing/detail HTML using existing template placeholders, canonical `/peluang-usaha` query controls, deterministic recommendation/popular/abjad/category ordering, CSS-only missing-image placeholders, cleaned detail metadata, readable breadcrumbs/yellow chip states, self-contained detail tabs, stripped stale legacy tab comments, unclaimed public contact/address rendering, Indonesian phone parsing/normalization, all-caps description display normalization, and the same SEO/contact/social mapping as the bridge. | `json/d1-franchise-static-data.json`, `templates/peluang-usaha-tpl.html`, `templates/detail-franchise-tpl.html`, Astro routes |
| `src/pages/peluang-usaha/index.astro` | Astro static listing route for canonical `/peluang-usaha/`. Loads the D1 snapshot and renders the existing listing template with manual search, sort, category, and status controls during build. | `src/lib/franchise-static.ts`, `json/d1-franchise-static-data.json` |
| `src/pages/peluang-usaha/[slug].astro` | Astro static detail route that physically builds `/peluang-usaha/{slug}.html` under `build.format: "preserve"` while public links stay `/peluang-usaha/{slug}`. Uses `getStaticPaths` from the D1 snapshot so each franchise keeps an individually indexable HTML page. | `src/lib/franchise-static.ts`, `json/d1-franchise-static-data.json`, `astro.config.mjs` |
| `public/_redirects` | Cloudflare Pages redirect rules. Redirects legacy duplicate directory/category URLs (`/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/category`, and known category aliases) to canonical `/peluang-usaha` query-param URLs. | Astro public asset copy, Cloudflare Pages |

## Supporting Files

| File/Directory | Role |
| --- | --- |
| `templates/peluang-usaha-tpl.html` | Large static template with `<!-- DYNAMIC_FRANCHISE_LISTING -->` placeholder. |
| `templates/detail-franchise-tpl.html` | Large static detail template with placeholders such as `{BRAND_NAME}`, `{SLUG}`, `{DYNAMIC_TABS_CONTENT}`, and `<!-- DYNAMIC_DISCLAIMER_BOX -->`. |
| `daftar/index.html` | Static registration page that loads `css/form-franchise.css` and all modular form scripts. Treat as integration context and preserve every field. |
| `login/index.html` | Legacy static login page shell. The old WPForms block is replaced at runtime by `js/auth-clerk.js` with custom Clerk login/register UI. |
| `register/index.html` | Dedicated custom Clerk registration page using existing site CSS and the shared auth script. |
| `css/form-franchise.css` | Form CSS aggregator. Preserve import order. |
| `css/form-franchise/*.css` | Modular form styling for utilities, layout/tabs/steps, core fields, alerts/autocomplete, packages, and claim search. |
| `json/unclaimed-brands.json` | Generated sanitized claim-search data. Legacy builder can write this, but the current D1-backed path regenerates it from published unclaimed D1 rows. Frontend uses this before API fallback. |
| `json/d1-franchise-static-data.json` | D1 snapshot consumed by Astro static routes. Generated by `scripts/build-d1-franchise-pages.ts` before Astro build so the static route layer has a stable, validated input. |
| `json/d1-generated-pages-manifest.json` | D1 public-page generation manifest. Tracks hashes and D1-owned page paths so bridge reruns skip unchanged pages and prune only pages previously generated by `scripts/build-d1-franchise-pages.ts`. |
| `json/country-codes.json` | Runtime country-code options for WhatsApp inputs. |
| `csv/franchisors.csv` | Local fallback/source snapshot for `FRANCHISOR`. |
| `csv/franchisee.csv` | Local fallback/source snapshot for `FRANCHISEE`. |
| `csv/unclaimed.csv` | Local fallback/source snapshot for `UNCLAIMED`. |
| `astro.config.mjs` | Astro static build config for Cloudflare Pages-compatible output. Uses `build.format: "preserve"` so listing index output stays nested while detail source files can build flat `.html` files. |
| `src/env.d.ts` | Astro TypeScript client reference. |
| `tsconfig.json` | Strict TypeScript config for migration scripts and Astro support code. Includes `scripts/**/*.ts`, `src/**/*.ts`, and `src/**/*.d.ts`. |
| `package.json` | Declares pnpm scripts for D1 CSV import, D1 bridge generation, Astro static builds, legacy static copying, and publish queue polling: `import:csv:*`, `build:d1:franchises:*`, `astro:sync`, `build`, `build:astro`, `copy:legacy-static`, `publish:d1:poll`, `dev:astro`, and `preview:astro`. `build` is a conventional alias for Cloudflare Pages and runs the Astro pipeline plus legacy static copy. |
| `.github/workflows/generate-pages.yaml` | Scheduled/manual/repository-dispatch builder workflow for regenerated static directory pages. |
| `.github/workflows/d1-static-publish.yaml` | 30-minute/manual D1 publish poller. Runs `scripts/d1-static-publish-poller.mjs`, calls the Cloudflare Pages Deploy Hook only when D1 is dirty and guardrails allow publishing, and supports direct `wrangler pages deploy dist` fallback without committing generated output. |
| `.github/workflows/head.yaml` | Legacy automation that injects `.head` content into every HTML file. Use cautiously because it touches many static exports. |
| `.github/workflows/sitemap-readme.yaml` | Manual workflow for sitemap/readme generation from HTML files. |
| `docs/README.md` | Central documentation index and source-of-truth policy. |
| `docs/architecture/TECH_STACK_DECISIONS.md` | Canonical migration stack decisions: TypeScript, Zod, D1 SQL migrations, role model, Clerk/D1 responsibility split, and Drizzle adoption timing. |
| `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md` | Compares twice-daily D1 static publishing with GitHub Actions polling, Cloudflare Deploy Hook builds, and GitHub direct deploy fallback. Current target is 30-minute polling after a D1 dirty queue exists, without committing generated output from the poller. |
| `DASHBOARD.md` | Admin/staff dashboard plan covering overview, listing operations, unclaimed outreach, claim review, data quality, publishing, leads, system health, roles, and MVP sequencing. |
| `migrations/0001_initial_network_schema.sql` | First D1 schema migration for shared network sites, users/roles, profiles, franchises, claims, assets, leads, site publications, subscriptions/entitlements, imports, and audit events. |
| `migrations/0002_add_franchisor_social_links.sql` | Adds optional Facebook, TikTok, YouTube, and LinkedIn URL columns to `franchisor_profiles`; website and Instagram already existed. |
| `migrations/0003_site_publish_queue.sql` | Adds `site_rebuild_requests` and `site_publish_state` for D1-to-static publish queueing, per-site guardrails, and publish mode tracking. Applied remotely to `franchise_db` on 2026-06-18. |
| `wrangler.toml` | Active Wrangler config for Cloudflare Pages output `dist` and shared D1 binding `franchise_db` using database UUID `812cd8ac-edd0-45d9-981f-c9a15358317b`. It intentionally omits `account_id` because Pages config validation rejects that key. Remote commands should run through `npx cfman wrangler --account franchise-network ...`. |
| `wrangler.example.toml` | Non-active Wrangler example showing Pages output `dist`, the `franchise_db` binding, and migrations directory; copy to `wrangler.toml` only after adding the real D1 UUID. |
| `.node-version` | Pins local/Cloudflare build runtime intent to Node `20.19.4`, matching the Astro 5.x dependency set. |
| `.context/wrangler-local-d1-test.toml` | Local-only Wrangler config used to validate D1 migrations without production credentials. Do not use as deployment config. |
| `.context/d1-import-franchise-data.sql` | Generated import SQL output. Ignored by git because it is reproducible from `/csv` and `scripts/import-csv-to-d1.ts`. |

## Main Data Flows

### 1. Directory Build Flow
1. `generate-pages.yaml` installs builder dependencies and computes a hash of Google Sheets data.
2. If the hash changed, it runs `node js/build-listing.js`, `node js/build-details.js`, and `node js/build-sitemap.js`.
3. `build-listing.js` generates `/peluang-usaha/index.html` and `json/unclaimed-brands.json`.
4. `build-details.js` generates individual brand pages under `/peluang-usaha/{slug}/`.
5. `build-sitemap.js` writes `sitemap-complete.xml`.
6. GitHub Actions commits generated changes back to `main`.

### 2. Franchisee Registration Flow
1. `/daftar/index.html` loads `franchiseeForm` and `js/form-08-franchisee-steps.js`.
2. Step 1 collects personal/contact data; Step 2 collects interests and budget.
3. `js/form-utils.js` validates and formats visible fields.
4. `js/form-06-submit-validation.js` posts JSON to `/form-submit` with `form_type: "FRANCHISEE"`.
5. `js/auth-clerk.js` supplies a Clerk session bearer token; unauthenticated submits are blocked.
6. `functions/form-submit.js` verifies Clerk, maps the user into D1, requires the D1 `franchisee` role (or `staff`/`admin`), validates the payload with Zod, checks D1 duplicates by email/WhatsApp, and writes `franchisee_profiles.user_id`, `legacy_source_rows`, and actor-aware `audit_events`.

### 3. Franchisor Listing Flow
1. `/daftar/index.html` loads `franchiseListingForm` and the modular `js/form-01-*` through `js/form-07-*` stack.
2. Step navigation and required validation are controlled by `js/form-03-navigation-steps.js`.
3. Field formatting and detailed validation live in `js/form-utils.js`.
4. BEP/minimum investment logic lives in `js/form-04-calculation-city.js`.
5. Country-code and WhatsApp normalization live in `js/form-05-country-whatsapp.js`.
6. Aggressive autosave stores draft field values in `localStorage` through `js/form-01-state-helpers.js` and `js/form-06-submit-validation.js`.
7. Submit posts to `/form-submit` with `form_type: "FRANCHISOR"`.
8. `js/auth-clerk.js` supplies a Clerk session bearer token; unauthenticated submits are blocked.
9. `functions/form-submit.js` verifies Clerk, maps the user into D1, requires the D1 `franchisor` role (or `staff`/`admin`), validates with Zod, checks D1 duplicates, writes `franchisor_profiles.user_id`, `franchises.owner_user_id`, `franchise_packages`, `franchise_site_publications`, `legacy_source_rows`, and actor-aware `audit_events` in D1.

### 4. Claim Brand Flow
1. Detail pages for unclaimed brands link to `/daftar?claim={slug}` through `build-details.js`.
2. `js/form-07-init.js` opens the claim tab when the `claim` query exists.
3. `js/form-02-claim-workflow.js` loads `json/unclaimed-brands.json`; if unavailable, it calls `/get-franchises?tab=UNCLAIMED&purpose=claim-search`.
4. Claim search rows are sanitized and deduped in `build-listing.js`, `functions/get-franchises.js`, and `form-01-state-helpers.js`.
5. Selecting a brand switches to the franchisor form, fills brand/category/minimum capital, stores `unclaimed_id`, and persists claim mode in `localStorage`.
6. Submit changes `form_type` to `claim`; `functions/form-submit.js` requires the D1 `franchisor` role, updates the D1 unclaimed franchise into a free franchisor-owned listing, records a `franchise_claims` row with `claimant_user_id`, and changes the source sheet to `FRANCHISOR` so it no longer appears in unclaimed claim search.

### 5. Clerk Login/Register And D1 User Mapping Flow
1. `/login/` loads the legacy static page shell and `js/auth-clerk.js` replaces `#wpforms-725` with a custom login/register UI.
2. `/register/` loads a dedicated custom registration page with franchisee/franchisor role selection.
3. Browser code fetches `/auth-config`, loads pinned ClerkJS, and signs users in/up with Clerk client APIs.
4. After sign-up or sign-in, `/auth-sync` verifies the Clerk session, upserts D1 `users`, inserts self-assignable `franchisee`/`franchisor` roles when requested, and pushes the D1 role snapshot into Clerk metadata.
5. Clerk Dashboard webhooks call `/clerk-webhook` for `user.created`, `user.updated`, and `user.deleted`; the endpoint verifies signatures and syncs D1 `users`.
6. D1 role changes initiated by the app use `/user-role`, which mutates D1 and then updates Clerk metadata. Manual SQL changes require `/sync-clerk-metadata` because D1 has no outbound webhook trigger.
7. `/form-submit` uses `functions/_clerk-auth.js` to verify the Clerk token, check D1 roles, sync Clerk metadata from current D1 roles, and attach D1 user ownership to profiles/listings/claims/audit rows.

### 6. CSV To D1 Import Flow
1. `pnpm run import:csv:dry` parses and validates the three CSV snapshots without writing SQL.
2. `scripts/import-csv-to-d1.ts` uses quote-aware CSV parsing and Zod row schemas before generating database writes.
3. `UNCLAIMED` rows pass through `isLikelyClaimBrandRow` sanitation to avoid importing URL/phone/address/legal-entity/contact-label noise as brand names.
4. Stable SHA1-derived ids make reruns idempotent for franchises, profiles, packages, publications, and legacy source mappings.
5. `pnpm run import:csv:sql` writes `.context/d1-import-franchise-data.sql`.
6. `pnpm run import:csv:remote` applies the generated SQL to remote D1 through `npx cfman wrangler --account franchise-network`.
7. Imported franchises are published to `site_franchisee_id` via `franchise_site_publications` so later network domains can subscribe/publish without duplicating canonical franchise rows.

### 7. D1 Public Franchise Page Generation Flow
1. `pnpm run build:d1:franchises:dry` queries remote D1 and renders pages in memory to show write/skip/prune counts.
2. `pnpm run build:d1:franchises` reads the `franchise-network` token from the local cfman token store, calls Wrangler directly, and selects published `site_franchisee_id` rows from `franchise_db`.
3. The script renders `/peluang-usaha/index.html` from `templates/peluang-usaha-tpl.html`.
4. The script renders each `/peluang-usaha/{slug}.html` from `templates/detail-franchise-tpl.html` and adds a `d1-generated:franchisee.id` marker comment.
5. `json/d1-generated-pages-manifest.json` stores content hashes and D1-owned paths; unchanged pages are skipped on rerun.
6. Stale cleanup only removes pages that exist in the previous manifest and still contain the D1-generated marker, including old marker-owned `/peluang-usaha/{slug}/index.html` files when switching to flat `.html` output. Legacy/example pages not owned by the manifest are intentionally left alone.
7. The script also writes `json/d1-franchise-static-data.json` so Astro can build static routes from the same D1 source without querying D1 inside route files. The snapshot includes public phone and office address fields so detail pages can render imported contact data even before a brand is claimed.

### 7a. D1 Change To Static Publish Flow
1. D1 updates do not automatically trigger Cloudflare Pages builds.
2. A public-page-affecting D1 edit requires a rebuild/deploy (`pnpm run build:astro` in the Pages build) before static HTML changes are visible.
3. `migrations/0003_site_publish_queue.sql` adds `site_rebuild_requests` and `site_publish_state` for D1 dirty tracking.
4. `functions/_site-publish-queue.js` provides `siteRebuildStatements()`; `/form-submit` uses it for franchisor listing submit, claim submit, dev unclaimed creation, and dev test-data cleanup.
5. `.github/workflows/d1-static-publish.yaml` runs every 30 minutes at minutes 7 and 37. It exits when D1 is clean.
6. When D1 is dirty and guardrails allow it, the workflow calls the Cloudflare Pages Deploy Hook. Cloudflare then runs the configured Pages build, including `pnpm run build:astro`.
7. The poller marks requests as `queued` after a successful deploy-hook call. Queued requests older than `stale_queued_after_minutes` are moved back to `failed_retryable` for retry.
8. GitHub direct `dist/` deploy with Wrangler is the fallback/upgrade mode if Cloudflare Pages build quota becomes constrained.
9. The poller must not commit generated output back to `main`, because the connected Cloudflare Pages Git integration can turn that commit into another build.
10. Manual `workflow_dispatch` can force a publish, but normal franchisor edits should wait for the next poll window.

### 8. Astro D1 Static Route Flow
1. `pnpm run build:astro` first runs `pnpm run astro:sync`, which calls the D1 bridge and refreshes `json/d1-franchise-static-data.json`.
2. `src/lib/franchise-static.ts` validates the snapshot with Zod and exposes shared listing/detail renderers.
3. `src/pages/peluang-usaha/index.astro` renders canonical `/peluang-usaha/index.html`, uses a CSS-only fallback when cover/logo images are missing, and includes client-side controls for `q`, `sort`, `kategori`, `status`, and `view=kategori`.
4. `src/pages/peluang-usaha/[slug].astro` uses `getStaticPaths` to generate one flat `.html` detail page per D1 row because Astro is configured with `build.format: "preserve"`. Detail output owns its tab script, CSS-only missing-logo placeholder, readable breadcrumb/category chips, and parsed public contact block.
5. Legacy directory/archive URLs such as `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/category`, and top-level category slugs are redirect-only compatibility paths to `/peluang-usaha` query-param states.
6. `scripts/copy-legacy-static.mjs` copies the legacy static export into `dist` without overwriting Astro-generated files, so old CSS/JS/images/static pages remain available.
7. The copy step skips legacy root `/peluang-usaha` and duplicate archive/category folders, and rewrites copied HTML links to canonical `/peluang-usaha` query URLs.
8. Cloudflare Pages build-time D1 reads require `CLOUDFLARE_API_TOKEN`; optional `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_DATABASE_ID` override the current project defaults.

## Business Rules To Preserve
- Never remove or rename form fields without explicit user request and schema updates.
- Keep claim-search sanitization aligned across builder, API fallback, and frontend sanitizer.
- Keep form runtime modular in flat prefixed files; do not revive monolithic `js/form-franchise.js`.
- Keep JSON assets in `/json` and CSV assets in `/csv`.
- Keep static-first public franchise pages for SEO unless a migration plan explicitly replaces generation.
- Keep `/peluang-usaha` as the canonical public directory/search/filter route. Do not create new indexable duplicate archives for recommendation, popularity, alphabetical, category, or legacy directory views unless the canonical route policy is explicitly changed.
- For D1-generated public pages, prune only files tracked in `json/d1-generated-pages-manifest.json` and marked with `d1-generated:franchisee.id`.
- Unclaimed listings may show imported public contact, address, and social data when D1 has it. Display it as public/unclaimed data with a claim CTA; do not require claim ownership before showing existing public phone/address details.
- Phone display from legacy import data is presentation-normalized in `src/lib/franchise-static.ts`: preserve labels such as Marketing, WA/WhatsApp, Kantor, and Owner; distinguish WhatsApp/mobile/landline where possible; render `tel:` links for numbers; add WhatsApp claim-notification links for unclaimed mobile/WhatsApp-capable numbers; keep raw D1 fields until a later normalized contact table/dashboard edit flow exists.
- Imported descriptions are presentation-normalized in `src/lib/franchise-static.ts` when they are mostly uppercase. Keep raw D1 text intact until a reviewed data-cleaning/admin workflow is added.
- Keep `CHANGELOG.md` updated for every file create/update/delete.
- For new migration code, prefer TypeScript plus Zod validation at runtime boundaries.
- D1 table changes must be made through committed SQL migrations.
- Server-side authorization must read D1 roles/permissions; Clerk only supplies identity/session context.
- Clerk metadata must be treated as a cached D1 role snapshot for UI/routing only. Do not authorize server actions from Clerk metadata.
- Manual D1 role SQL must be followed by `/sync-clerk-metadata`; normal role changes should go through `/user-role`.
- `/form-submit` must remain D1-only. Do not restore Google Sheets write helpers unless the user explicitly asks for archive/export tooling.

## Known Implementation Gaps
- `js/build-sitemap.js` still uses naive CSV splitting in fallback mode, while `js/build-listing.js` uses quote-aware CSV parsing. This can corrupt sitemap entries when CSV fields contain commas/newlines.
- Google Sheets auth and parsing logic is duplicated in builders and functions.
- `functions/form-submit.js` now attaches Clerk-owned D1 users and role checks, but it still needs listing revision workflows, approval state transitions, and asset ownership.
- Login/register now exist as custom Clerk surfaces, but deployed Clerk environment variables and dashboard settings still need production verification.
- D1 write behavior still needs deployed Pages verification against the real binding after frontend submission testing.
- GitHub Actions publish polling needs repository secrets before it can run: `CLOUDFLARE_API_TOKEN` and `PAGES_DEPLOY_HOOK_FRANCHISEE_ID`; optional vars are `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, and `PAGES_PROJECT_NAME`.
