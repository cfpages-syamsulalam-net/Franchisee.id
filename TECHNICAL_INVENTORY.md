# Technical Inventory: Franchise.id Codebase

This file records important functions, modules, and key variables across `/js`, `/functions`, `/scripts`, and `/src` to prevent logic loss during rapid development.

## Migration Direction
This inventory describes the current runtime and migration bridge. Google Sheets and Cloudinary references are transition-layer behavior, not the desired final stack. New backend work should move function ownership toward D1/R2/Clerk and update `CODEBASE.md`, `AUDIT.md`, and this inventory together. `/form-submit` is now Clerk-authenticated and D1-role-authorized.
Cloudflare Pages builds must run `pnpm run build` or `pnpm run build:astro` and output `dist`; otherwise dependency-backed Pages Functions cannot bundle imports such as `zod` and `@clerk/backend`.
The Pages output is hybrid: Astro writes D1-backed pages first, then `scripts/copy-legacy-static.mjs` copies legacy static assets/pages into `dist` without overwriting Astro output.

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

### File: `js/auth-clerk-debug.js`
*Masked auth diagnostics module for custom ClerkJS surfaces.*
- `window.FranchiseAuthDebug.create(options)`: Creates diagnostics helpers bound to `window.FranchiseAuth` and runtime storage/redirect callbacks.
- `initEvents(current)`: Merges persisted `sessionStorage` auth events with current events while preserving the event cap.
- `getDebugSnapshot()`: Returns the masked snapshot consumed by `/dashboard` and `/sso-callback`, including Clerk session summary, pending role/next state, filtered storage/cookie key names, redirect state, synced D1 user summary, and recent events.
- `recordDebug(event, details)`: Sanitizes and stores debug events without raw tokens/secrets; also logs to console when `window.FRANCHISE_AUTH_DEBUG` or `?auth_debug=1` is active.
- `summarizeClerk(clerk)`: Converts Clerk runtime/session/client state into safe booleans, counts, and short id hints.
- `keyHint(value)` / `tokenHint(value)` / `sessionHint(value)`: Generates masked hints for public keys, bearer tokens, and Clerk session/user ids.

### File: `js/auth-clerk.js`
*Custom ClerkJS client integration using existing site CSS.*
- `Auth.init()`: Fetches `/auth-config`, normalizes the publishable key with a public client fallback when config is stale/empty, sets `window.__clerk_publishable_key` plus Clerk script data attributes before browser-bundle evaluation, loads locally copied `/clerk/clerk.browser.js` with CDN fallbacks, initializes Clerk, and finalizes any Clerk OAuth redirect callback before token checks run.
- `createClerkInstance()` / `loadClerkInstance()`: Supports both constructor-style and singleton-style ClerkJS CDN initialization.
- `Auth.getToken()` / `Auth.getAuthHeaders()`: Returns the active Clerk session token for protected Pages Functions.
- `Auth.getDebugSnapshot()` / `Auth.recordDebug()`: Delegates masked Clerk lifecycle diagnostics to `js/auth-clerk-debug.js` for `/dashboard` and `/sso-callback/`.
- `Auth.syncUser(role)`: Calls `/auth-sync` to map Clerk users into D1, apply pending email grants, and optionally assign self-selectable `franchisee`/`franchisor` roles.
- `Auth.getAuthHeaders()`: Also syncs a pending public OAuth registration role from `sessionStorage` before protected form submissions use the bearer token.
- `mountAuthPage()`: Replaces `/login` legacy WPForms markup or fills `/register` root with public login/register/verification forms; supports Google OAuth buttons and `data-auth-variant="staff"` for login-only internal dashboard auth that returns to `/dashboard/`.
- `switchMode(root, mode)`: Switches login/register/verification panels, updates tab active state, and keeps inactive panels hidden with matching `aria-hidden` state.
- `handleLogin()` / `handleRegister()` / `handleVerification()`: Custom email/password Clerk flows without Clerk prebuilt UI.
- `handleOAuth(root, button)`: Starts Clerk Google OAuth sign-in/sign-up with `/sso-callback/` as the dedicated Clerk callback route; public registration stores the selected `franchisee`/`franchisor` role and the post-login destination until OAuth completion.
- `handleOAuthRedirectIfNeeded(clerk)` / `navigateAfterOAuth(target)`: Detects Clerk OAuth callback query parameters or the dedicated `/sso-callback/` route itself, calls `clerk.handleRedirectCallback()`, falls back to `clerk.setActive()` with `__clerk_created_session` when needed, refreshes Clerk resources, clears pending destination state, and either removes callback params in place or navigates to the saved completion URL before protected dashboard/form token checks continue.

### File: `js/dashboard-admin.js`
*Client controller for the protected `/dashboard` shell.*
- `boot()`: Initializes `window.FranchiseAuth`, reads auth headers, handles locked/login states, and fetches `/dashboard-data`.
- `bindDashboardTabs()` / `activateDashboardTab(name, updateHash)`: Controls icon-led dashboard tabs for Outreach, Data Quality, Review, and Operations, including arrow/Home/End keyboard navigation.
- `renderDashboard(data)`: Reveals the protected shell and fans dashboard API data into metrics, outreach, quality, claims, publish, editable listings, edit suggestions, leads, and health renderers.
- `renderOutreach(rows, summary)` / `logOutreach(link)`: Renders staff-personal WhatsApp links, shows contact-ready/published-unclaimed subset counts from `outreach_summary`, and records manually confirmed outreach through `/dashboard-data`.
- `renderQuality()` / `seedEditSuggestion(button)`: Shows data-quality warnings and seeds structured JSON edit suggestions.
- `submitEditSuggestion()` / `reviewEditSuggestion()` / `reviewClaim()`: Posts dashboard actions for staff/admin workflows.
- `renderAuthDebug(stage, extra)` / `copyAuthDebug()`: Renders and copies masked debug JSON from `window.FranchiseAuth.getDebugSnapshot()`.

### File: `js/build-listing.js`
*SSG Builder for the main directory page.*
- `parseCSVRows(content)`: Quote-aware CSV parser (handles commas/newlines inside quoted cells) for reliable local-sheet fallback parsing.
- `loadFromCSV(filePath)`: Fallback logic to read data if API fails, using robust CSV parsing to avoid column-shift corruption.
- `isLikelyClaimBrandRow(item)`: Heuristic filter to keep canonical brand rows for claim-search dataset generation (rejects URL/phone/address/legal-entity/contact-label rows).
- `generateCard(item, index)`: HTML generator for franchise cards (Hybrid: Verified/Unclaimed).
- Directory card CTAs use the neutral `Info Franchise` label for both claimed and unclaimed brands; claim prompts stay on individual detail pages.
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
- `fetchRowsFromD1(options)`: Loads published `site_franchisee_id` franchise rows from `franchise_db`, including public `phone` and `office_address` fields for Astro detail contact rendering, preferring the Cloudflare D1 HTTP API with `CLOUDFLARE_API_TOKEN` or a cfman token and falling back to Wrangler/cfman only when needed.
- `fetchRowsFromD1Http(sql, token)`: Build-safe D1 query path for Cloudflare Pages and CI. Uses `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_DATABASE_ID` when set, with current project defaults.
- `fetchRowsFromD1Wrangler(sql, options)`: Local fallback path that runs `pnpm exec wrangler d1 execute` with a cfman token.
- `renderDetailPage(row, template)`: Inserts D1 franchise data into `templates/detail-franchise-tpl.html` and marks output with `d1-generated:franchisee.id`.
- `generateContactBlock(row)`: Renders public contact and social links from D1 franchisor profile fields when present.
- `buildListingIndex(rows, template, previousManifest, nextManifest, options, stats)`: Renders `/peluang-usaha/index.html` from D1 data and skips unchanged output by manifest hash.
- Directory card CTAs use the neutral `Info Franchise` label for all listing tiers.
- `buildUnclaimedJson(rows, options, stats)`: Regenerates `json/unclaimed-brands.json` from D1 unclaimed rows for claim search.
- Snapshot behavior: non-dry runs write `json/d1-franchise-static-data.json`, which Astro consumes for static route generation.
- Detail output behavior: writes flat `/peluang-usaha/[slug].html` files while generated links remain extensionless `/peluang-usaha/[slug]`.
- Manifest behavior: `json/d1-generated-pages-manifest.json` tracks D1-owned pages; prune only removes tracked files that still contain the D1 marker, including old marker-owned folder indexes when paths change.
- Wrangler fallback uses project-pinned `pnpm exec wrangler` so the script does not resolve a newer Node-22-only Wrangler version under Node 20.

### File: `scripts/d1-static-publish-poller.mjs`
*Dependency-free GitHub Actions poller for D1-backed static publishing.*
- `pollAndMaybePublish()`: Expires stale queued requests, reads `site_publish_state`, counts pending `site_rebuild_requests`, enforces guardrails, and either exits cleanly or publishes.
- Default publish mode: calls the Cloudflare Pages Deploy Hook after D1 is dirty and guardrails allow publishing.
- Direct deploy fallback: emits workflow outputs for `wrangler pages deploy dist`, then `--mark-deployed` or `--mark-failed` updates D1 status.
- `expireStaleQueuedRequests()`: Moves old `queued` requests back to `failed_retryable` after `stale_queued_after_minutes`.
- `evaluateGuardrails(state)`: Enforces daily publish limit and minimum interval.
- D1 access: uses the Cloudflare D1 HTTP API with `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_D1_DATABASE_ID`.

### File: `scripts/copy-legacy-static.mjs`
*Post-Astro legacy static export copier for Cloudflare Pages output.*
- Copies root legacy HTML/XML/XSL files and public legacy directories into `dist`.
- Does not overwrite existing files, so Astro-generated D1 pages remain authoritative.
- Skips source/control directories such as `src`, `scripts`, `functions`, `docs`, `.github`, `node_modules`, `migrations`, and `dist`.
- Skips top-level `peluang-usaha`, duplicate directory archives, and known category aliases so legacy pages cannot compete with Astro's flat `/peluang-usaha/[slug].html` output or canonical `/peluang-usaha` directory.
- Rewrites copied legacy HTML links from `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/category`, and known top-level category aliases to `/peluang-usaha` query-param URLs.
- Copies `node_modules/@clerk/clerk-js/dist` into `dist/clerk` so browser auth can load ClerkJS locally before trying CDN fallbacks.

## 2. Directory: `/src` (Astro Static Generation)

### File: `src/lib/franchise-static.ts`
*Astro D1 snapshot validator and template renderer.*
- `FranchiseStaticRowSchema`: Zod schema for rows in `json/d1-franchise-static-data.json`.
- `loadFranchiseStaticRows()`: Reads and validates the generated D1 snapshot.
- `renderListingPage(rows, options)`: Renders the existing listing template from snapshot rows with canonical `/peluang-usaha` controls for search, sort, status filtering, and category filtering.
- Directory cards link to franchise information pages with a neutral `Info Franchise` CTA; unclaimed-specific claim CTAs remain on detail pages.
- `renderCategoryIndexPage(rows)`: Legacy helper that renders category cards, but canonical category browsing is now `/peluang-usaha?view=kategori` or `/peluang-usaha?kategori=[slug]`.
- `renderDetailPage(row)`: Renders the existing franchise detail template for one snapshot row.
- `applyCanonicalLegacyLinks(html)`: Rewrites legacy template/menu hrefs such as `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, and `/category` to canonical `/peluang-usaha` query URLs during Astro rendering.
- `normalizeDescriptionText(value, brandName)`: Presentation-normalizes mostly all-uppercase imported descriptions into readable sentence case while preserving legal prefixes/acronyms such as PT, CV, UD, BPOM, NIB, and F&B.
- `generateContactBlock(row, isUnclaimed)`: Renders D1 contact/social links into the detail page contact tab, including imported public phone/address data for unclaimed listings with a claim CTA.
- `parsePhoneContacts(value, defaultLabel, source)`: Splits messy Indonesian phone text into contact rows while preserving nearby labels such as Marketing, WA, Kantor, Office, and Owner.
- `findPhoneStarts(text)`: Locates likely phone-number start positions without splitting inside the same number.
- `inferPhoneLabel(text, start, end, fallback)`: Derives a readable contact label from text around each detected phone number.
- `classifyPhone(normalized, label, source)`: Classifies parsed numbers as WhatsApp, mobile, landline/office, or generic phone for display and link generation.
- `formatIndonesianPhone(normalized, type)`: Formats mobile numbers in 4-digit groups and landlines with area-code grouping.
- `generatePhoneContactRow(contact, row, isUnclaimed)`: Renders parsed phone contacts as styled `tel:` rows and adds a WhatsApp claim-notification link for unclaimed mobile/WhatsApp-capable numbers.
- `getRecommendedRows(rows)`: Sorts directory rows by verification/status and listing completeness; public access is now `/peluang-usaha?sort=rekomendasi`.
- `getPopularRows(rows)`: Sorts directory rows by a deterministic popularity proxy until real D1 analytics/lead/payment metrics exist.
- `getAlphabeticalRows(rows)`: Sorts directory rows alphabetically by brand name; public access is now `/peluang-usaha?sort=abjad`.
- `getCategoryRouteEntries(rows)`: Legacy helper for category aliases; do not add new indexable category archive routes without changing the canonical route policy.
- Helper functions mirror the D1 bridge mapping: HTML escaping, JSON-LD serialization, rupiah formatting, URL normalization, investment summary rendering, dynamic tabs, cards, breadcrumbs, disclaimers, social/contact links, Indonesian phone parsing/display normalization, all-caps description presentation normalization, sticky claim CTA, category summaries, listing status badges/tooltips, fact chips, `generateStatusBadge()`, `generateFactChips()`, `generateBreadcrumbJsonLd()`, and `applyDetailEnhancements()` metadata/breadcrumb cleanup.

### File: `src/lib/franchise-static-assets.ts`
*Generated CSS/JS and placeholder helper for D1-backed Astro pages.*
- `injectDirectoryAssets(html)`: Injects the generated directory CSS plus client-side query-param filtering/sorting script, including overflow/z-index overrides so card badge tooltips render above card parents and neighboring elements.
- `injectDetailAssets(html)`: Injects the generated detail-page CSS plus self-contained tab initialization script.
- `generateCssPlaceholder(label, className)`: Renders the CSS-only missing-logo placeholder used by directory cards, category cards, and detail pages.
- Extracted from `src/lib/franchise-static.ts` on 2026-06-22 to keep the main renderer below the highest-risk long-file threshold.

### File: `src/pages/peluang-usaha/index.astro`
*Astro static listing page.*
- `prerender = true`.
- Loads rows with `loadFranchiseStaticRows()`.
- Outputs full listing HTML with `renderListingPage(rows)`, including client-side query-param controls for `q`, `sort`, `kategori`, `status`, and `view=kategori`.

### File: `src/pages/peluang-usaha/[slug].astro`
*Astro static franchise detail pages with flat `.html` output under `build.format: "preserve"`.*
- `prerender = true`.
- `getStaticPaths()`: Creates one static route per snapshot row using the D1 slug.
- Outputs full detail HTML with `renderDetailPage(row)`.

### File: `src/pages/dashboard/index.astro`
*Static protected admin/staff dashboard shell.*
- `prerender = true`.
- Builds `/dashboard/index.html` with `noindex,nofollow`.
- Loads `js/auth-clerk-debug.js`, `js/auth-clerk.js`, and `js/dashboard-admin.js`; shows a login-only staff/admin form when no Clerk session exists.
- Renders the static dashboard shell, locked/login state, metric cards, icon-led tab navigation, tab panel shells, and debug panel shell. Runtime data rendering and actions are owned by `js/dashboard-admin.js`; dashboard styling is owned by `css/dashboard.css`.
- Staff edit UI submits structured JSON diffs; the API performs the field whitelist and role enforcement.
- Does not load `/wp-content/uploads/astra/astra-theme-dynamic-css-post-6.css` because that legacy dynamic CSS file is absent and returns HTML/404 in production.
- Security note: the static page is not the authorization boundary; `/dashboard-data` performs the server-side D1 role check.

### File: `src/pages/sso-callback/index.astro`
*Hidden Clerk OAuth callback route.*
- `prerender = true`.
- Builds `/sso-callback/index.html` with `noindex,nofollow`.
- Loads `js/auth-clerk-debug.js` and `js/auth-clerk.js`, then calls `window.FranchiseAuth.init()` so Clerk can run `handleRedirectCallback()` on Google OAuth return.
- Redirects to the saved pending destination from the masked auth snapshot only when Clerk has an active session.
- Shows a minimal masked debug fallback with an icon-only copy button when callback processing fails or returns without an active session.

### File: `public/_redirects`
*Cloudflare Pages redirects.*
- Redirects legacy duplicate directory URLs to canonical `/peluang-usaha` query-param states:
  `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/kategori/*`, `/category/*`, and known top-level category aliases.
- Prevents duplicate generated directory/category permalink families while preserving old external links.

## 3. Directory: `/functions` (Cloudflare Edge Logic)

### File: `functions/_clerk-auth.js`
*Shared Clerk session verification, D1 user sync, and role authorization helper.*
- `requireD1User(request, env, db, options)`: Verifies Clerk bearer token, upserts D1 user, applies active email role grants, optionally assigns self-selectable role, and enforces required D1 role. `admin` satisfies protected-role checks; `staff` satisfies staff-level checks only.
- `syncD1User(request, env, db, requestedRole)`: Auth sync variant used by `/auth-sync`; applies pending `email_role_grants` and pushes the current D1 role snapshot back into Clerk metadata.
- `syncWebhookUserToD1(env, db, clerkUser)`: Verifies Clerk webhook identity payloads, upserts D1 `users` from `user.created` / `user.updated`, and applies pending email role grants.
- `markD1UserDeleted(db, clerkUserId)`: Marks the D1 user row as `deleted` after a verified Clerk `user.deleted` webhook.
- `assignD1Role(db, userId, role, actorUserId)` / `removeD1Role(db, userId, role)`: Mutates D1 network roles used by admin role management.
- `applyEmailRoleGrants(db, user)`: Matches `email_role_grants.email_normalized` to the D1 user's primary email, inserts matching roles into `user_roles`, and marks the grant as applied.
- `syncClerkMetadataFromD1(env, user, roles)` / `syncClerkMetadataForD1User(env, db, user)`: Writes D1 user id, role list, status, and sync timestamp into Clerk public/private metadata.
- `authErrorResponse(error)`: Converts auth/role failures into the standard JSON response shape.
- Roles: only `franchisee` and `franchisor` are self-assignable; `admin` is the global elevated role, while `staff` is limited to staff-level access.

### File: `functions/_site-publish-queue.js`
*Shared D1 static publish queue helper for Pages Functions.*
- `SITE_FRANCHISEE_ID`: Canonical site id for `franchisee.id` publications.
- `siteRebuildStatements(db, options)`: Returns D1 prepared statements that insert a `site_rebuild_requests` row and update `site_publish_state` in the same batch as the public-page-affecting mutation.
- Used by `/form-submit` for franchisor listing submission, claim submission, dev unclaimed creation, and dev test-data clearing.

### File: `functions/auth-config.js`
*Public Clerk config endpoint.*
- `onRequestGet()`: Returns the Clerk publishable key from `PUBLIC_CLERK_PUBLISHABLE_KEY`, fallback `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, fallback `CLERK_PUBLISHABLE_KEY`, or the committed public live publishable-key fallback, plus configured status with `Cache-Control: no-store`.

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

### File: `functions/dashboard-data.js`
*Thin protected Franchisee.id dashboard router.*
- `onRequestGet()`: Requires Clerk auth plus D1 `staff`; existing role hierarchy also allows `admin`. Composes overview, outreach queue, outreach summary, quality, review, lead, publish, and health data from `_dashboard-queries.js`.
- `onRequestPost()`: Validates the discriminated action payload from `_dashboard-schemas.js`, then routes to `_dashboard-actions.js`.
- `requireDashboardAccess(request, env)`: Requires `env.franchise_db` and D1 `staff` access before any dashboard query/action runs.

### File: `functions/_dashboard-schemas.js`
*Dashboard action validation and editable field contract.*
- `DashboardActionSchema`: Zod discriminated union for `log_outreach`, `suggest_edit`, `review_edit_suggestion`, and `review_claim`.
- `sanitizeChanges(changes)`: Enforces dashboard-editable listing field whitelist and normalizes integer/real/enumerated values before D1 writes.
- `updateListingStatement(db, franchiseId, changes)`: Builds the whitelisted `franchises` update statement for approved dashboard listing edits.

### File: `functions/_dashboard-queries.js`
*Read-only D1 data model for `/dashboard-data`.*
- `getOverview(db)`: Returns Franchisee.id listing counts and completeness counts.
- `getDataQuality(db)`: Computes read-time warnings for missing images, contact, description, category, and likely all-caps descriptions; keeps all-caps detection in JavaScript so D1 does not evaluate complex `GLOB`/`LIKE` patterns.
- `getUnclaimedOutreachQueue(db)`: Reads up to 250 published unclaimed listings with public phone data, parses mobile/WhatsApp-capable Indonesian numbers, and builds staff-personal `wa.me` claim-notification links.
- `getUnclaimedOutreachSummary(db)`: Counts published unclaimed listings, contact-ready rows, missing-phone rows, and the current outreach queue limit for the dashboard badge.
- `getPendingClaims(db)` / `getEditSuggestions(db)` / `getEditableListings(db)`: Supplies the review tab.
- `getPublishState(db)` / `getLeadSummary(db)` / `getSystemHealth(db)`: Supplies the operations tab.

### File: `functions/_dashboard-actions.js`
*Protected dashboard write workflows.*
- `handleLogOutreach(db, auth, data)`: Records manually confirmed WhatsApp outreach and an audit event.
- `handleSuggestEdit(db, auth, data)`: Stores structured JSON diffs in `listing_edit_suggestions`. Admin or active trusted staff suggestions apply immediately; normal staff suggestions stay pending.
- `handleReviewEditSuggestion(db, auth, data)`: Admin-only approve/reject. Approved diffs write field-by-field to whitelisted `franchises` columns, write audit events, and queue a static rebuild through `siteRebuildStatements()`.
- `handleReviewClaim(db, auth, data)`: Admin-only approve/reject. Approval attaches ownership/profile data, moves unclaimed rows to free claimed state, writes audit events, and queues static rebuild.

### File: `functions/_dashboard-utils.js`
*Shared dashboard helpers.*
- `jsonResponse(payload, init)`: Standard no-store JSON response helper.
- `auditStatement(db, action, entityType, entityId, metadata, actorUserId)`: Shared audit-event insert statement builder.
- `parseWhatsAppContacts(value)` / `buildWhatsAppUrl(internationalDigits, row)`: Indonesian phone parsing and claim-notification link generation.
- `isLikelyAllCapsDescription(value)`: JavaScript-side all-caps heuristic used by data-quality checks.

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
- Default publish path: the poller calls `PAGES_DEPLOY_HOOK_FRANCHISEE_ID`; Cloudflare Pages runs the configured build, preferably `pnpm run build` which delegates to `pnpm run build:astro`.
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
