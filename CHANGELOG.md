# CHANGELOG

Format:
- Header: `## YYYY-MM-DD HH:mm (Asia/Jakarta)`
- Sections: `### Added`, `### Changed`, `### Removed`

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
