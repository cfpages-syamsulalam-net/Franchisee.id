# Franchisee.id Technology Audit & Migration Tracker

Last updated: 2026-07-12 21:32 (Asia/Jakarta)

## Executive Summary
The current site is now a hybrid Cloudflare Pages application: Astro owns the canonical D1-backed franchise directory pages, legacy static pages/assets are copied into `dist`, Cloudflare Pages Functions own protected app writes, D1 is the transactional source of truth, R2 stores first-party uploads, and Clerk handles identity. Google Sheets has moved to archive/import-only transition behavior.

Recommended target: keep the Cloudflare hosting model, preserve existing styling, and migrate the application layer to an Astro-on-Cloudflare stack with D1, R2, Clerk, and Cloudflare Workers/Pages Functions. Next.js remains viable, especially for a React-heavy dashboard, but Astro is the better default for this project because the public product is a content-heavy franchise directory that should stay static-first and lightweight.

## Existing Stack

| Area | Current Implementation | Observed Fit |
| --- | --- | --- |
| Hosting | Cloudflare Pages serving Astro `dist` plus copied legacy static export. | Good fit for static SEO pages and lightweight protected app shells. |
| Backend | Cloudflare Pages Functions in `/functions`, using Clerk auth, D1 writes, R2 uploads, telemetry, and protected worker endpoints. | Good edge runtime; main risk is growing route modules and manual production verification. |
| Database | Cloudflare D1 `franchise_db` for users, roles, profiles, listings, claims, leads, saved opportunities, premium orders/subscriptions, quality checks, publish queue, telemetry, and audit events. | Current source of truth. Google Sheets is archive/import-only and should not regain write paths. |
| Assets | Cloudflare R2 `franchise-assets` exposed via `https://assets.franchisee.id`; legacy WordPress/external URLs still exist for imported rows. | New owner uploads have durable ownership; legacy asset cleanup can happen gradually. |
| Auth | Clerk custom UI for `/login`, `/daftar`, `/profil`, `/dashboard`, and `/sso-callback`; D1 remains authoritative for roles. | Functional app auth exists; production QA remains important because identity/account-linking is high-impact. |
| SSG | Astro routes generate canonical `/peluang-usaha` and flat detail HTML from D1 snapshots; legacy static copy fills the rest of the site. | Good transition path. Next risk is keeping static rebuild automation and public metrics current. |
| Styling | Existing WordPress/Astra/Elementor CSS plus modular form CSS. | Keep and reuse; no extra styling dependency needed. |
| Automation | D1 publish poller workflow triggers Cloudflare Pages Deploy Hook when public-page D1 changes are dirty; Premium email worker workflow calls the protected email endpoint. | Direction is correct; dirty-to-build and email sending should keep getting production verification. |

## Primary Problems
- Several runtime files have become large orchestration modules after the D1/Clerk/Profile/Premium work. Recent profile/dashboard/static renderer/static asset/Premium operations/profile CSS, auth core, D1 renderer, CSV importer, and form-submit workflow splits reduced the highest frontend/backend risk. Remaining watch areas are focused growth in dashboard query/action modules and generated detail assets.
- Static freshness depends on the D1 dirty queue and deploy-hook workflow. That path is implemented, but production dirty-to-build verification should remain tracked.
- Public popularity/recommendation signals still use a mix of deterministic quality proxies and newer product events; richer ranking needs a dedicated model once event volume grows.
- Bank transaction matching is still manual; Premium activation is production-ready for manual review, but automatic payment matching needs a provider/API decision.
- Legacy Google Sheets/CSV and WordPress-exported HTML remain in the transition layer. They should stay readable/importable but not regain write ownership.
- Several blocked states are now CTA-backed, but every new public-facing error/empty/warning state should keep following the “clear next action” rule.
- Proposal uploads now preserve extracted text and reviewable missing-field candidates separately from canonical listing data. Image-only brochure OCR is handled by an admin-triggered queue so uploads stay fast and OCR-derived facts still require review.
- OCR provider configuration is now an admin-only `/dashboard` surface backed by D1 migration 0020, with encrypted credential storage using the external Cloudflare Pages secret `OCR_KEY`. Migration 0021 is applied remotely and adds OCR jobs, attempts, content-hash cache, and provider usage events; external OCR calls only run when an admin explicitly starts a dry-run or bounded batch.
- `src/lib/franchise-detail-assets.ts` has grown into a large mixed CSS/JS injection module. It is stable enough for the current production fixes, but should be split before the next major listing-detail feature pass.
- OCR operations now include provider config, encrypted scheduler config, batch-run orchestration, and worker draining. The first maintainability split is done: batch-run orchestration lives in `_ocr-batch-runs.js`, scheduler browser metadata lives in `dashboard-ocr-schedulers.js`, and the remaining runner/client modules should be split further only before adding deeper provider adapters or richer batch controls.
- OCR execution UX audit: OCR execution must not depend on an active browser tab. The main dashboard run CTA now prefers the persisted server-side scheduler batch when a scheduler is active, with the visible continuous dashboard loop kept only as a no-scheduler fallback that clearly warns admins to keep the tab open.
- OCR result sampling shows the extracted brochure text is rich enough for AI-assisted listing enrichment. The next product/data milestone is converting per-franchise OCR text into reviewed canonical field suggestions plus supplemental proposal insights for dynamic public tabs. See `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`.

## Refactor Candidates - 2026-07-08

| File / area | Why it is now a refactor candidate | Proposed split | Priority | Status |
| --- | --- | --- | --- | --- |
| `functions/_ocr-job-runner.js` | It had grown to own job enqueueing, dry-run, retry, no-text review, batch assignment, batch progress, image loading, provider failover, cache writes, quota/rate-limit guards, and proposal knowledge persistence. | Split batch creation/progress/retry into `_ocr-batch-runs.js`, dashboard retry/no-text job actions into `_ocr-job-actions.js`, and pending-job claiming/release/retry statements into `_ocr-job-claiming.js`. Keep provider processing, image loading, cache writes, proposal knowledge persistence, and OCR search/read-state orchestration in `_ocr-job-runner.js`. | High | Done |
| `js/dashboard-ocr.js` | It had grown to about 1,572 lines and owned provider credentials, scheduler credentials, job execution, server-side job filtering/pagination, grouped job/result rendering, batch progress/countdowns, row actions, autosave, and subtab behavior. | Split initial state, provider/scheduler rendering, job rendering, batch/countdown rendering, and OCR result rendering into `dashboard-ocr-state.js`, `dashboard-ocr-providers.js`, `dashboard-ocr-jobs.js`, `dashboard-ocr-results.js`, and `dashboard-ocr-batches.js`. `dashboard-ocr.js` remains the coordinator/facade for actions, autosave, active filter state, polling, and timers; defer deeper action-handler extraction until another OCR workflow is added. | High | Done |
| `js/dashboard-ocr.js` worker-cap UI | After the worker-cap/dashboard scheduler fixes, the OCR facade again owned a small worker usage renderer and reset countdown formatter. This was not a large risk, but it made the facade responsible for one more presentational concern. | Extract worker-cap rendering and reset-countdown text updates into `js/dashboard-ocr-worker.js`; keep `dashboard-ocr.js` responsible only for wiring the rendered worker chip into the job status area and running timer ticks. | Medium | Done |
| `src/pages/dashboard/index.astro` dashboard shell/OCR panel | The file is now about 914 lines. It still works as a static protected shell, but the OCR panel alone spans settings, scheduler credentials, job execution, filters, results, tooltips, and action copy across roughly 300 lines. This is not urgent runtime risk, but it slows review and makes future dashboard markup edits more error-prone. | Later split the dashboard shell into components, starting with `src/components/dashboard/OcrPanel.astro`, then premium operations and review/location panels if they keep changing. Keep the page as the route-level assembler that injects metadata and script order. | Medium | Planned |
| `functions/_ocr-scheduler-config.js` | It currently handles encrypted config and QStash dispatch. That is acceptable for one automatic provider but should not absorb every provider API. | Keep config CRUD in `_ocr-scheduler-config.js`; move provider-specific dispatch into `_ocr-scheduler-adapters.js` before adding cron-job.org API sync, Inngest, or Trigger.dev adapters. | Medium | Planned |

## Refactor Candidates - 2026-07-11

| File / area | Why it is now a refactor candidate | Proposed split | Priority | Status |
| --- | --- | --- | --- | --- |
| `functions/_ocr-job-runner.js` quota/cap section | The file remained about 1,300 lines after earlier extractions. Combined active-provider quota calculation, provider quota snapshots, optional worker safety-cap handling, reset-aware exhausted-provider re-entry, and per-provider quota guards had become an independent responsibility from job processing. | Extracted quota/cap helpers into `functions/_ocr-quota-policy.js`: `getOcrWorkerUsage`, provider quota snapshots, provider reset checks, `prepareQuota`, `nextQuotaReset`, and quota increment statement helpers. `_ocr-job-runner.js` now stays focused on job orchestration, image/cache/provider execution, and result persistence. | High | Done |
| `src/lib/ocr-provider-metadata.js` | Provider field rules and source-linked limit metadata now live in one shared object. This is good for avoiding UI/backend drift, but the object will grow as provider limit sources are refreshed or account-specific quota overrides are added. | If another provider/limit update is needed, split static limit metadata into `src/lib/ocr-provider-limits.js` while keeping credential field/requirement metadata in `ocr-provider-metadata.js`. | Medium | Planned |
| `css/dashboard-ocr.css` | The focused OCR stylesheet had grown to about 830 lines. It was isolated from the base dashboard CSS, but it owned provider settings, scheduler settings, execution controls, job cards, hover image previews, batch rows, result cards, and responsive rules. | Split into `dashboard-ocr-settings.css`, `dashboard-ocr-execution.css`, and `dashboard-ocr-results.css`, loaded after the base OCR shell stylesheet. Selector names were preserved and `pnpm run dashboard:ocr:check` covers the new load-order fragments. | Medium | Done |

## Refactor Candidates - 2026-07-12

| File / area | Why it is now a refactor candidate | Proposed split | Priority | Status |
| --- | --- | --- | --- | --- |
| `functions/_ocr-job-runner.js` result/read-state section | The file is still 1,143 lines after prior OCR extractions. This session wired the grouped enrichment queue into the dashboard read model, but the actual grouping/review logic lives in new `_ocr-enrichment-review.js`; result reads/search, row masking, and dashboard payload shaping still remain separate from provider execution. | Before adding another OCR dashboard result feature, extract read/search/mask helpers into `_ocr-results-read-model.js`; keep provider execution and job state transitions in `_ocr-job-runner.js`. | Medium | Planned |
| `js/dashboard-ocr.js` OCR action coordinator | The coordinator is 1,429 lines after routing created OCR bundles to the new Review OCR subtab. Presentation is already split into focused modules, but action handlers for provider settings, scheduler batches, job retries, result search, and enrichment creation still live together. | Before adding another OCR control workflow, extract action handlers into a small `dashboard-ocr-actions.js` helper while keeping `dashboard-ocr.js` as the state/timer/subtab facade. | Medium | Planned |
| `src/pages/dashboard/index.astro` dashboard shell | The route shell is 962 lines after adding the fourth OCR guide card, dedicated OCR Review subpanel, and full-width pending edit review table. The change improves layout without adding runtime logic, but the static shell remains large. | Before another dashboard layout feature, extract route sections into Astro components starting with `DashboardReviewPanel.astro` and `DashboardOcrPanel.astro`; keep this route as the assembler and script/style loader. | Medium | Planned |
| `js/dashboard-review.js` review renderer | The module is 625 lines after splitting document-derived suggestions from manual/staff review, improving field diff rendering, adding money/case formatting, and adding source-backed OCR evidence rows. It remains below the hard split threshold, but now owns quality, generic review, OCR/proposal review, claim review, and location editor rendering. | If another review/location workflow lands, extract pending review table/diff/evidence/value-format rendering into `dashboard-review-table.js` so the main module can stay focused on actions and panel wiring. | Medium | Planned |

## OCR Execution UX Audit - 2026-07-10

| Finding | Decision / implementation direction | Status |
| --- | --- | --- |
| `needs_review` mixed two meanings: provider could not extract enough text, and admin already confirmed the image has no useful text. | Add final `no_text` job status. Treat it as processed/skipped in batch progress, render it as `Tanpa teks`, and keep `needs_review` only for unresolved human review. | Implemented with migration `0026_ocr_no_text_status.sql` |
| Batch rows could remain `queued`/`running` after the scheduler due time passed, so Refresh looked ineffective. | Refresh active batch rows server-side on dashboard reads and mark overdue scheduler rows as failed with an actionable message: Retry scheduler or use dashboard continuous run. | Implemented |
| Browser-driven continuous OCR can be throttled or paused when the admin changes tab/window, so it is not reliable for long runs. | Make the main run button create a persisted server-side scheduler batch when any scheduler is active; keep the browser continuous loop only as an explicit fallback when no scheduler is active, and refresh dashboard status when the tab returns to foreground. | Implemented |
| Worker batches appeared to fail after 25 processed pages because the internal worker daily cap was lower than the intended 100-job dashboard batch. | Raise the default worker daily cap to 100, pause scoped batches as `paused_quota` when the cap is reached, and prime one chunk immediately from the dashboard after create/retry so clicks produce visible progress. | Implemented |
| Worker/provider quota was hidden until a batch failed or paused. | Surface worker cap/used/remaining/reset in the OCR job panel and make provider quota exhaustion copy tell admins to activate another provider or wait for reset. | Implemented |
| Multiple active OCR providers should increase throughput instead of only acting as a serial fallback. | Run bounded waves across active providers by rotating the first-choice provider per claimed job, while preserving the existing provider fallback and pause-on-rate-limit behavior. | Implemented |
| Per-row OCR retry is easier to trust than broad batch retry. | Keep row-level OCR action as immediate run for one failed/needs-review job. Do not show retry by default for final `no_text` rows; they are already resolved. | Implemented |
| Continuous dashboard OCR can be clicked from two admin tabs. | Add a short-lived D1-backed run lease. Continuous runs acquire the lease before chunking, refresh it through `run_ocr_jobs`, release it on completion/stop/error, and show the active owner if another tab/admin is running. | Implemented with migration `0027_ocr_run_leases.sql` |
| OCR.Space publicly allows 500 requests/day, but batch behavior still looked capped at 100 because worker capacity used an internal daily cap instead of actual provider quota. | Replace the hardcoded worker cap with combined active-provider quota, preserve individual provider quota checks before assignment, show per-provider limit details/source links in the dashboard, and keep `OCR_WORKER_DAILY_CAP` only as an optional safety cap. | Implemented with migration `0029_ocr_provider_actual_limits.sql` |

## OCR Listing Enrichment Audit - 2026-07-10

Source: read-only remote D1 sampling of `franchise_asset_knowledge` after OCR jobs had extracted 164 rows across 19 franchises. Dense samples included Gorillaz, Coolio Barbershop, NEC, Hydrophobic Lab, and Codero.

| Finding | Decision / implementation direction | Status |
| --- | --- | --- |
| OCR text now contains more than basic profile copy: package prices, include/exclude lists, projections, BEP/profit/royalty notes, location requirements, staffing, support/training, legal/company facts, proof/testimonials, and product/program lists. | Treat OCR as a source for structured listing enrichment, not just a text preview. Keep raw OCR separate from public display until reviewed. | Planned |
| Existing `franchises` columns can absorb many canonical facts, but brochure content also contains repeatable/section-specific data that does not fit one listing row. | Use canonical `listing_edit_suggestions` for existing fields, and add a supplemental `franchise_proposal_insights` table for reviewable package/projection/operational/support/product/legal/proof insights. | Planned |
| Extra canonical fields are useful, but too many first-step form questions would reduce franchisor completion. | Add canonical fields only for common, stable, comparable facts used by UI/filtering/comparison. Keep repeatable package/scenario/support/legal/proof data as supplemental insights. Use progressive disclosure in the franchisor form so follow-up questions appear only when the owner engages with the related baseline section or uploads a brochure that can be prefilled. | Planned |
| Current active `/daftar` franchisor markup was much slimmer than the preservation/schema docs and backend contract: only minimum capital/royalty were visible in the cost step, only full description was visible in the profile step, and only logo URL was visible in the media step. | Restored existing supported fields into a progressive 5-step form, added optional priority canonical fields (`min_area_sqm`, `min_staff_count`, `setup_duration_days`, `working_capital_idr`, `additional_cost_notes`, BEP/omzet/profit ranges), mapped them through backend/static generation, and rendered them conditionally on public detail pages. Detailed plan: `docs/forms/FRANCHISOR_PROGRESSIVE_FORM_PLAN.md`. | Implemented |
| Public tabs should not become cluttered or empty. | Render optional dynamic tabs only when approved content exists. Recommended first tabs: `Paket & Investasi`, richer `Proyeksi`, `Syarat Lokasi & Operasional`, `Dukungan Mitra`, `Produk/Layanan`, and conservative `Legal & Bukti`. | Planned |
| Deterministic extraction is too shallow for dense brochures. | Add an AI extraction job that groups all OCR pages for one franchise, returns strict JSON with source page/excerpt/confidence, validates with Zod, and stores pending-review candidates. Do not let AI directly overwrite canonical listing data. | Planned |
| Existing deterministic extraction missed many canonical candidate fields after the larger OCR backfill. | Expanded the shared proposal extractor for area/staff/setup, investment/fee/working-capital, contract, BEP range, omzet/profit, royalty basis/period, target-market, and support signals; added a replayable D1 backfill script; sanitized known source-noise watermarks from stored OCR text; remote replay increased candidate-bearing rows from 56 to 164 of 479 and now returns `changed=0`. | Implemented |
| One edit suggestion per OCR page would flood Review after structured replay. | Added a per-franchise OCR enrichment queue that groups structured candidates, keeps source page/excerpt/image context, skips already-filled canonical fields, title-cases short classification values, and creates one pending `ocr_enrichment_bundle` suggestion whose JSON payload contains the actual editable fields for normal admin approval. OCR Review now shows proposal/OCR-derived suggestions together, with source excerpts and brochure image hover previews per field. | Implemented |

## UX Actionability Audit - 2026-06-28

Principle: every blocked action should answer three questions in the UI: what happened, what the user should do next, and where to click to continue.

| Area | Finding | Required UX | Status |
| --- | --- | --- | --- |
| Public `/peluang-usaha` cards | Save action was rendered as a full text button beside `Info Franchise`, which competes with the primary detail CTA. | Use an icon-only save control on the image, with shared custom tooltip and no browser `title`. | Done |
| Public franchise detail save | If a logged-in user has not completed franchisee interest data, the save action only returned text: "Lengkapi minat usaha terlebih dahulu agar peluang bisa disimpan." | Show the message plus a direct CTA to `/daftar/?role=franchisee&continue=1&next=...` so the user can complete the needed form immediately. | Done |
| Profile opportunity inquiry/save API | Missing franchisee profile errors did not expose machine-readable next-action metadata to clients. | Return `action_url`, `action_label`, and `action_hint` for known recoverable states. | Done |
| Public save feedback renderer | Public save script rendered all errors as plain text. | Render safe inline CTA links when the API returns a next action. | Done |
| Project rule | No permanent rule forced warning/empty states to include next steps. | Add an `AGENTS.md` rule that blocked-action copy must be actionable and provide the easiest path forward. | Done |
| Public `/daftar` form submit | Submit failure still used a browser `alert()` with no inline recovery path. | Replace with inline feedback plus SweetAlert CTA; login-required errors link back to `/login/?next=...`. | Done |
| Public `/daftar` form success | Completing a profile from a save-opportunity CTA did not return users to the original franchise page. | Respect safe `next` query param after successful submit, otherwise go to `/profil/`. | Done |
| `/login` auth recovery states | Login-required messages and password reset states were mostly plain text. | Use CTA-backed auth messages for register, reset-code entry, and continuation links while preserving `next`. | Done |
| Wider codebase | Dashboard/admin/internal errors include technical or terse states, while public profile/auth/form flows have mixed quality. | Continue replacing public-facing blocked states with CTA-backed messages as those surfaces are touched. | Open |

## Dashboard Data Quality Upgrade - 2026-06-28

| Area | Upgrade | Status |
| --- | --- | --- |
| Normalized contacts | Added `franchise_contacts` migration plus contact normalization helpers for phone, WhatsApp, email, website, address, and social links. | Done |
| Persistent quality checks | Added `franchise_quality_checks`, dashboard refresh logic, persisted read path, and computed fallback before migration/refresh. | Done |
| Guided review edits | Replaced staff JSON diff input with guided field rows and changed pending admin review display to old/new values per field. | Done |
| Admin direct edits | Admin edit submissions already applied directly in the backend, but the dashboard copy looked staff-oriented. The edit panel now switches title/help/button state for admin so direct edits are clear. | Done |
| Shared schemas | Added shared Function schemas for dashboard decisions, editable listing fields, contact types, quality-check types, form submissions, `/get-franchises` query params, and listing field normalization. Added shared TypeScript schemas for CSV import rows and D1 static snapshot rows used by import/build/Astro paths. | Done |
| Remaining schema adoption | Active form payload, query, CSV import, build, and Astro static snapshot validation paths now use shared schema modules. Future new trust-boundary schemas should be added to the shared modules instead of redefined locally. | Closed |

## Premium Monetization Upgrade - 2026-06-28

| Area | Upgrade | Status |
| --- | --- | --- |
| Premium schema | Added `premium_orders`, `premium_payment_confirmations`, and `franchise_subscriptions` through migration `0009_premium_membership.sql`; applied and verified on remote D1. | Done |
| Public education page | Added `/premium/` as the franchisor-facing premium membership page with Rp 3.000.000/year pricing, network benefits, payment instructions, and direct CTAs. | Done |
| Franchisor self-service | Added `/profil` Membership tab for owned listings, unique transfer order creation, payment instructions, and payment confirmation submission. | Done |
| Admin review | Added dashboard pending premium payment review with admin approve/reject actions. Approval activates a one-year subscription, marks the listing premium, creates missing publication rows for the included network sites, publishes them, writes audit events, and queues rebuilds. | Done |
| Premium operations | Added `payment_methods`, optional QRIS image fields/upload, `premium_funnel_events`, `premium_notifications`, dashboard funnel/payment settings/notification views, owner Premium notifications, and `/premium` CTA tracking through migrations `0010_premium_operations.sql` and `0014_payment_method_qris_image.sql`; applied and verified on remote D1. | Done |
| Payment proof | Added protected receipt upload to R2 with image/PDF validation, confirmation attachment metadata, profile upload flow, and dashboard proof links. | Done |
| Readiness checks | Added owner/admin Premium readiness checks so incomplete listings are visible before or during Premium review. | Done |
| Public payment copy | `/premium` now sends users to `/profil/?tab=membership` to generate the current nominal and payment instructions instead of exposing payment-account details in static public copy. | Done |
| Renewal flow | Added a 30-day renewal window, renewal CTA in `/profil`, backend renewal order allowance, and approval logic that starts renewed subscriptions after the current term ends. | Done |
| Expiry operations | Dashboard Premium Operations now shows subscriptions ending soon so admins can follow up before lapse. | Done |
| Email queue foundation | Added `notification_email_queue`, applied and verified the migration on remote D1, and queued owner/admin payment emails for submitted, approved, and rejected Premium payments. | Done |
| Email worker delivery | Added Resend-backed `/premium-email-worker`, GitHub cron trigger, provider/attempt metadata, failed retry backoff, and admin retry/cancel controls in Premium Operations. Delivery requires manual Resend/DNS/secret setup before real emails are sent. | Done |
| Renewal reminders | Added 30/14/7/1-day reminder queueing and `premium_subscription_reminders` idempotency through migration `0012_premium_email_worker_guardrails.sql`; applied and verified on remote D1. | Done |
| Data guardrails | Added unique D1 guardrails for one active pending Premium order per listing/user/plan and one subscription per source order. Remote duplicate checks passed before migration. | Done |
| Grace downgrade | Added configurable grace-period settings with 3 days default, daily grace emails, downgrade to Free after grace, Premium network publication hiding, audit events, and rebuild queue writes. | Done |
| Annual reports | Added annual report records and queued report emails using product events/leads for listing views, saves, inquiries, contact clicks, and leads. | Done |
| Multi-brand discount | Added dashboard-managed discount settings and new order pricing that can discount yearly Premium for owners with multiple brands. Disabled by default. | Done |
| Event promo ribbon | Added dashboard-managed Premium event settings for temporary discount/bonus/ribbon campaigns, public `/premium-promo`, and a shared top bar script for public pages. Full price remains Rp 3.000.000/year by default. | Done |
| Stale Sheets workflow | Removed `.github/workflows/generate-pages.yaml` so the old Google Sheets auto-update/commit workflow cannot fight the current D1/Astro publish path. | Done |
| Automation gap | Bank transaction reading and automatic approval still need a provider/API decision and credential setup before implementation. | Open |

## Traffic Growth Surface - 2026-07-04

| Area | Upgrade | Status |
| --- | --- | --- |
| Capital directories | Added static `/peluang-usaha/modal/` and seven modal-range pages generated from D1 snapshot investment data, with SEO metadata, intro copy, filters, and internal directory links. | Done |
| Category landing pages | Added static `/peluang-usaha/kategori/` and per-category pages generated from D1 snapshot categories, replacing canonical category query links with indexable landing pages. | Done |
| City landing pages | Added static `/peluang-usaha/kota/` and city pages generated from supported city aliases in listing city/address/outlet/service-area text when enough listings match. | Done |
| Comparison | Added `/bandingkan/`, listing/detail compare buttons, localStorage selected ids, and a static comparison table for 2-4 brands. | Done |
| Buyer tools | Added `/alat-franchise/` with budget matcher, BEP calculator, and quick links into modal/category/city directories. | Done |
| Buyer qualification context | Budget matcher, BEP calculator, and comparison selections now store optional browser lead context, and logged-in inquiries attach that context to the lead raw payload. | Done |
| Promo measurement | Public promo ribbon views and CTA clicks now write coarse Premium funnel events with safe campaign metadata. | Done |
| Location data quality | Added `0016_franchise_location_metadata.sql`, `src/lib/franchise-location-normalization.ts`, and `scripts/sync-franchise-locations.ts`; remote D1 now has 45 normalized `locations` and 715 generated `franchise_locations` rows. Static city pages read `structured_locations` from D1 first and fall back to text inference. | Done |
| Location management UX | Added owner and admin Area Listing editors backed by `locations` and `franchise_locations`; manually managed rows use `source_field='owner_profile'`, override generated rows during static builds, write audit events, and enqueue public rebuilds. | Done |
| Location write maintainability | Extracted shared manual location normalization, deterministic id generation, D1 statement creation, and audit summary helpers into `functions/_location-writes.js`; profile and dashboard location actions now share the same write contract. | Done |

## Listing Detail Assets Refactor Plan - 2026-07-07

`src/lib/franchise-detail-assets.ts` now owns generated detail CSS, tab/bootstrap JavaScript, brochure reader behavior, comparison button behavior, and several unrelated layout concerns. This makes small brochure/UI changes harder to review and increases truncation/merge risk.

| Step | Target files | Scope | Status |
| --- | --- | --- | --- |
| 1 | `src/lib/franchise-detail-assets.ts` | Keep current behavior stable while reducing the injector to a small facade. | Done |
| 2 | `src/lib/franchise-detail-styles.ts` | Move the generated `<style>` string into a purpose-owned style module with named sections for tabs, facts, proposal reader, contact floats, and responsive rules. | Done |
| 3 | `src/lib/franchise-detail-scripts.ts` | Move injected browser JavaScript into a purpose-owned script module with focused functions for tabs, proposal reader/download, contact-tab opening, and compare buttons. | Done |
| 4 | `src/lib/franchise-proposal-reader.ts` | Extract proposal-reader markup/CSS/JS coordination once the server-side PDF route is production-verified. | Planned |
| 5 | Validation | Add a targeted static assertion that generated detail HTML still includes tabs, proposal controls, contact floats, and no legacy `analyticswp`/`admin-ajax` references. | Done |

Actionability checklist for future edits:
- [x] Public save card uses icon-only UI with shared tooltip.
- [x] Public save detail/card errors can render a direct CTA.
- [x] Missing franchisee profile API errors include next-action fields.
- [x] Permanent working rule added to `AGENTS.md`.
- [x] Replace remaining public form `alert()` feedback with inline/SweetAlert action CTAs.
- [x] Review `/login` and `/daftar` recovery states for direct `next` links after the next auth UI pass.
- [x] Remove static public payment-account details from `/premium`; route users to the action that generates current instructions.
- [x] Standardize touched public Premium/Profile copy away from technical/internal language.

## Dashboard CSS Refactor Plan - 2026-07-08

`css/dashboard.css` grew past 1,190 lines after Premium Operations, Review, location editing, OCR configuration, OCR job execution, and auth-debug/loading states. The file still works, but dashboard-specific surfaces now need clearer style ownership so future operational UI changes are easier to review.

| Step | Target files | Scope | Status |
| --- | --- | --- | --- |
| 1 | `css/dashboard.css` | Keep the dashboard shell/base styles: header, metrics, tabs, panels, forms, generic action buttons, tables, debug panel, and shared responsive rules. | Done |
| 2 | `css/dashboard-auth.css` | Extract auth-loading skeleton styles so login/loading state changes do not expand the base dashboard stylesheet. | Done |
| 3 | `css/dashboard-ocr.css` | Extract OCR guide cards, provider credential/status UI, job toolbar, icon-led job rows, OCR results, and OCR responsive rules. | Done |
| 4 | `css/dashboard-premium.css` | Extract Premium Operations payment/settings/funnel/notification/report styles. | Done |
| 5 | `css/dashboard-review.css` | Extract Review/Data Quality guided field editor, diff row, and Area Listing editor styles. | Done |
| 6 | `css/dashboard-operations.css` | Extract operations/admin helpers such as full-width panels, publication controls, and checkbox rows. | Done |
| 7 | Validation | Keep `pnpm run build`, `pnpm run dashboard:ocr:check`, and targeted client syntax checks as the minimum guard after dashboard CSS/module edits. | Done |

## Target Architecture

| Layer | Recommendation | Reason |
| --- | --- | --- |
| Framework | Astro with Cloudflare adapter. | Static-first public pages, islands for interactivity, Cloudflare bindings for dynamic routes. |
| Alternative | Next.js on Cloudflare via OpenNext. | Better if the dashboard becomes React-heavy, but higher migration/runtime complexity for this mostly static directory. |
| Database | Cloudflare D1 `franchise_db`. | Shared SQL source of truth for all owned network sites, users, listings, claims, leads, packages, locations, approval states, and audit logs. |
| Assets | Cloudflare R2. | Durable storage for logos, covers, galleries, proposals, and imported legacy assets. |
| Auth | Clerk. | Hosted auth, register/login, user identity, and server-side auth context for protected pages/functions. |
| Backend | Cloudflare Workers/Pages Functions or Astro server routes. | Use D1/R2 bindings instead of Google API secrets and Sheets fetches. |
| Styling | Existing CSS. | Preserve visual consistency and avoid adding a styling dependency. |
| Language | TypeScript by default for new app/backend/importer/schema work. | Compile-time safety for the migration while leaving untouched legacy JavaScript stable. |
| Validation | Zod at runtime trust boundaries. | Validate form payloads, query params, CSV/Sheets imports, Clerk webhooks, env/config, and admin actions before D1 writes. |
| Migrations | Source-controlled SQL migrations for every D1 schema change. | Keeps database evolution reviewable, repeatable, and recoverable. |
| Query layer | Start with explicit SQL migrations; add Drizzle when D1 route handlers need shared typed queries. | Drizzle supports Cloudflare D1 and is useful once route/dashboard query complexity grows. |
| Authorization | Clerk identity plus D1-authoritative roles. | Roles are `franchisee`, `franchisor`, `staff`, and `admin`; Clerk metadata is only a small UI hint. `admin` is the global elevated role, while `staff` is limited to staff-level operations. |

Official platform notes checked during this audit:
- Cloudflare Workers bindings expose D1/R2 and other resources through `env` without embedding service secrets in application code: https://developers.cloudflare.com/workers/runtime-apis/bindings/
- Cloudflare D1 is built for SQL access through Workers bindings: https://developers.cloudflare.com/d1/get-started/
- Cloudflare R2 is accessed from Workers through bucket bindings: https://developers.cloudflare.com/r2/api/workers/
- Astro supports Cloudflare adapter deployments and Cloudflare bindings for non-static routes: https://developers.cloudflare.com/workers/frameworks/framework-guides/astro/
- Clerk has an Astro SDK with middleware, server helpers, and locals access: https://clerk.com/docs/reference/astro/overview
- Clerk also has Next.js quickstarts if the project later chooses Next.js: https://clerk.com/docs/quickstarts/nextjs-pages-router

## Proposed D1 Data Model

Initial tables to replace the Sheets tabs:
- `users`: Clerk user id, email, display name, account status, profile status.
- `user_roles`: D1-authoritative role assignments for `franchisee`, `franchisor`, `staff`, and `admin`.
- `franchisees`: buyer profile fields currently captured by `franchiseeForm`.
- `franchisors`: owner/company profile tied to Clerk user id.
- `franchises`: canonical listing record with brand, category, status, verification tier, slug, owner id, source type.
- `franchise_claims`: claim requests from `UNCLAIMED` to owned listing, with review state and evidence.
- `franchise_packages`: package/investment variants and calculated minimum capital.
- `franchise_assets`: R2 object keys for logo, cover, gallery, proposal PDF, and ownership metadata.
- `franchise_leads`: franchisee inquiries/leads to franchisors.
- `locations`: city/region/location data for search/filtering.
- `audit_events`: important ownership, claim, publish, verification, and admin actions.

Keep the current form field names during migration where possible so the HTML/runtime contract can be mapped without losing data.

## Data Contract Decisions
- New app, backend, importer, and schema-adjacent code should be TypeScript.
- Zod schemas should define and validate all external payloads before they reach services or D1.
- D1 schema changes should be SQL migrations committed to the repository and applied locally before remote.
- Clerk authenticates the user, but D1 roles/permissions authorize actions.
- Drizzle is recommended when D1-backed Astro/server routes begin to accumulate shared queries; initial schema work can stay as explicit SQL migrations.
- `franchise_db` is shared across Franchisee.id, Franchisor.id, Franchise.id, Waralaba.id, Franchise.co.id, Waralaba.co.id, and future owned network sites.
- Canonical franchise data should live once in `franchises`; per-site visibility/slug/canonical behavior belongs in `franchise_site_publications`.
- Franchisor payment/network distribution should be modeled through `subscriptions` and `subscription_site_entitlements`, so one paid listing can appear across multiple sites.
- Google Sheets is archive/import-only from this point forward; new writes should go to D1.

## Route Plan

Public routes:
- `/`: existing homepage shell, later rebuilt as Astro page.
- `/peluang-usaha/`: canonical searchable franchise directory with query-param states for search, recommendation/popular/alphabetical/category sorting, status filtering, and category filtering.
- `/peluang-usaha/[slug]`: franchise detail page with SEO metadata, self-contained tabs, CSS-only missing-logo placeholders, public imported contact/address display when available, and claim CTA; physical generated files should be flat `/peluang-usaha/[slug].html`.
- `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/kategori/[slug]`, `/category/[slug]`, and top-level category slugs: redirect-only compatibility URLs to `/peluang-usaha` query-param states.
- `/tag/[slug]/`, article/static pages: migrate gradually from static export.

Auth routes:
- `/login`: Custom Clerk sign-in/sign-up surface. Login, daftar, and verification panels must be mutually exclusive, with inline links for switching between login and registration.
- `/register`: role-selection and Clerk sign-up surface.
- Google OAuth: supported in custom auth UI. Public Google registration stores the selected franchisee/franchisor role across redirect, but profile/listing completion remains required before the account is operationally complete.
- `/daftar`: preserve current registration route during transition, then split into role-specific onboarding.

Dashboard routes:
- `/dashboard`: Franchisee.id admin/staff operations shell and internal login surface. Unauthenticated users see a login-only Clerk form on the same URL; operational panels stay hidden until `/dashboard-data` authorizes a D1 `staff` or elevated `admin` role.
- `/franchisee`: franchisee dashboard, saved opportunities, inquiries, profile.
- `/franchisor`: franchisor dashboard, listings, claim status, leads, assets.
- `/franchisor/listings/new`: create listing.
- `/franchisor/listings/[id]/edit`: edit listing.
- `/admin`: moderation, claim review, verification, data import tools.
- `DASHBOARD.md`: planning source for admin/staff overview, unclaimed outreach, claim review, listing operations, data quality, publishing, leads, and system health.

API/server routes:
- `POST /api/franchisees`: create/update franchisee profile.
- `POST /api/franchisors`: create/update franchisor profile.
- `POST /api/franchises`: create listing draft.
- `PATCH /api/franchises/[id]`: update listing draft/publish state.
- `POST /api/claims`: submit claim request.
- `POST /api/assets/upload-url`: issue R2 upload intent or direct upload endpoint.
- `GET /api/franchises`: directory search/filter endpoint backed by D1.

## Migration Phases

| Phase | Status | Scope |
| --- | --- | --- |
| 0. Documentation baseline | Done | Root docs are centralized around `AGENTS.md`, `CODEBASE.md`, `AUDIT.md`, and `docs/README.md`; long form references moved under `docs/`; session continuity uses timestamped `.context` notes. Future docs cleanup is ongoing maintenance, not a blocking migration phase. |
| 1. Data contract design | Done | Shared-network D1 migrations, TypeScript/Zod importer validation, shared Function schemas, shared TypeScript snapshot schemas, profile/dashboard/form schemas, and committed SQL migration workflow are implemented. Future trust-boundary schemas should be added to the shared modules as normal feature work. |
| 2. Cloudflare project config | Done | `wrangler.toml` points to `franchise_db`, declares Pages output `dist`, keeps unsupported `account_id` out of config, uses D1/R2 bindings, and R2 production custom domain is `https://assets.franchisee.id`. Migrations are applied through committed SQL and sequential `cfman`/Wrangler operations. Production Pages settings remain an operations checklist item. |
| 3. Import pipeline | Done | `scripts/import-csv-to-d1.ts` imports CSV snapshots into D1, preserves `UNCLAIMED` sanitization and stable slugs, completed the first remote import, and runtime reads use D1 first through `/get-franchises`. Google Sheets/CSV is archive/import-only transition behavior. |
| 4. Auth foundation | Done | Custom Clerk email/password and Google login/register surfaces, shared created-session activation before redirect, OAuth callback finalization before session checks, `/auth-config`, `/auth-sync`, `/clerk-webhook`, `/user-role`, `/sync-clerk-metadata`, D1 user mapping, email-based pre-login role grants, D1-to-Clerk metadata snapshots, and D1 role checks are implemented. Production account-linking/OAuth QA remains an operations checklist item. |
| 5. Form API replacement | Done | `/form-submit` performs D1-only writes for franchisee, franchisor, claim, and dev test-data actions with Clerk session verification, D1 role checks, owner fields, actor audit events, static rebuild enqueueing, progressive franchisor canonical fields, and shared runtime validation. Production form smoke tests remain an operations checklist item. |
| 6. Asset pipeline | Done | Protected R2 uploads are implemented for owner listing media and Premium receipt proofs, with D1 `franchise_assets` ownership metadata and public URLs from the R2 custom domain. Legacy Blogspot proposal image backfill was applied for 34 franchises / 491 proposal page images, preserving source URLs in `franchise_assets` and replacing `franchises.proposal_url` with first-party `assets.franchisee.id` URLs. Optional gallery backfill is future enrichment, not a blocking migration phase. |
| 7. Public directory rebuild | Done | D1-backed sync refreshes the Astro snapshot and claim-search JSON by default without rewriting root bridge HTML; Astro static routes generate canonical `/peluang-usaha`, flat detail pages, capital/category/city routes, CSS-only image placeholders, readable yellow/category chip states, self-contained detail tabs, parsed public contact data for unclaimed listings, all-caps description presentation normalization, cleaned metadata, and redirect-only compatibility for old directory/category archives; build then copies legacy static assets/pages without overwriting Astro output. Explicit bridge regeneration remains available through `pnpm run build:d1:franchises:bridge`. |
| 8. D1-to-static publish automation | Done | D1 dirty queue tables, enqueue helpers, `/form-submit`, `/profile-data`, `/profile-upload`, dashboard approvals/publication changes, Premium lifecycle writes, the 30-minute GitHub Actions poller, deploy-hook publishing, guardrails, direct deploy fallback, and stale Google Sheets workflow removal are implemented. Production dirty-to-build verification and alerting remain operations checklist items. |
| 9. Dashboards | Done | `/dashboard` and `/dashboard-data` implement the Franchisee.id admin/staff MVP plus admin-only OCR configuration and job controls: protected metrics, outreach, quality/review, Premium/publication operations, traffic guardrail, masked OCR credential management, OCR enqueue/run status, system health, audit writes, and rebuild queue writes. Future network-wide dashboard expansion belongs in `DASHBOARD.md`. |
| 10. Premium monetization | Done | The manual premium membership path is implemented from `PREMIUM_MONETIZATION_PLAN.md`: `/premium` public sales page, D1 premium order/payment/subscription tables, profile membership tab, unique-code transfer instructions, receipt uploads, admin payment review, premium activation/renewal, admin-managed payment methods/settings, readiness checks, funnel analytics, owner/admin notifications, queued/sent payment emails through Resend, grace-period downgrade behavior, annual report queueing, configurable multi-brand discounts, creation/publication of included network site rows, audit logging, and rebuild queueing. Automated payment matching is a future provider/API decision, not a blocking manual Premium milestone. |
| 11. Decommission Sheets dependency | Pending | Freeze or remove Sheets writes, keep optional import/export admin tooling only. |

## Long File Refactor Tracker

Current maintained code hotspots by line count, excluding generated legacy HTML and copied build output:

| File | Approx. lines | Risk | Refactor direction | Status |
| --- | ---: | --- | --- | --- |
| `js/profile-page.js` | 777 after profile module split and location action wiring | Profile client now acts as `/profil` boot/controller facade for auth, data load, tab routing, submit/fetch workflows, media upload, lead status, payment/inquiry actions, and small payload parsers for profile forms. Account, role add-on, franchisee, franchisor/listing/claims, Premium membership, leads, saved-opportunity storage, and shared UI helpers were extracted. | Next extraction: split remaining submit/fetch workflows and payload parsers if new profile features grow this file again. | Extracted; watch |
| `functions/profile-data.js` | 92 after read-model split | Profile API facade owns auth/error handling and POST dispatch only. GET response composition, read-model loader callbacks, Zod schemas, shared response utilities, account/role actions, franchisee actions, franchisor/listing/lead actions, recommendation scoring, listing patch construction, and Premium workflows are delegated to helper modules. | Keep as the endpoint router/facade. Add smoke tests before new profile feature batches. | Extracted |
| `src/lib/franchise-static.ts` | 499 after static helper splits | Astro-side renderer now keeps route-facing snapshot loading, directory/detail composition, SEO/detail enhancements, and template orchestration. Text helpers live in `src/lib/franchise-text.ts`, Premium detail helpers in `src/lib/franchise-premium-detail.ts`, contact rendering/parsing in `src/lib/franchise-contact.ts`, ranking in `src/lib/franchise-ranking.ts`, category route helpers in `src/lib/franchise-category.ts`, and generated assets in `src/lib/franchise-static-assets.ts` / `src/lib/franchise-detail-assets.ts`. | Keep as the public static-renderer facade; extract renderer markup only if future listing/detail features push it back above the long-file threshold. | Extracted |
| `css/profile.css` | 773 after profile CSS split; modules: `css/profile-premium.css` 216, `css/profile-franchisor.css` 222, `css/profile-analytics.css` 67 | Base profile styling now owns shell layout, account/forms, role prompts, franchisee opportunity cards, shared chips/lists/notices/buttons, and base responsive behavior. Premium, franchisor/location/media/leads, and analytics styles moved to focused modules. | Keep base/global profile styles here; add domain-specific styling to the matching profile CSS module loaded after the base stylesheet. | Extracted |
| `functions/_premium-ops.js` | 5 after Premium operations split | Compatibility facade for existing Premium operation imports. Settings/pricing/promo, notifications/email queue/events, lifecycle/reporting, readiness, and utility helpers now live in focused modules. | Keep as re-export facade until callers are gradually moved to focused modules. | Extracted |
| `functions/_premium-settings.js` | 218 | Owns payment method fallbacks, admin-managed Premium settings, multi-brand discount pricing, and public promo ribbon settings. | Keep pricing/settings/promo changes here instead of growing the facade. | Extracted |
| `functions/_premium-notifications.js` | 240 | Owns Premium funnel events, owner/admin in-app notifications, queued email writes, queue summaries, and notification feeds. | Keep event/notification/email-queue changes here. | Extracted |
| `functions/_premium-lifecycle.js` | 461 | Owns expiring subscription reads, renewal reminders, annual report queueing, grace-period emails, expiry downgrade, and rebuild queueing after grace. | Split further only if lifecycle rules expand beyond renewal/grace/reporting. | Extracted |
| `functions/_premium-readiness.js` | 28 | Owns listing readiness scoring for Premium review and owner Membership UI. | Keep readiness criteria here. | Extracted |
| `functions/_premium-ops-utils.js` | 55 | Owns Premium operation text, id, JSON, date, number, HTML escaping, and safe query helpers. | Keep generic helpers small; do not turn it into a catch-all workflow module. | Extracted |
| `js/auth-clerk.js` | 415 after core split; `js/auth-clerk-core.js` 441 | Auth UI facade now owns auth page mounting, form event binding, login/register/password-reset/OAuth button handlers, session-state rendering, and message/tab UI coordination. Clerk config/script loading, Clerk instance load, OAuth callback finalization, pending role/next storage, `/auth-sync`, token/header helpers, signed-in guard, and URL cleanup live in `js/auth-clerk-core.js`. | Keep route load order as debug, UI, core, then facade; future auth changes should go into core only when they affect session/bootstrap behavior. | Extracted |
| `functions/dashboard-data.js` | 96 after split | Endpoint is now a thin router for auth, action dispatch, response shaping, and imported dashboard modules. | Keep schemas in `_dashboard-schemas.js`, reads in `_dashboard-queries.js`, writes in `_dashboard-actions.js`, and shared helpers in `_dashboard-utils.js`. | Extracted |
| `functions/_ocr-job-runner.js` | 1,143 after OCR action/claiming/quota splits; new enrichment module: `_ocr-enrichment-review.js` 322 | Runner remains above 900 lines because it still owns provider execution, image loading, cache writes, proposal knowledge persistence, and OCR search/read-state orchestration. Dashboard retry/no-text actions, pending-job claiming/release, quota policy, and grouped enrichment review are now extracted. | Keep this as the OCR execution orchestrator for now. Next split, only if OCR grows again: OCR search/read-state queries into `_ocr-results-read-model.js`. The enrichment module is small and not a refactor target. | Extracted; watch |
| `functions/_dashboard-schemas.js` | 146 after OCR schema split | Dashboard action union and shared editable-listing write helpers. OCR action schemas moved out so this file stays a dashboard-wide contract facade. | Keep cross-dashboard schemas here; put feature-specific schema clusters in matching modules when a domain adds several actions. | Extracted |
| `functions/_dashboard-ocr-schemas.js` | 85 | OCR provider/job dashboard action validation: provider keys, credential limits, OCR execution bounds, retry, and no-text resolution actions. | Keep OCR action validation here while provider metadata remains in `src/lib/ocr-provider-metadata.js`. | Extracted |
| `scripts/build-d1-franchise-pages.ts` | 422 after progressive-field query and bridge-write gating; `scripts/d1-page-renderer.ts` 332 | Builder facade now owns CLI args, D1 HTTP/Wrangler/JSON row loading, snapshot/claim-search writes, explicit bridge-page/manifest writes, generated-page pruning, and stats printing. Pure card/detail rendering, canonicalization, sorting, hashing, stable JSON, and HTML cleanup live in `scripts/d1-page-renderer.ts`. | Keep D1 access/orchestration in the facade and keep rendering/hash helpers in the renderer module; default builds should not dirty root generated HTML. | Extracted |
| `scripts/import-csv-to-d1.ts` | 337 after utility split; `scripts/import-csv-utils.ts` 347 | Importer facade now owns CLI args, import plan orchestration, row schema validation, franchisor/unclaimed/franchisee field mapping, warning collection, and stats printing. Quote-aware CSV parsing/loading, SQL serialization/builders, package/publication/legacy-source builders, remote apply, stable id/hash, slug/normalization helpers, and claim filters live in `scripts/import-csv-utils.ts`. | Keep row mapping close to the importer facade and share only reusable parse/SQL/normalization primitives through the utility module. | Extracted |
| `functions/_dashboard-queries.js` | 695 | Dashboard read model handles overview, outreach, quality, claims, premium, editable listings with structured locations, publications, leads, health, telemetry, and audit summaries. | Split read domains if new dashboard features continue to grow the file: `_dashboard-query-premium.js`, `_dashboard-query-quality.js`, `_dashboard-query-publication.js`, and `_dashboard-query-listings.js`. | Watch |
| `src/lib/franchise-static-assets.ts` | 552 after detail asset split | Helper owns directory injected CSS/JS plus CSS-only missing-image placeholders used by listing cards, category cards, and detail fallbacks. Detail CSS/JS moved to `src/lib/franchise-detail-assets.ts`. | Keep directory-only assets here; later move literal CSS into owned static CSS assets if generated pages can depend on shared assets without SEO/rendering regressions. | Extracted |
| `src/lib/franchise-detail-assets.ts` | 703 | Detail-page generated CSS/JS module. Owns detail tab behavior, contact/detail styling, Premium CTA/gallery/proposal/FAQ styling, and browser proposal PDF helper. | Split generated detail CSS and browser proposal PDF script only after deployed detail QA proves shared static asset routing/cache behavior is safe. | Watch |
| `functions/form-submit.js` | 74 after workflow split; modules: `_form-submit-franchisee.js` 56, `_form-submit-franchisor.js` 206, `_form-submit-test-actions.js` 113, `_form-submit-utils.js` 204 | Form API endpoint is now a thin D1/auth/validation/telemetry router. Franchisee, franchisor/claim, dev test-data, duplicate checks, claim source lookup, slug generation, rebuild queueing, audit/legacy helpers, normalization, and JSON responses live in focused modules. | Keep endpoint routing/auth in `functions/form-submit.js`; put workflow writes in the matching form-submit module. | Extracted |
| `functions/_dashboard-actions.js` | 646 after shared location-write extraction | Dashboard writes cover outreach, guided edits, quality refresh, claims, publication, Premium settings/email/payment, audit, and rebuild queueing. Location normalization/write statement creation now lives in `functions/_location-writes.js`. | Split only when action growth resumes; likely `_dashboard-action-premium.js` and `_dashboard-action-review.js`. | Watch |
| `js/dashboard-admin.js` | 279 after dashboard operations split | Dashboard client now owns auth/debug, tab control, dashboard fetch/reload, status, metrics, and module orchestration. Shared render utilities, Premium Operations, Review/Data Quality/Claim workflows, Outreach/Publications/Premium payment review/Leads/Health workflows were extracted. | Keep this as the dashboard boot/tabs/status facade unless auth core is later split. | Extracted |
| `js/dashboard-utils.js` | 118 | Owns dashboard HTML escaping, currency formatting, form-value writes, and icon-only action toolbar/button/link render helpers used by dashboard modules. | Keep generic browser-only dashboard helpers here instead of duplicating escape/action markup across panel modules. | Extracted |
| `js/dashboard-premium-operations.js` | 281 | Owns Premium Operations rendering, managed payment/settings form submission, and queued-email retry/cancel actions. | Keep Premium-specific dashboard growth outside the core dashboard boot/controller file. | Extracted |
| `js/dashboard-review.js` | 625 | Owns Data Quality rendering, claim review rendering/actions, guided listing edit rows, admin location editor, edit suggestion submission, document/manual suggestion routing, review value formatting, OCR evidence diff rendering, and edit/claim/location actions. | Keep future review/data-quality/location workflow changes here instead of growing `js/dashboard-admin.js`; split pending review table/diff/evidence/value formatting out if this crosses 700 lines. | Extracted; watch |
| `js/dashboard-operations.js` | 265 | Owns Outreach rendering/logging, pending Premium payment review controls, publication status controls, lead summary, and system health rendering. | Keep operational dashboard workflow growth outside `js/dashboard-admin.js`. | Extracted |
| `js/profile-ui-utils.js` | 170 | Owns shared profile HTML escaping, form field render helpers, empty states, Rupiah formatting, status labels, Clerk account helper copy, and form busy/message utilities. | Keep small reusable profile UI helpers here instead of adding them back to `js/profile-page.js`. | Extracted |
| `js/profile-account.js` | 113 | Owns account tab rendering for name/email granular edit controls and password add/change UI. | Account submit/password submit workflows remain in `js/profile-page.js` until action handlers are split. | Extracted |
| `js/profile-roles.js` | 94 | Owns missing-role CTA cards and confirmation modal rendering. | Role add POST workflow remains in `js/profile-page.js`. | Extracted |
| `js/profile-leads.js` | 71 | Owns franchisor lead list/card rendering and status select markup. | Lead status POST workflow remains in `js/profile-page.js`. | Extracted |
| `js/profile-opportunities.js` | 108 | Owns local saved-opportunity storage, local/server merge, lookup, and inquiry-history lookup helpers. | Server sync and save/remove POST workflow remain in `js/profile-page.js`. | Extracted |
| `js/profile-franchisee.js` | 114 | Owns Minat Usaha and Peluang Saya rendering, including opportunity cards and inquiry history. | Keep API action workflows in `js/profile-page.js`. | Extracted |
| `js/profile-franchisor.js` | 219 | Owns Data Brand, Listing Brand, distribution chips, owner Area Listing editor, media upload controls, and claim history rendering. | Keep upload/save workflows in `js/profile-page.js`. | Extracted |
| `functions/_profile-schemas.js` | 143 | Owns `/profile-data` mutation schemas, including account/profile/listing/location/role/inquiry/saved-opportunity/lead/Premium actions. | Keep payload validation here for new profile actions. | Extracted |
| `functions/_profile-utils.js` | 85 | Owns JSON responses, validation error response, D1 binding check, audit statement helper, normalization, id generation, and Clerk name/email helpers. | Reuse from profile API modules instead of duplicating response/normalization helpers. | Extracted |
| `functions/_profile-account.js` | 83 | Owns Clerk+D1 account identity updates and additive public franchisee/franchisor role assignment. | Keep D1 authorization in `/profile-data`; do not add admin/staff self-service roles here. | Extracted |
| `functions/_profile-franchisee-actions.js` | 236 | Owns franchisee profile edits, inquiry creation, saved opportunity save/remove actions, missing-profile CTA metadata, and product-event writes. | Loader callbacks now come from `functions/_profile-read-model.js`; keep action writes here. | Extracted |
| `functions/_profile-franchisor-actions.js` | Profile franchisor/listing/lead action module | Owns franchisor profile edits, owner listing edit throttling, owner listing location overrides, rebuild queueing, owned publication distribution/location reads, franchisor lead inbox reads, and lead status updates. Location normalization/write statement creation now lives in `functions/_location-writes.js`. | Keep D1 authorization in `/profile-data`; use `_profile-listing-patch.js` for allowed listing field changes. | Extracted |
| `functions/_location-writes.js` | 83 | Owns manual location normalization, deterministic ids, D1 replace/insert statement creation, and compact audit summaries for profile/dashboard owner-admin Area Listing saves. | Keep write-contract changes here so profile and dashboard location actions do not drift. | Extracted |
| `functions/_profile-read-model.js` | 246 | Owns `/profile-data` GET payload composition, user/profile/listing/structured-location/claim/recommendation/saved/inquiry/lead/premium reads, and franchisee loader callbacks. | Keep response keys stable for `/profil`; add smoke tests around this contract before new profile features. | Extracted |
| `functions/_profile-recommendations.js` | 120 | Owns franchisee recommendation query, budget fit, interest matching, analytics-weighted scoring, and reason labels. | Keep recommendation algorithm changes here. | Extracted |
| `functions/_profile-listing-patch.js` | 62 | Owns listing editable field extraction, typed normalization, and SQL update statement construction. | Keep owner listing patch changes here. | Extracted |
| `src/lib/franchise-text.ts` | 249 | Owns display text normalization, URL normalization, escaping, truncation, paragraph rendering, Rupiah formatting, slugify, and generated HTML cleanup/link canonicalization. | Continue splitting contact/ranking/category helpers only after build output remains stable. | Extracted |

Refactor rule: prefer behavior-preserving extraction with validation after each step. Do not combine extraction with feature changes unless the feature needs the boundary.

### Large File Refactor Plans Over 900 Lines

These are the files currently above 900 lines and already planned for refactor. Each split should be behavior-preserving first, then followed by focused validation. Do not change public copy, API contracts, or generated HTML intentionally during these extractions.

#### `css/profile.css` - Target Stylesheet Modules

| Target file | Move from `css/profile.css` | Keep in base stylesheet | Validation |
| --- | --- | --- | --- |
| `css/profile-premium.css` | Premium membership card, Premium benefit/price grid, payment instruction box, QRIS display, readiness checklist, Premium notifications, and related responsive rules. Implemented. | Global profile shell, tabs, panels, form fields, buttons, notices, account rows, role add-on/modal styles, franchisee opportunity cards, and generic chip/list helpers. | `/profil` keeps the Membership tab layout, payment details, QRIS image, readiness checklist, and mobile stacking after the stylesheet split. |
| `css/profile-analytics.css` | Owner analytics summary card icon treatment, analytics listing cards, metric grid, and metric text styling. Implemented. | Shared summary/stat card base styles remain in `css/profile.css` because non-analytics panels reuse them. | Owner analytics tab keeps the same card spacing, icon color, and metric grid. |
| `css/profile-franchisor.css` | Franchisor publication distribution chips, owner Area Listing editor, listing selector, media upload controls, lead inbox cards/status controls, and related responsive rules. Implemented. | Shared `fr-profile-chip-row`, generic empty/list text, account identity lock notes, and public opportunity-card styles remain in `css/profile.css` unless a later split needs them. | Data Brand, Listing Brand, Area Listing, media upload, claims, and Leads tabs keep current layout and controls. |

#### `js/auth-clerk.js` - Target Browser Modules

| Target file | Move from `js/auth-clerk.js` | Keep in facade | Validation |
| --- | --- | --- | --- |
| `js/auth-clerk-core.js` | Clerk publishable-key config, script fallback loading, Clerk instance load, OAuth callback finalization, pending role/next session storage, `/auth-sync`, token/header helpers, signed-in guard, and URL cleanup helpers. | Auth page mounting, form event binding, login/register/password-reset/OAuth button handlers, session-state rendering, and message/tab UI coordination stay in `js/auth-clerk.js`. | Auth-enabled pages load `auth-clerk-debug.js`, `auth-clerk-ui.js`, `auth-clerk-core.js`, then `auth-clerk.js`; `window.FranchiseAuth` API remains compatible. |

#### `scripts/build-d1-franchise-pages.ts` - Target Script Modules

| Target file | Move from `scripts/build-d1-franchise-pages.ts` | Keep in facade/orchestrator | Validation |
| --- | --- | --- | --- |
| `scripts/d1-page-renderer.ts` | Pure listing card rendering, detail-page token replacement, JSON-LD/breadcrumb/sticky/disclaimer/tab/contact markup, sort comparator, generated HTML normalization, legacy link canonicalization, hash/stable JSON helpers, and rendering text helpers. | CLI args, D1 HTTP/Wrangler/JSON row loading, snapshot/claim-search writes, optional bridge manifest/write/prune behavior, and stats printing. | `pnpm run build:d1:franchises:dry` validates bridge rendering in memory; `pnpm run build` must not dirty root generated bridge HTML unless the explicit bridge writer is used. |

#### `scripts/import-csv-to-d1.ts` - Target Script Modules

| Target file | Move from `scripts/import-csv-to-d1.ts` | Keep in facade/orchestrator | Validation |
| --- | --- | --- | --- |
| `scripts/import-csv-utils.ts` | Quote-aware CSV parsing/loading, SQL `insert`/`update`/raw value serialization, package/publication/legacy-source builders, stats creation, remote apply helper, stable id/hash, slug/normalization helpers, and claim-search row filters. | CLI args, import plan orchestration, row schema validation, franchisor/unclaimed/franchisee field mapping, warning collection, and final stats printing. | `pnpm run import:csv:dry` still parses current CSV snapshots and reports the same high-level counts. |

#### `functions/form-submit.js` - Target API Modules

| Target file | Move from `functions/form-submit.js` | Keep in endpoint router | Validation |
| --- | --- | --- | --- |
| `functions/_form-submit-franchisee.js` | Franchisee duplicate check and franchisee profile/legacy/audit D1 batch write. | D1 binding check, base/form-type validation, Clerk/D1 role authorization, auth error handling, telemetry, and JSON dispatch. | Form API syntax check and form-submit handler tests keep franchisee submit behavior unchanged. |
| `functions/_form-submit-franchisor.js` | Franchisor free listing submit, claim conversion, package/publication/claim writes, duplicate checks, claim source lookup, slug uniqueness, and rebuild queueing for public-page changes. | Role authorization and schema selection stay in `functions/form-submit.js`. | Existing franchisor and claim write paths keep D1 ownership/audit/rebuild behavior. |
| `functions/_form-submit-test-actions.js` | Staff-only create-unclaimed and clear-test-data workflows. | Staff role check and `test_action` routing stay in `functions/form-submit.js`. | Dev/test-data buttons keep working without exposing anonymous writes. |
| `functions/_form-submit-utils.js` | Shared payload cleaning, normalization, money/int parsing, SQL/audit/legacy helpers, id generation, Jakarta timestamp, validation/duplicate/json responses. | Endpoint-specific response routing and telemetry stay in `functions/form-submit.js`. | Astro/static build plus future mocked-D1 handler smoke tests validate endpoint/helper wiring. |

#### `js/profile-page.js` - Target Browser Modules

| Target file | Move from `js/profile-page.js` | Keep in facade | Validation |
| --- | --- | --- | --- |
| `js/profile-ui-utils.js` | `emptyState`, `emptyInline`, `field`, `textarea`, `readonlyIdentity`, `roleBadges`, `formatRupiah`, `formatFullRupiah`, `setBusy`, `setMessage`, `errorBox`, `attr`, `escapeHtml`, status labels, and Clerk account helper copy. Implemented. | Shared `state`, `loadProfile`, `render`, root event delegation, and API post helpers stay in `profile-page.js`. | Astro/static build plus `/profil` QA should confirm account/franchisee/franchisor/membership tabs still render. |
| `js/profile-account.js` | `accountPanel`, `accountFieldForm`, `passwordEditForm`. Implemented. | Click/submit event routing and `submitPasswordForm` stay in `profile-page.js` first. Summary stays in facade because it depends on role/tab orchestration. | Account edit/password controls keep current Clerk behavior. |
| `js/profile-franchisee.js` | `franchiseePanel`, `opportunitiesPanel`, `opportunityCard`, `submitFranchiseInquiry` if this file grows again. | Saved opportunity storage/merge/lookup moved to `js/profile-opportunities.js`; API auth headers and `loadProfile` reload remain centralized. | Saved opportunities still migrate local-to-D1, save/remove, and inquiry CTA still posts. |
| `js/profile-franchisor.js` | `franchisorPanel`, `listingPanel`, `publicationDistribution`, `mediaUploadControl`, `claimsPanel`, `uploadListingMedia`, `updateLeadStatus`, `selectedListing` if this file grows again. | `leadsPanel` and `leadCard` moved to `js/profile-leads.js`; status/WhatsApp helpers moved to `js/profile-ui-utils.js`. | Listing selector, R2 media upload, lead status update, and claim display remain unchanged. |
| `js/profile-premium.js` | `membershipPanel`, `premiumNotificationsBlock`, `premiumReadinessBlock`, `premiumUpgradeBlock`, `premiumPaymentBlock`, `premiumConfirmationForm`, `activePremiumBlock`, active subscription/date/status helpers. Implemented in the existing Premium helper. | `createPremiumOrder`, `submitPremiumConfirmation`, receipt upload, and membership state refresh stay in `profile-page.js`. | Membership tab still creates orders, uploads proof, submits confirmation, and shows discounts/readiness/notifications. |
| `js/profile-roles.js` | Missing-role CTA cards and confirmation modal. Implemented. | `submitPublicRoleAdd` stays in `profile-page.js`. | Additive franchisee/franchisor role flow keeps the same redirect behavior. |
| `js/profile-leads.js` | Lead list/card rendering. Implemented. | `updateLeadStatus` stays in `profile-page.js`. | Lead contact shortcuts and status select markup remain unchanged. |
| `js/profile-analytics.js` | Owner analytics panel rendering. Implemented. | Analytics tab wiring and profile data reload stay in `profile-page.js`. | Franchisor/admin/staff users can see 30-day and total listing performance without expanding the profile controller. |
| `js/profile-opportunities.js` | Local saved-opportunity storage/merge/lookup helpers. Implemented. | Server sync, inquiry submit, and opportunity card rendering stay in `profile-page.js`. | Existing local-to-D1 saved opportunity migration keeps working. |

Recommended order:
1. Extract `profile-ui-utils` first because it has the least state coupling.
2. Extract `profile-membership` second because Premium helpers already have a partial boundary.
3. Extract account, then franchisee, then franchisor panels.
4. Only after panel extraction should root event delegation be split.

#### `functions/profile-data.js` - Target API Modules

| Target file | Move from `functions/profile-data.js` | Keep in facade | Validation |
| --- | --- | --- | --- |
| `functions/_profile-schemas.js` | `AccountSchema`, `FranchiseeProfileSchema`, `FranchisorProfileSchema`, `ListingSchema`, role/inquiry/save/lead schemas, `MutationSchema`, and scalar helpers `optionalText`, `optionalInt`, `optionalNumber`, `optionalMoney`. Implemented. | `onRequestGet` and `onRequestPost` stay in facade. | `pnpm exec tsc --noEmit`; invalid payload still returns same validation response shape. |
| `functions/_profile-account.js` | `updateAccount`, `addPublicRole`, `splitDisplayName`, `getPrimaryEmail`, Clerk metadata sync calls specific to account/role writes. | D1 auth via `requireD1User` remains in endpoint facade. | Account name/email update still updates Clerk then D1; public role add-on still redirects clients through existing response. |
| `functions/_profile-franchisee-actions.js` | `updateFranchiseeProfile`, `createFranchiseInquiry`, `saveFranchiseOpportunity`, `removeFranchiseOpportunity`, `incompleteFranchiseeProfileResponse`, and related write helpers if this file grows again. | Recommendation query/scoring moved to `functions/_profile-recommendations.js`; read-model loaders stay in `functions/profile-data.js` until GET composition is later split. | Save, unsave, inquiry, recommendation scoring, and missing-profile CTA metadata remain identical. |
| `functions/_profile-franchisor-actions.js` | `updateFranchisorProfile`, `updateOwnedListing`, `updateFranchiseLeadStatus`, `loadOwnedPublicationDistribution`, `loadFranchisorLeadInbox`, `loadFranchisorProfile`, `loadOwnedListing` if this file grows again. Implemented. | Listing patch/update construction moved to `functions/_profile-listing-patch.js`; shared audit/rebuild helpers stay imported from existing modules. | Owner listing edit rate limit, rebuild queueing, publication distribution, and lead status ownership checks stay intact. |
| `functions/_profile-read-model.js` | `loadProfileData`, franchisee profile/public opportunity/saved opportunity/inquiry/lead loaders, owned listing read composition, claims, recommendations, lead inbox, Premium membership reads, and owner analytics composition. Implemented. | Endpoint facade keeps auth, error telemetry, POST dispatch, and JSON response handling. | GET `/profile-data` response adds `owner_analytics` while preserving existing keys for `/profil`. |
| `functions/_profile-owner-analytics.js` | Owned-listing product event aggregation. Implemented. | Read model owns when analytics is loaded and how it is attached to the response. | Missing analytics table still returns empty metrics instead of breaking `/profil`. |
| `functions/_profile-utils.js` | `getDb`, `jsonResponse`, `validationError`, `auditStatement`, `normalizeWhatsapp`, `textOrNull`, `normalizeText`, `intOrNull`, `numberOrNull`, `randomId`, missing-table detection, and Clerk name/email helpers. Implemented. | Only truly shared helpers should move here; avoid dumping workflow-specific logic into a new catch-all file. | Unit-free validation is build/typecheck plus existing API handler tests/build. |
| `functions/_profile-listing-patch.js` | Listing editable-field extraction, typed normalization, and SQL update statement construction. Implemented. | Owner listing save workflow remains in `profile-data.js`. | Owner listing edits keep the same fields and throttling. |
| `functions/_profile-recommendations.js` | Published franchise query, budget/category matching, analytics-weighted scoring, and recommendation reasons. Implemented. | `RECOMMENDATION_LIMIT` remains controlled by `profile-data.js`. | Recommendation response keys remain unchanged. |

Recommended order:
1. Extract schemas and scalar validators first.
2. Extract account/role handlers.
3. Extract franchisee value handlers and loaders.
4. Extract franchisor/listing/lead handlers and loaders.
5. Extract read model only after POST workflow modules are stable.

#### `src/lib/franchise-static.ts` - Target TypeScript Modules

| Target file | Move from `src/lib/franchise-static.ts` | Keep in facade | Validation |
| --- | --- | --- | --- |
| `src/lib/franchise-text.ts` | `normalizeText`, `normalizeBrandName`, `normalizeCompanyName`, `normalizeDescriptionText`, title/sentence case helpers, uppercase-term restoration, `truncate`, `paragraphs`, `escapeHtml`, `escapeAttr`, URL normalizers, `formatRupiah`, `getThumb`, `slugify`, generated HTML cleanup, and legacy-link canonicalization. Implemented. | Public exports `renderListingPage`, `renderDetailPage`, sorting functions, and route entry functions stay in `franchise-static.ts` initially. | `pnpm run build` should produce unchanged generated page hashes except manifest timestamps. |
| `src/lib/franchise-premium-detail.ts` | Premium detail CTA/tab rendering, media/proposal URL parsing, and FAQ/proposal/gallery tab entries. Implemented. | `franchise-static.ts` still owns the detail template orchestration and core tab shell. | Premium listings can add media/proposal/FAQ surfaces without growing the main static renderer. |
| `src/lib/franchise-contact.ts` | `parsePhoneContacts`, phone start/label/type inference, Indonesian digit normalization/formatting, phone/contact row generation, office address row, WhatsApp claim href, and `generateContactBlock`. Implemented. | Detail template orchestration stays in `franchise-static.ts`. | Detail pages still show parsed public contact rows for unclaimed listings and owner contacts for claimed listings. |
| `src/lib/franchise-ranking.ts` | `compareFranchises`, `getRecommendedRows`, `getPopularRows`, `getAlphabeticalRows`, `scoreRecommendation`, `scorePopularity`, and completeness scoring. Implemented. | Route-facing exports are re-exported from `franchise-static.ts` for compatibility. | Directory sort/query states remain stable. |
| `src/lib/franchise-category.ts` | `getCategoryRouteEntries`, `getCategorySummaries`, `addCategoryAlias`, `categorySlug`, and `canonicalCategoryHref`. Implemented. | `renderCategoryIndexPage` remains in `franchise-static.ts` until category card rendering needs its own module. | Category aliases and canonical `/peluang-usaha?kategori=...` links stay unchanged. |
| `src/lib/franchise-renderers.ts` | `generateCard`, `generateCategoryCard`, `generateSaveOpportunityButton`, `generateDirectoryControls`, `generateStatusBadge`, `generateFactChips`, JSON-LD/breadcrumb/sticky/disclaimer/tabs/detail enhancement functions if not split further. | `franchise-static.ts` becomes the orchestration facade reading templates, loading data, and composing imported renderers. | Snapshot build still writes/skips same public pages; no visual copy changes unless intentional. |

Current status:
1. `franchise-text.ts`, `franchise-contact.ts`, `franchise-ranking.ts`, and `franchise-category.ts` are extracted.
2. `franchise-static.ts` remains the facade for route-facing exports and template orchestration.
3. Renderer markup can be split later only if future listing/detail features grow the facade again.

#### `src/lib/franchise-static-assets.ts` - Target TypeScript Modules

This file is above 900 lines after Premium proposal/gallery CSS and PDF-download script were added. It should be split after the Premium detail page is manually verified in production.

| Target file | Move from `src/lib/franchise-static-assets.ts` | Keep in facade | Validation |
| --- | --- | --- | --- |
| `src/lib/franchise-detail-assets.ts` | `injectDetailAssets()`, detail tab CSS, Premium CTA/gallery/proposal/FAQ CSS, tab activation script, and proposal image-to-PDF browser helpers. Implemented. | `generateCssPlaceholder()` and `injectDirectoryAssets()` stay in `franchise-static-assets.ts`. | `pnpm run build`; one Premium listing detail page still opens tabs, displays proposal images, and downloads a PDF when images allow browser canvas access. |

### Refactor Implementation Order

Use this checklist as the next implementation tracker:

| Order | Task | Done when | Status |
| ---: | --- | --- | --- |
| 1 | Extract `js/auth-clerk.js` debug utilities. | `window.FranchiseAuth.getDebugSnapshot()` and existing dashboard/sso debug panels still work; Astro/static build passes; deployed SSO behavior is unchanged. | Done |
| 2 | Extract `js/auth-clerk.js` UI renderer/events. | `/login`, `/register`, and `/dashboard` still render the same custom login/register/staff auth UI; Google and email/password paths still use the same public API. | Done |
| 3 | Extract `js/auth-clerk.js` Clerk boot/token/sync core. | `window.FranchiseAuth` remains backward compatible for `/daftar`, `/dashboard`, and future route scripts. | Done |
| 4 | Extract dashboard inline client JS from `src/pages/dashboard/index.astro`. | `/dashboard` markup becomes mostly static shell; all current sections still render from `/dashboard-data`; admin action buttons still work. | Done |
| 5 | Split `functions/dashboard-data.js` into schemas, queries, actions, and utilities. | `/dashboard-data` remains the only public endpoint, but file length drops and each module has one responsibility. | Done |
| 6 | Extract dashboard shared render utilities. | Icon-only action controls, escaping, currency formatting, and form-value writes live outside the dashboard controller; dashboard buttons keep shared custom tooltips. | Done |
| 7 | Extract dashboard Premium Operations. | Premium funnel/settings/payment/email queue rendering and actions live outside `js/dashboard-admin.js`. | Done |
| 8 | Extract dashboard Review/Data Quality/Claim workflows. | Guided edit fields, quality warning seeding, edit submission/review, and claim review live outside `js/dashboard-admin.js`. | Done |
| 9 | Extract dashboard Outreach/Publications workflows. | Outreach rows/logging and publication controls live in a focused module; `js/dashboard-admin.js` becomes core boot/tabs/status plus orchestration. | Done |
| 10 | Split `src/lib/franchise-static.ts` contact/text/ranking/helpers. | Public `/peluang-usaha` output hash should remain unchanged except for intentional feature changes. | Done - text, Premium detail, contact, ranking, category, and generated detail assets are extracted |
| 11 | Split D1 builder/importer scripts. | Existing `pnpm run build:d1:franchises`, `pnpm run import:csv:dry`, and build pipeline behavior remains unchanged. | Done - `scripts/d1-page-renderer.ts` and `scripts/import-csv-utils.ts` own reusable renderer/importer helpers while facades keep orchestration. |
| 12 | Continue profile client extraction. | `js/profile-page.js` remains the controller facade; account, role, leads, franchisee/franchisor renderers, Premium membership, UI helpers, and saved-opportunity storage are extracted. | Done |

## Migration Rules
- Do not remove existing form fields while migrating; map every current field to D1 or a deliberate archival field.
- Preserve `/peluang-usaha/[slug]` URLs where possible for SEO continuity.
- Preserve `/daftar?claim={slug}` behavior until the new claim flow is live and redirects are tested.
- Keep claim-search sanitization consistent during import, API search, and UI autocomplete.
- Use existing CSS first. Add framework dependencies for app/runtime only, not for styling.
- Keep generated/public static pages available until the new app routes are equivalent.
- Use TypeScript and Zod for new migration code; legacy JavaScript can remain until touched.
- Apply D1 schema changes through committed SQL migrations only.
- Keep role authorization in D1 server-side checks; do not trust Clerk unsafe metadata or client-visible hints for protected actions.

## Risks And Required Decisions
- Decide Astro vs Next.js before scaffolding. Current recommendation: Astro.
- Decide whether Cloudflare Pages or Workers static assets should be the deployment target for the new app. Current recommendation: Workers-compatible Cloudflare adapter route, preserving Pages-style static hosting if practical.
- Clerk organizations need a later product decision: they may be useful if one franchisor manages multiple brands or staff, but the initial authorization source remains D1 roles.
- Pre-first-login admin/staff bootstrap now uses `email_role_grants`; do not insert placeholder `users` rows without a real Clerk user id.
- D1 needs an approval/revision model before franchisors can edit live public pages.
- R2 public access strategy must be decided: public bucket/custom domain, signed proxy route, or hybrid.
- Legacy static HTML volume is large; migration should prioritize app-critical routes instead of converting every exported page at once.

## Operational Follow-ups After Completed Migration Phases
These items are ongoing production QA, business decisions, or future enhancements. They should not keep the implementation phases above in an active implementation state.

1. Production-check the next dashboard deploy: login as admin, open Operations, confirm Premium settings, email queue controls, Review, Data Quality, Claim, OCR, and Premium payment actions still render after the dashboard module split.
2. Verify one controlled D1 dirty-to-build cycle: make a low-risk public listing edit, confirm `site_rebuild_requests`, poller/deploy hook, and public HTML freshness.
3. Keep manual Premium payment as the current production path: bank transfer with unique amount and optional QRIS/payment proof upload. Add automated payment matching only after choosing a safe payment gateway or official bank API.
4. Keep auth/account-linking production QA current for `/login`, `/daftar`, `/profil`, Google SSO, password recovery, and same-email linking.
5. Continue watch-only refactors when growth resumes: dashboard query/action read models, OCR runner quota/search helpers, generated detail assets, and profile controller workflow helpers.
6. Treat Google Sheets/CSV as archive/import-only until the separate decommission phase is explicitly completed.

## Import Status
- First D1 CSV importer: `scripts/import-csv-to-d1.ts`.
- Source snapshots: `csv/franchisors.csv`, `csv/unclaimed.csv`, `csv/franchisee.csv`.
- Validation: TypeScript compile check and importer dry run pass.
- Remote import target: Cloudflare D1 `franchise_db` through `npx cfman wrangler --account franchise-network`.
- Remote result verified on 2026-06-16: 197 franchises, 190 packages, 197 site publications, 2 franchisee profiles, 1 franchisor profile, and 199 legacy source rows.
- Re-running the importer is idempotent for entity rows because generated ids are stable and inserts use conflict guards.
- `import_batches` currently contains two completed records for this first import work: the initial timestamped successful apply and the deterministic batch-id rerun. Entity row counts did not duplicate.

## Public Generation Status
- First D1 public page builder: `scripts/build-d1-franchise-pages.ts`.
- Build commands: `pnpm run build:d1:franchises:dry`, `pnpm run build:d1:franchises`, and explicit legacy bridge writer `pnpm run build:d1:franchises:bridge`.
- Source of truth: published `franchise_site_publications` for `site_franchisee_id` joined to `franchises`.
- Output generated on 2026-06-16: `/peluang-usaha/index.html`, 197 D1-backed detail pages, `json/unclaimed-brands.json`, and `json/d1-generated-pages-manifest.json`. Since 2026-07-11, normal D1 sync only writes the Astro snapshot and `json/unclaimed-brands.json`; root bridge HTML/manifest regeneration requires `pnpm run build:d1:franchises:bridge`.
- Rerun verification: dry-run after generation reported 197 detail pages skipped, index skipped, and no unclaimed JSON rewrite.
- Bridge stale deletion rule: remove only files tracked in `json/d1-generated-pages-manifest.json` and containing the `d1-generated:franchisee.id` marker. Do not delete legacy/example `/peluang-usaha` folders that were not generated by this D1 builder.
- Astro scaffold: `astro.config.mjs`, `src/lib/franchise-static.ts`, focused static helper modules, `src/pages/peluang-usaha/index.astro`, and `src/pages/peluang-usaha/[slug].astro` now generate D1-backed static HTML from `json/d1-franchise-static-data.json`; Astro `build.format: "preserve"` makes detail output flat `.html`.
- Astro verification on 2026-06-17: `pnpm run build:astro` built 198 pages into `dist/` from the D1 snapshot.
- Directory route consolidation on 2026-06-22: `/peluang-usaha` is now the canonical directory page with manual query-param controls; `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/category`, and known category aliases are redirect-only compatibility paths.
- Missing image behavior: directory cards now render a pure CSS placeholder with brand/category initials when D1 has no cover/logo URL, avoiding 404s from absent WooCommerce placeholder images.
- Cosmetic/metadata cleanup on 2026-06-21 and 2026-06-22: removed the legacy header placeholder and fake blog author/date from detail pages, standardized generated category links to canonical `/peluang-usaha?kategori=...`, added compatibility redirects, improved breadcrumbs, replaced detail/listing missing image fallbacks with CSS placeholders or site-owned metadata fallback images, and added render-time all-caps description normalization.
- Detail contact/tab cleanup on 2026-06-22: detail pages now include self-contained tab JS/CSS, stronger contrast for yellow/category link states, styled CSS-only logo placeholders with fallback label text, stale legacy tab comments stripped from output, and parsed public contact rows for unclaimed listings using imported D1 phone/address data plus a claim CTA for corrections.
- Current popularity limitation: `/peluang-usaha?sort=populer` uses a deterministic listing-quality proxy until D1 stores real popularity metrics such as views, saved listings, lead counts, payments, or admin boosts.
- Proposal asset backfill on 2026-07-04: `scripts/migrate-blogspot-proposals-to-r2.mjs` migrated 491 legacy Blogspot/Blogger proposal images for 34 franchises into R2 under `franchises/{slug}/proposal/`, inserted/updated D1 `franchise_assets` rows with brand/source URL metadata, replaced `franchises.proposal_url` with first-party public URLs, queued rebuild requests, and refreshed the static snapshot.
- Compatibility note: Astro is pinned to 5.x for this Node 20.19.4 workspace; Astro 6 requires Node >=22.12.0.

## D1-To-Static Publish Automation Tracker
- Current reality: a D1 row update only changes runtime/API data. Static pages remain unchanged until a new Cloudflare Pages build runs the D1-backed Astro build.
- Target: every franchisor/admin write that affects public pages must enqueue a rebuild request for the affected `site_id` and `franchise_id`, but it must not trigger a Cloudflare Pages build immediately.
- Safe baseline trigger: a scheduled publish job runs twice daily and calls the Cloudflare Pages Deploy Hook only when pending rebuild requests exist.
- Preferred target trigger: a GitHub Actions poller runs every 30 minutes, checks D1 for pending rebuild requests, and calls the Cloudflare Pages Deploy Hook only when dirty and allowed by guardrails.
- Manual urgent trigger: an authenticated admin-only endpoint can trigger the deploy hook for time-sensitive edits, but this should be exceptional.
- Build behavior: Pages build runs `pnpm run build:astro`, reads current D1, emits `dist/`, and Cloudflare serves the new static HTML.
- Deployment config: Pages output directory is `dist` in `wrangler.toml`; Cloudflare Pages project settings must define a build command (`pnpm run build` preferred, or `pnpm run build:astro`) so dependencies are installed before Pages Functions are bundled.
- Hybrid output rule: after Astro builds, `scripts/copy-legacy-static.mjs` copies legacy static pages/assets into `dist` while skipping legacy `/peluang-usaha` and duplicate archive/category route folders. It also rewrites copied HTML links to canonical `/peluang-usaha` query URLs. This preserves old CSS/JS/images and lets Astro own the D1-backed directory route.
- Build-time D1 access: `pnpm run build` reads remote D1 through the Cloudflare D1 HTTP API. Cloudflare Pages must have `CLOUDFLARE_API_TOKEN` as a secret; `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_DATABASE_ID` are optional because current defaults are in the builder.
- Pages config rule: do not put `account_id` in `wrangler.toml`; Cloudflare Pages rejects it during config validation. Use the connected Pages project account, `cfman`, or GitHub env/vars for account context instead.
- Freshness target: normal edits appear on the next scheduled publish window or poll window; urgent admin-triggered edits can appear sooner.
- Recommended schedule: twice daily, e.g. 09:00 and 21:00 Asia/Jakarta.
- Cooldown/debounce meaning: group many D1 edits into one build window. For this project, the practical cooldown is the scheduled publish window, not a minutes-based timer.
- Strategy comparison: `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md`.
- Preferred upgrade path after the queue exists: GitHub Actions polls D1 every 30 minutes, exits quickly when no pending requests exist, and when dirty calls the Cloudflare Pages Deploy Hook only if publish guardrails allow it.
- GitHub direct `dist/` deploy is the fallback/upgrade mode if Cloudflare Pages build quota becomes constrained.
- Do not let the poller commit generated HTML/JSON output to `main`; that can trigger an extra Cloudflare Git-connected build and spend both systems for one content update.
- Implementation status on 2026-06-18:
  - Remote D1 migration `0003_site_publish_queue.sql` applied to `franchise_db`.
  - `site_publish_state` row exists for `site_franchisee_id` with `publish_mode='cloudflare_deploy_hook'`, `daily_publish_limit=12`, and `min_publish_interval_minutes=30`.
  - `/form-submit` enqueues rebuild requests for franchisor listing submit, claim submit, dev unclaimed create, and dev test-data clear.
  - `.github/workflows/d1-static-publish.yaml` runs at minutes 7 and 37, exits cleanly when no pending work exists, and does not commit generated output.
  - `wrangler.toml` declares `pages_build_output_dir = "dist"`, `package.json` exposes `pnpm run build`, and `.node-version` pins Node 20.19.4 for the Astro 5 build path.
  - `scripts/build-d1-franchise-pages.ts` now queries D1 via the Cloudflare HTTP API when a token is available, avoiding Wrangler account-discovery failures during Cloudflare Pages or CI builds.
- Operational checklist after implementation:
  - [x] Add `site_rebuild_requests` migration.
  - [x] Add `site_publish_state` migration for per-site dirty/published timestamps and publish counters.
  - [x] Add shared enqueue helper for D1 mutation endpoints.
  - [ ] Add GitHub Actions secrets for D1 query/deploy access through Wrangler.
  - [ ] Verify Cloudflare Pages project build settings: build command `pnpm run build`, output directory `dist`, Node 20.x.
  - [ ] Add Cloudflare Pages secret `CLOUDFLARE_API_TOKEN` for build-time D1 reads if it is not already present in the Pages project.
  - [x] Add scheduled GitHub Actions poller that runs every 30 minutes and exits before dependency install/build when D1 is clean.
  - [x] Add Cloudflare Pages Deploy Hook publishing when D1 is dirty and guardrails allow a content publish.
  - [x] Keep direct `wrangler pages deploy dist` publishing as a documented fallback if Cloudflare build quota becomes constrained.
  - [ ] Add admin-only manual deploy endpoint for urgent publishing.
  - [x] Wire `/form-submit` public-page writes to enqueue rebuild requests.
  - [ ] Wire future listing edit/delete/admin publish endpoints to enqueue rebuild requests.
  - [ ] Add deployment verification/logging and stale request alerting.

## Runtime D1 API Status
- `/get-franchises` now validates query parameters with Zod and uses D1 first when `env.franchise_db` is available.
- Supported read params include `tab`, `purpose`, `q`, `category`, `limit`, `offset`, and optional `source=sheets` fallback.
- `purpose=claim-search&tab=UNCLAIMED` preserves strict brand sanitization and deduplication before returning autocomplete rows.
- Remote D1 SQL join for published `site_franchisee_id` franchise rows was verified on 2026-06-17 through `cfman`.

## Runtime D1 Write Status
- `/form-submit` now rejects writes if the D1 binding is missing.
- Franchisee submissions write `franchisee_profiles`, `legacy_source_rows`, and `audit_events`.
- Franchisor submissions write `franchisor_profiles`, `franchises`, `franchise_packages`, `franchise_site_publications`, `legacy_source_rows`, and `audit_events`.
- Claim submissions update the matched D1 `UNCLAIMED` franchise into a `FRANCHISOR` listing, add `franchise_claims`, and therefore remove it from D1 unclaimed claim search.
- Franchisor and claim submissions now enqueue `site_rebuild_requests` and update `site_publish_state` for `site_franchisee_id`.
- Dev test-data create/clear actions now operate in D1, not Google Sheets.
- Dev test-data create/clear actions now enqueue static publish rebuild requests because they affect public listing/claim-search output.
- `/form-submit` now verifies Clerk bearer tokens through `@clerk/backend`, maps Clerk users into D1 `users`, checks D1 roles, writes `user_id`/`owner_user_id`/`claimant_user_id`, and records `audit_events.actor_user_id`.
- Dev test-data create/clear actions require `staff` or `admin`.
- Remaining gap: production Clerk keys and allowed origins must be configured in Cloudflare Pages and Clerk Dashboard before deployed browser testing.

## Clerk Auth Status
- Dependencies: `@clerk/backend` and `@clerk/clerk-js`.
- Custom UI: `js/auth-clerk.js` plus `css/auth-clerk.css`; no Clerk prebuilt components are used.
- Routes/endpoints: `/login/`, `/register/`, `/auth-config`, `/auth-sync`, `/clerk-webhook`, `/user-role`, `/sync-clerk-metadata`.
- Required env vars: `PUBLIC_CLERK_PUBLISHABLE_KEY` preferred for Astro/static runtime config, `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SIGNING_SECRET`; optional hardening via `CLERK_AUTHORIZED_PARTIES`. `/auth-config` also accepts `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_PUBLISHABLE_KEY` as compatibility fallbacks, and the browser auth script sets `window.__clerk_publishable_key` plus script data attributes before loading local `/clerk/clerk.browser.js` or CDN fallbacks.
- Clerk-to-D1 sync: `/clerk-webhook` verifies Clerk webhooks and syncs `user.created`, `user.updated`, and `user.deleted`.
- D1-to-Clerk sync: `/user-role` mutates D1 roles and immediately updates Clerk metadata; `/sync-clerk-metadata` repairs/backfills Clerk metadata from D1 after manual SQL edits.
- Important constraint: D1 has no automatic outbound trigger, so raw manual D1 role changes need explicit resync.
- Setup details live in `docs/architecture/CLERK_SETUP.md`.

## Documentation Alignment Rule
When editing any `.md` file, distinguish between:
- **Current transition layer:** static WordPress export, Cloudflare Pages Functions, Google Sheets/CSV, generated HTML, and legacy media URLs.
- **Target architecture:** Astro on Cloudflare, D1, R2, Clerk, and protected role-aware app routes.

Do not describe Google Sheets, Supabase, or Cloudinary as the future application stack.
