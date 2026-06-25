# Franchisee.id Codebase Map

Last updated: 2026-06-25 16:43 (Asia/Jakarta)

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
| `js/build-listing.js` | Legacy static-site builder for `/peluang-usaha/index.html`; fetches `FRANCHISOR` and `UNCLAIMED`, merges/sorts tiers, renders listing cards with a neutral `Info Franchise` detail CTA, and regenerates `json/unclaimed-brands.json`. | `templates/peluang-usaha-tpl.html`, `csv/franchisors.csv`, `csv/unclaimed.csv`, Google Sheets, `json/unclaimed-brands.json` |
| `js/build-details.js` | Static-site builder for individual `/peluang-usaha/{slug}/index.html` pages; injects brand fields, JSON-LD, breadcrumbs, unclaimed disclaimers, tabs, and sticky claim CTA. | `templates/detail-franchise-tpl.html`, Google Sheets, `/daftar?claim={slug}` |
| `js/build-sitemap.js` | Generates `sitemap-complete.xml` from franchisor and unclaimed brands. | Google Sheets, CSV fallback, generated detail URLs |
| `functions/get-franchises.js` | Cloudflare Function API for directory/claim-search reads. D1-first through the `franchise_db` binding, validates query params with Zod, preserves `purpose=claim-search` sanitization, and keeps a Sheets read fallback only when D1 is unavailable or explicitly requested. | Cloudflare D1 `franchise_db`, `js/form-02-claim-workflow.js`, legacy Sheets read fallback |
| `functions/form-submit.js` | Cloudflare Function API for franchisee, franchisor, claim, and dev test-data submissions. D1-only writes with Zod payload validation, duplicate checks, D1 claim cleanup, D1 profile/listing/package/publication/claim/audit writes, D1 static rebuild queue writes for public-page-affecting listing changes, and no new Google Sheets writes. | `js/form-06-submit-validation.js`, Cloudflare D1 `franchise_db`, `franchisee_profiles`, `franchisor_profiles`, `franchises`, `franchise_claims`, `franchise_packages`, `franchise_site_publications`, `site_rebuild_requests`, `site_publish_state`, `legacy_source_rows`, `audit_events` |
| `functions/profile-data.js` | Protected profile center API for `/profil`. GET returns the current D1 user, roles, franchisee/franchisor profiles, owned listings, claim history, franchisee recommendations, inquiry history, and completion state. POST validates account/profile/listing edits, public role additions, and franchisee inquiry creation with Zod; updates Clerk identity then D1 for account fields; writes D1 profile edits; lets public users add the missing `franchisee`/`franchisor` role; creates `franchise_leads` from profile recommendations; rate-limits owner listing edits to one per listing per 6 hours; writes audit events; and queues static rebuild requests for public listing changes. | `src/pages/profil/index.astro`, `js/profile-page.js`, `functions/_clerk-auth.js`, `functions/_site-publish-queue.js`, D1 `users`, `user_roles`, `franchisee_profiles`, `franchisor_profiles`, `franchises`, `franchise_claims`, `franchise_leads`, `audit_events`, `site_rebuild_requests` |
| `functions/_site-publish-queue.js` | Shared Pages Functions helper for public-page dirty queue writes. Exposes `SITE_FRANCHISEE_ID` and `siteRebuildStatements()` so D1 mutations can enqueue rebuild requests and update per-site publish state in the same batch. | `functions/form-submit.js`, D1 `site_rebuild_requests`, D1 `site_publish_state` |
| `functions/_clerk-auth.js` | Shared Clerk/D1 auth helper for Pages Functions. Verifies Clerk bearer tokens, fetches Clerk user data, upserts D1 `users`, applies pending `email_role_grants`, assigns only self-assignable roles, checks D1 roles before writes, lets `admin` satisfy protected-role checks while keeping `staff` limited to staff-level access, and pushes D1 role snapshots to Clerk metadata. | `@clerk/backend`, `functions/auth-sync.js`, `functions/form-submit.js`, `functions/clerk-webhook.js`, D1 `users`, `user_roles`, `email_role_grants` |
| `functions/auth-config.js` | Public same-origin config endpoint for Clerk publishable key. Keeps static HTML environment-neutral and accepts Astro-style `PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_PUBLISHABLE_KEY`, plus a committed public live-key fallback because Clerk publishable keys are browser-safe. | `js/auth-clerk.js`, Cloudflare env |
| `functions/auth-sync.js` | Authenticated Clerk-to-D1 user sync endpoint. Maps the active Clerk user into D1 and self-assigns `franchisee` or `franchisor` when requested. | `functions/_clerk-auth.js`, `js/auth-clerk.js`, D1 `users`, `user_roles` |
| `functions/clerk-webhook.js` | Clerk-to-D1 lifecycle sync endpoint. Verifies Clerk webhooks and upserts/deletes D1 users from Clerk `user.created`, `user.updated`, and `user.deleted` events. | `@clerk/backend/webhooks`, Cloudflare env `CLERK_WEBHOOK_SIGNING_SECRET`, D1 `users` |
| `functions/dashboard-data.js` | Thin protected Franchisee.id dashboard API router. Requires D1 role `staff` or elevated `admin`, dispatches validated dashboard actions, and composes the GET response from dashboard query modules. | `functions/_dashboard-schemas.js`, `functions/_dashboard-queries.js`, `functions/_dashboard-actions.js`, `functions/_dashboard-utils.js`, `src/pages/dashboard/index.astro`, `js/dashboard-admin.js` |
| `functions/_dashboard-schemas.js` | Dashboard action schemas, site constants, editable-listing field whitelist, field normalization, and update statement builder for dashboard listing edits. | `functions/dashboard-data.js`, `functions/_dashboard-actions.js`, Zod |
| `functions/_dashboard-queries.js` | Dashboard read model for overview metrics, data-quality warnings, publish state, unclaimed outreach queue plus outreach summary counts, pending claims, editable listings, recent outreach, edit suggestions, lead summary, and system health. Data-quality heuristics keep complex text checks in JavaScript instead of D1 `GLOB`/`LIKE` patterns. | `functions/dashboard-data.js`, `functions/_dashboard-utils.js`, D1 |
| `functions/_dashboard-actions.js` | Dashboard write workflows for manually confirmed WhatsApp outreach logging, structured listing edit suggestions, admin edit suggestion review, and admin claim review. Writes audit events and queues static rebuilds for approved public-page-affecting changes. | `functions/dashboard-data.js`, `functions/_dashboard-schemas.js`, `functions/_dashboard-queries.js`, `functions/_dashboard-utils.js`, `functions/_site-publish-queue.js`, D1 |
| `functions/_dashboard-utils.js` | Shared dashboard helper functions for JSON responses, audit statements, admin checks, JSON parsing, Indonesian WhatsApp parsing/link generation, grouped counts, likely all-caps checks, and ids. | `functions/_dashboard-queries.js`, `functions/_dashboard-actions.js` |
| `functions/user-role.js` | Admin-only D1 role mutation endpoint. Assigns/removes D1 roles and then pushes the D1 role snapshot to Clerk metadata. | `functions/_clerk-auth.js`, D1 `user_roles`, Clerk `users.updateUserMetadata` |
| `functions/sync-clerk-metadata.js` | Admin-only repair/backfill endpoint for pushing D1 user/role state into Clerk metadata after manual SQL changes. | `functions/_clerk-auth.js`, D1 `users`, `user_roles`, Clerk metadata |
| `js/auth-clerk-debug.js` | Masked Clerk/auth diagnostics module. Owns persisted debug events, `window.FranchiseAuth.getDebugSnapshot()` backing helpers, Clerk/session summaries, token/key/session hints, browser storage/cookie key inspection, and debug value sanitization. Must load before `js/auth-clerk.js` on auth-enabled pages. | `js/auth-clerk.js`, `/dashboard`, `/sso-callback`, `/login`, `/register`, `/daftar` |
| `js/auth-clerk.js` | Custom ClerkJS client integration. Replaces the legacy `/login` WPForms block with public login/register/verification panels, supports Google sign-in/sign-up through the hidden `/sso-callback/` route, runs Clerk OAuth redirect callbacks on the callback route even when Clerk returns without visible URL params, requires role selection before public registration, stores selected public registration role and role-specific `/daftar` completion destination across OAuth redirects before `/auth-sync`, syncs pending public roles as soon as `Auth.syncUser()` runs, shows a login-required message when `/daftar` redirects anonymous users to `/login?next=...`, keeps admin/staff sessions inspectable on auth pages instead of hiding the forms, supports a login-only staff/admin variant for `/dashboard` that always returns to `/dashboard/` after login, keeps inactive auth panels hidden, exposes `window.FranchiseAuth`, supplies bearer tokens to protected form writes, has a public publishable-key fallback if `/auth-config` is stale or empty, sets Clerk's script-load publishable-key global/attributes, loads locally copied ClerkJS before CDN fallbacks, and delegates sanitized cross-page SSO diagnostics to `js/auth-clerk-debug.js`. | `js/auth-clerk-debug.js`, `/auth-config`, `/auth-sync`, `/login`, `/dashboard`, `/sso-callback`, `/daftar`, `js/form-06-submit-validation.js`, `/clerk/clerk.browser.js` |
| `js/auth-navbar.js` | Public navbar auth-state controller. On pages with legacy HFE nav menus, normalizes logged-out `Login`/`Daftar` links to `Masuk` and `Daftar Mitra` pointing at protected `/daftar/`, then replaces them after Clerk/D1 sync with Font Awesome account/logout icons, account name, D1 role badge, `/profil/` account link, and red icon-only logout. | `js/auth-clerk.js`, `css/auth-clerk.css`, `/login`, `/daftar`, `/profil`, franchise directory/detail templates |
| `js/shared-tooltip.js` | Shared custom tooltip runtime. Uses `data-fr-tooltip`, renders one body-level fixed tooltip so parent overflow cannot clip hints, shows on hover/focus instantly, upgrades supported legacy interactive `title` attributes by removing the browser tooltip, and observes dynamically inserted UI. | `css/shared-tooltip.css`, `/login`, `/daftar`, `/profil`, `/dashboard`, `/sso-callback`, franchise directory/detail templates, `js/profile-page.js`, `js/auth-navbar.js`, `src/lib/franchise-static.ts` |
| `css/auth-clerk.css` | Custom auth UI styling built on existing Astra/global colors and Font Awesome icon classes. Explicitly preserves `[hidden]` tab/panel behavior against legacy display rules, constrains inputs/buttons inside the auth panel under legacy CSS, and styles animated segmented auth tabs with readable active contrast, inline label/input rows, centered actions/notes, role-first registration controls, Google OAuth buttons, and compact public navbar account/logout controls. | `/login`, `/dashboard`, `/daftar`, franchise directory/detail templates |
| `css/shared-tooltip.css` | Shared tooltip styling for the body-level `fr-tooltip` layer and `data-fr-tooltip` triggers. Keeps tooltip hints instant, high-z-index, viewport-clamped, and independent from parent overflow. | `js/shared-tooltip.js`, auth/profile/dashboard/public generated pages |
| `css/profile.css` | Protected profile page styling. Owns `/profil` header, side-tab layout, profile forms, identity lock notes, role add-on cards/modal, franchisee opportunity cards, budget-fit badges, listing selector, notices, and responsive collapse behavior while reusing the public site color language and Font Awesome cues. | `src/pages/profil/index.astro`, `js/profile-page.js` |
| `css/dashboard.css` | Dashboard-only layout and component styling. Owns metric cards, Font Awesome-led tab controls, panel grids, dashboard tables/forms/buttons/badges, debug panel, and responsive dashboard behavior. | `src/pages/dashboard/index.astro`, `js/dashboard-admin.js` |
| `js/form-01-state-helpers.js` | Shared `window.FranchiseForm` state, constants, sanitizers, claim persistence, and franchisor draft persistence. | All form modules, `localStorage`, claim search, autosave |
| `js/form-02-claim-workflow.js` | Claim-search data loading, autocomplete UI, claim-mode prefill, and claim-mode exit. | `json/unclaimed-brands.json`, `/get-franchises`, `window.openTab`, franchisor form |
| `js/form-03-navigation-steps.js` | Registration tab switching, animated tab-indicator positioning, and franchisor 5-step navigation/validation. | `/daftar/index.html` onclick handlers, `form-utils.js`, `localStorage` |
| `js/form-04-calculation-city.js` | Investment/BEP calculation and city autocomplete loader. | `/json/data-kota-id.json` if present, remote city JSON fallback, form fields |
| `js/form-05-country-whatsapp.js` | Country-code dropdown rendering, flag fallback, and WhatsApp normalization. | `json/country-codes.json`, submit pipeline |
| `js/form-06-submit-validation.js` | Live validation binding, unified submit pipeline to `/form-submit`, Clerk bearer-token attachment through `window.FranchiseAuth`, and aggressive franchisor autosave triggers. | `functions/form-submit.js`, `js/auth-clerk.js`, `form-utils.js`, `form-01-state-helpers.js` |
| `js/form-07-init.js` | DOMContentLoaded bootstrap for form modules, HAKI conditional display, state restoration, role deep-link tab selection, Clerk login enforcement for `/daftar`, Clerk/D1 identity locking for franchisee/franchisor name/email/PIC fields, completed-profile redirect to `/profil/`, and compatibility globals. | All form modules, `/daftar/index.html`, `js/auth-clerk.js`, `/profile-data` |
| `js/form-08-franchisee-steps.js` | Separate 2-step franchisee form navigation and validation. | `franchiseeForm`, `localStorage` key `franchisee_form_step` |
| `js/form-09-test-data-generator.js` | Dev-only `?dev=1` form filler and test data cleanup UI. | `/form-submit`, form modules, Google Sheets test-data helpers |
| `js/form-utils.js` | Shared formatting, validation, UI helpers, and progress helpers exposed as globals. | Form modules and `/daftar/index.html` |
| `js/form-franchise.js` | Legacy non-executing shim. Do not add runtime logic here. | Historical compatibility only |
| `js/profile-page.js` | Client controller for `/profil`. Requires Clerk session, fetches `/profile-data`, renders side-tab profile sections for summary/account plus role-allowed franchisee/opportunities/franchisor/listings/claims areas, offers missing public role add-on CTAs with confirmation, renders franchisee recommendations/saved opportunities/inquiry history, creates one-click franchise inquiries with Clerk bearer tokens, unlocks account identity through an edit icon, submits profile mutations, and exposes admin/staff dashboard shortcut only when D1 roles allow it. | `src/pages/profil/index.astro`, `functions/profile-data.js`, `js/auth-clerk.js`, `css/profile.css`, browser `localStorage` |
| `scripts/import-csv-to-d1.ts` | TypeScript/Zod importer that validates `csv/franchisors.csv`, `csv/unclaimed.csv`, and `csv/franchisee.csv`, generates idempotent SQL for `franchise_db`, preserves strict `UNCLAIMED` claim-search sanitization, and can apply remotely through `cfman`. | `migrations/0001_initial_network_schema.sql`, `/csv`, `.context/d1-import-franchise-data.sql`, Cloudflare D1 `franchise_db` |
| `scripts/build-d1-franchise-pages.ts` | TypeScript/Zod D1-backed public page bridge. Reads published `site_franchisee_id` rows from `franchise_db` through the Cloudflare D1 HTTP API when `CLOUDFLARE_API_TOKEN` is available, with Wrangler/cfman as local fallback; renders `/peluang-usaha/index.html` cards with neutral `Info Franchise` detail CTAs and flat `/peluang-usaha/{slug}.html` detail files, canonicalizes legacy navbar/footer/category links to `/peluang-usaha` query URLs, includes public `phone`/`office_address` plus franchisor contact/social fields in the Astro snapshot, regenerates claim-search JSON, skips unchanged pages by manifest hash, and prunes only previously D1-generated pages. | `templates/peluang-usaha-tpl.html`, `templates/detail-franchise-tpl.html`, `json/d1-franchise-static-data.json`, `json/d1-generated-pages-manifest.json`, `json/unclaimed-brands.json`, `/peluang-usaha`, Cloudflare D1 HTTP API, Wrangler |
| `scripts/copy-legacy-static.mjs` | Post-Astro build copier for the hybrid deployment. Copies legacy static HTML/assets/directories into `dist` without overwriting existing Astro output, copies `@clerk/clerk-js/dist` to `dist/clerk` for local browser auth loading, skips legacy duplicate directory/category routes, and rewrites copied legacy HTML links from old archive URLs to canonical `/peluang-usaha` query URLs. | `package.json` `copy:legacy-static`, Cloudflare Pages output `dist`, legacy root static export, `node_modules/@clerk/clerk-js/dist` |
| `scripts/d1-static-publish-poller.mjs` | Dependency-free Node poller for GitHub Actions. Calls the Cloudflare D1 HTTP API to expire stale queued requests, check pending rebuild work, enforce per-site guardrails, call the Cloudflare Pages Deploy Hook in the default mode, and mark direct-deploy fallback status. | `.github/workflows/d1-static-publish.yaml`, D1 `site_rebuild_requests`, D1 `site_publish_state`, GitHub secrets `CLOUDFLARE_API_TOKEN` and `PAGES_DEPLOY_HOOK_FRANCHISEE_ID` |
| `src/lib/franchise-static.ts` | Astro-side renderer and Zod validator for the D1 franchise static snapshot. Converts D1 snapshot rows into listing/detail HTML using existing template placeholders, canonical `/peluang-usaha` query controls, neutral `Info Franchise` directory card CTAs, shared `data-fr-tooltip` status badges, legacy navbar/footer link canonicalization, deterministic recommendation/popular/abjad/category ordering, cleaned detail metadata, readable breadcrumbs/yellow chip states, stripped stale legacy tab comments, unclaimed public contact/address rendering, Indonesian phone parsing/normalization, all-caps description display normalization, and the same SEO/contact/social mapping as the bridge. | `json/d1-franchise-static-data.json`, `templates/peluang-usaha-tpl.html`, `templates/detail-franchise-tpl.html`, `src/lib/franchise-static-assets.ts`, Astro routes |
| `src/lib/franchise-static-assets.ts` | Generated asset helper for Astro franchise pages. Owns injected directory/detail CSS and inline JS plus CSS-only missing-image placeholders used by listing cards, category cards, and detail pages; directory badge tooltips override legacy card overflow so hover text can render above neighboring cards. Extracted from `src/lib/franchise-static.ts` to keep the renderer focused on data-to-template logic. | `src/lib/franchise-static.ts` |
| `src/pages/peluang-usaha/index.astro` | Astro static listing route for canonical `/peluang-usaha/`. Loads the D1 snapshot and renders the existing listing template with manual search, sort, category, and status controls during build. | `src/lib/franchise-static.ts`, `json/d1-franchise-static-data.json` |
| `src/pages/peluang-usaha/[slug].astro` | Astro static detail route that physically builds `/peluang-usaha/{slug}.html` under `build.format: "preserve"` while public links stay `/peluang-usaha/{slug}`. Uses `getStaticPaths` from the D1 snapshot so each franchise keeps an individually indexable HTML page. | `src/lib/franchise-static.ts`, `json/d1-franchise-static-data.json`, `astro.config.mjs` |
| `js/dashboard-admin.js` | Client controller for `/dashboard`. Boots Clerk auth through `window.FranchiseAuth`, fetches `/dashboard-data`, controls icon-led dashboard tabs, renders overview/outreach/quality/claim/edit/lead/health sections, shows outreach subset counts from `outreach_summary`, handles manual WhatsApp outreach logging, edit suggestions, admin review actions, and masked auth-debug copy/refresh controls. | `src/pages/dashboard/index.astro`, `functions/dashboard-data.js`, `css/dashboard.css`, `js/auth-clerk.js` |
| `src/pages/dashboard/index.astro` | Static protected dashboard shell at `/dashboard`. Shows a same-URL login-only Clerk form for unauthenticated staff/admin users, keeps operational panels locked until `/dashboard-data` authorizes D1 `staff` or elevated `admin`, loads Font Awesome, renders metric cards, Font Awesome-led tab navigation, dashboard panel shells, and the masked auth debug shell. Runtime data rendering/actions live in `js/dashboard-admin.js`; styles live in `css/dashboard.css`. | `js/dashboard-admin.js`, `functions/dashboard-data.js`, `js/auth-clerk-debug.js`, `js/auth-clerk.js`, `css/auth-clerk.css`, `css/dashboard.css`, Clerk, D1 |
| `src/pages/profil/index.astro` | Static protected user profile shell at `/profil`. Loads custom Clerk runtime, navbar auth state, Font Awesome, and `js/profile-page.js`; anonymous visitors are redirected client-side to `/login/?next=/profil/`. | `js/profile-page.js`, `functions/profile-data.js`, `js/auth-clerk-debug.js`, `js/auth-clerk.js`, `js/auth-navbar.js`, `css/auth-clerk.css`, `css/profile.css` |
| `src/pages/sso-callback/index.astro` | Hidden static Clerk OAuth callback route. Loads `js/auth-clerk-debug.js` and `js/auth-clerk.js`, lets `Auth.init()` run `clerk.handleRedirectCallback()`, redirects to the saved pending destination only after a session is active, and otherwise shows masked callback debug with an icon-only copy button. This page should be listed in Clerk allowed redirect/application URLs but is not a separate login surface. | `js/auth-clerk-debug.js`, `js/auth-clerk.js`, Clerk Google OAuth, `/login`, `/register`, `/dashboard` |
| `public/_redirects` | Cloudflare Pages redirect rules. Redirects legacy duplicate directory/category URLs (`/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/category`, and known category aliases) to canonical `/peluang-usaha` query-param URLs. | Astro public asset copy, Cloudflare Pages |

## Supporting Files

| File/Directory | Role |
| --- | --- |
| `templates/peluang-usaha-tpl.html` | Large static template with `<!-- DYNAMIC_FRANCHISE_LISTING -->` placeholder. Header/footer directory links point directly to canonical `/peluang-usaha` query URLs. |
| `templates/detail-franchise-tpl.html` | Large static detail template with placeholders such as `{BRAND_NAME}`, `{SLUG}`, `{DYNAMIC_TABS_CONTENT}`, and `<!-- DYNAMIC_DISCLAIMER_BOX -->`. Header/footer/category links point directly to canonical `/peluang-usaha` query URLs. |
| `daftar/index.html` | Static initial profile/listing completion page that loads `css/form-franchise.css`, all modular form scripts, and the custom Clerk/navbar runtime. Treat as integration context and preserve every field. Anonymous visitors are redirected to `/login?next=...`; completed users are redirected to `/profil/`; known Clerk/D1 identity fields are read-only. |
| `login/index.html` | Legacy static login page shell. The old WPForms block is replaced at runtime by `js/auth-clerk.js` with custom Clerk `Masuk`/`Buat Akun` UI. |
| `register/index.html` | Compatibility redirect page; canonical public registration is `/login?mode=register`. Cloudflare `_redirects` also redirects `/register` and `/register/`. |
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
| `docs/architecture/AUTH_ONBOARDING_NAV_PLAN.md` | Progress tracker and implementation plan for public account entry: role-first registration, post-auth `/daftar` completion, public role add-on/correction flow, Clerk-prefilled form fields, animated auth/form toggles, and logged-in navbar account state. |
| `docs/architecture/PROFILE_PAGE_PLAN.md` | Progress tracker and implementation plan for protected `/profil`: account identity, franchisee/franchisor profile ownership, franchisee recommendation value surfaces, owned listing management, claim status, `/daftar` read-only identity fields, and owner-facing profile APIs. |
| `DASHBOARD.md` | Admin/staff dashboard plan covering overview, listing operations, unclaimed outreach, claim review, data quality, publishing, leads, system health, roles, and MVP sequencing. |
| `migrations/0001_initial_network_schema.sql` | First D1 schema migration for shared network sites, users/roles, profiles, franchises, claims, assets, leads, site publications, subscriptions/entitlements, imports, and audit events. |
| `migrations/0002_add_franchisor_social_links.sql` | Adds optional Facebook, TikTok, YouTube, and LinkedIn URL columns to `franchisor_profiles`; website and Instagram already existed. |
| `migrations/0003_site_publish_queue.sql` | Adds `site_rebuild_requests` and `site_publish_state` for D1-to-static publish queueing, per-site guardrails, and publish mode tracking. Applied remotely to `franchise_db` on 2026-06-18. |
| `migrations/0004_dashboard_operations.sql` | Adds dashboard operation tables for unclaimed outreach events, staff auto-approval rules, and listing edit suggestions. Applied remotely to `franchise_db` on 2026-06-22 after setting `CLOUDFLARE_ACCOUNT_ID` for Wrangler account context. |
| `migrations/0005_email_role_grants.sql` | Adds `email_role_grants` for pre-authorizing roles by normalized email before a real Clerk user id exists. Applied remotely to `franchise_db` on 2026-06-24; `admin@alampintar.org` and `email@franchisor.id` have active pending `admin` grants for Google/email bootstrap. |
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
6. `functions/form-submit.js` verifies Clerk, maps the user into D1, requires the D1 `franchisee` role (or `admin`), validates the payload with Zod, checks D1 duplicates by email/WhatsApp, and writes `franchisee_profiles.user_id`, `legacy_source_rows`, and actor-aware `audit_events`.

### 3. Franchisor Listing Flow
1. `/daftar/index.html` loads `franchiseListingForm` and the modular `js/form-01-*` through `js/form-07-*` stack.
2. Step navigation and required validation are controlled by `js/form-03-navigation-steps.js`.
3. Field formatting and detailed validation live in `js/form-utils.js`.
4. BEP/minimum investment logic lives in `js/form-04-calculation-city.js`.
5. Country-code and WhatsApp normalization live in `js/form-05-country-whatsapp.js`.
6. Aggressive autosave stores draft field values in `localStorage` through `js/form-01-state-helpers.js` and `js/form-06-submit-validation.js`.
7. Submit posts to `/form-submit` with `form_type: "FRANCHISOR"`.
8. `js/auth-clerk.js` supplies a Clerk session bearer token; unauthenticated submits are blocked.
9. `functions/form-submit.js` verifies Clerk, maps the user into D1, requires the D1 `franchisor` role (or `admin`), validates with Zod, checks D1 duplicates, writes `franchisor_profiles.user_id`, `franchises.owner_user_id`, `franchise_packages`, `franchise_site_publications`, `legacy_source_rows`, and actor-aware `audit_events` in D1.

### 4. Claim Brand Flow
1. Detail pages for unclaimed brands link to `/daftar?claim={slug}` through `build-details.js`.
2. `js/form-07-init.js` opens the claim tab when the `claim` query exists.
3. `js/form-02-claim-workflow.js` loads `json/unclaimed-brands.json`; if unavailable, it calls `/get-franchises?tab=UNCLAIMED&purpose=claim-search`.
4. Claim search rows are sanitized and deduped in `build-listing.js`, `functions/get-franchises.js`, and `form-01-state-helpers.js`.
5. Selecting a brand switches to the franchisor form, fills brand/category/minimum capital, stores `unclaimed_id`, and persists claim mode in `localStorage`.
6. Submit changes `form_type` to `claim`; `functions/form-submit.js` requires the D1 `franchisor` role, updates the D1 unclaimed franchise into a free franchisor-owned listing, records a `franchise_claims` row with `claimant_user_id`, and changes the source sheet to `FRANCHISOR` so it no longer appears in unclaimed claim search.

### 5. Clerk Login/Register And D1 User Mapping Flow
1. `/login/` loads the legacy static page shell; `js/auth-clerk-debug.js` initializes masked diagnostics and `js/auth-clerk.js` replaces `#wpforms-725` with a custom login/register UI.
2. `/register/` redirects to `/login?mode=register`; registration is the `Buat Akun` tab in the `/login` auth UI.
3. `/dashboard/` mounts the same auth runtime as a login-only internal admin/staff surface with no public registration role selector.
4. Browser code fetches `/auth-config`, sets the resolved publishable key on Clerk's script-load global/attributes, loads locally copied ClerkJS from `/clerk/clerk.browser.js` with pinned CDN fallbacks, and signs users in/up with Clerk client APIs.
5. Email/password and Google OAuth are both supported. Google OAuth uses `/sso-callback/` as the Clerk `redirectUrl`, then returns to the saved `redirectUrlComplete` such as `/dashboard` or role-specific `/daftar/?role=...&continue=1`.
6. Public registration requires `Daftar sebagai` before email/password or Google SSO starts; the selected `franchisee`/`franchisor` role is stored across OAuth and synced through `/auth-sync` after Clerk session activation.
7. The custom browser bootstrap handles Clerk OAuth callbacks on `/sso-callback/` before token checks, even when the callback has no visible Clerk URL parameters, then clears stale callback parameters or navigates to the saved post-login URL.
8. After sign-up or sign-in, `/auth-sync` verifies the Clerk session, upserts D1 `users`, applies active `email_role_grants`, inserts self-assignable `franchisee`/`franchisor` roles when requested, and pushes the D1 role snapshot into Clerk metadata.
9. `/daftar` requires Clerk login before completion, opens the requested role tab when `?role=` is present, locks email/name/PIC fields from Clerk/D1 identity, and redirects completed users to `/profil/`.
10. Public navbar links are normalized by `js/auth-navbar.js`; logged-out `Daftar Mitra` points to protected `/daftar/`, anonymous users are redirected to `/login?next=...` with an explanatory message, and logged-in users see Font Awesome account/logout icons, name, D1 role badge, `/profil/` account link, and immediate red icon-only logout.
11. UI hints use the shared custom tooltip runtime (`data-fr-tooltip`) instead of browser `title` hints; legacy interactive titles loaded on shared-tooltip pages are upgraded at runtime.
12. Clerk Dashboard webhooks call `/clerk-webhook` for `user.created`, `user.updated`, and `user.deleted`; the endpoint verifies signatures and syncs D1 `users`.
13. D1 role changes initiated by the app use `/user-role`, which mutates D1 and then updates Clerk metadata. Manual SQL changes require `/sync-clerk-metadata` because D1 has no outbound webhook trigger.
14. `/form-submit` uses `functions/_clerk-auth.js` to verify the Clerk token, check D1 roles, sync Clerk metadata from current D1 roles, and attach D1 user ownership to profiles/listings/claims/audit rows.

### 5a. Protected Profile Flow
1. `/profil/` is a static Astro shell that loads the custom Clerk runtime and redirects anonymous users to `/login/?next=/profil/`.
2. `js/profile-page.js` fetches `/profile-data` with the Clerk bearer token and renders side tabs by D1-authoritative role: franchisee users see the franchisee section, franchisor users see franchisor/listing/claims sections, and admin/staff users see both.
3. If a public user is missing `franchisee` or `franchisor`, `/profil` shows an additive CTA, confirms the change, posts `add_public_role` to `/profile-data`, and redirects to the matching `/daftar` form.
4. Franchisee users see `Peluang Saya`, where `profile-data` recommends published franchises by category/budget, `js/profile-page.js` lets users save opportunities in browser storage, and `create_franchise_inquiry` writes one-click interest requests into `franchise_leads`.
5. `/profile-data` maps Clerk to D1 through `functions/_clerk-auth.js`, returns D1-authoritative roles and ownership rows, and exposes `/dashboard/` only when the user has `admin` or `staff`.
6. Account name/email are read-only until the edit icon is pressed; saves update Clerk first, then D1 `users` plus profile identity fields, and resync Clerk metadata from D1.
7. Franchisee/franchisor profile edits update existing D1 profile rows and write audit events; first-time completion still belongs to `/daftar/`.
8. Owner listing edits update whitelisted public fields directly in D1, are limited to one edit per listing per 6 hours, write audit events, and enqueue `site_rebuild_requests` instead of triggering an immediate build.

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

### 7b. Admin/Staff Dashboard Flow
1. `/dashboard` is a static Astro route and should be treated as an internal operations surface for Franchisee.id only.
2. The page loads `js/auth-clerk-debug.js`, `js/auth-clerk.js`, and `js/dashboard-admin.js`; unauthenticated users see the login-only staff/admin form on the same `/dashboard` URL.
3. `js/dashboard-admin.js` calls `/dashboard-data` with a Clerk bearer token when a session exists and presents details in Font Awesome-led tabs: Outreach, Data Quality, Review, and Operations.
4. `functions/dashboard-data.js` verifies Clerk, upserts the D1 user, requires D1 role `staff`, and therefore allows elevated `admin`.
5. `_dashboard-queries.js` reads overview metrics, unclaimed outreach rows, outreach summary counts, pending claims, pending edit suggestions, editable listing options, data-quality warnings, lead counts, system-health probes, and publish queue state from D1.
6. WhatsApp outreach uses staff personal WhatsApp through generated `wa.me` links; no WhatsApp API is involved.
7. Staff must manually confirm a sent WhatsApp message before `_dashboard-actions.js` logs `listing_outreach_events` and an `audit_events` row.
8. Staff edit suggestions store structured JSON diffs in `listing_edit_suggestions`; admin approvals write accepted values field-by-field to whitelisted `franchises` columns, write audit events, and queue static rebuilds.
9. Active `staff_auto_approval_rules` let trusted staff edits apply immediately while still recording the suggestion and audit trail.
10. Claim approvals update `franchise_claims`, attach `owner_user_id`/`franchisor_profile_id` when present, move unclaimed listings to free claimed state, write audit events, and queue static rebuilds.

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
- Pre-first-login admin/staff access should use `email_role_grants` instead of fake `users` rows. The real D1 user must be created from a Clerk user id during auth sync.
- Manual D1 role SQL must be followed by `/sync-clerk-metadata`; normal role changes should go through `/user-role`.
- `/form-submit` must remain D1-only. Do not restore Google Sheets write helpers unless the user explicitly asks for archive/export tooling.

## Known Implementation Gaps
- `js/build-sitemap.js` still uses naive CSV splitting in fallback mode, while `js/build-listing.js` uses quote-aware CSV parsing. This can corrupt sitemap entries when CSV fields contain commas/newlines.
- Google Sheets auth and parsing logic is duplicated in builders and functions.
- `functions/form-submit.js` now attaches Clerk-owned D1 users and role checks, but it still needs listing revision workflows, approval state transitions, and asset ownership.
- Login/register now exist as custom Clerk surfaces, but deployed Clerk environment variables and dashboard settings still need production verification.
- D1 write behavior still needs deployed Pages verification against the real binding after frontend submission testing.
- GitHub Actions publish polling needs repository secrets before it can run: `CLOUDFLARE_API_TOKEN` and `PAGES_DEPLOY_HOOK_FRANCHISEE_ID`; optional vars are `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, and `PAGES_PROJECT_NAME`.
