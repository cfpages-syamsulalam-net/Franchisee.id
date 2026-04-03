# JS Symbols Inventory & Feature Documentation

This document provides a granular record of every variable and function within the `/js` directory, including historical context on removed or modified features.

## 1. File: `js/form-franchise.js`

### Functions
- `slugify(text)`: Converts string to URL slug.
- `fetchUnclaimedBrands()` (async): Loads data for the claim search.
- `buildSearchableClaimBrands(brands)`: Frontend claim-search sanitizer and deduper for display suggestions.
- `window.openTab(tabName)`: Handles tab switching and re-validation of inputs.
- `window.nextStep(stepIndex)`: Progresses form step, persists to `localStorage`.
- `window.prevStep(stepIndex)`: Regresses form step.
- `window.validateStep(stepIndex)`: Performs HTML5 validity checks and custom logic (e.g., Rp 0 check).
- `calculateAll()`: Core BEP calculation logic.
- `window.updateMinCapital()`: Determines lowest package price for display.
- `initCityAutocomplete()`: Sets up event listeners for city suggestions.
- `fillMainFranchisorForm(brand)`: Core logic for the **Claim Brand** feature.
- `window.exitClaimMode()`: Resets form from Claim state back to standard.
- `submitToCloudflare(formElement, type)` (async): Unified submission logic.

### Variables
- `unclaimedBrands` (Array): Storage for fetched brands.
- `selectedBrand` (Object): Currently active brand in claim mode.
- `currentStep` (Number): Tracker for multi-step progress.
- `citiesData` (Array): List of Indonesian cities.

---

## 2. File: `js/form-utils.js`

### Functions
- `window.scrollToTopForm()`: UI Helper.
- `window.updateProgressBar(step, totalSteps)`: UI Helper.
- `window.formatRupiah(angka)`: Formatter.
- `window.cleanNumber(str)`: Parser.
- `window.flashHighlight(element)`: Visual feedback.
- `window.showErrorMsg(inputField, msg)`: Error display.
- `window.removeErrorMsg(inputField)`: Error cleanup.
- `window.validateSpecificField(field)`: Advanced validation (Phone, Email, URL).

---

## 3. File: `js/build-details.js` (SSG)

### Functions
- `slugify(text)`: Local copy for node environment.
- `formatRupiah(angka)`: Local copy for node environment.
- `generateJSONLD(item, slug)`: Returns SEO schema object.
- `generateBreadcrumbs(item)`: Generates breadcrumb HTML.
- `generateStickyBar(item, slug, tier)`: Generates Claim CTA for unclaimed pages.
- `async build()`: Main script execution logic.

---

## 4. File: `js/build-listing.js` (SSG)

### Functions
- `getThumb(url)`: Cloudinary URL transformer.
- `parseCSVRows(content)`: Quote-aware CSV parser for robust fallback ingestion.
- `loadFromCSV(filePath)`: CSV data loader.
- `isLikelyClaimBrandRow(item)`: Claim-search canonical row filter for static JSON generation.
- `generateCard(item, index)`: HTML generator for listing cards.
- `async build()`: Orchestrates listing generation.

---

## 5. Historical & Removed Features Registry

### Removed in Mar 2026 Refactor
- **`window.validateSpecificField` in `form-franchise.js`**: Moved to `form-utils.js` to reduce file size.
- **Auto-save on every keystroke**: Removed due to performance issues on low-end mobile devices. Replaced with `step` and `tab` persistence.
- **`pkg_name_1` logic in `fillMainFranchisorForm`**: Slightly modified to use `franchise_form_autosave` object instead of individual `localStorage` keys.

### Modified Logic
- **`submitToCloudflare`**: Previously had separate functions for Franchisor/Franchisee. Now unified with a `type` parameter.
- **BEP Calculation**: Added `bep_years_display` to show years alongside months (added Mar 2026).

### Potentially Missing (To be monitored)
- **Cloudinary Widget**: Some older versions had the Cloudinary Upload Widget directly in `index.html`. It's currently expected to be handled by `form-franchise.js` (Verify implementation status).
