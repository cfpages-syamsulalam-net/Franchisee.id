# Project Knowledge

This file gives persistent project context: goals, commands, architecture, conventions, and gotchas.

## Quickstart
- Setup:
  - Ensure `.env` contains: `G_SHEET_ID`, `G_CLIENT_EMAIL`, `G_PRIVATE_KEY`.
  - Install runtime deps when needed: `npm install googleapis dotenv --no-save`.
- Dev:
  - Regenerate listing page: `node js/build-listing.js`
  - Regenerate detail pages: `node js/build-details.js`
  - Regenerate sitemap: `node js/build-sitemap.js`
  - Run all builders:
    ```bash
    node js/build-listing.js
    node js/build-details.js
    node js/build-sitemap.js
    ```
- Test:
  - No formal automated test suite currently configured.
  - Validate critical flows manually:
    - `pendaftaran` tab switching and form submission.
    - Claim workflow (`?claim=<slug>`) including `unclaimed_id` behavior.
    - Generated pages output in `/peluang-usaha`.

## Architecture
- Key directories:
  - `/js`: client logic and static site generators (`build-listing.js`, `build-details.js`, `build-sitemap.js`, `form-franchise.js`, `form-utils.js`).
  - `/functions`: Cloudflare Functions (`form-submit.js`, `get-franchises.js`) for API/form handling.
  - `/templates`: source templates used by builder scripts.
  - `/daftar`: static form page integrating custom JS.
  - `/data`: generated helper data (`unclaimed-brands.json`) for fast autocomplete.
  - `/.github/workflows`: automation pipelines.
- Data flow:
  - Source of content: Google Sheets tabs (`FRANCHISOR`, `UNCLAIMED`, `FRANCHISEE`).
  - Build scripts fetch sheet data and generate static HTML pages.
  - Claim/search UX reads static `data/unclaimed-brands.json` first; falls back to `/get-franchises?tab=UNCLAIMED&purpose=claim-search`.
  - `data/unclaimed-brands.json` must be generated from sanitized UNCLAIMED rows only (exclude URL/phone/address/legal-entity/contact-label noise and dedupe by `brand_name`).
  - Local CSV fallback in `js/build-listing.js` uses quote-aware parsing (`parseCSVRows`) to preserve correct column mapping when cells contain commas/newlines.
  - Form submission posts to Cloudflare Function `/form-submit`.
  - On successful claim, backend can remove claimed row from `UNCLAIMED`.

## Conventions
- Formatting/linting:
  - No enforced formatter/linter in repository currently.
  - Prefer surgical edits on large legacy HTML/JS files.
- Patterns to follow:
  - Treat `GEMINI.md` as architecture/governance source.
  - Treat `FORM_SCHEMA.md` as canonical form-input inventory.
  - Treat `TECHNICAL_INVENTORY.md` as canonical symbol/function inventory.
  - Keep `PRD.md` for roadmap/requirements only.
  - Log all file create/update/delete operations in `CHANGELOG.md` with timestamp.
  - Preserve static-first approach for SEO (generate pages, avoid runtime-heavy rendering).
- Things to avoid:
  - Do not do full rewrites of large legacy files (`/daftar/index.html`, `js/form-franchise.js`) unless explicitly required.
  - Do not remove/rename form fields without updating `FORM_SCHEMA.md`.
  - Do not introduce duplicate changelog/timeline logs in PRD.

## Gotchas
- `node --check` may fail in restricted sandbox environments with path-resolution EPERM; fall back to source inspection and targeted runtime-safe checks.
- `form-franchise.js` references optional UI helpers; guard optional global calls to prevent runtime errors when helper functions are absent.
- Workflow trigger policy:
  - Primary trigger: `repository_dispatch` from Google Sheets update automation.
  - Scheduled polling fallback exists, but actual build should run only when sheet hash changes.
