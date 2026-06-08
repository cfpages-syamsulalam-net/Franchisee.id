# Franchisee.id Codebase Map

Last updated: 2026-06-08 05:59 (Asia/Jakarta)

## Purpose
`CODEBASE.md` is the living map of project-owned logic. Keep it current whenever relevant files, functions, data contracts, routes, generated assets, or backend responsibilities change. The large WordPress-exported HTML files are mostly static surface; this document focuses on the runtime, builders, data files, templates, workflows, and integration points that define application behavior.

## Current Shape
Franchisee.id is a WordPress-to-static conversion hosted on Cloudflare Pages. Most pages are static HTML/CSS/JS exported from WordPress/Astra/Elementor. The interactive layer is custom JavaScript in `/js`, Cloudflare Pages Functions in `/functions`, generated/static data in `/json` and `/csv`, and GitHub Actions that rebuild generated directory pages from Google Sheets.

The current database of record is Google Sheets:
- `FRANCHISOR`: claimed/listed franchise brands.
- `UNCLAIMED`: scraped or imported potential brands that owners can claim.
- `FRANCHISEE`: prospective buyers/leads.

CSV files in `/csv` are local fallback/source snapshots. JSON files in `/json` are frontend runtime data assets, especially the sanitized claim-search list.

## Target Upgrade Direction
The current Sheets/CSV/functions implementation is a transition layer. The project direction is:
- Astro on Cloudflare for new public directory and application pages.
- Cloudflare D1 as the source of truth for users, franchisees, franchisors, franchises, claims, leads, packages, locations, assets metadata, and audit events.
- Cloudflare R2 for franchise media and proposal assets.
- Clerk for login/register, identity, roles, and protected franchisee/franchisor/admin routes.
- Existing CSS and form field names remain compatibility contracts until `FORM_SCHEMA.md`, `AUDIT.md`, and this file are updated together.

## Project-Owned Logic Files

| File | Role | Connected To |
| --- | --- | --- |
| `js/build-listing.js` | Static-site builder for `/peluang-usaha/index.html`; fetches `FRANCHISOR` and `UNCLAIMED`, merges/sorts tiers, renders listing cards, and regenerates `json/unclaimed-brands.json`. | `templates/peluang-usaha-tpl.html`, `csv/franchisors.csv`, `csv/unclaimed.csv`, Google Sheets, `json/unclaimed-brands.json` |
| `js/build-details.js` | Static-site builder for individual `/peluang-usaha/{slug}/index.html` pages; injects brand fields, JSON-LD, breadcrumbs, unclaimed disclaimers, tabs, and sticky claim CTA. | `templates/detail-franchise-tpl.html`, Google Sheets, `/daftar?claim={slug}` |
| `js/build-sitemap.js` | Generates `sitemap-complete.xml` from franchisor and unclaimed brands. | Google Sheets, CSV fallback, generated detail URLs |
| `functions/get-franchises.js` | Cloudflare Function API for reading Google Sheets rows; supports `purpose=claim-search` to return sanitized `UNCLAIMED` rows. | Google Sheets, `js/form-02-claim-workflow.js`, Cloudinary URL transforms |
| `functions/form-submit.js` | Cloudflare Function API for all registration/claim submissions; writes to Google Sheets, checks duplicates, handles claim migration, and test-data helpers. | `js/form-06-submit-validation.js`, Google Sheets, `UNCLAIMED` cleanup |
| `js/form-01-state-helpers.js` | Shared `window.FranchiseForm` state, constants, sanitizers, claim persistence, and franchisor draft persistence. | All form modules, `localStorage`, claim search, autosave |
| `js/form-02-claim-workflow.js` | Claim-search data loading, autocomplete UI, claim-mode prefill, and claim-mode exit. | `json/unclaimed-brands.json`, `/get-franchises`, `window.openTab`, franchisor form |
| `js/form-03-navigation-steps.js` | Registration tab switching and franchisor 5-step navigation/validation. | `/daftar/index.html` onclick handlers, `form-utils.js`, `localStorage` |
| `js/form-04-calculation-city.js` | Investment/BEP calculation and city autocomplete loader. | `/json/data-kota-id.json` if present, remote city JSON fallback, form fields |
| `js/form-05-country-whatsapp.js` | Country-code dropdown rendering, flag fallback, and WhatsApp normalization. | `json/country-codes.json`, submit pipeline |
| `js/form-06-submit-validation.js` | Live validation binding, unified submit pipeline to `/form-submit`, and aggressive franchisor autosave triggers. | `functions/form-submit.js`, `form-utils.js`, `form-01-state-helpers.js` |
| `js/form-07-init.js` | DOMContentLoaded bootstrap for form modules, HAKI conditional display, state restoration, and compatibility globals. | All form modules, `/daftar/index.html` |
| `js/form-08-franchisee-steps.js` | Separate 2-step franchisee form navigation and validation. | `franchiseeForm`, `localStorage` key `franchisee_form_step` |
| `js/form-09-test-data-generator.js` | Dev-only `?dev=1` form filler and test data cleanup UI. | `/form-submit`, form modules, Google Sheets test-data helpers |
| `js/form-utils.js` | Shared formatting, validation, UI helpers, and progress helpers exposed as globals. | Form modules and `/daftar/index.html` |
| `js/form-franchise.js` | Legacy non-executing shim. Do not add runtime logic here. | Historical compatibility only |

## Supporting Files

| File/Directory | Role |
| --- | --- |
| `templates/peluang-usaha-tpl.html` | Large static template with `<!-- DYNAMIC_FRANCHISE_LISTING -->` placeholder. |
| `templates/detail-franchise-tpl.html` | Large static detail template with placeholders such as `{BRAND_NAME}`, `{SLUG}`, `{DYNAMIC_TABS_CONTENT}`, and `<!-- DYNAMIC_DISCLAIMER_BOX -->`. |
| `daftar/index.html` | Static registration page that loads `css/form-franchise.css` and all modular form scripts. Treat as integration context and preserve every field. |
| `css/form-franchise.css` | Form CSS aggregator. Preserve import order. |
| `css/form-franchise/*.css` | Modular form styling for utilities, layout/tabs/steps, core fields, alerts/autocomplete, packages, and claim search. |
| `json/unclaimed-brands.json` | Generated sanitized claim-search data. Built by `js/build-listing.js`; frontend uses this before API fallback. |
| `json/country-codes.json` | Runtime country-code options for WhatsApp inputs. |
| `csv/franchisors.csv` | Local fallback/source snapshot for `FRANCHISOR`. |
| `csv/franchisee.csv` | Local fallback/source snapshot for `FRANCHISEE`. |
| `csv/unclaimed.csv` | Local fallback/source snapshot for `UNCLAIMED`. |
| `.github/workflows/generate-pages.yaml` | Scheduled/manual/repository-dispatch builder workflow for regenerated static directory pages. |
| `.github/workflows/head.yaml` | Legacy automation that injects `.head` content into every HTML file. Use cautiously because it touches many static exports. |
| `.github/workflows/sitemap-readme.yaml` | Manual workflow for sitemap/readme generation from HTML files. |

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
5. `functions/form-submit.js` appends a row to the `FRANCHISEE` sheet after duplicate checks.

### 3. Franchisor Listing Flow
1. `/daftar/index.html` loads `franchiseListingForm` and the modular `js/form-01-*` through `js/form-07-*` stack.
2. Step navigation and required validation are controlled by `js/form-03-navigation-steps.js`.
3. Field formatting and detailed validation live in `js/form-utils.js`.
4. BEP/minimum investment logic lives in `js/form-04-calculation-city.js`.
5. Country-code and WhatsApp normalization live in `js/form-05-country-whatsapp.js`.
6. Aggressive autosave stores draft field values in `localStorage` through `js/form-01-state-helpers.js` and `js/form-06-submit-validation.js`.
7. Submit posts to `/form-submit` with `form_type: "FRANCHISOR"`.
8. `functions/form-submit.js` appends to `FRANCHISOR`, defaults new listings to `status: "FREE"` and `is_verified: "FALSE"`.

### 4. Claim Brand Flow
1. Detail pages for unclaimed brands link to `/daftar?claim={slug}` through `build-details.js`.
2. `js/form-07-init.js` opens the claim tab when the `claim` query exists.
3. `js/form-02-claim-workflow.js` loads `json/unclaimed-brands.json`; if unavailable, it calls `/get-franchises?tab=UNCLAIMED&purpose=claim-search`.
4. Claim search rows are sanitized and deduped in `build-listing.js`, `functions/get-franchises.js`, and `form-01-state-helpers.js`.
5. Selecting a brand switches to the franchisor form, fills brand/category/minimum capital, stores `unclaimed_id`, and persists claim mode in `localStorage`.
6. Submit changes `form_type` to `claim`, writes the completed data to `FRANCHISOR`, and performs best-effort deletion from `UNCLAIMED`.

## Business Rules To Preserve
- Never remove or rename form fields without explicit user request and schema updates.
- Keep claim-search sanitization aligned across builder, API fallback, and frontend sanitizer.
- Keep form runtime modular in flat prefixed files; do not revive monolithic `js/form-franchise.js`.
- Keep JSON assets in `/json` and CSV assets in `/csv`.
- Keep static-first public franchise pages for SEO unless a migration plan explicitly replaces generation.
- Keep `CHANGELOG.md` updated for every file create/update/delete.

## Known Implementation Gaps
- `js/build-sitemap.js` still uses naive CSV splitting in fallback mode, while `js/build-listing.js` uses quote-aware CSV parsing. This can corrupt sitemap entries when CSV fields contain commas/newlines.
- Google Sheets auth and parsing logic is duplicated in builders and functions.
- `functions/form-submit.js` is append-oriented and does not model user ownership, listing revisions, approval state transitions, or asset ownership.
- Login/register routes are currently static legacy pages, not real authenticated app surfaces.
- `package.json` has no committed builder dependencies even though workflows install `googleapis` and `dotenv` dynamically.
