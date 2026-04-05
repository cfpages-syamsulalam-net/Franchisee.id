# CHANGELOG

Format:
- Header: `## YYYY-MM-DD HH:mm (Asia/Jakarta)`
- Sections: `### Added`, `### Changed`, `### Removed`

## 2026-04-04 21:30 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-08-franchisee-steps.js`:
  - Fixed `franchiseeNextStep()`: now validates current step (stepIndex - 1) before navigating to target step
  - Fixed `franchiseePrevStep()`: correctly calculates target step (stepIndex - 1)
  - Resolves "Validation failed for step 2" error when clicking LANJUT on step 1

### Removed
- None.

## 2026-04-04 21:15 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-05-country-whatsapp.js`:
  - Added `{ willReadFrequently: true }` to `canvas.getContext('2d')` call in `detectFlagEmojiSupport()`
  - Eliminates Canvas2D performance warning about multiple `getImageData()` operations

### Removed
- None.

## 2026-04-04 21:00 (Asia/Jakarta)
### Added
- **Enhanced franchisee step validation**:
  - Uses `validateSpecificField()` for detailed error messages
  - Auto-focus and scroll to first invalid field
  - Console logging for debugging navigation issues
- **Visual feedback for auto-formatting**:
  - Flash highlight when name/WhatsApp auto-formatted
  - Console logs showing before/after values
- **Context-specific email error messages**:
  - Missing @ symbol: "Email harus mengandung tanda @..."
  - Missing TLD: "Email harus mengandung domain yang valid..."
  - Contains space: "Email tidak boleh mengandung spasi..."
  - Generic invalid: "Format email salah. Contoh yang benar:..."
- **Email helper text in HTML**:
  - Placeholder: `nama@domain.com`
  - Helper: "Format: nama@domain.com (tanpa spasi)"
- **Documentation**: `FORM_UX_FIXES.md` comprehensive guide

### Changed
- `js/form-08-franchisee-steps.js` (174 lines, +29 lines):
  - Enhanced `validateFranchiseeStep()` to use `validateSpecificField()`
  - Added focus/scroll to first invalid field on validation failure
  - Added console logging for step navigation debugging
  - Improved fallback validation logic
- `js/form-utils.js` (270 lines, +27 lines):
  - Enhanced `bindAutoFormatting()` with flash highlights
  - Added console logging for name/WhatsApp auto-formatting
  - Enhanced email validation with 4 specific error messages
- `daftar/index.html` (1255 lines, +2 lines):
  - Added email placeholder and helper text
- `TECHNICAL_INVENTORY.md`: Updated form-08 and form-utils entries

### Removed
- None.

## 2026-04-04 20:30 (Asia/Jakarta)
### Added
- **Name auto title-case formatting** (`window.autoTitleCase`):
  - Smart capitalization with particle exceptions (bin, binti, van, der, etc.)
  - Detects and preserves existing titles (Dr, Ir, Hj, Prof)
  - Applied to: name, brand_name, pic_name, company_name fields
- **WhatsApp auto-formatting** (`window.formatWhatsAppNumber`):
  - Converts any format to XXX-XXXX-XXXX pattern
  - Removes leading zeros, strips non-digits
  - Validates 9-13 digit requirement
  - Auto-formats on blur and during validation
- **Strict email validation**:
  - Enhanced regex: `/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/`
  - Rejects invalid formats (missing TLD, spaces, incomplete domains)
  - Helpful error message with example format
- **Auto-formatting binder** (`window.bindAutoFormatting`):
  - Binds blur listeners to name and WhatsApp fields
  - Called once on DOMContentLoaded via form-07-init.js
- **Documentation**: `FORM_VALIDATION_FIXES.md` comprehensive guide

### Changed
- `js/form-utils.js` (243 lines, +78 lines):
  - Added `autoTitleCase(name)` function
  - Added `formatWhatsAppNumber(phone)` function
  - Added `bindAutoFormatting()` function
  - Enhanced email validation regex in `validateSpecificField()`
  - Enhanced WhatsApp validation with auto-format on validation failure
- `js/form-04-calculation-city.js` (146 lines, +5 lines):
  - Added parent positioning check in `initCityAutocomplete()`
  - Sets `position: relative` on parent if static (fixes dropdown alignment)
- `js/form-07-init.js` (41 lines, +1 line):
  - Added `bindAutoFormatting()` call on DOM ready
- `css/form-franchise/04-alerts-status.css` (123 lines, +6 lines):
  - Added `margin-top: 2px` to `.city-suggestions` for visual spacing
  - Added `.input-col:has(.city-autocomplete) { position: relative; }` fallback
- `TECHNICAL_INVENTORY.md`: Updated form-utils.js function inventory
- `KNOWLEDGE.md`: Added auto-formatting behavior to gotchas section

### Removed
- None.

## 2026-04-04 20:00 (Asia/Jakarta)
### Added
- None.

### Changed
- `css/form-franchise/02-layout-tabs-steps.css`:
  - Added `#tab-franchisee .step-item` override: width 50% (was inheriting 20% from 5-step franchisor)
  - Adjusted connector line positioning for 2-step layout (`::after` and `::before` pseudo-elements)
- `daftar/index.html`:
  - Centered "LANJUT" button in Step 1 using `text-center` class (was `justify-content-between` with empty div)

### Removed
- None.

## 2026-04-04 19:45 (Asia/Jakarta)
### Added
- **Multi-Step Layout for Franchisee Form** (2 steps):
  - Step 1: Data Pribadi (name, city, WhatsApp, email)
  - Step 2: Minat & Budget (interest category, budget range, location plan, message)
  - Step indicator with 2-step progress visualization
  - Progress bar (`#franchisee_progress_bar`) for visual feedback
- **New Module: `js/form-08-franchisee-steps.js`**:
  - `franchiseeNextStep(stepIndex)`: Navigate forward with validation
  - `franchiseePrevStep(stepIndex)`: Navigate backward
  - `validateFranchiseeStep(stepIndex)`: Per-step required field validation
  - `updateFranchiseeProgressBar()`: Update step indicators and progress bar
  - `restoreFranchiseeStep()`: Restore saved step from localStorage on page load
- **Script Loading**: Added `form-08-franchisee-steps.js` to `/daftar/index.html` with cache busting support

### Changed
- `daftar/index.html`:
  - Converted Franchisee form from single-page to 2-step layout
  - Added step indicator wrapper (`step-indicator-wrapper`)
  - Wrapped form fields in `franchisee-step-1` and `franchisee-step-2` divs
  - Added navigation buttons (LANJUT/KEMBALI) matching Franchisor form UX
  - Added optional "Pesan Tambahan" (message) textarea in Step 2
- `TECHNICAL_INVENTORY.md`: Added `form-08-franchisee-steps.js` function inventory
- `FORM_SCHEMA.md`: Updated Franchisee form table with step column and multi-step documentation
- `QWEN.md`: Added Franchisee form 2-step structure description

### Removed
- None.

## 2026-04-04 19:15 (Asia/Jakarta)
### Added
- **Aggressive Auto-Save** for Franchisor form with 6 independent triggers to prevent data loss:
  1. Debounced save on input/change events (300ms delay)
  2. Periodic safety-net save every 5 seconds
  3. Save before step navigation (next/previous buttons)
  4. Save on browser visibility change (tab switch/minimize)
  5. Save before page unload (refresh/close)
  6. Save on registration tab switch
- Visual auto-save indicator (`#autosave-indicator`) with toast notification UX
- Error handling and console warnings for auto-save failures
- Auto-save lifecycle management: starts on init, stops on submit, restores on load

### Changed
- `js/form-01-state-helpers.js`:
  - Enhanced `FF.saveFranchisorDraft()` with try/catch error handling
  - Added visual feedback indicator trigger on successful save
- `js/form-06-submit-validation.js`:
  - Added `FF.autoSaveConfig` configuration object (enabled, debounceMs, periodicIntervalMs, timers)
  - Added `FF.debounceAutoSave(form)` for debounced save after user input
  - Added `FF.startPeriodicAutoSave(form)` for periodic 5-second safety save
  - Added `FF.stopPeriodicAutoSave()` for cleanup on form submit
  - Enhanced `FF.initFormSubmission()` with all 6 auto-save triggers
  - Wrapped `window.nextStep`, `window.prevStep`, and `window.openTab` to inject save calls
  - Added visibility change and beforeunload event listeners
- `daftar/index.html`:
  - Added `#autosave-indicator` HTML element after franchisor form
- `css/form-franchise/01-utilities.css`:
  - Added styles for `#autosave-indicator` (fixed position, animated toast)
- Documentation updates:
  - `TECHNICAL_INVENTORY.md`: Updated form-01 and form-06 entries with auto-save functions
  - `CLAIM_WORKFLOW.md`: Added comprehensive auto-save triggers and lifecycle documentation
  - `KNOWLEDGE.md`: Added aggressive auto-save feature description
  - `QWEN.md`: Added auto-save protection note in Multi-Step Registration Form section
  - `FORM_SCHEMA.md`: Added auto-save behavior notes for Franchisor and Klaim tabs

### Removed
- None.

## 2026-04-04 18:03 (Asia/Jakarta)
### Added
- `Handoff Checklist` sections in:
  - `GEMINI.md`
  - `QWEN.md`
  with `/.context/session-*.md` explicitly set as step 1.

### Changed
- None.

### Removed
- None.

## 2026-04-04 18:00 (Asia/Jakarta)
### Added
- None.

### Changed
- `GEMINI.md`:
  - added explicit multi-provider/model collaboration protocol for cross-AI handoffs.
  - updated governance references from monolithic `js/form-franchise.js` to modular form runtime (`js/form-01-*.js` ... `js/form-07-*.js`).
  - added rule that `js/form-franchise.js` is legacy shim only.
- `QWEN.md`:
  - updated `/js` directory map to include modular `form-01` ... `form-07` files and legacy-shim status of `form-franchise.js`.
  - added multi-provider continuity section aligned with project docs/context/changelog protocol.
  - updated gotchas and quick-reference sections to modular form runtime ownership.

### Removed
- None.

## 2026-04-04 17:55 (Asia/Jakarta)
### Added
- `/.context/session-20260404-1755.md`: new timestamped session summary covering modular form-runtime migration (`form-01` ... `form-07`), script-load rewiring, and current conventions for future sessions.

### Changed
- None.

### Removed
- None.

## 2026-04-04 17:52 (Asia/Jakarta)
### Added
- New modular form runtime files in flat `/js` namespace (no subfolder):
  - `js/form-01-state-helpers.js`
  - `js/form-02-claim-workflow.js`
  - `js/form-03-navigation-steps.js`
  - `js/form-04-calculation-city.js`
  - `js/form-05-country-whatsapp.js`
  - `js/form-06-submit-validation.js`
  - `js/form-07-init.js`

### Changed
- `daftar/index.html`:
  - replaced monolithic `form-franchise.js` include with ordered modular script includes (`form-01` ... `form-07`).
  - updated `?dev=1` JS cache-buster to bust all modular script IDs.
- `js/form-franchise.js`: replaced with a non-executing legacy shim/marker to prevent monolithic logic reintroduction.
- `AGENTS.md`: updated persistent rules and checked-script list to reflect modular `form-0x` runtime ownership.
- `KNOWLEDGE.md`: updated architecture/conventions/gotchas from monolithic `form-franchise.js` to modular `form-0x` runtime.
- `TECHNICAL_INVENTORY.md`: replaced monolithic form section with per-module inventory (`form-01` ... `form-07`) and legacy shim note.
- `js/symbols_inventory.md`: rewritten to document current modular form runtime ownership and guardrails.
- `js/technical_comparison.md`: updated analysis/recommendations to reference modular runtime instead of monolithic `form-franchise.js`.

### Removed
- None.

## 2026-04-04 17:35 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-franchise.js`: added tiny runtime flag-emoji fallback for `country_code` dropdown labels:
  - `detectFlagEmojiSupport()` checks whether flag emoji render distinctly.
  - `stripLeadingFlagEmoji()` enables text-only label fallback.
  - `applyCountryCodeOptions()` now auto-renders labels as emoji+text or text-only based on runtime support.
- `TECHNICAL_INVENTORY.md`: documented the new country-code emoji fallback helpers.
- `KNOWLEDGE.md`: documented that flag fallback is now handled automatically at runtime in `js/form-franchise.js`.

### Removed
- None.

## 2026-04-04 17:32 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: `location_plan` now starts from an explicit empty placeholder option (`Pilih Rencana Lokasi...`) so the answer is not auto-selected.
- `css/form-franchise/03-form-core.css`: refined focus-guidance styling so row-level focus highlighting and valid/invalid icon states work together (muted non-active rows, highlighted active row) without removing green/red validation feedback.
- `css/form-franchise/03-form-core.css`: updated `.country-select` font stack to include common emoji fonts for better flag-emoji rendering across browsers/OS.
- `json/country-codes.json`: switched dropdown labels to flag-emoji + country-initial format (e.g., `🇮🇩 ID +62`).
- `js/form-franchise.js`: updated default country-code fallback labels to the same flag-emoji + country-initial format for consistency when JSON config is unavailable.
- `FORM_SCHEMA.md`: updated `location_plan` field note to document empty placeholder default behavior.
- `KNOWLEDGE.md`: added gotcha note about cross-browser emoji rendering variance and text fallback in country-code labels.

### Removed
- None.

## 2026-04-04 12:15 (Asia/Jakarta)
### Added
- `/.context/session-20260404-1215.md`: timestamped summary of this session (country-code/WhatsApp restoration, validation/UI recovery, `/json` + `/csv` consolidation, and lineage context) for cross-session continuity.

### Changed
- `AGENTS.md`: added persistent convention for timestamped session context snapshots in `/.context/session-YYYYMMDD-HHmm.md` and added `/.context/*.md` to the root markdown instruction index.
- `KNOWLEDGE.md`: added session-continuity gotcha/working note to maintain and consult timestamped summaries in `/.context`.

### Removed
- None.

## 2026-04-04 12:08 (Asia/Jakarta)
### Added
- `json/country-codes.json`: centralized country-code option source for form WhatsApp inputs.
- New data-asset directories:
  - `json/` for centralized JSON assets.
  - `csv/` for centralized CSV assets.

### Changed
- `js/form-franchise.js`:
  - switched claim-search static source to `/json/unclaimed-brands.json`.
  - added country-code configuration loader from `/json/country-codes.json` with safe defaults.
  - updated city autocomplete loader to try local `/json/data-kota-id.json` first, then existing remote fallback.
- `js/build-listing.js`: migrated CSV fallback paths to `/csv/*.csv` and changed generated claim-search dataset output from `data/unclaimed-brands.json` to `json/unclaimed-brands.json`.
- `js/build-sitemap.js`: migrated CSV fallback paths to `/csv/franchisors.csv` and `/csv/unclaimed.csv`.
- `AGENTS.md`: added project-level convention to centralize JSON assets in `/json` and CSV assets in `/csv`.
- `KNOWLEDGE.md`: updated architecture/data-flow docs to reflect `/json` and `/csv` conventions and `/json/unclaimed-brands.json` runtime source.
- `PRD.md`: updated static autocomplete dataset path to `/json/unclaimed-brands.json`.
- `TECHNICAL_INVENTORY.md`: bumped `js/form-franchise.js` inventory version to `v1.29` and documented new JSON-driven country-code helpers plus updated claim-search JSON path.
- `QWEN.md`: updated directory structure and claim-search flow path references for `/json` and `/csv`.
- `js/symbols_inventory.md`: documented new JSON loaders (`loadCountryCodeOptions`, `loadCitiesData`) in form logic inventory.
- `js/technical_comparison.md`: updated claim-search dataset reference path to `/json/unclaimed-brands.json`.

### Removed
- `data/unclaimed-brands.json` (moved to `json/unclaimed-brands.json`).
- Empty legacy `data/` directory (replaced by centralized `json/` directory usage).
- Root-level CSV files moved into `/csv`:
  - `franchisors.csv`
  - `unclaimed.csv`
  - `franchisee.csv`
  - `franchises_data.csv`

## 2026-04-04 11:53 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: restored legacy WhatsApp country-code UI (`country_code` dropdown + `.phone-input-group` and helper text) in both Franchisee and Franchisor Step 5 contact sections, aligned with historical `/pendaftaran/index.html` behavior.
- `daftar/index.html`: added an inline lineage note to preserve future restoration context (`/pendaftaran/index.html` -> `/daftar/index.html`).
- `js/form-franchise.js`: restored live validation hooks (`blur`/`input`/`change`) so filled/validated fields reliably show green valid-state feedback again.
- `css/form-franchise/03-form-core.css`: fixed valid-state visual spacing by restoring right-side space for checkmark icon (`padding-right: 40px`).
- `FORM_SCHEMA.md`: synced schema to include `country_code` for Franchisee WhatsApp and Franchisor Step 5 contact fields.
- `TECHNICAL_INVENTORY.md`: bumped `js/form-franchise.js` to `v1.28` and documented `bindLiveValidation(form)`.
- `KNOWLEDGE.md`: added explicit historical-rename gotcha (`/pendaftaran/index.html` lineage) for future restorations.

### Removed
- None.

## 2026-04-04 11:45 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-franchise.js`: restored pre-submit WhatsApp normalization to international format before sending to `/form-submit` / Google Sheets (`+62` default fallback, supports optional `country_code`, and handles pasted `+`/`00` prefixes).
- `TECHNICAL_INVENTORY.md`: bumped `js/form-franchise.js` inventory version to `v1.27` and documented new WhatsApp/country-code normalization helpers.

### Removed
- None.

## 2026-04-04 09:53 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: improved debug-mode CSS cache-busting behavior (`?dev=1`) to bypass stale modular `@import` cache by directly loading all `/css/form-franchise/*.css` module files with `_dbg=<timestamp>`.
- `css/form-franchise/02-layout-tabs-steps.css`: replaced fragile text-symbol step arrows with robust connector line + arrowhead pseudo-elements for inter-step progression visibility.
- `css/form-franchise/02-layout-tabs-steps.css`: updated arrow progression colors to follow step status:
  - pending = gray,
  - active = brand yellow,
  - completed = green (matching completed step circles).
- `DEBUGGING.md`: updated debug-mode notes to explain direct modular CSS cache-busting behavior in `dev=1`.

### Removed
- None.

## 2026-04-04 09:26 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: changed debug emoji toggle (`🧪`) to hidden-by-default and added secret shortcut `Ctrl+Alt+D` to show/hide it per browser profile.
- `daftar/index.html`: debug-toggle visibility is now persisted in localStorage key `debug_toggle_enabled`, and shortcut action displays a short SweetAlert status message.
- `DEBUGGING.md`: documented shortcut-first debug access flow and localStorage-based visibility behavior.
- `KNOWLEDGE.md`: updated cache-debugging note to include `Ctrl+Alt+D` shortcut for revealing debug toggle.

### Removed
- None.

## 2026-04-04 09:20 (Asia/Jakarta)
### Added
- `DEBUGGING.md`: quick debugging reference documenting personal debug mode (`?dev=1`) and DevTools `Network > Disable cache` workflow.

### Changed
- `daftar/index.html`: added debug-only cache-busting for form assets when `?dev=1` is present:
  - CSS: `#form-daftar-franchise` gets `_dbg=<timestamp>`
  - JS: `/js/form-utils.js` and `/js/form-franchise.js` get `_dbg=<timestamp>`
- `daftar/index.html`: added footer debug emoji toggle (`🧪`) to enable/disable debug mode without manually editing URL query params.
- `AGENTS.md`: added `DEBUGGING.md` to root markdown instruction index.
- `KNOWLEDGE.md`: added reminder note for personal cache-debugging via `?dev=1` or DevTools disable-cache.

### Removed
- None.

## 2026-04-04 08:40 (Asia/Jakarta)
### Added
- None.

### Changed
- `css/form-franchise/02-layout-tabs-steps.css`: added visual progression arrows between `.step-item` nodes using pseudo-elements, including active/completed color states and small-screen sizing adjustment.

### Removed
- None.

## 2026-04-04 08:00 (Asia/Jakarta)
### Added
- None.

### Changed
- `css/form-franchise/03-form-core.css`: added focus-attention styling for form fields in `/daftar/index.html`:
  - default non-focused fields now appear subdued (soft gray background + lower opacity),
  - focused fields become fully highlighted,
  - filled/validated/read-only/disabled states remain fully visible to avoid ambiguity during step-by-step completion.
- `css/form-franchise/03-form-core.css`: added dedicated read-only emphasis style so locked claim-brand fields remain clearly visible in claim mode.

### Removed
- None.

## 2026-04-04 06:41 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: aligned step action buttons to center for improved visual balance:
  - Step 1 `LANJUT` wrapper changed from `text-end` to `text-center`.
  - Step 2–5 action rows changed from `justify-content-between` to `justify-content-center` with `gap-2`, so navigation buttons render centered as a group.

### Removed
- None.

## 2026-04-04 06:27 (Asia/Jakarta)
### Added
- `CLAIM_WORKFLOW.md`: dedicated reference documenting end-to-end claim flow, step-button behavior (`Lanjut/Kembali` is frontend-only), persistence behavior, backend append/cleanup semantics, and recommended UX scenarios for mixed draft + claim actions.

### Changed
- `functions/form-submit.js`: improved post-claim cleanup path so `UNCLAIMED` deletion now matches by `id` (primary) and falls back to normalized `brand_name` when `id` is empty/unreliable.
- `js/form-franchise.js` (v1.26): added Franchisor draft persistence (`franchisor_form_draft`, 72-hour TTL) so partially filled fields survive refresh/session continuation.
- `js/form-franchise.js` (v1.26): kept claim-mode persistence (`franchise_claim_state`) and ensured claim linkage is not separately persisted inside generic draft (`unclaimed_id` excluded from draft payload).
- `js/form-franchise.js` (v1.26): integrated draft restore on load + live draft updates on input/change, and draft cleanup on successful submit.
- Documentation sync:
  - `FORM_SCHEMA.md`: documented step-navigation non-submit behavior and Franchisor draft persistence.
  - `TECHNICAL_INVENTORY.md`: added new draft helper functions and updated `deleteFromUnclaimed(id, brandName)` behavior.
  - `KNOWLEDGE.md`: documented 72-hour Franchisor draft continuity and backend cleanup fallback behavior.
  - `AGENTS.md`: indexed `CLAIM_WORKFLOW.md` as claim-flow reference.

### Removed
- None.

## 2026-04-04 06:09 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-franchise.js`: added TTL for persisted claim-mode session (`franchise_claim_state`) with 24-hour expiry to prevent stale claim context from reappearing after long inactivity.
- `js/form-franchise.js`: stored `expires_at` metadata and added backward-compatible TTL checks for older records that only have `saved_at`.
- `FORM_SCHEMA.md`, `TECHNICAL_INVENTORY.md`, `KNOWLEDGE.md`: documented claim-session TTL behavior and rationale for future maintenance continuity.

### Removed
- None.

## 2026-04-04 06:07 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-franchise.js`: implemented claim-mode session persistence via `localStorage` key `franchise_claim_state` so refresh restores active claim context (selected brand, hidden `unclaimed_id`, read-only brand field, and claim alert) instead of reverting to normal mode.
- `js/form-franchise.js`: added claim state helpers (`saveClaimModeState`, `getClaimModeState`, `clearClaimModeState`), integrated them into claim select/exit/success-submit flow, and prioritized persisted claim-state restore during page initialization.
- `FORM_SCHEMA.md`: documented claim-mode session persistence behavior and storage key.
- `TECHNICAL_INVENTORY.md`: synced new claim-state helper functions and updated `fillMainFranchisorForm` behavior notes.
- `KNOWLEDGE.md`: added claim continuity note for refresh restore behavior.

### Removed
- None.

## 2026-04-04 05:57 (Asia/Jakarta)
### Added
- `css/form-franchise/CSS_USAGE_MAP.md`: documentation map for form CSS selectors, module responsibilities, and file usage references (`/daftar/index.html`, `/js/form-franchise.js`, `/js/form-utils.js`).
- New modular stylesheet files:
  - `css/form-franchise/01-utilities.css`
  - `css/form-franchise/02-layout-tabs-steps.css`
  - `css/form-franchise/03-form-core.css`
  - `css/form-franchise/04-alerts-status.css`
  - `css/form-franchise/05-packages-responsive.css`
  - `css/form-franchise/06-claim-autocomplete.css`

### Changed
- `css/form-franchise.css`: converted into an aggregator entrypoint using ordered `@import` directives to load the new modular CSS files while preserving visual cascade order.
- `AGENTS.md`: updated markdown index to include `css/form-franchise/CSS_USAGE_MAP.md` for future maintenance context.
- `KNOWLEDGE.md`: documented modular form CSS architecture and aggregator-order convention.
- `QWEN.md`: updated directory structure to include `css/form-franchise/`.

### Removed
- None.

## 2026-04-04 05:49 (Asia/Jakarta)
### Added
- None.

### Changed
- `css/form-franchise.css`: restored visual clarity for claim-active alert by adding missing utility classes used in `/daftar/index.html` (`.ms-auto`, `.me-2`, `.me-3`, `.small`, `.fs-4`) and by adding explicit `.alert-warning` styling.
- `css/form-franchise.css`: added scoped `#claim-mode-alert` styling for the certificate icon and close button (`.btn-close`) so `fa-certificate` and `exitClaimMode()` control render consistently even without full Bootstrap utility/CSS coverage.

### Removed
- None.

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
