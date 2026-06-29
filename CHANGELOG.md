# CHANGELOG

Format:
- Header: `## YYYY-MM-DD HH:mm (Asia/Jakarta)`
- Sections: `### Added`, `### Changed`, `### Removed`

## 2026-06-30 04:36 (Asia/Jakarta)
### Added
- `migrations/0011_notification_email_queue.sql`: Added `notification_email_queue` for durable owner/admin payment email queueing before an outbound provider is connected.
- `js/profile-premium.js`: Added a small `/profil` Premium helper for active subscription selection, renewal-window checks, expiry formatting, and order status labels.
- `.context/session-20260630-0436.md`: Added this session snapshot.

### Changed
- Remote Cloudflare: Applied `migrations/0011_notification_email_queue.sql` to `franchise_db` and verified `notification_email_queue` exists.
- `functions/_premium.js`, `functions/_premium-ops.js`, `functions/_profile-premium.js`, `functions/_dashboard-actions.js`, and `functions/_dashboard-queries.js`: Added Premium renewal windows, expiring subscription reads, queued payment email writes, queue summaries, and renewal-safe admin approval behavior.
- `js/profile-page.js`, `src/pages/profil/index.astro`, `js/dashboard-admin.js`, and `src/pages/dashboard/index.astro`: Added profile Membership renewal CTA/state handling, loaded the Premium helper, and surfaced upcoming Premium expiries plus queued-email summaries in dashboard Premium Operations.
- `src/pages/premium/index.astro`: Moved static payment-account copy behind the profile Membership action so users get the current payment instructions for the selected listing.
- `SUGGESTION.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Marked copy-quality suggestion 15 done, added and completed suggestions 22-26, documented the renewal/email-queue work, and refreshed the audit to match the recent Premium codebase.
- `json/d1-generated-pages-manifest.json`: Refreshed generated timestamps during `pnpm run build`; the D1 builder reported 197 detail pages skipped and no content rewrites.

## 2026-06-29 00:28 (Asia/Jakarta)
### Added
- `migrations/0010_premium_operations.sql`: Added admin-managed `payment_methods`, `premium_funnel_events`, and `premium_notifications` for premium operations.
- `functions/_premium-ops.js`: Added shared premium payment-method loading, fallback BCA method, funnel event recording/summary, owner/admin notifications, premium notification reads, and listing readiness checks.
- `functions/_profile-premium.js`: Extracted premium order, payment confirmation, membership reads, payment instructions, readiness, and notification handling out of `functions/profile-data.js`.
- `functions/premium-event.js` and `js/premium-page.js`: Added public `/premium` page view/CTA click tracking for the dashboard Premium funnel.
- `functions/premium-receipt-upload.js`: Added protected proof-of-payment upload to R2 with image/PDF type checks, 6 MB max size, D1 asset metadata, and audit logging.

### Changed
- Remote Cloudflare: Applied `migrations/0010_premium_operations.sql` to `franchise_db` and verified the three new premium operations tables plus the default BCA payment method row.
- `functions/profile-data.js`, `js/profile-page.js`, and `css/profile.css`: Added Premium readiness checklist, owner Premium notifications, proof-of-payment upload during confirmation, and dynamic payment instructions from the managed payment method.
- `functions/_dashboard-schemas.js`, `functions/_dashboard-queries.js`, `functions/_dashboard-actions.js`, `functions/dashboard-data.js`, `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, and `css/dashboard.css`: Added Premium Operations dashboard with funnel metrics, payment-method editor, recent Premium notifications, proof links, readiness status, and notification/event writes during admin review.
- `src/pages/premium/index.astro`: Added CTA tracking attributes and loaded the premium page tracking client.
- `SUGGESTION.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`, and `.context/session-20260628-2118.md`: Documented suggestions 16-21 as implemented and recorded the new premium operations workflow.

## 2026-06-28 23:43 (Asia/Jakarta)
### Added
- `migrations/0009_premium_membership.sql`: Added D1 tables and indexes for premium orders, payment confirmations, and active franchise subscriptions.
- `functions/_premium.js`: Added shared premium plan constants, included network site ids/domains, transfer payment instructions, unique code generation, id helpers, canonical URL generation, payable amount calculation, and amount normalization.
- `src/pages/premium/index.astro` and `css/premium.css`: Added the public `/premium/` membership page with yearly pricing, benefits, network distribution explanation, payment instructions, and CTAs.

### Changed
- Remote Cloudflare: Applied `migrations/0009_premium_membership.sql` to `franchise_db` and verified `premium_orders`, `premium_payment_confirmations`, and `franchise_subscriptions` exist.
- `functions/profile-data.js`: Added premium membership reads, premium order creation, premium payment confirmation submission, Zod validation for premium actions, and audit events for profile-side premium actions.
- `js/profile-page.js` and `css/profile.css`: Added the `/profil` Membership tab, owned-listing premium state, unique-code transfer instructions, confirmation form, and fixed profile form submit handling so hidden ids remain available while fields are disabled during save.
- `functions/_dashboard-schemas.js`, `functions/_dashboard-queries.js`, `functions/_dashboard-actions.js`, and `functions/dashboard-data.js`: Added pending premium payment reads and admin-only premium payment approve/reject workflow that activates a one-year subscription, marks the listing premium, creates missing included network publication rows, publishes those rows, writes audit events, and queues rebuild requests.
- `src/pages/dashboard/index.astro` and `js/dashboard-admin.js`: Added the dashboard Premium Payments operations panel and icon-only approve/reject review controls.
- `AGENTS.md`: Added a stricter proactive suggestion-pass rule for implementation sessions that touch product, UX, operations, payments, auth, data quality, or growth.
- `SUGGESTION.md`: Added new recommendations for premium analytics, admin-managed payment methods, premium readiness checks, payment notifications, profile modularization, and proof-of-payment attachments.
- `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, `docs/README.md`, `AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Documented the implemented premium membership flow, remote migration status, new route/API responsibilities, dashboard review workflow, and remaining payment automation gaps.
- `.context/session-20260628-2118.md`: Expanded the session snapshot from the monetization plan into the completed premium implementation summary.

## 2026-06-28 21:18 (Asia/Jakarta)
### Added
- `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`: Added the premium network monetization plan, `/premium` page plan, payment confirmation roadmap, traffic growth plan, premium feature package, data model plan, and implementation tracker.
- `.context/session-20260628-2118.md`: Added a session snapshot for the premium monetization planning pass.

### Changed
- `docs/README.md`: Linked the premium monetization plan from the architecture documentation index.

## 2026-06-28 20:51 (Asia/Jakarta)
### Changed
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, and `css/dashboard.css`: Converted dashboard action controls to icon-only toolbar buttons/links with shared custom tooltips, fixed-size button styling, and icon-only loading/done states.
- `AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Documented the dashboard action toolbar behavior.

## 2026-06-28 18:55 (Asia/Jakarta)
### Added
- `migrations/0008_analytics_telemetry_multisite.sql`: Added `franchise_product_events` for privacy-safe listing analytics and `operation_events` for operations telemetry.
- `scripts/shared-csv.cjs`: Added a shared quote-aware CSV parser for legacy Node builders.
- `functions/_analytics.js` and `functions/product-event.js`: Added product-event validation, recording, aggregate loading, scoring helpers, and a public coarse-event endpoint.
- `functions/_telemetry.js`: Added operation telemetry logging helper.
- `js/product-events.js`: Added public listing view/contact-click tracking and a shared client recording hook for successful save/remove events.

### Changed
- Remote Cloudflare: Applied `migrations/0008_analytics_telemetry_multisite.sql` to `franchise_db` and verified `franchise_product_events` plus `operation_events` exist.
- `js/build-listing.js` and `js/build-sitemap.js`: Reused the shared CSV parser for local CSV fallbacks.
- `functions/profile-data.js` and `js/profile-page.js`: Added owner-facing publication distribution status, successful save/inquiry product-event recording, and product-event-aware recommendation scoring.
- `templates/peluang-usaha-tpl.html`, `templates/detail-franchise-tpl.html`, and `js/opportunity-save.js`: Loaded public product-event tracking and recorded successful save/remove interactions.
- `peluang-usaha/*.html`, `peluang-usaha/index.html`, and `json/d1-generated-pages-manifest.json`: Regenerated during `pnpm run build` so public pages load the product-event client.
- `functions/dashboard-data.js`, `functions/_dashboard-schemas.js`, `functions/_dashboard-queries.js`, `functions/_dashboard-actions.js`, `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, and `css/dashboard.css`: Added admin publication status controls, expanded health telemetry, product-event counts, webhook summaries, recent operation/audit visibility, and publication-status rebuild queueing.
- `functions/clerk-webhook.js`, `functions/form-submit.js`, `functions/profile-upload.js`, and `functions/profile-data.js`: Added operation telemetry logging for key backend failure paths.
- `SUGGESTION.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented suggestions 11-14 as implemented.

## 2026-06-28 17:58 (Asia/Jakarta)
### Added
- `src/lib/shared-schemas.ts`: Added shared TypeScript Zod schemas and normalizers for CSV import rows, D1 static franchise rows, listing status/tier values, royalty basis, and HAKI status.
- `.context/session-20260628-1758.md`: Added a session snapshot for the shared validation adoption pass.

### Changed
- `functions/_shared-schemas.js`: Extended the shared Function schema module with form submission schemas, dev unclaimed creation schema, `/get-franchises` query schema, source/form/test enums, and listing/package/status normalizers.
- `functions/form-submit.js`: Reused shared form payload schemas and shared HAKI/royalty normalizers for franchisee, franchisor, claim, and dev unclaimed writes.
- `functions/get-franchises.js`: Reused the shared query schema for directory and claim-search reads.
- `scripts/import-csv-to-d1.ts`: Reused shared TypeScript CSV row schemas and enum normalizers for D1 import generation.
- `scripts/build-d1-franchise-pages.ts` and `src/lib/franchise-static.ts`: Reused the shared D1 franchise row schema so build-time snapshots and Astro rendering validate the same row contract.
- `json/d1-franchise-static-data.json` and `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build` verification.
- `SUGGESTION.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Marked shared validation item 10 done and documented the shared Function and TypeScript schema modules.

## 2026-06-28 17:10 (Asia/Jakarta)
### Added
- `migrations/0007_contacts_quality_dashboard.sql`: Added D1 tables and indexes for normalized franchise contacts and persistent dashboard quality checks.
- `functions/_shared-schemas.js`: Added shared Zod/schema constants for dashboard decisions, editable listing fields, contact types, quality-check types, roles, and listing field normalization.
- `functions/_contact-normalization.js`: Added contact normalization helpers for phone, WhatsApp, email, website, address, and social links.
- `functions/_quality-checks.js`: Added dashboard quality-check computation and refresh logic that upserts normalized contacts, persists open checks, resolves stale checks, and writes audit events.
- `.context/session-20260628-1710.md`: Added this session snapshot.

### Changed
- Remote Cloudflare: Applied `migrations/0007_contacts_quality_dashboard.sql` to `franchise_db` and verified `franchise_contacts` plus `franchise_quality_checks` exist.
- `SUGGESTION.md`: Converted the assistant-owned suggestion backlog to table form and updated items 7-10 with implementation status.
- `AGENTS.md`: Clarified that the assistant is free to update `SUGGESTION.md` whenever useful improvements are found, and updated dashboard policy language for guided field edits.
- `functions/_dashboard-schemas.js`, `functions/_dashboard-queries.js`, `functions/_dashboard-actions.js`, and `functions/dashboard-data.js`: Added shared editable-field definitions to dashboard responses, persisted data-quality read fallback behavior, and the protected quality-check refresh action.
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, and `css/dashboard.css`: Replaced the dashboard review JSON textarea with guided field rows, added a Data Quality refresh action, and changed pending reviews to show old/new values per field.
- `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build` verification.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented normalized contacts, persisted quality checks, guided dashboard review fields, and the shared-schema foundation.

## 2026-06-28 16:43 (Asia/Jakarta)
### Added
- `.context/session-20260628-1643.md`: Added a session snapshot for the public form feedback and auth recovery CTA pass.

### Changed
- `js/form-06-submit-validation.js` and `css/form-franchise/04-alerts-status.css`: Replaced public form browser `alert()` failures with inline feedback plus SweetAlert CTAs, added login recovery links, and made successful submits follow a safe `next` URL before falling back to `/profil/`.
- `js/auth-clerk.js` and `css/auth-clerk.css`: Added structured auth messages with hint text and CTA buttons/links for login-required, register, and password-reset recovery states.
- `js/form-07-init.js` and `daftar/index.html`: Replaced remaining interactive browser tooltip usage with shared `data-fr-tooltip` hints.
- `AUDIT.md`: Marked the public form alert replacement and `/login`/`/daftar` recovery-state review as complete in the UX actionability tracker.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the new CTA-backed auth/form feedback behavior and safe post-submit `next` handling.
- `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build` verification.

## 2026-06-28 16:25 (Asia/Jakarta)
### Added
- `.context/session-20260628-1625.md`: Added a session snapshot for the `/peluang-usaha` save-button UX and actionability audit.

### Changed
- `AGENTS.md`: Added the permanent rule that warning, error, empty-state, and blocked-action messages should include clear next steps plus direct CTA/link/button when the path is known.
- `AUDIT.md`: Added a UX actionability audit and tracker for blocked-action messages, starting with the public save-opportunity flow.
- `src/lib/franchise-static.ts` and `css/opportunity-save.css`: Changed directory card save controls into icon-only bookmark controls positioned on the top-left of each image with shared custom tooltips.
- `functions/profile-data.js`: Added CTA metadata to missing-franchisee-profile responses for save and inquiry actions.
- `js/opportunity-save.js`: Rendered save feedback with optional CTA links, preserves return URL in CTA destinations, and keeps save tooltip/aria labels synced with saved state.
- `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build` verification.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the save-opportunity UX and next-action API behavior.

## 2026-06-28 15:43 (Asia/Jakarta)
### Changed
- Remote Cloudflare: Applied `migrations/0006_saved_opportunities.sql` to `franchise_db`, verified the `franchise_saved_opportunities` table, confirmed `assets.franchisee.id` is active on the `franchise-assets` R2 bucket, raised its minimum TLS to `1.2`, and set the Pages production secret `FRANCHISE_ASSETS_PUBLIC_BASE_URL=https://assets.franchisee.id`.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the production R2 public asset domain and the remote status of the saved-opportunities migration.
- `.context/session-20260628-1543.md`: Added a session snapshot for the D1 migration and R2 domain setup.

## 2026-06-26 05:32 (Asia/Jakarta)
### Added
- `js/auth-clerk-ui.js`: Added a dedicated custom auth page renderer so `js/auth-clerk.js` can focus on Clerk/session behavior.
- `functions/profile-upload.js`: Added an owner-checked listing media upload endpoint for logo, cover, and proposal files through R2, D1 asset records, listing media URL updates, audit events, and static rebuild queue writes.
- `migrations/0006_saved_opportunities.sql`: Added the D1 table and indexes for cross-device saved franchise opportunities.
- `css/opportunity-save.css` and `js/opportunity-save.js`: Added public save-opportunity buttons for generated directory cards and detail pages.
- `.context/session-20260626-0532.md`: Added a session snapshot for the auth split, media upload, saved opportunities, and lead inbox implementation.

### Changed
- `js/auth-clerk.js`, `login/index.html`, `register/index.html`, `daftar/index.html`, `src/pages/dashboard/index.astro`, `src/pages/profil/index.astro`, `src/pages/sso-callback/index.astro`, and franchise templates: Loaded the new auth UI module before the Clerk runtime while preserving the existing auth API.
- `functions/profile-data.js`: Added D1 saved-opportunity save/remove actions, saved-opportunity reads, franchisor lead inbox reads, and owner-checked lead status updates.
- `js/profile-page.js` and `css/profile.css`: Added server-backed saved opportunities with local-save migration, owner media upload controls, and a franchisor `Leads` tab with contact shortcuts and status updates.
- `src/lib/franchise-static.ts` and franchise templates: Added public save-opportunity buttons and assets for generated franchise cards/detail pages.
- `peluang-usaha/*.html` and `json/d1-generated-pages-manifest.json`: Regenerated during `pnpm run build` so public franchise pages include the new save-opportunity UI.
- `wrangler.toml`: Added the `FRANCHISE_ASSETS` R2 binding for uploaded franchise media.
- `SUGGESTION.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `FORM_SCHEMA.md`, `docs/architecture/PROFILE_PAGE_PLAN.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the implemented suggestions, new data contract, media upload path, saved-opportunity table, and lead inbox behavior.

## 2026-06-26 04:17 (Asia/Jakarta)
### Added
- `SUGGESTION.md`: Added an assistant-owned proactive recommendation backlog with initial suggestions across auth QA, media uploads, profile value surfaces, data quality, publishing, analytics, operations, and multi-site controls.
- `.context/session-20260626-0417.md`: Added a session snapshot for the suggestion backlog and proactive working-rule update.

### Changed
- `AGENTS.md`: Added rules for keeping `SUGGESTION.md` current and proactively proposing useful project improvements.
- `CODEBASE.md`: Documented `SUGGESTION.md` as a supporting project file.

## 2026-06-26 03:50 (Asia/Jakarta)
### Added
- `.context/session-20260626-0350.md`: Added a session snapshot for the `/login` recovery and same-email auth sync update.

### Changed
- `js/auth-clerk.js` and `css/auth-clerk.css`: Added in-page `/login` modes for forgot password and forgot email, including Clerk reset-password code handling and Google sign-in recovery guidance.
- `functions/_clerk-auth.js`: Reused an existing D1 user when a new Clerk login has the same verified primary email, keeping email/password and Google entry points mapped to one app account.
- `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build` verification.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/CLERK_SETUP.md`: Documented login recovery, verified-email D1 user reuse, and the required Clerk dashboard account-linking setting.

## 2026-06-26 00:23 (Asia/Jakarta)
### Added
- `.context/session-20260626-0023.md`: Added a session snapshot for the `/profil` account security update.

### Changed
- `js/profile-page.js` and `css/profile.css`: Changed the `/profil` account tab to edit name/email one field at a time and added a password row that lets Google-only users add password login or password users change password through the current Clerk account.
- `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build` verification.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/PROFILE_PAGE_PLAN.md`: Documented the granular account rows and password add/change behavior.

## 2026-06-25 16:43 (Asia/Jakarta)
### Added
- `css/shared-tooltip.css` and `js/shared-tooltip.js`: Added a shared custom tooltip component for instant, body-level hover/focus hints.
- `.context/session-20260625-1643.md`: Added a session snapshot for the shared tooltip and copy-rule update.

### Changed
- `AGENTS.md`: Added permanent rules for plain public-facing copy and shared custom tooltip usage instead of browser `title` hints.
- `src/pages/profil/index.astro`, `src/pages/dashboard/index.astro`, `src/pages/sso-callback/index.astro`, `login/index.html`, `daftar/index.html`, and franchise templates: Loaded the shared tooltip assets where auth/profile/dashboard/public generated UI can use hints.
- `js/profile-page.js`, `js/auth-navbar.js`, `js/form-09-test-data-generator.js`, `js/build-listing.js`, `js/build-details.js`, `src/lib/franchise-static.ts`, `src/lib/franchise-static-assets.ts`, `login/index.html`, `daftar/index.html`, and franchise templates: Replaced UI tooltip `title` usage with `data-fr-tooltip` or accessible labels and moved directory status badge hints to the shared tooltip component.
- `src/pages/dashboard/index.astro`: Reworded visible dashboard helper text to avoid exposing implementation terms in the UI.
- `peluang-usaha/*.html` and `json/d1-generated-pages-manifest.json`: Regenerated during `pnpm run build` so public pages include the shared tooltip assets and updated status badge markup.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the shared tooltip runtime, styling, and usage convention.

## 2026-06-25 16:29 (Asia/Jakarta)
### Added
- `.context/session-20260625-1629.md`: Added a session snapshot for the franchisee value-surface implementation.

### Changed
- `AGENTS.md`: Added the rule to continue agreed planned work through implementation before final reporting, using confirmation only for genuinely blocking decisions.
- `docs/architecture/PROFILE_PAGE_PLAN.md`: Expanded and completed the `Peluang Saya` implementation plan.
- `functions/profile-data.js`: Added franchisee recommendations, inquiry history, and `create_franchise_inquiry` using existing `franchise_leads`.
- `js/profile-page.js` and `css/profile.css`: Added the `Peluang Saya` tab with recommendations, budget-fit labels, browser-saved opportunities, one-click inquiries, and inquiry history.
- `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build` verification.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the new profile API payload/action and client-side opportunity surfaces.

## 2026-06-25 16:12 (Asia/Jakarta)
### Added
- `.context/session-20260625-1612.md`: Added a session snapshot for the public double-role implementation pass.

### Changed
- `functions/profile-data.js`: Added the protected `add_public_role` action so logged-in public users can add the missing `franchisee` or `franchisor` role, audit the change, and resync Clerk metadata.
- `js/profile-page.js` and `css/profile.css`: Added role add-on cards and a confirmation modal in `/profil`, then redirect users to the matching `/daftar` completion form after access is added.
- `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build` verification.
- `docs/architecture/AUTH_ONBOARDING_NAV_PLAN.md`, `docs/architecture/PROFILE_PAGE_PLAN.md`, `docs/architecture/CLERK_SETUP.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Documented the implemented additive public role flow.

## 2026-06-25 15:47 (Asia/Jakarta)
### Added
- `.context/session-20260625-1547.md`: Added a session snapshot for the public role add-on and franchisee value planning pass.

### Changed
- `docs/architecture/AUTH_ONBOARDING_NAV_PLAN.md`: Added the additive public role correction flow for users who start as franchisee/franchisor and later need the opposite public role.
- `docs/architecture/PROFILE_PAGE_PLAN.md`: Added the franchisee value model covering recommendations, saved opportunities, budget-fit cues, inquiry history, and role-aware profile CTAs.
- `CODEBASE.md`: Updated the documentation map entries for the auth onboarding and profile plans.

## 2026-06-25 15:39 (Asia/Jakarta)
### Added
- `.context/session-20260625-1539.md`: Added a session snapshot for the role-aware `/profil` menu update.

### Changed
- `js/profile-page.js`: Made `/profil` side tabs and summary CTAs role-aware, so franchisee users only see franchisee sections, franchisor users only see franchisor/listing/claim sections, and admin/staff users see both.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the role-aware `/profil` tab behavior.
- `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build` verification.

## 2026-06-25 06:36 (Asia/Jakarta)
### Added
- `.context/session-20260625-0636.md`: Added a session snapshot for the public-facing copy cleanup pass.

### Changed
- `js/profile-page.js` and `css/profile.css`: Reworded `/profil` copy to plain user-facing language, replaced technical completion notices with direct CTA buttons, and renamed visible profile sections to minat usaha/data brand where appropriate.
- `js/form-07-init.js`: Reworded `/daftar` identity helper text to avoid technical login/infrastructure wording.
- `js/auth-clerk.js` and `src/pages/sso-callback/index.astro`: Reworded login and Google callback fallback messages to avoid implementation terms.
- `functions/profile-data.js`, `functions/auth-sync.js`, `functions/form-submit.js`, and `functions/get-franchises.js`: Reworded API error messages that can surface in the UI so they do not expose infrastructure names.
- `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build` verification.

## 2026-06-25 06:23 (Asia/Jakarta)
### Added
- `.context/session-20260625-0623.md`: Added a session snapshot for the production-only manual QA rule update.

### Changed
- `AGENTS.md`: Added the rule that local dev/preview servers should not be started by default because manual browser QA is done on production `franchisee.id` after code is pushed.

## 2026-06-25 06:09 (Asia/Jakarta)
### Added
- `functions/profile-data.js`: Added the protected `/profile-data` API for `/profil` reads and audited account/profile/listing mutations, including owner listing edit throttling and static rebuild queue writes.
- `src/pages/profil/index.astro`, `js/profile-page.js`, and `css/profile.css`: Added the protected `/profil` account center with side tabs for account, franchisee profile, franchisor profile, owner listings, claims, and admin/staff dashboard access.
- `.context/session-20260625-0609.md`: Added a session snapshot for the `/profil` implementation pass.

### Changed
- `js/auth-navbar.js`: Changed logged-in account links from `/daftar/` to `/profil/`.
- `js/auth-clerk.js`: Changed the default post-login destination to `/profil/` and added the `/profil` login-required message path.
- `js/form-07-init.js`: Locked Clerk/D1 identity fields in `/daftar`, added identity helper notes, and redirected completed profiles to `/profil/`.
- `css/auth-clerk.css` and `css/form-franchise/02-layout-tabs-steps.css`: Softened toggle hover/active colors so the text stays readable during animation.
- `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build` verification after adding the `/profil` Astro route.
- `docs/architecture/PROFILE_PAGE_PLAN.md`, `docs/architecture/CLERK_SETUP.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Documented `/profil`, `/profile-data`, the identity-lock flow, and owner listing edit guardrails.

## 2026-06-25 05:18 (Asia/Jakarta)
### Added
- `docs/architecture/PROFILE_PAGE_PLAN.md`: Added the `/profil` planning tracker covering subtle toggle colors, read-only Clerk/D1 identity fields in `/daftar`, side-tab profile sections, profile API contracts, owner listing/claim workflows, and implementation sequencing.
- `.context/session-20260625-0518.md`: Added a session snapshot for the `/profil` planning pass.

### Changed
- `docs/README.md`: Linked the new profile page plan from the documentation index.
- `CODEBASE.md`: Documented the new profile page planning tracker in the supporting file map.

## 2026-06-25 04:59 (Asia/Jakarta)
### Added
- `.context/session-20260625-0459.md`: Added a session snapshot for the auth/navbar icon and protected `/daftar` UX follow-up.

### Changed
- `js/auth-navbar.js`: Replaced the custom logout SVG with Font Awesome icons and kept logged-out `Daftar Mitra` pointed at protected `/daftar/`.
- `js/auth-clerk.js`: Added Font Awesome icons across auth tabs, labels, role cards, buttons, and logged-in status; added a login-required info message for `/daftar` redirects; kept auth forms visible for logged-in admin/staff inspection.
- `css/auth-clerk.css`: Centered auth actions/notes, fixed segmented-toggle contrast, compacted the navbar account/logout layout, and styled Font Awesome auth/navbar icons.
- `css/form-franchise/02-layout-tabs-steps.css`: Changed `/daftar` segmented-tab active text to dark over the white moving indicator and reserved yellow for hover/focus.
- `src/pages/dashboard/index.astro` and `css/dashboard.css`: Loaded Font Awesome and replaced custom dashboard tab/section/debug-copy SVGs with Font Awesome icons.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/architecture/CLERK_SETUP.md`, and `docs/architecture/AUTH_ONBOARDING_NAV_PLAN.md`: Documented the corrected `Daftar Mitra` destination, `/daftar` login-required message, admin/staff auth-page inspection behavior, and Font Awesome icon usage.

## 2026-06-25 04:32 (Asia/Jakarta)
### Added
- `js/auth-navbar.js`: Added a public navbar auth-state controller that normalizes logged-out auth links and replaces them after Clerk/D1 sync with account name, role badge, `/daftar` link, and red icon-only logout.
- `.context/session-20260625-0432.md`: Added a session snapshot for the auth onboarding and navbar implementation pass.

### Changed
- `js/auth-clerk.js`: Changed the public auth UI to `Masuk` / `Buat Akun`, moved role selection before registration SSO/email flows, synced pending public roles during `Auth.syncUser()`, and sent new public accounts to role-specific `/daftar` completion URLs.
- `css/auth-clerk.css`: Added animated segmented auth tabs, inline label/input auth fields, role-first registration layout, and navbar account/logout styles.
- `js/form-03-navigation-steps.js` and `css/form-franchise/02-layout-tabs-steps.css`: Added a sliding animated indicator for `/daftar` role tabs with reduced-motion fallback.
- `js/form-07-init.js`: Added `/daftar` Clerk login enforcement, role query tab selection, and safe Clerk/D1 identity prefill for empty franchisee/franchisor email/name/PIC fields.
- `login/index.html`, `daftar/index.html`, `templates/peluang-usaha-tpl.html`, and `templates/detail-franchise-tpl.html`: Loaded the shared navbar auth runtime; franchise page templates also load the auth CSS needed for the account state.
- `peluang-usaha/*.html`, `json/d1-franchise-static-data.json`, and `json/d1-generated-pages-manifest.json`: Regenerated D1-backed public franchise pages and manifests so the updated templates include the shared auth CSS/runtime/navbar hooks.
- `public/_redirects` and `register/index.html`: Redirected `/register` to `/login?mode=register` and kept a static fallback redirect for direct file access.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/architecture/CLERK_SETUP.md`, and `docs/architecture/AUTH_ONBOARDING_NAV_PLAN.md`: Documented the implemented onboarding, protected `/daftar`, `/register` redirect, navbar account state, and animated toggle behavior.

## 2026-06-25 03:56 (Asia/Jakarta)
### Added
- `docs/architecture/AUTH_ONBOARDING_NAV_PLAN.md`: Added a progress tracker for public auth onboarding, role-first registration, `/daftar` completion, animated toggles, and logged-in navbar state.
- `.context/session-20260625-0356.md`: Added a session snapshot for the auth/onboarding/navbar planning pass.

### Changed
- `docs/README.md`: Linked the new auth onboarding and navbar plan from the documentation index.
- `docs/architecture/TECH_STACK_DECISIONS.md`: Recorded the public onboarding split between lightweight Clerk account creation and `/daftar` profile/listing completion.
- `CODEBASE.md`: Documented the new auth onboarding plan in the supporting file map.

## 2026-06-25 00:43 (Asia/Jakarta)
### Added
- `.context/session-20260625-0043.md`: Added a session snapshot for the `/peluang-usaha` card CTA and tooltip stacking update.

### Changed
- `src/lib/franchise-static.ts`: Changed `/peluang-usaha` directory card CTAs to always say `Info Franchise`, including unclaimed listings, while keeping claim prompts on individual detail pages.
- `scripts/build-d1-franchise-pages.ts`: Aligned the D1 bridge directory-card CTA text with the Astro renderer.
- `js/build-listing.js`: Aligned the legacy directory builder CTA text with the current neutral `Info Franchise` wording.
- `src/lib/franchise-static-assets.ts`: Added overflow and z-index overrides so listing status badge tooltips can render above card parents and neighboring elements.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the neutral directory CTA and tooltip stacking behavior.

## 2026-06-24 23:23 (Asia/Jakarta)
### Added
- `functions/_dashboard-queries.js`: Added `getUnclaimedOutreachSummary()` so `/dashboard-data` reports published unclaimed, contact-ready, missing-phone, and outreach queue-limit counts.
- `.context/session-20260624-2323.md`: Added a session snapshot for the dashboard outreach-count investigation and fix.

### Changed
- `functions/_dashboard-queries.js`: Raised the unclaimed outreach queue cap from 75 to 250 rows.
- `functions/dashboard-data.js`: Added `outreach_summary` to the protected dashboard GET response.
- `js/dashboard-admin.js`: Changed the outreach badge to show visible rows against contact-ready and published-unclaimed totals, including a limit hint when applicable.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the dashboard outreach summary contract and queue behavior.

## 2026-06-24 22:55 (Asia/Jakarta)
### Added
- `css/dashboard.css`: Added extracted dashboard-only styles for metrics, tabs, panels, tables, forms, badges, debug UI, and responsive dashboard layout.
- `functions/_dashboard-schemas.js`: Added dashboard action validation, editable listing field whitelist, field normalization, and whitelisted update statement helper.
- `functions/_dashboard-queries.js`: Added dashboard D1 read model for overview, outreach, data quality, claims, edit suggestions, leads, publish state, and system health.
- `functions/_dashboard-actions.js`: Added dashboard write workflows for outreach logging, edit suggestions, edit review, and claim review.
- `functions/_dashboard-utils.js`: Added shared dashboard response, audit, admin, JSON, phone parsing, WhatsApp link, count, and heuristic helpers.

### Changed
- `AGENTS.md`: Added project rules to code modularly by default and prioritize finishing pending work over progress narration.
- `src/pages/dashboard/index.astro`: Replaced the single long dashboard content flow with icon-led tabs for Outreach, Data Quality, Review, and Operations, and moved dashboard styling to `css/dashboard.css`.
- `js/dashboard-admin.js`: Added dashboard tab initialization, hash-aware tab activation, and keyboard navigation for the dashboard tabs.
- `functions/dashboard-data.js`: Refactored into a thin protected router that imports dashboard schemas, queries, actions, and utilities from dedicated modules.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `DASHBOARD.md`: Documented the dashboard tab UI, CSS extraction, dashboard API split, new module ownership, and completed audit tracker items.

### Removed
- `src/pages/dashboard/index.astro`: Removed inline dashboard CSS after moving it to `css/dashboard.css`.
- `functions/dashboard-data.js`: Removed embedded schemas, queries, actions, and utility helpers after moving them to dedicated `_dashboard-*` modules.

## 2026-06-24 17:55 (Asia/Jakarta)
### Added
- `js/auth-clerk-debug.js`: Extracted masked Clerk/auth diagnostics, persisted debug events, safe session/key/token hints, storage/cookie key inspection, and `window.FranchiseAuth.getDebugSnapshot()` support from the main auth runtime.
- `js/dashboard-admin.js`: Extracted the `/dashboard` client controller for auth boot, `/dashboard-data` loading, section rendering, outreach logging, edit suggestions, admin review actions, and auth debug copy/refresh behavior.

### Changed
- `js/auth-clerk.js`: Delegates debug snapshots and event persistence to `js/auth-clerk-debug.js`, reducing the main auth runtime while keeping `window.FranchiseAuth` compatibility.
- `login/index.html`, `register/index.html`, `daftar/index.html`, `src/pages/dashboard/index.astro`, and `src/pages/sso-callback/index.astro`: Load `js/auth-clerk-debug.js` before `js/auth-clerk.js` on Clerk-enabled surfaces.
- `src/pages/dashboard/index.astro`: Replaced the large inline dashboard client script with `js/dashboard-admin.js`, leaving the Astro page as the static dashboard shell and styles.
- `AUDIT.md`: Marked auth debug extraction and dashboard client extraction complete, refreshed long-file line counts, and kept the remaining UI/core/CSS/API split order.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the new auth debug and dashboard client modules plus their route/API relationships.

### Removed
- `src/pages/dashboard/index.astro`: Removed the inline dashboard client script after moving it to `js/dashboard-admin.js`.

## 2026-06-24 17:45 (Asia/Jakarta)
### Added
- `AUDIT.md`: Added a focused long-file refactor implementation order with `js/auth-clerk.js` as Priority 1 and dashboard extraction as the next sequence.

### Changed
- `AUDIT.md`: Refreshed maintained runtime file line counts and expanded the refactor tracker for auth, dashboard, D1 public generation, importer, and form-submit hotspots.

### Removed
- None.

## 2026-06-24 17:20 (Asia/Jakarta)
### Added
- None.

### Changed
- `functions/dashboard-data.js`: Moved likely all-caps description detection out of a complex D1 `GLOB` expression and into JavaScript so `/dashboard-data` does not fail with `LIKE or GLOB pattern too complex`.
- `js/auth-clerk.js` and `src/pages/dashboard/index.astro`: Dashboard staff/admin auth now forces post-login navigation back to `/dashboard/` instead of honoring unrelated `?next=` values.
- `css/auth-clerk.css`: Added auth-panel box sizing and input max-width rules so email/password fields stay inside the dashboard login card under legacy CSS.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented that dashboard data-quality heuristics avoid complex SQLite pattern matching.

### Removed
- None.

## 2026-06-24 14:46 (Asia/Jakarta)
### Added
- `js/auth-clerk.js`: Added sanitized Clerk lifecycle debug events and `window.FranchiseAuth.getDebugSnapshot()` for diagnosing Google OAuth/session/token failures without exposing raw bearer tokens.
- `src/pages/dashboard/index.astro`: Added a dashboard auth debug panel that shows Clerk loaded/user/session state, client session count, redirect callback state, pending auth storage, and recent auth events while the dashboard is locked.
- `src/pages/dashboard/index.astro`: Added an icon-only copy button for the dashboard auth debug JSON.
- `src/pages/sso-callback/index.astro`: Added a hidden Clerk OAuth callback route that completes Google SSO before returning users to their saved destination.
- `src/pages/sso-callback/index.astro`: Added callback-page debug output and an icon-only copy button when Clerk callback processing does not produce an active session.

### Changed
- `js/auth-clerk.js` and `css/auth-clerk.css`: Replaced the plain `G` text in Google OAuth buttons with an inline Google logo.
- `js/auth-clerk.js`: Added masked Clerk-related cookie and storage key names to the auth debug snapshot so session persistence can be diagnosed without exposing cookie values.
- `js/auth-clerk.js`: Persists masked auth debug events in `sessionStorage` across OAuth redirects so `/sso-callback/` events appear in later debug captures.
- `js/auth-clerk.js`: Changed Google OAuth `redirectUrl` from the current page to `/sso-callback/`, keeping `/dashboard` as the visible admin/staff login URL while giving Clerk a dedicated callback page.
- `js/auth-clerk.js`: Runs `clerk.handleRedirectCallback()` whenever the browser is on `/sso-callback/`, even when Clerk returns without visible `__clerk_*` URL parameters, so cookie/handshake-based OAuth completion is not skipped.
- `src/pages/sso-callback/index.astro`: Stops on the callback page instead of redirecting to `/dashboard` when Clerk finishes loading without an active session.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AGENTS.md`, and `docs/architecture/CLERK_SETUP.md`: Documented the dashboard auth debug behavior.

### Removed
- None.

## 2026-06-24 05:04 (Asia/Jakarta)
### Added
- Remote D1 `franchise_db`: Inserted an active pending `admin` email role grant for `email@franchisor.id`.
- `migrations/0005_email_role_grants.sql`: Added bootstrap seed rows for `admin@alampintar.org` and `email@franchisor.id`.

### Changed
- `js/auth-clerk.js`: Revised Google OAuth callback finalization to capture Clerk's completion target without navigating early, fall back to `setActive()` from `__clerk_created_session` when needed, and refresh Clerk resources before dashboard token checks.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/CLERK_SETUP.md`: Documented the second admin bootstrap grant and the stronger OAuth callback/session refresh behavior.

### Removed
- None.

## 2026-06-24 04:29 (Asia/Jakarta)
### Added
- `js/auth-clerk.js`: Added Clerk OAuth redirect callback handling before session-token checks, plus pending post-login destination storage for Google sign-in/sign-up.

### Changed
- `js/auth-clerk.js`: Strips stale Clerk callback parameters before starting Google OAuth and clears pending OAuth state if redirect start fails.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/CLERK_SETUP.md`: Documented the custom Clerk OAuth callback requirement for `/dashboard`, `/login`, and `/register`.

### Removed
- None.

## 2026-06-24 03:27 (Asia/Jakarta)
### Added
- `migrations/0005_email_role_grants.sql`: Added `email_role_grants` so admin/staff roles can be pre-authorized by normalized email before a real Clerk user id exists.
- Remote D1 `franchise_db`: Applied `0005_email_role_grants.sql` and inserted an active pending `admin` grant for `admin@alampintar.org`.
- `js/auth-clerk.js` and `css/auth-clerk.css`: Added custom Google sign-in/sign-up buttons for public auth and dashboard auth, with pending public role sync across OAuth redirects.

### Changed
- `functions/_clerk-auth.js`: Applies active email role grants during Clerk-to-D1 user upsert before checking/syncing D1 roles.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/CLERK_SETUP.md`: Documented Google OAuth, email-based role grants, the `admin@alampintar.org` bootstrap grant, and the rule that public users still need profile/listing completion after Google auth.

### Removed
- None.

## 2026-06-24 00:29 (Asia/Jakarta)
### Added
- `js/auth-clerk.js` and `css/auth-clerk.css`: Added explicit login/register switch prompts (`Belum daftar?` / `Sudah punya akun?`) and CSS/ARIA hidden-state handling so inactive auth panels stay hidden under legacy styles.
- `js/auth-clerk.js` and `src/pages/dashboard/index.astro`: Added a login-only staff/admin auth variant mounted directly on `/dashboard`, with no register tab and no franchisee/franchisor role picker.

### Changed
- `functions/_clerk-auth.js`: Tightened role hierarchy so `admin` can satisfy protected-role checks globally, while `staff` only satisfies staff-level access and no longer implicitly passes admin/franchisee/franchisor checks.
- `src/pages/dashboard/index.astro`: Locks dashboard panels by default, keeps unauthenticated users on `/dashboard` with the internal login form, and only reveals operational sections after `/dashboard-data` authorizes the Clerk session with D1 staff/admin roles.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Documented dashboard same-URL login protection, the custom Clerk tab isolation contract, and the corrected admin/staff role hierarchy.

### Removed
- None.

## 2026-06-24 00:03 (Asia/Jakarta)
### Added
- `js/auth-clerk.js`: Sets `window.__clerk_publishable_key` and Clerk script data attributes before loading `clerk.browser.js`, so the Clerk browser bundle sees the publishable key during script evaluation.

### Changed
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/CLERK_SETUP.md`: Documented that Clerk's browser bundle requires the publishable key at script-load time, not only during later `clerk.load()` initialization.

### Removed
- None.

## 2026-06-22 22:45 (Asia/Jakarta)
### Added
- `src/lib/franchise-static-assets.ts`: Added extracted helpers for generated directory/detail CSS/JS injection and CSS-only franchise image placeholders.

### Changed
- `src/lib/franchise-static.ts`: Refactored generated asset injection and placeholder rendering into `src/lib/franchise-static-assets.ts`, reducing the main renderer from about 1,549 lines to 944 lines without changing route output intent.
- `AUDIT.md`: Added and updated the long-file refactor tracker, including the completed first extraction and remaining long-file candidates.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the new static asset helper module and updated `src/lib/franchise-static.ts` responsibilities.

### Removed
- None.

## 2026-06-22 22:30 (Asia/Jakarta)
### Added
- `scripts/copy-legacy-static.mjs`: Copies the installed ClerkJS browser bundle into `dist/clerk` so `/login`, `/register`, and `/dashboard` can load `/clerk/clerk.browser.js` locally before trying CDN fallbacks.

### Changed
- `functions/auth-config.js`: Prefers Astro-style `PUBLIC_CLERK_PUBLISHABLE_KEY`, keeps `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_PUBLISHABLE_KEY` compatibility fallbacks, and retains the public live-key fallback for stale/empty runtime config.
- `js/auth-clerk.js`: Loads locally hosted ClerkJS first, falls back to pinned CDN URLs, and simplifies existing script detection.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/architecture/CLERK_SETUP.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the Astro Clerk env name, ClerkJS local asset behavior, and compatibility fallback policy.

### Removed
- None.

## 2026-06-22 18:12 (Asia/Jakarta)
### Added
- `js/auth-clerk.js`: Added a client-side Clerk publishable-key fallback so `/dashboard`, `/login`, `/register`, and protected forms can initialize Clerk even if `/auth-config` returns an empty or stale config response.

### Changed
- `js/auth-clerk.js`: Normalizes the publishable key before Clerk initialization and supports both constructor-style and singleton-style ClerkJS CDN initialization.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the client-side Clerk publishable-key fallback.

### Removed
- None.

## 2026-06-22 17:59 (Asia/Jakarta)
### Added
- `functions/auth-config.js`: Added the live Clerk publishable key as a public fallback so browser auth can initialize even if the Cloudflare Pages env var is missing from the Functions runtime.

### Changed
- `templates/peluang-usaha-tpl.html` and `templates/detail-franchise-tpl.html`: Replaced visible legacy navbar/footer links for `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, and `/kategori` with canonical `/peluang-usaha` query URLs.
- `src/lib/franchise-static.ts`: Added render-time canonicalization for legacy template/menu links and changed category route helper output to canonical `/peluang-usaha?kategori=...` URLs.
- `scripts/build-d1-franchise-pages.ts`, `js/build-listing.js`, and `js/build-details.js`: Added canonical legacy-link rewriting so older generation paths cannot reintroduce duplicate directory/category URLs.
- `src/pages/dashboard/index.astro`: Removed the missing legacy Astra dynamic CSS reference that returned HTML/404 and triggered strict MIME stylesheet errors in production.
- `AGENTS.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Documented the Clerk public fallback, dashboard CSS dependency cleanup, canonical template link behavior, and the rule that Clerk publishable keys are public while secret keys must remain private.

### Removed
- None.

## 2026-06-22 15:22 (Asia/Jakarta)
### Added
- `.context/session-20260622-1522.md`: Added session snapshot for completed dashboard edit/claim workflow implementation.

### Changed
- `functions/dashboard-data.js`: Added dashboard action routing for structured listing edit suggestions, admin edit suggestion review, admin claim review, editable listing options, lead summary, system-health data, audit writes, field whitelist validation, and static rebuild queue writes for approved public changes.
- `src/pages/dashboard/index.astro`: Added listing edit suggestion form, pending suggestion table, admin approve/reject controls for suggestions and claims, lead summary panel, system-health panel, and data-quality quick suggestion seeding.
- `DASHBOARD.md`: Marked edit suggestions, admin approvals, claim review, listing operations MVP, lead summary, and system health as implemented; kept richer field drawers/telemetry/payment metrics as follow-up work.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Synced dashboard API behavior, D1 dirty-queue responsibilities, approval workflow, and remaining dashboard scope.

### Removed
- None.

## 2026-06-22 09:46 (Asia/Jakarta)
### Added
- `src/pages/dashboard/index.astro`: Added static `/dashboard` admin/staff operations shell with Clerk-authenticated data loading, overview metrics, unclaimed WhatsApp outreach, data-quality warnings, publish queue state, pending claims, and staff edit policy notes.
- `functions/dashboard-data.js`: Added protected dashboard API requiring D1 `staff` or elevated `admin`, returning Franchisee.id D1 dashboard data and logging WhatsApp outreach events.
- `migrations/0004_dashboard_operations.sql`: Added `listing_outreach_events`, `staff_auto_approval_rules`, and `listing_edit_suggestions` tables for dashboard outreach and edit-review workflows.
- `.context/session-20260622-0946.md`: Added session snapshot for dashboard implementation decisions and pending work.

### Changed
- `DASHBOARD.md`: Converted from brainstorm to active progress tracker, recorded the `/dashboard` route decision, staff edit approval policy, staff-personal WhatsApp sender decision, Franchisee.id-only scope, implemented areas, pending dashboard work, and remote migration auth blocker.
- `src/pages/dashboard/index.astro`: Changed outreach actions so opening WhatsApp and logging outreach are separate; staff must manually click "Catat terkirim" before a D1 outreach event is recorded.
- `DASHBOARD.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, and `.context/session-20260622-0946.md`: Recorded final dashboard open decisions for structured JSON edit diffs, all-fields trusted staff auto-approval, manual outreach confirmation, data-completeness outreach priority, and the repeated remote migration token/auth blocker.
- Remote D1 `franchise_db`: Applied `0004_dashboard_operations.sql` successfully after setting `CLOUDFLARE_ACCOUNT_ID=0ba63b7f0096bc267a93fe5c80b1f571` for Wrangler account context.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/README.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the dashboard route/API, D1 migration, access model, outreach logging, and remaining edit/approval workflow gaps.
- Verified source/legacy HTML outside generated output has no remaining old directory route links; build-time legacy copy rewriting remains in `scripts/copy-legacy-static.mjs`.

### Removed
- None.

## 2026-06-22 09:04 (Asia/Jakarta)
### Added
- `DASHBOARD.md`: Added admin/staff dashboard plan covering overview metrics, listing operations, unclaimed WhatsApp outreach, claim review, data quality, publishing, leads, system health, access model, data needs, and MVP sequence.
- `.context/session-20260622-0904.md`: Added session snapshot for directory route consolidation, dashboard planning, and all-caps description presentation normalization.

### Changed
- `src/lib/franchise-static.ts`: Made `/peluang-usaha` the canonical directory route with query-param search/sort/category/status controls, rewired generated category links/breadcrumbs/schema to `/peluang-usaha?kategori=...`, added render-time all-caps brand/company/description display normalization, and kept detail pages using flat franchise URLs.
- `scripts/copy-legacy-static.mjs`: Skips duplicate legacy directory/category route folders and rewrites copied legacy HTML links from old archive URLs to canonical `/peluang-usaha` query-param URLs.
- `public/_redirects`: Redirects `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/category`, and known top-level category aliases to canonical `/peluang-usaha` query-param URLs.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/README.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the canonical `/peluang-usaha` route policy, redirect-only duplicate archives, dashboard planning source, legacy link rewriting, and render-time uppercase description normalization.

### Removed
- `src/pages/[categorySlug].astro`: Removed duplicate top-level category archive generation.
- `src/pages/abjad/index.astro`: Removed duplicate alphabetical archive generation.
- `src/pages/kategori/[slug].astro`: Removed duplicate category archive generation.
- `src/pages/kategori/index.astro`: Removed duplicate category index generation.
- `src/pages/populer/index.astro`: Removed duplicate popular archive generation.
- `src/pages/rekomendasi/index.astro`: Removed duplicate recommendation archive generation.

## 2026-06-22 06:05 (Asia/Jakarta)
### Added
- `.context/session-20260622-0605.md`: Added session snapshot for detail-page tabs, placeholders, contrast, and public contact parsing.

### Changed
- `src/lib/franchise-static.ts`: Styled detail CSS-only placeholders, fixed readable yellow/category/breadcrumb link states, made generated detail tabs self-contained, stripped stale legacy tab comments, removed breadcrumb chip styling from `hfe-post-info` category items, forced readable disclaimer claim links, added an office-address prefix icon, and rendered unclaimed public contact/address data with Indonesian phone parsing, `tel:` links, WhatsApp claim-notification links, and claim CTA wording.
- `scripts/build-d1-franchise-pages.ts`: Added public `phone` and `office_address` fields to the D1 static snapshot query for Astro detail rendering.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented unclaimed public contact display, render-time phone normalization, detail tab behavior, WhatsApp claim-notification links, and future normalized contact-model direction.

### Removed
- None.

## 2026-06-21 05:45 (Asia/Jakarta)
### Added
- `public/_redirects`: Added Cloudflare Pages 301 redirects from legacy `/category/*` and `/category` URLs to canonical Indonesian `/kategori/*` URLs.
- `.context/session-20260621-0545.md`: Added session snapshot for the franchise listing cosmetic, permalink, and SEO cleanup.

### Changed
- `src/lib/franchise-static.ts`: Removed missing WooCommerce placeholder image fallbacks, added CSS-only placeholders, made franchise names clickable, improved unclaimed/verified badges with CSS tooltips and fact chips, cleaned detail SEO metadata, generated breadcrumb JSON-LD, normalized category links to `/kategori`, and styled detail breadcrumbs.
- `templates/detail-franchise-tpl.html`: Removed the black header placeholder and fake WordPress `By admin / October 10, 2025` post metadata from franchise listing detail pages.
- `scripts/build-d1-franchise-pages.ts`, `js/build-listing.js`, and `js/build-details.js`: Aligned legacy bridge/build helpers with CSS-only placeholders and `/kategori` links.
- `scripts/copy-legacy-static.mjs`: Skips legacy `/category` during hybrid build output so `/category/*` remains redirect-only instead of duplicate generated pages.
- `src/pages/[categorySlug].astro`: Canonicalizes top-level legacy category pages to `/kategori/[slug]`.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the canonical `/kategori` policy, redirect-only `/category`, listing-page metadata rules, and placeholder/badge behavior.

### Removed
- `src/pages/category/[slug].astro`: Removed duplicate Astro `/category/[slug]` generation in favor of Cloudflare Pages redirects.

## 2026-06-19 21:53 (Asia/Jakarta)
### Added
- `src/pages/rekomendasi/index.astro`: Added D1-backed static recommendation archive.
- `src/pages/populer/index.astro`: Added D1-backed static popular archive using a deterministic listing-quality proxy.
- `src/pages/abjad/index.astro`: Added D1-backed static alphabetical archive.
- `src/pages/kategori/index.astro`: Added D1-backed static category index.
- `src/pages/kategori/[slug].astro`: Added D1-backed category archive route with legacy aliases.
- `src/pages/category/[slug].astro`: Added legacy `/category/[slug]` compatibility archive route.
- `src/pages/[categorySlug].astro`: Added top-level category slug compatibility route.
- `.context/session-20260619-2153.md`: Added session snapshot for the D1-backed directory route expansion.

### Changed
- `src/lib/franchise-static.ts`: Added shared directory route rendering, route-specific metadata, category route entries/aliases, recommendation/popular/abjad ordering helpers, category cards, and CSS-only placeholders for franchise/category cards without images.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the D1-backed directory route expansion, category compatibility routes, and missing-image placeholder behavior.

### Removed
- None.

## 2026-06-19 21:21 (Asia/Jakarta)
### Added
- `scripts/copy-legacy-static.mjs`: Added post-Astro copy step that copies legacy static HTML/assets/directories into `dist` without overwriting Astro-generated output and skips legacy `/peluang-usaha`.
- `.context/session-20260619-2121.md`: Added session snapshot for the hybrid static output fix.
- `package.json`: Added `copy:legacy-static` script.

### Changed
- `package.json`: Updated `build:astro` so Cloudflare Pages output includes both Astro-generated D1 pages and legacy static site assets/pages.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the hybrid `dist` output rule and route ownership for `/peluang-usaha`.

### Removed
- None.

## 2026-06-19 06:34 (Asia/Jakarta)
### Added
- None.

### Changed
- `wrangler.toml`: Removed unsupported `account_id` from the Pages config and documented that account context must come from Cloudflare Pages, `cfman`, or environment variables.
- `scripts/build-d1-franchise-pages.ts`: Added Cloudflare D1 HTTP API querying for build-time D1 reads when a token is available, with Wrangler/cfman retained as fallback.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented that Cloudflare Pages rejects `account_id` in `wrangler.toml` and that Pages builds need `CLOUDFLARE_API_TOKEN` for D1 static generation.

### Removed
- None.

## 2026-06-19 06:10 (Asia/Jakarta)
### Added
- `.node-version`: Pinned the project build runtime intent to Node `20.19.4` for the Astro 5.x deployment path.
- `.context/session-20260619-0610.md`: Added session snapshot for the Cloudflare Pages dependency/bundling deploy fix.

### Changed
- `wrangler.toml`: Added `pages_build_output_dir = "dist"` so Cloudflare Pages treats the Wrangler config as valid for Pages builds.
- `wrangler.example.toml`: Added the Pages output directory and Cloudflare Pages build-command note.
- `package.json`: Added conventional `build` script that delegates to `pnpm run build:astro`.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/README.md`, `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the Pages build-command requirement, output directory, and the reason dependency-backed Functions failed when Cloudflare skipped the build step.

### Removed
- None.

## 2026-06-18 18:48 (Asia/Jakarta)
### Added
- `migrations/0003_site_publish_queue.sql`: Added `site_rebuild_requests` and `site_publish_state` for D1-to-static publish queueing, publish guardrails, and publish mode tracking.
- `functions/_site-publish-queue.js`: Added shared Pages Functions helper for enqueueing public-page rebuild requests in D1.
- `scripts/d1-static-publish-poller.mjs`: Added dependency-free GitHub Actions poller that checks D1, enforces guardrails, calls the Cloudflare Pages Deploy Hook when dirty, and supports direct `dist/` deploy fallback status updates.
- `.github/workflows/d1-static-publish.yaml`: Added 30-minute/manual D1 static publish polling workflow.
- `.context/session-20260618-1848.md`: Added session snapshot for the publish queue and GitHub Actions poller implementation.
- `package.json`: Added `publish:d1:poll` script.
- Remote D1 `franchise_db`: Applied `0003_site_publish_queue.sql` through `npx cfman wrangler --account franchise-network`.

### Changed
- `functions/form-submit.js`: Enqueues static rebuild requests for franchisor listing submissions, claim submissions, dev unclaimed creation, and dev test-data clearing.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/README.md`, `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented implemented D1 publish queue, workflow behavior, required GitHub secrets, verification status, and remaining publish automation gaps.

### Removed
- None.

## 2026-06-17 21:48 (Asia/Jakarta)
### Added
- None.

### Changed
- `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, `AUDIT.md`, `CODEBASE.md`, `AGENTS.md`, and `.context/session-20260617-1514.md`: Clarified the balanced publish model where GitHub Actions polls D1 and Cloudflare Pages builds only when dirty, while avoiding generated-output commits that would trigger extra Cloudflare Git builds. Documented GitHub direct `dist/` deploy as the fallback if Cloudflare build quota becomes constrained.

### Removed
- None.

## 2026-06-17 21:32 (Asia/Jakarta)
### Added
- `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md`: Added comparison of twice-daily D1 static publishing versus GitHub Actions polling/direct deploy, including the recommended 30-minute polling path and guardrails.

### Changed
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `.context/session-20260617-1514.md`, `docs/README.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Linked the new publish strategy and clarified that twice-daily publishing is the safe baseline while 30-minute GitHub Actions polling/direct deploy is the preferred target after dirty queue tables exist.

### Removed
- None.

## 2026-06-17 21:14 (Asia/Jakarta)
### Added
- None.

### Changed
- `AUDIT.md`, `CODEBASE.md`, `AGENTS.md`, `.context/session-20260617-1514.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Clarified that D1 public-page edits should be batched into twice-daily scheduled static publishes at 09:00 and 21:00 Asia/Jakarta, with manual admin deploys reserved for urgent exceptions.

### Removed
- None.

## 2026-06-17 15:14 (Asia/Jakarta)
### Added
- `migrations/0002_add_franchisor_social_links.sql`: Added optional `facebook_url`, `tiktok_url`, `youtube_url`, and `linkedin_url` columns to `franchisor_profiles`.
- `.context/session-20260617-1514.md`: Added session snapshot for D1-to-static publish automation planning and franchisor social-link fields.
- `/daftar/index.html`: Added missing Step 5 franchisor contact fields (`pic_name`, `email_contact`, `website_url`, `instagram_url`) plus Facebook, TikTok, YouTube, and LinkedIn URL fields.
- Remote D1 `franchise_db`: Applied `0002_add_franchisor_social_links.sql` through `npx cfman wrangler --account franchise-network`.

### Changed
- `functions/form-submit.js`: Stores franchisor social links in D1 and uses extensionless canonical URLs for new franchise site publications.
- `scripts/import-csv-to-d1.ts`: Maps optional social-link columns from CSV imports into `franchisor_profiles`.
- `scripts/build-d1-franchise-pages.ts` and `src/lib/franchise-static.ts`: Select, validate, and render franchisor contact/social links into franchise detail contact tabs when present.
- `AGENTS.md`, `AUDIT.md`, `CODEBASE.md`, `FORM_SCHEMA.md`, `FORM_PRESERVATION_MANDATE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented social-link fields and the D1-to-static publish automation plan.

### Removed
- None.

## 2026-06-17 14:47 (Asia/Jakarta)
### Added
- `.context/session-20260617-1447.md`: Added session snapshot for switching D1/Astro franchise detail output to flat `.html` files.

### Changed
- `astro.config.mjs`: Switched Astro to `build.format: "preserve"` with `trailingSlash: "never"` so listing index output remains an index file while `src/pages/peluang-usaha/[slug].astro` builds flat `.html` files.
- `scripts/build-d1-franchise-pages.ts`: Changed D1 bridge detail output from `/peluang-usaha/[slug]/index.html` to `/peluang-usaha/[slug].html` and added safe cleanup for old marker-owned folder indexes when manifest paths change.
- `src/lib/franchise-static.ts` and `scripts/build-d1-franchise-pages.ts`: Updated franchise JSON-LD detail URLs to the extensionless `/peluang-usaha/[slug]` canonical shape.
- `AGENTS.md`, `CODEBASE.md`, `AUDIT.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented flat physical detail output with extensionless public links.

### Removed
- None.

## 2026-06-17 03:11 (Asia/Jakarta)
### Added
- `functions/clerk-webhook.js`: Added a verified Clerk lifecycle webhook endpoint for `user.created`, `user.updated`, and `user.deleted` events so Clerk identity changes are reflected in D1.
- `functions/user-role.js`: Added an admin-only D1 role mutation endpoint that writes D1 `user_roles` and immediately syncs the resulting role snapshot back to Clerk metadata.
- `functions/sync-clerk-metadata.js`: Added an admin-only repair/backfill endpoint to sync one or many D1 users into Clerk metadata after manual SQL or operational repair.
- `.context/session-20260617-0311.md`: Added session snapshot for the D1/Clerk sync contract and implementation.

### Changed
- `functions/_clerk-auth.js`: Added webhook-safe Clerk user parsing, D1 user deletion marking, D1 role assignment/removal helpers, D1 user lookup helpers, and D1-to-Clerk metadata sync helpers.
- `functions/_clerk-auth.js`: `/auth-sync` and protected D1 user authorization now refresh Clerk `publicMetadata.franchiseNetwork` and `privateMetadata.franchiseNetwork` from D1 roles/status.
- `functions/auth-config.js` and `js/auth-clerk.js`: Support `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` with `CLERK_PUBLISHABLE_KEY` fallback and use generic browser error wording.
- `AGENTS.md`, `CODEBASE.md`, `AUDIT.md`, `TECHNICAL_INVENTORY.md`, `docs/README.md`, `docs/architecture/CLERK_SETUP.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the bidirectional sync contract, Clerk webhook setup, D1 admin role endpoint, metadata repair endpoint, and the rule that D1 remains authoritative for authorization.

### Removed
- None.

## 2026-06-17 02:58 (Asia/Jakarta)
### Added
- `@clerk/backend` and `@clerk/clerk-js`: Added Clerk dependencies for server-side session verification and custom browser auth flows.
- `functions/_clerk-auth.js`: Added shared Clerk bearer-token verification, Clerk user fetch, D1 `users` upsert, D1 role assignment, and role authorization helpers.
- `functions/auth-config.js`: Added same-origin public Clerk config endpoint for `CLERK_PUBLISHABLE_KEY`.
- `functions/auth-sync.js`: Added authenticated Clerk-to-D1 user sync endpoint with Zod validation and self-assignable `franchisee`/`franchisor` roles.
- `js/auth-clerk.js`: Added custom ClerkJS login/register/email-code verification client and `window.FranchiseAuth` token helper.
- `css/auth-clerk.css`: Added custom auth UI styles using existing site color variables.
- `register/index.html`: Added dedicated custom account registration page with franchisee/franchisor role selection.
- `docs/architecture/CLERK_SETUP.md`: Added Clerk Dashboard, Cloudflare Pages env, runtime flow, and D1 role setup instructions.

### Changed
- `functions/form-submit.js`: Requires Clerk-authenticated D1 users for franchisee, franchisor, claim, and dev test-data writes; writes `user_id`, `owner_user_id`, `claimant_user_id`, and `audit_events.actor_user_id`; enforces D1 roles (`franchisee`, `franchisor`, `staff`, `admin`).
- `js/form-06-submit-validation.js`: Attaches Clerk bearer auth headers to `/form-submit` and blocks unauthenticated submissions with a login message.
- `js/form-09-test-data-generator.js`: Sends Clerk auth headers for D1 test-data writes and updates cleanup wording from Google Sheets to D1.
- `login/index.html`: Loads custom auth CSS/JS so the legacy WPForms block is replaced by the custom Clerk UI at runtime.
- `daftar/index.html`: Loads auth CSS/JS so existing form submissions can attach Clerk session tokens.
- `AGENTS.md`, `CODEBASE.md`, `AUDIT.md`, `TECHNICAL_INVENTORY.md`, `docs/README.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented Clerk setup, custom auth routes, D1 user mapping, role checks, and the end of anonymous D1 form writes.
- `package.json` and `pnpm-lock.yaml`: Updated dependency graph for Clerk packages.

### Removed
- None.

## 2026-06-17 02:40 (Asia/Jakarta)
### Added
- `functions/get-franchises.js`: Added Zod query validation, D1-first directory reads, D1 search/filter/pagination parameters, D1 franchisee-profile reads, and a transition-only Sheets read fallback.
- `functions/form-submit.js`: Added Zod payload validation and D1-only write handling for franchisee submissions, franchisor submissions, claim submissions, and dev test-data actions.

### Changed
- `functions/get-franchises.js`: Replaced the default Google Sheets read path with Cloudflare D1 `franchise_db` reads while preserving the existing JSON response envelope, Cloudinary URL optimization, and strict `UNCLAIMED` claim-search sanitization.
- `functions/form-submit.js`: Replaced Google Sheets append/delete helpers with D1 writes to `franchisee_profiles`, `franchisor_profiles`, `franchises`, `franchise_packages`, `franchise_site_publications`, `franchise_claims`, `legacy_source_rows`, and `audit_events`.
- `functions/form-submit.js`: Claim submissions now update matched D1 `UNCLAIMED` franchises into `FRANCHISOR` listings so claimed brands leave the unclaimed search pool.
- `CODEBASE.md`, `AUDIT.md`, `TECHNICAL_INVENTORY.md`, `FORM_SCHEMA.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, and `.context/session-20260617-0206.md`: Documented the D1 runtime read/write cutover and the remaining Clerk ownership gap.

### Removed
- `functions/form-submit.js`: Removed all Google Sheets write helpers from the active submit path.

## 2026-06-17 02:06 (Asia/Jakarta)
### Added
- `astro.config.mjs`: Added Astro static build configuration for Cloudflare Pages-compatible output.
- `src/env.d.ts`: Added Astro TypeScript environment reference.
- `src/lib/franchise-static.ts`: Added Zod-validated D1 snapshot loader and shared listing/detail template renderers for Astro static routes.
- `src/pages/peluang-usaha/index.astro`: Added Astro static route for the D1-backed franchise directory index.
- `src/pages/peluang-usaha/[slug].astro`: Added Astro static route that uses `getStaticPaths` to generate one detail page per D1 franchise slug.
- `json/d1-franchise-static-data.json`: Added generated D1 snapshot consumed by Astro static route generation.
- `docs/README.md`: Added centralized documentation index and source-of-truth rules.
- `docs/forms/AUTO_SAVE.md`, `docs/forms/CLAIM_WORKFLOW.md`, `docs/forms/FRANCHISEE_MULTISTEP.md`, `docs/forms/FORM_UX_FIXES.md`, `docs/forms/FORM_VALIDATION_FIXES.md`, and `docs/forms/franchise-info-form.md`: Moved detailed form references out of the repository root.
- `docs/testing/DEBUGGING.md` and `docs/testing/TEST_DATA_GENERATOR.md`: Moved testing/debugging references out of the repository root.
- `docs/architecture/TECH_STACK_DECISIONS.md`: Moved the stack decision log under architecture docs.
- `.context/session-20260617-0206.md`: Added session snapshot for documentation centralization and Astro static route scaffolding.

### Changed
- `package.json`: Added Astro scripts (`astro:sync`, `build:astro`, `dev:astro`, `preview:astro`) and pinned environment-compatible `astro@5.18.2`, `@astrojs/cloudflare@12.6.13`, `wrangler@4.86.0`, `typescript@5.9.3`, and `@types/node@20.19.25`.
- `pnpm-lock.yaml`: Updated locked dependencies for Astro, the Cloudflare adapter, pinned Wrangler, and Node 20/TypeScript 5-compatible type tooling.
- `.gitignore`: Ignored Astro generated build/cache directories `.astro/` and `dist/`.
- `tsconfig.json`: Expanded TypeScript coverage from migration scripts to include `src/**/*.ts` and `src/**/*.d.ts`.
- `scripts/build-d1-franchise-pages.ts`: Added D1 snapshot output for Astro and switched Wrangler invocation to `pnpm exec wrangler`.
- `AGENTS.md`: Rebuilt as a concise working rulebook with docs centralization, D1/Astro generation, and form guardrails.
- `CODEBASE.md`: Documented the Astro routes, D1 snapshot handoff, updated package scripts, and the new Astro static route flow.
- `AUDIT.md`: Marked Astro scaffold as implemented and updated next work toward D1-backed reads, auth, and D1 writes.
- `TECHNICAL_INVENTORY.md`: Added `/src` Astro modules/routes and updated the D1 bridge inventory.
- `FORM_PRESERVATION_MANDATE.md`: Updated moved form-reference paths.
- `docs/architecture/TECH_STACK_DECISIONS.md`: Added Astro scaffold status, package pins, and `build:astro` verification details.
- `GEMINI.md`, `KNOWLEDGE.md`, `QWEN.md`, and `PRD.md`: Reduced duplicated architecture content into compatibility pointers to canonical docs.

### Removed
- Root-level long reference copies were removed after moving them under `docs/`: `AUTO_SAVE.md`, `CLAIM_WORKFLOW.md`, `FRANCHISEE_MULTISTEP.md`, `FORM_UX_FIXES.md`, `FORM_VALIDATION_FIXES.md`, `franchise-info-form.md`, `DEBUGGING.md`, `TEST_DATA_GENERATOR.md`, and `TECH_STACK_DECISIONS.md`.

## 2026-06-16 16:59 (Asia/Jakarta)
### Added
- `scripts/build-d1-franchise-pages.ts`: Added the first D1-backed public franchise page generator. It queries published `site_franchisee_id` rows from `franchise_db`, renders listing/detail HTML from existing templates, regenerates claim-search JSON, writes a generated-page manifest, skips unchanged pages, and prunes only manifest-owned D1 pages.
- `scripts/build-d1-franchise-pages.ts`: Normalizes generated HTML trailing whitespace and mixed indentation so D1-generated pages pass `git diff --check`.
- `json/d1-generated-pages-manifest.json`: Added generated-page ownership and hash manifest for D1-backed `/peluang-usaha` pages.
- `peluang-usaha/**/index.html`: Generated new D1-backed franchise detail pages for published D1 listings that did not already exist as legacy folders.

### Changed
- `package.json`: Added `build:d1:franchises:dry` and `build:d1:franchises` scripts.
- `.gitignore`: Ignored `.context/d1-franchise-page-query.sql`, a generated diagnostic/query artifact from the D1 page builder iteration.
- `peluang-usaha/index.html`: Regenerated the franchise directory listing from D1 data.
- Existing `peluang-usaha/**/index.html` detail pages with matching D1 slugs: Regenerated from D1 data and marked with `d1-generated:franchisee.id`.
- `json/unclaimed-brands.json`: Regenerated from D1 unclaimed rows instead of the legacy Sheets/CSV builder.
- `CODEBASE.md`: Documented the D1 public page generator, manifest, D1 generation flow, and safe stale-page pruning contract.
- `AUDIT.md`: Marked public directory rebuild as in progress, recorded 197 generated D1-backed detail pages, and set the next step as porting the bridge into Astro static routes.
- `TECH_STACK_DECISIONS.md`: Added the D1 static public generation decision and Astro migration target.
- `KNOWLEDGE.md`: Added D1 public generation commands, current behavior, cfman-token/Wrangler detail, and stale-page cleanup guardrails.
- `AGENTS.md`: Added persistent rules for D1-backed SEO page generation and manifest-scoped stale cleanup.
- `GEMINI.md`, `PRD.md`, `QWEN.md`, and `TECHNICAL_INVENTORY.md`: Added alignment notes for the D1-backed public generation bridge and Astro static-generation target.
- `.context/session-20260616-1523.md`: Added D1 public page generation notes and verification results.

### Removed
- None.

## 2026-06-16 16:25 (Asia/Jakarta)
### Added
- `scripts/import-csv-to-d1.ts`: Added the first TypeScript/Zod CSV importer for moving `csv/franchisors.csv`, `csv/unclaimed.csv`, and `csv/franchisee.csv` into Cloudflare D1 `franchise_db` with quote-aware parsing, strict `UNCLAIMED` sanitization, stable ids, generated SQL output, and optional remote apply through `cfman`.
- `tsconfig.json`: Added strict TypeScript configuration for migration scripts.

### Changed
- `package.json`: Added `import:csv:dry`, `import:csv:sql`, and `import:csv:remote` scripts.
- `pnpm-lock.yaml`: Added locked dependencies for `zod`, `typescript`, `tsx`, and Node types.
- `.gitignore`: Ignored generated `.context/d1-import-franchise-data.sql`.
- `CODEBASE.md`: Documented the D1 importer, generated SQL output, TypeScript config, package scripts, CSV-to-D1 data flow, and verified remote import counts.
- `AUDIT.md`: Marked Cloudflare config/import pipeline progress, removed duplicated immediate-next-work items, and recorded first remote D1 import status.
- `TECH_STACK_DECISIONS.md`: Added current importer commands and verified first remote import counts.
- `KNOWLEDGE.md`: Added importer commands, current import bridge details, D1 count verification, and cfman sequencing caution.
- `AGENTS.md`: Added the persistent rule to run `cfman wrangler` commands sequentially because repeated immediate invocations can intermittently fail to detect Wrangler in this environment.
- `.context/session-20260616-1523.md`: Added importer implementation notes, validation results, remote import results, and the cfman batch-query caveat.
- `AUDIT.md` and `.context/session-20260616-1523.md`: Updated final import batch verification after `cfman` succeeded; recorded the two completed import batch ids and confirmed entity rows did not duplicate.

### Removed
- None.

## 2026-06-16 15:23 (Asia/Jakarta)
### Added
- `migrations/0001_initial_network_schema.sql`: Added the first D1 SQL migration for the shared `franchise_db` network schema, including network sites, users/roles, franchisee/franchisor profiles, franchises, claims, assets, leads, site publications, subscription entitlements, imports, and audit events.
- `wrangler.toml`: Added active Wrangler config for `franchise_db` using candidate D1 UUID `812cd8ac-edd0-45d9-981f-c9a15358317b`.
- `wrangler.example.toml`: Added a non-active Wrangler config example for the `franchise_db` binding and migrations directory.
- `.context/wrangler-local-d1-test.toml`: Added local-only Wrangler config for validating D1 migrations without production credentials.
- `.context/session-20260616-1523.md`: Added session snapshot for the first D1 migration and shared-network architecture decision.

### Changed
- `.gitignore`: Ignored Wrangler local state directories generated during local D1 validation.
- `AGENTS.md`: Added persistent rules for `franchise_db` as the shared multi-site D1 source of truth and Google Sheets as archive/import-only.
- `TECH_STACK_DECISIONS.md`, `AUDIT.md`, `CODEBASE.md`, `PRD.md`, `GEMINI.md`, `KNOWLEDGE.md`, and `QWEN.md`: Documented the shared-network D1 model, real binding name, one-payment multi-site publication approach, and the remote migration prerequisite.
- `TECH_STACK_DECISIONS.md`, `AUDIT.md`, `CODEBASE.md`, and `.context/session-20260616-1523.md`: Recorded the remote migration failure caused by the current `CLOUDFLARE_API_TOKEN` account not finding UUID `812cd8ac-edd0-45d9-981f-c9a15358317b`.
- `AGENTS.md`, `TECH_STACK_DECISIONS.md`, `AUDIT.md`, and `.context/session-20260616-1523.md`: Added `cfman` as the required multi-account Cloudflare workflow for D1 migrations and documented that no cfman accounts are configured yet.
- `TECH_STACK_DECISIONS.md`, `AUDIT.md`, `CODEBASE.md`, and `.context/session-20260616-1523.md`: Updated remote migration status after `franchise-network` was configured in `cfman`, `0001_initial_network_schema.sql` was applied remotely, and `d1_migrations` verification passed.

### Removed
- None.

## 2026-06-13 01:46 (Asia/Jakarta)
### Added
- `TECH_STACK_DECISIONS.md`: Added canonical migration decisions for TypeScript, Zod, D1 SQL migrations, D1-authoritative roles, Clerk/D1 responsibility split, Drizzle adoption timing, and the Google Sheets to D1 cutover path.
- `.context/session-20260613-0146.md`: Added session snapshot for the stack-decision documentation update.

### Changed
- `AGENTS.md`: Added persistent rules for TypeScript-by-default migration work, Zod validation, SQL migrations, D1-authoritative roles, and the new stack-decision reference.
- `AUDIT.md`: Added TypeScript, Zod, SQL migration, Drizzle, and D1 role-model decisions to the migration tracker and immediate next-work list.
- `CODEBASE.md`: Added the new migration decisions and `TECH_STACK_DECISIONS.md` to the codebase map.
- `PRD.md`: Added TypeScript, Zod, SQL migrations, and D1 role model requirements to the v3 technology upgrade plan.
- `GEMINI.md`, `KNOWLEDGE.md`, and `QWEN.md`: Aligned core architecture/governance notes with TypeScript, Zod, SQL migrations, and D1-authoritative authorization.

### Removed
- None.

## 2026-06-10 02:16 (Asia/Jakarta)
### Added
- `.context/session-20260610-0216.md`: Added session snapshot for the tech-stack recommendation and proactive-agent instruction update.

### Changed
- `AGENTS.md`: Added a persistent rule requiring proactive engineering judgment and actionable suggestions when maintainability, security, performance, UX, data integrity, or migration safety can be improved.

### Removed
- None.

## 2026-06-08 05:59 (Asia/Jakarta)
### Added
- `.context/session-20260608-0559.md`: Added session snapshot for the Markdown architecture-alignment pass.
- `.context/session-20260404-1215.md`, `.context/session-20260404-1755.md`, and `.context/session-20260404-1900.md`: Added historical context notices so older Google Sheets/static-form notes are not mistaken for the target architecture.

### Changed
- `GEMINI.md`, `KNOWLEDGE.md`, `PRD.md`, and `QWEN.md`: Reframed the project direction around Astro on Cloudflare, D1, R2, and Clerk while marking Google Sheets/CSV and legacy media URLs as the current transition layer.
- `FORM_SCHEMA.md`, `CLAIM_WORKFLOW.md`, `AUTO_SAVE.md`, `FORM_PRESERVATION_MANDATE.md`, and `TEST_DATA_GENERATOR.md`: Updated form/workflow documentation to preserve current fields and payloads while pointing future backend/storage work to D1/R2/Clerk.
- `TECHNICAL_INVENTORY.md`, `js/technical_comparison.md`, `js/symbols_inventory.md`, and `css/form-franchise/CSS_USAGE_MAP.md`: Updated technical inventory notes for the D1/R2/Clerk migration and corrected stale modular form runtime references.
- `CODEBASE.md`, `AUDIT.md`, and `AGENTS.md`: Added/updated documentation-alignment rules and target-architecture references.
- `progress/summary-20260328.md`: Marked old Google Sheets/Cloudinary references as a historical March 2026 snapshot.
- `DEBUGGING.md`, `FRANCHISEE_MULTISTEP.md`, `FORM_VALIDATION_FIXES.md`, `FORM_UX_FIXES.md`, `franchise-info-form.md`, `daftar/technical_comparison.md`, `daftar/restoration_plan.md`, and `daftar/commits.md`: Added migration/historical notes so form/debug/restoration references stay aligned with the D1/R2/Clerk direction.

### Removed
- None.

## 2026-06-08 05:45 (Asia/Jakarta)
### Added
- `CODEBASE.md`: Created living map of relevant project-owned logic, data flows, file relationships, runtime modules, Cloudflare Functions, builders, generated assets, and migration-critical contracts.
- `AUDIT.md`: Created technology audit and migration tracker for moving from the current static/Google Sheets-backed architecture toward Cloudflare D1, R2, Clerk, and an Astro/Cloudflare application stack.
- `.context/session-20260608-0545.md`: Added session snapshot for future continuity.

### Changed
- `AGENTS.md`: Added a persistent rule requiring `CODEBASE.md` to stay current and added `CODEBASE.md`/`AUDIT.md` to the root markdown instruction index.

### Removed
- None.

## 2026-04-05 02:45 (Asia/Jakarta)
### Added
- **HAKI & NIB fields RESTORED** to Franchisor Step 1 (`daftar/index.html`):
  - `haki_status` (Radio, Required): Terdaftar, Masih Proses, Belum Daftar
  - `haki_number` (Text, Conditional): Shown when HAKI status is Registered/Process
  - `nib_number` (Text, Optional): 13 digit NIB with helper text
  - Conditional visibility: HAKI number field shows/hides based on radio selection
- **HAKI toggle logic** (`js/form-07-init.js`):
  - Added change event listeners to `haki_status` radios
  - Shows `#haki_number_wrapper` when value is "registered" or "process"
  - Hides and clears `haki_number` when value is "none"
- **Test data generator updated** (`js/form-09-test-data-generator.js`):
  - Now fills `haki_status`, `haki_number`, `nib_number` in Step 1
  - Triggers HAKI radio change event to show conditional field
- **FORM_PRESERVATION_MANDATE.md** (NEW, 142 lines):
  - Critical binding constraint document for all AI agents
  - Lists ALL historical form fields that MUST be preserved
  - Explicit rules: what's allowed vs forbidden when editing forms
  - Recovery references from historical file versions
  - Checklist for agents before editing forms

### Changed
- `daftar/index.html` (1275 lines, +22 lines):
  - Restored HAKI status radio group (3 options)
  - Restored HAKI number input with conditional wrapper
  - Restored NIB number input with helper text
- `js/form-07-init.js` (58 lines, +17 lines):
  - Added HAKI number visibility toggle on DOM ready
- `js/form-09-test-data-generator.js` (449 lines, +9 lines):
  - Added HAKI & NIB fields to `fillFranchisorForm()`
  - Triggers HAKI radio change to show conditional field
- `AGENTS.md` (121 lines, +2 lines):
  - Added FORM_PRESERVATION_MANDATE.md to persistent rules
  - Added to root markdown instruction index
- `TECHNICAL_INVENTORY.md` (138 lines, updated):
  - Enhanced form-03 navigation with debug logging documentation
  - Added form-09 test data generator inventory

### Removed
- None.

**⚠️ CRITICAL NOTE**: These fields existed in historical versions (`/pendaftaran/index.html` → `/daftar/index.html`) and were accidentally removed during recent refactoring. They have now been restored. Future agents MUST NOT remove form fields without explicit user request. See `FORM_PRESERVATION_MANDATE.md` for enforcement rules.

## 2026-04-05 02:30 (Asia/Jakarta)
### Added
- **Navigation debugging** (`js/form-03-navigation-steps.js`):
  - Added detailed console logging to `nextStep()` and `validateStep()`
  - Logs step index, state.currentStep, validation results, and invalid field names
  - Helps identify exactly which field is blocking step navigation
- **Step-only FAB filling** (`js/form-09-test-data-generator.js`):
  - `fillFranchisorForm()` now fills ONLY Step 1 data (not all 5 steps)
  - Prevents state confusion and validation conflicts
  - User must click LANJUT to navigate through each step manually

### Changed
- `js/form-03-navigation-steps.js` (128 lines, +24 lines):
  - Enhanced `nextStep()`: logs step index, current state, validation result, target step visibility
  - Enhanced `validateStep()`: logs invalid field names and values for debugging
  - Returns early with console warning if validation fails
- `js/form-09-test-data-generator.js` (438 lines, -28 lines):
  - Removed Steps 2-5 data from `fillFranchisorForm()` (outlet_type, min_capital, royalty_percent, etc.)
  - Now only fills: brand_name, company_name, category, year_established
  - Uses `formatCompanyName()` to ensure PT/CV is uppercase in generated data

### Removed
- None.

## 2026-04-05 02:15 (Asia/Jakarta)
### Added
- **Auto-uppercase PT/CV in company name** (`js/form-utils.js`):
  - Added `company_name` blur listener to auto-format `pt` → `PT`, `cv` → `CV`, `ud` → `UD`
  - Visual flash feedback when formatting applied
  - Regex pattern: `/\b(pt|cv|ud)\b/gi` catches lowercase anywhere in name
- **Submit-time normalization** (`js/form-06-submit-validation.js`):
  - Added company name uppercase normalization before sending to backend
  - Ensures data is properly formatted even if blur handler is bypassed

### Changed
- `js/form-09-test-data-generator.js` (466 lines, +5 lines):
  - Fixed `category` values: changed from `['fb', 'retail', 'service', 'edu', 'beauty']` to `['Makanan & Minuman', 'Retail & Minimarket', 'Jasa & Layanan', 'Otomotif', 'Kesehatan & Kecantikan']` (matching HTML `<select>` options)
  - Added `formatCompanyName()` helper to ensure generated data has uppercase PT/CV
  - Category now fills correctly, fixing validation blocking step navigation
- `daftar/index.html` (1254 lines, +1 line):
  - Added placeholder to `company_name` input: "Contoh: PT. Kopi Maju Jaya"
  - Guides users to use proper format with uppercase PT/CV

### Removed
- None.

## 2026-04-05 02:00 (Asia/Jakarta)
### Added
- **Section titles for Franchisee form** (`daftar/index.html`):
  - Step 1: "Langkah 1: Data Pribadi"
  - Step 2: "Langkah 2: Minat & Budget"
  - Uses exact same `.section-title` styling as Franchisor form (yellow border, bold, 1.2rem)

### Changed
- None.

### Removed
- None.

## 2026-04-05 01:45 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html` (1252 lines, no change):
  - Centered KEMBALI and DAFTAR SEKARANG buttons in Franchisee Step 2 (`justify-content-center`)
- `js/form-06-submit-validation.js` (223 lines, +2 lines):
  - Added `localStorage.removeItem('franchisee_form_step')` to submission success handler
  - After reload, Franchisee form now correctly resets to Step 1 instead of restoring Step 2

### Removed
- None.

## 2026-04-05 01:30 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-09-test-data-generator.js` (461 lines, +6 lines):
  - Removed random suffix from `generateCity()` - now returns only valid cities from `data-kota-id.json`
  - Added 40+ valid Indonesian cities matching the remote JSON dataset
  - Added console logging for city generation debugging
  - Generated cities now pass autocomplete validation (exact match required)

### Removed
- None.

## 2026-04-05 01:15 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-09-test-data-generator.js` (454 lines, -1 line):
  - Added inline styles to all FAB menu buttons (font-size: 12px, white-space: nowrap, display: block, width: 100%)
  - Changed "Create UNCLAIMED" to "Create Unclaimed" (title case)
  - Buttons now render in single line with smaller, consistent font
- `daftar/index.html` (1251 lines, -8 lines):
  - Replaced broken cache busting mechanism with `document.write()` approach
  - Old approach tried to modify `src` attributes after scripts loaded (too late, browser already cached)
  - New approach uses `document.write()` to inject scripts with `?_dbg=timestamp` parameter
  - Works for both dev mode (`?dev=1`) and production mode
  - Eliminates duplicate script loading issue

### Removed
- None.

## 2026-04-05 00:30 (Asia/Jakarta) - Session End
### Added
- **Session context**: `/.context/session-20260404-1900.md` - Complete session summary

### Changed
- None.

### Removed
- None.

**Session Summary** (2026-04-04 19:00 to 2026-04-05 00:30):
- Implemented aggressive auto-save for Franchisor form (6 triggers)
- Converted Franchisee form to 2-step multi-step layout
- Added form validation improvements (email, WhatsApp, name auto-formatting, city autocomplete)
- Fixed step navigation validation bugs
- Built complete dev mode test data generator with FAB UI
- Added backend test data marking (`is_test_data` column)
- Resolved cache busting and visibility issues
- All changes comprehensively documented in 5 new .md files

**Session Documentation**:
- See `/.context/session-20260404-1900.md` for complete session details
- See `TEST_DATA_GENERATOR.md`, `AUTO_SAVE.md`, `FRANCHISEE_MULTISTEP.md`, `FORM_VALIDATION_FIXES.md`, `FORM_UX_FIXES.md` for implementation details

## 2026-04-04 23:50 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`:
  - Removed `?v=2` cache bust from form-09 script tag
- `js/form-09-test-data-generator.js`:
  - Matched FAB button styling to debug toggle
  - Adjusted position and hover effects
- `CHANGELOG.md`: Formatting fixes

### Removed
- None.

## 2026-04-04 23:45 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-09-test-data-generator.js`:
  - Converted ALL FAB styles from CSS classes to **inline styles** (no CSS dependency)
  - Container: `position:fixed; bottom:80px; left:20px; z-index:100000`
  - Button: Purple circle with white border, fully styled inline
  - Menu: White dropdown with shadow, fully styled inline
  - Bypasses dev mode CSS cache busting issues entirely
- `CHANGELOG.md`: Logged inline styling fix

### Removed
- None.

## 2026-04-05 00:00 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-09-test-data-generator.js`:
  - Changed FAB placement from `document.body.appendChild()` to `insertBefore(debugToggle.nextSibling)`
  - FAB now inserted right after debug-mode-toggle in DOM for better visibility
  - Restored all event bindings that were accidentally removed
  - Removed inline z-index override (relying on CSS positioning instead)
- `CHANGELOG.md`: Logged placement fix

### Removed
- None.

## 2026-04-04 23:50 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-09-test-data-generator.js`:
  - Added `z-index: 100000 !important;` to FAB container to prevent any overlap
  - Added detailed console logs for debugging script initialization
- `CHANGELOG.md`: Logged z-index fix

### Removed
- None.

## 2026-04-04 23:45 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-09-test-data-generator.js`:
  - Changed FAB visibility from CSS class to inline `display:block !important;` style
  - Added console log to confirm FAB creation: "[TestData] FAB created successfully!"
  - No longer relies on `.active` class (which was not triggering on refresh)
- `css/form-franchise/06-claim-autocomplete.css`:
  - Removed `display: none` from `#dev-test-generator-fab`
  - Removed `.active` class override (now controlled by JS inline style)

### Removed
- None.

## 2026-04-04 23:30 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-09-test-data-generator.js`:
  - Fixed FAB visibility: added `className = 'active'` to override CSS `display: none`
  - Changed FAB emoji from 🧪 to ⚡ (avoid conflict with debug toggle)
- `CHANGELOG.md`: Logged fix

### Removed
- None.

## 2026-04-04 23:15 (Asia/Jakarta)
### Added
- None.

### Changed
- `css/form-franchise/06-claim-autocomplete.css`:
  - Moved FAB from right:12px to **left:20px** to avoid WhatsApp button overlap
  - Increased FAB size to 40px with white border for visibility
  - Position: `bottom:80px, left:20px` (clear of all floating buttons)
- `js/form-09-test-data-generator.js`:
  - Moved toast to `left:20px, bottom:130px` (above FAB on left side)

### Removed
- None.

## 2026-04-04 23:00 (Asia/Jakarta)
### Added
- None.

### Changed
- `css/form-franchise/06-claim-autocomplete.css`:
  - Moved FAB from left:20px/bottom:20px to right:12px/bottom:50px (above debug toggle)
  - Reduced FAB size from 56px to 36px for better stacking
  - Menu now opens upward from right-aligned position
- `js/form-09-test-data-generator.js`:
  - Moved toast notification to right:12px/bottom:100px (above FAB)

### Removed
- None.

## 2026-04-04 22:45 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html` (1260 lines, +2 lines):
  - Fixed Franchisee email helper text positioning: moved inside `.input-col` div to appear directly below input field

### Removed
- None.

## 2026-04-04 22:30 (Asia/Jakarta)
### Added
- **Test Data Generator** (Phase 1-4 complete):
  - `js/form-09-test-data-generator.js` (367 lines) - Complete test data generator with FAB UI
  - Realistic Indonesian name generation (Budi Pratama 42, Siti Wijaya 817, etc.)
  - Franchisee form filler (2-step auto-fill with navigation)
  - Franchisor form filler (5-step auto-fill across all sections)
  - Claim workflow filler (creates UNCLAIMED + auto-searches brand)
  - Clear all test data button with confirmation
  - Toast notifications for user feedback
- **Backend test data support** (`functions/form-submit.js`):
  - Added `is_test_data` column to all form submissions
  - New endpoint: `test_action=create_unclaimed` - creates UNCLAIMED test data
  - New endpoint: `test_action=clear_test_data` - deletes all rows with `is_test_data=TRUE`
  - Helper functions: `handleCreateUnclaimed`, `handleClearTestData`, `clearTestDataFromSheet`, `deleteSheetRow`
- **FAB CSS** (`css/form-franchise/06-claim-autocomplete.css`):
  - Purple floating action button (bottom-left)
  - Animated dropdown menu
  - Only visible when `?dev=1` in URL
- **Script loading** (`daftar/index.html`):
  - Added `form-09-test-data-generator.js` with cache busting support
- **Documentation**: `TEST_DATA_GENERATOR.md` comprehensive implementation plan

### Changed
- `functions/form-submit.js` (467 lines, +156 lines):
  - Updated version to v2.3
  - Added `is_test_data` field to `finalData` object
  - Added test action routing at function start
- `css/form-franchise/06-claim-autocomplete.css` (89 lines, +76 lines):
  - Added FAB styles, menu animations, hover effects
- `daftar/index.html` (1258 lines, +2 lines):
  - Added form-09 script loading with dev mode cache busting

### Removed
- None.

## 2026-04-04 21:30 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-08-franchisee-steps.js`:
  - Fixed `franchiseeNextStep()`: now validates current step (stepIndex - 1) before navigating to target step
  - Fixed `franchiseePrevStep()`: correctly calculates target step (stepIndex - 1)
  - Resolves "Validation failed for step 2" error when clicking LANJUT on step 1

### Removed
- None.

## 2026-04-04 21:15 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-05-country-whatsapp.js`:
  - Added `{ willReadFrequently: true }` to `canvas.getContext('2d')` call in `detectFlagEmojiSupport()`
  - Eliminates Canvas2D performance warning about multiple `getImageData()` operations

### Removed
- None.

## 2026-04-04 21:00 (Asia/Jakarta)
### Added
- **Enhanced franchisee step validation**:
  - Uses `validateSpecificField()` for detailed error messages
  - Auto-focus and scroll to first invalid field
  - Console logging for debugging navigation issues
- **Visual feedback for auto-formatting**:
  - Flash highlight when name/WhatsApp auto-formatted
  - Console logs showing before/after values
- **Context-specific email error messages**:
  - Missing @ symbol: "Email harus mengandung tanda @..."
  - Missing TLD: "Email harus mengandung domain yang valid..."
  - Contains space: "Email tidak boleh mengandung spasi..."
  - Generic invalid: "Format email salah. Contoh yang benar:..."
- **Email helper text in HTML**:
  - Placeholder: `nama@domain.com`
  - Helper: "Format: nama@domain.com (tanpa spasi)"
- **Documentation**: `FORM_UX_FIXES.md` comprehensive guide

### Changed
- `js/form-08-franchisee-steps.js` (174 lines, +29 lines):
  - Enhanced `validateFranchiseeStep()` to use `validateSpecificField()`
  - Added focus/scroll to first invalid field on validation failure
  - Added console logging for step navigation debugging
  - Improved fallback validation logic
- `js/form-utils.js` (270 lines, +27 lines):
  - Enhanced `bindAutoFormatting()` with flash highlights
  - Added console logging for name/WhatsApp auto-formatting
  - Enhanced email validation with 4 specific error messages
- `daftar/index.html` (1255 lines, +2 lines):
  - Added email placeholder and helper text
- `TECHNICAL_INVENTORY.md`: Updated form-08 and form-utils entries

### Removed
- None.

## 2026-04-04 20:30 (Asia/Jakarta)
### Added
- **Name auto title-case formatting** (`window.autoTitleCase`):
  - Smart capitalization with particle exceptions (bin, binti, van, der, etc.)
  - Detects and preserves existing titles (Dr, Ir, Hj, Prof)
  - Applied to: name, brand_name, pic_name, company_name fields
- **WhatsApp auto-formatting** (`window.formatWhatsAppNumber`):
  - Converts any format to XXX-XXXX-XXXX pattern
  - Removes leading zeros, strips non-digits
  - Validates 9-13 digit requirement
  - Auto-formats on blur and during validation
- **Strict email validation**:
  - Enhanced regex: `/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/`
  - Rejects invalid formats (missing TLD, spaces, incomplete domains)
  - Helpful error message with example format
- **Auto-formatting binder** (`window.bindAutoFormatting`):
  - Binds blur listeners to name and WhatsApp fields
  - Called once on DOMContentLoaded via form-07-init.js
- **Documentation**: `FORM_VALIDATION_FIXES.md` comprehensive guide

### Changed
- `js/form-utils.js` (243 lines, +78 lines):
  - Added `autoTitleCase(name)` function
  - Added `formatWhatsAppNumber(phone)` function
  - Added `bindAutoFormatting()` function
  - Enhanced email validation regex in `validateSpecificField()`
  - Enhanced WhatsApp validation with auto-format on validation failure
- `js/form-04-calculation-city.js` (146 lines, +5 lines):
  - Added parent positioning check in `initCityAutocomplete()`
  - Sets `position: relative` on parent if static (fixes dropdown alignment)
- `js/form-07-init.js` (41 lines, +1 line):
  - Added `bindAutoFormatting()` call on DOM ready
- `css/form-franchise/04-alerts-status.css` (123 lines, +6 lines):
  - Added `margin-top: 2px` to `.city-suggestions` for visual spacing
  - Added `.input-col:has(.city-autocomplete) { position: relative; }` fallback
- `TECHNICAL_INVENTORY.md`: Updated form-utils.js function inventory
- `KNOWLEDGE.md`: Added auto-formatting behavior to gotchas section

### Removed
- None.

## 2026-04-04 20:00 (Asia/Jakarta)
### Added
- None.

### Changed
- `css/form-franchise/02-layout-tabs-steps.css`:
  - Added `#tab-franchisee .step-item` override: width 50% (was inheriting 20% from 5-step franchisor)
  - Adjusted connector line positioning for 2-step layout (`::after` and `::before` pseudo-elements)
- `daftar/index.html`:
  - Centered "LANJUT" button in Step 1 using `text-center` class (was `justify-content-between` with empty div)

### Removed
- None.

## 2026-04-04 19:45 (Asia/Jakarta)
### Added
- **Multi-Step Layout for Franchisee Form** (2 steps):
  - Step 1: Data Pribadi (name, city, WhatsApp, email)
  - Step 2: Minat & Budget (interest category, budget range, location plan, message)
  - Step indicator with 2-step progress visualization
  - Progress bar (`#franchisee_progress_bar`) for visual feedback
- **New Module: `js/form-08-franchisee-steps.js`**:
  - `franchiseeNextStep(stepIndex)`: Navigate forward with validation
  - `franchiseePrevStep(stepIndex)`: Navigate backward
  - `validateFranchiseeStep(stepIndex)`: Per-step required field validation
  - `updateFranchiseeProgressBar()`: Update step indicators and progress bar
  - `restoreFranchiseeStep()`: Restore saved step from localStorage on page load
- **Script Loading**: Added `form-08-franchisee-steps.js` to `/daftar/index.html` with cache busting support

### Changed
- `daftar/index.html`:
  - Converted Franchisee form from single-page to 2-step layout
  - Added step indicator wrapper (`step-indicator-wrapper`)
  - Wrapped form fields in `franchisee-step-1` and `franchisee-step-2` divs
  - Added navigation buttons (LANJUT/KEMBALI) matching Franchisor form UX
  - Added optional "Pesan Tambahan" (message) textarea in Step 2
- `TECHNICAL_INVENTORY.md`: Added `form-08-franchisee-steps.js` function inventory
- `FORM_SCHEMA.md`: Updated Franchisee form table with step column and multi-step documentation
- `QWEN.md`: Added Franchisee form 2-step structure description

### Removed
- None.

## 2026-04-04 19:15 (Asia/Jakarta)
### Added
- **Aggressive Auto-Save** for Franchisor form with 6 independent triggers to prevent data loss:
  1. Debounced save on input/change events (300ms delay)
  2. Periodic safety-net save every 5 seconds
  3. Save before step navigation (next/previous buttons)
  4. Save on browser visibility change (tab switch/minimize)
  5. Save before page unload (refresh/close)
  6. Save on registration tab switch
- Visual auto-save indicator (`#autosave-indicator`) with toast notification UX
- Error handling and console warnings for auto-save failures
- Auto-save lifecycle management: starts on init, stops on submit, restores on load

### Changed
- `js/form-01-state-helpers.js`:
  - Enhanced `FF.saveFranchisorDraft()` with try/catch error handling
  - Added visual feedback indicator trigger on successful save
- `js/form-06-submit-validation.js`:
  - Added `FF.autoSaveConfig` configuration object (enabled, debounceMs, periodicIntervalMs, timers)
  - Added `FF.debounceAutoSave(form)` for debounced save after user input
  - Added `FF.startPeriodicAutoSave(form)` for periodic 5-second safety save
  - Added `FF.stopPeriodicAutoSave()` for cleanup on form submit
  - Enhanced `FF.initFormSubmission()` with all 6 auto-save triggers
  - Wrapped `window.nextStep`, `window.prevStep`, and `window.openTab` to inject save calls
  - Added visibility change and beforeunload event listeners
- `daftar/index.html`:
  - Added `#autosave-indicator` HTML element after franchisor form
- `css/form-franchise/01-utilities.css`:
  - Added styles for `#autosave-indicator` (fixed position, animated toast)
- Documentation updates:
  - `TECHNICAL_INVENTORY.md`: Updated form-01 and form-06 entries with auto-save functions
  - `CLAIM_WORKFLOW.md`: Added comprehensive auto-save triggers and lifecycle documentation
  - `KNOWLEDGE.md`: Added aggressive auto-save feature description
  - `QWEN.md`: Added auto-save protection note in Multi-Step Registration Form section
  - `FORM_SCHEMA.md`: Added auto-save behavior notes for Franchisor and Klaim tabs

### Removed
- None.

## 2026-04-04 18:03 (Asia/Jakarta)
### Added
- `Handoff Checklist` sections in:
  - `GEMINI.md`
  - `QWEN.md`
  with `/.context/session-*.md` explicitly set as step 1.

### Changed
- None.

### Removed
- None.

## 2026-04-04 18:00 (Asia/Jakarta)
### Added
- None.

### Changed
- `GEMINI.md`:
  - added explicit multi-provider/model collaboration protocol for cross-AI handoffs.
  - updated governance references from monolithic `js/form-franchise.js` to modular form runtime (`js/form-01-*.js` ... `js/form-07-*.js`).
  - added rule that `js/form-franchise.js` is legacy shim only.
- `QWEN.md`:
  - updated `/js` directory map to include modular `form-01` ... `form-07` files and legacy-shim status of `form-franchise.js`.
  - added multi-provider continuity section aligned with project docs/context/changelog protocol.
  - updated gotchas and quick-reference sections to modular form runtime ownership.

### Removed
- None.

## 2026-04-04 17:55 (Asia/Jakarta)
### Added
- `/.context/session-20260404-1755.md`: new timestamped session summary covering modular form-runtime migration (`form-01` ... `form-07`), script-load rewiring, and current conventions for future sessions.

### Changed
- None.

### Removed
- None.

## 2026-04-04 17:52 (Asia/Jakarta)
### Added
- New modular form runtime files in flat `/js` namespace (no subfolder):
  - `js/form-01-state-helpers.js`
  - `js/form-02-claim-workflow.js`
  - `js/form-03-navigation-steps.js`
  - `js/form-04-calculation-city.js`
  - `js/form-05-country-whatsapp.js`
  - `js/form-06-submit-validation.js`
  - `js/form-07-init.js`

### Changed
- `daftar/index.html`:
  - replaced monolithic `form-franchise.js` include with ordered modular script includes (`form-01` ... `form-07`).
  - updated `?dev=1` JS cache-buster to bust all modular script IDs.
- `js/form-franchise.js`: replaced with a non-executing legacy shim/marker to prevent monolithic logic reintroduction.
- `AGENTS.md`: updated persistent rules and checked-script list to reflect modular `form-0x` runtime ownership.
- `KNOWLEDGE.md`: updated architecture/conventions/gotchas from monolithic `form-franchise.js` to modular `form-0x` runtime.
- `TECHNICAL_INVENTORY.md`: replaced monolithic form section with per-module inventory (`form-01` ... `form-07`) and legacy shim note.
- `js/symbols_inventory.md`: rewritten to document current modular form runtime ownership and guardrails.
- `js/technical_comparison.md`: updated analysis/recommendations to reference modular runtime instead of monolithic `form-franchise.js`.

### Removed
- None.

## 2026-04-04 17:35 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-franchise.js`: added tiny runtime flag-emoji fallback for `country_code` dropdown labels:
  - `detectFlagEmojiSupport()` checks whether flag emoji render distinctly.
  - `stripLeadingFlagEmoji()` enables text-only label fallback.
  - `applyCountryCodeOptions()` now auto-renders labels as emoji+text or text-only based on runtime support.
- `TECHNICAL_INVENTORY.md`: documented the new country-code emoji fallback helpers.
- `KNOWLEDGE.md`: documented that flag fallback is now handled automatically at runtime in `js/form-franchise.js`.

### Removed
- None.

## 2026-04-04 17:32 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: `location_plan` now starts from an explicit empty placeholder option (`Pilih Rencana Lokasi...`) so the answer is not auto-selected.
- `css/form-franchise/03-form-core.css`: refined focus-guidance styling so row-level focus highlighting and valid/invalid icon states work together (muted non-active rows, highlighted active row) without removing green/red validation feedback.
- `css/form-franchise/03-form-core.css`: updated `.country-select` font stack to include common emoji fonts for better flag-emoji rendering across browsers/OS.
- `json/country-codes.json`: switched dropdown labels to flag-emoji + country-initial format (e.g., `🇮🇩 ID +62`).
- `js/form-franchise.js`: updated default country-code fallback labels to the same flag-emoji + country-initial format for consistency when JSON config is unavailable.
- `FORM_SCHEMA.md`: updated `location_plan` field note to document empty placeholder default behavior.
- `KNOWLEDGE.md`: added gotcha note about cross-browser emoji rendering variance and text fallback in country-code labels.

### Removed
- None.

## 2026-04-04 12:15 (Asia/Jakarta)
### Added
- `/.context/session-20260404-1215.md`: timestamped summary of this session (country-code/WhatsApp restoration, validation/UI recovery, `/json` + `/csv` consolidation, and lineage context) for cross-session continuity.

### Changed
- `AGENTS.md`: added persistent convention for timestamped session context snapshots in `/.context/session-YYYYMMDD-HHmm.md` and added `/.context/*.md` to the root markdown instruction index.
- `KNOWLEDGE.md`: added session-continuity gotcha/working note to maintain and consult timestamped summaries in `/.context`.

### Removed
- None.

## 2026-04-04 12:08 (Asia/Jakarta)
### Added
- `json/country-codes.json`: centralized country-code option source for form WhatsApp inputs.
- New data-asset directories:
  - `json/` for centralized JSON assets.
  - `csv/` for centralized CSV assets.

### Changed
- `js/form-franchise.js`:
  - switched claim-search static source to `/json/unclaimed-brands.json`.
  - added country-code configuration loader from `/json/country-codes.json` with safe defaults.
  - updated city autocomplete loader to try local `/json/data-kota-id.json` first, then existing remote fallback.
- `js/build-listing.js`: migrated CSV fallback paths to `/csv/*.csv` and changed generated claim-search dataset output from `data/unclaimed-brands.json` to `json/unclaimed-brands.json`.
- `js/build-sitemap.js`: migrated CSV fallback paths to `/csv/franchisors.csv` and `/csv/unclaimed.csv`.
- `AGENTS.md`: added project-level convention to centralize JSON assets in `/json` and CSV assets in `/csv`.
- `KNOWLEDGE.md`: updated architecture/data-flow docs to reflect `/json` and `/csv` conventions and `/json/unclaimed-brands.json` runtime source.
- `PRD.md`: updated static autocomplete dataset path to `/json/unclaimed-brands.json`.
- `TECHNICAL_INVENTORY.md`: bumped `js/form-franchise.js` inventory version to `v1.29` and documented new JSON-driven country-code helpers plus updated claim-search JSON path.
- `QWEN.md`: updated directory structure and claim-search flow path references for `/json` and `/csv`.
- `js/symbols_inventory.md`: documented new JSON loaders (`loadCountryCodeOptions`, `loadCitiesData`) in form logic inventory.
- `js/technical_comparison.md`: updated claim-search dataset reference path to `/json/unclaimed-brands.json`.

### Removed
- `data/unclaimed-brands.json` (moved to `json/unclaimed-brands.json`).
- Empty legacy `data/` directory (replaced by centralized `json/` directory usage).
- Root-level CSV files moved into `/csv`:
  - `franchisors.csv`
  - `unclaimed.csv`
  - `franchisee.csv`
  - `franchises_data.csv`

## 2026-04-04 11:53 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: restored legacy WhatsApp country-code UI (`country_code` dropdown + `.phone-input-group` and helper text) in both Franchisee and Franchisor Step 5 contact sections, aligned with historical `/pendaftaran/index.html` behavior.
- `daftar/index.html`: added an inline lineage note to preserve future restoration context (`/pendaftaran/index.html` -> `/daftar/index.html`).
- `js/form-franchise.js`: restored live validation hooks (`blur`/`input`/`change`) so filled/validated fields reliably show green valid-state feedback again.
- `css/form-franchise/03-form-core.css`: fixed valid-state visual spacing by restoring right-side space for checkmark icon (`padding-right: 40px`).
- `FORM_SCHEMA.md`: synced schema to include `country_code` for Franchisee WhatsApp and Franchisor Step 5 contact fields.
- `TECHNICAL_INVENTORY.md`: bumped `js/form-franchise.js` to `v1.28` and documented `bindLiveValidation(form)`.
- `KNOWLEDGE.md`: added explicit historical-rename gotcha (`/pendaftaran/index.html` lineage) for future restorations.

### Removed
- None.

## 2026-04-04 11:45 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-franchise.js`: restored pre-submit WhatsApp normalization to international format before sending to `/form-submit` / Google Sheets (`+62` default fallback, supports optional `country_code`, and handles pasted `+`/`00` prefixes).
- `TECHNICAL_INVENTORY.md`: bumped `js/form-franchise.js` inventory version to `v1.27` and documented new WhatsApp/country-code normalization helpers.

### Removed
- None.

## 2026-04-04 09:53 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: improved debug-mode CSS cache-busting behavior (`?dev=1`) to bypass stale modular `@import` cache by directly loading all `/css/form-franchise/*.css` module files with `_dbg=<timestamp>`.
- `css/form-franchise/02-layout-tabs-steps.css`: replaced fragile text-symbol step arrows with robust connector line + arrowhead pseudo-elements for inter-step progression visibility.
- `css/form-franchise/02-layout-tabs-steps.css`: updated arrow progression colors to follow step status:
  - pending = gray,
  - active = brand yellow,
  - completed = green (matching completed step circles).
- `DEBUGGING.md`: updated debug-mode notes to explain direct modular CSS cache-busting behavior in `dev=1`.

### Removed
- None.

## 2026-04-04 09:26 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: changed debug emoji toggle (`🧪`) to hidden-by-default and added secret shortcut `Ctrl+Alt+D` to show/hide it per browser profile.
- `daftar/index.html`: debug-toggle visibility is now persisted in localStorage key `debug_toggle_enabled`, and shortcut action displays a short SweetAlert status message.
- `DEBUGGING.md`: documented shortcut-first debug access flow and localStorage-based visibility behavior.
- `KNOWLEDGE.md`: updated cache-debugging note to include `Ctrl+Alt+D` shortcut for revealing debug toggle.

### Removed
- None.

## 2026-04-04 09:20 (Asia/Jakarta)
### Added
- `DEBUGGING.md`: quick debugging reference documenting personal debug mode (`?dev=1`) and DevTools `Network > Disable cache` workflow.

### Changed
- `daftar/index.html`: added debug-only cache-busting for form assets when `?dev=1` is present:
  - CSS: `#form-daftar-franchise` gets `_dbg=<timestamp>`
  - JS: `/js/form-utils.js` and `/js/form-franchise.js` get `_dbg=<timestamp>`
- `daftar/index.html`: added footer debug emoji toggle (`🧪`) to enable/disable debug mode without manually editing URL query params.
- `AGENTS.md`: added `DEBUGGING.md` to root markdown instruction index.
- `KNOWLEDGE.md`: added reminder note for personal cache-debugging via `?dev=1` or DevTools disable-cache.

### Removed
- None.

## 2026-04-04 08:40 (Asia/Jakarta)
### Added
- None.

### Changed
- `css/form-franchise/02-layout-tabs-steps.css`: added visual progression arrows between `.step-item` nodes using pseudo-elements, including active/completed color states and small-screen sizing adjustment.

### Removed
- None.

## 2026-04-04 08:00 (Asia/Jakarta)
### Added
- None.

### Changed
- `css/form-franchise/03-form-core.css`: added focus-attention styling for form fields in `/daftar/index.html`:
  - default non-focused fields now appear subdued (soft gray background + lower opacity),
  - focused fields become fully highlighted,
  - filled/validated/read-only/disabled states remain fully visible to avoid ambiguity during step-by-step completion.
- `css/form-franchise/03-form-core.css`: added dedicated read-only emphasis style so locked claim-brand fields remain clearly visible in claim mode.

### Removed
- None.

## 2026-04-04 06:41 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: aligned step action buttons to center for improved visual balance:
  - Step 1 `LANJUT` wrapper changed from `text-end` to `text-center`.
  - Step 2–5 action rows changed from `justify-content-between` to `justify-content-center` with `gap-2`, so navigation buttons render centered as a group.

### Removed
- None.

## 2026-04-04 06:27 (Asia/Jakarta)
### Added
- `CLAIM_WORKFLOW.md`: dedicated reference documenting end-to-end claim flow, step-button behavior (`Lanjut/Kembali` is frontend-only), persistence behavior, backend append/cleanup semantics, and recommended UX scenarios for mixed draft + claim actions.

### Changed
- `functions/form-submit.js`: improved post-claim cleanup path so `UNCLAIMED` deletion now matches by `id` (primary) and falls back to normalized `brand_name` when `id` is empty/unreliable.
- `js/form-franchise.js` (v1.26): added Franchisor draft persistence (`franchisor_form_draft`, 72-hour TTL) so partially filled fields survive refresh/session continuation.
- `js/form-franchise.js` (v1.26): kept claim-mode persistence (`franchise_claim_state`) and ensured claim linkage is not separately persisted inside generic draft (`unclaimed_id` excluded from draft payload).
- `js/form-franchise.js` (v1.26): integrated draft restore on load + live draft updates on input/change, and draft cleanup on successful submit.
- Documentation sync:
  - `FORM_SCHEMA.md`: documented step-navigation non-submit behavior and Franchisor draft persistence.
  - `TECHNICAL_INVENTORY.md`: added new draft helper functions and updated `deleteFromUnclaimed(id, brandName)` behavior.
  - `KNOWLEDGE.md`: documented 72-hour Franchisor draft continuity and backend cleanup fallback behavior.
  - `AGENTS.md`: indexed `CLAIM_WORKFLOW.md` as claim-flow reference.

### Removed
- None.

## 2026-04-04 06:09 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-franchise.js`: added TTL for persisted claim-mode session (`franchise_claim_state`) with 24-hour expiry to prevent stale claim context from reappearing after long inactivity.
- `js/form-franchise.js`: stored `expires_at` metadata and added backward-compatible TTL checks for older records that only have `saved_at`.
- `FORM_SCHEMA.md`, `TECHNICAL_INVENTORY.md`, `KNOWLEDGE.md`: documented claim-session TTL behavior and rationale for future maintenance continuity.

### Removed
- None.

## 2026-04-04 06:07 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-franchise.js`: implemented claim-mode session persistence via `localStorage` key `franchise_claim_state` so refresh restores active claim context (selected brand, hidden `unclaimed_id`, read-only brand field, and claim alert) instead of reverting to normal mode.
- `js/form-franchise.js`: added claim state helpers (`saveClaimModeState`, `getClaimModeState`, `clearClaimModeState`), integrated them into claim select/exit/success-submit flow, and prioritized persisted claim-state restore during page initialization.
- `FORM_SCHEMA.md`: documented claim-mode session persistence behavior and storage key.
- `TECHNICAL_INVENTORY.md`: synced new claim-state helper functions and updated `fillMainFranchisorForm` behavior notes.
- `KNOWLEDGE.md`: added claim continuity note for refresh restore behavior.

### Removed
- None.

## 2026-04-04 05:57 (Asia/Jakarta)
### Added
- `css/form-franchise/CSS_USAGE_MAP.md`: documentation map for form CSS selectors, module responsibilities, and file usage references (`/daftar/index.html`, `/js/form-franchise.js`, `/js/form-utils.js`).
- New modular stylesheet files:
  - `css/form-franchise/01-utilities.css`
  - `css/form-franchise/02-layout-tabs-steps.css`
  - `css/form-franchise/03-form-core.css`
  - `css/form-franchise/04-alerts-status.css`
  - `css/form-franchise/05-packages-responsive.css`
  - `css/form-franchise/06-claim-autocomplete.css`

### Changed
- `css/form-franchise.css`: converted into an aggregator entrypoint using ordered `@import` directives to load the new modular CSS files while preserving visual cascade order.
- `AGENTS.md`: updated markdown index to include `css/form-franchise/CSS_USAGE_MAP.md` for future maintenance context.
- `KNOWLEDGE.md`: documented modular form CSS architecture and aggregator-order convention.
- `QWEN.md`: updated directory structure to include `css/form-franchise/`.

### Removed
- None.

## 2026-04-04 05:49 (Asia/Jakarta)
### Added
- None.

### Changed
- `css/form-franchise.css`: restored visual clarity for claim-active alert by adding missing utility classes used in `/daftar/index.html` (`.ms-auto`, `.me-2`, `.me-3`, `.small`, `.fs-4`) and by adding explicit `.alert-warning` styling.
- `css/form-franchise.css`: added scoped `#claim-mode-alert` styling for the certificate icon and close button (`.btn-close`) so `fa-certificate` and `exitClaimMode()` control render consistently even without full Bootstrap utility/CSS coverage.

### Removed
- None.

## 2026-04-04 05:35 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/build-listing.js`: tightened claim-brand row filter to exclude additional edge-case noise (`PT/CV/...` legal-entity labels, contact-label rows, and broader address-like rows), while preserving deduplicated canonical brand results.
- `functions/get-franchises.js`: aligned `purpose=claim-search` sanitization with the stricter edge-case filtering used by static builder/frontend.
- `js/form-franchise.js`: strengthened frontend claim suggestion guardrails with matching filters for legal-entity/contact-label/address-like rows and non-alphabetic labels.
- `data/unclaimed-brands.json`: regenerated from `unclaimed.csv` after edge-case hardening so local claim suggestions stay brand-name only.
- Documentation sweep for future iterations (reviewed all repository `.md` files; updated relevant references and guardrails in `AGENTS.md`, `GEMINI.md`, `KNOWLEDGE.md`, `FORM_SCHEMA.md`, `TECHNICAL_INVENTORY.md`, `PRD.md`, `QWEN.md`, `js/symbols_inventory.md`, and `js/technical_comparison.md`).

### Removed
- None.

## 2026-04-04 05:04 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/build-listing.js`: replaced naive CSV fallback parsing with a quote-aware parser (`parseCSVRows`) so local fallback no longer corrupts column mapping when fields contain commas/newlines.
- `data/unclaimed-brands.json`: regenerated from `unclaimed.csv` using claim-search sanitization (removes URL/phone/address/category-noise rows and deduplicates by `brand_name`) so Klaim autocomplete suggestions resolve to actual brand names.
- `TECHNICAL_INVENTORY.md`: synced `js/build-listing.js` inventory entries to document the new robust CSV parser and corrected `js/form-franchise.js` version label.

### Removed
- None.

## 2026-04-04 05:00 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/build-listing.js`: fixed UNCLAIMED-to-`data/unclaimed-brands.json` extraction by filtering non-canonical rows (URL/phone/noise rows), normalizing text values, and deduplicating by brand name before writing autocomplete data.
- `functions/get-franchises.js`: added `purpose=claim-search` mode for `tab=UNCLAIMED` to return sanitized claim-search rows directly from Google Sheets fallback API.
- `js/form-franchise.js`: updated live fallback fetch URL to `/get-franchises?tab=UNCLAIMED&purpose=claim-search` so claim autocomplete receives cleaned source rows.
- `TECHNICAL_INVENTORY.md`: synced inventory entries to document new claim-search sanitization flow in `js/form-franchise.js`, `js/build-listing.js`, and `functions/get-franchises.js`.

### Removed
- None.

## 2026-04-04 04:39 (Asia/Jakarta)
### Added
- None.

### Changed
- `js/form-franchise.js`: improved Klaim autocomplete to show clean brand names only (filtering out URL-like and phone-like rows from `data/unclaimed-brands.json`) so search suggestions no longer display brand URL strings.
- `js/form-franchise.js`: made claim suggestion selection use stable source index (`data-idx`) instead of `id` lookup (many source rows have empty/non-unique `id`), ensuring selected suggestion maps to the correct brand row.

### Removed
- None.

## 2026-04-04 04:30 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: fixed tab hierarchy by inserting a missing closing `</div>` for `#tab-franchisor` before `#tab-klaim`, so Klaim tab is no longer nested under Franchisor and can render independently.

### Removed
- None.

## 2026-04-04 03:56 (Asia/Jakarta)
### Added
- `daftar/index.html`: restored Klaim tab informational content block ("Cara Klaim Brand") and fallback CTA link to Franchisor tab to recover missing guidance content without reintroducing deprecated duplicate claim form logic.

### Changed
- `daftar/index.html`: restored older Klaim tab copy from historical claim-flow lineage:
  - heading back to "Klaim Brand Anda & Lengkapi Profilnya"
  - search card title back to "Cari Brand Anda"
  - helper text restored to direct users to Franchisor tab when brand is not found.

### Removed
- None.

## 2026-04-04 03:36 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: aligned tab and step hierarchy with historical `/pendaftaran/index.html` by changing `.registration-tabs-wrapper` from `container mt-5` to `mb-5` (removes unwanted left-right gutter) and restoring the original step indicator structure (`.step-indicator > .step-item > .step-circle/.step-text`).
- `daftar/index.html`: restored progress bar style/placement to historical structure under `.step-indicator-wrapper` (`.progress.mt-2`, `bg-warning`, `height: 4px`).
- `css/form-franchise.css`: removed duplicate late-file overrides for `.registration-tabs` and `.tab-btn` that were conflicting with the primary tab style block and causing visual drift.

### Removed
- None.

## 2026-04-04 02:42 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: restored historical tab layout by closing `.registration-tabs-wrapper` immediately after `.registration-tabs` and removing the late extra wrapper close, so tab buttons no longer render side-by-side with tab content.

### Removed
- None.

## 2026-04-04 02:31 (Asia/Jakarta)
### Added
- None.

### Changed
- `daftar/index.html`: restored missing form input styling by re-adding the historical stylesheet include `<link rel="stylesheet" id="form-daftar-franchise" href="/css/form-franchise.css">`, matched from `/pendaftaran/index.html` lineage (1300+ lines).

### Removed
- None.

## 2026-03-09 22:05 (Asia/Jakarta)
### Added
- `KNOWLEDGE.md` as the single consolidated project knowledge document (merged from `.knowledge.md` and `knowledge.md` template structure).

### Changed
- `CHANGELOG.md` normalized into a consistent format across all entries.
- `AGENTS.md` updated to reference `KNOWLEDGE.md` instead of `.knowledge.md` and `knowledge.md`.

### Removed
- `.knowledge.md` (merged into `KNOWLEDGE.md`).
- `knowledge.md` (merged into `KNOWLEDGE.md`).

## 2026-04-04 00:45 (Asia/Jakarta)
### Added
- Temporary comparison files in `/progress` during `/pendaftaran` to `/daftar` history inspection:
  - `progress/old-pendaftaran-9699359.html`
  - `progress/current-astra.txt`
  - `progress/old-astra.txt`

### Changed
- `daftar/index.html`: restored missing Elementor `.entry-content` wrapper structure from the historical `/pendaftaran/index.html` lineage, including the outer page node, heading container, and section/column scaffolding, while keeping the current `/daftar` form functionality intact.
- `daftar/index.html`: restored the older Elementor widget hierarchy inside `.elementor-widget-wrap` for the Franchisee, Franchisor, and Klaim tabs, including heading widgets, intro text widgets, wpforms-style wrappers, and the richer Klaim search shell while preserving the current `/daftar` form logic.
- `AGENTS.md`: added missing guardrails copied from `GEMINI.md` (large-file edit safety, local context-file checks, post-edit line-count verification, inventory/schema sync reminder, changelog timestamp rule) and documented the historical rename from `/pendaftaran` to `/daftar`.

### Removed
- Temporary comparison files after restoration analysis:
  - `progress/old-pendaftaran-9699359.html`
  - `progress/current-astra.txt`
  - `progress/old-astra.txt`

## 2026-03-09 21:45 (Asia/Jakarta)
### Added
- Migrated historical development timeline entries from `PRD.md` into `CHANGELOG.md`.

### Changed
- `PRD.md`: removed ongoing timeline/changelog section; kept PRD for requirements and roadmap scope.
- `GEMINI.md`: set `CHANGELOG.md` as mandatory code-change log and defined timestamp format with timezone.
- `AGENTS.md`: aligned `PRD.md` instruction to non-changelog scope.

### Removed
- `PRD.md` "Development Timeline & Progress" section.

## 2026-03-09 21:30 (Asia/Jakarta)
### Added
- `.github/workflows/generate-pages.yaml`: Google Sheets hash-based change detection and persisted state (`.github/sheets-sync-state.json`) to skip unnecessary builds.

### Changed
- `.github/workflows/generate-pages.yaml`:
  - removed `push` trigger.
  - kept `repository_dispatch` (`sheet_update`) and `workflow_dispatch`.
  - added 15-minute scheduled polling fallback.
  - added concurrency guard and conditional build/commit behavior.
- `AGENTS.md`: added persistent changelog rule and markdown instruction index.

### Removed
- `generate-pages.yaml` dependency on repository push updates for triggering.

## 2026-03-09 20:55 (Asia/Jakarta)
### Added
- `AGENTS.md` initial local audit notes.

### Changed
- `js/form-franchise.js`:
  - guarded `window.renderPackageInputs(1)` calls when function is unavailable.
  - improved submit error fallback (`result.message || result.error || 'Gagal'`).

### Removed
- None.

## Historical Entries (Migrated from old PRD timeline)
- 2026-03-06 20:00: Project Kickoff (initial WordPress-to-Static analysis).
- 2026-03-06 20:15: Documentation Sync (PRD and GEMINI sync).
- 2026-03-06 20:30: Hybrid SSG engine updates for `UNCLAIMED`.
- 2026-03-06 21:00: Claim workflow UI implementation.
- 2026-03-06 21:30: Deep-linking and auto-fill (`?claim=slug`) support.
- 2026-03-06 22:00: GitHub Actions run-command bugfix.
- 2026-03-06 22:30: UI/CSS polish and migration to `css/form-franchise.css`.
- 2026-03-06 22:45: Static autocomplete via `data/unclaimed-brands.json`.
- 2026-03-06 23:15: Automated sync logic design via Google Sheets trigger.
- 2026-03-07 10:00: Post-claim cleanup in `UNCLAIMED`.
- 2026-03-07 12:30: SEO and sitemap enhancements (JSON-LD, breadcrumbs, sitemap).
- 2026-03-07 14:00: Logic inventory creation and refactor.
- 2026-03-07 15:00: Unified claim workflow merge.
- 2026-03-07 15:30: Final verification marked TODO (end-to-end claim process).
