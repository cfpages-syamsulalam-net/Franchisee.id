# Technical Inventory: Franchise.id Codebase

Last updated: 2026-07-09 01:03 (Asia/Jakarta)

This file records important functions, modules, and key variables across `/js`, `/functions`, `/scripts`, and `/src` to prevent logic loss during rapid development.

## Migration Direction
This inventory describes the current runtime and migration bridge. Google Sheets and Cloudinary references are transition-layer behavior, not the desired final stack. New backend work should move function ownership toward D1/R2/Clerk and update `CODEBASE.md`, `AUDIT.md`, and this inventory together. `/form-submit` is now Clerk-authenticated and D1-role-authorized.
Cloudflare Pages builds must run `pnpm run build` or `pnpm run build:astro` and output `dist`; otherwise dependency-backed Pages Functions cannot bundle imports such as `zod` and `@clerk/backend`.
The Pages output is hybrid: Astro writes D1-backed pages first, then `scripts/copy-legacy-static.mjs` copies legacy static assets/pages into `dist` without overwriting Astro output.

## 1. Directory: `/js` (Client-side & SSG Builders)

### File: `js/form-01-state-helpers.js`
*Shared state + helper/sanitization + localStorage persistence layer.*
- `FF.state`: Shared runtime state (brands cache, step tracker, city list).
- `FF.constants`: Shared constants (`franchise_claim_state`, `franchisor_form_draft`, fallback country metadata, and derived default country-code list). Country metadata includes Indonesia plus supported SEA/nearby Asia markets, US, and Australia so regional franchisors can submit local mobile numbers without being forced into +62.
- `FF.setCountryMetadata(metadata)`, `FF.countryNameFromDialCode(value)`, and `FF.whatsappDigitRangeForDialCode(value)`: Browser helpers fed by `json/country-metadata.json` so origin inference and WhatsApp validation use the same country metadata.
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
- `FF.loadCountryCodeOptions()`: Loads `/json/country-metadata.json`, updates shared form country metadata, renders country-code dropdowns, and dispatches `franchise:countries-loaded`.
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
- `initBrandOriginFields()`: Keeps `brand_country` / `target_market` collapsed for Indonesian franchisors, opens and prefills origin when a non-Indonesia contact country code is selected, and ensures blank submissions default to Indonesia/Indonesia.
- `renderBrandCountryOptions()`: Rebuilds the collapsed `brand_country` select from shared country metadata after the public JSON loads.
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
- `window.formatWhatsAppNumber(phone)`: Formats Indonesian phone numbers to XXX-XXXX-XXXX pattern.
- `window.whatsappDigitRangeForField(field, digits)`: Resolves country-specific WhatsApp national-number length rules from the selected `country_code`; accepts shorter Singapore/Hong Kong local numbers and exact Taiwan/China/Vietnam/Australia/US ranges.
- `window.bindAutoFormatting()`: Binds auto-formatting listeners to name and WhatsApp fields on blur.
- `window.scrollToTopForm()`: Smooth scrolls to form start.
- `window.updateProgressBar(step, totalSteps)`: Updates visual progress indicator.
- `window.formatRupiah(angka)`: Formats numbers to Indonesian IDR format.
- `window.cleanNumber(str)`: Strips formatting from currency strings for calculation.
- `window.flashHighlight(element)`: Visual feedback for auto-calculated fields.
- `window.showErrorMsg(inputField, msg)`: Displays validation errors.
- `window.removeErrorMsg(inputField)`: Clears validation errors.
- `window.validateSpecificField(field)`: Detailed regex-based field validation (enhanced email, country-aware WhatsApp validation, Indonesia-only auto-formatting).

### File: `js/auth-clerk-debug.js`
*Masked auth diagnostics module for custom ClerkJS surfaces.*
- `window.FranchiseAuthDebug.create(options)`: Creates diagnostics helpers bound to `window.FranchiseAuth` and runtime storage/redirect callbacks.
- `initEvents(current)`: Merges persisted `sessionStorage` auth events with current events while preserving the event cap.
- `getDebugSnapshot()`: Returns the masked snapshot consumed by `/dashboard` and `/sso-callback`, including Clerk session summary, pending role/next state, filtered storage/cookie key names, redirect state, synced D1 user summary, and recent events.
- `recordDebug(event, details)`: Sanitizes and stores debug events without raw tokens/secrets; also logs to console when `window.FRANCHISE_AUTH_DEBUG` or `?auth_debug=1` is active.
- `summarizeClerk(clerk)`: Converts Clerk runtime/session/client state into safe booleans, counts, and short id hints.
- `keyHint(value)` / `tokenHint(value)` / `sessionHint(value)`: Generates masked hints for public keys, bearer tokens, and Clerk session/user ids.

### File: `js/auth-clerk-core.js`
*Custom ClerkJS core runtime shared by auth-enabled pages.*
- `window.FranchiseAuthCore.create(options)`: Builds the core auth controller used by `js/auth-clerk.js`.
- `Auth.init()`: Fetches `/auth-config`, normalizes the publishable key with a public client fallback when config is stale/empty, sets `window.__clerk_publishable_key` plus Clerk script data attributes before browser-bundle evaluation, loads locally copied `/clerk/clerk.browser.js` with CDN fallbacks, initializes Clerk, and finalizes any Clerk OAuth redirect callback before token checks run.
- `createClerkInstance()` / `loadClerkInstance()`: Supports both constructor-style and singleton-style ClerkJS CDN initialization.
- `Auth.getToken()` / `Auth.getAuthHeaders()`: Returns the active Clerk session token for protected Pages Functions.
- `Auth.syncUser(role)`: Calls `/auth-sync` to map Clerk users into D1, apply pending email grants, and optionally assign explicit or pending self-selectable `franchisee`/`franchisor` roles.
- `Auth.getAuthHeaders()`: Also syncs a pending public OAuth registration role from `sessionStorage` before protected form submissions use the bearer token.
- `handleOAuthRedirectIfNeeded(clerk)` / `navigateAfterOAuth(target)`: Detects Clerk OAuth callback query parameters or the dedicated `/sso-callback/` route itself, calls `clerk.handleRedirectCallback()`, falls back to `clerk.setActive()` with `__clerk_created_session` when needed, refreshes Clerk resources, clears pending destination state, and either removes callback params in place or navigates to the saved completion URL before protected dashboard/form token checks continue.

### File: `js/auth-clerk.js`
*Custom ClerkJS auth page facade using existing site CSS.*
- `Auth.init()` / `Auth.getToken()` / `Auth.getAuthHeaders()` / `Auth.syncUser()`: Exposed through the backward-compatible `window.FranchiseAuth` object, delegated to `js/auth-clerk-core.js`.
- `Auth.getDebugSnapshot()` / `Auth.recordDebug()`: Delegates masked Clerk lifecycle diagnostics to `js/auth-clerk-debug.js` for `/dashboard` and `/sso-callback/`.
- `mountAuthPage(options)`: Replaces `/login` legacy WPForms markup with public `Masuk`/`Buat Akun`/forgot-password/forgot-email/verification forms; supports Google OAuth buttons and `data-auth-variant="staff"` for login-only internal dashboard auth that returns to `/dashboard/`. A root with `data-auth-defer="true"` is skipped until callers pass `{ force: true }`, preventing the hidden dashboard login form from doing redundant session-state rendering while the dashboard skeleton is active.
- `showInitialAuthMessage(root)`: Shows CTA-backed info messages when anonymous `/daftar` or `/profil` visitors are redirected to `/login?next=...`.
- `showMessage(root, message, type)`: Renders plain or structured auth messages with optional hint text and CTA buttons/links, including panel switches for register/reset recovery.
- `renderSessionState(root)`: Shows a logged-in status for public users and hides auth forms, while admin/staff users keep the forms visible for manual auth UI inspection.
- `switchMode(root, mode)` / `normalizeAuthMode()`: Switches login/register/recovery/verification panels, updates tab active state, and keeps inactive panels hidden with matching `aria-hidden` state.
- `handleLogin()` / `handleRegister()` / `handleVerification()`: Custom email/password Clerk flows without Clerk prebuilt UI; public registration redirects to `/daftar/?role=...&continue=1` after account creation.
- `handleForgotPassword()` / `handleResetPassword()`: Sends Clerk reset-password email codes, shows a direct "Masukkan kode" recovery CTA, verifies the code, saves the new password, activates the resulting session, and returns to the normal next URL.
- `handleOAuth(root, button)`: Starts Clerk Google OAuth sign-in/sign-up with `/sso-callback/` as the dedicated Clerk callback route; public registration requires selected `franchisee`/`franchisor` role and stores the role-specific `/daftar` completion destination until OAuth completion.

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
- `getBuyerContext()`: Reads optional comparison, budget matcher, and BEP calculator context from `localStorage` and attaches it to Premium inquiry submissions.
- Uses CTA-backed inline status messages from the API, including the direct `/daftar` action when a franchisee needs to complete their interest profile first.
- Uses `css/opportunity-save.css` for icon-only directory save buttons, detail save buttons, and CTA-backed inline status styling.

### File: `js/shared-tooltip.js`
*Shared custom tooltip runtime.*
- `data-fr-tooltip`: Canonical attribute for UI hints; use this instead of browser `title` on interactive UI.
- `upgradeTitleTooltips(root)`: Converts supported legacy interactive `title` attributes to `data-fr-tooltip`, adds an accessible label when needed, and removes the native browser tooltip.
- `show(target)` / `hide()`: Renders one shared body-level tooltip instantly on hover/focus and hides it on pointerout, focusout, Escape, scroll, or resize.
- `positionTooltip(target)`: Uses fixed viewport positioning with top/bottom fallback and edge clamping so parent overflow and stacking contexts do not clip hints.
- `observeNewTooltips()`: Watches dynamically rendered UI such as `/profil` panels and navbar account controls.

### File: `css/profile.css`
*Protected profile page base stylesheet.*
- Owns the branded yellow/black/cream `/profil` shell, sticky dark header, scoped high-contrast logged-in account navbar overrides, dark hero, next-best-action cards, rounded side-tab layout/active states, panels, profile forms, account/security row layout, identity lock notes, role add-on cards/modal, franchisee opportunity cards, budget-fit badges, shared chips/lists/notices/buttons, and responsive stacking.
- Reuses the public site color language and Font Awesome cues without adding a styling dependency.

### File: `js/profile-page.js`
*Client controller for the protected `/profil` profile center.*
- `init()`: Requires a Clerk session and redirects anonymous users to `/login/?next=/profil/`.
- `loadProfile()`: Fetches `/profile-data` with `window.FranchiseAuth.getAuthHeaders()`.
- `render()` / `renderActivePanel()`: Renders the branded profile hero, next-best-action panel, and side tabs for summary and role-allowed franchisee/franchisor/owner listing/claims sections, delegating account, franchisee, franchisor/listing/claim, role add-on, membership, leads, and owner analytics UI to profile modules.
- `nextActionPanel()` / `nextActionCard(config)`: Chooses the most useful benefit-led CTA above the tabs: complete buyer preferences, complete a free brand page, activate Premium, finish/check Premium payment, review active Premium analytics, or continue buyer opportunity discovery.
- `premiumStateForListing(listing)`: Reads current membership subscriptions/orders for the selected listing so the profile next-action panel matches the Premium state shown in the Membership tab.
- `visibleTabs()` / `canSeeFranchisee()` / `canSeeFranchisor()`: Filters `/profil` navigation from D1 roles so franchisee users only see franchisee areas, franchisor users only see franchisor/listing/claim areas, and admin/staff users see both.
- `submitPublicRoleAdd(role)`: Posts the additive access change to `/profile-data` and redirects to the matching `/daftar` tab; role CTA/modal rendering lives in `js/profile-roles.js`.
- `submitFranchiseInquiry(franchiseId)`: Posts `create_franchise_inquiry` to `/profile-data` with optional browser buyer context; recommendation/card rendering lives in `js/profile-franchisee.js`.
- `getBuyerContext()`: Reads optional comparison, budget matcher, and BEP calculator context from `localStorage` for inquiry payloads.
- `syncLocalSavedOpportunities()` / `toggleSavedOpportunity()`: Migrates old browser-saved opportunities into D1 when possible and posts save/remove actions to `/profile-data`; local storage/lookup helpers live in `js/profile-opportunities.js`.
- `submitPasswordForm(form)`: Uses ClerkJS on the current session to let Google-only users add a password login and password users change their password, with custom inline copy and no browser tooltip hints; account rendering lives in `js/profile-account.js`.
- `uploadListingMedia(input)`: Uploads logo/cover/proposal media through `/profile-upload`; proposal success copy explains that extracted facts enter data review, while listing and claim panel markup lives in `js/profile-franchisor.js`.
- Membership tab rendering is delegated to `js/profile-premium.js`, while `createPremiumOrder()` and `submitPremiumConfirmation()` stay in this controller.
- `createPremiumOrder(franchiseId)` / `submitPremiumConfirmation(form)`: Creates unique-code bank transfer orders or renewal orders through `/profile-data`, uploads optional proof files through `/premium-receipt-upload`, and submits payment confirmation for admin review.
- `updateLeadStatus(select)`: Saves owner-checked lead status updates through `/profile-data`; lead list/card rendering lives in `js/profile-leads.js`.
- `submitProfileForm(form)`: Posts account/profile/listing/location mutations to `/profile-data` with a Clerk bearer token; listing location text is parsed into structured city/type/province rows before submit.

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
- Lead inbox layout lives in `css/profile-franchisor.css` on top of shared profile chips/buttons from `css/profile.css`.

### File: `js/profile-analytics.js`
*Owner analytics renderer for `/profil`.*
- `window.FranchiseProfileAnalytics.createRenderer(state, helpers)`: Returns `analyticsPanel()` for franchisor/admin/staff users.
- `analyticsPanel()` / `listingAnalyticsCard(item)`: Renders 30-day views, saves, inquiries, contact clicks, conversion rate, and per-listing total counts from `owner_analytics`.
- Analytics card/metric styling lives in `css/profile-analytics.css` on top of shared profile summary/stat styles.

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
- `locationEditor(listing)`: Renders the owner Area Listing editor from `structured_locations`, preserving source labels and one-line-per-city input format.
- `listingPanel()` / `publicationDistribution()` / `mediaUploadControl()`: Renders owned D1 listing edit controls, including optional brand origin and target-market fields, network publication chips, media upload controls, and owner edit limit state.
- `claimsPanel()`: Renders submitted claim status and direct `/daftar` claim CTA copy.
- Franchisor/listing/location/media styling lives in `css/profile-franchisor.css` on top of the shared profile base stylesheet.

### File: `js/profile-premium.js`
*Premium UI helper and Membership renderer for `/profil`.*
- `currentSubscription(subscriptions, franchiseId)`: Selects the active current subscription when renewal rows already exist for the same listing.
- `canRenew(subscription)` / `daysUntil(value)`: Implements the 30-day renewal-window check used by the Membership tab.
- `formatDate(value)` / `orderStatus(status)`: Keeps Premium expiry dates and order labels consistent without growing `js/profile-page.js`.
- `createProfileRenderer(state, helpers)`: Returns `membershipPanel()` for Premium readiness, owner notifications, payment instructions, confirmation form, active subscription, and renewal CTA rendering.
- Membership tab styling lives in `css/profile-premium.css` on top of the shared profile base stylesheet.

### File: `js/dashboard-utils.js`
*Shared browser helpers for dashboard modules.*
- `escapeHtml(value)` / `escapeAttr(value)`: Escapes dashboard-rendered strings before injecting HTML.
- `formatCurrency(value)`: Formats Indonesian Rupiah amounts for dashboard payment rows.
- `renderActionToolbar(items, label)` / `renderActionButton(config)` / `renderActionLink(config)`: Renders icon-only dashboard action controls with `aria-label` and `data-fr-tooltip`.
- `setFormValue(form, name, value)`: Writes dashboard form control values without duplicating selector logic.

### File: `css/dashboard.css`
*Protected admin/staff dashboard base stylesheet.*
- Owns the `/dashboard` warm yellow/black/cream app shell, dark sticky header, readable user/session chip, rounded metric cards, tab controls, panels, dashboard tables/forms/buttons/badges, generic icon action toolbars, debug panel, and shared responsive dashboard behavior.
- Keeps dashboard styling visually aligned with `/profil` while preserving the existing dashboard DOM/data/action modules. Feature-heavy auth loading, review, operations, premium, and OCR styles are extracted to focused CSS modules.

### File: `css/dashboard-auth.css`
*Dashboard auth/loading stylesheet module.*
- Owns the dashboard loading skeleton shown while Clerk/session/dashboard authorization is being checked before the login form is shown.

### File: `css/dashboard-review.css`
*Dashboard Review/Data Quality stylesheet module.*
- Owns guided edit field rows, field diff rows, and Area Listing editor layout/responsive behavior for the Review tab.

### File: `css/dashboard-operations.css`
*Dashboard Operations/admin helper stylesheet module.*
- Owns full-width dashboard operation panels, publication status grids/cells, and compact checkbox rows used by admin operations UI.

### File: `css/dashboard-premium.css`
*Dashboard Premium Operations stylesheet module.*
- Owns the Premium Operations grid, payment/settings forms, QRIS preview, and Premium-specific responsive behavior.

### File: `css/dashboard-ocr.css`
*Dashboard OCR stylesheet module.*
- Owns OCR guide cards, provider credential/status UI, scheduler credential UI, provider toggle/error/copy controls, job toolbar, persisted batch progress rows with structured scheduler-ETA countdown chips, icon-led job rows including needs-review/no-text status styling, OCR result search controls, compact franchise-grouped OCR result cards with page controls/actions, responsive two-column result-card layout, and OCR-specific responsive rules.

### File: `js/dashboard-premium-operations.js`
*Premium Operations client module for `/dashboard`.*
- `window.FranchiseDashboardPremium.createOperations(options)`: Creates a panel controller from DOM references and callbacks supplied by `js/dashboard-admin.js`.
- `render(data)`: Renders Premium funnel counts, managed payment fields, lifecycle/settings fields, notifications, expiring subscriptions, annual reports, and queued email rows.
- `submitPaymentMethod(event)` / `submitPremiumSettings(event)`: Posts admin settings actions through the shared dashboard action callback.
- Queued email retry/cancel controls stay icon-only and call the same `/dashboard-data` action contract through the injected callback.

### File: `js/dashboard-review.js`
*Review/Data Quality client module for `/dashboard`.*
- `window.FranchiseDashboardReview.createOperations(options)`: Creates the review controller from DOM references, current dashboard state getter, admin-state callback, and shared action/reload/status callbacks.
- `render(data)`: Renders data-quality rows, pending claims, listing edit options, guided edit field rows, pending edit suggestions, and admin Area Listing controls.
- `seedEditSuggestion(button)`: Seeds the guided edit form from a Data Quality warning, switches to the Review tab, scrolls to the form, and changes copy/action labels for admin direct-edit versus staff suggestion mode.
- `submitLocationUpdate(event)`: Admin-only dashboard action that posts structured location rows to `/dashboard-data` and reloads dashboard state after rebuild queueing.
- `refreshQualityChecks()`: Posts the protected refresh action and reloads dashboard data.
- `submitEditSuggestion(event)` / `reviewEditSuggestion(button)` / `reviewClaim(button)`: Posts guided edit submissions and admin review decisions through the existing `/dashboard-data` contract.

### File: `js/dashboard-operations.js`
*General Operations client module for `/dashboard`.*
- `window.FranchiseDashboardOperations.createOperations(options)`: Creates the outreach, publish, Premium payment review, publication-control, lead, health, and traffic-guardrail renderer from DOM references and callbacks supplied by `js/dashboard-admin.js`.
- `render(data)`: Fans dashboard API data into outreach, Premium payment review, publish queue, publication controls, leads, health, and traffic guardrail panels.
- `renderOutreach()` / `logOutreach()`: Renders staff-personal WhatsApp outreach rows and records manually confirmed outreach through `/dashboard-data`.
- `renderPremiumPayments()` / `reviewPremiumPayment()`: Renders icon-only admin approval/rejection controls for pending Premium confirmations.
- `renderPublicationControls()` / `updatePublicationStatus()`: Renders network publication controls and posts admin status changes.
- `renderLeads()` / `renderHealth()` / `renderTrafficGuardrails()`: Renders lead rows, system health summaries, and Cloudflare Free-plan limit/throttle visibility.

### File: `js/dashboard-ocr.js`
*Admin OCR coordinator/facade for `/dashboard`.*
- `window.FranchiseDashboardOcr.createOperations(options)`: Creates the OCR tab controller from subtab, provider-list/select/form/status, scheduler-select/form/status, job/batch/result DOM references, and shared dashboard callbacks.
- `render(payload, jobsPayload, schedulerPayload)` / `renderList(payload)` / `renderJobs(payload)` / `renderBatches(payload)` / `renderResults(payload)` / `fillForm(provider)` / `fillSchedulerForm(provider)`: Coordinates provider/scheduler forms and delegates state creation plus provider, job, batch/countdown, and result rendering to focused modules.
- `searchOcrJobs(status, offset)`: Fetches paginated OCR job rows from `/dashboard-data` for unqueued/pending/running/succeeded/needs-review/failed status chips, preserves the active filter after job mutations, and delegates grouped rendering to `js/dashboard-ocr-jobs.js`.
- `syncBatchCountdowns()`: Delegates structured scheduler ETA countdown label updates to `js/dashboard-ocr-batches.js` while keeping the facade responsible for timer lifecycle.
- `searchOcrResults(append)` / `resetResultSearch()` / `loadMoreResultSearch()`: Calls `search_ocr_results` to fetch filtered OCR result history by text/status from the server, appends paged results with de-duping, and keeps the default dashboard payload small until an admin searches.
- `syncBatchPolling(payload)`: Auto-refreshes `/dashboard-data` every few seconds while the OCR tab is visible and any persisted batch is still `queued` or `running`, so progress bars update without manual refresh.
- `markJobNoText(jobId, button)`: Lets an admin mark a failed OCR job as `needs_review` after opening the source image and confirming the brochure page has no useful text, avoiding false provider-error treatment while preserving retry if needed.
- `handleProviderListClick(event)`: Copies provider troubleshooting context, including provider key, health status, credential presence, last check timestamp, and last error, without exposing stored credential values.
- Provider-specific field rules come from `window.FranchiseOcrProviderMetadata`, which is injected from `src/lib/ocr-provider-metadata.js`; simple-key providers show only API key, Azure shows key plus endpoint, Cloudflare/Groq show model where relevant, AWS shows access key/secret/region, and Veryfi shows API key plus client ID plus username/auth secret.
- `handleFormChange(event)` / `saveConfig(successMessage)`: Auto-saves provider metadata plus optional replacement credentials or explicit clear flags; blank password inputs preserve existing D1 values, new credentials check the active-provider toggle automatically, and clearing the API key disables the provider.
- `handleSchedulerFormChange(event)` / `saveSchedulerConfig(successMessage)`: Auto-saves third-party scheduler credentials/settings through `update_ocr_scheduler_config`; blank token fields preserve existing encrypted D1 values, and new tokens enable the scheduler automatically.
- `runDryRun()` / `enqueueJobs()` / `runJobs()` / `retryBatch()` / `retryJob()` / `retryFailedJobs()`: Calls the admin-only OCR actions with explicit copy that dry-run is a real one-asset OCR run and `Jalankan 100` creates a persisted server-side batch drained by a third-party scheduler in small chunks. Batch retry skips already-succeeded jobs, returns failed/stale-running jobs in that batch to pending, and then reschedules after scheduler credential/URL fixes; per-row failed-job OCR retry runs that job immediately; batch failed retry requeues up to 100 failed jobs. Job execution/retry buttons are disabled when no provider is currently runnable, including when the only active provider is still in an active cooldown window; expired cooldown providers are treated as runnable again.

### File: `js/dashboard-ocr-state.js`
*Dashboard OCR state factory.*
- `window.FranchiseDashboardOcrState.createInitialState()`: Creates the provider/scheduler admin flags, autosave timers, active job/result filter state, result group page indexes, polling flags, and countdown timer handles used by the OCR coordinator.

### File: `js/dashboard-ocr-providers.js`
*Dashboard OCR provider/scheduler renderer.*
- `window.FranchiseDashboardOcrProviders.createRenderer(deps)`: Creates render helpers for the provider priority list, provider selector, provider-specific credential field visibility, stored-key badges, read-only quota/rate-limit metadata, scheduler selector/form, and scheduler credential summary.
- `fillProviderForm(form, provider, setStatus)` / `fillSchedulerForm(form, provider, setStatus)`: Populate password-preserving credential forms without putting stored secret values in the browser, while showing whether a key/secret already exists and whether a new value will replace it.

### File: `js/dashboard-ocr-jobs.js`
*Dashboard OCR job renderer.*
- `window.FranchiseDashboardOcrJobs.createRenderer(deps)`: Creates pure render helpers for OCR job status chips, paginated job filter headings, grouped franchise job cards, and per-job source/result/retry/no-text actions.
- `groupJobsByFranchise(jobs)` / `renderJobPagination(payload)`: Compact server-filtered job rows into franchise groups and show Prev/Next pagination for status-specific job lists.

### File: `js/dashboard-ocr-batches.js`
*Dashboard OCR batch renderer and countdown helper.*
- `window.FranchiseDashboardOcrBatches.createRenderer(deps)`: Creates pure render helpers for persisted OCR batch rows, progress bars, Retry/Refresh buttons, and structured scheduler countdown chips.
- `updateCountdownLabels(root)`: Reads `data-ocr-batch-countdown-until`, updates countdown text every second, and keeps overdue Refresh/Retry guidance visible after the scheduled due time has passed.

### File: `js/dashboard-ocr-results.js`
*Dashboard OCR result renderer.*
- `window.FranchiseDashboardOcrResults.createRenderer(deps)`: Creates pure render helpers for compact franchise-grouped OCR result cards, per-page result navigation, source image links, listing links, and review links.
- `groupResultsByFranchise(results)` / `renderResultGroup(group)`: Group OCR text results by franchise and render one card per franchise with page controls instead of a long flat list.

### File: `js/dashboard-ocr-schedulers.js`
*Dashboard OCR scheduler browser helper.*
- `providerMeta(providerKey)`: Returns scheduler-provider visible field/copy metadata for Upstash QStash, cron-job.org, Inngest, and Trigger.dev.
- `countActive(providers)` / `firstActive(providers)`: Shared helpers for the OCR dashboard coordinator to find active scheduler credentials without duplicating provider filtering logic.

### File: `src/lib/ocr-provider-metadata.js`
*Shared OCR provider requirements contract.*
- `OCR_PROVIDER_METADATA`: Defines visible dashboard fields, labels/help copy, and activation requirements for OCR.Space, Azure AI Vision, Cloudflare Workers AI, Google Vision, Groq Vision, Amazon Textract, Veryfi, Mindee, PDF.co, and API4AI.
- `OCR_PROVIDER_FIELD_NAMES`: Shared field list used by the dashboard browser module for visibility toggling.
- `getOcrProviderRequirementError(providerKey, config)`: Server-side activation prerequisite helper used by `functions/_ocr-provider-config.js`.

### File: `js/dashboard-admin.js`
*Client controller for the protected `/dashboard` shell.*
- `boot()` / `showLoadingPanel(message)` / `showLoginPanel(message, isError)`: Initializes `window.FranchiseAuth`, shows a skeleton while auth/dashboard authorization is processing, only shows and force-mounts the login form after no usable session or an auth error is known, reads auth headers, handles locked/login states, and fetches `/dashboard-data`.
- `readDashboardCache()` / `writeDashboardCache(data)` / `clearDashboardCache()`: Maintains a short `sessionStorage` cache for successful dashboard payloads keyed to the active Clerk user id and active session. Cached data can render immediately after Clerk init, then `/dashboard-data` refreshes live; missing/expired authorization clears the cache and relocks the protected shell.
- `bindDashboardTabs()` / `activateDashboardTab(name, updateHash)`: Controls icon-led dashboard tabs for Outreach, Data Quality, Review, Operations, and OCR, including arrow/Home/End keyboard navigation.
- `renderDashboard(data, options)`: Reveals the protected shell and fans dashboard API data into metrics plus delegated Operations, Review/Data Quality/Claim, Premium, and OCR modules. `options.cached` shows a refresh-in-progress status while live data is fetched.
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
- `fetchRowsFromD1(options)`: Loads published `site_franchisee_id` rows with the complete static detail contract, including outlet type, location requirement, cost components, contract duration, omzet, profit, royalty basis/period, contacts, media, and aggregated structured locations. This closes the gap where form data existed in D1/schema but became `null` in generated listings.
- D1 row validation uses `D1FranchiseRowSchema` from `src/lib/shared-schemas.ts` so build-time and Astro snapshot rendering share the same row contract.
- `fetchRowsFromD1Http(sql, token)`: Build-safe D1 query path for Cloudflare Pages and CI. Uses `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_DATABASE_ID` when set, with current project defaults.
- `fetchRowsFromD1Wrangler(sql, options)`: Local fallback path that runs `pnpm exec wrangler d1 execute` with a cfman token.
- `buildListingIndex(rows, template, previousManifest, nextManifest, options, stats)`: Renders `/peluang-usaha/index.html` from D1 data and skips unchanged output by manifest hash.
- `buildUnclaimedJson(rows, options, stats)`: Regenerates `json/unclaimed-brands.json` from D1 unclaimed rows for claim search.
- Snapshot behavior: non-dry runs write `json/d1-franchise-static-data.json`, which Astro consumes for static route generation.
- Detail output behavior: writes flat `/peluang-usaha/[slug].html` files while generated links remain extensionless `/peluang-usaha/[slug]`.
- Manifest behavior: `json/d1-generated-pages-manifest.json` tracks D1-owned pages; prune only removes tracked files that still contain the D1 marker, including old marker-owned folder indexes when paths change.
- Wrangler fallback uses project-pinned `pnpm exec wrangler` so the script does not resolve a newer Node-22-only Wrangler version under Node 20.

### File: `scripts/d1-page-renderer.ts`
*Pure renderer/helper module for D1-backed public page generation.*
- `buildListingHtml(rows, template)`: Renders `/peluang-usaha/index.html` cards and keeps directory CTAs on the neutral `Info Franchise` label.
- `renderDetailPage(row, template)`: Inserts D1 franchise data into `templates/detail-franchise-tpl.html`, renders JSON-LD/breadcrumb/sticky/disclaimer/contact markup, uses `src/lib/franchise-detail-summary.ts` for complementary quick facts, uses `src/lib/franchise-detail-tabs.ts` for the connected Profil/Detail/Investasi/Support/Brosur/Kontak tab shell, reuses generated detail asset injection from `src/lib/franchise-static-assets.ts`, and marks output with `d1-generated:franchisee.id`.
- `buildUnclaimedItems(rows)`: Creates sanitized unclaimed claim-search JSON items from published rows.
- `compareFranchises()`, `sha256()`, and `stableJson()`: Keep sorting and manifest hashing outside the D1/filerunner facade.
- HTML cleanup and legacy link canonicalization helpers keep generated bridge output compatible with canonical `/peluang-usaha` URLs.

### File: `scripts/import-csv-to-d1.ts`
*TypeScript/Zod CSV-to-D1 import facade.*
- Loads current CSV snapshots, validates rows through shared schemas, maps franchisor/unclaimed/franchisee rows into D1 write plans, preserves strict `UNCLAIMED` claim-search sanitization, collects warnings, prints stats, and optionally applies through the helper remote-apply path.
- Row-specific mapping remains here so source column contracts stay easy to audit.

### File: `scripts/import-csv-utils.ts`
*Reusable CSV importer utility module.*
- Owns quote-aware CSV parsing/loading, SQL insert/update/raw value serialization, package/publication/legacy source builders, stats helpers, stable id/hash generation, slug/text/number normalization, claim row filters, and remote apply execution.

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

### File: `scripts/sync-franchise-locations.ts`
*Repeatable structured location backfill for local SEO pages.*
- Reads `json/d1-franchise-static-data.json` and validates rows through `D1FranchiseRowSchema`.
- Uses `inferFranchiseLocations()` to generate `locations` and source-tagged `franchise_locations` rows for supported cities.
- Deletes only generated rows whose `source_field` matches known inferred fields for the current franchise ids, then reinserts the current inferred rows.
- Command: `pnpm run locations:sync` writes `.context/franchise-location-sync.sql`; `pnpm run locations:sync -- --apply-remote` applies it through cfman/wrangler.

### File: `scripts/copy-legacy-static.mjs`
*Post-Astro legacy static export copier for Cloudflare Pages output.*
- Copies root legacy HTML/XML/XSL files and public legacy directories into `dist`.
- Does not overwrite existing files, so Astro-generated D1 pages remain authoritative.
- Skips source/control directories such as `src`, `scripts`, `functions`, `docs`, `.github`, `node_modules`, `migrations`, and `dist`.
- Skips top-level `peluang-usaha`, duplicate directory archives, and known category aliases so legacy pages cannot compete with Astro's flat `/peluang-usaha/[slug].html` output or canonical `/peluang-usaha` directory.
- Rewrites copied legacy HTML links from `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/category`, and known top-level category aliases to `/peluang-usaha` query-param URLs.
- Copies `node_modules/@clerk/clerk-js/dist` into `dist/clerk` so browser auth can load ClerkJS locally before trying CDN fallbacks.

### File: `scripts/check-profile-client.mjs`
*Focused `/profil` browser regression check.*
- Runs `node --check` against `js/profile-page.js`, `js/profile-premium.js`, `js/profile-franchisee.js`, and `js/profile-franchisor.js`.
- Fails if stale undefined profile helper calls such as `selectedFranchise()` reappear.
- Exposed through `pnpm run profile:check`.

### File: `scripts/check-contact-parser.mjs`
*Focused imported-contact parser regression check.*
- Reads `functions/_dashboard-utils.js` and exercises the same parser helpers used by dashboard quality refresh/outreach.
- Covers Malaysia, Singapore, China, Hong Kong, Taiwan, Vietnam, two-number Indonesian mobile fields, space-grouped mobile pairs, hyphenated zero-prefixed groups, landlines, and call-center short numbers.
- Exposed through `pnpm run contact:check`.

## 2. Directory: `/src` (Astro Static Generation)

### File: `src/lib/shared-schemas.ts`
*Shared TypeScript schemas for import/build/Astro validation.*
- `ImportFranchisorRowSchema` / `ImportUnclaimedRowSchema` / `ImportFranchiseeRowSchema`: CSV row validators used by the D1 importer.
- `D1FranchiseRowSchema`: Shared D1 static snapshot row validator used by the D1 page builder and Astro renderer, including optional brand-origin and target-market listing facts.
- `structured_locations`: Optional JSON field in the D1 static snapshot, populated by the public page builder from `locations` and `franchise_locations`.
- `normalizeListingStatusValue()` / `normalizeVerificationTierValue()` / `normalizeRoyaltyBasisValue()` / `normalizeHakiStatusValue()`: Shared enum/value normalizers for import and build paths.

### File: `src/pages/profil/index.astro`
*Protected profile page shell.*
- Static Astro route at `/profil/` with `noindex,nofollow`.
- Loads Franchisee.id favicon/apple-touch icon, the custom Clerk debug/runtime scripts, navbar auth controller, Font Awesome, Outfit/DM Sans fonts, `css/profile.css`, `css/profile-premium.css`, `css/profile-analytics.css`, `css/profile-franchisor.css`, profile renderer modules, `js/profile-page.js`, and the high-intent Premium promo ribbon script.
- Anonymous protection is client-side; all profile data and writes are protected again by `/profile-data`.

### File: `src/pages/premium/index.astro`
*Public premium membership sales page.*
- Static Astro route at `/premium/` with benefit-led public SEO copy for the Rp 3.000.000/year Premium offer after a free brand page is ready.
- Shows editorial article and social media exposure add-on pricing alongside the yearly Premium offer.
- Loads Font Awesome, `css/premium.css`, `js/site-promo-bar.js`, and `js/premium-page.js`; the promo ribbon respects the dashboard-configured per-day view cap.
- CTAs point to `/login/?mode=register` and `/profil/?tab=membership` without exposing internal infrastructure terms, and include `data-premium-cta` attributes for coarse funnel tracking.
- Public copy leads with outcomes such as trust, easier discovery, and better follow-up rather than feature-first language.

### File: `scripts/shared-csv.cjs`
*Shared quote-aware CSV parser for legacy Node builders.*
- `parseCsvRows(content)` / `parseCsvObjects(content)`: Handles quoted commas, escaped quotes, BOMs, and newlines inside quoted fields.
- `loadCsvObjects(filePath, options)`: Shared CSV fallback loader now used by `js/build-listing.js` and `js/build-sitemap.js`.

### File: `src/lib/country-metadata.ts`
*Shared country metadata adapter for Astro/static generation.*
- `COUNTRY_METADATA`: Runtime copy of supported country metadata aligned with `data/country-metadata.json`.
- `normalizeCountryName(value)` / `countryDisplay(value)`: Normalize supported aliases and render flag-prefixed display labels for non-Indonesia public facts.
- `internationalMobileRuleForDigits(digits)` / `formatInternationalPhone(countryCode, localDigits)`: Shared international mobile matching and display formatting used by public contact rendering.

### File: `src/lib/franchise-static.ts`
*Astro D1 snapshot validator and template renderer.*
- `FranchiseStaticRowSchema`: Re-export of the shared D1 row schema for rows in `json/d1-franchise-static-data.json`.
- `loadFranchiseStaticRows()`: Reads and validates the generated D1 snapshot.
- `renderListingPage(rows, options)`: Renders the existing listing template from snapshot rows with canonical `/peluang-usaha` controls for search, sort, status filtering, category filtering, a benefit-led franchisor CTA, and internal links to modal/category/city/tools pages.
- Directory cards link to franchise information pages with a neutral `Info Franchise` CTA; unclaimed-specific claim CTAs remain on detail pages.
- `renderCategoryIndexPage(rows)`: Legacy helper that renders category cards, but canonical category browsing is now `/peluang-usaha?view=kategori` or `/peluang-usaha?kategori=[slug]`.
- `renderDetailPage(row)`: Renders the existing franchise detail template for one snapshot row, including complementary quick facts, information-section save/compare actions, a promoted H1 detail heading, non-Indonesia brand-origin/target-market facts with flag labels from `src/lib/country-metadata.ts`, connected buyer-intent tabs from `src/lib/franchise-detail-tabs.ts`, dynamic Premium Galeri/Brosur/FAQ entries when the row has premium/media/proposal data, and a post-tabs franchisor CTA for free brand creation plus Premium education.
- `renderCityIndexPage(rows)` / `renderCityLandingPage(entry, rows)`: Render static city discovery pages from structured D1 location rows with text inference fallback.
- `applySiteBranding(html)`: Normalizes legacy template public brand text from Franchise.id to Franchisee.id, updates logo alt text, and rewrites old support mailbox references to `email@franchisee.id`.
- Text normalization, escaping, URL cleanup, generated HTML cleanup, and legacy link canonicalization are delegated to `src/lib/franchise-text.ts`; detail quick facts and the profile summary panel are delegated to `src/lib/franchise-detail-summary.ts`; connected detail tab composition is delegated to `src/lib/franchise-detail-tabs.ts`; Premium detail CTA/media/Brosur/FAQ rendering is delegated to `src/lib/franchise-premium-detail.ts`; contact parsing/rendering is delegated to `src/lib/franchise-contact.ts`; directory ranking is delegated to `src/lib/franchise-ranking.ts`; category route helpers are delegated to `src/lib/franchise-category.ts`; city route helpers are delegated to `src/lib/franchise-city.ts` and `src/lib/franchise-location-normalization.ts`.
- Remaining local helper functions focus on template composition: JSON-LD serialization, owner CTAs, cards, breadcrumbs, disclaimers, sticky claim CTA, listing status badges/tooltips, card fact chips, `generateStatusBadge()`, `generateFactChips()`, `generateBreadcrumbJsonLd()`, and `applyDetailEnhancements()` metadata/breadcrumb cleanup.

### File: `src/lib/franchise-detail-summary.ts`
*Shared generated franchise detail summary renderer.*
- `generateDetailQuickFacts(row, tier)`: Returns only complementary chips such as BEP, non-Indonesia origin/target, or verified/premium status so the visible heading does not repeat the existing category/meta row.
- `generateDetailInfoPanel(row, logoUrl, category, minimumModal)`: Builds the `Profil` tab summary panel with a compact logo card, official social links when Website/Instagram/Facebook/TikTok/YouTube/LinkedIn URLs exist, category link, shared-tooltip explanations, actionable `Tanya Admin` / `Hubungi Admin` contact-tab openers, and icon-enriched fact cards from D1/form fields such as company, fees, royalty, founding year, outlets/area, BEP, origin/target, outlet type, location requirement, contract duration, omzet, net profit, and support.
- Shared through `src/lib/franchise-detail-tabs.ts` by both `src/lib/franchise-static.ts` and `scripts/d1-page-renderer.ts` so Astro output and the committed D1 bridge stay consistent.

### File: `src/lib/franchise-detail-tabs.ts`
*Shared connected tab composer for generated franchise detail pages.*
- `generateDetailTabEntries(row, options)`: Returns buyer-intent tabs from existing D1 data: `Profil`, `Detail`, `Investasi`, optional `Support`, optional Premium/media/Brosur/FAQ entries, and `Kontak`.
- `renderDetailTabsShell(tabEntries)`: Renders the connected full-width tab heading/content shell used by both Astro detail generation and the D1 bridge.
- `generateInvestmentTab(row, minimumModal)`: Internal helper that turns modal, fee, royalty, BEP, omzet, and net-profit data into compact icon cards and makes unknown values open the contact tab.

### File: `src/lib/franchise-contact.ts`
*Detail contact renderer for D1-backed franchise static pages.*
- `generateContactBlock(row, isUnclaimed)`: Renders D1 contact/social links into the detail page contact tab, including imported public phone/address data for unclaimed listings without adding duplicate claim CTAs; unclaimed detail pages use the floating claim bar as the single claim action.
- `replaceLegacyFloatingContacts(html, row)`: Removes template-level Alam WhatsApp/phone floats and emits only the listing's available parsed channels with its PIC/brand label.
- `parsePhoneContacts(value, defaultLabel, source)`: Splits messy imported phone text into contact rows, including Indonesian mobile pairs, supported SEA/nearby Asia mobile numbers matched through `src/lib/country-metadata.ts`, Indonesian landlines, and call-center short numbers while preserving nearby labels such as Marketing, WhatsApp, Kantor, Office, Call Center, and Owner.
- `findPhoneStarts(text)`, `isGroupedNonMobileStart(text, start)`, `matchPhoneCandidate(value)`, `inferPhoneLabel(text, start, end, fallback)`, `classifyPhone(parsed, label, source)`, `normalizePhoneDigits(value)`, `normalizeInternationalMobile(digits, countryCode, nationalPattern)`, `formatPhoneDisplay(parsed, type)`, and `formatInternationalPhone(countryCode, localDigits)`: Infer safe phone starts, avoid treating middle number groups as new contacts, classify mobile/international-mobile/landline/call-center numbers, and format public display values.
- `generatePhoneContactRow(contact)`: Renders parsed phone contacts as styled `tel:` rows without inserting extra claim-notification links.

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

### File: `src/lib/franchise-location-normalization.ts`
*Shared city/location normalization helper.*
- `CITY_ALIASES`: Supported Indonesian city/province aliases for current local discovery pages and backfill.
- `extractFranchiseLocations(row)`: Reads structured D1 location JSON first, then falls back to inferred text matches.
- `inferFranchiseLocations(row)`: Infers origin, head office, outlet, and available-area city rows from listing fields with source field and confidence metadata.
- `matchCityAliases(value)`: Finds supported city aliases with token-aware matching to reduce false positives.

### File: `src/lib/franchise-city.ts`
*City discovery route helper for generated directory pages.*
- `getCityRouteEntries(rows)`: Builds city page entries from `structured_locations` when present, with fallback to supported city aliases found in `city_origin`, office address, outlet location, and location requirement text; only keeps cities with enough listings.
- `getCitySummaries(rows)`: Returns compact city counts for directory/buyer-tool quick links.
- `primaryCityLabel(row)`: Returns the first matched city label for comparison payload display.
- `cityIndexCopy(rows)` / `cityLandingCopy(entry)`: Generate user-facing city page copy that explains the data source without overpromising area availability.

### File: `src/lib/franchise-buyer-tools.ts`
*Buyer tool and comparison page renderer.*
- `renderComparisonPage(rows)`: Renders `/bandingkan/` with an embedded compact listing payload.
- `renderBuyerToolsPage(rows)`: Renders `/alat-franchise/` with budget matcher, BEP calculator, and quick links into modal/category/city pages.
- `comparisonPayload(rows)`: Builds safe browser payload fields including brand, modal, category, BEP, royalty, primary city label, status, image, and detail URL.

### File: `src/lib/franchise-text.ts`
*Shared text/display helper for D1-backed franchise static pages.*
- `normalizeText()` / `normalizeBrandName()` / `normalizeCompanyName()` / `normalizeDescriptionText()`: Presentation-normalize imported brand/company/description text without changing raw D1 data.
- `formatRupiah()` / `getThumb()` / `paragraphs()` / `truncate()` / `slugify()`: Shared display helpers used by directory/detail rendering.
- `normalizeUrl()` / `normalizeExternalUrl()` / `escapeHtml()` / `escapeAttr()`: Shared URL and HTML output safety helpers.
- `sanitizeLegacyWordPressRuntime()` / `normalizeGeneratedHtml()` / `applyCanonicalLegacyLinks()`: Remove unused WordPress runtime snippets (`analyticswp`, emoji, LatePoint, and `admin-ajax`) from generated output, cleanup template whitespace, and rewrite legacy directory/category links to canonical `/peluang-usaha` query URLs.

### File: `src/lib/franchise-premium-detail.ts`
*Premium detail-page renderer helper for D1-backed franchise static pages.*
- `isPremiumListing(row)`: Detects listing premium state from verification/status values.
- `generatePremiumLeadPanel(row)`: Renders the prominent Premium CTA panel with WhatsApp, inline inquiry, and proposal shortcut when proposal assets exist.
- `generatePremiumTabs(row)`: Returns dynamic Galeri, Brosur, and FAQ tab entries for `src/lib/franchise-detail-tabs.ts`.
- `extractUrls(value)`: Parses proposal/gallery values from JSON arrays, raw URL lists, HTML `src` attributes, legacy Blogspot/Blogger text, and comma/newline-separated values.
- Proposal tab output stores image URLs and renders one-page-at-a-time brochure controls with in-image top bar download/status controls plus left/right overlay hit areas.

### File: `src/lib/franchise-static-assets.ts`
*Generated directory CSS/JS and placeholder helper for D1-backed Astro pages.*
- `injectDirectoryAssets(html)`: Injects the generated directory CSS plus client-side query-param filtering/sorting script, including owner CTA styling and overflow/z-index overrides so card badge tooltips render above card parents and neighboring elements.
- `generateCssPlaceholder(label, className)`: Renders the CSS-only missing-logo placeholder used by directory cards, category cards, and detail pages.
- Re-exports `injectDetailAssets(html)` from `src/lib/franchise-detail-assets.ts` so existing imports remain stable.
- Extracted from `src/lib/franchise-static.ts` on 2026-06-22, then split again on 2026-07-03 so directory and detail generated assets can evolve independently.

### File: `src/lib/franchise-detail-assets.ts`
*Generated detail-page asset injector facade for D1-backed Astro pages.*
- `injectDetailAssets(html)`: Keeps the historical injection contract stable, injects detail styles before `</head>`, injects detail scripts before `</body>`, and stays idempotent by checking the shared style id.
- Delegates generated CSS to `src/lib/franchise-detail-styles.ts` and generated browser JavaScript to `src/lib/franchise-detail-scripts.ts` to reduce truncation and merge risk.

### File: `src/lib/franchise-detail-styles.ts`
*Generated detail-page CSS module for D1-backed Astro pages.*
- `FRANCHISE_DETAIL_STYLE_ID`: Stable DOM id used by the injector and smoke check.
- `renderFranchiseDetailStyles()`: Returns the generated detail `<style>` block for border-light profile/tab presentation, Premium gallery/brochure/FAQ styling, dynamic contact floats, brochure overlay top bar, transparent-gradient left/right hit areas, pointer-motion visibility states, and responsive rules.

### File: `src/lib/franchise-detail-scripts.ts`
*Generated detail-page browser script module for D1-backed Astro pages.*
- `FRANCHISE_DETAIL_SCRIPT_ID`: Stable DOM id used by the injected browser script.
- `renderFranchiseDetailScripts()`: Returns the generated detail `<script>` block for tab activation, `initProposalReaders()`, `setProposalPage(reader, requestedPage)`, pointer-motion auto-hide for proposal overlay controls, keyboard page navigation, contact-tab shortcuts, compare button behavior, and `/proposal-download` PDF requests with in-button progress/status.
- The actual proposal image fetch/PDF/watermark work remains in `functions/_proposal-pdf.js`; the browser script only sends first-party proposal image URLs and downloads the returned Blob.

### File: `scripts/check-franchise-detail-assets.ts`
*Focused generated-detail asset regression check.*
- `pnpm run detail-assets:check`: Verifies `injectDetailAssets()` is idempotent and injects the expected detail CSS/JS hooks for tabs, proposal overlay/download/navigation, contact floats, compare actions, and WordPress-runtime cleanup.

### File: `scripts/check-dashboard-ocr-client.mjs`
*Focused dashboard OCR browser-module regression check.*
- `pnpm run dashboard:ocr:check`: Runs `node --check` only on the browser/non-module OCR client modules and asserts provider/state renderer modules, provider toggle, retry actions, job filter/pagination, and no-active-provider disabled-state wiring remain present.

### File: `js/product-events.js`
*Public privacy-safe listing interaction tracker.*
- Records detail page views and contact clicks through `/product-event`.
- `listing_view` events are sampled at 3%, deduped per listing for 6 hours, and guarded by a per-browser daily public-event budget to reduce Pages Function request pressure.
- Contact-click events are deduped per listing/channel for 1 hour.
- Exposes `window.FranchiseProductEvents.record()` so `js/opportunity-save.js` can record successful save/remove actions.

### File: `js/profile-page.js`
*Protected profile page client.*
- Renders owner-facing listing distribution chips from `owned_franchises[].publication_distribution`.
- Franchisee opportunity cards can show recommendations whose server-side score includes recent product-event counts when the analytics table exists.

### File: `src/pages/peluang-usaha/index.astro`
*Astro static listing page.*
- `prerender = true`.
- Loads rows with `loadFranchiseStaticRows()`.
- Outputs full listing HTML with `renderListingPage(rows)`, including client-side query-param controls for `q`, `sort`, `kategori`, and `status`, a free-brand/Premium franchisor CTA, plus quick links to static category/modal pages, buyer tools, and comparison.

### File: `src/pages/peluang-usaha/[slug].astro`
*Astro static franchise detail pages with flat `.html` output under `build.format: "preserve"`.*
- `prerender = true`.
- `getStaticPaths()`: Creates one static route per snapshot row using the D1 slug.
- Outputs full detail HTML with `renderDetailPage(row)`, including the post-tabs franchisor CTA.

### File: `src/pages/peluang-usaha/kategori/index.astro`
*Astro static category index page.*
- `prerender = true`.
- Outputs category cards with `renderCategoryIndexPage(loadFranchiseStaticRows())`.

### File: `src/pages/peluang-usaha/kategori/[slug].astro`
*Astro static category landing pages.*
- `getStaticPaths()`: Builds one page per populated category/alias from the D1 snapshot.
- Outputs filtered listing pages with category intro copy, SEO metadata, and standard directory controls.

### File: `src/pages/peluang-usaha/modal/index.astro`
*Astro static capital-range index page.*
- `prerender = true`.
- Outputs capital range cards with `renderCapitalIndexPage(loadFranchiseStaticRows())`.

### File: `src/pages/peluang-usaha/modal/[slug].astro`
*Astro static capital-range landing pages.*
- `getStaticPaths()`: Builds seven populated capital-range pages from comparable investment fields.
- Outputs filtered listing pages with modal-range intro copy, SEO metadata, and standard directory controls.

### File: `src/pages/peluang-usaha/kota/index.astro`
*Astro static city index page.*
- `prerender = true`.
- Outputs city cards with `renderCityIndexPage(loadFranchiseStaticRows())`.

### File: `src/pages/peluang-usaha/kota/[slug].astro`
*Astro static city landing pages.*
- `getStaticPaths()`: Builds one page per supported city with enough matched listings from location text.
- Outputs filtered listing pages with city intro copy, SEO metadata, and standard directory controls.

### File: `src/pages/bandingkan/index.astro`
*Static comparison tool page.*
- Embeds compact listing data through `renderComparisonPage()`.
- Runtime compare add/remove behavior lives in `js/franchise-compare.js`.

### File: `src/pages/alat-franchise/index.astro`
*Static buyer tools page.*
- Embeds compact listing data through `renderBuyerToolsPage()`.
- Runtime budget matcher and BEP simulation live in `js/franchise-buyer-tools.js`.
- Quick links include modal, category, and city discovery pages.

### File: `src/pages/dashboard/index.astro`
*Static protected admin/staff dashboard shell.*
- `prerender = true`.
- Builds `/dashboard/index.html` with `noindex,nofollow`.
- Loads dashboard base/auth/OCR styles plus auth/tooltips/utilities, Premium, Review, Operations, OCR, and controller client modules; shows a skeleton while the session is checked and marks the login-only staff/admin auth root with `data-auth-defer="true"` so it is only mounted when no Clerk session exists or the session must be renewed.
- Renders the branded dashboard shell and an OCR tab with provider selector, provider-specific password credential fields, read-only quota/free-limit metadata, priority-list enablement, icon-led grouped job rows, retry controls, and explicit credential clear controls. Injects `src/lib/ocr-provider-metadata.js` into `window.FranchiseOcrProviderMetadata` and loads the split OCR browser modules before the coordinator facade. Runtime authorization remains server-side.
- Loads the existing Font Awesome asset used by legacy pages so dashboard icons use the same icon family as `/daftar`.
- Staff edit UI submits structured JSON diffs; the API performs the field whitelist and role enforcement.
- Does not load `/wp-content/uploads/astra/astra-theme-dynamic-css-post-6.css` because that legacy dynamic CSS file is absent and returns HTML/404 in production.
- Security note: the static page is not the authorization boundary; `/dashboard-data` performs the server-side D1 role check.

### File: `src/pages/sso-callback/index.astro`
*Hidden Clerk OAuth callback route.*
- `prerender = true`.
- Builds `/sso-callback/index.html` with `noindex,nofollow`.
- Loads `js/auth-clerk-debug.js`, `js/auth-clerk-ui.js`, `js/auth-clerk-core.js`, and `js/auth-clerk.js`, then calls `window.FranchiseAuth.init()` so Clerk can run `handleRedirectCallback()` on Google OAuth return.
- Redirects to the saved pending destination from the masked auth snapshot only when Clerk has an active session.
- Shows a minimal masked debug fallback with an icon-only copy button when callback processing fails or returns without an active session.

### File: `public/_redirects`
*Cloudflare Pages redirects.*
- Redirects legacy duplicate directory URLs to canonical `/peluang-usaha` states:
  `/direktori-franchise`, `/rekomendasi`, `/populer`, and `/abjad`.
- Redirects legacy category URLs and known top-level category aliases to static `/peluang-usaha/kategori/[slug]` landing pages.
- Prevents duplicate generated directory/category permalink families while preserving old external links.

## 3. Directory: `/functions` (Cloudflare Edge Logic)

### File: `functions/profile-data.js`
*Protected profile read/write API for `/profil`.*
- `onRequestGet()`: Requires a Clerk bearer token, maps the user into D1, and delegates the profile response payload to `functions/_profile-read-model.js`.
- `onRequestPost()`: Dispatches mutations validated by `functions/_profile-schemas.js` for `update_account`, `update_franchisee_profile`, `update_franchisor_profile`, `update_listing`, `update_listing_locations`, `add_public_role`, `create_franchise_inquiry`, `save_franchise_opportunity`, `remove_franchise_opportunity`, `update_franchise_lead_status`, `create_premium_order`, and `confirm_premium_payment`.
- Account and role-add mutations are delegated to `functions/_profile-account.js`.
- Franchisee profile, inquiry, save, and remove mutations are delegated to `functions/_profile-franchisee-actions.js`.
- Franchisor profile, owner listing update, publication distribution reads, and lead status mutations are delegated to `functions/_profile-franchisor-actions.js`.
- Premium actions are delegated to `functions/_profile-premium.js`; read-model composition, recommendations, listing patch construction, schemas, and shared utilities are also split into profile helper modules.

### File: `functions/_profile-read-model.js`
*Profile GET/read-model helper for `/profile-data`.*
- `loadProfileData(db, actor)`: Builds the `/profile-data` GET payload with user summary, completion flags, profile rows, owned listings, structured location rows, claims, recommendations, saved opportunities, inquiry history, lead inbox, Premium membership state, and owner analytics.
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
- `createFranchiseInquiry(db, actor, data, loaders)`: Creates an owner lead from a recommended/saved opportunity after confirming the franchisee profile is complete enough to contact, storing sanitized optional buyer context in the lead raw payload.
- `sanitizeBuyerContext(value)`: Keeps only compact top-level/nested intent data from comparison, budget matcher, and BEP tools before persistence.
- `saveFranchiseOpportunity(db, actor, data, loaders)` / `removeFranchiseOpportunity(db, actor, data, loaders)`: Writes D1 saved opportunity state and records privacy-safe product events.

### File: `functions/_profile-franchisor-actions.js`
*Franchisor mutation and owned-listing helper for `/profile-data`.*
- `OWNER_LISTING_EDIT_INTERVAL_HOURS`: Shared six-hour owner listing edit window used by `/profile-data` response composition and listing save validation.
- `OWNED_LISTING_QUERY_CHUNK_SIZE`: Caps owned-listing location/publication ID batches so D1 does not reject large `IN (...)` reads when an admin/staff user can see many listings.
- `updateFranchisorProfile(db, actor, data)`: Updates franchisor company/contact/legal fields, writes an audit event, and returns the refreshed profile row.
- `updateOwnedListing(db, actor, data)`: Verifies owner access, enforces edit throttling, applies the allowed listing patch, writes an audit event, and queues a public rebuild.
- `updateListingLocations(db, actor, data)`: Verifies owner access, replaces owner-managed `franchise_locations` rows through `functions/_location-writes.js`, writes an audit event, and queues a public rebuild.
- `updateFranchiseLeadStatus(db, actor, data)`: Verifies owner access to the lead, updates status, writes an audit event, and returns the refreshed lead inbox.
- `loadOwnedStructuredLocations()` / `loadOwnedPublicationDistribution()` / `loadFranchisorLeadInbox()` / `loadFranchisorProfile()` / `loadOwnedListing()`: Shared read helpers used by the profile facade and franchisor actions; owned location/publication reads chunk IDs before binding.

### File: `functions/_profile-schemas.js`
*Zod mutation schemas for `/profile-data`.*
- `MutationSchema`: Discriminated union for account/profile/listing/location/role/inquiry/saved-opportunity/lead/Premium actions. Listing updates accept optional `brand_country` and `target_market`.
- `FranchiseInquirySchema`: Accepts optional `buyer_context` so public/profile inquiry clients can pass recent tool intent without changing lead table columns.
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
- `listingPatch(data)`: Keeps the allowed owner-editable franchise fields in one place, including `brand_country` and `target_market`.
- `buildUpdate(table, patch, idColumn)`: Builds the SQL update fragment used by the rate-limited owner listing save path.

### File: `functions/_location-writes.js`
*Shared manual location write helper for profile and dashboard actions.*
- `normalizeManualLocations(rows)`: Trims city/province input, defaults unknown types to `available_area`, slugifies city names, deduplicates by type/slug, and caps writes at 24 rows.
- `manualLocationWriteStatements(db, franchiseId, rows, sourceField)`: Builds the delete-plus-insert D1 statements for manual `locations` and `franchise_locations` rows while preserving the existing `owner_profile` source field contract.
- `manualLocationRelationId()` / `manualLocationId()` / `slugifyLocation()`: Centralize deterministic location ids used by owner/admin location saves.
- `manualLocationSummary(locations)`: Builds compact audit metadata for profile and dashboard location update events.

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
*Premium operations compatibility facade.*
- Re-exports focused Premium operation modules so existing imports in profile, dashboard, public promo/event, and email worker code remain stable after modular extraction.

### File: `functions/_premium-settings.js`
*Premium payment/settings/pricing helper.*
- `loadActivePaymentMethod(db)` / `loadPaymentMethods(db)` / `fallbackPaymentMethod()`: Read admin-managed payment instructions, including optional QRIS image fields, with a safe BCA fallback.
- `loadPremiumSettings(db)` / `updatePremiumSettings(db, data, actorUserId)`: Read and update admin-managed lifecycle, discount, and promo settings, including `promo_max_views_per_user`.
- `premiumOrderPricing(db, actor, listing)`: Applies the current multi-brand discount rule during new Premium order creation.
- `loadPublicPremiumPromo(db)`: Returns only active, date-gated promo ribbon fields and the per-day visitor display cap for public pages.

### File: `functions/_premium-notifications.js`
*Premium event, notification, and email queue helper.*
- `recordPremiumEvent(db, event)` / `loadPremiumFunnelSummary(db)`: Store and summarize Premium funnel events for `/premium`, profile membership, and dashboard review actions.
- `createPremiumNotification(db, notification)` / `notifyAdmins(db, notification)`: Persist owner/admin Premium status messages without blocking the main action if notification storage is unavailable.
- `loadPremiumNotifications(db, userId)` / `loadAdminPremiumNotifications(db)`: Feed `/profil` owner messages and dashboard Premium Operations messages.
- `queueNotificationEmail(db, email)` / `queueAdminPremiumEmails(db, email)`: Queue owner/admin payment emails in `notification_email_queue` without requiring an outbound provider during the main action.
- `loadNotificationEmailQueueSummary(db)` / `loadNotificationEmailQueueRows(db, limit)`: Supplies dashboard queue counts plus recent queued email rows with status/error/provider metadata.

### File: `functions/_premium-lifecycle.js`
*Premium expiry, renewal reminder, and annual-report helper.*
- `loadExpiringPremiumSubscriptions(db, days)`: Supplies upcoming Premium expiries for dashboard operations follow-up.
- `processPremiumLifecycle(db)` / `queuePremiumGraceEmails(db, settings)` / `expirePremiumAfterGrace(db, settings)`: Generate annual reports, queue daily grace emails, and downgrade Premium to Free after the configured grace period while queuing public rebuilds.
- `queuePremiumRenewalReminders(db)`: Creates one 30/14/7/1-day renewal reminder email/in-app notice per subscription window.
- `loadPremiumAnnualReports(db, limit)` / `queuePremiumAnnualReports(db)`: Supplies and creates annual report rows with product-event/lead metrics.

### File: `functions/_premium-readiness.js`
*Premium readiness scoring helper.*
- `premiumReadinessForListing(listing)`: Scores logo, cover, description, contact, investment info, and proposal readiness for Premium review.

### File: `functions/_premium-ops-utils.js`
*Small Premium operation utilities.*
- `textOrNull()`, `clampNumber()`, `safeAll()`, `safeJson()`, `randomId()`, `formatDate()`, `parseDateMillis()`, and `escapeHtml()` support the focused Premium modules.

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
- `loadPremiumMembershipData(db, userId, franchiseIds)`: Returns plan/payment method data, active/pending orders, subscriptions, readiness checks, and recent owner notifications for `/profil`, chunking owned-listing ID queries before binding.

### File: `functions/premium-event.js`
*Public Premium funnel endpoint.*
- `onRequestPost()`: Accepts `premium_page_view`, `premium_cta_click`, `promo_ribbon_view`, and `promo_ribbon_click`, trims metadata, writes through `_premium-ops.js`, and returns a no-store JSON response.

### File: `functions/premium-promo.js`
*Public Premium promo endpoint.*
- `onRequestGet()`: Reads active promo settings through `_premium-ops.js`, returns safe JSON plus the per-day view cap for the public top ribbon, and sends public cache headers for 15 minutes plus stale revalidation.

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

### File: `js/franchise-compare.js`
*Buyer comparison runtime.*
- Reads selected ids from `?ids=` or `localStorage.franchise_compare_ids`.
- Lets buyers add/remove up to four brands and renders a comparison table for category, modal, BEP, royalty, city, notes, and detail links.
- Writes selected brand ids/names into `localStorage.franchise_buyer_context` so later logged-in inquiries can include comparison intent.

### File: `js/franchise-buyer-tools.js`
*Buyer tools runtime.*
- Runs a local budget matcher against embedded listing data.
- Calculates a simple BEP estimate from modal awal, omzet bulanan, margin bersih, and biaya tetap.
- Writes the latest budget matcher/BEP inputs and results into `localStorage.franchise_buyer_context` for optional lead context.

### File: `js/site-promo-bar.js`
*Shared public Premium promo bar.*
- Fetches `/premium-promo` with a 30-minute browser cache and injects a top ribbon only when an admin-managed campaign is active and the visitor has not reached the configured per-day display cap.
- Injects its own compact ribbon CSS so high-intent pages do not depend on generated listing/detail styles.
- Records ribbon impressions and CTA clicks through `/premium-event` with safe campaign metadata, deduped per promo identity for 24 hours.
- Used by `/premium` and `/profil`; generated franchise directory/detail pages and buyer tools intentionally do not load it to avoid avoidable Function calls from lower-intent SEO traffic.

### File: `functions/profile-upload.js`
*Protected owner media upload API for `/profil`.*
- `onRequestPost()`: Requires Clerk/D1 auth, validates and stores owner media, updates listing media, queues a rebuild, and schedules digital proposal text extraction with `context.waitUntil()` so the upload response is not blocked by parsing.
- Supported files: logo and cover accept JPG/PNG/WebP; proposal accepts PDF.
- Requires the `FRANCHISE_ASSETS` R2 binding and `FRANCHISE_ASSETS_PUBLIC_BASE_URL`; production uses the R2 custom domain `https://assets.franchisee.id`.

### File: `functions/_proposal-knowledge.js`
*Auditable proposal text and candidate extraction.*
- `extractProposalKnowledge(arrayBuffer, listing)`: Parses selectable PDF text with UnPDF, records page count/status, marks low-text documents as `needs_ocr`, and filters deterministic candidates to fields currently missing from the canonical listing.
- `extractProposalCandidatesFromText(text)`: Extracts bounded outlet type, area/location requirement, total investment, franchise fee, BEP, royalty, net profit, and support candidates.
- `proposalKnowledgeStatements(db, input)`: Upserts `franchise_asset_knowledge` and creates a pending `listing_edit_suggestions` row for admin review without directly updating `franchises` only when a valid D1 user actor is available.

### File: `functions/_clerk-auth.js`
*Shared Clerk session verification, D1 user sync, and role authorization helper.*
- `requireD1User(request, env, db, options)`: Verifies Clerk bearer token, upserts D1 user, applies active email role grants, optionally assigns self-selectable role, and enforces required D1 role. `admin` satisfies protected-role checks; `staff` satisfies staff-level checks only.
- `requireD1UserFast(request, env, db, options)`: Read-optimized auth path for already-synced dashboard GET requests. It verifies the Clerk bearer token, reads the D1 user and roles by `clerk_user_id`, enforces the required role, and avoids Clerk user fetches plus metadata writes. Missing/inactive users or role mismatches can fall back to `requireD1User()` so first login, email grants, and role repairs still work.
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
- `onRequestGet()`: Requires Clerk auth plus D1 `staff` through `requireD1UserFast()` for already-synced users; elevated admin additionally receives masked OCR provider configuration from `_ocr-provider-config.js`, masked scheduler configuration from `_ocr-scheduler-config.js`, and OCR queue/batch state from `_ocr-job-runner.js`. Stored key/secret values are never selected by the read query.
- `onRequestPost()`: Uses full `requireD1User()` sync before mutations, validates the discriminated action payload, and routes normal workflows to `_dashboard-actions.js`, OCR configuration/provider toggles to `_ocr-provider-config.js`, OCR scheduler configuration/toggles to `_ocr-scheduler-config.js`, and admin-triggered OCR dry-run/enqueue/run/retry/no-text/search/batch actions to `_ocr-job-runner.js`, passing `env.OCR_KEY` only when OCR execution, provider activation, scheduler dispatch, or credential encryption needs it.
- OCR batch start/retry actions are routed to `_ocr-batch-runs.js`; `_ocr-job-runner.js` stays focused on job processing and OCR provider execution.
- `requireDashboardAccess(request, env, options)`: Requires `env.franchise_db` and D1 `staff` access before any dashboard query/action runs. `options.fast` is used only for GET refreshes and falls back to full sync when needed.

### File: `functions/_dashboard-schemas.js`
*Dashboard action validation and editable field contract.*
- `DashboardActionSchema`: Zod discriminated union for dashboard review/operations/Premium actions plus the OCR action schema list imported from `_dashboard-ocr-schemas.js`, including OCR result search filters; keeps dashboard-wide validation as a facade while OCR operation schemas live in the OCR module.
- `EDITABLE_LISTING_FIELD_DEFS`: Server-provided guided listing field definitions sourced from `_shared-schemas.js`.
- `sanitizeChanges(changes)`: Uses shared listing-field normalization to enforce the editable field whitelist and normalize integer/real/enumerated values before D1 writes.
- `updateListingStatement(db, franchiseId, changes)`: Builds the whitelisted `franchises` update statement for approved dashboard listing edits.

### File: `functions/_dashboard-ocr-schemas.js`
*OCR dashboard action validation module.*
- `OcrProviderKeySchema`: Shared fixed provider ID enum used by provider config/toggle schemas.
- `DASHBOARD_OCR_ACTION_SCHEMAS`: Zod object schema list for OCR provider config/toggle, dry-run, enqueue, bounded batch run, direct retry, batch failed retry, manual no-text resolution, OCR result search, and OCR job status search/pagination payloads.

### File: `functions/_ocr-provider-config.js`
*Admin-only OCR provider configuration and credential boundary.*
- `getOcrProviderConfigs(db, auth)`: Returns provider metadata only to admin; SQL derives `has_api_key` / `has_api_secret` booleans and does not select credential values.
- `handleUpdateOcrProviderConfig(db, auth, data, env)`: Preserves blank credential inputs, applies explicit clear flags, encrypts saved credentials with external `OCR_KEY`, re-encrypts legacy plaintext values on next save, enforces provider-specific activation prerequisites through `src/lib/ocr-provider-metadata.js`, preserves seeded quota/free-limit/rate-limit metadata on dashboard saves, clears stale cooldown on config save, updates D1 state, and audits only non-secret metadata.
- `handleToggleOcrProviderEnabled(db, auth, data, env)`: Admin-only explicit active/disabled toggle used by the provider-priority list. It requires `OCR_KEY` and provider-specific required fields before enabling, clears stale errors/cooldown, and keeps credential autosave from accidentally changing provider activation.
- `maskProviderConfig(row)`: Produces the stable browser response contract without `api_key` or `api_secret` properties.

### File: `functions/_ocr-scheduler-config.js`
*Admin-only OCR scheduler configuration and third-party dispatch boundary.*
- `getOcrSchedulerState(db, auth, env)`: Returns masked scheduler provider rows for Upstash QStash, cron-job.org, Inngest, and Trigger.dev, including stored-token booleans, health status, request URL, and recommended provider metadata without exposing credential values.
- `handleUpdateOcrSchedulerConfig(db, auth, data, env)` / `handleToggleOcrSchedulerEnabled(db, auth, data)`: Stores third-party scheduler credentials encrypted with `OCR_KEY`, preserves blank token fields, supports explicit clearing, and audits non-secret scheduler state.
- `preflightOcrScheduler(db, env, options)`: Validates the active scheduler before large batch creation. Upstash QStash preflight publishes a harmless `{ preflight: true }` message to `/ocr-worker`; token/worker URL/secret failures block batch creation.
- `triggerOcrScheduler(db, env, batch, options)`: Selects an active scheduler provider and dispatches the next batch trigger. Upstash QStash is implemented as delayed HTTP delivery to `/ocr-worker` and writes `scheduler_trigger_status`, `scheduler_trigger_delay_seconds`, `scheduler_trigger_due_at`, and `scheduler_last_triggered_at` onto the batch row; other providers are configurable external-trigger entries pending deeper provider-specific adapters.
- `readSchedulerApiKey(env, provider, fieldName)`: Decrypts a scheduler credential only at dispatch time using `OCR_KEY` and provider/field AAD. QStash dispatch strips a pasted `Bearer ` prefix and sends the destination URL using QStash's raw URL path format.

### File: `functions/_ocr-batch-runs.js`
*Persisted OCR batch-run orchestration module.*
- `handleStartOcrBatchRun(db, auth, data, env, options)`: Admin-only action that first runs scheduler preflight, then ensures enough pending proposal-image jobs, creates an `ocr_batch_runs` row up to 100 assigned jobs, tags those jobs with `batch_id`, and asks `_ocr-scheduler-config.js` to trigger the first third-party scheduler message with structured ETA/status fields. If preflight fails, no batch/jobs are created.
- `handleRetryOcrBatchRun(db, auth, data, env, options)`: Admin-only action that skips `succeeded` jobs, resets failed and stale running jobs in an existing non-completed batch back to `pending`, refreshes batch counts immediately, then reschedules that batch through the active scheduler provider after credential/URL fixes.
- `refreshBatchProgress(db, batchId, options)`: Recomputes assigned/processed/succeeded/failed/needs-review counts from `ocr_jobs`, updates `ocr_batch_runs`, supports `paused_rate_limit`/`paused_quota` while work remains pending, and returns the masked batch row. Batch start/retry provider gating treats `cooldown` providers as runnable again once `cooldown_until` has passed.
- `maskBatchRow(row)`: Produces the dashboard-safe batch progress contract, including non-secret scheduler provider, external message id, trigger status, trigger delay, trigger due timestamp, and last-trigger timestamp.

### File: `functions/_ocr-provider-adapters.js`
*External OCR provider adapter boundary.*
- `callOcrProvider(provider, image, env, options)`: Decrypts the selected provider credential values with `OCR_KEY` and dispatches to the provider-specific adapter for OCR.Space, Azure Vision, Cloudflare Workers AI, Google Vision, Groq Vision, AWS Textract, Veryfi, Mindee, PDF.co, or API4AI.
- `normalizeOcrText(value)`: Converts heterogeneous provider output into trimmed plain text with bounded whitespace before cache/storage.
- `awsSigV4Headers(input)`: Worker-compatible AWS Signature V4 helper for Textract `DetectDocumentText`.

### File: `functions/_ocr-job-runner.js`
*OCR queue/cache/failover orchestrator shared by dashboard actions and the protected worker.*
- `getOcrJobState(db, auth)`: Returns admin-only OCR queue counts, recent jobs, expanded OCR result previews with listing/review metadata, recent persisted batch runs including structured scheduler timing fields, enqueue-candidate count, and a `migration_required` fallback when OCR job/batch migrations are not applied.
- `handleSearchOcrJobs(db, auth, data)`: Admin-only server-side OCR job search for status chips. It paginates `ocr_jobs` by status/franchise and maps `unqueued` to active proposal image assets that have not yet entered `ocr_jobs`, so dashboard status counts are inspectable beyond the recent 12 rows.
- `handleSearchOcrResults(db, auth, data)`: Admin-only server-side history search for `franchise_asset_knowledge`, filtering by status and query text across brand/slug/source text with bounded limit/offset pagination for dashboard "Muat lagi".
- `handleEnqueueOcrJobs(db, auth, data)`: Admin-only action that queues active image proposal assets into `ocr_jobs`; it does not call external OCR providers.
- `handleRunOcrDryRun(db, auth, data, env, options)`: Admin-only action that requires `OCR_KEY` and one enabled provider, prepares at most one candidate proposal-image job, and processes only that job before broad backfills.
- `handleRunOcrJobs(db, auth, data, env, options)`: Admin-only action that runs a bounded batch and requires `OCR_KEY` before any provider call can happen.
- `handleRetryOcrJob(db, auth, data, env, options)` / `handleRetryFailedOcrJobs(db, auth, data)`: Admin-only retry actions. Single-job retry moves one failed or needs-review job back to `pending` and immediately runs OCR for that job; batch retry moves up to 100 failed jobs back to `pending` without deleting attempt history.
- `handleMarkOcrJobNoText(db, auth, data)`: Admin-only manual resolution for failed/needs-review OCR jobs after checking the source brochure image; marks the job `needs_review` with an actionable no-text note and writes an audit event.
- `runOcrJobs(db, env, auth, options)`: Claims pending jobs, optionally scoped by `batch_id`, carries the original `requested_by_user_id` into worker-processed writes so scheduled OCR never writes synthetic user IDs into FK-backed tables, fetches the proposal image, computes the SHA-256 content hash, reuses `ocr_content_cache` when available, checks local quota/trial state, tries enabled providers in priority order, logs attempts and usage, writes successful OCR text through `proposalKnowledgeStatements()`, treats provider text-too-short responses as job review state instead of provider-health failure, pauses provider rate-limit/quota runs by moving the current job back to `pending` and releasing already-claimed unprocessed jobs, and refreshes batch progress after each scoped drain.
- `claimPendingJobs(db, maxJobs, jobId)`: Selects one pending franchise group first, then claims proposal pages from that franchise by asset display order so manual/worker batches build fuller per-franchise brochure context instead of sampling the first page from many franchises.
- `prepareRateLimit(db, provider)`: Checks provider `cooldown_until` and local request-window metadata before each external call; if the window is exhausted, the runner records a skipped attempt and updates provider cooldown instead of sending another request.

### File: `functions/ocr-worker.js`
*Protected OCR queue worker endpoint for third-party scheduled backfills.*
- `onRequestPost({ request, env })`: Requires `OCR_SECRET`, verifies bearer or `x-worker-secret`, accepts harmless `{ preflight: true }` scheduler checks without running OCR, accepts optional `batch_id`, checks the counted OCR usage for the current UTC day on real runs, bounds the requested run size to 1-10 jobs, calls `runOcrJobs()` with a synthetic admin actor, schedules the next Upstash QStash delayed trigger while a scoped batch is still queued/running, stops redispatch when the batch is paused for provider rate limit/quota, logs a summary to `operation_events`, and returns processed/provider/daily-cap/batch metadata.
- `countTodayUsage(db)`: Sums counted `ocr_provider_usage_events` rows since UTC midnight so the worker can stop before exceeding the configured daily cap.
- `hasValidSecret(request, expectedSecret)`: Keeps the worker trigger independent from dashboard/Clerk auth while still requiring the Cloudflare Pages `OCR_SECRET` shared secret.

### File: `functions/_dashboard-queries.js`
*Read-only D1 data model for `/dashboard-data`.*
- `getOverview(db)`: Returns Franchisee.id listing counts and completeness counts.
- `getDataQuality(db)`: Reads persisted open `franchise_quality_checks` when available, falling back to computed warnings for missing images, contact, description, category, all-caps descriptions, suspicious contacts, stale listings, and invalid URLs.
- `getUnclaimedOutreachQueue(db)`: Reads up to 250 published unclaimed listings with public phone data, parses mobile/WhatsApp-capable Indonesian numbers, and builds staff-personal `wa.me` claim-notification links.
- `getUnclaimedOutreachSummary(db)`: Counts published unclaimed listings, contact-ready rows, missing-phone rows, and the current outreach queue limit for the dashboard badge.
- `getPendingClaims(db)` / `getEditSuggestions(db)` / `getEditableListings(db)`: Supplies the review tab, including full editable listing snapshots for guided old-value display and structured location rows for the admin Area Listing editor.
- `getStructuredLocationsForListings(db, franchiseIds)`: Chunks editable listing IDs before building `IN (...)` queries so `/dashboard-data` can load the full dashboard without hitting D1's SQL variable limit.
- `getPendingPremiumPayments(db)`: Supplies pending premium payment confirmations with order, franchise, owner, receipt proof URL, and readiness context for the Operations tab.
- `getPremiumOperations(db)`: Supplies Premium funnel counts, payment method rows, Premium settings, recent Premium notifications, upcoming expiries, annual reports, queued-email summaries, and recent queued email rows for the Operations tab.
- `getPublishState(db)` / `getPublicationControls(db)` / `getLeadSummary(db)` / `getSystemHealth(db, env)`: Supplies the operations tab, including multi-site publication rows, operation-event counts, webhook summaries, recent audit events, rebuild state, product-event counts, and a local Cloudflare Free-plan traffic guardrail summary.
- `getTrafficGuardrails(env)`: Reports the 100,000/day Free-plan guardrail, 90,000 warning threshold, reset time, active browser throttles/caches, and the env vars needed before optional Cloudflare Analytics querying is wired.

### File: `functions/_dashboard-actions.js`
*Protected dashboard write workflows.*
- `handleLogOutreach(db, auth, data)`: Records manually confirmed WhatsApp outreach and an audit event.
- `handleSuggestEdit(db, auth, data)`: Stores guided field changes as structured diffs in `listing_edit_suggestions`. Admin or active trusted staff suggestions apply immediately; normal staff suggestions stay pending.
- `handleReviewEditSuggestion(db, auth, data)`: Admin-only approve/reject. Approved diffs write field-by-field to whitelisted `franchises` columns, write audit events, and queue a static rebuild through `siteRebuildStatements()`.
- `handleReviewClaim(db, auth, data)`: Admin-only approve/reject. Approval attaches ownership/profile data, moves unclaimed rows to free claimed state, writes audit events, and queues static rebuild.
- `handleReviewPremiumPayment(db, auth, data)`: Admin-only approve/reject. Approval marks the order paid, creates or renews a one-year `franchise_subscriptions` row, sets the listing premium, creates missing publication rows for included network sites, publishes those rows, writes audit/events/notifications, queues owner email notifications, and queues rebuilds for each affected site.
- `handleUpdateListingLocations(db, auth, data)`: Admin-only structured location update for one listing. Replaces owner/admin-managed `franchise_locations` rows through `functions/_location-writes.js`, writes an audit event, and queues a static rebuild.
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

### File: `functions/_proposal-pdf.js`
*Server-side proposal PDF builder.*
- `buildProposalPdfResponse(input, env)`: Validates an allowlisted proposal image URL list, fetches JPEG pages server-side, builds a PDF, applies the bottom-right Franchisee.id watermark to the returned PDF only, and returns an attachment response.
- `buildPdfFromJpegs(pages, options)`: Pure PDF assembly helper used by the Pages Function and regression check.

### File: `functions/proposal-download.js`
*Public proposal PDF download endpoint.*
- `onRequestPost()`: Creates a watermarked proposal PDF from posted image URLs through `_proposal-pdf.js`.
- `onRequestGet()`: Returns a 405 JSON message so the route is only used by the brochure download button.

### File: `functions/_ocr-credential-crypto.js`
*OCR credential envelope encryption helper.*
- `prepareStoredCredential()`: Preserves blank dashboard fields, clears explicit removals, encrypts new credentials, and re-encrypts existing plaintext values on next save.
- `encryptCredentialValue()` / `decryptCredentialValue()`: AES-GCM helpers using an external root secret such as Cloudflare Pages `OCR_KEY`.
- `credentialAad(providerKey, fieldName)`: Binds encrypted values to their provider/field context.

### File: `functions/_shared-schemas.js`
*Shared validation/schema constants for Pages Functions.*
- `EDITABLE_LISTING_FIELD_DEFS`: Canonical dashboard-editable listing fields with labels, types, and select options, including brand-origin and target-market fields.
- `sanitizeListingChanges(changes)` / `normalizeListingFieldValue(field, value)`: Shared dashboard listing change validation and normalization.
- `BaseSubmissionSchema` / `FranchiseeSubmissionSchema` / `FranchisorSubmissionSchema` / `CreateUnclaimedSubmissionSchema`: Shared form payload validators used by `/form-submit`; franchisor submissions accept optional `brand_country` and `target_market`, which submit helpers default to Indonesia/Indonesia when omitted.
- `GetFranchisesQuerySchema`: Shared `/get-franchises` query validator.
- Role/source/form/contact/quality-check enum schemas: Shared Zod enums for public/internal roles, source sheets, form types, test actions, contact types, quality-check statuses, and dashboard review decisions.
- `normalizeListingStatusValue()` / `normalizeVerificationTierValue()` / `normalizeRoyaltyBasisValue()` / `normalizeHakiStatusValue()`: Shared value normalizers for Function write paths.

### File: `functions/_country-metadata.js`
*Shared country metadata adapter for Pages Functions.*
- `COUNTRY_METADATA`: Runtime copy of supported country metadata aligned with `data/country-metadata.json`.
- `COUNTRY_CODE_OPTIONS` / `COUNTRY_SELECT_OPTIONS`: Derived form option data for country-code and country-name lists.
- `countryNameFromDialCode(value)`, `normalizeCountryName(value)`, `countryDisplay(value)`, and `whatsappDigitRangeForDialCode(value)`: Shared country lookup/display helpers.
- `internationalMobileRuleForDigits(digits)` / `formatInternationalPhone(countryCode, localDigits)`: Shared international mobile matching and display formatting used by dashboard Data Quality contact parsing.

### File: `functions/_contact-normalization.js`
*Normalized contact extraction for dashboard operations.*
- `buildNormalizedContacts(row)`: Converts existing listing/profile fields into high-confidence contact rows for phone, WhatsApp, email, website, address, and social links. Phone extraction now records structured Indonesian, supported SEA/nearby Asia mobile, landline, and call-center values; WhatsApp source rows are filtered to WhatsApp-capable numbers only.
- `hasInvalidContactUrl(row)` / `normalizeExternalUrl(value, field)`: URL validation/normalization used by quality checks.

### File: `functions/_quality-checks.js`
*Persistent dashboard quality-check refresh logic.*
- `refreshDashboardQualityChecks(db, auth)`: Scans published Franchisee.id listings, upserts `franchise_contacts`, upserts current `franchise_quality_checks`, resolves no-longer-active checks, and writes a refresh audit event.
- `computeQualityChecks(row, contacts)`: Shared JavaScript heuristic for missing media/contact/description/category, likely all-caps, suspicious contact, stale listing, and invalid URL checks.

### File: `functions/_dashboard-utils.js`
*Shared dashboard helpers.*
- `jsonResponse(payload, init)`: Standard no-store JSON response helper.
- `auditStatement(db, action, entityType, entityId, metadata, actorUserId)`: Shared audit-event insert statement builder.
- `parsePhoneContacts(value, defaultLabel)` / `parseWhatsAppContacts(value)` / `buildWhatsAppUrl(internationalDigits, row)`: Imported contact parsing and claim-notification link generation. `parsePhoneContacts()` recognizes structured Indonesian and supported SEA/nearby Asia phone contacts through `functions/_country-metadata.js` for Data Quality, while `parseWhatsAppContacts()` filters to WhatsApp-capable contacts for outreach.
- `isLikelyAllCapsDescription(value)`: JavaScript-side all-caps heuristic used by data-quality checks.

### File: `functions/form-submit.js` (v2.6)
*Clerk-authenticated D1-backed form-submit router.*
- `onRequestPost()`: Main entry point; requires `env.franchise_db`, validates base payload with Zod, requires Clerk/D1 role authorization, routes franchisee/franchisor/claim/test actions to focused modules, records operation telemetry for server failures, and returns the legacy success/error JSON envelope.
- `FranchiseeSubmissionSchema` / `FranchisorSubmissionSchema` / `CreateUnclaimedSubmissionSchema`: Imported shared Zod runtime validation for form payloads before delegated D1 writes.

### File: `functions/_form-submit-franchisee.js`
*Franchisee profile submit workflow.*
- `handleFranchiseeSubmit(db, data, actor)`: Checks duplicates and writes `franchisee_profiles.user_id`, `legacy_source_rows`, and actor-aware `audit_events`.

### File: `functions/_form-submit-franchisor.js`
*Franchisor listing and claim submit workflow.*
- `handleFranchisorSubmit(db, data, isClaim, actor)`: Checks duplicates and writes or updates franchisor/listing/package/publication/claim/audit D1 records with `user_id`, `owner_user_id`, `claimant_user_id`, brand origin/target-market listing metadata, franchisor profile contact/social URLs, and static rebuild queue requests for `site_franchisee_id`.

### File: `functions/_form-submit-test-actions.js`
*Staff/admin dev test-data workflows.*
- `handleCreateUnclaimed()` / `handleClearTestData()`: Dev test-data actions operate in D1 instead of Google Sheets and enqueue static rebuild requests because they affect public listing/claim-search output.

### File: `functions/_form-submit-utils.js`
*Shared helpers for the form-submit modules.*
- `findClaimSource(db, data)`: Finds D1 `UNCLAIMED` franchise rows by `unclaimed_id` or normalized brand name for claim migration.
- `uniqueSlug()` / `slugExists()`: Generates non-conflicting D1 slugs for new submitted listings.
- Also owns validation/duplicate/json responses, payload cleaning, normalization, id/timestamp generation, common franchise bind values including brand-origin/target-market columns, shared country metadata fallback for omitted origin/market metadata, and audit/legacy-source statements.
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
