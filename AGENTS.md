# AGENTS.md - Local Audit Notes

Last updated: 2026-03-09 (Asia/Jakarta)

## Context Source
- `GEMINI.md` has been reviewed and is treated as the project context baseline.

## What Was Checked
- Repository structure and key runtime areas (`/js`, `/functions`, `/pendaftaran`).
- Core custom scripts:
  - `js/form-utils.js`
  - `js/form-franchise.js`
  - `js/build-listing.js`
  - `js/build-details.js`
  - `js/build-sitemap.js`
  - `functions/get-franchises.js`
  - `functions/form-submit.js`
- Integration points in `pendaftaran/index.html` for tab switching and form scripts.

## Fix Applied During Audit
- File: `js/form-franchise.js`
- Issue: `window.renderPackageInputs(1)` was called in claim flow but no local definition exists.
- Action: Added defensive checks before calling it, so claim mode does not crash if the function is unavailable.
- Additional hardening: submission error now falls back to `result.error` when `result.message` is missing.

## Current Status
- No other blocking JS wiring issues found in the checked custom paths.
- Note: direct `node --check` validation is restricted in this sandbox due an EPERM path-resolution issue; review was completed via source inspection and targeted cross-reference checks.

