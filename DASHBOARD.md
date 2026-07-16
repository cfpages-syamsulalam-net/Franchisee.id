# Admin & Staff Dashboard Plan

Last updated: 2026-07-16 07:55 (Asia/Jakarta)

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
- Google Contacts outreach prep: staff can save ready outreach contacts to the currently linked Google account before opening WhatsApp, using Google People API with the `https://www.googleapis.com/auth/contacts` scope. This requires People API and the Clerk Google connection to be configured with that scope, then staff must login again with Google.
- Sales outreach workflow: Outreach and Pipeline are separate dashboard tabs. Outreach is the staff work queue for saving contacts, sending WhatsApp, and recording follow-up; Pipeline is the Kanban visualization for progress tracking. Both tabs read/write the same canonical stages: `Uncontacted`, `Saved Contact`, `Contacted`, `Responded`, `Qualified`, `Claim Started`, `Claimed`, `Subscribed`, `Renewal Risk`, and `Burned`.
- Edit storage policy: use structured JSON diffs for suggestion/review snapshots; once approved into D1, apply the accepted values field-by-field to canonical D1 columns.
- Trusted staff auto-approval: if admin grants auto-approval to a staff user, all listing fields are safe for that staff user to edit.
- Outreach logging: opening WhatsApp does not log an event. Staff must manually confirm the message was sent with the dashboard confirmation action.
- Outreach priority: use data completeness only for now. Add traffic/lead metrics later when reliable analytics/lead data exists.

## Integration Documentation

Third-party setup details for `/dashboard` live in `docs/architecture/DASHBOARD_INTEGRATION_GUIDE.md`. The Integrasi tab renders the full in-app step-by-step version from `src/components/dashboard/DashboardIntegrationGuide.astro`, and blocked dashboard warnings should link to its stable anchors such as `/dashboard/#google-contacts-setup`.

## Sales System Operating Plan

Goal: make Outreach a measurable staff work queue and keep Pipeline as the visual progress tracker. Every Outreach card should tell staff what to do next, why it matters, and how success is measured; every Pipeline card should make the current stage easy to scan and move.

### Sales Outcomes

| Outcome | Dashboard Metric | Target Behavior |
| --- | --- | --- |
| Contact coverage | Contact-ready brands with saved Google Contact and confirmed WhatsApp send | Staff clear `Uncontacted` and `Saved Contact` daily before starting too many deeper follow-ups. |
| Response conversion | Brands moving from `Contacted` to `Responded` | Staff follow up overdue contacted brands before adding more first-contact volume. |
| Claim conversion | Brands moving from `Responded` or `Qualified` to `Claim Started` and `Claimed` | Staff help interested brands finish the claim flow, not only send messages. |
| Revenue conversion | Claimed brands moving to `Subscribed` | Staff know which claimed brands are ready for Premium or subscription outreach. |
| Retention recovery | `Renewal Risk` brands recovered to `Subscribed` or moved to `Burned` | Staff act before a lapsed or silent brand disappears from the active funnel. |

### Pipeline Playbook

| Stage | Entry Criteria | Staff Next Action | Success Signal | Overdue Warning | Tool Integration |
| --- | --- | --- | --- | --- | --- |
| `Uncontacted` | Brand has usable WhatsApp/mobile contact and no confirmed outreach. | Click save to Google Contacts, then move/send from the saved-contact stage. | Google Contact exists for the linked staff account. | More than 1 business day in queue. | Google People API bulk save. |
| `Saved Contact` | Contact was saved or already exists in Google Contacts. | Open WhatsApp, send the claim message, then confirm the send in dashboard. | `listing_outreach_events` records a sent WhatsApp attempt. | Same day if not sent. | Google Contacts, `wa.me`, outreach event log. |
| `Contacted` | Staff confirmed a WhatsApp message was sent. | Wait for reply; if no reply, send follow-up using the recommended cadence. | Brand replies or asks for details. | No response after 3 business days. | Outreach history, follow-up reminder badge. |
| `Responded` | Brand replied but qualification is incomplete. | Confirm owner/admin identity, decision maker, interest, and whether they want to claim listing or hear Premium offer. | Staff marks brand `Qualified` or moves to `Burned` with reason. | No next update after 2 business days. | Staff notes, claim link, listing profile data. |
| `Qualified` | Brand is legitimate and there is a clear next commercial step. | Send claim link, explain free claim benefit, and prepare Premium pitch if appropriate. | Brand starts claim or requests subscription/payment steps. | No claim/payment action after 3 business days. | Claim URL, Premium readiness checklist, proposal/listing quality. |
| `Claim Started` | Claim has been submitted or staff is actively helping the brand claim. | Help admin resolve evidence mismatch; nudge brand if evidence is incomplete. | Claim is approved and listing becomes owned/claimed. | Claim pending or incomplete after 2 business days. | Claim review queue, admin approval workflow. |
| `Claimed` | Brand owns the listing but has no active subscription. | Pitch Premium/subscription using listing readiness and lead/traffic signals when available. | Owner submits payment confirmation or subscription becomes active. | Claimed more than 7 days without payment action. | Premium payment flow, readiness checklist, lead summary. |
| `Subscribed` | Brand has an active paid subscription. | Monitor renewal window, listing completeness, and premium delivery issues. | Subscription remains active and renewal is prepared before expiry. | Enters renewal window with no renewal order/payment. | Premium subscription dates, notification/email queue. |
| `Renewal Risk` | Subscription is near expiry, lapsed, or brand stopped responding. | Send renewal/recovery message, check owner concerns, then recover or mark burned. | Renewed subscription or explicit lost/no-response reason. | No response after 7 business days or grace period ends. | Premium lifecycle, queued reminders, staff notes. |
| `Burned` | Brand is lost, unreachable, invalid, refuses, or subscription churn is confirmed. | Record concise reason and stop routine follow-up unless new evidence appears. | Clear lost reason is stored for reporting. | None; review monthly for reactivation candidates. | Outreach notes, future lost-reason report. |

### Staff Dashboard Instructions

- Each Outreach card should show one primary next action derived from its stage, such as "Simpan kontak", "Kirim WhatsApp", "Follow-up balasan", "Bantu klaim", "Tawarkan Premium", or "Pulihkan renewal".
- Outreach is for doing the work: bulk Google Contacts save, WhatsApp links, send confirmation, notes, and status updates.
- Pipeline is for seeing/tracking progress: stage counts, conversion metrics, Kanban columns, and drag/drop moves.
- A status change in either tab must update `listing_outreach_statuses` and reload the shared dashboard payload so the other tab reflects the same stage.
- Staff should not need to infer why a card appears in a column. Show the reason: missing claim, saved contact, last WhatsApp date, pending claim, active subscription, renewal risk, or burned reason.
- Sales cards must stay compact because the brand queue can be large: use status badges, icon-only controls, one-line notes, and shared tooltip details instead of long visible paragraphs inside every card.
- Every manual move should allow a short note when the move needs context, especially `Responded`, `Qualified`, `Renewal Risk`, and `Burned`.
- The Outreach tab badge should count actionable open work, excluding `Subscribed` and `Burned`.
- Board summary should show stage counts plus conversion rates: contacted response rate, response-to-claim rate, claim-to-subscription rate, and renewal recovery rate.
- Cards should be sortable by urgency: overdue follow-up first, then newest response, then highest commercial/readiness signal, then oldest uncontacted.

### Follow-Up Cadence

| Trigger | Recommended Action |
| --- | --- |
| New contact-ready brand | Save contact and send the first claim message within 1 business day. |
| No reply after first contact | Follow up after 3 business days. |
| Reply received | Qualify and set next status within 2 business days. |
| Claim started | Check progress daily until approved, rejected, or blocked. |
| Claimed but unpaid | Follow up with Premium/subscription value after 7 days, sooner if lead/readiness signals are strong. |
| Subscription renewal window | Start renewal touchpoints 30 days before expiry, then 14, 7, and 1 day when email/notification queue supports it. |
| No response after renewal risk | Move to `Burned` with reason after 7 business days or after grace-period downgrade completes. |

### Sales Measurement Data Needed

- `listing_outreach_statuses`: add or reuse `assigned_staff_user_id`, milestone timestamps, and notes for current stage ownership.
- `listing_outreach_events`: continue recording every confirmed outreach, status move, follow-up, response, and lost reason as history.
- `premium_subscriptions` and payment/order tables: provide active, expiring, lapsed, and renewed status for `Subscribed` and `Renewal Risk`.
- `franchise_claims`: provide claim-started and claim-approved signals.
- `premium_funnel_events`, `franchise_leads`, and product events: provide future prioritization and conversion context once signal quality is reliable.

### Sales System Implementation Tracker

| Work Item | Status | Notes |
| --- | --- | --- |
| Durable Kanban status storage | Implemented | `listing_outreach_statuses` stores current stage. |
| Drag/drop board and status badge | Implemented | Outreach cards can move between canonical stages. |
| Google Contacts and WhatsApp logging integration | Implemented | Contacts save to linked Google account; WhatsApp send requires staff confirmation. |
| Stage-specific next-action copy on every card | Implemented | Cards show `Langkah berikutnya` and a stage-specific instruction from the shared pipeline contract. |
| Overdue/follow-up SLA badges | Implemented | Status moves set `next_follow_up_at`; overdue rows show warning chips and sort ahead of lower-urgency work. |
| Staff notes and move reason capture | Implemented | Cards include compact notes; status updates persist notes, and burned moves store a normalized burned reason. |
| Sales conversion metrics | Implemented | Outreach summary shows response, response-to-claim, claim-to-subscription, and renewal recovery rates. |
| Assignment and ownership filters | Implemented | Outreach filters include Hari ini, Perlu aksi, Overdue, Milik saya, Belum assigned, and Semua; status moves assign the acting staff user when empty. |
| Lost/burned reason taxonomy | Implemented | `Burned` uses normalized reasons: no response, invalid contact, not interested, not owner, duplicate/closed, subscription churn, or other. |
| Subscription-risk automation | Implemented | Active subscriptions render as `Subscribed`; lapsed/latest subscriptions without active status surface as `Renewal Risk` unless explicitly burned. |
| Staff daily task view | Implemented | The default `Hari ini` filter combines overdue follow-ups, new contacts, replies/qualification, claim blockers, and renewal risks. |
| Separate Outreach and Pipeline tabs | Implemented | Outreach renders the actionable worklist; Pipeline renders the Kanban board and stage/conversion summary. Both use the same dashboard payload and status mutation action. |
| Compact sales card layout | Implemented | Dashboard tabs scroll horizontally; Outreach and Pipeline cards use compact status badges, icon-only tooltip metadata, one-line notes, and responsive containment so many brands fit without card collisions. |
| Registered franchisor visibility | Implemented | Outreach/Pipeline includes non-archived registered/owned listings with usable contact data, not only already-published unclaimed listings, so new franchisors can be reached and tracked. |

### D1/R2 OCR Text Storage

- New OCR and proposal text writes store long extracted text in R2 under the existing `FRANCHISE_ASSETS` binding, while D1 keeps preview text, text length, and the R2 object key.
- Historical remote D1 OCR text was migrated to R2 on 2026-07-16: `franchise_asset_knowledge.source_text` and `ocr_content_cache.text` have zero remaining long-text rows, while 479 knowledge rows and 478 cache rows now have R2 object keys.
- The dashboard does not expose an OCR text migration button. The one-time backfill is complete, and future OCR/proposal writes should land in R2 first. The CLI helper `pnpm run ocr:text:migrate-r2 -- --all` remains only as an operator replay tool for another environment that still has legacy D1 text.
- Remote D1 migration ledger rows `0024` through `0032` were reconciled after live-schema verification on 2026-07-16. To get below the write-size ceiling, old high-volume `operation_events` telemetry before 2026-07-10 was pruned; remote D1 dropped from roughly 501 MB to 211 MB and `wrangler d1 migrations list franchise_db --remote` reports no pending migrations.

## Progress Tracker

| Area | Status | Notes |
| --- | --- | --- |
| `/dashboard` route | Implemented | `src/pages/dashboard/index.astro` builds a static protected dashboard shell. Sensitive data loads only from the protected API. |
| Dashboard auth | Implemented | `functions/dashboard-data.js` requires D1 role `staff`; existing auth helper allows `admin` as elevated access. |
| Dashboard tab UI | Implemented | `/dashboard` now groups detailed panels into icon-led tabs: Outreach, Pipeline, Data Quality, Review, Leads, Publikasi, Premium, Sistem, Integrasi, and OCR. |
| Overview metrics | Implemented | Total listings, unclaimed, verified/premium, missing image/contact/description, and publish queue counts come from D1. |
| Sales outreach work queue | Implemented | Outreach shows contact-ready unclaimed/registered/pipeline/subscribed listings as an actionable worklist with status badges, WhatsApp actions, claim links, notes, and dropdown status controls. |
| Sales pipeline board | Implemented | Pipeline shows the same rows as a drag-and-drop Kanban board with stage/conversion summary and shared status updates. |
| Google Contacts bulk save | Implemented | Outreach can create up to 200 Google Contacts from the current unclaimed outreach queue in one protected action so brand names appear before staff sends WhatsApp messages. It searches existing Google Contacts first and skips duplicate phone numbers. If Google Contacts scope/token is missing, the dashboard returns setup guidance instead of silently failing. |
| Outreach event logging | Implemented | `listing_outreach_events` records staff, contact, message, outcome, and timestamp only after staff manually confirms the WA message was sent. |
| Outreach current status | Implemented | `listing_outreach_statuses` stores the current sales pipeline stage per listing/site, while `listing_outreach_events` remains the history log. |
| Claim review workflow | Implemented | Shows pending D1 `franchise_claims`; admin can approve/reject. Approval attaches ownership/profile data, moves unclaimed listings to free/claimed state, writes audit events, and queues a static rebuild. |
| Data quality panel | Implemented read-only | Shows listings with missing image/contact/description/category or likely all-caps description. |
| Publish queue panel | Implemented read-only | Shows `site_publish_state` and `site_rebuild_requests` counts. |
| Staff edit suggestions | Implemented | Dashboard accepts structured JSON diffs for whitelisted listing fields, stores pending suggestions, allows admin approve/reject, and supports active staff auto-approval rules. |
| Remote D1 migration | Implemented | `0004_dashboard_operations.sql` validates locally and was applied remotely after setting `CLOUDFLARE_ACCOUNT_ID=0ba63b7f0096bc267a93fe5c80b1f571` for Wrangler account context. |
| Admin approvals | Implemented | `/dashboard-data` supports admin-only approve/reject for claim reviews and edit suggestions. |
| Dashboard API modularization | Implemented | `/dashboard-data` is now a thin router; schemas, queries, actions, and shared utilities live in dedicated `_dashboard-*` modules. |
| OCR provider configuration | Implemented | Admin-only OCR tab manages ten provider records, masked key/secret state, endpoint/account/region/model, priority, free quota metadata, trial expiry, and enablement through D1 migration 0020. External OCR calls only happen through explicit dry-run, bounded batch job actions, or the protected worker when explicitly enabled. |
| OCR job execution UX | Implemented | 2026-07-08 request tracker completed: added non-technical tooltips/copy, made dry-run semantics clear, added OCR subtabs and Hasil OCR rows with listing/review links, aligned icon+text buttons, improved desktop/mobile layout, auto-saves provider credentials/settings, greys disabled configured providers, shows provider error status with copyable troubleshooting text, and clarifies that batch execution is intentionally bounded to 5 jobs per click. |
| OCR controlled worker | Implemented | Added protected `/ocr-worker` plus optional GitHub Actions workflow for large queued backfills. It requires shared `OCR_SECRET`, allows manual workflow runs without the cron gate, keeps scheduled cron disabled until `OCR_WORKER_ENABLED=true`, runs small batches, and enforces a daily OCR usage cap before sending jobs. |
| OCR franchise-context batching | Implemented | 2026-07-08 request tracker completed: OCR queue/run ordering now completes proposal pages for one franchise before moving to the next franchise, because proposal meaning depends on full-franchise context rather than first-page-only snippets from many franchises. Hasil OCR rows show franchise/page/source context, and recent successful jobs link directly to the matching Hasil OCR row. |
| OCR provider rate limits | Implemented | Suggestion 68 completed: added provider short-window rate metadata, local cooldown state, runner skip behavior for rate-limited providers, and dashboard visibility for rate/cooldown status. |
| OCR empty-image/no-text handling | Implemented | Recent OCR jobs now expose a Gambar action so admins can inspect the exact brochure page sent to OCR. OCR responses with too little text become `needs_review` instead of provider failure when no hard provider error occurred, and failed rows can be manually marked as “Tanpa teks” after visual inspection. |
| OCR provider activation and retry UX | In Progress | 2026-07-08 request tracker: move provider active/disabled control out of credential form and into Prioritas Provider OCR only, fix confusing autosave path that can leave providers disabled after credential tinkering, disable all OCR execution buttons when no active provider is available, make batch failed retry visually clear, and make per-row failed OCR action run OCR immediately rather than only returning the job to pending. |
| Dashboard action-icon UX audit | In Progress | 2026-07-08 UX audit: OCR job rows should use generous status/action icons, compact action text, tooltip explanations, better row layout, and consistent button alignment. Expand this dashboard-wide pattern gradually: every ambiguous operational action should have an icon plus short label, and state should use visual symbols such as checkmark/success and x/failed where the icon improves scan speed. |
| Dashboard auth loading skeleton | In Progress | 2026-07-08 UX audit: `/dashboard` should show a neutral loading skeleton while Clerk/session/dashboard authorization is being checked. The login form should only appear after the app knows there is no usable session or the session is expired/unauthorized. |
| Dashboard CSS modularization | Implemented | 2026-07-08 maintainability audit: `css/dashboard.css` grew too large. Split is now done for auth loading, OCR, Review/Data Quality, Outreach/Pipeline, operations/admin helpers, integration docs, and Premium Operations styles; `css/dashboard.css` remains the shared shell/base stylesheet. |
| Brochure overlay navigation polish | Implemented | 2026-07-08 request tracker completed: proposal previous/next hit areas are transparent gradient overlays that appear only while the cursor is moving over the image, then auto-hide after 1 second of no pointer movement even if still hovering. OCR enqueue button alignment/icon was fixed at the same time. |
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

### 3. Sales Outreach

- Dedicated queue of unclaimed listings that have public WhatsApp/mobile contacts.
- One-click WhatsApp outreach link using a consistent claim-notification message.
- Outreach status: uncontacted, saved contact, contacted, responded, qualified, claim started, claimed, subscribed, renewal risk, burned.
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
- `listing_outreach_statuses`: latest sales pipeline stage per listing/site, including assigned staff and milestone timestamps. Implemented in `migrations/0030_listing_outreach_statuses.sql`.
- `listing_outreach_statuses.next_follow_up_at` / `burned_reason`: follow-up SLA and normalized lost/churn reason metadata for measurable sales operations. Implemented in `migrations/0032_sales_outreach_workflow_fields.sql`.
- `staff_auto_approval_rules`: admin-managed staff auto-approval policy. Implemented in `migrations/0004_dashboard_operations.sql`.
- `listing_edit_suggestions`: staff suggested edits and admin review state. Implemented in `migrations/0004_dashboard_operations.sql`.
- `listing_quality_checks`: generated warnings and scores per listing. Pending; current MVP computes quality warnings at read time.
- `claim_reviews`: review status, reviewer, decision reason, evidence snapshot. Pending; current MVP reuses `franchise_claims` fields.
- `admin_notes`: internal notes attached to listing/user/claim. Pending.
- `ocr_provider_configs`: provider priority, credentials, endpoint/model/account metadata, quota metadata, trial expiry, and health state. Implemented in `migrations/0020_ocr_provider_configs.sql`; credentials are never returned by dashboard reads.
- `franchise_asset_knowledge.source_text_r2_*` and `ocr_content_cache.text_r2_*`: R2 pointers and previews for OCR/proposal text, keeping long text outside D1 after migration. Implemented in `migrations/0031_ocr_text_r2_storage.sql`.

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
9. Add OCR provider research/configuration. Done.
10. Add OCR execution queue/cache/failover and one-asset dry run. Done.
11. Improve OCR admin UX for non-technical operators. Done; tracked under "OCR job execution UX" above.
12. Add controlled OCR worker for larger queued backfills. Done; protected by `OCR_SECRET` and disabled by default in GitHub Actions.
13. Polish brochure image overlay controls. Done; tracked above.
14. Change OCR queue processing to franchise-context-first batches. Done; tracked above.
15. Add provider short-window rate-limit/cooldown guardrails. Done; tracked above.
16. Move OCR provider activation to provider-priority list, disable OCR execution buttons when no active provider is available, and add failed-job retry controls. In progress; tracked above.
17. Upgrade OCR job row/action UX with compact icon-led rows and direct per-row OCR retry execution. In progress; tracked above.
18. Add dashboard auth loading skeleton before showing the login form. In progress; tracked above.
19. Split large dashboard CSS by feature surface. Done for auth loading, OCR, Review/Data Quality, Operations/admin helpers, and Premium Operations; tracker lives in `AUDIT.md`.
20. Add OCR no-text resolution flow. Done: job rows show the source image, OCR text-too-short outcomes become `needs_review`, and admins can manually mark failed jobs as no-text pages.

## Open Decisions

- Replace JSON diff form with a guided field-by-field drawer once the common staff workflow becomes clear from real usage.
- Add optional review notes/outreach outcome UI. The API already accepts notes/outcomes, but the current UI keeps the MVP interaction short.
- Add dashboard telemetry tables for Clerk webhook failures, API errors, R2 asset checks, and payment/subscription metrics.
