# Form Franchise CSS Usage Map

Last updated: 2026-04-04 (Asia/Jakarta)

## Entry Point
- Main loaded stylesheet: `/css/form-franchise.css`
- Loaded by: `/daftar/index.html` (`<link id="form-daftar-franchise" ...>`)
- Runtime class toggling source: `/js/form-franchise.js` and `/js/form-utils.js`

## Module Breakdown

### `01-utilities.css`
- Purpose: Bootstrap-like utility replacements and base helper classes.
- Key selectors:
  - Spacing/position: `.mt-*`, `.mb-*`, `.ms-*`, `.me-*`, `.px-*`, `.py-*`, `.position-*`, `.top-0`, `.start-100`
  - Display/alignment: `.d-flex`, `.d-none`, `.align-items-*`, `.justify-content-center`
  - Colors/text helpers: `.text-warning`, `.text-primary`, `.text-dark`, `.fw-bold`, `.small`, `.fs-4`
- Used in:
  - `/daftar/index.html` (tab buttons, headings, claim alert icon spacing, etc.)
  - JS-applied state classes such as `.is-valid`, `.is-invalid` rely on utility-consistent styling.

### `02-layout-tabs-steps.css`
- Purpose: top-level registration layout and tab/step UI.
- Key selectors:
  - `.franchise-listing-form-wrapper`
  - `.registration-tabs-wrapper`, `.registration-tabs`, `.tab-btn`, `.tab-btn.active`
  - `.step-indicator-wrapper`, `.step-indicator`, `.step-item`, `.step-circle`, `.step-text`
  - `.form-step`, `.form-step.active`, `@keyframes fadeIn`, `.btn-prev`, `.btn-danger`
- Used in:
  - `/daftar/index.html` (tab switcher + step indicator area)
  - `/js/form-franchise.js` (`openTab`, step navigation toggles)

### `03-form-core.css`
- Purpose: core card, field, input, validation, and calculator/dashboard styles.
- Key selectors:
  - `.form-section-card`, `.section-title`, `.form-group-row`, `.label-col`, `.input-col`
  - `.form-control`, `.form-select`, `:focus`
  - Validation states: `.form-control.is-valid`, `.form-control.is-invalid`, `.validation-error-msg`, `.is-invalid-logic`
  - `.input-group*`, `.phone-input-group`, `.country-select`, `.phone-number-input`
  - `.outlet-grid-container`, `.card-radio-box`, `.radio-content`
  - `.total-box`, `.total-input`, `.custom-grid-2-col`, `.result-dashboard`, `.fw-800`, `#bep_years_display`
- Used in:
  - `/daftar/index.html` form sections and calculator UI
  - `/js/form-utils.js` and `/js/form-franchise.js` (adds/removes validation classes)

### `04-alerts-status.css`
- Purpose: autocomplete (city), alert skins, and claim-mode alert visuals.
- Key selectors:
  - `.autocomplete-wrapper`, `.city-suggestions`, `.city-suggestion-item`
  - `.alert`, `.alert-primary`, `.alert-warning`
  - `#claim-mode-alert`, `#claim-mode-alert .fa-certificate`, `#claim-mode-alert .btn-close`
- Used in:
  - `/daftar/index.html` claim mode alert block and city autocomplete container
  - `/js/form-franchise.js` (`fillMainFranchisorForm` and `exitClaimMode` toggling alert visibility)

### `05-packages-responsive.css`
- Purpose: shared utility leftovers, compact package card UI, and responsive media queries.
- Key selectors:
  - `.start-0`, `.badge`, `.bg-primary`
  - `.package-card-compact`, `.pkg-num-col`, `.pkg-circle`, `.pkg-form-col`, `.mini-row`, `.mini-label`, `.mini-input`
  - `@media (max-width: 768px)`, `@media (min-width: 768px)`, `@media (max-width: 576px)`
- Used in:
  - `/daftar/index.html` package section + general responsive behavior

### `06-claim-autocomplete.css`
- Purpose: claim-brand suggestion list styling.
- Key selectors:
  - `.data-gap`
  - `.autocomplete-wrapper` (claim-specific override/normalization)
  - `.autocomplete-suggestions`, `.suggestion-item`, `.suggestion-item .brand-name`
- Used in:
  - `/daftar/index.html` (`#claim-brand-search`, `#claim-search-results`)
  - `/js/form-franchise.js` (suggestion rendering)

## Notes for Future Changes
- Keep module import order stable in `/css/form-franchise.css`; later modules intentionally override earlier definitions.
- If adding/removing claim search classes in `/js/form-franchise.js`, update this map and `TECHNICAL_INVENTORY.md`.
- If moving tab/step markup in `/daftar/index.html`, verify selectors in `02-layout-tabs-steps.css` and `04-alerts-status.css`.
