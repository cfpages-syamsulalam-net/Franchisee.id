# Franchisee.id Technology Audit & Migration Tracker

Last updated: 2026-06-08 05:45 (Asia/Jakarta)

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
| Database | Cloudflare D1. | SQL model fits users, listings, claims, leads, packages, locations, approval states, and audit logs. |
| Assets | Cloudflare R2. | Durable storage for logos, covers, galleries, proposals, and imported legacy assets. |
| Auth | Clerk. | Hosted auth, register/login, user identity, and server-side auth context for protected pages/functions. |
| Backend | Cloudflare Workers/Pages Functions or Astro server routes. | Use D1/R2 bindings instead of Google API secrets and Sheets fetches. |
| Styling | Existing CSS. | Preserve visual consistency and avoid adding a styling dependency. |

Official platform notes checked during this audit:
- Cloudflare Workers bindings expose D1/R2 and other resources through `env` without embedding service secrets in application code: https://developers.cloudflare.com/workers/runtime-apis/bindings/
- Cloudflare D1 is built for SQL access through Workers bindings: https://developers.cloudflare.com/d1/get-started/
- Cloudflare R2 is accessed from Workers through bucket bindings: https://developers.cloudflare.com/r2/api/workers/
- Astro supports Cloudflare adapter deployments and Cloudflare bindings for non-static routes: https://developers.cloudflare.com/workers/frameworks/framework-guides/astro/
- Clerk has an Astro SDK with middleware, server helpers, and locals access: https://clerk.com/docs/reference/astro/overview
- Clerk also has Next.js quickstarts if the project later chooses Next.js: https://clerk.com/docs/quickstarts/nextjs-pages-router

## Proposed D1 Data Model

Initial tables to replace the Sheets tabs:
- `users`: Clerk user id, email, role flags, profile status.
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

## Route Plan

Public routes:
- `/`: existing homepage shell, later rebuilt as Astro page.
- `/peluang-usaha/`: searchable franchise directory.
- `/peluang-usaha/[slug]/`: franchise detail page with SEO metadata and claim CTA.
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
| 0. Documentation baseline | In progress | Create `CODEBASE.md` and `AUDIT.md`, add upkeep rule to `AGENTS.md`. |
| 1. Data contract design | Pending | Define D1 schema, migrations, seed/import scripts, and field mapping from Sheets/CSV. |
| 2. Cloudflare project config | Pending | Add `wrangler` config, D1 binding, R2 binding, local/preview/prod environments. |
| 3. Import pipeline | Pending | Import CSV/Sheets snapshots into D1; preserve `UNCLAIMED` sanitization and slugs. |
| 4. Auth foundation | Pending | Add Clerk register/login, roles, protected server routes, and Clerk user mapping. |
| 5. Form API replacement | Pending | Replace `/form-submit` Sheets writes with D1 transactions; keep current forms working during transition. |
| 6. Asset pipeline | Pending | Move uploads to R2 with object ownership, validation, and public/served URLs. |
| 7. Public directory rebuild | Pending | Rebuild listing/detail/search in Astro using existing styles and D1 data. |
| 8. Dashboards | Pending | Build franchisee/franchisor/admin dashboards with protected routes. |
| 9. Decommission Sheets dependency | Pending | Freeze or remove Sheets writes, keep optional import/export admin tooling only. |

## Migration Rules
- Do not remove existing form fields while migrating; map every current field to D1 or a deliberate archival field.
- Preserve `/peluang-usaha/[slug]` URLs where possible for SEO continuity.
- Preserve `/daftar?claim={slug}` behavior until the new claim flow is live and redirects are tested.
- Keep claim-search sanitization consistent during import, API search, and UI autocomplete.
- Use existing CSS first. Add framework dependencies for app/runtime only, not for styling.
- Keep generated/public static pages available until the new app routes are equivalent.

## Risks And Required Decisions
- Decide Astro vs Next.js before scaffolding. Current recommendation: Astro.
- Decide whether Cloudflare Pages or Workers static assets should be the deployment target for the new app. Current recommendation: Workers-compatible Cloudflare adapter route, preserving Pages-style static hosting if practical.
- Clerk roles/organizations need design: simple user roles may be enough initially; organizations may be better if one franchisor manages multiple brands or staff.
- D1 needs an approval/revision model before franchisors can edit live public pages.
- R2 public access strategy must be decided: public bucket/custom domain, signed proxy route, or hybrid.
- Legacy static HTML volume is large; migration should prioritize app-critical routes instead of converting every exported page at once.

## Immediate Next Work
1. Draft D1 schema and migration files.
2. Add a `wrangler` config with D1/R2 binding names.
3. Build a one-way importer from `csv/franchisors.csv`, `csv/unclaimed.csv`, and `csv/franchisee.csv`.
4. Add Clerk auth scaffold for `/login`, `/register`, and protected role landing pages.
5. Convert `/form-submit` into a D1-backed endpoint while keeping the existing frontend payload shape.

