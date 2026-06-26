# SUGGESTION.md - Assistant Recommendations

Last updated: 2026-06-26 05:32 (Asia/Jakarta)

## Purpose
This file is exclusively for Codex/assistant suggestions. It is where I record improvement ideas I notice while working on the project: product value, UX, reliability, performance, security, data quality, operations, migration safety, and developer workflow.

User decisions remain authoritative. This file is not a replacement for `AGENTS.md`, `CODEBASE.md`, or implementation plans; it is a proactive recommendation backlog.

## How To Use
- Status values: `Suggested`, `Accepted`, `In Progress`, `Done`, `Deferred`.
- Keep each suggestion actionable: include why it matters and the next concrete step.
- Promote accepted suggestions into the relevant plan or implementation document before large work begins.
- Remove or mark stale suggestions when project direction changes.

## Priority Suggestions

### 1. Production Auth And Account Linking QA
Status: Suggested

Recent auth work connects custom Clerk UI, D1 roles, `/login`, `/daftar`, `/profil`, Google SSO, password recovery, and profile edits. Because identity bugs are high-impact, this needs a production QA checklist rather than ad hoc browser checks.

Suggested next step: create and run a checklist covering email/password registration, Google registration, same-email account linking, forgot password, forgot email guidance, role selection, `/daftar` login redirect, `/profil` role tabs, admin/staff access to auth pages, and logout behavior.

### 2. Split `js/auth-clerk.js` Into Smaller Modules
Status: Done

`js/auth-clerk.js` now handles bootstrap, login/register UI, Google flows, recovery flows, token headers, role sync, redirects, and debug events. That makes auth changes risky and slows review.

Implemented: extracted the auth page renderer into `js/auth-clerk-ui.js` and kept `js/auth-clerk.js` focused on Clerk/session behavior while preserving `window.FranchiseAuth`.

### 3. Build The R2 Media Upload Path
Status: Done

The stack direction says franchise media and proposal assets should live in R2, while the form still relies heavily on URL fields such as logo, cover, and proposal URLs. That creates friction for franchisors and inconsistent media quality.

Implemented: added owner-checked profile media uploads for logo, cover, and proposal files through `functions/profile-upload.js`, R2 binding config, `franchise_assets` writes, listing media field updates, and `/profil` upload controls.

Follow-up: production needs the `FRANCHISE_ASSETS` bucket and `FRANCHISE_ASSETS_PUBLIC_BASE_URL` configured before uploads can return public file URLs.

### 4. Make Saved Opportunities Cross-Device
Status: Done

The franchisee value surface includes saved opportunities, but local-only browser storage limits usefulness after login. Logged-in franchisees should see saved listings across devices and sessions.

Implemented: added `franchise_saved_opportunities`, profile API save/remove actions, local-save migration after login, profile saved-opportunity rendering, and public listing card/detail save buttons.

### 5. Add A Franchisor Lead Inbox
Status: Done

Franchisees can express interest, but franchisors need a clear place to see and respond to leads for their owned listings. This would make the franchisor role feel more valuable immediately.

Implemented: added a `/profil` `Leads` tab for franchisors with incoming lead cards, contact shortcuts, listing links, and owner-checked lead status updates.

### 6. Finish Static Publish Automation Verification
Status: Suggested

The D1-to-static publish queue is designed, but production confidence depends on verifying the whole dirty-record-to-rebuild cycle. If this is only partially configured, approved listing edits may not appear publicly when expected.

Suggested next step: verify Cloudflare Pages build command, required secrets, deploy hook, GitHub scheduler, D1 queue records, and one end-to-end rebuild from a controlled listing edit.

### 7. Normalize Franchise Contact Data
Status: Suggested

Imported phone and contact fields can be messy. Current parsing improves public display, but structured contact data would make editing, validation, WhatsApp links, outreach, and data quality checks more reliable.

Suggested next step: introduce a normalized contact model for phone, WhatsApp, email, website, address, and social links, then migrate high-confidence values from existing fields.

### 8. Persist Data Quality Checks
Status: Suggested

Dashboard data-quality panels are useful, but checks computed only at read time are harder to audit, trend, assign, and resolve. Persistent checks would support operations work better.

Suggested next step: add a quality-check table for missing media, broken URLs, duplicate brands, suspicious contact data, thin descriptions, and stale listings, with resolution status and reviewer notes.

### 9. Convert Staff Listing Review From JSON To Guided Fields
Status: Suggested

Structured JSON diffs are powerful for internal review, but guided field-level editors reduce review mistakes and make staff/admin workflows faster.

Suggested next step: build a dashboard review drawer that shows each proposed field change with old value, new value, validation status, approve/reject controls, and a short audit note.

### 10. Share Zod Schemas Across Forms, Functions, And Imports
Status: Suggested

The project already standardizes on Zod for untrusted data, but schemas can drift if each endpoint, form, and importer defines validation separately.

Suggested next step: create shared schema modules for roles, profiles, franchise listings, claims, contacts, and dashboard actions, then use them in Forms, Functions, and import/build scripts.

### 11. Replace Remaining Naive CSV Parsing
Status: Suggested

The form and importer rules warn against naive CSV parsing, and the audit notes that sitemap-related CSV handling still needs cleanup. CSV parsing bugs can silently shift franchise fields.

Suggested next step: reuse the existing quote-aware parser or a single shared parser module anywhere CSV data is still parsed manually.

### 12. Add Product Analytics For Ranking Signals
Status: Suggested

Popularity and recommendations are more valuable if they use real behavior instead of mostly static listing quality. Views, saves, inquiries, and admin boosts can improve discovery and franchisor feedback.

Suggested next step: define privacy-conscious events for listing view, save, inquiry, claim, and contact click, then feed aggregated counts into popularity and recommendation scoring.

### 13. Strengthen Operations Telemetry
Status: Suggested

The dashboard has useful operational surfaces, but auth failures, webhook failures, publish queue failures, broken media, and API errors need visible monitoring so production issues do not hide.

Suggested next step: add a dashboard health panel backed by recent audit events, webhook delivery status, rebuild queue state, API error counts, and stale data warnings.

### 14. Design Multi-Site Publishing Controls
Status: Suggested

The architecture supports a shared franchise network across several domains, but operators and franchisors will eventually need clear controls for where listings appear.

Suggested next step: design admin publication controls and franchisor-facing distribution status using `network_sites`, `franchise_site_publications`, subscriptions, and entitlements.

### 15. Improve Public Copy Consistency
Status: Suggested

The project has already agreed that public-facing copy should avoid internal terms. As more auth, profile, claim, and dashboard-adjacent pages become public, copy consistency needs deliberate review.

Suggested next step: add a copy QA pass for `/login`, `/daftar`, `/profil`, franchise detail pages, and claim flows, checking for technical terms, unclear next actions, and inconsistent role labels.
