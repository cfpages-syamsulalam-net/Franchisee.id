# Technical Inventory: Franchise.id Codebase

This file serves as a comprehensive record of all functions and key variables across the `/js` and `/functions` directories to prevent logic loss during rapid development.

## 1. Directory: `/js` (Client-side & SSG Builders)

### File: `js/form-franchise.js` (v1.29)
*Main logic for the registration and claiming forms.*
- `slugify(text)`: Converts brand names to URL-friendly slugs.
- `fetchUnclaimedBrands()`: Loads unclaimed brands from `/json/unclaimed-brands.json` or Live API fallback.
- `buildSearchableClaimBrands(brands)`: Sanitizes UNCLAIMED entries for claim autocomplete (filters URL/phone/address/legal-entity/contact-label/category noise, deduplicates display names).
- `saveClaimModeState(brand)`: Persists active claim context into `localStorage` (`franchise_claim_state`) with expiry metadata.
- `getClaimModeState()`: Safely reads/parses persisted claim context from `localStorage` and enforces a 24-hour TTL.
- `clearClaimModeState()`: Clears persisted claim context when claim mode ends.
- `saveFranchisorDraft(form)`: Persists partial Franchisor form values into `localStorage` (`franchisor_form_draft`) with TTL.
- `getFranchisorDraft()`: Reads/parses Franchisor draft payload and enforces 72-hour TTL.
- `restoreFranchisorDraft(form)`: Restores saved Franchisor draft values on page load.
- `clearFranchisorDraft()`: Clears saved Franchisor draft payload after successful submit.
- `window.openTab(tabName)`: Switches between Franchisee, Franchisor, and Klaim tabs.
- `window.nextStep(stepIndex)`: Moves forward in multi-step form.
- `window.prevStep(stepIndex)`: Moves backward in multi-step form.
- `window.validateStep(stepIndex)`: Validates current form step before progression.
- `calculateAll()`: Core business logic for BEP, ROI, and Profit margins.
- `window.updateMinCapital()`: Calculates minimum investment based on package pricing.
- `initCityAutocomplete()`: Setup for Indonesian city search.
- `fillMainFranchisorForm(brand, options)`: Unified workflow - Switches to Franchisor tab, pre-fills brand data + mapping, and persists/restores claim mode context.
- `window.exitClaimMode()`: Resets claim state and restores normal Franchisor form.
- `sanitizeCountryCodeItem(item)`: Sanitizes country-code JSON items into safe `{ code, label }` pairs.
- `applyCountryCodeOptions(list)`: Applies centralized country-code options into all `country_code` dropdowns.
- `loadCountryCodeOptions()`: Loads `/json/country-codes.json` with fallback defaults.
- `normalizeCountryCode(rawCountryCode)`: Normalizes country-code input to `+<digits>` with `+62` fallback.
- `normalizeWhatsappForSubmit(rawWhatsapp, rawCountryCode)`: Normalizes WhatsApp to international format before submit (`+62...` fallback, supports pasted `+` and `00` prefixes).
- `bindLiveValidation(form)`: Restores live field validation hooks (`blur`/`input`/`change`) so valid/invalid visual states stay responsive.
- `submitToCloudflare(formElement, type)`: Sends form data to backend (Handles claim type automatically).

### File: `js/form-utils.js` (Restored)
*Shared utility functions to keep main logic files clean.*
- `window.scrollToTopForm()`: Smooth scrolls to form start.
- `window.updateProgressBar(step, totalSteps)`: Updates visual progress indicator.
- `window.formatRupiah(angka)`: Formats numbers to Indonesian IDR format.
- `window.cleanNumber(str)`: Strips formatting from currency strings for calculation.
- `window.flashHighlight(element)`: Visual feedback for auto-calculated fields.
- `window.showErrorMsg(inputField, msg)`: Displays validation errors.
- `window.removeErrorMsg(inputField)`: Clears validation errors.
- `window.validateSpecificField(field)`: Detailed regex-based field validation.

### File: `js/build-listing.js`
*SSG Builder for the main directory page.*
- `parseCSVRows(content)`: Quote-aware CSV parser (handles commas/newlines inside quoted cells) for reliable local-sheet fallback parsing.
- `loadFromCSV(filePath)`: Fallback logic to read data if API fails, using robust CSV parsing to avoid column-shift corruption.
- `isLikelyClaimBrandRow(item)`: Heuristic filter to keep canonical brand rows for claim-search dataset generation (rejects URL/phone/address/legal-entity/contact-label rows).
- `generateCard(item, index)`: HTML generator for franchise cards (Hybrid: Verified/Unclaimed).
- `async build()`: Orchestrates fetching from Sheet/CSV, writing `/peluang-usaha/index.html`, and generating sanitized `/json/unclaimed-brands.json` for claim search.

### File: `js/build-details.js`
*SSG Builder for individual franchise profile pages.*
- `generateJSONLD(item, slug)`: Injects Structured Data (Brand/Service).
- `generateBreadcrumbs(item)`: Builds SEO-friendly navigation path.
- `generateStickyBar(item, slug, tier)`: Generates fixed "Claim" CTA for unclaimed pages.
- `async build()`: Generates ~500+ detail pages from hybrid data sources.

### File: `js/build-sitemap.js`
- `async build()`: Generates `sitemap-complete.xml` dynamically including all hybrid URLs.

## 2. Directory: `/functions` (Cloudflare Edge Logic)

### File: `functions/form-submit.js` (v2.3)
*Backend processing for all submissions.*
- `onRequestPost()`: Main entry point for Cloudflare Functions.
- `getGoogleAuthToken()`: RS256 JWT auth logic for Google APIs.
- `ensureSheetExists()`: Checks/Creates target tab in Google Sheet.
- `appendDataSmart()`: Dynamic column-to-header mapping and data insertion.
- `checkForDuplicates()`: prevents double registration via Email/WA.
- `deleteFromUnclaimed(id, brandName)`: Post-claim cleanup logic (hapus dari tab UNCLAIMED by `id`, fallback by normalized `brand_name`).

### File: `functions/get-franchises.js`
- `onRequestGet()`: API to fetch franchise data with tier-based Cloudinary optimization.
  - Supports `purpose=claim-search` for `tab=UNCLAIMED` to return sanitized claim-search rows (clean brand_name + deduplication + row-noise filtering aligned with frontend/builder).

---
## 3. Logic Safety Audit
- **Status**: Verified.
- **Lost logic recovered**: BEP calculations, multi-step progress, and Cloudinary upload preview restoration (refactored into `form-franchise.js` and `form-utils.js`).
