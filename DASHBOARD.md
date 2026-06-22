# Admin & Staff Dashboard Plan

Last updated: 2026-06-22 09:04 (Asia/Jakarta)

## Purpose

Build an internal dashboard for admin and staff to see the full franchise network at a glance, manage D1-backed listings, coordinate claim outreach, and understand which actions improve directory quality and revenue.

This dashboard should not replace the public `/peluang-usaha` directory. It is the operations layer for the shared D1 database that powers Franchisee.id and the wider network: Franchisor.id, Franchise.id, Waralaba.id, Franchise.co.id, Waralaba.co.id, and future owned sites.

## Access Model

- `admin`: full access to users, roles, listings, claims, publishing, payments, audit logs, and destructive actions.
- `staff`: operations access to review listings, contact unclaimed brands, update non-sensitive listing data, and trigger publish requests within guardrails.
- `franchisor`: future self-service dashboard for owned listings only.
- `franchisee`: future lead/search dashboard for saved opportunities and inquiry history.

D1 remains authoritative for roles and permissions. Clerk provides identity/session and mirrors role metadata only for UI routing.

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

Likely D1 additions:

- `listing_outreach_events`: contact attempts, channel, number/email used, staff user, outcome, notes, message template version.
- `listing_quality_checks`: generated warnings and scores per listing.
- `claim_reviews`: review status, reviewer, decision reason, evidence snapshot.
- `admin_notes`: internal notes attached to listing/user/claim.

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

1. Define dashboard routes and auth guard.
2. Add read-only overview from D1 for `admin` and `staff`.
3. Add unclaimed outreach queue with WhatsApp links and event logging.
4. Add listing operations filters and detail drawer.
5. Add claim review workflow.
6. Add publish queue controls and system health.
7. Add data quality checks and commercial metrics.

## Open Decisions

- Should the dashboard live under `/admin`, `/dashboard`, or a separate internal subdomain?
- Should staff be allowed to edit listing content directly, or only suggest edits pending admin approval?
- Which WhatsApp sender should be used for official outreach: staff personal WhatsApp link, business WhatsApp number, or future API integration?
- Do we need per-site dashboard scopes when the same D1 powers multiple public domains?
