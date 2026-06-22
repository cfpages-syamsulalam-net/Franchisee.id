# Admin & Staff Dashboard Plan

Last updated: 2026-06-22 15:22 (Asia/Jakarta)

## Purpose

Build an internal dashboard for admin and staff to see the full franchise network at a glance, manage D1-backed listings, coordinate claim outreach, and understand which actions improve directory quality and revenue.

This dashboard should not replace the public `/peluang-usaha` directory. It is the operations layer for the shared D1 database that powers Franchisee.id and the wider network: Franchisor.id, Franchise.id, Waralaba.id, Franchise.co.id, Waralaba.co.id, and future owned sites.

## Access Model

- `admin`: full access to users, roles, listings, claims, publishing, payments, audit logs, and destructive actions.
- `staff`: operations access to review listings, contact unclaimed brands, update non-sensitive listing data, and trigger publish requests within guardrails.
- `franchisor`: future self-service dashboard for owned listings only.
- `franchisee`: future lead/search dashboard for saved opportunities and inquiry history.

D1 remains authoritative for roles and permissions. Clerk provides identity/session and mirrors role metadata only for UI routing.

## Product Decisions

- Route: use `/dashboard` for the Franchisee.id admin/staff dashboard.
- Site scope: start with Franchisee.id only (`site_franchisee_id`). A centralized multi-site dashboard can be built later for Franchise.id/Waralaba.id/network operations.
- Staff edit policy: staff can suggest listing edits only. Admin approval is required unless an admin creates an active auto-approval rule for that staff user.
- WhatsApp outreach: no WhatsApp API for now. The dashboard generates a `wa.me` link with a prefilled message, and the staff member sends it from their own WhatsApp account.
- Edit storage policy: use structured JSON diffs for suggestion/review snapshots; once approved into D1, apply the accepted values field-by-field to canonical D1 columns.
- Trusted staff auto-approval: if admin grants auto-approval to a staff user, all listing fields are safe for that staff user to edit.
- Outreach logging: opening WhatsApp does not log an event. Staff must manually confirm the message was sent with the dashboard confirmation action.
- Outreach priority: use data completeness only for now. Add traffic/lead metrics later when reliable analytics/lead data exists.

## Progress Tracker

| Area | Status | Notes |
| --- | --- | --- |
| `/dashboard` route | Implemented | `src/pages/dashboard/index.astro` builds a static protected dashboard shell. Sensitive data loads only from the protected API. |
| Dashboard auth | Implemented | `functions/dashboard-data.js` requires D1 role `staff`; existing auth helper allows `admin` as elevated access. |
| Overview metrics | Implemented | Total listings, unclaimed, verified/premium, missing image/contact/description, and publish queue counts come from D1. |
| Unclaimed outreach queue | Implemented | Shows unclaimed published listings with mobile/WhatsApp-capable phone data and generates `wa.me` claim-notification links. |
| Outreach event logging | Implemented | `listing_outreach_events` records staff, contact, message, outcome, and timestamp only after staff manually confirms the WA message was sent. |
| Claim review workflow | Implemented | Shows pending D1 `franchise_claims`; admin can approve/reject. Approval attaches ownership/profile data, moves unclaimed listings to free/claimed state, writes audit events, and queues a static rebuild. |
| Data quality panel | Implemented read-only | Shows listings with missing image/contact/description/category or likely all-caps description. |
| Publish queue panel | Implemented read-only | Shows `site_publish_state` and `site_rebuild_requests` counts. |
| Staff edit suggestions | Implemented | Dashboard accepts structured JSON diffs for whitelisted listing fields, stores pending suggestions, allows admin approve/reject, and supports active staff auto-approval rules. |
| Remote D1 migration | Implemented | `0004_dashboard_operations.sql` validates locally and was applied remotely after setting `CLOUDFLARE_ACCOUNT_ID=0ba63b7f0096bc267a93fe5c80b1f571` for Wrangler account context. |
| Admin approvals | Implemented | `/dashboard-data` supports admin-only approve/reject for claim reviews and edit suggestions. |
| Listing operations editor | Implemented MVP | Listing selector plus structured JSON diff form covers all whitelisted public listing fields. A richer field-by-field drawer can be added later. |
| Leads/commercial view | Implemented read-only MVP | Reads `franchise_leads` status counts and recent leads. Payment/subscription revenue metrics remain pending. |
| System health | Implemented read-only MVP | Shows D1 connectivity/migration probe, Clerk session verification note, and recent publish queue status. R2 and webhook failure telemetry remain pending. |

## MVP Sections

### 1. Overview

- Total listings, active listings, unclaimed listings, verified listings, premium listings.
- Recently changed listings that are waiting for static publish.
- Listings with missing critical data: logo, category, investment range, phone, address, description, social links.
- New claims, pending reviews, and rejected claims.
- Top categories by listing count and by lead activity.

### 2. Listing Operations

- Search/filter all listings by brand, category, status, publication status, claim status, owner, source site, and last update.
- Bulk review tools for missing or suspicious data.
- Inline status changes with audit-event logging.
- Preview link to public listing.
- Queue static publish when a public-page-affecting field changes.

### 3. Unclaimed Outreach

- Dedicated queue of unclaimed listings that have public WhatsApp/mobile contacts.
- One-click WhatsApp outreach link using a consistent claim-notification message.
- Outreach status: not contacted, contacted, replied, claim started, claimed, invalid contact.
- Contact attempt history with staff user, timestamp, number used, message template version, and notes.
- Prioritization score using listing completeness, popularity, category value, investment size, and contact confidence.

Recommended first WhatsApp message:

```text
Halo, kami menemukan listing {brand_name} ({category}) di Franchisee.id: {listing_url}.
Status listing ini belum diklaim, jadi informasi franchise, kontak, dan alamatnya belum dikelola langsung oleh pemilik brand.
Mohon tim/pemilik {brand_name} klaim listing ini agar data publiknya bisa diperbarui resmi: {claim_url}
```

### 4. Claims & Ownership

- Queue for incoming brand claims.
- Compare claimant Clerk user, submitted company data, public listing data, phone/email match, and uploaded evidence.
- Approve claim by attaching `owner_user_id` and changing listing status.
- Reject/hold claim with internal reason.
- Every claim decision must write an audit event.

### 5. Data Quality

- All-uppercase description detector and rendered-preview comparison.
- Duplicate brand detector by normalized brand name, phone, website, and address.
- Invalid category/subcategory warnings.
- Broken logo/cover/social URL checks.
- Missing SEO fields and duplicate meta-title/meta-description warnings.

### 6. Publishing

- Show current static publish queue state from `site_rebuild_requests`.
- Show last successful build/deploy timestamp and last dirty change timestamp.
- Manual "request publish" action for admin/staff.
- Guardrails: do not trigger unlimited Cloudflare Pages builds; respect the existing GitHub poller/deploy-hook strategy.

### 7. Leads & Commercial View

- Franchisee inquiries by listing/category/source site.
- Claimed vs unclaimed conversion funnel.
- Premium listing candidates based on traffic, completeness, and outreach response.
- Payment/subscription status once payment integration exists.

### 8. System Health

- D1 connectivity and last migration version.
- Clerk webhook health and recent failures.
- R2 asset availability once media uploads are active.
- Build/publish workflow health.
- Recent API errors from Pages Functions.

## Data Needed

D1 additions:

- `listing_outreach_events`: contact attempts, channel, number/email used, staff user, outcome, notes, message template version. Implemented in `migrations/0004_dashboard_operations.sql`.
- `staff_auto_approval_rules`: admin-managed staff auto-approval policy. Implemented in `migrations/0004_dashboard_operations.sql`.
- `listing_edit_suggestions`: staff suggested edits and admin review state. Implemented in `migrations/0004_dashboard_operations.sql`.
- `listing_quality_checks`: generated warnings and scores per listing. Pending; current MVP computes quality warnings at read time.
- `claim_reviews`: review status, reviewer, decision reason, evidence snapshot. Pending; current MVP reuses `franchise_claims` fields.
- `admin_notes`: internal notes attached to listing/user/claim. Pending.

Existing tables to reuse:

- `franchises`
- `users`
- `franchise_claims`
- `audit_events`
- `site_rebuild_requests`
- `franchise_site_publications`
- `network_sites`

## UI Direction

- Use existing site CSS foundation and keep the interface utilitarian.
- Build dense tables, filters, tabs, counters, and action drawers rather than marketing-style cards.
- Use icons for status/actions where clear, with CSS tooltips for less obvious actions.
- Avoid changing public design patterns unless the dashboard needs a dedicated internal style module.

## Implementation Sequence

1. Define dashboard routes and auth guard. Done.
2. Add read-only overview from D1 for `admin` and `staff`. Done.
3. Add unclaimed outreach queue with WhatsApp links and event logging. Done.
4. Add listing operations filters and detail drawer. MVP done with listing selector and JSON diff form; richer drawer pending.
5. Add staff edit suggestion form plus admin approve/reject workflow. Done.
6. Add claim review workflow. Done.
7. Add publish queue controls and system health. System health read-only MVP done; manual publish controls pending.
8. Add data quality checks and commercial metrics. Partially done; read-only quality warnings and lead status counts exist.

## Open Decisions

- Replace JSON diff form with a guided field-by-field drawer once the common staff workflow becomes clear from real usage.
- Add optional review notes/outreach outcome UI. The API already accepts notes/outcomes, but the current UI keeps the MVP interaction short.
- Add dashboard telemetry tables for Clerk webhook failures, API errors, R2 asset checks, and payment/subscription metrics.
