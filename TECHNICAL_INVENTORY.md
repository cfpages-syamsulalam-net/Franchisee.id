# Technical Inventory: Franchise.id Codebase

This file records important functions, modules, and key variables across `/js`, `/functions`, `/scripts`, and `/src` to prevent logic loss during rapid development.

## Migration Direction
This inventory describes the current runtime and migration bridge. Google Sheets and Cloudinary references are transition-layer behavior, not the desired final stack. New backend work should move function ownership toward D1/R2/Clerk and update `CODEBASE.md`, `AUDIT.md`, and this inventory together. `/form-submit` is now Clerk-authenticated and D1-role-authorized.

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
*Tab and step navigation wiring + debug logging.*
- `window.openTab(tabName)`: Tab switch + revalidation + lazy claim data fetch.
- `window.nextStep(stepIndex)`: Step-forward navigation with progress tracking + **detailed console logging** (step index, state.currentStep, validation result, target visibility).
- `window.prevStep(stepIndex)`: Step-back navigation with progress tracking.
- `window.validateStep(stepIndex)`: Required-field and Rp 0 warning validation + **debug output** (invalid field names, values, validation pass/fail status).

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
- `FF.submitToCloudflare(formElement, type)`: Unified submit pipeline (handles claim routing + WA normalization), requires `window.FranchiseAuth` to attach a Clerk bearer token before posting to `/form-submit`.
- `FF.initFormSubmission()`: Attaches submit listeners, draft persistence hooks, and aggressive auto-save triggers (input, change, step navigation, visibility change, beforeunload, tab switch).

### File: `js/form-07-init.js`
*Bootstrap coordinator for the modular form stack.*
- DOMContentLoaded orchestrator for claim bindings, calculations/city loader, country-code loader, submit wiring, and state restoration.
- Re-exposes compatibility globals (`window.fetchUnclaimedBrands`, `window.fillMainFranchisorForm`).

### File: `js/form-08-franchisee-steps.js`
*Franchisee form step navigation (2-step layout).*
- `franchiseeState`: Local state for franchisee form (currentStep, totalSteps).
- `window.franchiseeNextStep(stepIndex)`: Navigate to next step with validation.
- `window.franchiseePrevStep(stepIndex)`: Navigate to previous step.
- `validateFranchiseeStep(stepIndex)`: Per-step required field validation.
- `updateFranchiseeProgressBar()`: Updates step indicators and progress bar.
- `restoreFranchiseeStep()`: Restores saved step from localStorage on page load.

### File: `js/form-09-test-data-generator.js`
*Dev mode test data generator with FAB UI (visible only when `?dev=1`).*
- `window.TestDataGenerator`: Main namespace.
- `isDevMode()`: Checks if `?dev=1` in URL.
- Data generators: `generateName()`, `generateEmail()`, `generatePhone()`, `generateCity()` (valid cities only), `generateBrandName()`, `generateCompanyName()`, `formatCompanyName()`, `generateNIB()`.
- Form fillers: `fillFranchiseeForm()` (2-step), `fillFranchisorForm()` (Step 1 only), `fillClaimForm()` (async).
- `fillFormFields(data)`: Generic field filler for text, select, radio, checkbox.
- `markFormAsTestData(formId)`: Adds `is_test_data=TRUE` hidden input.
- `clearAllTestData()`: Deletes all D1 test data via backend endpoint; requires Clerk auth and D1 staff/admin role.
- `getAuthHeaders()`: Reads Clerk auth headers from `window.FranchiseAuth` for protected D1 test writes.
- UI: `createFAB()`, `showToast()`.
- **Important**: Franchisor form filler now only fills Step 1 data to prevent state confusion.

### File: `js/form-franchise.js` (Legacy Shim)
*Deprecated non-executing compatibility marker.*
- Contains no runtime logic; preserved only as migration marker to prevent monolith reintroduction.

### File: `js/form-utils.js` (Restored)
*Shared utility functions to keep main logic files clean.*
- `window.autoTitleCase(name)`: Smart title-case formatting for names with particle exceptions.
- `window.formatWhatsAppNumber(phone)`: Formats phone numbers to XXX-XXXX-XXXX pattern.
- `window.bindAutoFormatting()`: Binds auto-formatting listeners to name and WhatsApp fields on blur.
- `window.scrollToTopForm()`: Smooth scrolls to form start.
- `window.updateProgressBar(step, totalSteps)`: Updates visual progress indicator.
- `window.formatRupiah(angka)`: Formats numbers to Indonesian IDR format.
- `window.cleanNumber(str)`: Strips formatting from currency strings for calculation.
- `window.flashHighlight(element)`: Visual feedback for auto-calculated fields.
- `window.showErrorMsg(inputField, msg)`: Displays validation errors.
- `window.removeErrorMsg(inputField)`: Clears validation errors.
- `window.validateSpecificField(field)`: Detailed regex-based field validation (enhanced email, auto-format WhatsApp).

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

### File: `scripts/build-d1-franchise-pages.ts`
*TypeScript D1-backed public page generation bridge.*
- `fetchRowsFromD1(options)`: Reads the local cfman-managed token for `franchise-network`, calls Wrangler directly, and loads published `site_franchisee_id` franchise rows from `franchise_db`.
- `renderDetailPage(row, template)`: Inserts D1 franchise data into `templates/detail-franchise-tpl.html` and marks output with `d1-generated:franchisee.id`.
- `generateContactBlock(row)`: Renders public contact and social links from D1 franchisor profile fields when present.
- `buildListingIndex(rows, template, previousManifest, nextManifest, options, stats)`: Renders `/peluang-usaha/index.html` from D1 data and skips unchanged output by manifest hash.
- `buildUnclaimedJson(rows, options, stats)`: Regenerates `json/unclaimed-brands.json` from D1 unclaimed rows for claim search.
- Snapshot behavior: non-dry runs write `json/d1-franchise-static-data.json`, which Astro consumes for static route generation.
- Detail output behavior: writes flat `/peluang-usaha/[slug].html` files while generated links remain extensionless `/peluang-usaha/[slug]`.
- Manifest behavior: `json/d1-generated-pages-manifest.json` tracks D1-owned pages; prune only removes tracked files that still contain the D1 marker, including old marker-owned folder indexes when paths change.
- Wrangler invocation uses project-pinned `pnpm exec wrangler` so the script does not resolve a newer Node-22-only Wrangler version under Node 20.

### File: `scripts/d1-static-publish-poller.mjs`
*Dependency-free GitHub Actions poller for D1-backed static publishing.*
- `pollAndMaybePublish()`: Expires stale queued requests, reads `site_publish_state`, counts pending `site_rebuild_requests`, enforces guardrails, and either exits cleanly or publishes.
- Default publish mode: calls the Cloudflare Pages Deploy Hook after D1 is dirty and guardrails allow publishing.
- Direct deploy fallback: emits workflow outputs for `wrangler pages deploy dist`, then `--mark-deployed` or `--mark-failed` updates D1 status.
- `expireStaleQueuedRequests()`: Moves old `queued` requests back to `failed_retryable` after `stale_queued_after_minutes`.
- `evaluateGuardrails(state)`: Enforces daily publish limit and minimum interval.
- D1 access: uses the Cloudflare D1 HTTP API with `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_D1_DATABASE_ID`.

## 2. Directory: `/src` (Astro Static Generation)

### File: `src/lib/franchise-static.ts`
*Astro D1 snapshot validator and template renderer.*
- `FranchiseStaticRowSchema`: Zod schema for rows in `json/d1-franchise-static-data.json`.
- `loadFranchiseStaticRows()`: Reads and validates the generated D1 snapshot.
- `renderListingPage(rows)`: Renders the existing `/peluang-usaha/` listing template from snapshot rows.
- `renderDetailPage(row)`: Renders the existing franchise detail template for one snapshot row.
- `generateContactBlock(row)`: Renders D1 contact/social links into the detail page contact tab.
- Helper functions mirror the D1 bridge mapping: HTML escaping, JSON-LD serialization, rupiah formatting, URL normalization, investment summary rendering, dynamic tabs, cards, breadcrumbs, disclaimers, social/contact links, and sticky claim CTA.

### File: `src/pages/peluang-usaha/index.astro`
*Astro static listing page.*
- `prerender = true`.
- Loads rows with `loadFranchiseStaticRows()`.
- Outputs full listing HTML with `renderListingPage(rows)`.

### File: `src/pages/peluang-usaha/[slug].astro`
*Astro static franchise detail pages with flat `.html` output under `build.format: "preserve"`.*
- `prerender = true`.
- `getStaticPaths()`: Creates one static route per snapshot row using the D1 slug.
- Outputs full detail HTML with `renderDetailPage(row)`.

## 3. Directory: `/functions` (Cloudflare Edge Logic)

### File: `functions/_clerk-auth.js`
*Shared Clerk session verification, D1 user sync, and role authorization helper.*
- `requireD1User(request, env, db, options)`: Verifies Clerk bearer token, upserts D1 user, optionally assigns self-selectable role, and enforces required D1 role.
- `syncD1User(request, env, db, requestedRole)`: Auth sync variant used by `/auth-sync`; pushes the current D1 role snapshot back into Clerk metadata.
- `syncWebhookUserToD1(env, db, clerkUser)`: Verifies Clerk webhook identity payloads and upserts D1 `users` from `user.created` / `user.updated`.
- `markD1UserDeleted(db, clerkUserId)`: Marks the D1 user row as `deleted` after a verified Clerk `user.deleted` webhook.
- `assignD1Role(db, userId, role, actorUserId)` / `removeD1Role(db, userId, role)`: Mutates D1 network roles used by admin role management.
- `syncClerkMetadataFromD1(env, user, roles)` / `syncClerkMetadataForD1User(env, db, user)`: Writes D1 user id, role list, status, and sync timestamp into Clerk public/private metadata.
- `authErrorResponse(error)`: Converts auth/role failures into the standard JSON response shape.
- Roles: only `franchisee` and `franchisor` are self-assignable; `staff` and `admin` are elevated roles.

### File: `functions/_site-publish-queue.js`
*Shared D1 static publish queue helper for Pages Functions.*
- `SITE_FRANCHISEE_ID`: Canonical site id for `franchisee.id` publications.
- `siteRebuildStatements(db, options)`: Returns D1 prepared statements that insert a `site_rebuild_requests` row and update `site_publish_state` in the same batch as the public-page-affecting mutation.
- Used by `/form-submit` for franchisor listing submission, claim submission, dev unclaimed creation, and dev test-data clearing.

### File: `functions/auth-config.js`
*Public Clerk config endpoint.*
- `onRequestGet()`: Returns the Clerk publishable key from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` or fallback `CLERK_PUBLISHABLE_KEY`, plus configured status with `Cache-Control: no-store`.

### File: `functions/auth-sync.js`
*Clerk-to-D1 user mapping endpoint.*
- `onRequestPost()`: Validates optional requested role with Zod, verifies Clerk session, upserts D1 `users`, assigns allowed role, syncs Clerk metadata from D1, and returns user/role summary.

### File: `functions/clerk-webhook.js`
*Verified Clerk lifecycle webhook for Clerk-to-D1 sync.*
- `onRequestPost()`: Requires `CLERK_WEBHOOK_SIGNING_SECRET`, verifies the Svix-signed Clerk webhook, upserts D1 users for `user.created` / `user.updated`, marks users deleted for `user.deleted`, and ignores unrelated event types.

### File: `functions/user-role.js`
*Admin-only D1 role mutation endpoint with D1-to-Clerk metadata sync.*
- `onRequestPost()`: Requires Clerk auth plus D1 `admin`, validates role mutation payloads with Zod, assigns/removes `franchisee`, `franchisor`, `staff`, or `admin` in D1, then updates Clerk metadata from the D1 role snapshot.

### File: `functions/sync-clerk-metadata.js`
*Admin-only repair/backfill endpoint for D1-to-Clerk metadata sync.*
- `onRequestPost()`: Requires Clerk auth plus D1 `admin`, syncs one D1 user by `user_id` / `clerk_user_id` or up to 500 users with `all=true`, and rewrites Clerk metadata from D1 roles/status.

### File: `functions/form-submit.js` (v2.5)
*Clerk-authenticated D1-backed backend processing for all current form submissions.*
- `onRequestPost()`: Main entry point; requires `env.franchise_db`, validates base payload with Zod, requires Clerk/D1 role authorization, routes franchisee/franchisor/claim/test actions, and returns the legacy success/error JSON envelope.
- `FranchiseeSchema` / `FranchisorSchema`: Zod runtime validation for form payloads before D1 writes.
- `handleFranchiseeSubmit(db, data, actor)`: Checks duplicates and writes `franchisee_profiles.user_id`, `legacy_source_rows`, and actor-aware `audit_events`.
- `handleFranchisorSubmit(db, data, isClaim, actor)`: Checks duplicates and writes or updates franchisor/listing/package/publication/claim/audit D1 records with `user_id`, `owner_user_id`, `claimant_user_id`, franchisor profile contact/social URLs, and static rebuild queue requests for `site_franchisee_id`.
- `findClaimSource(db, data)`: Finds D1 `UNCLAIMED` franchise rows by `unclaimed_id` or normalized brand name for claim migration.
- `handleCreateUnclaimed()` / `handleClearTestData()`: Dev test-data actions now operate in D1 instead of Google Sheets and enqueue static rebuild requests because they affect public listing/claim-search output.
- `uniqueSlug()` / `slugExists()`: Generates non-conflicting D1 slugs for new submitted listings.
- Important: `/form-submit` must remain D1-only and authenticated; do not restore anonymous writes.

## 3a. Directory: `/.github/workflows` (Automation)

### File: `.github/workflows/d1-static-publish.yaml`
*Scheduled/manual D1-to-static publish poller.*
- Schedule: runs at minutes 7 and 37 every hour.
- `Poll D1 publish queue`: Runs `node scripts/d1-static-publish-poller.mjs`; exits before dependency install/build when D1 has no pending public-page work.
- Default publish path: the poller calls `PAGES_DEPLOY_HOOK_FRANCHISEE_ID`; Cloudflare Pages runs the configured build, including `pnpm run build:astro`.
- Fallback publish path: if `site_publish_state.publish_mode='github_direct_deploy'`, the workflow installs dependencies, runs `pnpm run build:astro`, deploys `dist/` with Wrangler, then marks D1 requests deployed/failed.
- Does not commit generated output back to `main`.

### File: `functions/get-franchises.js`
- `onRequestGet()`: API to fetch franchise data with Zod query validation, D1-first reads, legacy Cloudinary URL optimization, and a Sheets read fallback only when D1 is unavailable or explicitly requested.
- `getFranchiseRowsFromD1()`: Reads published `site_franchisee_id` franchise rows from D1 with optional `q`, `category`, `limit`, and `offset` filters.
- `getFranchiseeProfilesFromD1()`: Reads franchisee profile rows from D1 for operational/admin query compatibility.
- `filterClaimSearchRows()`: Preserves strict `UNCLAIMED` claim-search sanitization and deduplication.
- `getFranchisesFromSheets()`: Transition-only read fallback; do not add new Sheets writes.

---
## 4. Logic Safety Audit
- **Status**: Verified.
- **Lost logic recovered**: BEP calculations, multi-step progress, and media URL preview behavior (refactored into modular `form-0x-*.js` files and `form-utils.js`).
### File: `js/auth-clerk.js`
*Custom ClerkJS client integration using existing site CSS.*
- `Auth.init()`: Fetches `/auth-config`, loads pinned ClerkJS, and initializes Clerk.
- `Auth.getToken()` / `Auth.getAuthHeaders()`: Returns the active Clerk session token for protected Pages Functions.
- `Auth.syncUser(role)`: Calls `/auth-sync` to map Clerk users into D1 and optionally assign self-selectable `franchisee`/`franchisor` roles.
- `mountAuthPage()`: Replaces `/login` legacy WPForms markup or fills `/register` root with custom login/register/verification forms.
- `handleLogin()` / `handleRegister()` / `handleVerification()`: Custom email/password Clerk flows without Clerk prebuilt UI.
