# Franchisee.id Technology Audit & Migration Tracker

Last updated: 2026-06-24 00:03 (Asia/Jakarta)

## Executive Summary
The current site is a static WordPress export with a custom Google Sheets-backed runtime. It works for SEO and basic form capture, but it is not a durable application architecture for authenticated franchisee/franchisor accounts, dashboards, asset ownership, listing edits, or reliable directory search.

Recommended target: keep the Cloudflare hosting model, preserve existing styling, and migrate the application layer to an Astro-on-Cloudflare stack with D1, R2, Clerk, and Cloudflare Workers/Pages Functions. Next.js remains viable, especially for a React-heavy dashboard, but Astro is the better default for this project because the public product is a content-heavy franchise directory that should stay static-first and lightweight.

## Existing Stack

| Area | Current Implementation | Observed Fit |
| --- | --- | --- |
| Hosting | Cloudflare Pages serving static WordPress-exported HTML. | Good for static SEO pages, weak for app workflows. |
| Backend | Cloudflare Pages Functions in `/functions`. | Good edge runtime, but currently tied to Google Sheets APIs. |
| Database | Google Sheets tabs (`FRANCHISOR`, `UNCLAIMED`, `FRANCHISEE`). | Useful prototype/CMS, poor as transactional app database. |
| Assets | WordPress uploads, external image URLs, Cloudinary transforms in code. | Fragmented ownership; not ideal for franchisor uploads. |
| Auth | No real app auth; legacy `/login` and `/daftar` static routes. | Blocking requirement for franchisee/franchisor dashboards. |
| SSG | Node scripts in `/js` generate listing/detail/sitemap pages. | Preserves SEO, but duplicates parsing/auth and relies on Sheets. |
| Styling | Existing WordPress/Astra/Elementor CSS plus modular form CSS. | Keep and reuse; no extra styling dependency needed. |
| Automation | GitHub Actions rebuild generated pages from Sheets hash. | Works for Sheets, but should shift to D1-driven builds or on-demand rendering. |

## Primary Problems
- Google Sheets is not a reliable source of truth for authenticated users, row-level ownership, approvals, revisions, saved searches, and paid/verified tiers.
- Form submissions append rows but do not create durable user/listing relationships.
- Claim flow mutates Sheets by appending a franchisor row and deleting an unclaimed row; this is hard to audit and recover.
- Runtime and builder code duplicate Google auth, row mapping, slugging, sanitization, and CSV fallback logic.
- Asset storage is not unified; future franchisor uploads need private/direct upload policies, ownership checks, and stable object keys.
- Login/register is not implemented as an authenticated app surface.
- The current `package.json` does not declare builder dependencies despite workflows installing `googleapis` and `dotenv`.

## Target Architecture

| Layer | Recommendation | Reason |
| --- | --- | --- |
| Framework | Astro with Cloudflare adapter. | Static-first public pages, islands for interactivity, Cloudflare bindings for dynamic routes. |
| Alternative | Next.js on Cloudflare via OpenNext. | Better if the dashboard becomes React-heavy, but higher migration/runtime complexity for this mostly static directory. |
| Database | Cloudflare D1 `franchise_db`. | Shared SQL source of truth for all owned network sites, users, listings, claims, leads, packages, locations, approval states, and audit logs. |
| Assets | Cloudflare R2. | Durable storage for logos, covers, galleries, proposals, and imported legacy assets. |
| Auth | Clerk. | Hosted auth, register/login, user identity, and server-side auth context for protected pages/functions. |
| Backend | Cloudflare Workers/Pages Functions or Astro server routes. | Use D1/R2 bindings instead of Google API secrets and Sheets fetches. |
| Styling | Existing CSS. | Preserve visual consistency and avoid adding a styling dependency. |
| Language | TypeScript by default for new app/backend/importer/schema work. | Compile-time safety for the migration while leaving untouched legacy JavaScript stable. |
| Validation | Zod at runtime trust boundaries. | Validate form payloads, query params, CSV/Sheets imports, Clerk webhooks, env/config, and admin actions before D1 writes. |
| Migrations | Source-controlled SQL migrations for every D1 schema change. | Keeps database evolution reviewable, repeatable, and recoverable. |
| Query layer | Start with explicit SQL migrations; add Drizzle when D1 route handlers need shared typed queries. | Drizzle supports Cloudflare D1 and is useful once route/dashboard query complexity grows. |
| Authorization | Clerk identity plus D1-authoritative roles. | Roles are `franchisee`, `franchisor`, `staff`, and `admin`; Clerk metadata is only a small UI hint. |

Official platform notes checked during this audit:
- Cloudflare Workers bindings expose D1/R2 and other resources through `env` without embedding service secrets in application code: https://developers.cloudflare.com/workers/runtime-apis/bindings/
- Cloudflare D1 is built for SQL access through Workers bindings: https://developers.cloudflare.com/d1/get-started/
- Cloudflare R2 is accessed from Workers through bucket bindings: https://developers.cloudflare.com/r2/api/workers/
- Astro supports Cloudflare adapter deployments and Cloudflare bindings for non-static routes: https://developers.cloudflare.com/workers/frameworks/framework-guides/astro/
- Clerk has an Astro SDK with middleware, server helpers, and locals access: https://clerk.com/docs/reference/astro/overview
- Clerk also has Next.js quickstarts if the project later chooses Next.js: https://clerk.com/docs/quickstarts/nextjs-pages-router

## Proposed D1 Data Model

Initial tables to replace the Sheets tabs:
- `users`: Clerk user id, email, display name, account status, profile status.
- `user_roles`: D1-authoritative role assignments for `franchisee`, `franchisor`, `staff`, and `admin`.
- `franchisees`: buyer profile fields currently captured by `franchiseeForm`.
- `franchisors`: owner/company profile tied to Clerk user id.
- `franchises`: canonical listing record with brand, category, status, verification tier, slug, owner id, source type.
- `franchise_claims`: claim requests from `UNCLAIMED` to owned listing, with review state and evidence.
- `franchise_packages`: package/investment variants and calculated minimum capital.
- `franchise_assets`: R2 object keys for logo, cover, gallery, proposal PDF, and ownership metadata.
- `franchise_leads`: franchisee inquiries/leads to franchisors.
- `locations`: city/region/location data for search/filtering.
- `audit_events`: important ownership, claim, publish, verification, and admin actions.

Keep the current form field names during migration where possible so the HTML/runtime contract can be mapped without losing data.

## Data Contract Decisions
- New app, backend, importer, and schema-adjacent code should be TypeScript.
- Zod schemas should define and validate all external payloads before they reach services or D1.
- D1 schema changes should be SQL migrations committed to the repository and applied locally before remote.
- Clerk authenticates the user, but D1 roles/permissions authorize actions.
- Drizzle is recommended when D1-backed Astro/server routes begin to accumulate shared queries; initial schema work can stay as explicit SQL migrations.
- `franchise_db` is shared across Franchisee.id, Franchisor.id, Franchise.id, Waralaba.id, Franchise.co.id, Waralaba.co.id, and future owned network sites.
- Canonical franchise data should live once in `franchises`; per-site visibility/slug/canonical behavior belongs in `franchise_site_publications`.
- Franchisor payment/network distribution should be modeled through `subscriptions` and `subscription_site_entitlements`, so one paid listing can appear across multiple sites.
- Google Sheets is archive/import-only from this point forward; new writes should go to D1.

## Route Plan

Public routes:
- `/`: existing homepage shell, later rebuilt as Astro page.
- `/peluang-usaha/`: canonical searchable franchise directory with query-param states for search, recommendation/popular/alphabetical/category sorting, status filtering, and category filtering.
- `/peluang-usaha/[slug]`: franchise detail page with SEO metadata, self-contained tabs, CSS-only missing-logo placeholders, public imported contact/address display when available, and claim CTA; physical generated files should be flat `/peluang-usaha/[slug].html`.
- `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/kategori/[slug]`, `/category/[slug]`, and top-level category slugs: redirect-only compatibility URLs to `/peluang-usaha` query-param states.
- `/tag/[slug]/`, article/static pages: migrate gradually from static export.

Auth routes:
- `/login`: Clerk sign-in surface.
- `/register`: role-selection and Clerk sign-up surface.
- `/daftar`: preserve current registration route during transition, then split into role-specific onboarding.

Dashboard routes:
- `/franchisee`: franchisee dashboard, saved opportunities, inquiries, profile.
- `/franchisor`: franchisor dashboard, listings, claim status, leads, assets.
- `/franchisor/listings/new`: create listing.
- `/franchisor/listings/[id]/edit`: edit listing.
- `/admin`: moderation, claim review, verification, data import tools.
- `DASHBOARD.md`: planning source for admin/staff overview, unclaimed outreach, claim review, listing operations, data quality, publishing, leads, and system health.

API/server routes:
- `POST /api/franchisees`: create/update franchisee profile.
- `POST /api/franchisors`: create/update franchisor profile.
- `POST /api/franchises`: create listing draft.
- `PATCH /api/franchises/[id]`: update listing draft/publish state.
- `POST /api/claims`: submit claim request.
- `POST /api/assets/upload-url`: issue R2 upload intent or direct upload endpoint.
- `GET /api/franchises`: directory search/filter endpoint backed by D1.

## Migration Phases

| Phase | Status | Scope |
| --- | --- | --- |
| 0. Documentation baseline | In progress | Root docs are centralized around `AGENTS.md`, `CODEBASE.md`, `AUDIT.md`, and `docs/README.md`; long form references moved under `docs/`. Keep reducing duplication as implementation changes. |
| 1. Data contract design | In progress | Initial shared-network D1 SQL migration created and applied remotely; TypeScript/Zod importer now maps current CSV snapshots into the first D1 schema. Next define reusable API/form payload schemas. |
| 2. Cloudflare project config | In progress | `wrangler.toml` now points to `franchise_db` and declares Pages output `dist` without unsupported `account_id`; migrations are applied through `cfman`. Cloudflare Pages project still must keep build command set to `pnpm run build` or `pnpm run build:astro`; R2 binding and environment split still pending. |
| 3. Import pipeline | In progress | `scripts/import-csv-to-d1.ts` imports CSV snapshots into D1, preserves `UNCLAIMED` sanitization and stable slugs, and has completed the first remote import. Runtime reads now use D1 first through `/get-franchises`. |
| 4. Auth foundation | In progress | Custom Clerk login/register surfaces, `/auth-config`, `/auth-sync`, `/clerk-webhook`, `/user-role`, `/sync-clerk-metadata`, D1 user mapping, D1-to-Clerk metadata snapshots, and D1 role checks are implemented. Next configure real Clerk env vars/dashboard settings and verify on Cloudflare Pages. |
| 5. Form API replacement | In progress | `/form-submit` now performs D1-only writes for franchisee, franchisor, claim, and dev test-data actions with Clerk session verification, D1 role checks, owner fields, and actor audit events. Next verify deployed form submissions against the real Pages binding and Clerk app. |
| 6. Asset pipeline | Pending | Move uploads to R2 with object ownership, validation, and public/served URLs. |
| 7. Public directory rebuild | In progress | D1-backed static HTML bridge generates root `/peluang-usaha/` output and a D1 snapshot; Astro static routes now generate canonical `/peluang-usaha`, flat detail pages, CSS-only image placeholders, readable yellow/category chip states, self-contained detail tabs, parsed public contact data for unclaimed listings, all-caps description presentation normalization, cleaned metadata, and redirect-only compatibility for old directory/category archives, then the build copies legacy static assets/pages without overwriting Astro output. Next add real popularity/view/lead metrics and verify deployed route precedence. |
| 8. D1-to-static publish automation | In progress | D1 dirty queue tables, `/form-submit` enqueueing, and the 30-minute GitHub Actions poller are implemented. Remaining setup: add GitHub secrets for Cloudflare API/deploy hook, push workflow, and verify the first dirty-to-build cycle. |
| 9. Dashboards | In progress | `/dashboard` and `/dashboard-data` now implement the Franchisee.id admin/staff MVP: protected D1 overview metrics, unclaimed WhatsApp outreach links, manual outreach logging, data-quality warnings, listing edit JSON-diff suggestions, admin approve/reject for suggestions and claims, lead summary, system-health readout, publish queue state, audit writes, and rebuild queue writes for approved public changes. `DASHBOARD.md` remains the progress tracker for richer field drawers, publish controls, payment metrics, and telemetry. |
| 10. Decommission Sheets dependency | Pending | Freeze or remove Sheets writes, keep optional import/export admin tooling only. |

## Long File Refactor Tracker

Current maintained code hotspots by line count:

| File | Approx. lines | Risk | Refactor direction | Status |
| --- | ---: | --- | --- | --- |
| `src/lib/franchise-static.ts` | 944 after first extraction | Still mixes D1 snapshot validation, directory/detail rendering, contact parsing, SEO, text normalization, and scoring. The generated CSS/JS injection and CSS placeholder rendering were extracted to `src/lib/franchise-static-assets.ts` on 2026-06-22. | Next split contact parsing, text normalization, and scoring into focused modules. | First extraction complete |
| `src/lib/franchise-static-assets.ts` | 620 | New helper owns generated directory/detail CSS/JS injection and CSS-only missing-image placeholders. Its length is mostly literal CSS/JS copied from the prior renderer. | Later move literal CSS into owned static CSS assets if the build pipeline can guarantee those assets on all generated pages. | Extracted |
| `functions/dashboard-data.js` | 845 | Dashboard API mixes action validation, authorization, reads, write workflows, and response shaping. | Split action handlers and query builders after dashboard behavior stabilizes. | Pending |
| `src/pages/dashboard/index.astro` | 792 | Static dashboard shell mixes markup, client JS, and role-aware UX states. | Extract client JS and section render helpers once dashboard sections settle. | Pending |
| `scripts/build-d1-franchise-pages.ts` | 736 | Builder mixes D1 fetch, snapshot shaping, file writing, manifest/prune behavior, and remote access fallback. | Split D1 fetch/snapshot writer/manifest pruning into modules after the Astro route bridge is stable. | Pending |
| `scripts/import-csv-to-d1.ts` | 664 | Importer mixes CSV parsing, validation, row mapping, SQL generation, and remote apply. | Split parser, mappers, and SQL writer before the next large import source is added. | Pending |

Refactor rule: prefer behavior-preserving extraction with validation after each step. Do not combine extraction with feature changes unless the feature needs the boundary.

## Migration Rules
- Do not remove existing form fields while migrating; map every current field to D1 or a deliberate archival field.
- Preserve `/peluang-usaha/[slug]` URLs where possible for SEO continuity.
- Preserve `/daftar?claim={slug}` behavior until the new claim flow is live and redirects are tested.
- Keep claim-search sanitization consistent during import, API search, and UI autocomplete.
- Use existing CSS first. Add framework dependencies for app/runtime only, not for styling.
- Keep generated/public static pages available until the new app routes are equivalent.
- Use TypeScript and Zod for new migration code; legacy JavaScript can remain until touched.
- Apply D1 schema changes through committed SQL migrations only.
- Keep role authorization in D1 server-side checks; do not trust Clerk unsafe metadata or client-visible hints for protected actions.

## Risks And Required Decisions
- Decide Astro vs Next.js before scaffolding. Current recommendation: Astro.
- Decide whether Cloudflare Pages or Workers static assets should be the deployment target for the new app. Current recommendation: Workers-compatible Cloudflare adapter route, preserving Pages-style static hosting if practical.
- Clerk organizations need a later product decision: they may be useful if one franchisor manages multiple brands or staff, but the initial authorization source remains D1 roles.
- D1 needs an approval/revision model before franchisors can edit live public pages.
- R2 public access strategy must be decided: public bucket/custom domain, signed proxy route, or hybrid.
- Legacy static HTML volume is large; migration should prioritize app-critical routes instead of converting every exported page at once.

## Immediate Next Work
1. Deploy/test `/get-franchises` and `/form-submit` against Cloudflare Pages with the `franchise_db` binding and compare real frontend behavior against the previous Sheets-backed behavior.
2. Decide deployment cutover for Astro output: either deploy `dist/` as the Cloudflare Pages output or continue writing selected generated pages into the legacy root during transition.
3. Extract reusable TypeScript/Zod schemas into shared modules so the function-level schemas, importer schemas, and future Astro server routes do not drift.
4. Configure Clerk production/preview environment variables and verify `/login`, `/register`, `/auth-sync`, and `/form-submit` on Cloudflare Pages.
5. Build protected role landing pages for `/franchisee`, `/franchisor`, and later `/admin`.

## Import Status
- First D1 CSV importer: `scripts/import-csv-to-d1.ts`.
- Source snapshots: `csv/franchisors.csv`, `csv/unclaimed.csv`, `csv/franchisee.csv`.
- Validation: TypeScript compile check and importer dry run pass.
- Remote import target: Cloudflare D1 `franchise_db` through `npx cfman wrangler --account franchise-network`.
- Remote result verified on 2026-06-16: 197 franchises, 190 packages, 197 site publications, 2 franchisee profiles, 1 franchisor profile, and 199 legacy source rows.
- Re-running the importer is idempotent for entity rows because generated ids are stable and inserts use conflict guards.
- `import_batches` currently contains two completed records for this first import work: the initial timestamped successful apply and the deterministic batch-id rerun. Entity row counts did not duplicate.

## Public Generation Status
- First D1 public page builder: `scripts/build-d1-franchise-pages.ts`.
- Build commands: `pnpm run build:d1:franchises:dry` and `pnpm run build:d1:franchises`.
- Source of truth: published `franchise_site_publications` for `site_franchisee_id` joined to `franchises`.
- Output generated on 2026-06-16: `/peluang-usaha/index.html`, 197 D1-backed detail pages, `json/unclaimed-brands.json`, and `json/d1-generated-pages-manifest.json`. Current physical detail output target is flat `/peluang-usaha/[slug].html`.
- Rerun verification: dry-run after generation reported 197 detail pages skipped, index skipped, and no unclaimed JSON rewrite.
- Stale deletion rule: remove only files tracked in `json/d1-generated-pages-manifest.json` and containing the `d1-generated:franchisee.id` marker. Do not delete legacy/example `/peluang-usaha` folders that were not generated by this D1 builder.
- Astro scaffold: `astro.config.mjs`, `src/lib/franchise-static.ts`, `src/pages/peluang-usaha/index.astro`, and `src/pages/peluang-usaha/[slug].astro` now generate D1-backed static HTML from `json/d1-franchise-static-data.json`; Astro `build.format: "preserve"` makes detail output flat `.html`.
- Astro verification on 2026-06-17: `pnpm run build:astro` built 198 pages into `dist/` from the D1 snapshot.
- Directory route consolidation on 2026-06-22: `/peluang-usaha` is now the canonical directory page with manual query-param controls; `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/category`, and known category aliases are redirect-only compatibility paths.
- Missing image behavior: directory cards now render a pure CSS placeholder with brand/category initials when D1 has no cover/logo URL, avoiding 404s from absent WooCommerce placeholder images.
- Cosmetic/metadata cleanup on 2026-06-21 and 2026-06-22: removed the legacy header placeholder and fake blog author/date from detail pages, standardized generated category links to canonical `/peluang-usaha?kategori=...`, added compatibility redirects, improved breadcrumbs, replaced detail/listing missing image fallbacks with CSS placeholders or site-owned metadata fallback images, and added render-time all-caps description normalization.
- Detail contact/tab cleanup on 2026-06-22: detail pages now include self-contained tab JS/CSS, stronger contrast for yellow/category link states, styled CSS-only logo placeholders with fallback label text, stale legacy tab comments stripped from output, and parsed public contact rows for unclaimed listings using imported D1 phone/address data plus a claim CTA for corrections.
- Current popularity limitation: `/peluang-usaha?sort=populer` uses a deterministic listing-quality proxy until D1 stores real popularity metrics such as views, saved listings, lead counts, payments, or admin boosts.
- Compatibility note: Astro is pinned to 5.x for this Node 20.19.4 workspace; Astro 6 requires Node >=22.12.0.

## D1-To-Static Publish Automation Tracker
- Current reality: a D1 row update only changes runtime/API data. Static pages remain unchanged until a new Cloudflare Pages build runs the D1-backed Astro build.
- Target: every franchisor/admin write that affects public pages must enqueue a rebuild request for the affected `site_id` and `franchise_id`, but it must not trigger a Cloudflare Pages build immediately.
- Safe baseline trigger: a scheduled publish job runs twice daily and calls the Cloudflare Pages Deploy Hook only when pending rebuild requests exist.
- Preferred target trigger: a GitHub Actions poller runs every 30 minutes, checks D1 for pending rebuild requests, and calls the Cloudflare Pages Deploy Hook only when dirty and allowed by guardrails.
- Manual urgent trigger: an authenticated admin-only endpoint can trigger the deploy hook for time-sensitive edits, but this should be exceptional.
- Build behavior: Pages build runs `pnpm run build:astro`, reads current D1, emits `dist/`, and Cloudflare serves the new static HTML.
- Deployment config: Pages output directory is `dist` in `wrangler.toml`; Cloudflare Pages project settings must define a build command (`pnpm run build` preferred, or `pnpm run build:astro`) so dependencies are installed before Pages Functions are bundled.
- Hybrid output rule: after Astro builds, `scripts/copy-legacy-static.mjs` copies legacy static pages/assets into `dist` while skipping legacy `/peluang-usaha` and duplicate archive/category route folders. It also rewrites copied HTML links to canonical `/peluang-usaha` query URLs. This preserves old CSS/JS/images and lets Astro own the D1-backed directory route.
- Build-time D1 access: `pnpm run build` reads remote D1 through the Cloudflare D1 HTTP API. Cloudflare Pages must have `CLOUDFLARE_API_TOKEN` as a secret; `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_DATABASE_ID` are optional because current defaults are in the builder.
- Pages config rule: do not put `account_id` in `wrangler.toml`; Cloudflare Pages rejects it during config validation. Use the connected Pages project account, `cfman`, or GitHub env/vars for account context instead.
- Freshness target: normal edits appear on the next scheduled publish window or poll window; urgent admin-triggered edits can appear sooner.
- Recommended schedule: twice daily, e.g. 09:00 and 21:00 Asia/Jakarta.
- Cooldown/debounce meaning: group many D1 edits into one build window. For this project, the practical cooldown is the scheduled publish window, not a minutes-based timer.
- Strategy comparison: `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md`.
- Preferred upgrade path after the queue exists: GitHub Actions polls D1 every 30 minutes, exits quickly when no pending requests exist, and when dirty calls the Cloudflare Pages Deploy Hook only if publish guardrails allow it.
- GitHub direct `dist/` deploy is the fallback/upgrade mode if Cloudflare Pages build quota becomes constrained.
- Do not let the poller commit generated HTML/JSON output to `main`; that can trigger an extra Cloudflare Git-connected build and spend both systems for one content update.
- Implementation status on 2026-06-18:
  - Remote D1 migration `0003_site_publish_queue.sql` applied to `franchise_db`.
  - `site_publish_state` row exists for `site_franchisee_id` with `publish_mode='cloudflare_deploy_hook'`, `daily_publish_limit=12`, and `min_publish_interval_minutes=30`.
  - `/form-submit` enqueues rebuild requests for franchisor listing submit, claim submit, dev unclaimed create, and dev test-data clear.
  - `.github/workflows/d1-static-publish.yaml` runs at minutes 7 and 37, exits cleanly when no pending work exists, and does not commit generated output.
  - `wrangler.toml` declares `pages_build_output_dir = "dist"`, `package.json` exposes `pnpm run build`, and `.node-version` pins Node 20.19.4 for the Astro 5 build path.
  - `scripts/build-d1-franchise-pages.ts` now queries D1 via the Cloudflare HTTP API when a token is available, avoiding Wrangler account-discovery failures during Cloudflare Pages or CI builds.
- Implementation checklist:
  - [x] Add `site_rebuild_requests` migration.
  - [x] Add `site_publish_state` migration for per-site dirty/published timestamps and publish counters.
  - [x] Add shared enqueue helper for D1 mutation endpoints.
  - [ ] Add GitHub Actions secrets for D1 query/deploy access through Wrangler.
  - [ ] Verify Cloudflare Pages project build settings: build command `pnpm run build`, output directory `dist`, Node 20.x.
  - [ ] Add Cloudflare Pages secret `CLOUDFLARE_API_TOKEN` for build-time D1 reads if it is not already present in the Pages project.
  - [x] Add scheduled GitHub Actions poller that runs every 30 minutes and exits before dependency install/build when D1 is clean.
  - [x] Add Cloudflare Pages Deploy Hook publishing when D1 is dirty and guardrails allow a content publish.
  - [x] Keep direct `wrangler pages deploy dist` publishing as a documented fallback if Cloudflare build quota becomes constrained.
  - [ ] Add admin-only manual deploy endpoint for urgent publishing.
  - [x] Wire `/form-submit` public-page writes to enqueue rebuild requests.
  - [ ] Wire future listing edit/delete/admin publish endpoints to enqueue rebuild requests.
  - [ ] Add deployment verification/logging and stale request alerting.

## Runtime D1 API Status
- `/get-franchises` now validates query parameters with Zod and uses D1 first when `env.franchise_db` is available.
- Supported read params include `tab`, `purpose`, `q`, `category`, `limit`, `offset`, and optional `source=sheets` fallback.
- `purpose=claim-search&tab=UNCLAIMED` preserves strict brand sanitization and deduplication before returning autocomplete rows.
- Remote D1 SQL join for published `site_franchisee_id` franchise rows was verified on 2026-06-17 through `cfman`.

## Runtime D1 Write Status
- `/form-submit` now rejects writes if the D1 binding is missing.
- Franchisee submissions write `franchisee_profiles`, `legacy_source_rows`, and `audit_events`.
- Franchisor submissions write `franchisor_profiles`, `franchises`, `franchise_packages`, `franchise_site_publications`, `legacy_source_rows`, and `audit_events`.
- Claim submissions update the matched D1 `UNCLAIMED` franchise into a `FRANCHISOR` listing, add `franchise_claims`, and therefore remove it from D1 unclaimed claim search.
- Franchisor and claim submissions now enqueue `site_rebuild_requests` and update `site_publish_state` for `site_franchisee_id`.
- Dev test-data create/clear actions now operate in D1, not Google Sheets.
- Dev test-data create/clear actions now enqueue static publish rebuild requests because they affect public listing/claim-search output.
- `/form-submit` now verifies Clerk bearer tokens through `@clerk/backend`, maps Clerk users into D1 `users`, checks D1 roles, writes `user_id`/`owner_user_id`/`claimant_user_id`, and records `audit_events.actor_user_id`.
- Dev test-data create/clear actions require `staff` or `admin`.
- Remaining gap: production Clerk keys and allowed origins must be configured in Cloudflare Pages and Clerk Dashboard before deployed browser testing.

## Clerk Auth Status
- Dependencies: `@clerk/backend` and `@clerk/clerk-js`.
- Custom UI: `js/auth-clerk.js` plus `css/auth-clerk.css`; no Clerk prebuilt components are used.
- Routes/endpoints: `/login/`, `/register/`, `/auth-config`, `/auth-sync`, `/clerk-webhook`, `/user-role`, `/sync-clerk-metadata`.
- Required env vars: `PUBLIC_CLERK_PUBLISHABLE_KEY` preferred for Astro/static runtime config, `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SIGNING_SECRET`; optional hardening via `CLERK_AUTHORIZED_PARTIES`. `/auth-config` also accepts `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_PUBLISHABLE_KEY` as compatibility fallbacks, and the browser auth script sets `window.__clerk_publishable_key` plus script data attributes before loading local `/clerk/clerk.browser.js` or CDN fallbacks.
- Clerk-to-D1 sync: `/clerk-webhook` verifies Clerk webhooks and syncs `user.created`, `user.updated`, and `user.deleted`.
- D1-to-Clerk sync: `/user-role` mutates D1 roles and immediately updates Clerk metadata; `/sync-clerk-metadata` repairs/backfills Clerk metadata from D1 after manual SQL edits.
- Important constraint: D1 has no automatic outbound trigger, so raw manual D1 role changes need explicit resync.
- Setup details live in `docs/architecture/CLERK_SETUP.md`.

## Documentation Alignment Rule
When editing any `.md` file, distinguish between:
- **Current transition layer:** static WordPress export, Cloudflare Pages Functions, Google Sheets/CSV, generated HTML, and legacy media URLs.
- **Target architecture:** Astro on Cloudflare, D1, R2, Clerk, and protected role-aware app routes.

Do not describe Google Sheets, Supabase, or Cloudinary as the future application stack.
