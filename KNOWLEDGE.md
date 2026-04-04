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
    - `daftar` tab switching and form submission.
    - Claim workflow (`?claim=<slug>`) including `unclaimed_id` behavior.
    - Generated pages output in `/peluang-usaha`.

## Architecture
- Key directories:
  - `/js`: client logic and static site generators (`build-listing.js`, `build-details.js`, `build-sitemap.js`, `form-utils.js`, `form-01-state-helpers.js` ... `form-07-init.js`).
  - `/functions`: Cloudflare Functions (`form-submit.js`, `get-franchises.js`) for API/form handling.
  - `/templates`: source templates used by builder scripts.
  - `/daftar`: static form page integrating custom JS.
  - `/json`: centralized JSON assets (generated/static), including claim-search dataset and form configuration.
  - `/csv`: centralized CSV fallback/source files for SSG scripts.
  - `/css/form-franchise`: modularized form stylesheet files + selector usage map (`CSS_USAGE_MAP.md`).
  - `/.github/workflows`: automation pipelines.
- Data flow:
  - Source of content: Google Sheets tabs (`FRANCHISOR`, `UNCLAIMED`, `FRANCHISEE`).
  - Build scripts fetch sheet data and generate static HTML pages.
  - Claim/search UX reads static `/json/unclaimed-brands.json` first; falls back to `/get-franchises?tab=UNCLAIMED&purpose=claim-search`.
  - `/json/unclaimed-brands.json` must be generated from sanitized UNCLAIMED rows only (exclude URL/phone/address/legal-entity/contact-label noise and dedupe by `brand_name`).
  - Country-code options for WhatsApp inputs are loaded from `/json/country-codes.json` (frontend fallback defaults exist if file is unavailable).
  - City autocomplete loader checks local `/json/data-kota-id.json` first, then falls back to `https://cekkode.github.io/json/data-kota-id.json`.
  - Local CSV fallback in `js/build-listing.js` uses quote-aware parsing (`parseCSVRows`) to preserve correct column mapping when cells contain commas/newlines.
  - Claim mode continuity: modular form scripts persist active claim context in `localStorage` key `franchise_claim_state`, restore it after refresh, and expire stale state after 24 hours (TTL).
  - Franchisor partial-entry continuity: modular form scripts persist draft values in `localStorage` key `franchisor_form_draft` with 72-hour TTL.
  - **Aggressive Auto-Save**: The franchisor form implements multi-layer auto-save with 6 independent triggers:
    1. Debounced save on input/change (300ms delay)
    2. Periodic safety-net save every 5 seconds
    3. Save before step navigation (next/previous)
    4. Save on browser visibility change (tab switch/minimize)
    5. Save before page unload (refresh/close)
    6. Save on registration tab switch
  - Auto-save includes error handling, visual feedback (`#autosave-indicator`), and automatic restoration on page load within TTL window.
  - Auto-save timers stop on successful form submission and clear all persisted data.
  - Form submission posts to Cloudflare Function `/form-submit`.
  - On successful claim, backend appends to `FRANCHISOR` then performs best-effort deletion in `UNCLAIMED` (match by `id`, fallback by normalized `brand_name`).

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
  - Keep `/css/form-franchise.css` as the aggregator entrypoint; preserve `@import` order when adding/changing form styles.
- Things to avoid:
  - Do not do full rewrites of large legacy files (`/daftar/index.html`) unless explicitly required.
  - Do not reintroduce monolithic runtime logic into `js/form-franchise.js`; use the flat modular files (`js/form-01-*.js` ... `js/form-07-*.js`).
  - Do not remove/rename form fields without updating `FORM_SCHEMA.md`.
  - Do not introduce duplicate changelog/timeline logs in PRD.

## Gotchas
- Historical lineage: `/daftar/index.html` is a renamed continuation of `/pendaftaran/index.html`; when restoring legacy behavior, compare both paths in git history.
- Session continuity: keep/update timestamped summaries in `/.context/session-YYYYMMDD-HHmm.md` so future sessions can quickly recover latest decisions.
- `node --check` may fail in restricted sandbox environments with path-resolution EPERM; fall back to source inspection and targeted runtime-safe checks.
- Flag-emoji rendering in country-code dropdowns may vary by OS/browser font support; labels include country initials (`ID/MY/SG/US/AU`) as readable fallback.
- Runtime fallback is active in `js/form-05-country-whatsapp.js`: if flag glyphs are detected as non-distinct, dropdown labels are auto-rendered text-only (`ID +62`, etc.).
- Modular form runtime scripts reference optional UI helpers; guard optional global calls to prevent runtime errors when helper functions are absent.
- For personal cache-debugging on `/daftar`, use `?dev=1` via the `🧪` toggle (reveal/hide toggle with `Ctrl+Alt+D`) and/or DevTools `Network > Disable cache`.
- Workflow trigger policy:
  - Primary trigger: `repository_dispatch` from Google Sheets update automation.
  - Scheduled polling fallback exists, but actual build should run only when sheet hash changes.
