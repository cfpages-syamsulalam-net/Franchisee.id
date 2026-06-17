# Franchisee.id Technology Audit & Migration Tracker

Last updated: 2026-06-17 02:58 (Asia/Jakarta)

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
- `/peluang-usaha/`: searchable franchise directory.
- `/peluang-usaha/[slug]`: franchise detail page with SEO metadata and claim CTA; physical generated files should be flat `/peluang-usaha/[slug].html`.
- `/kategori/[slug]/`, `/tag/[slug]/`, article/static pages: migrate gradually from static export.

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
| 2. Cloudflare project config | In progress | `wrangler.toml` now points to `franchise_db` and migrations are applied through `cfman`; R2 binding and environment split still pending. |
| 3. Import pipeline | In progress | `scripts/import-csv-to-d1.ts` imports CSV snapshots into D1, preserves `UNCLAIMED` sanitization and stable slugs, and has completed the first remote import. Runtime reads now use D1 first through `/get-franchises`. |
| 4. Auth foundation | In progress | Custom Clerk login/register surfaces, `/auth-config`, `/auth-sync`, `/clerk-webhook`, `/user-role`, `/sync-clerk-metadata`, D1 user mapping, D1-to-Clerk metadata snapshots, and D1 role checks are implemented. Next configure real Clerk env vars/dashboard settings and verify on Cloudflare Pages. |
| 5. Form API replacement | In progress | `/form-submit` now performs D1-only writes for franchisee, franchisor, claim, and dev test-data actions with Clerk session verification, D1 role checks, owner fields, and actor audit events. Next verify deployed form submissions against the real Pages binding and Clerk app. |
| 6. Asset pipeline | Pending | Move uploads to R2 with object ownership, validation, and public/served URLs. |
| 7. Public directory rebuild | In progress | D1-backed static HTML bridge generates root `/peluang-usaha/` output and a D1 snapshot; Astro static routes now generate 198 pages into `dist/` from that snapshot. Next compare output and route deployment strategy before replacing legacy root pages. |
| 8. Dashboards | Pending | Build franchisee/franchisor/admin dashboards with protected routes. |
| 9. Decommission Sheets dependency | Pending | Freeze or remove Sheets writes, keep optional import/export admin tooling only. |

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
- Compatibility note: Astro is pinned to 5.x for this Node 20.19.4 workspace; Astro 6 requires Node >=22.12.0.

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
- Dev test-data create/clear actions now operate in D1, not Google Sheets.
- `/form-submit` now verifies Clerk bearer tokens through `@clerk/backend`, maps Clerk users into D1 `users`, checks D1 roles, writes `user_id`/`owner_user_id`/`claimant_user_id`, and records `audit_events.actor_user_id`.
- Dev test-data create/clear actions require `staff` or `admin`.
- Remaining gap: production Clerk keys and allowed origins must be configured in Cloudflare Pages and Clerk Dashboard before deployed browser testing.

## Clerk Auth Status
- Dependencies: `@clerk/backend` and `@clerk/clerk-js`.
- Custom UI: `js/auth-clerk.js` plus `css/auth-clerk.css`; no Clerk prebuilt components are used.
- Routes/endpoints: `/login/`, `/register/`, `/auth-config`, `/auth-sync`, `/clerk-webhook`, `/user-role`, `/sync-clerk-metadata`.
- Required env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (or fallback `CLERK_PUBLISHABLE_KEY`), `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SIGNING_SECRET`; optional hardening via `CLERK_AUTHORIZED_PARTIES`.
- Clerk-to-D1 sync: `/clerk-webhook` verifies Clerk webhooks and syncs `user.created`, `user.updated`, and `user.deleted`.
- D1-to-Clerk sync: `/user-role` mutates D1 roles and immediately updates Clerk metadata; `/sync-clerk-metadata` repairs/backfills Clerk metadata from D1 after manual SQL edits.
- Important constraint: D1 has no automatic outbound trigger, so raw manual D1 role changes need explicit resync.
- Setup details live in `docs/architecture/CLERK_SETUP.md`.

## Documentation Alignment Rule
When editing any `.md` file, distinguish between:
- **Current transition layer:** static WordPress export, Cloudflare Pages Functions, Google Sheets/CSV, generated HTML, and legacy media URLs.
- **Target architecture:** Astro on Cloudflare, D1, R2, Clerk, and protected role-aware app routes.

Do not describe Google Sheets, Supabase, or Cloudinary as the future application stack.
