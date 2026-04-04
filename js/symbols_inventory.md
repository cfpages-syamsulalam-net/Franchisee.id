# JS Symbols Inventory & Feature Documentation

This document tracks key runtime/build symbols in `/js` with emphasis on modular form runtime ownership.

## 1. Form Runtime (Modular, Flat Prefix)

### `js/form-01-state-helpers.js`
- Owns shared namespace/state: `window.FranchiseForm.state`, `window.FranchiseForm.constants`, `window.FranchiseForm.utils`.
- Persists/reads claim mode (`franchise_claim_state`) with TTL.
- Persists/reads franchisor draft (`franchisor_form_draft`) with TTL.
- Claim-search sanitization: `buildSearchableClaimBrands`.

### `js/form-02-claim-workflow.js`
- Loads claim dataset (`/json/unclaimed-brands.json`, API fallback).
- Claim autocomplete UI bindings.
- Unified claim fill/reset behavior:
  - `fillMainFranchisorForm`
  - `exitClaimMode`

### `js/form-03-navigation-steps.js`
- Tab switching: `window.openTab`.
- Step controls: `window.nextStep`, `window.prevStep`, `window.validateStep`.

### `js/form-04-calculation-city.js`
- BEP/min-capital calculations.
- City autocomplete loader (`/json/data-kota-id.json` first, remote fallback).

### `js/form-05-country-whatsapp.js`
- Country-code dropdown renderer from `/json/country-codes.json`.
- Flag-emoji runtime fallback (emoji or text-only labels).
- WhatsApp country-code normalization before submit.

### `js/form-06-submit-validation.js`
- Live validation bindings.
- Unified submit pipeline to `/form-submit`.
- Draft persistence hooks on form input/change.

### `js/form-07-init.js`
- DOMContentLoaded bootstrap coordinator.
- Restores saved step/tab/claim state.
- Re-exposes compatibility globals:
  - `window.fetchUnclaimedBrands`
  - `window.fillMainFranchisorForm`

### `js/form-franchise.js` (Legacy Shim)
- Non-executing migration marker only.
- Do not add runtime logic here.

## 2. Shared Form Utilities

### `js/form-utils.js`
- `scrollToTopForm`
- `updateProgressBar`
- `formatRupiah`
- `cleanNumber`
- `flashHighlight`
- `showErrorMsg`
- `removeErrorMsg`
- `validateSpecificField`

## 3. SSG Scripts

### `js/build-listing.js`
- Hybrid FRANCHISOR+UNCLAIMED listing build.
- Quote-aware CSV fallback parser.
- Generates `/json/unclaimed-brands.json` for claim autocomplete.

### `js/build-details.js`
- Detail-page generation, JSON-LD, breadcrumbs, sticky claim CTA.

### `js/build-sitemap.js`
- Dynamic sitemap generation with CSV fallback support.

## 4. Guardrails
- Keep form runtime modular in `form-01` ... `form-07`; avoid monolith regression.
- Keep shared validators/formatters in `form-utils.js` (no duplicate utility forks).
- Update `TECHNICAL_INVENTORY.md` and `CHANGELOG.md` after symbol/file ownership changes.
