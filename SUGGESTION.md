# SUGGESTION.md - Assistant Recommendations

Last updated: 2026-06-28 17:58 (Asia/Jakarta)

## Purpose
This file is exclusively for Codex/assistant suggestions. It is where I record improvement ideas I notice while working on the project: product value, UX, reliability, performance, security, data quality, operations, migration safety, and developer workflow.

User decisions remain authoritative. This file is not a replacement for `AGENTS.md`, `CODEBASE.md`, or implementation plans; it is a proactive recommendation backlog.

## How To Use
- Status values: `Suggested`, `Accepted`, `In Progress`, `Done`, `Deferred`.
- Keep each suggestion actionable: include why it matters and the next concrete step.
- Promote accepted suggestions into the relevant plan or implementation document before large work begins.
- Add or update entries whenever a project improvement becomes clear during implementation.
- Remove or mark stale suggestions when project direction changes.

## Recommendation Backlog

| ID | Area | Status | Suggestion | Why It Matters | Next Step / Result |
| ---: | --- | --- | --- | --- | --- |
| 1 | Auth QA | Suggested | Create a production auth/account-linking QA checklist. | Recent auth work connects custom Clerk UI, D1 roles, `/login`, `/daftar`, `/profil`, Google SSO, password recovery, and profile edits; identity bugs are high-impact. | Cover email/password registration, Google registration, same-email account linking, forgot password/email, role selection, protected `/daftar`, `/profil` role tabs, admin/staff auth inspection, and logout. |
| 2 | Auth architecture | Done | Split `js/auth-clerk.js` into smaller modules. | The auth runtime had too many responsibilities, making changes risky. | Implemented `js/auth-clerk-ui.js`; `js/auth-clerk.js` now focuses on Clerk/session behavior while preserving `window.FranchiseAuth`. |
| 3 | Media uploads | Done | Build the R2 media upload path. | Franchisors need first-party logo, cover, and proposal uploads instead of fragile URL fields. | Implemented `/profile-upload`, R2 binding config, `franchise_assets` writes, listing media updates, and `/profil` upload controls. Production R2 domain is now configured as `https://assets.franchisee.id`. |
| 4 | Franchisee value | Done | Make saved opportunities cross-device. | Local-only saves are weak after login and across devices. | Implemented `franchise_saved_opportunities`, profile API save/remove, local-save migration, profile rendering, and public save buttons. |
| 5 | Franchisor value | Done | Add a franchisor lead inbox. | Franchisors need a clear place to see and respond to leads for owned listings. | Implemented `/profil` Leads tab with incoming lead cards, contact shortcuts, listing links, and owner-checked lead status updates. |
| 6 | Publish operations | Suggested | Finish static publish automation verification. | Approved listing edits may not appear publicly if the dirty-record-to-rebuild cycle is not fully verified. | Verify Cloudflare Pages build command, required secrets, deploy hook, GitHub scheduler, D1 queue records, and one controlled edit-to-rebuild cycle. |
| 7 | Contact data | Done | Normalize franchise contact data. | Imported phone/contact fields are messy; structured contacts improve editing, validation, WhatsApp links, outreach, and quality checks. | Added `franchise_contacts`, contact normalization helpers, and a dashboard refresh action that migrates high-confidence values from existing listing/profile fields. |
| 8 | Data quality | Done | Persist dashboard data-quality checks. | Read-time-only checks are hard to audit, trend, assign, and resolve. | Added `franchise_quality_checks`, refresh logic for missing media/contact/description/category, all-caps, suspicious contacts, stale listings, and invalid URLs; dashboard reads persisted checks with a live fallback. |
| 9 | Dashboard review UX | Done | Convert staff listing review from JSON to guided fields. | Guided field-level inputs reduce mistakes and make staff/admin review faster. | Replaced the JSON textarea with field rows from shared editable-field definitions and changed pending reviews to show old/new values by field. |
| 10 | Shared validation | Done | Share Zod schemas across forms, functions, and imports. | Validation can drift when each endpoint, form, and importer defines payload rules separately. | Added `functions/_shared-schemas.js` for dashboard actions, form submissions, `/get-franchises` query params, and shared normalizers. Added `src/lib/shared-schemas.ts` for CSV import rows and D1 static snapshot rows used by import/build/Astro paths. |
| 11 | CSV reliability | Suggested | Replace remaining naive CSV parsing. | CSV parsing bugs can silently shift franchise fields. | Reuse the existing quote-aware parser or a single shared parser anywhere CSV data is still parsed manually. |
| 12 | Ranking signals | Suggested | Add product analytics for ranking signals. | Popularity and recommendations should eventually use real behavior instead of mostly static listing quality. | Define privacy-conscious events for listing view, save, inquiry, claim, and contact click, then feed aggregate counts into popularity/recommendation scoring. |
| 13 | Operations telemetry | Suggested | Strengthen operations telemetry. | Auth failures, webhook failures, publish queue failures, broken media, and API errors should not hide. | Add a dashboard health panel backed by recent audit events, webhook delivery status, rebuild queue state, API error counts, and stale data warnings. |
| 14 | Multi-site controls | Suggested | Design multi-site publishing controls. | The shared franchise network will need clear controls for where listings appear. | Design admin publication controls and franchisor-facing distribution status using `network_sites`, `franchise_site_publications`, subscriptions, and entitlements. |
| 15 | Copy quality | Suggested | Improve public copy consistency. | Public-facing copy should avoid internal terms and give clear next actions. | Add a copy QA pass for `/login`, `/daftar`, `/profil`, franchise detail pages, and claim flows. |
