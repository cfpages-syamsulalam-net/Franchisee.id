# Technical Comparison: /js Directory

This document tracks the evolution and current state of the JavaScript logic files, identifying potential regressions or missing features compared to historical versions.

## File Inventory & Purpose

| File | Purpose | Maintained Since |
|------|---------|------------------|
| `form-01-state-helpers.js` ... `form-07-init.js` | Modular registration runtime (state, claim workflow, tabs/steps, calc/city, country+WA, submit, bootstrap). | Apr 2026 |
| `form-utils.js` | Shared utility functions (formatting, cleaning, UI helpers). | Mar 2026 |
| `build-details.js` | SSG Engine: Generates individual franchise detail pages. | Jan 2026 |
| `build-listing.js` | SSG Engine: Generates the directory listing pages. | Jan 2026 |
| `build-sitemap.js` | SSG Engine: Generates dynamic XML sitemaps. | Mar 2026 |

---

## Detailed Analysis: Modular Form Runtime (`form-01` ... `form-07`)

### Evolution (Commit 362415c -> 274e06e)
- **Refactoring**: Former monolith `form-franchise.js` has been split into flat prefixed modules to reduce merge risk and context load while preserving runtime behavior.
- **UI Enhancements**: Transitioned from native `alert()` to `SweetAlert2` (`Swal.fire`) for professional feedback.
- **State Management**: Claim/draft persistence remains centralized in `form-01-state-helpers.js`; claim reset flow remains in `form-02-claim-workflow.js`.
- **Validation**: Improved step-by-step validation, including a check for Rp 0 investment to prevent accidental submissions.

### Missing/Lost Elements
- **Autosave Granularity**: Some earlier versions had more aggressive `localStorage` saving for every input change. Current behavior persists step/tab state, claim context, and structured Franchisor draft payload.
- **Legacy Helpers**: `window.validateSpecificField` remains externalized in `form-utils.js` and is consumed by modular form runtime files.

---

## Detailed Analysis: SSG Scripts (build-*.js)

### Recent Major Updates (Commit a670a3d)
- **JSON-LD**: Automated injection of structured data (Schema.org) for better SEO.
- **Breadcrumbs**: Dynamic breadcrumb generation for detail pages.
- **Unclaimed Support**: Logic added to handle "Unclaimed" vs "Verified" brand UI (e.g., Sticky CTAs for unclaimed brands).

### Observations
- **Logic Sync**: `build-details.js` and `build-listing.js` share similar logic for data fetching but diverge in UI template injection. Any changes to data schema in `/json/unclaimed-brands.json` must be reflected in both.
- **Claim Search Sync**: Claim-search sanitization rules must stay aligned in `js/build-listing.js`, `functions/get-franchises.js`, and form modules (`js/form-01-state-helpers.js`, `js/form-02-claim-workflow.js`) to avoid URL/phone/address/entity rows leaking into autocomplete.
- **Sitemap**: `build-sitemap.js` is a relatively new addition (Mar 2026) to handle the growing scale of unclaimed brands without manual sitemap edits.

---

## Recommendations for Consistency
1. **Utility Centralization**: Keep shared validators/formatters in `form-utils.js`; do not duplicate them across `form-0x` modules.
2. **Error Handling**: Standardize the `submitToCloudflare` try/catch block across any future forms to use the same `Swal` feedback loop.
