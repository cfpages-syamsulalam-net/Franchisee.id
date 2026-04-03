# CHANGELOG

Format:
- Header: `## YYYY-MM-DD HH:mm (Asia/Jakarta)`
- Sections: `### Added`, `### Changed`, `### Removed`

## 2026-04-04 05:35 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/build-listing.js`: tightened claim-brand row filter to exclude additional edge-case noise (`PT/CV/...` legal-entity labels, contact-label rows, and broader address-like rows), while preserving deduplicated canonical brand results.
- `functions/get-franchises.js`: aligned `purpose=claim-search` sanitization with the stricter edge-case filtering used by static builder/frontend.
- `js/form-franchise.js`: strengthened frontend claim suggestion guardrails with matching filters for legal-entity/contact-label/address-like rows and non-alphabetic labels.
- `data/unclaimed-brands.json`: regenerated from `unclaimed.csv` after edge-case hardening so local claim suggestions stay brand-name only.
- Documentation sweep for future iterations (reviewed all repository `.md` files; updated relevant references and guardrails in `AGENTS.md`, `GEMINI.md`, `KNOWLEDGE.md`, `FORM_SCHEMA.md`, `TECHNICAL_INVENTORY.md`, `PRD.md`, `QWEN.md`, `js/symbols_inventory.md`, and `js/technical_comparison.md`).

### Removed
- None.

## 2026-04-04 05:04 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/build-listing.js`: replaced naive CSV fallback parsing with a quote-aware parser (`parseCSVRows`) so local fallback no longer corrupts column mapping when fields contain commas/newlines.
- `data/unclaimed-brands.json`: regenerated from `unclaimed.csv` using claim-search sanitization (removes URL/phone/address/category-noise rows and deduplicates by `brand_name`) so Klaim autocomplete suggestions resolve to actual brand names.
- `TECHNICAL_INVENTORY.md`: synced `js/build-listing.js` inventory entries to document the new robust CSV parser and corrected `js/form-franchise.js` version label.

### Removed
- None.

## 2026-04-04 05:00 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/build-listing.js`: fixed UNCLAIMED-to-`data/unclaimed-brands.json` extraction by filtering non-canonical rows (URL/phone/noise rows), normalizing text values, and deduplicating by brand name before writing autocomplete data.
- `functions/get-franchises.js`: added `purpose=claim-search` mode for `tab=UNCLAIMED` to return sanitized claim-search rows directly from Google Sheets fallback API.
- `js/form-franchise.js`: updated live fallback fetch URL to `/get-franchises?tab=UNCLAIMED&purpose=claim-search` so claim autocomplete receives cleaned source rows.
- `TECHNICAL_INVENTORY.md`: synced inventory entries to document new claim-search sanitization flow in `js/form-franchise.js`, `js/build-listing.js`, and `functions/get-franchises.js`.

### Removed
- None.

## 2026-04-04 04:39 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-franchise.js`: improved Klaim autocomplete to show clean brand names only (filtering out URL-like and phone-like rows from `data/unclaimed-brands.json`) so search suggestions no longer display brand URL strings.
- `js/form-franchise.js`: made claim suggestion selection use stable source index (`data-idx`) instead of `id` lookup (many source rows have empty/non-unique `id`), ensuring selected suggestion maps to the correct brand row.

### Removed
- None.

## 2026-04-04 04:30 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: fixed tab hierarchy by inserting a missing closing `</div>` for `#tab-franchisor` before `#tab-klaim`, so Klaim tab is no longer nested under Franchisor and can render independently.

### Removed
- None.

## 2026-04-04 03:56 (Asia/Jakarta)
### Added
- `daftar/index.html`: restored Klaim tab informational content block ("Cara Klaim Brand") and fallback CTA link to Franchisor tab to recover missing guidance content without reintroducing deprecated duplicate claim form logic.

### Changed
- `daftar/index.html`: restored older Klaim tab copy from historical claim-flow lineage:
  - heading back to "Klaim Brand Anda & Lengkapi Profilnya"
  - search card title back to "Cari Brand Anda"
  - helper text restored to direct users to Franchisor tab when brand is not found.

### Removed
- None.

## 2026-04-04 03:36 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: aligned tab and step hierarchy with historical `/pendaftaran/index.html` by changing `.registration-tabs-wrapper` from `container mt-5` to `mb-5` (removes unwanted left-right gutter) and restoring the original step indicator structure (`.step-indicator > .step-item > .step-circle/.step-text`).
- `daftar/index.html`: restored progress bar style/placement to historical structure under `.step-indicator-wrapper` (`.progress.mt-2`, `bg-warning`, `height: 4px`).
- `css/form-franchise.css`: removed duplicate late-file overrides for `.registration-tabs` and `.tab-btn` that were conflicting with the primary tab style block and causing visual drift.

### Removed
- None.

## 2026-04-04 02:42 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: restored historical tab layout by closing `.registration-tabs-wrapper` immediately after `.registration-tabs` and removing the late extra wrapper close, so tab buttons no longer render side-by-side with tab content.

### Removed
- None.

## 2026-04-04 02:31 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: restored missing form input styling by re-adding the historical stylesheet include `<link rel="stylesheet" id="form-daftar-franchise" href="/css/form-franchise.css">`, matched from `/pendaftaran/index.html` lineage (1300+ lines).

### Removed
- None.

## 2026-03-09 22:05 (Asia/Jakarta)
### Added
- `KNOWLEDGE.md` as the single consolidated project knowledge document (merged from `.knowledge.md` and `knowledge.md` template structure).

### Changed
- `CHANGELOG.md` normalized into a consistent format across all entries.
- `AGENTS.md` updated to reference `KNOWLEDGE.md` instead of `.knowledge.md` and `knowledge.md`.

### Removed
- `.knowledge.md` (merged into `KNOWLEDGE.md`).
- `knowledge.md` (merged into `KNOWLEDGE.md`).

## 2026-04-04 00:45 (Asia/Jakarta)
### Added
- Temporary comparison files in `/progress` during `/pendaftaran` to `/daftar` history inspection:
  - `progress/old-pendaftaran-9699359.html`
  - `progress/current-astra.txt`
  - `progress/old-astra.txt`

### Changed
- `daftar/index.html`: restored missing Elementor `.entry-content` wrapper structure from the historical `/pendaftaran/index.html` lineage, including the outer page node, heading container, and section/column scaffolding, while keeping the current `/daftar` form functionality intact.
- `daftar/index.html`: restored the older Elementor widget hierarchy inside `.elementor-widget-wrap` for the Franchisee, Franchisor, and Klaim tabs, including heading widgets, intro text widgets, wpforms-style wrappers, and the richer Klaim search shell while preserving the current `/daftar` form logic.
- `AGENTS.md`: added missing guardrails copied from `GEMINI.md` (large-file edit safety, local context-file checks, post-edit line-count verification, inventory/schema sync reminder, changelog timestamp rule) and documented the historical rename from `/pendaftaran` to `/daftar`.

### Removed
- Temporary comparison files after restoration analysis:
  - `progress/old-pendaftaran-9699359.html`
  - `progress/current-astra.txt`
  - `progress/old-astra.txt`

## 2026-03-09 21:45 (Asia/Jakarta)
### Added
- Migrated historical development timeline entries from `PRD.md` into `CHANGELOG.md`.

### Changed
- `PRD.md`: removed ongoing timeline/changelog section; kept PRD for requirements and roadmap scope.
- `GEMINI.md`: set `CHANGELOG.md` as mandatory code-change log and defined timestamp format with timezone.
- `AGENTS.md`: aligned `PRD.md` instruction to non-changelog scope.

### Removed
- `PRD.md` "Development Timeline & Progress" section.

## 2026-03-09 21:30 (Asia/Jakarta)
### Added
- `.github/workflows/generate-pages.yaml`: Google Sheets hash-based change detection and persisted state (`.github/sheets-sync-state.json`) to skip unnecessary builds.

### Changed
- `.github/workflows/generate-pages.yaml`:
  - removed `push` trigger.
  - kept `repository_dispatch` (`sheet_update`) and `workflow_dispatch`.
  - added 15-minute scheduled polling fallback.
  - added concurrency guard and conditional build/commit behavior.
- `AGENTS.md`: added persistent changelog rule and markdown instruction index.

### Removed
- `generate-pages.yaml` dependency on repository push updates for triggering.

## 2026-03-09 20:55 (Asia/Jakarta)
### Added
- `AGENTS.md` initial local audit notes.

### Changed
- `js/form-franchise.js`:
  - guarded `window.renderPackageInputs(1)` calls when function is unavailable.
  - improved submit error fallback (`result.message || result.error || 'Gagal'`).

### Removed
- None.

## Historical Entries (Migrated from old PRD timeline)
- 2026-03-06 20:00: Project Kickoff (initial WordPress-to-Static analysis).
- 2026-03-06 20:15: Documentation Sync (PRD and GEMINI sync).
- 2026-03-06 20:30: Hybrid SSG engine updates for `UNCLAIMED`.
- 2026-03-06 21:00: Claim workflow UI implementation.
- 2026-03-06 21:30: Deep-linking and auto-fill (`?claim=slug`) support.
- 2026-03-06 22:00: GitHub Actions run-command bugfix.
- 2026-03-06 22:30: UI/CSS polish and migration to `css/form-franchise.css`.
- 2026-03-06 22:45: Static autocomplete via `data/unclaimed-brands.json`.
- 2026-03-06 23:15: Automated sync logic design via Google Sheets trigger.
- 2026-03-07 10:00: Post-claim cleanup in `UNCLAIMED`.
- 2026-03-07 12:30: SEO and sitemap enhancements (JSON-LD, breadcrumbs, sitemap).
- 2026-03-07 14:00: Logic inventory creation and refactor.
- 2026-03-07 15:00: Unified claim workflow merge.
- 2026-03-07 15:30: Final verification marked TODO (end-to-end claim process).
