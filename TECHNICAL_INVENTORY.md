# Technical Inventory: Franchise.id Codebase

Last updated: 2026-07-04 00:10 (Asia/Jakarta)

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
- `window.openTab(tabName)`: Tab switch + animated segmented-control indicator positioning + revalidation + lazy claim data fetch.
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
- `FF.submitToCloudflare(formElement, type)`: Unified submit pipeline (handles claim routing + WA normalization), requires `window.FranchiseAuth` to attach a Clerk bearer token before posting to `/form-submit`, shows inline/SweetAlert CTA feedback instead of browser alerts, and redirects to a safe `next` URL after successful completion when present.
- `FF.ensureSubmitFeedback()` / `FF.setSubmitFeedback()` / `FF.showSubmitModal()`: Render public form submission feedback with clear recovery CTAs.
- `FF.submissionActionFromError()` / `FF.formSuccessNextUrl()` / `FF.withCurrentNext()`: Convert known blocked states into direct action links and preserve the user's return destination.
- `FF.initFormSubmission()`: Attaches submit listeners, draft persistence hooks, and aggressive auto-save triggers (input, change, step navigation, visibility change, beforeunload, tab switch).

### File: `js/form-07-init.js`
*Bootstrap coordinator for the modular form stack.*
- DOMContentLoaded orchestrator for claim bindings, calculations/city loader, country-code loader, submit wiring, state restoration, role query tab selection, and `/daftar` Clerk login enforcement.
- `enforceDaftarAuthAndPrefill()`: Initializes `window.FranchiseAuth`, redirects anonymous users to `/login?next=<current-daftar-url>`, syncs D1 user state, locks franchisee/franchisor email/name/PIC fields from Clerk/D1 identity, and redirects completed profiles to `/profil/`.
- `redirectCompletedProfileIfNeeded()`: Reads `/profile-data` after auth and sends users whose selected role is already complete away from first-time `/daftar` to `/profil/`.
- `lockIdentityValue()`: Writes Clerk/D1 identity into preserved form fields, keeps them read-only instead of disabled so existing submit contracts remain intact, uses `data-fr-tooltip` for the lock hint, and appends the identity lock note.
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
- `Auth.syncUser(role)`: Calls `/auth-sync` to map Clerk users into D1, apply pending email grants, and optionally assign explicit or pending self-selectable `franchisee`/`franchisor` roles.
- `Auth.getAuthHeaders()`: Also syncs a pending public OAuth registration role from `sessionStorage` before protected form submissions use the bearer token.
- `mountAuthPage()`: Replaces `/login` legacy WPForms markup with public `Masuk`/`Buat Akun`/forgot-password/forgot-email/verification forms; supports Google OAuth buttons and `data-auth-variant="staff"` for login-only internal dashboard auth that returns to `/dashboard/`.
- `showInitialAuthMessage(root)`: Shows CTA-backed info messages when anonymous `/daftar` or `/profil` visitors are redirected to `/login?next=...`.
- `showMessage(root, message, type)`: Renders plain or structured auth messages with optional hint text and CTA buttons/links, including panel switches for register/reset recovery.
- `renderSessionState(root)`: Shows a logged-in status for public users and hides auth forms, while admin/staff users keep the forms visible for manual auth UI inspection.
- `switchMode(root, mode)` / `normalizeAuthMode()`: Switches login/register/recovery/verification panels, updates tab active state, and keeps inactive panels hidden with matching `aria-hidden` state.
- `handleLogin()` / `handleRegister()` / `handleVerification()`: Custom email/password Clerk flows without Clerk prebuilt UI; public registration redirects to `/daftar/?role=...&continue=1` after account creation.
- `handleForgotPassword()` / `handleResetPassword()`: Sends Clerk reset-password email codes, shows a direct "Masukkan kode" recovery CTA, verifies the code, saves the new password, activates the resulting session, and returns to the normal next URL.
- `handleOAuth(root, button)`: Starts Clerk Google OAuth sign-in/sign-up with `/sso-callback/` as the dedicated Clerk callback route; public registration requires selected `franchisee`/`franchisor` role and stores the role-specific `/daftar` completion destination until OAuth completion.
- `handleOAuthRedirectIfNeeded(clerk)` / `navigateAfterOAuth(target)`: Detects Clerk OAuth callback query parameters or the dedicated `/sso-callback/` route itself, calls `clerk.handleRedirectCallback()`, falls back to `clerk.setActive()` with `__clerk_created_session` when needed, refreshes Clerk resources, clears pending destination state, and either removes callback params in place or navigates to the saved completion URL before protected dashboard/form token checks continue.

### File: `js/auth-clerk-ui.js`
*Custom auth page renderer.*
- `authTemplate(mode, options)`: Renders the custom login/register/forgot-password/reset-password/forgot-email/verification panels used by `js/auth-clerk.js`.
- Keeps the public auth HTML and Google icon markup out of the Clerk/session bootstrap file while preserving the existing `window.FranchiseAuth` public API.

### File: `js/auth-navbar.js`
*Public navbar auth-state controller for legacy HFE nav menus.*
- `initNavbarAuth()`: Finds legacy nav login/register pairs, normalizes logged-out labels to `Masuk` and `Daftar Mitra`, initializes Clerk, syncs D1 user state, and replaces auth links when a session exists.
- Logged-out `Daftar Mitra` points to protected `/daftar/`; anonymous users are then redirected by `js/form-07-init.js` to `/login?next=...` with an auth message.
- `createAccountItem(clerk, user)`: Builds the logged-in navbar item with Font Awesome account/logout icons, display name, D1 role badge, `/profil/` account link, and red icon-only logout.
- `bindLogout(item, clerk)`: Signs the active Clerk session out and returns to `/`.

### File: `js/opportunity-save.js`
*Public save-opportunity and premium inquiry controller for generated franchise pages.*
- Handles `data-save-franchise` buttons on directory cards/detail pages and `data-create-franchise-inquiry` buttons on Premium detail CTAs.
- Requires a Clerk session, redirects anonymous users to `/login/?next=...`, then posts `save_franchise_opportunity`, `remove_franchise_opportunity`, or `create_franchise_inquiry` to `/profile-data`.
- Uses CTA-backed inline status messages from the API, including the direct `/daftar` action when a franchisee needs to complete their interest profile first.
- Uses `css/opportunity-save.css` for icon-only directory save buttons, detail save buttons, and CTA-backed inline status styling.

### File: `js/shared-tooltip.js`
*Shared custom tooltip runtime.*
- `data-fr-tooltip`: Canonical attribute for UI hints; use this instead of browser `title` on interactive UI.
- `upgradeTitleTooltips(root)`: Converts supported legacy interactive `title` attributes to `data-fr-tooltip`, adds an accessible label when needed, and removes the native browser tooltip.
- `show(target)` / `hide()`: Renders one shared body-level tooltip instantly on hover/focus and hides it on pointerout, focusout, Escape, scroll, or resize.
- `positionTooltip(target)`: Uses fixed viewport positioning with top/bottom fallback and edge clamping so parent overflow and stacking contexts do not clip hints.
- `observeNewTooltips()`: Watches dynamically rendered UI such as `/profil` panels and navbar account controls.

### File: `js/profile-page.js`
*Client controller for the protected `/profil` profile center.*
- `init()`: Requires a Clerk session and redirects anonymous users to `/login/?next=/profil/`.
- `loadProfile()`: Fetches `/profile-data` with `window.FranchiseAuth.getAuthHeaders()`.
- `render()` / `renderActivePanel()`: Renders side tabs for summary and role-allowed franchisee/franchisor/owner listing/claims sections, delegating account, franchisee, franchisor/listing/claim, role add-on, membership, leads, and owner analytics UI to profile modules.
- `visibleTabs()` / `canSeeFranchisee()` / `canSeeFranchisor()`: Filters `/profil` navigation from D1 roles so franchisee users only see franchisee areas, franchisor users only see franchisor/listing/claim areas, and admin/staff users see both.
- `submitPublicRoleAdd(role)`: Posts the additive access change to `/profile-data` and redirects to the matching `/daftar` tab; role CTA/modal rendering lives in `js/profile-roles.js`.
- `submitFranchiseInquiry(franchiseId)`: Posts `create_franchise_inquiry` to `/profile-data`; recommendation/card rendering lives in `js/profile-franchisee.js`.
- `syncLocalSavedOpportunities()` / `toggleSavedOpportunity()`: Migrates old browser-saved opportunities into D1 when possible and posts save/remove actions to `/profile-data`; local storage/lookup helpers live in `js/profile-opportunities.js`.
- `submitPasswordForm(form)`: Uses ClerkJS on the current session to let Google-only users add a password login and password users change their password, with custom inline copy and no browser tooltip hints; account rendering lives in `js/profile-account.js`.
- `uploadListingMedia(input)`: Uploads logo/cover/proposal media through `/profile-upload`; listing and claim panel markup lives in `js/profile-franchisor.js`.
- Membership tab rendering is delegated to `js/profile-premium.js`, while `createPremiumOrder()` and `submitPremiumConfirmation()` stay in this controller.
- `createPremiumOrder(franchiseId)` / `submitPremiumConfirmation(form)`: Creates unique-code bank transfer orders or renewal orders through `/profile-data`, uploads optional proof files through `/premium-receipt-upload`, and submits payment confirmation for admin review.
- `updateLeadStatus(select)`: Saves owner-checked lead status updates through `/profile-data`; lead list/card rendering lives in `js/profile-leads.js`.
- `submitProfileForm(form)`: Posts account/profile/listing mutations to `/profile-data` with a Clerk bearer token.

### File: `js/profile-ui-utils.js`
*Shared UI helpers for `/profil` modules.*
- `field()` / `textarea()` / `readonlyIdentity()` / `roleBadges()`: Shared profile markup helpers used by profile panels.
- `emptyState()` / `emptyInline()`: Shared empty-state markup with direct CTA copy.
- `formatRupiah()` / `formatFullRupiah()`: Browser-side Rupiah display helpers for profile cards/payment rows.
- `leadStatusOptions()` / `whatsappLink()` / `statusLabel()`: Shared lead/contact labels and links.
- `setBusy()` / `setMessage()` / `errorBox()`: Shared form and error UI helpers.
- `hasGoogleAccount()` / `passwordHelperText()` / `readableClerkError()`: Clerk account display helpers for account/password UI.

### File: `js/profile-account.js`
*Account tab renderer for `/profil`.*
- `window.FranchiseProfileAccount.createRenderer(state, helpers)`: Returns `accountPanel()` using shared state/helpers from `js/profile-page.js`.
- `accountPanel()` / `accountFieldForm()` / `passwordEditForm()`: Renders granular name/email edit rows and password add/change controls; submit behavior stays in `js/profile-page.js`.

### File: `js/profile-roles.js`
*Role add-on renderer for `/profil`.*
- `window.FranchiseProfileRoles.createRenderer(state, helpers)`: Returns missing-role CTA and confirmation modal renderers.
- `roleAddOnPanel()` / `roleConfirmModal(role)`: Shows additive franchisee/franchisor CTAs while `submitPublicRoleAdd()` remains in `js/profile-page.js`.

### File: `js/profile-leads.js`
*Lead renderer for `/profil`.*
- `window.FranchiseProfileLeads.createRenderer(state, helpers)`: Returns `leadsPanel()` for franchisor lead UI.
- `leadCard(lead)`: Renders email/WhatsApp/listing shortcuts and status select markup; status saving stays in `js/profile-page.js`.

### File: `js/profile-analytics.js`
*Owner analytics renderer for `/profil`.*
- `window.FranchiseProfileAnalytics.createRenderer(state, helpers)`: Returns `analyticsPanel()` for franchisor/admin/staff users.
- `analyticsPanel()` / `listingAnalyticsCard(item)`: Renders 30-day views, saves, inquiries, contact clicks, conversion rate, and per-listing total counts from `owner_analytics`.

### File: `js/profile-opportunities.js`
*Saved opportunity storage helper for `/profil`.*
- `window.FranchiseProfileOpportunities.create(state)`: Returns localStorage helpers bound to profile state.
- `loadSavedOpportunities()` / `persistSavedOpportunities()` / `mergeSavedOpportunities()`: Preserve local-to-D1 saved opportunity migration behavior.
- `isOpportunitySaved()` / `opportunityById()` / `hasAskedInfo()`: Shared lookup helpers for opportunity cards and inquiry history.

### File: `js/profile-franchisee.js`
*Franchisee profile and opportunity renderer for `/profil`.*
- `window.FranchiseProfileFranchisee.createRenderer(state, helpers)`: Returns `franchiseePanel()` and `opportunitiesPanel()` using shared state/helpers from `js/profile-page.js`.
- `franchiseePanel()`: Renders the read-only identity rows plus editable franchisee preference fields.
- `opportunitiesPanel()` / `opportunityCard()`: Renders `Peluang Saya` recommendations, budget-fit labels, D1 saved opportunities, and inquiry history while action handlers stay in `js/profile-page.js`.

### File: `js/profile-franchisor.js`
*Franchisor profile, owned listing, and claim renderer for `/profil`.*
- `window.FranchiseProfileFranchisor.createRenderer(state, helpers)`: Returns `franchisorPanel()`, `listingPanel()`, and `claimsPanel()` using shared state/helpers from `js/profile-page.js`.
- `franchisorPanel()`: Renders the read-only identity rows plus editable company/contact fields.
- `listingPanel()` / `publicationDistribution()` / `mediaUploadControl()`: Renders owned D1 listing edit controls, network publication chips, media upload controls, and owner edit limit state.
- `claimsPanel()`: Renders submitted claim status and direct `/daftar` claim CTA copy.

### File: `js/profile-premium.js`
*Premium UI helper and Membership renderer for `/profil`.*
- `currentSubscription(subscriptions, franchiseId)`: Selects the active current subscription when renewal rows already exist for the same listing.
- `canRenew(subscription)` / `daysUntil(value)`: Implements the 30-day renewal-window check used by the Membership tab.
- `formatDate(value)` / `orderStatus(status)`: Keeps Premium expiry dates and order labels consistent without growing `js/profile-page.js`.
- `createProfileRenderer(state, helpers)`: Returns `membershipPanel()` for Premium readiness, owner notifications, payment instructions, confirmation form, active subscription, and renewal CTA rendering.

### File: `js/dashboard-utils.js`
*Shared browser helpers for dashboard modules.*
- `escapeHtml(value)` / `escapeAttr(value)`: Escapes dashboard-rendered strings before injecting HTML.
- `formatCurrency(value)`: Formats Indonesian Rupiah amounts for dashboard payment rows.
- `renderActionToolbar(items, label)` / `renderActionButton(config)` / `renderActionLink(config)`: Renders icon-only dashboard action controls with `aria-label` and `data-fr-tooltip`.
- `setFormValue(form, name, value)`: Writes dashboard form control values without duplicating selector logic.

### File: `js/dashboard-premium-operations.js`
*Premium Operations client module for `/dashboard`.*
- `window.FranchiseDashboardPremium.createOperations(options)`: Creates a panel controller from DOM references and callbacks supplied by `js/dashboard-admin.js`.
- `render(data)`: Renders Premium funnel counts, managed payment fields, lifecycle/settings fields, notifications, expiring subscriptions, annual reports, and queued email rows.
- `submitPaymentMethod(event)` / `submitPremiumSettings(event)`: Posts admin settings actions through the shared dashboard action callback.
- Queued email retry/cancel controls stay icon-only and call the same `/dashboard-data` action contract through the injected callback.

### File: `js/dashboard-review.js`
*Review/Data Quality client module for `/dashboard`.*
- `window.FranchiseDashboardReview.createOperations(options)`: Creates the review controller from DOM references, current dashboard state getter, admin-state callback, and shared action/reload/status callbacks.
- `render(data)`: Renders data-quality rows, pending claims, listing edit options, guided edit field rows, and pending edit suggestions.
- `refreshQualityChecks()`: Posts the protected refresh action and reloads dashboard data.
- `submitEditSuggestion(event)` / `reviewEditSuggestion(button)` / `reviewClaim(button)`: Posts guided edit submissions and admin review decisions through the existing `/dashboard-data` contract.

### File: `js/dashboard-operations.js`
*General Operations client module for `/dashboard`.*
- `window.FranchiseDashboardOperations.createOperations(options)`: Creates the outreach, publish, Premium payment review, publication-control, lead, and health renderer from DOM references and callbacks supplied by `js/dashboard-admin.js`.
- `render(data)`: Fans dashboard API data into outreach, Premium payment review, publish queue, publication controls, leads, and health panels.
- `renderOutreach()` / `logOutreach()`: Renders staff-personal WhatsApp outreach rows and records manually confirmed outreach through `/dashboard-data`.
- `renderPremiumPayments()` / `reviewPremiumPayment()`: Renders icon-only admin approval/rejection controls for pending Premium confirmations.
- `renderPublicationControls()` / `updatePublicationStatus()`: Renders network publication controls and posts admin status changes.
- `renderLeads()` / `renderHealth()`: Renders lead rows and system health summaries.

### File: `js/dashboard-admin.js`
*Client controller for the protected `/dashboard` shell.*
- `boot()`: Initializes `window.FranchiseAuth`, reads auth headers, handles locked/login states, and fetches `/dashboard-data`.
- `bindDashboardTabs()` / `activateDashboardTab(name, updateHash)`: Controls icon-led dashboard tabs for Outreach, Data Quality, Review, and Operations, including arrow/Home/End keyboard navigation.
- `renderDashboard(data)`: Reveals the protected shell and fans dashboard API data into metrics plus delegated Operations, Review/Data Quality/Claim, and Premium Operations modules.
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
- D1 row validation uses `D1FranchiseRowSchema` from `src/lib/shared-schemas.ts` so build-time and Astro snapshot rendering share the same row contract.
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

### File: `scripts/migrate-blogspot-proposals-to-r2.mjs`
*Resumable operational migration for legacy image-based franchise proposals.*
- `extractProposalUrls(value)`: Parses JSON arrays, raw URL lists, HTML `src` attributes, and legacy Blogspot/Blogger/googleusercontent values from `proposal_url`.
- `buildAssetRecords(rows, options)`: Preserves each image-to-franchise mapping with `franchise_id`, slug, brand name, source URL, deterministic R2 key, display order, asset id, and public URL.
- `downloadAssets(records, options)`: Downloads proposal pages into `.context/proposal-r2-migration/files` so interrupted runs can resume.
- `uploadAssets(records, options)`: Uploads objects sequentially through `npx cfman wrangler --account franchise-network r2 object put --remote` and can skip existing public objects.
- `buildSql(records, options)`: Generates idempotent SQL that upserts `franchise_assets`, rewrites `franchises.proposal_url` to first-party R2 public URLs per brand, and queues `site_rebuild_requests`.
- `applySqlRemote(options)`: Applies generated SQL to remote D1 in chunks to avoid D1 reset/time-limit failures.
- Command: `pnpm run migrate:proposal-r2 -- --download --upload-r2 --write-sql --apply-remote`.

### File: `scripts/copy-legacy-static.mjs`
*Post-Astro legacy static export copier for Cloudflare Pages output.*
- Copies root legacy HTML/XML/XSL files and public legacy directories into `dist`.
- Does not overwrite existing files, so Astro-generated D1 pages remain authoritative.
- Skips source/control directories such as `src`, `scripts`, `functions`, `docs`, `.github`, `node_modules`, `migrations`, and `dist`.
- Skips top-level `peluang-usaha`, duplicate directory archives, and known category aliases so legacy pages cannot compete with Astro's flat `/peluang-usaha/[slug].html` output or canonical `/peluang-usaha` directory.
- Rewrites copied legacy HTML links from `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/category`, and known top-level category aliases to `/peluang-usaha` query-param URLs.
- Copies `node_modules/@clerk/clerk-js/dist` into `dist/clerk` so browser auth can load ClerkJS locally before trying CDN fallbacks.

## 2. Directory: `/src` (Astro Static Generation)

### File: `src/lib/shared-schemas.ts`
*Shared TypeScript schemas for import/build/Astro validation.*
- `ImportFranchisorRowSchema` / `ImportUnclaimedRowSchema` / `ImportFranchiseeRowSchema`: CSV row validators used by the D1 importer.
- `D1FranchiseRowSchema`: Shared D1 static snapshot row validator used by the D1 page builder and Astro renderer.
- `normalizeListingStatusValue()` / `normalizeVerificationTierValue()` / `normalizeRoyaltyBasisValue()` / `normalizeHakiStatusValue()`: Shared enum/value normalizers for import and build paths.

### File: `src/pages/profil/index.astro`
*Protected profile page shell.*
- Static Astro route at `/profil/` with `noindex,nofollow`.
- Loads the custom Clerk debug/runtime scripts, navbar auth controller, Font Awesome, `css/profile.css`, profile renderer modules, and `js/profile-page.js`.
- Anonymous protection is client-side; all profile data and writes are protected again by `/profile-data`.

### File: `src/pages/premium/index.astro`
*Public premium membership sales page.*
- Static Astro route at `/premium/` with public SEO copy for the Rp 3.000.000/year premium offer.
- Loads Font Awesome, `css/premium.css`, and `js/premium-page.js`.
- CTAs point to `/login/?mode=register` and `/profil/?tab=membership` without exposing internal infrastructure terms, and include `data-premium-cta` attributes for coarse funnel tracking.

### File: `scripts/shared-csv.cjs`
*Shared quote-aware CSV parser for legacy Node builders.*
- `parseCsvRows(content)` / `parseCsvObjects(content)`: Handles quoted commas, escaped quotes, BOMs, and newlines inside quoted fields.
- `loadCsvObjects(filePath, options)`: Shared CSV fallback loader now used by `js/build-listing.js` and `js/build-sitemap.js`.

### File: `src/lib/franchise-static.ts`
*Astro D1 snapshot validator and template renderer.*
- `FranchiseStaticRowSchema`: Re-export of the shared D1 row schema for rows in `json/d1-franchise-static-data.json`.
- `loadFranchiseStaticRows()`: Reads and validates the generated D1 snapshot.
- `renderListingPage(rows, options)`: Renders the existing listing template from snapshot rows with canonical `/peluang-usaha` controls for search, sort, status filtering, and category filtering.
- Directory cards link to franchise information pages with a neutral `Info Franchise` CTA; unclaimed-specific claim CTAs remain on detail pages.
- `renderCategoryIndexPage(rows)`: Legacy helper that renders category cards, but canonical category browsing is now `/peluang-usaha?view=kategori` or `/peluang-usaha?kategori=[slug]`.
- `renderDetailPage(row)`: Renders the existing franchise detail template for one snapshot row, including dynamic Premium Galeri/Proposal/FAQ tabs when the row has premium/media/proposal data.
- Text normalization, escaping, URL cleanup, generated HTML cleanup, and legacy link canonicalization are delegated to `src/lib/franchise-text.ts`; Premium detail CTA/tab rendering is delegated to `src/lib/franchise-premium-detail.ts`; contact parsing/rendering is delegated to `src/lib/franchise-contact.ts`; directory ranking is delegated to `src/lib/franchise-ranking.ts`; category route helpers are delegated to `src/lib/franchise-category.ts`.
- Remaining local helper functions focus on template composition: JSON-LD serialization, investment summary rendering, dynamic tab assembly, cards, breadcrumbs, disclaimers, sticky claim CTA, listing status badges/tooltips, fact chips, `generateStatusBadge()`, `generateFactChips()`, `generateBreadcrumbJsonLd()`, and `applyDetailEnhancements()` metadata/breadcrumb cleanup.

### File: `src/lib/franchise-contact.ts`
*Detail contact renderer for D1-backed franchise static pages.*
- `generateContactBlock(row, isUnclaimed)`: Renders D1 contact/social links into the detail page contact tab, including imported public phone/address data for unclaimed listings with a claim CTA.
- `parsePhoneContacts(value, defaultLabel, source)`: Splits messy Indonesian phone text into contact rows while preserving nearby labels such as Marketing, WA, Kantor, Office, and Owner.
- `findPhoneStarts(text)`, `inferPhoneLabel(text, start, end, fallback)`, `classifyPhone(normalized, label, source)`, and `formatIndonesianPhone(normalized, type)`: Infer phone starts, labels, contact type, and Indonesian display formatting.
- `generatePhoneContactRow(contact, row, isUnclaimed)`: Renders parsed phone contacts as styled `tel:` rows and adds a WhatsApp claim-notification link for unclaimed mobile/WhatsApp-capable numbers.

### File: `src/lib/franchise-ranking.ts`
*Deterministic directory ranking helper.*
- `getRecommendedRows(rows)`: Sorts directory rows by verification/status and listing completeness; public access is now `/peluang-usaha?sort=rekomendasi`.
- `getPopularRows(rows)`: Sorts directory rows by the current deterministic popularity proxy; dynamic product-event signals are currently used in profile recommendations and dashboard analytics.
- `getAlphabeticalRows(rows)`: Sorts directory rows alphabetically by brand name; public access is now `/peluang-usaha?sort=abjad`.
- `scoreRecommendation(row)`, `scorePopularity(row)`, and `compareFranchises(a, b)`: Keep deterministic score/tie-break behavior outside the route renderer.

### File: `src/lib/franchise-category.ts`
*Category route and summary helper for generated directory pages.*
- `categorySlug(value)` and `canonicalCategoryHref(category)`: Normalize category links into canonical `/peluang-usaha?kategori=...` URLs.
- `getCategoryRouteEntries(rows)`: Legacy helper for category aliases; do not add new indexable category archive routes without changing the canonical route policy.
- `getCategorySummaries(rows)`: Aggregates counts and representative rows for category browsing.

### File: `src/lib/franchise-text.ts`
*Shared text/display helper for D1-backed franchise static pages.*
- `normalizeText()` / `normalizeBrandName()` / `normalizeCompanyName()` / `normalizeDescriptionText()`: Presentation-normalize imported brand/company/description text without changing raw D1 data.
- `formatRupiah()` / `getThumb()` / `paragraphs()` / `truncate()` / `slugify()`: Shared display helpers used by directory/detail rendering.
- `normalizeUrl()` / `normalizeExternalUrl()` / `escapeHtml()` / `escapeAttr()`: Shared URL and HTML output safety helpers.
- `normalizeGeneratedHtml()` / `applyCanonicalLegacyLinks()`: Cleanup generated template output and rewrite legacy directory/category links to canonical `/peluang-usaha` query URLs.

### File: `src/lib/franchise-premium-detail.ts`
*Premium detail-page renderer helper for D1-backed franchise static pages.*
- `isPremiumListing(row)`: Detects listing premium state from verification/status values.
- `generatePremiumLeadPanel(row)`: Renders the prominent Premium CTA panel with WhatsApp, inline inquiry, and proposal shortcut when proposal assets exist.
- `generatePremiumTabs(row)`: Returns dynamic Galeri, Proposal, and FAQ tab entries for `src/lib/franchise-static.ts`.
- `extractUrls(value)`: Parses proposal/gallery values from JSON arrays, raw URL lists, HTML `src` attributes, legacy Blogspot/Blogger text, and comma/newline-separated values.
- Proposal tab output stores image URLs for the detail asset script to generate a browser-downloaded PDF.

### File: `src/lib/franchise-static-assets.ts`
*Generated directory CSS/JS and placeholder helper for D1-backed Astro pages.*
- `injectDirectoryAssets(html)`: Injects the generated directory CSS plus client-side query-param filtering/sorting script, including overflow/z-index overrides so card badge tooltips render above card parents and neighboring elements.
- `generateCssPlaceholder(label, className)`: Renders the CSS-only missing-logo placeholder used by directory cards, category cards, and detail pages.
- Re-exports `injectDetailAssets(html)` from `src/lib/franchise-detail-assets.ts` so existing imports remain stable.
- Extracted from `src/lib/franchise-static.ts` on 2026-06-22, then split again on 2026-07-03 so directory and detail generated assets can evolve independently.

### File: `src/lib/franchise-detail-assets.ts`
*Generated detail-page CSS/JS helper for D1-backed Astro pages.*
- `injectDetailAssets(html)`: Injects the generated detail-page CSS plus self-contained tab initialization and proposal PDF scripts.
- `downloadProposalPdf(button)` / `buildPdfFromJpegs(pages)`: Browser-side proposal image to PDF flow used only inside the Proposal tab; loads R2 image pages, builds a local PDF Blob in memory, triggers browser download, stores no duplicate PDF in R2, shows inline status, and avoids browser alerts.
- Owns Premium detail CTA/gallery/proposal/FAQ styling outside the directory asset helper.

### File: `js/product-events.js`
*Public privacy-safe listing interaction tracker.*
- Records detail page views and contact clicks through `/product-event`.
- Exposes `window.FranchiseProductEvents.record()` so `js/opportunity-save.js` can record successful save/remove actions.

### File: `js/profile-page.js`
*Protected profile page client.*
- Renders owner-facing listing distribution chips from `owned_franchises[].publication_distribution`.
- Franchisee opportunity cards can show recommendations whose server-side score includes recent product-event counts when the analytics table exists.

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
- Loads `js/auth-clerk-debug.js`, `js/auth-clerk.js`, shared tooltip support, `js/dashboard-utils.js`, `js/dashboard-premium-operations.js`, `js/dashboard-review.js`, `js/dashboard-operations.js`, and `js/dashboard-admin.js`; shows a login-only staff/admin form when no Clerk session exists.
- Renders the static dashboard shell, locked/login state, metric cards, icon-led tab navigation, tab panel shells, Premium Operations/payment settings, pending Premium payment review, icon-only action toolbar controls, and debug panel shell. Runtime data rendering and actions are owned by dashboard browser modules; dashboard styling is owned by `css/dashboard.css`.
- Loads the existing Font Awesome asset used by legacy pages so dashboard icons use the same icon family as `/daftar`.
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

### File: `functions/profile-data.js`
*Protected profile read/write API for `/profil`.*
- `onRequestGet()`: Requires a Clerk bearer token, maps the user into D1, and delegates the profile response payload to `functions/_profile-read-model.js`.
- `onRequestPost()`: Dispatches mutations validated by `functions/_profile-schemas.js` for `update_account`, `update_franchisee_profile`, `update_franchisor_profile`, `update_listing`, `add_public_role`, `create_franchise_inquiry`, `save_franchise_opportunity`, `remove_franchise_opportunity`, `update_franchise_lead_status`, `create_premium_order`, and `confirm_premium_payment`.
- Account and role-add mutations are delegated to `functions/_profile-account.js`.
- Franchisee profile, inquiry, save, and remove mutations are delegated to `functions/_profile-franchisee-actions.js`.
- Franchisor profile, owner listing update, publication distribution reads, and lead status mutations are delegated to `functions/_profile-franchisor-actions.js`.
- Premium actions are delegated to `functions/_profile-premium.js`; read-model composition, recommendations, listing patch construction, schemas, and shared utilities are also split into profile helper modules.

### File: `functions/_profile-read-model.js`
*Profile GET/read-model helper for `/profile-data`.*
- `loadProfileData(db, actor)`: Builds the `/profile-data` GET payload with user summary, completion flags, profile rows, owned listings, claims, recommendations, saved opportunities, inquiry history, lead inbox, Premium membership state, and owner analytics.
- `profileLoaders`: Exposes `loadFranchiseeProfile()`, `loadPublicOpportunity()`, `loadSavedOpportunities()`, `loadFranchiseeInquiryHistory()`, and `loadFranchiseeLead()` callbacks consumed by franchisee action handlers.
- Owned listing edit lock state still uses `OWNER_LISTING_EDIT_INTERVAL_HOURS` from `functions/_profile-franchisor-actions.js`.

### File: `functions/_profile-owner-analytics.js`
*Owner analytics read helper for `/profile-data`.*
- `loadOwnerAnalytics(db, ownedRows)`: Aggregates `franchise_product_events` for owned listings into total and 30-day counts for views, saves, inquiries, and contact clicks.
- `conversionRate(metrics)`: Calculates view-to-inquiry conversion for summary and per-listing cards, returning zero when view counts are unavailable.

### File: `functions/_profile-account.js`
*Account and role-add mutation helper for `/profile-data`.*
- `updateAccount(env, db, actor, data)`: Updates Clerk identity first, then D1 `users` plus profile identity fields, writes audit events, and resyncs Clerk metadata from D1 roles.
- `addPublicRole(env, db, actor, data, loadProfileData)`: Allows logged-in public users to add the missing `franchisee` or `franchisor` role, writes an audit event, resyncs Clerk metadata, and returns the refreshed profile payload.

### File: `functions/_profile-franchisee-actions.js`
*Franchisee mutation helper for `/profile-data`.*
- `updateFranchiseeProfile(db, actor, data, loaders)`: Upserts the franchisee profile, writes an audit event, and returns the refreshed profile row.
- `createFranchiseInquiry(db, actor, data, loaders)`: Creates an owner lead from a recommended/saved opportunity after confirming the franchisee profile is complete enough to contact.
- `saveFranchiseOpportunity(db, actor, data, loaders)` / `removeFranchiseOpportunity(db, actor, data, loaders)`: Writes D1 saved opportunity state and records privacy-safe product events.

### File: `functions/_profile-franchisor-actions.js`
*Franchisor mutation and owned-listing helper for `/profile-data`.*
- `OWNER_LISTING_EDIT_INTERVAL_HOURS`: Shared six-hour owner listing edit window used by `/profile-data` response composition and listing save validation.
- `updateFranchisorProfile(db, actor, data)`: Updates franchisor company/contact/legal fields, writes an audit event, and returns the refreshed profile row.
- `updateOwnedListing(db, actor, data)`: Verifies owner access, enforces edit throttling, applies the allowed listing patch, writes an audit event, and queues a public rebuild.
- `updateFranchiseLeadStatus(db, actor, data)`: Verifies owner access to the lead, updates status, writes an audit event, and returns the refreshed lead inbox.
- `loadOwnedPublicationDistribution()` / `loadFranchisorLeadInbox()` / `loadFranchisorProfile()` / `loadOwnedListing()`: Shared read helpers used by the profile facade and franchisor actions.

### File: `functions/_profile-schemas.js`
*Zod mutation schemas for `/profile-data`.*
- `MutationSchema`: Discriminated union for account/profile/listing/role/inquiry/saved-opportunity/lead/Premium actions.
- Scalar validators keep text, integer, number, and money parsing consistent before profile writes.

### File: `functions/_profile-utils.js`
*Shared profile API helpers.*
- `getDb()` / `jsonResponse()` / `validationError()`: Common D1 binding and response helpers.
- `auditStatement()`: Inserts profile audit rows with `SITE_FRANCHISEE_ID`.
- `normalizeWhatsapp()` / `textOrNull()` / `normalizeText()` / `intOrNull()` / `numberOrNull()`: Shared profile input normalizers.
- `splitDisplayName()` / `getPrimaryEmail()`: Clerk account helpers used by account sync.

### File: `functions/_profile-recommendations.js`
*Franchisee recommendation helper for `/profil`.*
- `loadFranchiseeRecommendations(db, profile, ownedIds, limit)`: Queries published listings, excludes owned rows, merges product-event counts, scores candidates, and returns recommendation cards with budget labels and reasons.
- Budget/category matching and analytics weighting live here instead of in `functions/profile-data.js`.

### File: `functions/_profile-listing-patch.js`
*Owner listing update helper for `/profile-data`.*
- `listingPatch(data)`: Keeps the allowed owner-editable franchise fields in one place.
- `buildUpdate(table, patch, idColumn)`: Builds the SQL update fragment used by the rate-limited owner listing save path.

### File: `functions/_premium.js`
*Shared premium membership constants and helpers.*
- `PREMIUM_PLAN_CODE` / `PREMIUM_BASE_AMOUNT` / `PREMIUM_PAYMENT`: Centralize the plan code, yearly price, payment window, and fallback public payment instructions.
- `PREMIUM_RENEWAL_WINDOW_DAYS` / `PREMIUM_EXPIRING_LOOKAHEAD_DAYS`: Define the owner renewal window and dashboard expiry lookahead window.
- `PREMIUM_NETWORK_SITE_IDS` / `PREMIUM_NETWORK_SITE_DOMAINS`: Centralize the included Premium Network publication sites.
- `nextPremiumUniqueCode(db)`: Generates a three-digit unique transfer code that avoids active pending orders.
- `payableAmount(uniqueCode, baseAmount, discountAmount)` / `formatUniqueCode(code)`: Derive the user-facing amount, optional discount-adjusted amount, and code label.
- `premiumOrderId()` / `premiumConfirmationId()` / `premiumSubscriptionId()` / `premiumPublicationId()`: Generate prefixed ids for D1 premium tables and premium-created publication rows.
- `premiumCanonicalUrl(siteId, slug)`: Builds network-site canonical URLs for premium publication rows.
- `normalizeSubmittedAmount(raw)`: Converts Indonesian currency text into integer rupiah before validation/storage.

### File: `functions/_premium-ops.js`
*Shared premium operations helpers.*
- `loadActivePaymentMethod(db)` / `loadPaymentMethods(db)`: Read admin-managed payment instructions, including optional QRIS image fields, with a safe BCA fallback.
- `recordPremiumEvent(db, event)` / `loadPremiumFunnelSummary(db)`: Store and summarize Premium funnel events for `/premium`, profile membership, and dashboard review actions.
- `createPremiumNotification(db, notification)` / `notifyAdmins(db, notification)`: Persist owner/admin Premium status messages without blocking the main action if notification storage is unavailable.
- `loadPremiumNotifications(db, userId)` / `loadAdminPremiumNotifications(db)`: Feed `/profil` owner messages and dashboard Premium Operations messages.
- `queueNotificationEmail(db, email)` / `queueAdminPremiumEmails(db, email)`: Queue owner/admin payment emails in `notification_email_queue` without requiring an outbound provider during the main action.
- `loadNotificationEmailQueueSummary(db)` / `loadNotificationEmailQueueRows(db, limit)`: Supplies dashboard queue counts plus recent queued email rows with status/error/provider metadata.
- `loadPremiumSettings(db)` / `updatePremiumSettings(db, data, actorUserId)`: Read and update admin-managed Premium lifecycle/discount settings.
- `premiumOrderPricing(db, actor, listing)`: Applies the current multi-brand discount rule during new Premium order creation.
- `loadExpiringPremiumSubscriptions(db, days)`: Supplies upcoming Premium expiries for dashboard operations follow-up.
- `processPremiumLifecycle(db)` / `queuePremiumGraceEmails(db, settings)` / `expirePremiumAfterGrace(db, settings)`: Generate annual reports, queue daily grace emails, and downgrade Premium to Free after the configured grace period while queuing public rebuilds.
- `queuePremiumRenewalReminders(db)`: Creates one 30/14/7/1-day renewal reminder email/in-app notice per subscription window.
- `loadPremiumAnnualReports(db, limit)`: Supplies recent annual report rows for dashboard Premium Operations.
- `premiumReadinessForListing(listing)`: Scores logo, cover, description, contact, investment info, and proposal readiness for Premium review.

### File: `functions/_premium-email-worker.js`
*Premium email delivery worker service.*
- `processPremiumEmailWorker(env, options)`: Runs Premium lifecycle jobs, queues renewal reminders, sends due email rows when `RESEND_API_KEY` is configured, and returns delivery counts.
- `sendWithResend(env, row)`: Sends a text email through Resend using `PREMIUM_EMAIL_FROM` and optional `PREMIUM_EMAIL_REPLY_TO`.
- Queue updates store `provider='resend'`, `provider_message_id`, `attempt_count`, `next_attempt_at`, `last_error`, and `sent_at`; `body_html` is sent when present.

### File: `functions/_profile-premium.js`
*Profile-owned premium workflow module.*
- `CreatePremiumOrderSchema` / `ConfirmPremiumPaymentSchema`: Zod schemas for profile-side Premium actions, including optional `proof_asset_id`.
- `createPremiumOrder(db, actor, data)`: Verifies owned listing access, prevents duplicate active orders/subscriptions except within the renewal window, applies admin-managed multi-brand discounts when enabled, creates a unique-code transfer order, writes audit data, and records a Premium funnel event.
- `confirmPremiumPayment(db, actor, data)`: Validates submitted amount and optional proof asset ownership, creates a pending payment confirmation, updates order status, writes audit data, records funnel events, creates owner/admin notifications, and queues payment-status emails.
- `loadPremiumMembershipData(db, userId, franchiseIds)`: Returns plan/payment method data, active/pending orders, subscriptions, readiness checks, and recent owner notifications for `/profil`.

### File: `functions/premium-event.js`
*Public Premium funnel endpoint.*
- `onRequestPost()`: Accepts only `premium_page_view` and `premium_cta_click`, trims metadata, writes through `_premium-ops.js`, and returns a no-store JSON response.

### File: `functions/premium-email-worker.js`
*Protected Premium email worker route.*
- `onRequestPost()`: Requires `PREMIUM_EMAIL_WORKER_SECRET` through `Authorization: Bearer ...` or `x-worker-secret`, runs `processPremiumEmailWorker()`, logs operation telemetry, and returns a no-store JSON summary.
- `onRequestGet()`: Returns 405 because the worker should only be triggered by POST.

### File: `functions/premium-receipt-upload.js`
*Protected Premium proof-of-payment upload endpoint.*
- `onRequestPost()`: Requires Clerk/D1 auth, verifies the selected Premium order belongs to the actor, validates JPG/PNG/WebP/PDF files up to 6 MB, stores the receipt in R2, creates a `franchise_assets` row, and writes an audit event.

### File: `functions/payment-method-upload.js`
*Admin-only payment method QRIS upload endpoint.*
- `onRequestPost()`: Requires Clerk auth plus D1 `admin`, validates JPG/PNG/WebP QRIS images up to 3 MB, stores the file in R2 under `payment-methods/{code}/`, returns the public URL for `payment_methods.qris_image_url`, and writes an audit event.

### File: `functions/profile-upload.js`
*Protected owner media upload API for `/profil`.*
- `onRequestPost()`: Requires Clerk/D1 auth, validates multipart `franchise_id`, `asset_type`, and `file`, verifies listing ownership, stores logo/cover/proposal files in R2, records `franchise_assets`, updates the matching listing media URL field, writes an audit event, and queues a public-page rebuild.
- Supported files: logo and cover accept JPG/PNG/WebP; proposal accepts PDF.
- Requires the `FRANCHISE_ASSETS` R2 binding and `FRANCHISE_ASSETS_PUBLIC_BASE_URL`; production uses the R2 custom domain `https://assets.franchisee.id`.

### File: `functions/_clerk-auth.js`
*Shared Clerk session verification, D1 user sync, and role authorization helper.*
- `requireD1User(request, env, db, options)`: Verifies Clerk bearer token, upserts D1 user, applies active email role grants, optionally assigns self-selectable role, and enforces required D1 role. `admin` satisfies protected-role checks; `staff` satisfies staff-level checks only.
- `syncD1User(request, env, db, requestedRole)`: Auth sync variant used by `/auth-sync`; applies pending `email_role_grants` and pushes the current D1 role snapshot back into Clerk metadata.
- `syncWebhookUserToD1(env, db, clerkUser)`: Verifies Clerk webhook identity payloads, upserts D1 `users` from `user.created` / `user.updated`, and applies pending email role grants.
- `markD1UserDeleted(db, clerkUserId)`: Marks the D1 user row as `deleted` after a verified Clerk `user.deleted` webhook.
- `assignD1Role(db, userId, role, actorUserId)` / `removeD1Role(db, userId, role)`: Mutates D1 network roles used by admin role management.
- `applyEmailRoleGrants(db, user)`: Matches `email_role_grants.email_normalized` to the D1 user's primary email, inserts matching roles into `user_roles`, and marks the grant as applied.
- `syncClerkMetadataFromD1(env, user, roles)` / `syncClerkMetadataForD1User(env, db, user)`: Writes D1 user id, role list, status, and sync timestamp into Clerk public/private metadata.
- `upsertD1User(db, clerkUser)` / `isPrimaryEmailVerified(clerkUser)`: Reuses an existing D1 user when a new Clerk login has the same verified primary email, keeping email/password and Google entry points mapped to one app account.
- `authErrorResponse(error)`: Converts auth/role failures into the standard JSON response shape.
- Roles: only `franchisee` and `franchisor` are self-assignable; `admin` is the global elevated role, while `staff` is limited to staff-level access.

### File: `functions/_site-publish-queue.js`
*Shared D1 static publish queue helper for Pages Functions.*
- `SITE_FRANCHISEE_ID`: Canonical site id for `franchisee.id` publications.
- `siteRebuildStatements(db, options)`: Returns D1 prepared statements that insert a `site_rebuild_requests` row and update `site_publish_state` in the same batch as the public-page-affecting mutation.
- Used by `/form-submit` for franchisor listing submission, claim submission, dev unclaimed creation, and dev test-data clearing; used by `/profile-data` and `/profile-upload` for owner listing/media changes.

### File: `functions/auth-config.js`
*Public Clerk config endpoint.*
- `onRequestGet()`: Returns the Clerk publishable key from `PUBLIC_CLERK_PUBLISHABLE_KEY`, fallback `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, fallback `CLERK_PUBLISHABLE_KEY`, or the committed public live publishable-key fallback, plus configured status with `Cache-Control: no-store`.

### File: `functions/auth-sync.js`
*Clerk-to-D1 user mapping endpoint.*
- `onRequestPost()`: Validates optional requested role with Zod, verifies Clerk session, upserts D1 `users`, assigns allowed role, syncs Clerk metadata from D1, and returns user/role summary.

### File: `functions/clerk-webhook.js`
*Verified Clerk lifecycle webhook for Clerk-to-D1 sync.*
- `onRequestPost()`: Requires `CLERK_WEBHOOK_SIGNING_SECRET`, verifies the Svix-signed Clerk webhook, upserts D1 users for `user.created` / `user.updated`, marks users deleted for `user.deleted`, records operation telemetry for webhook success/failure, and ignores unrelated event types.

### File: `functions/user-role.js`
*Admin-only D1 role mutation endpoint with D1-to-Clerk metadata sync.*
- `onRequestPost()`: Requires Clerk auth plus D1 `admin`, validates role mutation payloads with Zod, assigns/removes `franchisee`, `franchisor`, `staff`, or `admin` in D1, then updates Clerk metadata from the D1 role snapshot.

### File: `functions/sync-clerk-metadata.js`
*Admin-only repair/backfill endpoint for D1-to-Clerk metadata sync.*
- `onRequestPost()`: Requires Clerk auth plus D1 `admin`, syncs one D1 user by `user_id` / `clerk_user_id` or up to 500 users with `all=true`, and rewrites Clerk metadata from D1 roles/status.

### File: `functions/dashboard-data.js`
*Thin protected Franchisee.id dashboard router.*
- `onRequestGet()`: Requires Clerk auth plus D1 `staff`; existing role hierarchy also allows `admin`. Composes overview, outreach queue, outreach summary, quality, review, pending premium confirmations, Premium operations, editable field definitions, lead, publish, publication controls, and health/telemetry data from `_dashboard-queries.js`.
- `onRequestPost()`: Validates the discriminated action payload from `_dashboard-schemas.js`, then routes to `_dashboard-actions.js`; failures are logged to operation telemetry when possible.
- `requireDashboardAccess(request, env)`: Requires `env.franchise_db` and D1 `staff` access before any dashboard query/action runs.

### File: `functions/_dashboard-schemas.js`
*Dashboard action validation and editable field contract.*
- `DashboardActionSchema`: Zod discriminated union for `log_outreach`, `suggest_edit`, `review_edit_suggestion`, `review_claim`, `review_premium_payment`, `update_payment_method`, `update_premium_settings`, `manage_notification_email`, `refresh_quality_checks`, and `update_publication`.
- `EDITABLE_LISTING_FIELD_DEFS`: Server-provided guided listing field definitions sourced from `_shared-schemas.js`.
- `sanitizeChanges(changes)`: Uses shared listing-field normalization to enforce the editable field whitelist and normalize integer/real/enumerated values before D1 writes.
- `updateListingStatement(db, franchiseId, changes)`: Builds the whitelisted `franchises` update statement for approved dashboard listing edits.

### File: `functions/_dashboard-queries.js`
*Read-only D1 data model for `/dashboard-data`.*
- `getOverview(db)`: Returns Franchisee.id listing counts and completeness counts.
- `getDataQuality(db)`: Reads persisted open `franchise_quality_checks` when available, falling back to computed warnings for missing images, contact, description, category, all-caps descriptions, suspicious contacts, stale listings, and invalid URLs.
- `getUnclaimedOutreachQueue(db)`: Reads up to 250 published unclaimed listings with public phone data, parses mobile/WhatsApp-capable Indonesian numbers, and builds staff-personal `wa.me` claim-notification links.
- `getUnclaimedOutreachSummary(db)`: Counts published unclaimed listings, contact-ready rows, missing-phone rows, and the current outreach queue limit for the dashboard badge.
- `getPendingClaims(db)` / `getEditSuggestions(db)` / `getEditableListings(db)`: Supplies the review tab, including full editable listing snapshots for guided old-value display.
- `getPendingPremiumPayments(db)`: Supplies pending premium payment confirmations with order, franchise, owner, receipt proof URL, and readiness context for the Operations tab.
- `getPremiumOperations(db)`: Supplies Premium funnel counts, payment method rows, Premium settings, recent Premium notifications, upcoming expiries, annual reports, queued-email summaries, and recent queued email rows for the Operations tab.
- `getPublishState(db)` / `getPublicationControls(db)` / `getLeadSummary(db)` / `getSystemHealth(db)`: Supplies the operations tab, including multi-site publication rows, operation-event counts, webhook summaries, recent audit events, rebuild state, and product-event counts.

### File: `functions/_dashboard-actions.js`
*Protected dashboard write workflows.*
- `handleLogOutreach(db, auth, data)`: Records manually confirmed WhatsApp outreach and an audit event.
- `handleSuggestEdit(db, auth, data)`: Stores guided field changes as structured diffs in `listing_edit_suggestions`. Admin or active trusted staff suggestions apply immediately; normal staff suggestions stay pending.
- `handleReviewEditSuggestion(db, auth, data)`: Admin-only approve/reject. Approved diffs write field-by-field to whitelisted `franchises` columns, write audit events, and queue a static rebuild through `siteRebuildStatements()`.
- `handleReviewClaim(db, auth, data)`: Admin-only approve/reject. Approval attaches ownership/profile data, moves unclaimed rows to free claimed state, writes audit events, and queues static rebuild.
- `handleReviewPremiumPayment(db, auth, data)`: Admin-only approve/reject. Approval marks the order paid, creates or renews a one-year `franchise_subscriptions` row, sets the listing premium, creates missing publication rows for included network sites, publishes those rows, writes audit/events/notifications, queues owner email notifications, and queues rebuilds for each affected site.
- `handleUpdatePaymentMethod(db, auth, data)`: Admin-only upsert for the manual BCA payment method shown to franchisors during Premium payment.
- `handleUpdatePremiumSettings(db, auth, data)`: Admin-only update for grace period, daily grace emails, annual reports, and multi-brand discount settings.
- `handleManageNotificationEmail(db, auth, data)`: Admin-only retry/cancel for queued email rows, with audit events so recovery actions do not require manual D1 edits.
- `handleRefreshQualityChecks(db, auth)`: Refreshes normalized contacts and persistent quality checks, then returns scanned/contact/open-check counts.
- `handleUpdatePublication(db, auth, data)`: Admin-only publication status update for one listing/site pair; writes audit events and queues a static rebuild for the affected site.

### File: `functions/_analytics.js`
*Privacy-safe product-event helper.*
- `ProductEventSchema`: Validates coarse product events: listing view, save, unsave, inquiry, claim, and contact click.
- `recordProductEvent(db, input, options)`: Inserts a product event without IP/user-agent data and silently returns `table_missing` when the migration is not applied yet.
- `loadProductEventCounts(db, franchiseIds, options)` / `analyticsScore(counts)`: Reads recent aggregate counts for recommendation scoring.

### File: `functions/_telemetry.js`
*Operations telemetry helper.*
- `logOperationEvent(db, input)`: Writes API/webhook/upload failures to `operation_events` and safely no-ops before the telemetry migration exists.

### File: `functions/product-event.js`
*Public product-event endpoint.*
- `onRequestPost()`: Accepts coarse listing interaction events from public pages and returns success even when analytics storage is unavailable.

### File: `functions/_shared-schemas.js`
*Shared validation/schema constants for Pages Functions.*
- `EDITABLE_LISTING_FIELD_DEFS`: Canonical dashboard-editable listing fields with labels, types, and select options.
- `sanitizeListingChanges(changes)` / `normalizeListingFieldValue(field, value)`: Shared dashboard listing change validation and normalization.
- `BaseSubmissionSchema` / `FranchiseeSubmissionSchema` / `FranchisorSubmissionSchema` / `CreateUnclaimedSubmissionSchema`: Shared form payload validators used by `/form-submit`.
- `GetFranchisesQuerySchema`: Shared `/get-franchises` query validator.
- Role/source/form/contact/quality-check enum schemas: Shared Zod enums for public/internal roles, source sheets, form types, test actions, contact types, quality-check statuses, and dashboard review decisions.
- `normalizeListingStatusValue()` / `normalizeVerificationTierValue()` / `normalizeRoyaltyBasisValue()` / `normalizeHakiStatusValue()`: Shared value normalizers for Function write paths.

### File: `functions/_contact-normalization.js`
*Normalized contact extraction for dashboard operations.*
- `buildNormalizedContacts(row)`: Converts existing listing/profile fields into high-confidence contact rows for phone, WhatsApp, email, website, address, and social links.
- `hasInvalidContactUrl(row)` / `normalizeExternalUrl(value, field)`: URL validation/normalization used by quality checks.

### File: `functions/_quality-checks.js`
*Persistent dashboard quality-check refresh logic.*
- `refreshDashboardQualityChecks(db, auth)`: Scans published Franchisee.id listings, upserts `franchise_contacts`, upserts current `franchise_quality_checks`, resolves no-longer-active checks, and writes a refresh audit event.
- `computeQualityChecks(row, contacts)`: Shared JavaScript heuristic for missing media/contact/description/category, likely all-caps, suspicious contact, stale listing, and invalid URL checks.

### File: `functions/_dashboard-utils.js`
*Shared dashboard helpers.*
- `jsonResponse(payload, init)`: Standard no-store JSON response helper.
- `auditStatement(db, action, entityType, entityId, metadata, actorUserId)`: Shared audit-event insert statement builder.
- `parseWhatsAppContacts(value)` / `buildWhatsAppUrl(internationalDigits, row)`: Indonesian phone parsing and claim-notification link generation.
- `isLikelyAllCapsDescription(value)`: JavaScript-side all-caps heuristic used by data-quality checks.

### File: `functions/form-submit.js` (v2.5)
*Clerk-authenticated D1-backed backend processing for all current form submissions.*
- `onRequestPost()`: Main entry point; requires `env.franchise_db`, validates base payload with Zod, requires Clerk/D1 role authorization, routes franchisee/franchisor/claim/test actions, records operation telemetry for server failures, and returns the legacy success/error JSON envelope.
- `FranchiseeSubmissionSchema` / `FranchisorSubmissionSchema` / `CreateUnclaimedSubmissionSchema`: Imported shared Zod runtime validation for form payloads before D1 writes.
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
- `onRequestGet()`: API to fetch franchise data with shared Zod query validation, D1-first reads, legacy Cloudinary URL optimization, and a Sheets read fallback only when D1 is unavailable or explicitly requested.
- `getFranchiseRowsFromD1()`: Reads published `site_franchisee_id` franchise rows from D1 with optional `q`, `category`, `limit`, and `offset` filters.
- `getFranchiseeProfilesFromD1()`: Reads franchisee profile rows from D1 for operational/admin query compatibility.
- `filterClaimSearchRows()`: Preserves strict `UNCLAIMED` claim-search sanitization and deduplication.
- `getFranchisesFromSheets()`: Transition-only read fallback; do not add new Sheets writes.

---
## 4. Logic Safety Audit
- **Status**: Verified.
- **Lost logic recovered**: BEP calculations, multi-step progress, and media URL preview behavior (refactored into modular `form-0x-*.js` files and `form-utils.js`).
