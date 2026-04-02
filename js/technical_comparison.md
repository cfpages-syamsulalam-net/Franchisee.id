# Technical Comparison: /js Directory

This document tracks the evolution and current state of the JavaScript logic files, identifying potential regressions or missing features compared to historical versions.

## File Inventory & Purpose

| File | Purpose | Maintained Since |
|------|---------|------------------|
| `form-franchise.js` | Core registration logic, tabs, steps, BEP calculations, and Claim Workflow. | Jan 2026 |
| `form-utils.js` | Shared utility functions (formatting, cleaning, UI helpers). | Mar 2026 |
| `build-details.js` | SSG Engine: Generates individual franchise detail pages. | Jan 2026 |
| `build-listing.js` | SSG Engine: Generates the directory listing pages. | Jan 2026 |
| `build-sitemap.js` | SSG Engine: Generates dynamic XML sitemaps. | Mar 2026 |

---

## Detailed Analysis: form-franchise.js

### Evolution (Commit 362415c -> 274e06e)
- **Refactoring**: Logic for "Claim Mode" was consolidated. The `fillMainFranchisorForm` function was hardened to prevent identity modification of the brand being claimed (`readOnly = true`).
- **UI Enhancements**: Transitioned from native `alert()` to `SweetAlert2` (`Swal.fire`) for professional feedback.
- **State Management**: Added `exitClaimMode()` to properly reset the form when a user cancels a claim.
- **Validation**: Improved step-by-step validation, including a check for Rp 0 investment to prevent accidental submissions.

### Missing/Lost Elements
- **Autosave Granularity**: Some earlier versions had more aggressive `localStorage` saving for every input change. The current version primarily saves the `step` and `active_tab`, plus a specific `franchise_form_autosave` object during claims.
- **Legacy Helpers**: Older versions might have had `window.validateSpecificField` defined in-file; it is now expected to be provided by `form-utils.js` or external scripts.

---

## Detailed Analysis: SSG Scripts (build-*.js)

### Recent Major Updates (Commit a670a3d)
- **JSON-LD**: Automated injection of structured data (Schema.org) for better SEO.
- **Breadcrumbs**: Dynamic breadcrumb generation for detail pages.
- **Unclaimed Support**: Logic added to handle "Unclaimed" vs "Verified" brand UI (e.g., Sticky CTAs for unclaimed brands).

### Observations
- **Logic Sync**: `build-details.js` and `build-listing.js` share similar logic for data fetching but diverge in UI template injection. Any changes to data schema in `unclaimed-brands.json` must be reflected in both.
- **Sitemap**: `build-sitemap.js` is a relatively new addition (Mar 2026) to handle the growing scale of unclaimed brands without manual sitemap edits.

---

## Recommendations for Consistency
1. **Utility Centralization**: Ensure `cleanNumber` and `formatRupiah` are always called from `window.formatRupiah` to avoid duplication in `form-franchise.js`.
2. **Error Handling**: Standardize the `submitToCloudflare` try/catch block across any future forms to use the same `Swal` feedback loop.
