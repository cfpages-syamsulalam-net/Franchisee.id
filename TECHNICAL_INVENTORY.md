# Technical Inventory: Franchise.id Codebase

This file serves as a comprehensive record of all functions and key variables across the `/js` and `/functions` directories to prevent logic loss during rapid development.

## 1. Directory: `/js` (Client-side & SSG Builders)

### File: `js/form-01-state-helpers.js`
*Shared state + helper/sanitization + localStorage persistence layer.*
- `FF.state`: Shared runtime state (brands cache, step tracker, city list).
- `FF.constants`: Shared constants (`franchise_claim_state`, `franchisor_form_draft`, default country-code list).
- `FF.utils.*`: Shared helpers (`slugify`, URL/phone/address/contact/entity filters, clean brand-name normalizer).
- `FF.buildSearchableClaimBrands(brands)`: Claim-search sanitizer/deduper.
- `FF.saveClaimModeState/getClaimModeState/clearClaimModeState`: Claim context persistence with TTL.
- `FF.saveFranchisorDraft/getFranchisorDraft/restoreFranchisorDraft/clearFranchisorDraft`: Draft persistence with TTL + visual feedback indicator.

### File: `js/form-02-claim-workflow.js`
*Claim-mode fetch/search/fill/reset behavior.*
- `FF.fetchUnclaimedBrands()`: Loads `/json/unclaimed-brands.json` with API fallback.
- `FF.initClaimSearchBindings()`: Binds claim search input and suggestion click behavior.
- `FF.fillMainFranchisorForm(brand, options)`: Switches tab + pre-fills brand data for claim flow.
- `FF.exitClaimMode()` / `window.exitClaimMode`: Clears claim mode and restores editable form state.

### File: `js/form-03-navigation-steps.js`
*Tab and step navigation wiring.*
- `window.openTab(tabName)`: Tab switch + revalidation + lazy claim data fetch.
- `window.nextStep(stepIndex)`: Step-forward navigation with progress tracking.
- `window.prevStep(stepIndex)`: Step-back navigation with progress tracking.
- `window.validateStep(stepIndex)`: Required-field and Rp 0 warning validation.

### File: `js/form-04-calculation-city.js`
*BEP calculation + minimum-capital + city autocomplete.*
- `window.updateMinCapital()`: Recomputes minimum package capital and triggers BEP refresh.
- `FF.loadCitiesData()`: Loads city JSON from local `/json` then remote fallback.
- `FF.initCityAutocomplete()`: City suggestion rendering and input binding.
- `FF.initCalculationAndCity()`: Boots calc listeners + city loader.

### File: `js/form-05-country-whatsapp.js`
*Country-code option loader + emoji fallback + WhatsApp normalization.*
- `FF.sanitizeCountryCodeItem(item)`: Sanitizes JSON country-code entries.
- `FF.detectFlagEmojiSupport()`: Canvas-based flag emoji support probe.
- `FF.stripLeadingFlagEmoji(label)`: Text-only fallback label transformer.
- `FF.applyCountryCodeOptions(list)`: Renders dropdown options for all `country_code` selects.
- `FF.loadCountryCodeOptions()`: Loads `/json/country-codes.json` with defaults.
- `FF.normalizeCountryCode(rawCountryCode)`: Ensures `+<digits>` output with `+62` fallback.
- `FF.normalizeWhatsappForSubmit(rawWhatsapp, rawCountryCode)`: International WA normalization before submit.

### File: `js/form-06-submit-validation.js`
*Form validation binding + submit pipeline + aggressive auto-save.*
- `FF.autoSaveConfig`: Auto-save configuration (enabled, debounceMs, periodicIntervalMs, timers).
- `FF.debounceAutoSave(form)`: Debounced save after user stops typing (300ms).
- `FF.startPeriodicAutoSave(form)`: Periodic safety-net save every 5 seconds.
- `FF.stopPeriodicAutoSave()`: Clears all auto-save timers.
- `FF.bindLiveValidation(form)`: Live input/select validation hooks (`blur`/`input`/`change`).
- `FF.submitToCloudflare(formElement, type)`: Unified submit pipeline (handles claim routing + WA normalization).
- `FF.initFormSubmission()`: Attaches submit listeners, draft persistence hooks, and aggressive auto-save triggers (input, change, step navigation, visibility change, beforeunload, tab switch).

### File: `js/form-07-init.js`
*Bootstrap coordinator for the modular form stack.*
- DOMContentLoaded orchestrator for claim bindings, calculations/city loader, country-code loader, submit wiring, and state restoration.
- Re-exposes compatibility globals (`window.fetchUnclaimedBrands`, `window.fillMainFranchisorForm`).

### File: `js/form-franchise.js` (Legacy Shim)
*Deprecated non-executing compatibility marker.*
- Contains no runtime logic; preserved only as migration marker to prevent monolith reintroduction.

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
- **Lost logic recovered**: BEP calculations, multi-step progress, and Cloudinary upload preview restoration (refactored into modular `form-0x-*.js` files and `form-utils.js`).
