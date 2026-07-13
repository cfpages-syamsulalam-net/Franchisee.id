# CHANGELOG

Format:
- Header: `## YYYY-MM-DD HH:mm (Asia/Jakarta)`
- Sections: `### Added`, `### Changed`, `### Removed`

## 2026-07-13 21:04 (Asia/Jakarta)
### Added
- `src/components/dashboard/DashboardIntegrationGuide.astro`: Added a focused in-app dashboard documentation component with stable setup anchors for Google Contacts, OCR, email, and publish integrations.
- `docs/architecture/DASHBOARD_INTEGRATION_GUIDE.md`: Added the canonical third-party integration setup guide for `/dashboard` warnings and operator setup.
- `.context/session-20260713-2104.md`: Added this session continuity snapshot for dashboard integration docs and `/daftar?admin` QA navigation.

### Changed
- `src/components/dashboard/DashboardOperationsPanel.astro`: Replaced inline setup-guide markup with the shared dashboard documentation component.
- `functions/_google-contacts.js`, `js/dashboard-admin.js`, and `js/dashboard-operations.js`: Added setup documentation metadata and rendered a safe `Lihat panduan setup` link for Google Contacts permission/setup failures.
- `js/form-03-navigation-steps.js` and `js/form-08-franchisee-steps.js`: Added `?admin` as an easy alias for the existing preview-style step-validation bypass during admin QA navigation.
- `DASHBOARD.md`, `docs/README.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Moved detailed dashboard integration documentation into the focused guide and documented the new component/anchor contract.

## 2026-07-13 18:42 (Asia/Jakarta)
### Added
- `src/components/dashboard/DashboardReviewPanel.astro`: Added focused static markup component for the dashboard Review tab.
- `src/components/dashboard/DashboardOperationsPanel.astro`: Added focused static markup component for the dashboard Operations/Premium tab.
- `src/components/dashboard/DashboardOcrPanel.astro`: Added focused static markup component for the dashboard OCR tab.
- `@astrojs/check`: Added Astro template checking as a dev dependency.
- `.context/session-20260713-1842.md`: Added this session continuity snapshot for the dashboard Astro component refactor.

### Changed
- `src/pages/dashboard/index.astro`: Reduced the route to a shell/assembler that preserves metadata, tabs, CSS load order, script order, and OCR metadata injection while delegating large panel markup to components.
- `scripts/check-dashboard-ocr-client.mjs`: Expanded OCR dashboard regression assertions to read the extracted dashboard components.
- `scripts/check-ocr-job-runner.ts`, `scripts/check-ocr-provider-config.ts`, `scripts/check-proposal-download.ts`, `scripts/check-proposal-knowledge.ts`, and `scripts/enrich-ocr-structured-data.ts`: Removed stale TypeScript diagnostics surfaced by `astro check` without changing runtime contracts.
- `package.json` and `pnpm-lock.yaml`: Added `astro:check` for repeatable Astro template validation.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, and `SUGGESTION.md`: Documented the new dashboard component boundary and marked the dashboard-shell refactor complete.

## 2026-07-13 17:43 (Asia/Jakarta)
### Added
- `functions/_google-contacts.js`: Added protected Google Contacts bulk-save support for dashboard outreach using Clerk-linked Google OAuth tokens, Google People API duplicate search, and batch contact creation.
- `scripts/check-google-contacts.ts`: Added regression coverage for Google Contacts outreach payload generation.
- `.context/session-20260713-1743.md`: Added this session continuity snapshot for outreach Google Contacts and public copy cleanup.

### Changed
- `functions/_dashboard-schemas.js` and `functions/dashboard-data.js`: Added and routed the `save_outreach_google_contacts` dashboard action.
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, `js/dashboard-operations.js`, and `css/dashboard.css`: Added a shared-pill Outreach action for saving current outreach queue contacts to Google Contacts with busy/done/error status and duplicate-skip feedback.
- `daftar/index.html`: Rewrote internal-sounding brand-origin helper copy into public-facing guidance without changing form fields or submit contracts.
- `AGENTS.md`: Strengthened public-copy rules to explicitly ban internal implementation terms and require touched public surfaces to be scanned for developer-facing phrases.
- `DASHBOARD.md`, `docs/architecture/CLERK_SETUP.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, and `SUGGESTION.md`: Documented Google Contacts outreach setup, runtime contracts, maintainability notes, and duplicate-contact prevention.
- `package.json`: Added `google-contacts:check`.

## 2026-07-13 16:25 (Asia/Jakarta)
### Added
- `functions/_proposal-evidence.js`: Added shared field-aware evidence extraction for proposal/OCR snippets, returning both excerpt and exact basis text for Review OCR highlighting.
- `.context/session-20260713-1625.md`: Added this session continuity snapshot for highlighted Review OCR basis evidence.

### Changed
- `functions/_ocr-enrichment-review.js` and `functions/_dashboard-review-evidence.js`: Store/read `basis` alongside evidence excerpts so Review OCR can highlight the exact supporting phrase instead of only showing a broad excerpt.
- `js/dashboard-review.js` and `css/dashboard-review.css`: Highlight the basis phrase inside `Dasar dokumen` excerpts and show a warning when no field-specific basis is found.
- `scripts/check-dashboard-ocr-client.mjs` and `scripts/check-proposal-knowledge.ts`: Added regression coverage for evidence highlighting and weak numeric evidence, including `min_staff_count`.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, `SUGGESTION.md`, and `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`: Documented highlighted basis snippets and weak-evidence warnings.

## 2026-07-13 15:09 (Asia/Jakarta)
### Added
- `.context/session-20260713-1509.md`: Added this session continuity snapshot for conservative total-investment extraction and license/partnership fee wording.

### Changed
- `functions/_proposal-knowledge.js`: Made total-investment extraction conservative so generic upfront fee rows no longer populate `total_investment_idr`; franchise fee/license fee/biaya lisensi/biaya franchise/biaya kemitraan/biaya join/joining fee/investasi kemitraan now map to the upfront partnership fee field, while ambiguous `paket kemitraan` is not auto-classified.
- `functions/_shared-schemas.js`, `src/lib/franchise-detail-summary.ts`, `src/lib/franchise-detail-tabs.ts`, `templates/detail-franchise-tpl.html`, and `FORM_SCHEMA.md`: Renamed the user-facing fee field label to `Biaya Kemitraan Awal` and documented the synonym policy.
- `scripts/check-proposal-knowledge.ts`: Added regression coverage for `Biaya Kemitraan 119 Juta` not creating `total_investment_idr`, `Biaya Join` mapping to the upfront partnership fee field, ambiguous `Paket Kemitraan` staying unclassified, and explicit `Total Biaya Investasi` still mapping to total investment.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, `SUGGESTION.md`, and `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`: Documented the conservative total-investment rule and fee synonym mapping.

## 2026-07-13 10:34 (Asia/Jakarta)
### Added
- `functions/_dashboard-review-evidence.js`: Added a focused helper that enriches pending proposal/OCR review suggestions with sanitized source excerpts and brochure image URLs from `franchise_asset_knowledge` when the suggestion row lacks embedded evidence.
- `.context/session-20260713-1034.md`: Added this session continuity snapshot for Review OCR proof hover and granular approval.

### Changed
- `functions/_dashboard-schemas.js` and `functions/_dashboard-actions.js`: Added optional `approved_fields` support for granular edit suggestion approval; approved reviews apply only selected fields and record skipped fields in notes/audit/rebuild metadata.
- `functions/_dashboard-queries.js`: Delegates document-derived review proof attachment to the new evidence helper before returning pending edit suggestions.
- `js/dashboard-review.js` and `css/dashboard-review.css`: Added admin per-field approval checkboxes, changed evidence action copy to `Bukti dokumen`, and kept document proof hover previews on the shared OCR image-preview component.
- `scripts/check-dashboard-ocr-client.mjs` and `scripts/check-ocr-job-runner.ts`: Added regression coverage for per-field approval and document proof UI/schema fragments.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, `SUGGESTION.md`, and `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`: Documented granular approval, read-time document evidence attachment, and updated long-file follow-up notes.

## 2026-07-12 21:32 (Asia/Jakarta)
### Added
- `.context/session-20260712-2132.md`: Added this session continuity snapshot for OCR/manual review separation and review value formatting.

### Changed
- `js/dashboard-review.js`: Routed document-derived `proposal_extraction` and `ocr_enrichment_bundle` rows into Review OCR while keeping Pending Edit Review for manual/staff edits; added readable Rupiah/number/percent formatting and title-case display for short classification fields.
- `css/dashboard-review.css`: Forced review brand cells into a vertical layout so the email/source line always appears below the franchise name, and differentiated manual source badges from OCR/proposal badges.
- `functions/_ocr-enrichment-review.js`: Normalized new OCR bundle short text candidates such as outlet type/category to consistent title case before creating review suggestions.
- `scripts/check-dashboard-ocr-client.mjs` and `scripts/check-ocr-job-runner.ts`: Added regression coverage for proposal/OCR review routing, Rupiah formatting fragments, manual badges, and OCR candidate case normalization.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, `SUGGESTION.md`, and `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`: Documented the review source split, value formatting, candidate normalization, and updated review module line-count follow-up.

## 2026-07-12 13:53 (Asia/Jakarta)
### Added
- `.context/session-20260712-1353.md`: Added this session continuity snapshot for OCR Review evidence hover previews.

### Changed
- `functions/_ocr-enrichment-review.js`: Stored sanitized per-field OCR evidence under `old_value.__ocr_evidence` when creating new `ocr_enrichment_bundle` suggestions, preserving `suggested_value` as the canonical approval payload.
- `js/dashboard-review.js` and `css/dashboard-review.css`: Added source-backed OCR evidence rows to Review OCR diffs, including OCR excerpts and brochure image preview actions using the shared OCR image-preview component.
- `js/dashboard-admin.js` and `js/dashboard-ocr.js`: Wired the OCR Review table into the shared delegated image-preview binding.
- `src/pages/dashboard/index.astro`: Replaced unavailable Review OCR icons with the existing clipboard-list icon.
- `scripts/check-dashboard-ocr-client.mjs`: Expanded dashboard OCR regression coverage for OCR Review evidence and image-preview binding.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, `SUGGESTION.md`, and `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`: Documented the OCR evidence contract, hover-preview behavior, and review renderer follow-up.

## 2026-07-12 05:50 (Asia/Jakarta)
### Added
- `.context/session-20260712-0550.md`: Added this session continuity snapshot for the OCR review UX split.

### Changed
- `src/pages/dashboard/index.astro`: Moved the pending Brand/Diff/Reason/Aksi edit review table out of the direct-edit form panel, added a dedicated OCR Review guide card/subpanel, and gave OCR bundles their own full-width review table.
- `js/dashboard-review.js` and `css/dashboard-review.css`: Split OCR enrichment bundles away from generic edit suggestions and improved review diff UI with icon-led old-to-new values plus better wrapping for long reasons.
- `js/dashboard-utils.js`, `css/dashboard.css`, and `js/dashboard-ocr-results.js`: Added shared dashboard text-pill action helpers/styles and changed OCR enrichment source/listing/review actions to use them.
- `js/dashboard-admin.js`, `js/dashboard-ocr.js`, `functions/_ocr-enrichment-review.js`, `css/dashboard-ocr-settings.css`, and `scripts/check-dashboard-ocr-client.mjs`: Wired OCR Review row targets, opened Review OCR after bundle creation, updated OCR guide-card navigation, adjusted OCR review copy, and expanded dashboard OCR regression coverage.
- `AGENTS.md`, `SUGGESTION.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, and `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`: Documented the shared pill-action rule, dedicated OCR Review surface, long-file follow-ups, and suggestion 87 completion details.

## 2026-07-12 03:42 (Asia/Jakarta)
### Added
- `functions/_ocr-enrichment-review.js`: Added grouped per-franchise OCR enrichment queue/read helpers and an admin-only action that creates one pending review bundle from structured OCR candidates.
- `.context/session-20260712-0342.md`: Added this session continuity snapshot for suggestion 87.

### Changed
- `functions/_dashboard-ocr-schemas.js`, `functions/dashboard-data.js`, and `functions/_ocr-job-runner.js`: Wired the validated `create_ocr_enrichment_suggestion` dashboard action and included the grouped enrichment queue in the OCR dashboard payload.
- `js/dashboard-ocr-results.js`, `js/dashboard-ocr.js`, and `css/dashboard-ocr-results.css`: Added the OCR Results enrichment queue UI with source/listing/review actions and review-bundle creation handling.
- `scripts/check-dashboard-ocr-client.mjs` and `scripts/check-ocr-job-runner.ts`: Added regression coverage for grouped OCR enrichment queue wiring and backend candidate grouping.
- `SUGGESTION.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Marked suggestion 87 complete and documented the grouped OCR review-bundle contract, long-file follow-ups, and validation surface.

## 2026-07-12 02:48 (Asia/Jakarta)
### Added
- `scripts/enrich-ocr-structured-data.ts`: Added a replayable remote D1 OCR enrichment script that fetches proposal knowledge rows, reruns the shared sanitizer/extractor, writes idempotent SQL updates, and can apply them through cfman/Wrangler.
- `.context/ocr-structured-enrichment-fetch.sql` and `.context/ocr-structured-enrichment.sql`: Added generated SQL artifacts for the OCR knowledge fetch query and latest no-op enrichment output.
- `.context/session-20260712-0248.md`: Added this session continuity snapshot for the OCR structured enrichment replay.

### Changed
- `functions/_proposal-knowledge.js`: Expanded deterministic proposal/OCR candidate extraction, added source-noise sanitization before storage/extraction, and kept canonical listing fields protected by missing-field review candidates.
- `functions/_ocr-job-runner.js`: Sanitized OCR result preview text defensively before dashboard output.
- `scripts/check-proposal-knowledge.ts`: Added regression assertions for expanded OCR candidate extraction and source-noise sanitization.
- `package.json`: Added `ocr:enrich:structured`.
- Remote D1 `franchise_db`: Replayed OCR structured enrichment over 479 extracted knowledge rows, increasing rows with structured candidates from 56 to 164 and verifying the filtered source marker count at 0; a final replay returned `changed=0`.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `SUGGESTION.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, and `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`: Documented the sanitizer, replay script, remote backfill result, long-file follow-up, and grouped OCR review-queue suggestion.

## 2026-07-12 00:57 (Asia/Jakarta)
### Added
- `.context/session-20260712-0057.md`: Added this session continuity snapshot for the OCR dashboard navigation and image-preview polish.
- `.context/session-20260712-0120.md`: Added this session continuity snapshot for fixing OCR image-preview tooltip overlap.

### Changed
- `src/pages/dashboard/index.astro` and `css/dashboard-ocr-settings.css`: Changed the OCR Pengaturan/Eksekusi Job/Hasil OCR guide cards into the actual subtab navigation and removed the redundant pill menu.
- `js/dashboard-ocr-results.js`, `js/dashboard-ocr.js`, `css/dashboard-ocr-execution.css`, and `scripts/check-dashboard-ocr-client.mjs`: Reused the shared OCR image hover-preview component for Hasil OCR `Gambar` actions and added regression coverage for result preview wiring.
- `js/dashboard-ocr-jobs.js`, `js/dashboard-ocr-results.js`, and `scripts/check-dashboard-ocr-client.mjs`: Removed shared text tooltips from OCR image-preview actions, kept accessible `aria-label` text, and added a regression guard so tooltips cannot block the image preview again.
- `css/dashboard-ocr-execution.css`: Restyled the OCR job page-size select as an integrated custom pill without a visible native black border.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the OCR guide-card navigation and shared job/result image preview behavior.

## 2026-07-11 00:10 (Asia/Jakarta)
### Added
- `.context/session-20260711-0010.md`: Added this session continuity snapshot for the franchisor progressive form and canonical field planning work.
- `.context/session-20260711-0110.md`: Added this session continuity snapshot for suggestion 84 and the D1 bridge output workflow change.
- `.context/session-20260711-0155.md`: Added this session continuity snapshot for closing stale `AUDIT.md` in-progress implementation statuses.
- `.context/session-20260711-0215.md`: Added this session continuity snapshot for brochure navigation overlay tweaks.
- `.context/session-20260711-0639.md`: Added this session continuity snapshot for OCR provider limit calibration and combined provider quota handling.
- `docs/forms/FRANCHISOR_PROGRESSIVE_FORM_PLAN.md`: Added a current-state audit and implementation plan for restoring backend-supported franchisor fields, adding priority canonical fields, and making the 5-step form progressive.
- `migrations/0028_franchisor_progressive_fields.sql`: Added nullable D1 franchise columns for minimum area, staff count, setup duration, working capital, additional cost notes, BEP min/max, omzet min/max, and net-profit min/max.
- `migrations/0029_ocr_provider_actual_limits.sql`: Added D1 calibration updates for OCR provider free quota, quota period/unit, and local request-window guards based on current provider documentation and account-specific caveats.
- `functions/_ocr-quota-policy.js`: Added a focused OCR quota/cap policy module for combined active-provider quota, reset-aware provider re-entry, provider quota preparation, and quota increment statements.
- `css/dashboard-ocr-settings.css`, `css/dashboard-ocr-execution.css`, and `css/dashboard-ocr-results.css`: Added focused OCR dashboard stylesheets for settings, execution/job, and results UI while preserving existing selectors and responsive behavior.
- `js/form-10-progressive-franchisor.js`: Added the progressive franchisor form helper for conditional follow-up groups, total-investment syncing, and support-system checkbox syncing.

### Changed
- `AUDIT.md`, `docs/README.md`, `SUGGESTION.md`, and `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`: Documented the current active `/daftar` franchisor form mismatch, linked the progressive form plan, and added suggestion 83 for restoring existing supported fields before implementing new canonical fields.
- `daftar/index.html`: Reworked the franchisor form into the Phase 1-4 progressive 5-step structure, restored existing supported optional fields, and added priority canonical questions without making the first screen heavier.
- `css/form-franchise/03-form-core.css` and `css/form-franchise/05-packages-responsive.css`: Added progressive-group, computed-total, note, and checkbox-chip styling with responsive stacking.
- `js/form-03-navigation-steps.js` and `js/form-07-init.js`: Updated franchisor step validation/bootstrap for progressive fields and simple-modal baseline handling.
- `functions/_shared-schemas.js`, `functions/_form-submit-utils.js`, `functions/_form-submit-franchisor.js`, `functions/_profile-listing-patch.js`, `functions/_profile-schemas.js`, and `functions/_profile-read-model.js`: Added validation, normalization, D1 binding, claim/update/insert, profile read, and owner-edit support for the restored/progressive canonical listing fields.
- `scripts/build-d1-franchise-pages.ts`, `src/lib/shared-schemas.ts`, `src/lib/franchise-detail-summary.ts`, `src/lib/franchise-detail-tabs.ts`, and `src/lib/franchise-detail-styles.ts`: Carried the progressive canonical fields into the static snapshot and rendered them conditionally in the public Profil/Investasi tabs.
- `FORM_SCHEMA.md`, `FORM_PRESERVATION_MANDATE.md`, `docs/forms/FRANCHISOR_PROGRESSIVE_FORM_PLAN.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `SUGGESTION.md`, and `.context/session-20260711-0010.md`: Updated documentation and trackers for the implemented progressive form contract, suggestion 83 completion, and a follow-up build-artifact workflow suggestion.
- Remote D1 `franchise_db`: Applied migration `0028_franchisor_progressive_fields.sql` and verified the new franchise columns exist.
- `scripts/build-d1-franchise-pages.ts`: Changed normal D1 sync builds to stop writing root `/peluang-usaha/*.html` bridge files and `json/d1-generated-pages-manifest.json` by default; dry-run still validates bridge rendering in memory, while explicit `--write-bridge-pages` preserves the old bridge writer/prune path.
- `package.json`: Added `build:d1:franchises:bridge` as the explicit legacy bridge regeneration command.
- `json/d1-franchise-static-data.json`: Refreshed the tracked Astro snapshot so local static rendering includes the new progressive franchisor canonical fields without requiring a bridge HTML rewrite.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `SUGGESTION.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the suggestion 84 build workflow change and marked the recommendation done.
- `AUDIT.md`: Marked completed migration implementation phases and dashboard CSS validation as done, marked the D1 builder/importer script split done, and moved remaining production QA / business decisions into operational follow-ups instead of leaving core implementation phases as `In progress`.
- `src/lib/franchise-detail-styles.ts`, `src/lib/franchise-detail-scripts.ts`, and `scripts/check-franchise-detail-assets.ts`: Changed brochure image navigation so only the hovered left or right side shows its transparent gradient/label, keeps the active side visible while hovering/focusing the actual control, suppresses the yellow button flash, and adds regression coverage for side-specific pointer states.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the side-specific brochure navigation overlay behavior.
- `src/lib/ocr-provider-metadata.js` and `functions/_ocr-provider-config.js`: Added source-linked OCR provider limit metadata so dashboard provider reads can show detailed official/account-specific quota notes without returning credentials.
- `functions/_ocr-job-runner.js` and `functions/ocr-worker.js`: Replaced the hardcoded 100-unit OCR worker cap with combined active-provider quota calculation, preserved individual provider quota checks before assignment, allowed resettable exhausted providers to re-enter rotation after reset, kept `OCR_WORKER_DAILY_CAP` as an optional safety cap only, and then extracted quota/cap policy out of the runner into `_ocr-quota-policy.js`.
- `js/dashboard-ocr-providers.js` and `js/dashboard-ocr-worker.js`: Changed dashboard OCR quota UI to show per-provider remaining quota, official limit details/source links, combined active-provider capacity, account-specific provider counts, and safety-cap context.
- `js/dashboard-ocr-jobs.js`, `js/dashboard-ocr.js`, and `css/dashboard-ocr.css`: Added lazy hover/focus image preview for OCR job `Gambar` actions using one reusable body-level preview element, a short hover delay, requestAnimationFrame positioning, and cleanup on pointerout, focusout, scroll, resize, tab hide, or row re-render.
- `js/dashboard-ocr-jobs.js` and `css/dashboard-ocr-execution.css`: Changed the OCR job image hover preview to measure the actual viewport/panel size, clamp itself inside the browser window, choose the better left/right side near the cursor, and reposition after the image loads so the preview is not cut off by screen edges.
- `js/dashboard-ocr-jobs.js`, `js/dashboard-ocr.js`, and `css/dashboard-ocr-execution.css`: Replaced inline long OCR job error/warning text with compact icon-only message pills that show the full text in the shared tooltip and copy the message when clicked, keeping grouped job cards from breaking layout.
- `src/pages/dashboard/index.astro` and `css/dashboard-ocr-execution.css`: Compacted the OCR job page-size control into an icon-led rounded select, removed the visible "Jumlah tampil" text, and aligned the control with the dashboard panel padding so it no longer appears outside the container.
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, `js/dashboard-ocr-state.js`, `js/dashboard-ocr.js`, `js/dashboard-ocr-results.js`, `css/dashboard-ocr-results.css`, `functions/_dashboard-ocr-schemas.js`, and `functions/_ocr-job-runner.js`: Improved Hasil OCR navigation by deep-linking Eksekusi Job result buttons to the specific OCR asset, loading that asset from the server when it is not in the default payload, adding franchise-card pagination, changing the result display selector to "franchise tampil", compacting Cari/Reset/Muat Lagi into icon-only actions, and removing inherited list padding/borders so result cards sit cleanly inside the dashboard panel.
- `scripts/check-dashboard-ocr-client.mjs`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Added regression/documentation coverage for the viewport-aware OCR image hover preview behavior.
- `scripts/check-dashboard-ocr-client.mjs`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Added regression/documentation coverage for compact copyable OCR job message pills.
- `css/dashboard-ocr.css`, `src/pages/dashboard/index.astro`, and `scripts/check-dashboard-ocr-client.mjs`: Kept the original OCR stylesheet as a stable shell include, loaded the new OCR CSS modules after it, and expanded the dashboard OCR client check to verify the module load-order fragments.
- `src/pages/dashboard/index.astro`: Added a cache-busting version query to the split OCR CSS module links so browsers do not reuse an older HTML fallback response for the new stylesheet URLs.
- `scripts/check-ocr-job-runner.ts`: Added regression coverage that combined OCR capacity sums active providers with known limits while reporting account-specific providers separately.
- `scripts/check-dashboard-ocr-client.mjs`: Added regression fragments for OCR job image hover-preview wiring.
- `docs/architecture/OCR_PROVIDER_STRATEGY.md` and `docs/architecture/OCR_BATCH_SCHEDULING.md`: Updated OCR limit strategy and scheduling docs to remove the stale 100/day worker default and document combined provider quota behavior.
- `AGENTS.md`: Added the working rule to auto-detect long touched/related files each implementation session and record refactor findings/plans in `AUDIT.md`.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented OCR provider limit calibration, combined quota behavior, OCR job image hover preview, marked suggestion 85 done after extracting OCR quota policy from the long runner file, and marked suggestion 86 done after splitting the OCR dashboard CSS modules.
- Remote D1 `franchise_db`: Applied migration `0029_ocr_provider_actual_limits.sql` and verified OCR.Space is now configured as 500 daily requests with a 180/hour local guard while account-specific providers are excluded from known combined quota.

## 2026-07-10 17:49 (Asia/Jakarta)
### Added
- `.context/session-20260710-1749.md`: Added this session continuity snapshot for scheduler-backed OCR execution and multi-provider OCR waves.
- `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`: Added a data-backed plan for turning OCR/proposal text into reviewed listing fields, supplemental proposal insights, and optional public listing tabs.
- `functions/_ocr-job-actions.js`: Added a focused admin OCR job-action module for row retry, failed-batch retry, and manual no-text resolution.
- `functions/_ocr-job-claiming.js`: Added a focused OCR pending-job claiming/release helper shared by the runner and job actions.
- `js/dashboard-ocr-worker.js`: Added a focused dashboard OCR worker-cap renderer and reset-countdown helper.

### Changed
- `functions/_ocr-job-runner.js` and `functions/dashboard-data.js`: Split OCR retry/no-text dashboard actions and pending-job claiming/release helpers out of the runner so the runner stays focused on provider execution, cache writes, batch refreshes, and proposal knowledge persistence.
- `AUDIT.md`, `docs/README.md`, `SUGGESTION.md`, and `docs/architecture/OCR_LISTING_ENRICHMENT_PLAN.md`: Documented the OCR listing enrichment milestone after sampling remote OCR results, added suggestion 82 for AI-assisted proposal insight extraction, and clarified the canonical-field decision rule plus progressive-disclosure franchisor form strategy.
- `functions/_ocr-job-runner.js`: Changed bounded OCR drains to run concurrent waves when multiple providers are active, rotating each job's first-choice provider while preserving existing fallback and pause-on-rate-limit behavior.
- `functions/_ocr-job-runner.js`, `functions/dashboard-data.js`, `js/dashboard-ocr.js`, and `css/dashboard-ocr.css`: Added OCR worker cap/usage/remaining/reset visibility in the dashboard OCR execution panel and clarified provider-quota exhaustion copy to suggest activating another provider or waiting for quota reset.
- `functions/ocr-worker.js`: Raised the default OCR worker daily cap from 25 to 100 counted units and changed worker-cap exhaustion to mark scoped batches `paused_quota` with an actionable message instead of letting them become overdue scheduler failures.
- `js/dashboard-ocr.js`, `js/dashboard-ocr-state.js`, `js/dashboard-ocr-batches.js`, and `src/pages/dashboard/index.astro`: Changed `Jalankan OCR` to prefer a persisted server-side scheduler batch when a scheduler is active, kept browser continuous OCR only as a no-scheduler fallback with explicit warning copy, refreshed OCR state when a hidden/background tab becomes active again, and changed batch status chips/descriptions to show waiting/processing states without scary overdue copy.
- `js/dashboard-ocr.js`: Changed new/retried scheduler batches to immediately process one scoped dashboard chunk and changed the top `Jalankan OCR` action to resume failed/paused unfinished scheduler batches before creating a new batch.
- `js/dashboard-ocr-jobs.js`: Added the `Tanpa teks` confirmation action to `needs_review` OCR rows, so low/no-text brochure pages can be resolved after visual review instead of staying in `Perlu cek`.
- `js/dashboard-ocr.js` and `css/dashboard-ocr.css`: Added a live reset countdown to the OCR worker cap chip, e.g. `Silakan tunggu 9 jam 36 menit 14 detik lagi`, based on the server-provided reset timestamp.
- `js/dashboard-ocr.js` and `src/pages/dashboard/index.astro`: Refactored worker-cap usage rendering/countdown updates out of the OCR coordinator into `js/dashboard-ocr-worker.js` and loaded the worker module before the OCR facade.
- `scripts/check-dashboard-ocr-client.mjs`: Extended the dashboard OCR regression check for scheduler-backed run creation, foreground refresh wiring, and the worker-cap renderer module.
- `scripts/check-ocr-job-runner.ts`: Added schema coverage for scoped batch chunk runs.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `SUGGESTION.md`, and `docs/architecture/OCR_BATCH_SCHEDULING.md`: Documented scheduler-backed OCR as the reliable long-run path, browser fallback limits, foreground refresh, multi-provider bounded concurrency, dashboard first-chunk priming, the 100-unit worker cap, worker-cap dashboard visibility, worker-cap renderer refactor, and the completed OCR runner action/claiming split.

## 2026-07-10 13:03 (Asia/Jakarta)
### Added
- `migrations/0027_ocr_run_leases.sql`: Added `ocr_run_leases` for short-lived dashboard continuous-OCR run ownership.
- `functions/_ocr-run-lease.js`: Added admin-only acquire, heartbeat, release, active-state masking, and validation helpers for continuous OCR leases.
- `.context/session-20260710-1303.md`: Added this session continuity snapshot for suggestion 80.

### Changed
- `functions/_dashboard-ocr-schemas.js`, `functions/dashboard-data.js`, and `functions/_ocr-job-runner.js`: Added dashboard actions for OCR run lease acquire/heartbeat/release, returned the active lease in OCR dashboard state, and required a valid lease for multi-job dashboard `run_ocr_jobs` chunks without a batch id.
- `js/dashboard-ocr.js` and `js/dashboard-ocr-state.js`: Changed continuous dashboard OCR runs to acquire a server lease before processing, pass `lease_id` to each chunk, release the lease on stop/completion/error, and show active lease ownership in the OCR job notice.
- `scripts/check-dashboard-ocr-client.mjs` and `scripts/check-ocr-job-runner.ts`: Extended OCR regression checks for lease actions and continuous-run lease wiring.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented the OCR run lease and marked suggestion 80 done.
- Remote D1 `franchise_db`: Applied migration `0027_ocr_run_leases.sql` and verified `ocr_run_leases` exists with zero active leases.

## 2026-07-10 12:47 (Asia/Jakarta)
### Added
- `migrations/0026_ocr_no_text_status.sql`: Added the final `no_text` OCR job status and migrated previously admin-confirmed no/low-text `needs_review` rows into the new resolved state.
- `.context/session-20260710-1247.md`: Added this session continuity snapshot for OCR no-text resolution, continuous dashboard OCR runs, overdue batch refresh handling, and Clerk session activation hardening.

### Changed
- `functions/_dashboard-ocr-schemas.js`, `functions/_ocr-job-runner.js`, and `functions/_ocr-batch-runs.js`: Added `no_text` as a first-class OCR status, made manual no-text review resolve jobs instead of leaving them in `needs_review`, counted no-text rows as processed/skipped in batch progress, refreshed active batch rows server-side on dashboard reads, and marked scheduler-overdue queued/running batches as failed with an actionable retry/run message.
- `js/dashboard-ocr.js`, `js/dashboard-ocr-state.js`, `js/dashboard-ocr-jobs.js`, `js/dashboard-ocr-batches.js`, `css/dashboard-ocr.css`, and `src/pages/dashboard/index.astro`: Changed the main OCR run button from scheduler batch creation to a continuous dashboard-run loop that enqueues missing jobs, processes small chunks in franchise-first order, supports stop-after-current-chunk, renders `Tanpa teks` as a resolved status, and updates OCR copy/tooltips away from the old "Jalankan batch" instruction.
- `js/auth-clerk-core.js` and `js/auth-clerk.js`: Hardened Clerk login/session activation by routing email/password, password-reset, registration, and OAuth-created sessions through a shared activation helper that refreshes Clerk resources and errors clearly if the browser still has no active session before redirecting.
- `scripts/check-ocr-job-runner.ts`: Added coverage for the new `no_text` dashboard OCR status schema.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented the simplified OCR execution UX, resolved no-text job state, scheduler-overdue refresh behavior, updated auth/session responsibility, and recorded a follow-up recommendation for a server-side continuous-OCR run lease.
- Remote D1 `franchise_db`: Applied migration `0026_ocr_no_text_status.sql` and verified OCR job counts include the new `no_text` status.

## 2026-07-10 01:18 (Asia/Jakarta)
### Added
- `functions/_dashboard-ocr-schemas.js` and `functions/dashboard-data.js`: Added the admin `search_ocr_jobs` dashboard action for paginated OCR job status filtering.
- `functions/_ocr-job-runner.js`: Added server-side OCR job search by status/franchise, including a virtual `unqueued` status that lists active proposal images not yet in `ocr_jobs`.
- `js/dashboard-ocr-state.js`, `js/dashboard-ocr-providers.js`, `js/dashboard-ocr-jobs.js`, `js/dashboard-ocr-batches.js`, and `js/dashboard-ocr-results.js`: Added focused OCR dashboard browser modules for state initialization, provider/scheduler rendering, job rendering, batch/countdown rendering, and OCR result rendering.
- `.context/session-20260710-0118.md`: Added this session continuity snapshot for OCR job filtering, pagination, and dashboard OCR refactor planning.

### Changed
- `js/dashboard-ocr.js`: Changed OCR job status counts into clickable filter chips, added a default server-backed `Semua` job list with pagination, added a per-page job limit selector defaulting to 120, grouped visible jobs by franchise, preserved the active job filter after OCR mutations, improved batch Refresh feedback so a completed refresh visibly reports when no server-side progress changed, and refactored the file into an OCR coordinator/facade that delegates state and rendering to focused modules.
- `js/dashboard-admin.js`: Changed dashboard data fetches to `cache: "no-store"` so manual Refresh actions do not look stale because of browser/intermediate caching.
- `css/dashboard-ocr.css`: Added compact grouped job-card, filter-chip, job-limit selector, and pagination styles for the OCR execution panel.
- `src/pages/dashboard/index.astro`: Changed the OCR job status container from a paragraph to a div so it can validly contain interactive filter buttons, added the OCR job per-page selector, and loaded the focused OCR browser modules before the OCR facade.
- `scripts/check-dashboard-ocr-client.mjs`: Expanded the OCR dashboard regression check to cover the split browser modules and job filter/pagination wiring.
- `AUDIT.md` and `SUGGESTION.md`: Marked the `js/dashboard-ocr.js` focused module split complete and kept `src/pages/dashboard/index.astro` as the next dashboard refactor candidate.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the server-side OCR job filtering/pagination contract, grouped dashboard job UI, and split OCR dashboard browser modules.

## 2026-07-10 00:28 (Asia/Jakarta)
### Added
- `migrations/0025_ocr_batch_scheduler_timing.sql`: Added structured OCR batch scheduler timing fields for trigger status, delay seconds, due timestamp, and last-trigger timestamp.
- `.context/session-20260710-0028.md`: Added this session continuity snapshot for structured OCR scheduler timing implementation.

### Changed
- `functions/_ocr-scheduler-config.js`: Changed QStash dispatch to write structured scheduler trigger ETA/status fields to `ocr_batch_runs` on success and clear ETA on scheduler failure.
- `functions/_ocr-batch-runs.js`: Changed masked batch output and retry status updates to include structured scheduler timing fields while preserving succeeded-job skip behavior.
- `functions/_ocr-job-runner.js`: Changed recent OCR batch reads to include structured scheduler timing fields for dashboard rendering.
- `js/dashboard-ocr.js`: Changed batch countdowns to use `scheduler_trigger_due_at` as the primary source, with `last_message` parsing kept only as a legacy fallback for older rows.
- `AGENTS.md`: Clarified that small additive SQL migrations are not a reason to defer closely related correctness/operations/UX suggestions.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `SUGGESTION.md`, and `docs/architecture/OCR_BATCH_SCHEDULING.md`: Documented structured OCR scheduler timing and marked suggestion 78 done.
- Remote D1 `franchise_db`: Applied migration `0025_ocr_batch_scheduler_timing.sql` and verified `ocr_batch_runs` has structured scheduler timing columns.

## 2026-07-10 00:10 (Asia/Jakarta)
### Added
- `.context/session-20260710-0010.md`: Added this session continuity snapshot for OCR batch retry and overdue scheduler feedback handling.

### Changed
- `functions/_ocr-batch-runs.js`: Changed persisted OCR batch retry to leave `succeeded` jobs untouched while returning retryable `failed` and stale `running` jobs in the same batch to `pending`, refresh progress counts immediately, and then reschedule the batch.
- `js/dashboard-ocr.js`: Changed batch retry status copy to report failed/running jobs returned to the queue, and kept scheduler countdown chips visible after the scheduled delay has passed with a clear Refresh/Retry instruction instead of hiding the feedback.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Updated OCR batch retry/overdue scheduler documentation and recorded a follow-up recommendation for structured scheduler ETA fields.

## 2026-07-09 01:03 (Asia/Jakarta)
### Added
- `.context/session-20260709-0103.md`: Added this session continuity snapshot for OCR provider rate-limit pause handling.
- `migrations/0024_ocr_batch_pause_statuses.sql`: Added OCR batch pause statuses for provider rate-limit and quota pauses.

### Changed
- `js/auth-clerk.js` and `src/pages/dashboard/index.astro`: Deferred mounting the dashboard login form until the dashboard actually needs to show login, avoiding a redundant hidden session-state sync and the confusing "Anda sudah login" step before the dashboard opens.
- `js/dashboard-admin.js`: Added a short per-tab `sessionStorage` cache for successful `/dashboard-data` payloads keyed to the current active Clerk user/session, so a recently opened authenticated dashboard can render immediately while live data refreshes in the background; missing/expired authorization clears the cache and relocks the protected shell.
- `js/dashboard-ocr.js` and `css/dashboard-ocr.css`: Added a live local countdown chip for OCR batch scheduler delays, so rows like "Trigger QStash terjadwal (10s)" give second-by-second waiting feedback before the next server refresh.
- `functions/_clerk-auth.js` and `functions/dashboard-data.js`: Added a fast D1-backed dashboard GET authorization path that verifies the Clerk bearer token and reads the already-synced D1 user/roles without fetching Clerk user details or rewriting Clerk metadata on every refresh; first sync, inactive users, or missing roles still fall back to the existing full sync path, and dashboard POST actions still use full auth sync.
- `TECHNICAL_INVENTORY.md` and `SUGGESTION.md`: Audited the OCR runtime inventory for suggestion 76 and confirmed the `_ocr-job-runner.js` and `ocr-worker.js` documentation now lives in single canonical blocks.
- `functions/_ocr-job-runner.js`: Changed provider rate-limit/quota handling so E553/429-style provider limit errors put the current job back to `pending`, release any already-claimed unprocessed jobs, and mark the batch as paused instead of failing every following proposal page.
- `functions/_ocr-batch-runs.js`: Added paused batch progress support and changed runnable-provider checks to exclude providers still in cooldown.
- `functions/_ocr-batch-runs.js`: Fixed expired cooldown handling so providers with `health_status = 'cooldown'` become runnable again after `cooldown_until` passes.
- `functions/ocr-worker.js`: Stopped third-party scheduler re-dispatch when a scoped OCR batch is paused for provider rate limit/quota and normalized daily usage timestamp comparisons.
- `js/dashboard-ocr.js`: Added visible paused batch labels, treated only currently active cooldown providers as not runnable, labeled expired cooldowns clearly, and disabled per-batch Retry when no provider is runnable.
- `css/dashboard-ocr.css`: Changed Hasil OCR franchise cards to a responsive grid that shows two cards per row when viewport width allows.
- `AGENTS.md`: Added a persistent rule that necessary committed SQL migrations must be applied to the active remote D1 database before final reporting unless explicitly declined or blocked.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/OCR_BATCH_SCHEDULING.md`: Updated OCR batch documentation for pause-on-rate-limit behavior.
- Remote D1 `franchise_db`: Applied migration `0024_ocr_batch_pause_statuses.sql` and verified `ocr_batch_runs.status` accepts `paused_rate_limit` and `paused_quota`.
- Remote D1 `franchise_db`: Reset expired `ocr_space` cooldown to `ready` after confirming `cooldown_until` had already passed, so current production retry is not blocked by stale cooldown state.

## 2026-07-08 19:58 (Asia/Jakarta)
### Added
- `.context/session-20260708-2040.md`: Added this session continuity snapshot for QStash batch retry fixes and the suggestion 73 OCR maintainability split.
- `migrations/0023_ocr_batch_scheduler.sql`: Added persisted OCR batch runs, OCR job `batch_id`, and encrypted third-party OCR scheduler provider configuration for Upstash QStash, cron-job.org, Inngest, and Trigger.dev.
- `functions/_ocr-scheduler-config.js`: Added masked scheduler config reads, encrypted scheduler credential saves using `OCR_KEY`, scheduler enable toggles, and Upstash QStash delayed trigger dispatch to `/ocr-worker`.
- `functions/_ocr-batch-runs.js`: Added a focused persisted OCR batch-run module for batch creation, assignment, progress refresh, safe masking, and retry scheduler dispatch.
- `js/dashboard-ocr-schedulers.js`: Added a focused dashboard OCR scheduler metadata/helper module.

### Changed
- `functions/_dashboard-ocr-schemas.js`: Added scheduler config/toggle action schemas, `start_ocr_batch_run`, and optional `batch_id` support for bounded OCR runs.
- `functions/_ocr-job-runner.js`: Added persisted OCR batch creation up to 100 jobs, batch job assignment, batch progress refresh, batch-scoped claiming, and third-party scheduler triggering while preserving franchise-first job processing.
- `functions/dashboard-data.js`: Added masked OCR scheduler state to dashboard reads and routed scheduler config/toggle plus persisted OCR batch start actions.
- `functions/ocr-worker.js`: Added `batch_id` support, harmless preflight request handling, and next-trigger scheduling through the active third-party scheduler while preserving `OCR_SECRET` protection and daily cap checks.
- `functions/_ocr-scheduler-config.js`: Fixed Upstash QStash publish URL formatting, validates scheduler worker URLs before dispatch, strips a pasted `Bearer ` prefix from stored QStash tokens, and returns a clearer invalid-token hint when QStash responds with 401.
- `functions/dashboard-data.js` and `functions/_dashboard-ocr-schemas.js`: Added `retry_ocr_batch_run` so an existing failed/running OCR batch can be rescheduled after scheduler credential or URL fixes.
- `functions/_ocr-scheduler-config.js`, `functions/_ocr-batch-runs.js`, `functions/ocr-worker.js`, and `js/dashboard-ocr.js`: Added automatic Upstash QStash scheduler preflight before `Jalankan 100`; failed preflight now blocks batch creation instead of producing a confusing `Running 0/100` batch row.
- `functions/_ocr-job-runner.js` and `functions/_proposal-knowledge.js`: Fixed scheduled OCR worker foreign-key failures by resolving suggestion/audit actors from the original job requester and skipping suggestion creation when no valid D1 user actor exists.
- `functions/_ocr-batch-runs.js` and `js/dashboard-ocr.js`: Changed batch Retry to reset failed jobs in that batch back to pending before rescheduling the third-party trigger, so already-failed FK batches can be retried from the batch row.
- `js/dashboard-ocr.js` and `css/dashboard-ocr.css`: Reworked Hasil OCR into compact franchise-grouped cards with per-franchise page prev/next controls, page chips, icons, source-image/review actions, and auto-refresh polling while queued/running OCR batches are visible.
- `functions/_dashboard-ocr-schemas.js`, `functions/_ocr-job-runner.js`, `functions/dashboard-data.js`, `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, `js/dashboard-ocr.js`, and `css/dashboard-ocr.css`: Added server-side Hasil OCR history search/filter by text/franchise/status with paged "Muat lagi" loading while keeping the default dashboard payload compact.
- `functions/_ocr-job-runner.js`: Increased dashboard OCR result preview output so grouped franchise result cards can show more proposal pages per franchise.
- `functions/_ocr-job-runner.js`: Refactored persisted batch-run creation/progress out to `_ocr-batch-runs.js` while keeping OCR job processing, provider failover, and proposal knowledge persistence in the runner.
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, `js/dashboard-ocr.js`, `js/dashboard-ocr-schedulers.js`, and `css/dashboard-ocr.css`: Added the OCR Scheduler panel, encrypted scheduler credential autosave UI, `Jalankan 100` persisted-batch action, visible OCR batch progress rows, and per-batch Retry/Refresh controls.
- `docs/architecture/OCR_BATCH_SCHEDULING.md`: Updated the OCR batch strategy from GitHub/Cloudflare scheduling to third-party scheduler/queue integration, with Upstash QStash as the implemented automatic path.
- `AUDIT.md`: Added the 2026-07-08 refactor-candidate plan for OCR runner, dashboard OCR client, OCR dashboard markup, and scheduler provider adapters.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Updated the living code map for OCR scheduler config, persisted batch runs, worker batch draining, and dashboard OCR scheduler UI.
- `SUGGESTION.md`: Marked suggestion 72 done and added suggestion 73 for follow-up OCR maintainability refactors.
- `SUGGESTION.md` and `AUDIT.md`: Marked suggestion 73 done for the first OCR maintainability split and kept remaining deeper split candidates as future follow-up.
- `SUGGESTION.md`: Marked suggestion 74 done by implementing automatic scheduler preflight before large batch starts.
- `SUGGESTION.md`: Marked suggestion 75 done by adding server-side OCR result history search/filter controls.
- Remote D1 `franchise_db`: Applied migration `0023_ocr_batch_scheduler.sql` for OCR batch/scheduler state.

### Removed
- `.github/workflows/ocr-worker.yaml`: Removed the OCR-specific GitHub Actions scheduler path so OCR batch continuation uses third-party providers instead of GitHub/Cloudflare scheduling.

## 2026-07-08 01:36 (Asia/Jakarta)
### Added
- `.context/session-20260708-0136.md`: Added this session continuity snapshot.
- `.context/session-20260708-1259.md`: Added this session continuity snapshot for the OCR provider toggle/retry work.
- `.context/session-20260708-1456.md`: Added this session continuity snapshot for the OCR job-row UX and dashboard auth skeleton work.
- `.context/session-20260708-1513.md`: Added this session continuity snapshot for the broader dashboard CSS feature-module extraction.
- `.context/session-20260708-1733.md`: Added this session continuity snapshot for OCR no-text handling and dashboard schema refactor work.
- `.context/session-20260708-1804.md`: Added this session continuity snapshot for OCR batch scheduling research.
- `css/dashboard-auth.css`: Added a focused dashboard auth/loading stylesheet module.
- `css/dashboard-review.css`: Added a focused dashboard Review/Data Quality stylesheet module for guided edit rows, field diffs, and Area Listing editor layout.
- `css/dashboard-operations.css`: Added a focused dashboard Operations/admin helper stylesheet module for full-width panels, publication controls, and checkbox rows.
- `css/dashboard-premium.css`: Added a focused dashboard Premium Operations stylesheet module for payment/settings forms, QRIS preview, and Premium layout rules.
- `css/dashboard-ocr.css`: Added a focused dashboard OCR stylesheet module for OCR provider, job, result, and responsive UI.
- `functions/ocr-worker.js`: Added a protected OCR queue worker endpoint that uses `OCR_SECRET`, small bounded batches, daily counted-usage caps, and operation-event summaries for larger queued backfills.
- `functions/_dashboard-ocr-schemas.js`: Added a focused OCR dashboard action schema module for provider config/toggles, dry-run, bounded batches, retries, and no-text resolution.
- `docs/architecture/OCR_BATCH_SCHEDULING.md`: Added scheduler/cron free-tier research and a persisted-batch architecture recommendation for one-click OCR runs up to 100 jobs.
- `.github/workflows/ocr-worker.yaml`: Added a manual/scheduled OCR worker trigger. Manual runs can be used without the cron gate; scheduled runs require repository variable `OCR_WORKER_ENABLED=true`.
- `migrations/0022_ocr_provider_rate_limits.sql`: Added provider short-window rate-limit metadata and `cooldown_until` so OCR batches can skip providers that are temporarily rate-limited.

### Changed
- `AGENTS.md`: Added the repository-specific validation rule that `node --check` should not be used on Cloudflare Functions ESM files; use the repo Functions/TypeScript checks instead.
- `scripts/check-dashboard-ocr-client.mjs` and `package.json`: Added `pnpm run dashboard:ocr:check` for the browser OCR dashboard module's provider-toggle, retry, and no-active-provider disabled-state wiring.
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, and `css/dashboard.css`: Added a dashboard auth loading skeleton so `/dashboard` does not show the login form while Clerk/session/dashboard authorization is still being checked.
- `js/dashboard-ocr.js` and `css/dashboard.css`: Reworked recent OCR job rows into icon-led rows with status chips, compact metadata, action chips, listing/result icons, error icons, and clearer direct per-row OCR retry/run copy.
- `src/pages/dashboard/index.astro` and `css/dashboard.css`: Refactored dashboard styling by loading dedicated `dashboard-auth.css`, `dashboard-review.css`, `dashboard-operations.css`, `dashboard-premium.css`, and `dashboard-ocr.css` modules, reducing the base dashboard stylesheet to shared shell/layout/components.
- `functions/_ocr-job-runner.js` and `functions/dashboard-data.js`: Changed single failed-job retry to immediately run OCR for that job after resetting it to `pending`; batch failed retry remains a bounded requeue action.
- `src/pages/dashboard/index.astro`: Renamed the batch failed retry button to `Antre ulang gagal`, changed its icon to a Font Awesome 5-compatible `fa-redo-alt`, and clarified the tooltip that batch retry requeues jobs before batch execution.
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, `js/dashboard-ocr.js`, and `css/dashboard.css`: Moved OCR provider active/disabled control out of the credential form into the Prioritas Provider OCR list, added failed-job retry buttons, added batch retry for failed OCR jobs, and greyed out OCR execution/retry controls when no active provider with stored credentials is available.
- `functions/_dashboard-schemas.js`, `functions/dashboard-data.js`, `functions/_ocr-provider-config.js`, and `functions/_ocr-job-runner.js`: Added validated `toggle_ocr_provider_enabled`, `retry_ocr_job`, and `retry_failed_ocr_jobs` dashboard actions; provider toggles now validate requirements separately from credential autosave, and retries move failed jobs back to `pending` without deleting attempt history.
- `DASHBOARD.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented the OCR provider activation fix, disabled no-provider execution state, failed-job retry workflow, dashboard action-icon UX audit, auth skeleton, dashboard CSS refactor, and the new dashboard OCR client regression check.
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, `js/dashboard-ocr.js`, and `css/dashboard.css`: Reworked the OCR tab for non-technical admins with guide cards, OCR subtabs for Pengaturan/Eksekusi Job/Hasil OCR, clearer tooltips, icon+text action buttons, better desktop/mobile layout, auto-saving provider configuration, disabled-provider greying, and explicit dry-run/batch copy.
- `js/dashboard-ocr.js` and `css/dashboard.css`: Added visible provider error panels and a `Copy error` button that copies provider health/error context for troubleshooting without exposing credentials.
- `functions/_ocr-job-runner.js`, `functions/dashboard-data.js`, `functions/_dashboard-schemas.js`, `functions/_dashboard-ocr-schemas.js`, `js/dashboard-ocr.js`, and `css/dashboard-ocr.css`: Added source-image links for recent OCR jobs, no-text manual resolution, `needs_review` handling for text-too-short OCR outcomes, retry support for needs-review jobs, and split OCR-specific dashboard action validation out of the shared dashboard schema facade.
- `src/lib/franchise-detail-styles.ts` and `src/lib/franchise-detail-scripts.ts`: Changed brochure previous/next image navigation to transparent gradient overlays that appear only while the pointer is moving and auto-hide after one second of pointer inactivity.
- `functions/_ocr-job-runner.js`: Added OCR result rows to `/dashboard-data`, including listing slug, source-text preview, candidate field summary, latest proposal-extraction suggestion status, proposal page/source context, franchise-first pending-job claiming, and provider short-window cooldown checks so manual/worker batches process fuller franchise proposal context without duplicate OCR.
- `functions/_ocr-provider-config.js` and `js/dashboard-ocr.js`: Exposed provider rate-limit and cooldown metadata in the OCR provider panel without making those values editable in the admin form.
- `src/pages/dashboard/index.astro`, `js/dashboard-ocr.js`, and `css/dashboard.css`: Fixed OCR enqueue button icon/alignment and linked successful recent jobs directly to the matching Hasil OCR row.
- `DASHBOARD.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/architecture/OCR_PROVIDER_STRATEGY.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, `docs/README.md`, and `SUGGESTION.md`: Documented the OCR admin UX improvements, bounded/franchise-first batch behavior, result-review path, worker setup, provider cooldown guardrails, and marked suggestions 67 and 68 complete.
- `docs/README.md`, `docs/architecture/OCR_PROVIDER_STRATEGY.md`, and `SUGGESTION.md`: Linked the OCR batch scheduling strategy and recorded the follow-up to add persisted OCR batch runs before raising dashboard batch UX to 100 jobs.
- Cloudflare Pages project `franchisee-id` and GitHub repository `cfpages-syamsulalam-net/Franchisee.id`: Set matching `OCR_SECRET` secrets without printing the generated value.
- Remote D1 `franchise_db`: Applied migration `0022_ocr_provider_rate_limits.sql` and seeded OCR provider short-window rate-limit metadata.

## 2026-07-07 17:39 (Asia/Jakarta)
### Added
- `migrations/0021_ocr_job_queue.sql`: Added OCR content-hash cache, job queue, provider-attempt log, and provider-usage event tables for resumable proposal OCR.
- `functions/_ocr-provider-adapters.js`: Added provider adapters and normalized OCR text handling for OCR.Space, Azure Vision, Cloudflare Workers AI, Google Vision, Groq Vision, AWS Textract, Veryfi, Mindee, PDF.co, and API4AI using encrypted D1 credentials decrypted with `OCR_KEY`.
- `functions/_ocr-job-runner.js`: Added admin-triggered OCR dry-run/enqueue/run orchestration with bounded batch size, cache reuse, local quota checks, provider failover, attempt/usage logging, and proposal-knowledge persistence through pending review suggestions.
- `scripts/check-ocr-job-runner.ts` and `package.json`: Added `pnpm run ocr:runner:check` coverage for OCR job action validation, batch bounds, migration fallback, and text normalization.
- `.context/session-20260707-1739.md`: Added this session continuity snapshot.

### Changed
- `functions/_dashboard-schemas.js` and `functions/dashboard-data.js`: Added validated `run_ocr_dry_run`, `enqueue_ocr_jobs`, and `run_ocr_jobs` dashboard actions plus admin OCR job status in `/dashboard-data`.
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, `js/dashboard-ocr.js`, and `css/dashboard.css`: Added admin OCR dry-run/job controls, status counts, recent job rows, and explicit copy that OCR only sends proposal data externally when an admin runs a dry-run or batch.
- `docs/architecture/OCR_PROVIDER_STRATEGY.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, `docs/README.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented the OCR job/cache/failover/dry-run implementation and marked brochure OCR suggestions 62 and 66 complete.
- Remote D1 `franchise_db`: Applied migration `0021_ocr_job_queue.sql` and verified `ocr_jobs`, `ocr_attempts`, `ocr_content_cache`, and `ocr_provider_usage_events` exist.

## 2026-07-07 16:44 (Asia/Jakarta)
### Added
- `src/lib/ocr-provider-metadata.js`: Added the shared OCR provider metadata contract for visible dashboard fields, labels/help copy, and activation requirements.
- `.context/session-20260707-1644.md`: Added this session continuity snapshot.

### Changed
- `js/dashboard-ocr.js`, `src/pages/dashboard/index.astro`, and `functions/_ocr-provider-config.js`: Changed OCR provider field visibility and activation validation to use the shared metadata contract instead of duplicated UI/backend provider rules.
- `scripts/check-ocr-provider-config.ts`: Added assertions for shared OCR metadata coverage and provider requirement behavior.
- `AGENTS.md`: Clarified that closely-related low-risk contract centralization should be completed in the same implementation session instead of left as backlog.
- `docs/architecture/OCR_PROVIDER_STRATEGY.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Marked suggestion 65 complete and documented the shared OCR metadata source of truth.

## 2026-07-07 15:16 (Asia/Jakarta)
### Added
- `.context/session-20260707-1516.md`: Added this session continuity snapshot.

### Changed
- `src/pages/dashboard/index.astro`, `js/dashboard-ocr.js`, and `css/dashboard.css`: Changed the OCR provider form to show only provider-specific credential/config fields, display stored-key badges, move quota/free-limit/trial data into read-only metadata, and improve spacing/containment for OCR fields and warning boxes.
- `functions/_ocr-provider-config.js` and `scripts/check-ocr-provider-config.ts`: Changed OCR provider saves to preserve seeded quota/free-limit metadata when the dashboard no longer submits those fields, and added regression coverage for that behavior.
- `docs/architecture/OCR_PROVIDER_STRATEGY.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented the provider-specific OCR field matrix, read-only quota rule, and follow-up to centralize provider requirements before adapter work.

## 2026-07-07 09:45 (Asia/Jakarta)
### Added
- `src/lib/franchise-detail-styles.ts`: Added the generated detail-page CSS module extracted from the former mixed detail asset injector.
- `src/lib/franchise-detail-scripts.ts`: Added the generated detail-page browser script module for tabs, brochure navigation/download behavior, contact-tab shortcuts, and compare buttons.
- `scripts/check-franchise-detail-assets.ts` and `package.json`: Added `pnpm run detail-assets:check` coverage for generated detail asset injection, idempotency, proposal controls, contact floats, compare behavior, and legacy WordPress runtime cleanup.
- `.context/session-20260707-0945.md`: Added this session continuity snapshot.

### Changed
- `src/lib/franchise-detail-assets.ts`: Reduced the large mixed CSS/JS module to a small injector facade that delegates to focused generated style and script modules.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Marked suggestion 64 as implemented and updated the module map/refactor plan for the detail asset split.
- Cloudflare Pages project `franchisee-id`: Set the production `OCR_KEY` secret through the `franchise-network` cfman account alias without printing the generated value.

## 2026-07-07 09:30 (Asia/Jakarta)
### Added
- `functions/_ocr-credential-crypto.js`: Added OCR credential envelope encryption helpers using AES-GCM, provider/field AAD, and the external Cloudflare Pages secret `OCR_KEY`.
- `functions/_proposal-pdf.js`: Added a server-side proposal PDF builder that fetches allowlisted JPEG proposal pages, applies a bottom-right Franchisee.id watermark to the returned PDF only, and leaves R2 originals unchanged.
- `functions/proposal-download.js`: Added the public proposal PDF download endpoint; POST creates the watermarked PDF and GET returns a 405 JSON message.
- `scripts/check-proposal-download.ts` and `package.json`: Added `pnpm run proposal-download:check` regression coverage for PDF generation and legacy WordPress runtime cleanup.
- `.context/session-20260707-0930.md`: Added this session continuity snapshot.

### Changed
- `functions/_ocr-provider-config.js`, `functions/dashboard-data.js`, and `scripts/check-ocr-provider-config.ts`: Changed OCR credential saves to encrypt values with `OCR_KEY`, fail closed without the external key when credentials are saved/enabled, re-encrypt legacy plaintext on next save, and validate encryption/decryption behavior.
- `src/lib/franchise-premium-detail.ts` and `src/lib/franchise-detail-assets.ts`: Moved brochure controls into the image surface, added left/right 50% overlay navigation, moved download/status into a hover/focus top bar, hid empty proposal status spacing, and changed PDF download to call `/proposal-download` with in-button progress.
- `src/lib/franchise-text.ts`, `scripts/copy-legacy-static.mjs`, and `scripts/d1-page-renderer.ts`: Added generated/copied HTML sanitization for unused WordPress runtime snippets: AnalyticsWP, WordPress emoji loading, LatePoint front scripts, and `/wp-admin/admin-ajax.php` references.
- `js/profile-premium.js` and `css/profile-premium.css`: Replaced the Membership empty state with CTA links to add a brand or find a listing to claim.
- `src/pages/premium/index.astro`: Reworked Indonesian Premium copy to read more naturally while preserving the no-lead-guarantee positioning.
- `AUDIT.md`: Documented the production fix set and added the requested refactor plan for large `src/lib/franchise-detail-assets.ts`.
- `docs/architecture/OCR_PROVIDER_STRATEGY.md` and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the `OCR_KEY` external-root-key requirement and server-side proposal PDF download decision.
- `docs/ux/LISTING_DETAIL_UX_AUDIT.md`: Added the 2026-07-07 brochure download/controls and WordPress-runtime cleanup plan.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Updated module maps/backlog to reflect encrypted OCR credentials, server-side proposal downloads, sanitizer behavior, and the planned detail-assets refactor.
- `json/d1-franchise-static-data.json`, `json/d1-generated-pages-manifest.json`, and `peluang-usaha/*.html`: Regenerated tracked D1 static franchise output with the new brochure overlay/download behavior and legacy WordPress runtime cleanup.
- `dist/**`: Regenerated ignored Astro build output during validation.
- `.context/proposal-functions-check/index.js`: Created temporarily for Pages Functions bundle validation, then removed after successful compilation.

## 2026-07-07 01:07 (Asia/Jakarta)
### Added
- `docs/architecture/OCR_PROVIDER_STRATEGY.md`: Ranked ten OCR providers using their official free-tier terms, documented provider-specific caveats, and defined a compliant quota-aware rotation, caching, retry, and rollout plan.
- `migrations/0020_ocr_provider_configs.sql`: Added the admin-managed OCR provider registry and credential/configuration fields; applied it to remote `franchise_db` and verified ten disabled providers with zero configured API keys.
- `functions/_ocr-provider-config.js`: Added admin-only masked OCR configuration reads and validated updates that preserve blank credentials, support explicit deletion, and never return stored secrets to the browser or audit log.
- `js/dashboard-ocr.js`: Added the modular dashboard controller for OCR provider status, non-secret settings, password-only credential entry, and explicit credential removal.
- `scripts/check-ocr-provider-config.ts` and `package.json`: Added `pnpm run ocr:check` regression coverage for action validation and the no-secret-read dashboard contract.
- `.context/session-20260707-0107.md`: Added the OCR provider research, D1 configuration, deployment state, security decision, and validation snapshot.

### Changed
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, and `css/dashboard.css`: Added the admin-only OCR configuration tab and provider form, including key/secret, endpoint, account/project ID, region, model, priority, quota, trial expiry, activation, and clear-credential controls.
- `functions/_dashboard-schemas.js` and `functions/dashboard-data.js`: Added validated `update_ocr_provider_config` handling and role-aware masked OCR configuration data to the dashboard API.
- `docs/README.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, `DASHBOARD.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented the OCR provider registry, dashboard/API contracts, remote migration state, plaintext-at-rest D1 tradeoff, and future adapter/job-runner work.
- `SUGGESTION.md`: Advanced the OCR backfill recommendation and added envelope encryption as the recommended follow-up before storing production credentials.
- `dist/**`: Regenerated ignored Astro build output during validation.
- `.context/ocr-functions-bundle-check/index.js` and `.context/ocr-functions-final-check/index.js`: Created temporarily for Pages Functions bundle validation, then removed after successful builds.

## 2026-07-06 23:27 (Asia/Jakarta)
### Added
- `functions/_proposal-knowledge.js`: Added Worker-compatible selectable-text extraction for uploaded proposal PDFs, deterministic missing-field candidates, auditable knowledge storage, and pending admin-review suggestion statements.
- `migrations/0019_proposal_knowledge.sql`: Added `franchise_asset_knowledge`; applied and verified it on remote `franchise_db`. Verified existing 0014-0018 changes and reconciled their missing remote migration-ledger entries before applying 0019.
- `scripts/check-proposal-knowledge.ts` and `package.json`: Added `pnpm run proposal:check` regression coverage for outlet, area, investment, fee, BEP, royalty, profit, and support extraction.
- `.context/session-20260706-2327.md`: Added this session continuity snapshot.

### Changed
- `scripts/build-d1-franchise-pages.ts`: Expanded the public D1 snapshot query to include the complete existing outlet/location/cost/contract/omzet/profit/royalty/package/publication fact contract so submitted form data reaches generated detail pages.
- `src/lib/franchise-premium-detail.ts` and `src/lib/franchise-detail-assets.ts`: Added one-page-at-a-time Brosur navigation, page count, keyboard arrows, compatible icons, simplified profile/tab borders, color-based active/inactive tabs, and bottom-right download-time Franchisee.id watermark compositing without changing R2 originals.
- `src/lib/franchise-contact.ts`, `src/lib/franchise-static.ts`, and `scripts/d1-page-renderer.ts`: Replaced hard-coded Alam floating detail contacts with each listing's parsed WhatsApp/phone and PIC/brand label.
- `functions/profile-upload.js` and `js/profile-page.js`: Schedule proposal knowledge extraction after owner PDF uploads and show user-facing review-status copy without delaying the upload response.
- `package.json` and `pnpm-lock.yaml`: Added the Worker-compatible `unpdf` runtime dependency.
- `FORM_SCHEMA.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `AUDIT.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`, and `docs/ux/LISTING_DETAIL_UX_AUDIT.md`: Documented the listing data-contract fix, brochure UX/watermark behavior, extraction/review contract, migration status, and implementation plan.
- `SUGGESTION.md`: Added suggestion 62 for a resumable, confidence-aware OCR backfill for image-only/scanned R2 proposal pages.
- `.context/functions-bundle-check/index.js`: Created temporarily to validate the Pages Functions bundle, then removed after successful compilation.

## 2026-07-06 21:44 (Asia/Jakarta)
### Added
- `src/lib/franchise-detail-tabs.ts`: Added a shared connected-tab composer for generated franchise detail pages, including `Profil`, `Detail`, `Investasi`, optional `Support`, optional Premium/media/Brosur/FAQ, and `Kontak` entries.
- `.context/session-20260706-2144.md`: Added this session snapshot for the franchise detail tab/hero consolidation pass.

### Changed
- `templates/detail-franchise-tpl.html`: Promoted the visible brand heading in the information section to H1, removed the hero background-image binding, and left the old hero/title block hidden by generated detail CSS.
- `src/lib/franchise-static.ts` and `scripts/d1-page-renderer.ts`: Moved detail profile facts into the shared `Profil` tab, moved description into `Detail`, added `Investasi`, reused the shared tab shell, and kept Astro output aligned with D1 bridge flat output.
- `src/lib/franchise-detail-assets.ts`: Hid the legacy hero block, restyled generated tabs as a full-width connected shell where the active tab overlaps the content edge, added detail/investment tab card styling, and switched the floating compare icon to the older compatible `fa-balance-scale`.
- `src/lib/franchise-static-assets.ts` and `src/lib/franchise-static.ts`: Switched generated comparison icons from `fa-scale-balanced` to `fa-balance-scale` for older Font Awesome compatibility.
- `src/lib/franchise-detail-summary.ts`: Switched net-profit fact icon to `fa-chart-line` for older Font Awesome compatibility.
- `src/lib/franchise-premium-detail.ts`: Renamed the proposal tab label/copy to buyer-facing `Brosur`.
- `docs/ux/LISTING_DETAIL_UX_AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Documented the connected tab shell, hero removal, shared tab composer, and updated detail page responsibilities.

## 2026-07-06 21:09 (Asia/Jakarta)
### Changed
- `.context/session-20260706-2109.md`: Added this session snapshot for generated listing-detail tooltip/tab polish and protected-shell favicon consistency.
- `src/lib/franchise-detail-summary.ts` and `src/lib/franchise-detail-assets.ts`: Switched generated detail fact icons to older compatible Font Awesome classes for founding year and outlet/area, added layperson tooltips for franchise economic terms, linked category facts to category browsing, made `Tanya Admin` / `Hubungi Admin` values open the Kontak tab, and restyled the tab shell to look like connected tabs instead of detached buttons.
- `src/pages/profil/index.astro` and `src/pages/dashboard/index.astro`: Added Franchisee.id favicon and apple-touch icon links so protected app shells match the public site browser tab branding.
- `docs/ux/LISTING_DETAIL_UX_AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Documented the detail fact tooltip/action behavior, tab styling, compatible icons, category link, and protected-shell favicon updates.

## 2026-07-06 18:53 (Asia/Jakarta)
### Added
- `.context/session-20260706-1853.md`: Added this session snapshot for the follow-up generated listing-detail UX pass.
- `src/lib/franchise-detail-summary.ts`: Added a shared generated detail summary renderer for complementary hero facts and the enriched `Informasi Franchise` logo/social/fact panel.

### Changed
- `docs/ux/LISTING_DETAIL_UX_AUDIT.md`: Added the follow-up listing-detail UX audit items for centered H1 composition, non-repetitive hero facts, compact action contrast, inline sticky-claim copy, official social links, and side-by-side information layout.
- `templates/detail-franchise-tpl.html`, `src/lib/franchise-static.ts`, `scripts/d1-page-renderer.ts`, and `src/lib/franchise-detail-assets.ts`: Moved save/compare actions from the H1 to the `Informasi Franchise` H2 row, rendered the enriched brand summary panel, kept social icons only for real D1/form URLs, hid legacy dummy social/detail blocks, improved compact action contrast, kept sticky claim brand text inline, and reused detail asset injection for D1 bridge flat pages.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented the shared detail summary module, new detail placeholders, updated generated detail-page responsibilities, and a follow-up automated visual smoke suggestion.

## 2026-07-06 15:19 (Asia/Jakarta)
### Added
- `docs/ux/LISTING_DETAIL_UX_AUDIT.md`: Added the Cloudflare pre-campaign Function analytics review checklist with required access, review sequence, route priorities, and daily trigger points.
- `src/pages/dashboard/index.astro`, `functions/_dashboard-schemas.js`, `functions/_premium-settings.js`, and `js/dashboard-premium-operations.js`: Added admin-managed Premium promo display frequency control, defaulting to one display per visitor/device/day during the configured promo period.

### Changed
- `js/site-promo-bar.js`: Changed promo ribbon suppression to reset by UTC day, added the “sekali hari ini” note when the cap is one, and kept event dedupe tied to promo identity.
- `src/lib/franchise-static-assets.ts`, `src/lib/franchise-detail-assets.ts`, `src/lib/franchise-buyer-tools.ts`, and `src/pages/profil/index.astro`: Removed promo ribbon loading from generated low-intent SEO/buyer-tool pages and kept it on `/premium` plus `/profil`.
- `functions/_dashboard-queries.js`: Updated Traffic Guardrail control copy to describe the once-per-visitor/device/day promo behavior.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented the pre-campaign review checklist, high-intent-only promo surfaces, and daily promo display cap.
- `peluang-usaha/*.html` and `json/d1-generated-pages-manifest.json`: Regenerated D1-backed static output after removing promo loading from generated listing/detail pages.

## 2026-07-06 13:05 (Asia/Jakarta)
### Added
- `.context/session-20260706-1305.md`: Added this session snapshot for compact listing detail UX implementation and dashboard traffic guardrail visibility.
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, `js/dashboard-operations.js`, `functions/dashboard-data.js`, and `functions/_dashboard-queries.js`: Added a `/dashboard` Traffic Guardrail panel that surfaces the Cloudflare Workers/Pages Functions Free daily limit, warning threshold, reset time, active public-page throttles/caches, and the optional credentials needed for future live analytics.

### Changed
- `templates/detail-franchise-tpl.html`, `src/lib/franchise-static.ts`, `scripts/d1-page-renderer.ts`, and `src/lib/franchise-detail-assets.ts`: Moved detail save/compare controls into the title row, added compact quick-fact chips near the brand title, tightened hero/detail spacing, and switched the floating claim CTA to reusable class-based styling.
- `docs/ux/LISTING_DETAIL_UX_AUDIT.md`: Marked the title-row actions, quick-fact chips, class-based sticky claim CTA, and dashboard local traffic guardrail items as implemented.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented the compact listing detail UI, dashboard traffic guardrail response model, and remaining post-deploy Cloudflare route-metric review.
- `peluang-usaha/*.html` and `json/d1-generated-pages-manifest.json`: Regenerated D1-backed flat listing detail pages after detail template and renderer updates.

## 2026-07-06 10:55 (Asia/Jakarta)
### Added
- `.context/session-20260706-1055.md`: Added this session snapshot for Cloudflare Pages Function usage throttling and listing detail UX cleanup.
- `docs/ux/LISTING_DETAIL_UX_AUDIT.md`: Added the listing-detail UX and Worker usage audit with Cloudflare official references, likely public Function request drivers, implemented fixes, and remaining traffic-readiness checklist.

### Changed
- `js/product-events.js`: Added sampling, dedupe windows, and a per-browser daily public-event budget so listing detail views/contact clicks do not invoke `/product-event` on every page load.
- `js/site-promo-bar.js`: Added browser-side promo response caching and 24-hour promo event dedupe before calling `/premium-promo` and `/premium-event`.
- `js/premium-page.js`: Added Premium page-view and CTA-click dedupe before calling `/premium-event`.
- `functions/premium-promo.js`: Increased public promo cache headers to 15 minutes with stale revalidation.
- `src/lib/franchise-detail-assets.ts`: Tightened generated detail-page spacing, made breadcrumbs subtler, capped detail image height, and converted detail save/compare controls to compact icon buttons with shared tooltip text.
- `src/lib/franchise-contact.ts`, `src/lib/franchise-static.ts`, `scripts/d1-page-renderer.ts`, and `js/build-details.js`: Removed duplicate inline claim CTAs from generated detail disclaimer/contact copy so unclaimed listings use the floating claim bar as the single claim action.
- `templates/detail-franchise-tpl.html`: Removed the requested Maxim GIF block from the generated detail template.
- `peluang-usaha/*.html`, `json/d1-generated-pages-manifest.json`: Regenerated D1-backed flat listing detail pages after template, disclaimer, and compact detail UX updates.
- `peluang-usaha/english-study-centre/index.html`, `peluang-usaha/kfc/index.html`, and `peluang-usaha/pisang-molen-m-a/index.html`: Removed remaining legacy nested references to the requested Maxim GIF.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/README.md`, and `SUGGESTION.md`: Documented the public Function throttling, listing detail UX audit, single-claim-CTA behavior, and added the Cloudflare usage review follow-up suggestion.

## 2026-07-05 23:55 (Asia/Jakarta)
### Added
- `.context/session-20260705-2355.md`: Added this session snapshot for suggestion 60 country metadata centralization.
- `data/country-metadata.json` and `json/country-metadata.json`: Added canonical/public supported-country metadata for names, ISO codes, flags, dial codes, aliases, WhatsApp digit ranges, mobile patterns, and display grouping.
- `functions/_country-metadata.js` and `src/lib/country-metadata.ts`: Added shared Functions and Astro/static country metadata adapters for country lookup/display and international mobile matching/formatting.
- `scripts/check-country-metadata.mjs`: Added country metadata drift validation.

### Changed
- `package.json`: Added `country:check`.
- `js/form-01-state-helpers.js`, `js/form-05-country-whatsapp.js`, `js/form-07-init.js`, and `js/form-utils.js`: Switched form country-code rendering, collapsed origin-country inference, and WhatsApp digit-range validation to shared country metadata.
- `functions/_form-submit-utils.js`: Switched brand-country fallback from a local dial-code map to shared country metadata.
- `functions/_dashboard-utils.js`: Switched international mobile validation/display from local country-specific branches to shared country metadata helpers.
- `src/lib/franchise-static.ts` and `src/lib/franchise-contact.ts`: Switched public country display and international phone matching/formatting to shared country metadata.
- `scripts/check-contact-parser.mjs`: Loaded the shared country metadata adapter in the parser regression harness.
- `json/d1-generated-pages-manifest.json`: Refreshed during `pnpm run build:astro` validation after shared country metadata wiring.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/README.md`, `docs/architecture/INTERNATIONAL_FRANCHISOR_POLICY.md`, and `SUGGESTION.md`: Documented the shared country metadata source/adapters and marked suggestion 60 complete.

## 2026-07-05 23:27 (Asia/Jakarta)
### Added
- `.context/session-20260705-2327.md`: Added this session snapshot for low-friction Indonesian defaults, overseas franchisor support, and legacy origin/target backfill.
- `docs/architecture/INTERNATIONAL_FRANCHISOR_POLICY.md`: Documented Indonesia/Indonesia defaults, collapsed non-Indonesia form behavior, non-Indonesia public flag display, and phone-signal backfill policy.
- `migrations/0018_backfill_franchise_origin_target_market.sql`: Added the replayable D1 backfill for legacy `brand_country` / `target_market` values from clear phone-country signals.

### Changed
- `docs/README.md`: Linked the new international franchisor policy in the documentation index and updated its timestamp.
- `json/country-codes.json`, `js/form-01-state-helpers.js`, and `daftar/index.html`: Expanded supported phone country options to SEA and nearby Asian markets with flag labels.
- `daftar/index.html`, `css/form-franchise/03-form-core.css`, and `js/form-07-init.js`: Collapsed brand origin/target-market fields for Indonesian franchisors, defaulted blank submissions to Indonesia/Indonesia, and opened/prefilled origin when a non-Indonesia contact country code is selected.
- `js/form-utils.js`: Expanded country-specific WhatsApp validation for supported SEA and nearby Asian countries.
- `functions/_form-submit-utils.js`: Defaulted missing franchisor listing origin/target metadata to Indonesia/Indonesia, with non-Indonesia contact country codes used as a fallback origin signal.
- `functions/_dashboard-utils.js`, `src/lib/franchise-contact.ts`, and `scripts/check-contact-parser.mjs`: Expanded dashboard/public contact parsing and regression coverage to supported SEA/nearby Asia mobile numbers while preserving Indonesian multi-number, landline, and call-center handling.
- `src/lib/franchise-static.ts`: Shows brand-origin and target-market facts with flag labels only when the listing origin is non-Indonesia; Indonesian listings remain visually uncluttered.
- `json/d1-franchise-static-data.json` and `json/d1-generated-pages-manifest.json`: Refreshed from remote D1 after the origin/target backfill so Astro output can render Keding as Taiwan-origin and Indonesian listings as default Indonesia.
- `FORM_SCHEMA.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented collapsed origin/market form behavior, default/backfill policy, expanded contact support, completed suggestion 59, and added suggestion 60 to centralize country metadata.
- Remote D1 `franchise_db`: Applied the legacy origin/target backfill. After correcting local Indonesian number precedence, final distribution is 192 Indonesia/Indonesia rows, 1 Taiwan/Indonesia row for Keding, and 4 blank rows without clear contact-country signals.

## 2026-07-05 18:48 (Asia/Jakarta)
### Added
- `.context/session-20260705-1848.md`: Added this session snapshot for international franchisor contact/onboarding readiness.
- `migrations/0017_franchise_origin_target_market.sql`: Added D1 columns for optional `franchises.brand_country` and `franchises.target_market` metadata.

### Changed
- `functions/_dashboard-utils.js`: Expanded structured contact parsing from Indonesia/Taiwan to regional mobile numbers for Malaysia, Singapore, China, Hong Kong, Taiwan, and Vietnam.
- `src/lib/franchise-contact.ts`: Mirrored regional mobile parsing and formatting for public listing detail contact rendering.
- `json/country-codes.json` and `js/form-01-state-helpers.js`: Added China, Hong Kong, Taiwan, and Vietnam to country-code options while preserving Malaysia/Singapore/US/Australia.
- `js/form-utils.js`: Made WhatsApp validation country-aware so short local mobile numbers from Singapore/Hong Kong and exact-length regional numbers are accepted.
- `scripts/check-contact-parser.mjs`: Added parser regression cases for Malaysia, Singapore, China, Hong Kong, and Vietnam.
- `daftar/index.html`: Added optional franchisor fields for brand origin and target market, and included regional static fallback country-code options for China, Hong Kong, Taiwan, and Vietnam.
- `functions/_form-submit-utils.js`, `functions/_form-submit-franchisor.js`, and `functions/_shared-schemas.js`: Persisted optional brand-origin and target-market fields for new franchisor listings and claimed listing updates.
- `functions/_profile-schemas.js`, `functions/_profile-listing-patch.js`, and `functions/_profile-read-model.js`: Allowed owner listing edits to read/write brand-origin and target-market metadata.
- `js/profile-franchisor.js` and `js/dashboard-review.js`: Exposed brand-origin and target-market fields in the owner listing editor and dashboard guided edit definitions.
- `scripts/build-d1-franchise-pages.ts`, `src/lib/shared-schemas.ts`, `src/lib/franchise-static.ts`, and `templates/detail-franchise-tpl.html`: Carried brand-origin and target-market metadata into the D1 static snapshot and rendered it on public cards/detail fact sections when available.
- `json/d1-franchise-static-data.json`, `json/d1-generated-pages-manifest.json`, and D1-generated `peluang-usaha/*.html`: Regenerated static franchise output after adding brand-origin and target-market snapshot fields.
- `CODEBASE.md`, `FORM_SCHEMA.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented regional franchisor contact support, completed the explicit origin/target-market suggestion, and added the reviewed legacy-origin backfill follow-up.
- Remote D1 `franchise_db`: Resolved the stale open `missing_contact` warning for Keding after confirming its structured Taiwan contact exists.
- Remote D1 `franchise_db`: Applied `0017_franchise_origin_target_market.sql` to add optional brand-origin and target-market columns.

## 2026-07-05 18:03 (Asia/Jakarta)
### Added
- `.context/session-20260705-1803.md`: Added this session snapshot for the Data Quality contact parser and remote cleanup work.
- `.context/contact-quality-cleanup-20260705-remote.sql`: Added the generated remote D1 cleanup SQL used to upsert structured contacts and resolve false-positive `suspicious_contact` checks.
- `scripts/check-contact-parser.mjs`: Added a focused parser regression check for Taiwan mobile, multi-number Indonesian mobile, hyphenated mobile, landline, and call-center contact formats.

### Changed
- `functions/_dashboard-utils.js`: Added generic structured phone parsing alongside WhatsApp-only parsing, including Taiwan mobile numbers, Indonesian mobile multi-number strings, Indonesian landlines, call-center numbers, and safer grouped-number start detection.
- `functions/_contact-normalization.js`: Switched normalized contact extraction to structured phone parsing while keeping WhatsApp source rows limited to WhatsApp-capable contacts.
- `src/lib/franchise-contact.ts`: Mirrored the stronger contact parser for public franchise detail contact rendering.
- `package.json`: Added `contact:check` for the focused contact parser regression check.
- `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Documented the stronger contact parsing, remote cleanup, and completed parser regression suggestion.
- Remote D1 `franchise_db`: Upserted 65 structured contact rows and resolved 36 false-positive open `suspicious_contact` quality checks.

## 2026-07-05 17:28 (Asia/Jakarta)
### Added
- `.context/session-20260705-1728.md`: Added this session snapshot for the dashboard Data Quality quick-edit bugfix.

### Changed
- `js/dashboard-review.js`: Made Data Quality quick-edit actions admin-aware, switch to the Review tab, scroll/focus the seeded edit form, show a status message, and add `name` attributes to dynamic guided edit controls.
- `src/pages/dashboard/index.astro`: Added `name` attributes to static guided edit and listing-location form controls.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the dashboard quick-edit and named-field behavior.
- `SUGGESTION.md`: Added suggestion 56 for browser-level Data Quality quick-edit smoke coverage.

## 2026-07-05 16:19 (Asia/Jakarta)
### Added
- `.context/session-20260705-1619.md`: Added this session snapshot for the `/dashboard-data` D1 SQL variable limit bugfix.

### Changed
- `functions/_dashboard-queries.js`: Chunked editable-listing structured-location reads so `/dashboard-data` no longer builds an oversized `IN (...)` bind list when loading many dashboard listings.
- `functions/_profile-franchisor-actions.js`: Chunked owned-listing location and publication reads to avoid the same D1 bind-limit class of bug in `/profil`.
- `functions/_profile-premium.js`: Chunked owned-listing Premium membership reads for orders, subscriptions, and readiness checks.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented chunked D1 ID-query behavior for dashboard/profile read models.
- `SUGGESTION.md`: Added suggestion 55 for a high-volume `/dashboard-data` read-model smoke test.

## 2026-07-05 15:57 (Asia/Jakarta)
### Added
- `.context/session-20260705-1557.md`: Added this session snapshot for the dashboard/profile UI consistency pass.

### Changed
- `docs/ux/TRAFFIC_FUNNEL_UX_AUDIT.md`: Added authenticated-surface findings for dashboard visual parity, `/profil` logged-in navbar contrast, and `/profil` menu active-state shape; marked implemented fixes done.
- `css/profile.css`: Added dark-header account navbar overrides for readable logged-in account text/role/logout on `/profil`, and rounded side-tab hover/active fills.
- `src/pages/dashboard/index.astro`: Added Outfit/DM Sans font loading and branded dashboard header identity markup.
- `css/dashboard.css`: Rethemed `/dashboard` with the warm yellow/black/cream app shell, dark sticky header, readable user chip, stronger metric cards, rounded tabs/panels/forms/buttons, and improved debug panel styling.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the protected profile/dashboard shell styling responsibilities.
- `SUGGESTION.md`: Added suggestion 54 for a live authenticated app-shell visual QA checklist after deploy.

## 2026-07-05 05:35 (Asia/Jakarta)
### Added
- `.context/session-20260705-0535.md`: Added this session snapshot for the `/profil` admin login bugfix.
- `scripts/check-profile-client.mjs`: Added a focused profile client regression check for profile script syntax and stale undefined helper usage.

### Changed
- `js/profile-page.js`: Fixed the `/profil` next-action panel by replacing the undefined `selectedFranchise()` call with the existing `selectedListing()` helper.
- `package.json`: Added `profile:check` to run the profile client regression check.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the new profile client regression check and package script.
- `SUGGESTION.md`: Added and completed suggestion 53 for a focused profile client undefined-helper regression check.

## 2026-07-05 00:40 (Asia/Jakarta)
### Added
- `.context/session-20260705-0040.md`: Added this session snapshot for the non-manual traffic-funnel implementation pass.

### Changed
- `index.html`: Cleaned generated homepage JSON-LD/RSS/Elementor config and footer logo alt text to use Franchisee.id public branding, and updated the footer support mailbox to `email@franchisee.id`.
- `src/lib/franchise-static.ts`: Added benefit-led franchisor CTA modules to generated directory/index/detail pages, updated generated directory title branding to Franchisee.id, normalized legacy-template public brand text/support mailbox in generated output, and replaced public build-mechanic copy with user-facing refresh language.
- `src/lib/franchise-static-assets.ts`: Added responsive generated-directory owner CTA styling.
- `src/lib/franchise-detail-assets.ts`: Added matching generated-detail owner CTA styling.
- `docs/ux/TRAFFIC_FUNNEL_UX_AUDIT.md`: Marked homepage brand cleanup and directory/detail franchisor CTA work done, with production QA still planned.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented generated owner CTA behavior and updated static renderer/asset responsibilities.
- Legacy static pages and generated templates: Replaced the old support mailbox with `email@franchisee.id` across tracked public HTML/template files.
- `SUGGESTION.md`: Updated suggestion 51 and marked suggestion 52 done after the user confirmed `email@franchisee.id` as the public support mailbox.

## 2026-07-04 23:26 (Asia/Jakarta)
### Added
- `.context/session-20260704-2326.md`: Added this session snapshot for the traffic-funnel implementation pass.

### Changed
- `index.html`: Updated visible homepage CTAs and public copy to use benefit-led Franchisee.id language, direct buyers to canonical opportunity discovery, and direct franchisors to a free brand start plus Premium education.
- `src/pages/premium/index.astro`: Reworked the Premium page copy so cold franchisors understand the benefit-first sequence: create a free brand page, then activate Premium when the brand is ready to look more trustworthy and easier to contact.
- `src/pages/profil/index.astro`: Loaded the Outfit display font alongside DM Sans for the refreshed profile visual language.
- `js/profile-page.js`: Added a role/state-aware next-best-action panel above `/profil` tabs for buyer discovery, free brand completion, Premium activation/payment state, active Premium analytics, and listing polish.
- `css/profile.css`: Rethemed the profile shell with yellow/black/cream site tokens, a stronger dark hero, branded cards/buttons, and responsive next-action styling.
- `docs/ux/TRAFFIC_FUNNEL_UX_AUDIT.md`: Marked implemented traffic-funnel items, added the benefit-first public-copy rule, and kept remaining production QA / directory CTA work explicit.
- `SUGGESTION.md`: Updated suggestion 51 to `In Progress` with implemented and remaining traffic-readiness work.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the profile next-action behavior, benefit-led Premium page, and refreshed profile styling responsibilities.

## 2026-07-04 22:54 (Asia/Jakarta)
### Added
- `docs/ux/TRAFFIC_FUNNEL_UX_AUDIT.md`: Added a traffic-readiness and UX conversion audit for the homepage-to-free-member-to-Premium funnel, including code-path evidence, visual critique for `/profil`, and an implementation tracker.
- `.context/session-20260704-2254.md`: Added this session snapshot for the funnel UX audit.

### Changed
- `docs/README.md`: Linked the new traffic funnel UX audit from the documentation index.
- `SUGGESTION.md`: Added suggestion 51 for strengthening homepage CTA hierarchy, `/profil` next-step prominence, and Premium conversion readiness before paid traffic.

## 2026-07-04 15:18 (Asia/Jakarta)
### Added
- `js/auth-clerk-core.js`: Added the Clerk browser core module for publishable-key config, script loading, OAuth callback finalization, pending role/next storage, `/auth-sync`, token/header helpers, signed-in guards, and URL cleanup.
- `scripts/d1-page-renderer.ts`: Added pure rendering/hash/sort/canonicalization helpers for the D1 public page builder.
- `scripts/import-csv-utils.ts`: Added reusable CSV parsing, SQL builder, normalization, id/hash, import stats, and remote apply helpers for the D1 importer.
- `functions/_form-submit-franchisee.js`, `functions/_form-submit-franchisor.js`, `functions/_form-submit-test-actions.js`, and `functions/_form-submit-utils.js`: Added focused form-submit workflow and utility modules.
- `.context/session-20260704-1518.md`: Added this session snapshot for the auth, D1 builder, CSV importer, and form-submit modularization.

### Changed
- `AUDIT.md`: Planned the requested refactors before implementation, updated line counts, and marked the auth core, D1 page renderer, CSV importer utility, and form-submit workflow splits as extracted.
- `js/auth-clerk.js`: Reduced the file to an auth page/event facade that delegates Clerk/session primitives to `js/auth-clerk-core.js`.
- `login/index.html`, `register/index.html`, `daftar/index.html`, `src/pages/dashboard/index.astro`, `src/pages/premium/index.astro`, `src/pages/profil/index.astro`, `src/pages/sso-callback/index.astro`, `templates/detail-franchise-tpl.html`, and `templates/peluang-usaha-tpl.html`: Load `js/auth-clerk-core.js` between the auth UI module and the auth facade.
- `scripts/build-d1-franchise-pages.ts`: Reduced the builder to D1 access, orchestration, file/manifest writes, and pruning while delegating pure rendering to `scripts/d1-page-renderer.ts`.
- `scripts/import-csv-to-d1.ts`: Reduced the importer to CLI/import-plan orchestration and row mapping while delegating reusable parsing/SQL/normalization helpers to `scripts/import-csv-utils.ts`.
- `functions/form-submit.js`: Reduced the endpoint to D1 binding checks, base validation, Clerk/D1 role authorization, telemetry, and workflow dispatch.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the new module boundaries and updated auth/form/import/build ownership.
- `SUGGESTION.md`: Added suggestion 50 for focused smoke tests around the newly split module boundaries before validation.

## 2026-07-04 10:59 (Asia/Jakarta)
### Added
- `css/profile-premium.css`, `css/profile-franchisor.css`, and `css/profile-analytics.css`: Added focused `/profil` stylesheet modules for Membership, franchisor/listing/location/media/leads, and owner analytics UI.
- `.context/session-20260704-1059.md`: Added this session snapshot for the profile CSS modularization.

### Changed
- `css/profile.css`: Reduced the base profile stylesheet from 1271 lines to 773 lines by moving domain-specific Premium, franchisor, and analytics styles into focused modules.
- `src/pages/profil/index.astro`: Loaded the new profile CSS modules after the base profile stylesheet.
- `AUDIT.md` and `SUGGESTION.md`: Planned and completed suggestion 49 for profile CSS modularization.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the new profile stylesheet module boundaries.

## 2026-07-04 10:32 (Asia/Jakarta)
### Added
- `functions/_premium-settings.js`, `functions/_premium-notifications.js`, `functions/_premium-lifecycle.js`, `functions/_premium-readiness.js`, and `functions/_premium-ops-utils.js`: Added focused Premium operation modules for settings/pricing/promo, events/notifications/email queue, lifecycle/reporting, readiness scoring, and shared utilities.
- `.context/session-20260704-1032.md`: Added this session snapshot for the Premium operations modularization.

### Changed
- `functions/_premium-ops.js`: Converted the oversized Premium operation helper into a compatibility re-export facade.
- `AUDIT.md`: Added real line counts for tracked files that still had placeholder/new-module counts, planned larger remaining refactor candidates, and marked the Premium operations split as implemented.
- `SUGGESTION.md`: Added and completed suggestion 48 for the Premium operations split; added suggestion 49 for later profile CSS modularization.
- `CODEBASE.md` and `TECHNICAL_INVENTORY.md`: Documented the new Premium operation module boundaries.

## 2026-07-04 10:16 (Asia/Jakarta)
### Added
- `functions/_location-writes.js`: Added shared manual location normalization, deterministic id generation, D1 write statement creation, and audit-summary helpers for owner/admin Area Listing saves.
- `.context/session-20260704-1016.md`: Added this session snapshot for the location write helper extraction.

### Changed
- `AGENTS.md`: Moved the assistant suggestion pass to happen before validation and instructed closely related low-risk modular/helper suggestions to be implemented in the same session before validation.
- `functions/_profile-franchisor-actions.js` and `functions/_dashboard-actions.js`: Reused the shared location write helper for `update_listing_locations` instead of duplicating owner/admin `locations` and `franchise_locations` write logic.
- `SUGGESTION.md`: Marked suggestion 47 done with the shared location helper result.
- `AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Documented the shared location write helper and updated profile/dashboard location write responsibilities.

## 2026-07-04 09:50 (Asia/Jakarta)
### Added
- `/profil` Listing Brand: Added an owner-facing Area Listing editor for city/service-area rows with source labels and owner-managed override persistence.
- `/dashboard` Review tab: Added an admin-only Area Listing editor for structured listing locations.

### Changed
- `functions/_profile-schemas.js`, `functions/profile-data.js`, `functions/_profile-franchisor-actions.js`, and `functions/_profile-read-model.js`: Added the protected `update_listing_locations` profile action, D1 writes to `locations`/`franchise_locations`, profile read payload location rows, audit events, and public rebuild queueing.
- `functions/_dashboard-schemas.js`, `functions/dashboard-data.js`, `functions/_dashboard-actions.js`, and `functions/_dashboard-queries.js`: Added admin validation, mutation dispatch, D1 location writes, editable listing location rows, audit events, and public rebuild queueing for dashboard location management.
- `js/profile-franchisor.js`, `js/profile-page.js`, and `css/profile.css`: Added owner location editor rendering, textarea parsing, submit routing, and styling.
- `src/pages/dashboard/index.astro`, `js/dashboard-admin.js`, `js/dashboard-review.js`, and `css/dashboard.css`: Added dashboard location editor markup, runtime wiring, parsing, admin-only submit behavior, and styling.
- `scripts/build-d1-franchise-pages.ts`: Updated the static D1 snapshot query so owner/admin-managed location rows override generated location rows during public city page generation.
- `SUGGESTION.md`, `AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Documented suggestion 46 completion and the structured location management contracts; added suggestion 47 for consolidating duplicated location-write helpers.
- `.context/session-20260704-0950.md`: Added this session snapshot for location management UX.

## 2026-07-04 06:36 (Asia/Jakarta)
### Added
- `migrations/0016_franchise_location_metadata.sql`: Added generated-row metadata and indexes to the existing `franchise_locations` table.
- `src/lib/franchise-location-normalization.ts`: Added shared city/province alias matching, structured location parsing, and text-to-location inference helpers.
- `scripts/sync-franchise-locations.ts`: Added a repeatable D1 location backfill script that writes `locations` and generated `franchise_locations` SQL from the static franchise snapshot.
- `.context/session-20260704-0636.md`: Added this session snapshot for structured location backfill and city-page source upgrades.

### Changed
- `package.json`: Added `pnpm run locations:sync`.
- `.gitignore`: Ignored generated `.context/franchise-location-sync.sql` backfill output.
- `src/lib/shared-schemas.ts`: Added optional `structured_locations` to the D1 static row schema.
- `scripts/build-d1-franchise-pages.ts`: Added `structured_locations` aggregation from D1 `locations` and `franchise_locations` into the static snapshot query.
- `src/lib/franchise-city.ts` and `src/lib/franchise-buyer-tools.ts`: Switched city matching/labels to use structured location data first with text inference fallback.
- `json/d1-franchise-static-data.json` and `json/d1-generated-pages-manifest.json`: Refreshed during build validation after structured location backfill.
- Remote D1 `franchise_db`: Applied `0016_franchise_location_metadata.sql`, then backfilled 45 `locations` and 715 generated `franchise_locations` rows from current listing data.
- `SUGGESTION.md`: Marked suggestion 45 done and added suggestion 46 for future admin/owner location management UI.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`, and `docs/architecture/TECH_STACK_DECISIONS.md`: Documented structured location data, the sync script, remote backfill status, and the next location-management recommendation.

## 2026-07-04 05:56 (Asia/Jakarta)
### Added
- `src/lib/franchise-city.ts`: Added city discovery helpers for static `/peluang-usaha/kota/` landing pages from listing city/address/outlet/service-area text.
- `src/pages/peluang-usaha/kota/index.astro` and `src/pages/peluang-usaha/kota/[slug].astro`: Added static city directory pages generated from the D1 franchise snapshot.
- `SUGGESTION.md`: Added suggestion 45 for structured location/service-area data before scaling long-tail city SEO further.
- `.context/session-20260704-0556.md`: Added this session snapshot for city pages, buyer lead context, promo measurement, and Premium add-on pricing.

### Changed
- `src/lib/franchise-static.ts`: Added city index/landing renderers and city internal links in the directory controls.
- `src/lib/franchise-buyer-tools.ts`: Added city quick links, used matched city labels in comparison payloads, and kept buyer-tool pages aligned with city discovery pages.
- `js/franchise-buyer-tools.js`: Stores budget matcher and BEP calculator intent in optional browser buyer context.
- `js/franchise-compare.js`, `src/lib/franchise-static-assets.ts`, and `src/lib/franchise-detail-assets.ts`: Store selected comparison brand context when buyers use comparison controls.
- `js/opportunity-save.js`, `js/profile-page.js`, `functions/_profile-schemas.js`, and `functions/_profile-franchisee-actions.js`: Attach sanitized optional buyer context to logged-in franchise inquiry leads.
- `functions/_premium-ops.js`, `functions/premium-event.js`, and `js/site-promo-bar.js`: Track public promo ribbon impressions and CTA clicks as coarse Premium funnel events.
- `src/pages/premium/index.astro` and `css/premium.css`: Added editorial article, monthly content, and social media exposure add-on pricing to the public Premium page.
- `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`: Recorded the editorial/social add-on pricing decision, marked the editorial open decision complete, and documented city pages, buyer context, and promo measurement progress.
- `SUGGESTION.md`: Marked suggestions 42, 43, and 44 done.
- `AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Updated the implementation map for city pages, buyer qualification context, promo measurement, and Premium add-ons.
- `json/d1-generated-pages-manifest.json`: Refreshed during build validation after adding static city directory pages.

## 2026-07-04 00:10 (Asia/Jakarta)
### Added
- `src/lib/franchise-contact.ts`: Added the extracted generated detail contact renderer and phone parsing helpers.
- `src/lib/franchise-ranking.ts`: Added the extracted deterministic directory ranking helpers.
- `src/lib/franchise-category.ts`: Added the extracted category route/summary helpers.
- `src/lib/franchise-capital.ts`: Added capital-range route helpers for static modal-based directory pages.
- `src/lib/franchise-buyer-tools.ts`: Added static comparison and buyer-tool page renderers.
- `src/pages/peluang-usaha/kategori/index.astro` and `src/pages/peluang-usaha/kategori/[slug].astro`: Added static category directory pages.
- `src/pages/peluang-usaha/modal/index.astro` and `src/pages/peluang-usaha/modal/[slug].astro`: Added static capital-range directory pages.
- `src/pages/bandingkan/index.astro`: Added the static franchise comparison page.
- `src/pages/alat-franchise/index.astro`: Added the static buyer tools page with budget matcher and BEP calculator.
- `css/franchise-buyer-tools.css`: Added shared styles for comparison, buyer tools, and public promo ribbon pages.
- `js/franchise-compare.js`: Added browser comparison behavior backed by selected listing ids.
- `js/franchise-buyer-tools.js`: Added browser budget matcher and BEP calculator behavior.
- `js/site-promo-bar.js`: Added shared public Premium promo ribbon loader.
- `functions/premium-promo.js`: Added public, date-gated Premium promo settings endpoint.
- `migrations/0015_premium_promo_settings.sql`: Added default Premium promo/event ribbon settings.
- `.context/session-20260704-0520.md`: Added this session snapshot for the traffic-growth and promo implementation.
- `scripts/migrate-blogspot-proposals-to-r2.mjs`: Added a resumable operational migration script for legacy Blogspot/Blogger proposal images into R2 with D1 asset metadata updates.
- `migrations/0014_payment_method_qris_image.sql`: Added optional QRIS image fields for admin-managed Premium payment instructions.
- `functions/payment-method-upload.js`: Added admin-only QRIS image upload to R2 for dashboard payment settings.
- `.context/session-20260704-0010.md`: Added this session snapshot.

### Changed
- `src/lib/franchise-static.ts`: Kept the static renderer modular through contact/ranking/category/capital helpers while adding traffic-growth renderers and compare controls.
- `src/lib/franchise-static.ts`: Added static category/modal landing renderers, directory intro blocks, internal links to category/modal/tools/compare pages, and compare controls on listing/detail pages.
- `src/lib/franchise-static-assets.ts` and `src/lib/franchise-detail-assets.ts`: Added compare button/floating-link behavior and public promo bar loading to generated listing/detail pages.
- `src/lib/franchise-category.ts` and `src/lib/franchise-text.ts`: Changed generated category links from query-param category filters to static `/peluang-usaha/kategori/[slug]` pages.
- `public/_redirects`: Changed legacy category redirects to point at static category landing pages.
- `functions/_premium-ops.js`, `functions/_dashboard-schemas.js`, `src/pages/dashboard/index.astro`, and `js/dashboard-premium-operations.js`: Added dashboard-managed Premium event discount/bonus/ribbon settings.
- `src/pages/premium/index.astro`: Loads the shared public promo ribbon script.
- Remote D1 `franchise_db`: Applied and sequentially verified `0015_premium_promo_settings.sql`.
- `package.json`: Added `pnpm run migrate:proposal-r2`.
- `src/pages/dashboard/index.astro`, `js/dashboard-premium-operations.js`, and `css/dashboard.css`: Added QRIS upload, preview, and persistence to the dashboard Premium payment method form.
- `js/profile-premium.js` and `css/profile.css`: Added QRIS display inside the franchisor Premium payment instructions when an admin QRIS image is configured.
- `functions/_dashboard-schemas.js`, `functions/_dashboard-actions.js`, `functions/_premium-ops.js`, and `functions/_premium.js`: Added QRIS payment method fields through validation, persistence, reads, and owner-facing payment instructions.
- `src/lib/franchise-detail-assets.ts`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`: Clarified that proposal PDF downloads are generated client-side as local browser blobs from R2 images and are not stored as duplicate PDF files.
- `json/d1-franchise-static-data.json`: Refreshed from remote D1 after migrating 491 proposal images for 34 franchises to first-party `assets.franchisee.id` URLs.
- `json/d1-generated-pages-manifest.json`: Refreshed during build validation.
- Remote D1 `franchise_db`: Applied generated migration SQL that upserts proposal `franchise_assets`, rewrites migrated `franchises.proposal_url` values to R2 public URLs, and queues static rebuild requests.
- Remote D1 `franchise_db`: Applied `0014_payment_method_qris_image.sql` and verified the `payment_methods.qris_image_url` column.
- `.gitignore`: Ignored `.context/proposal-r2-migration/` so large generated migration work files do not enter git.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `SUGGESTION.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, and `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`: Updated refactor status, proposal migration status, payment/QRIS status, media plan, traffic-growth pages/tools status, promo event decision, and remaining recommendations.

### Removed
- `.context/proposal-r2-migration/files/`: Removed the ignored local proposal image download cache after confirming the images were uploaded to R2. This freed about 79.1 MB of image files.

## 2026-07-03 20:36 (Asia/Jakarta)
### Added
- `src/lib/franchise-premium-detail.ts`: Added Premium detail-page rendering helpers for the lead CTA panel, Galeri/Proposal/FAQ tabs, legacy proposal/media URL parsing, and proposal image metadata.
- `src/lib/franchise-detail-assets.ts`: Added the extracted detail-page generated CSS/JS module, including Premium detail styling, tab activation, and browser proposal PDF generation.
- `functions/_profile-owner-analytics.js`: Added owned-listing analytics aggregation for `/profil`.
- `js/profile-analytics.js`: Added the `/profil` owner analytics tab renderer.
- `.context/session-20260703-2036.md`: Added this session snapshot.

### Changed
- `src/lib/franchise-static.ts`: Added Premium detail CTA/tabs to generated franchise pages and kept the detail renderer delegated through focused helper modules.
- `src/lib/franchise-static-assets.ts`: Split detail assets into `src/lib/franchise-detail-assets.ts`, leaving directory assets and placeholders in the original module with a compatibility re-export.
- `scripts/build-d1-franchise-pages.ts`: Included gallery, video, and proposal media fields in the D1 static snapshot.
- `json/d1-franchise-static-data.json` and `json/d1-generated-pages-manifest.json`: Refreshed during build validation.
- `js/opportunity-save.js`: Added Premium detail inquiry CTA handling through `/profile-data` with CTA-backed recovery messages.
- `functions/_profile-read-model.js`: Added `owner_analytics` to the profile read model.
- `js/profile-page.js`, `src/pages/profil/index.astro`, and `css/profile.css`: Added the owner analytics tab wiring, script loading, and styles.
- `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`: Marked Premium listing value milestone items complete for the current implementation and documented the proposal PDF limitation.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Updated module maps, refactor status, Premium/static asset notes, and suggestion 40 status.

## 2026-07-01 03:15 (Asia/Jakarta)
### Added
- `functions/_profile-read-model.js`: Added the `/profile-data` read-model module for GET response composition and franchisee action loader callbacks.
- `.context/session-20260701-0315.md`: Added this session snapshot.

### Changed
- `functions/profile-data.js`: Reduced the profile API to a 92-line endpoint facade by delegating GET/read-model work to `functions/_profile-read-model.js`.
- `SUGGESTION.md`: Marked suggestion 37 done and added suggestion 38 for focused `/profile-data` smoke tests.
- `AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Updated profile API module boundaries, line counts, and read-model ownership.
- `json/d1-generated-pages-manifest.json`: Refreshed generated timestamps during build validation; the D1 builder reported 197 detail pages skipped and no content rewrites.

## 2026-07-01 01:25 (Asia/Jakarta)
### Added
- `functions/_profile-franchisor-actions.js`: Added the `/profile-data` franchisor profile, owner listing edit, owned publication distribution, and lead status action module.
- `.context/session-20260701-0125.md`: Added this session snapshot.

### Changed
- `functions/profile-data.js`: Reduced the profile API to a 346-line facade by delegating franchisor/listing/lead workflows to `functions/_profile-franchisor-actions.js`.
- `SUGGESTION.md`: Marked suggestion 36 done and added suggestion 37 for a later `/profile-data` read-model split.
- `AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Updated profile API refactor status, module map, and inventory for the franchisor action split.
- `json/d1-generated-pages-manifest.json`: Refreshed generated timestamps during build validation; the D1 builder reported 197 detail pages skipped and no content rewrites.

## 2026-07-01 01:00 (Asia/Jakarta)
### Added
- `js/dashboard-operations.js`: Added the dashboard Operations module for outreach logging, Premium payment review, publication controls, lead summaries, publish status, and health rendering.
- `js/profile-franchisee.js`: Added the `/profil` franchisee renderer for Minat Usaha and Peluang Saya panels.
- `js/profile-franchisor.js`: Added the `/profil` franchisor renderer for Data Brand, Listing Brand, distribution chips, media upload controls, and claim history.
- `functions/_profile-account.js`: Added the `/profile-data` account and public role-add action module.
- `functions/_profile-franchisee-actions.js`: Added the `/profile-data` franchisee profile, inquiry, and saved-opportunity action module.
- `.context/session-20260701-0100.md`: Added this session snapshot.

### Changed
- `js/dashboard-admin.js`: Reduced the dashboard controller to a 279-line boot/tabs/auth facade that delegates Operations, Review/Data Quality, and Premium Operations workflows.
- `src/pages/dashboard/index.astro`: Loads `js/dashboard-operations.js` before `js/dashboard-admin.js`.
- `js/profile-page.js`: Reduced the profile client to a 727-line controller facade that delegates franchisee and franchisor panel rendering to role-focused modules.
- `src/pages/profil/index.astro`: Loads the new profile role renderer modules before `js/profile-page.js`.
- `functions/profile-data.js`: Reduced the profile API to a 582-line facade by delegating account/role and franchisee write actions to helper modules.
- `SUGGESTION.md`: Marked suggestions 33, 34, and 35 done, and added suggestion 36 for the remaining franchisor/listing/lead profile API split.
- `AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Updated the refactor tracker, codebase map, and technical inventory for the new dashboard/profile/profile-API module boundaries.
- `json/d1-generated-pages-manifest.json`: Refreshed generated timestamps during build validation; the D1 builder reported 197 detail pages skipped and no content rewrites.

## 2026-06-30 11:23 (Asia/Jakarta)
### Added
- `js/profile-ui-utils.js`: Added shared `/profil` UI helpers for escaping, field markup, empty states, Rupiah formatting, status/contact labels, Clerk account copy, and form busy/message handling.
- `js/profile-account.js`: Added the `/profil` account tab renderer for granular name/email edits and password add/change controls.
- `js/profile-roles.js`: Added the `/profil` missing-role CTA and confirmation modal renderer.
- `js/profile-leads.js`: Added the `/profil` franchisor lead list/card renderer.
- `js/profile-opportunities.js`: Added saved-opportunity localStorage merge/lookup helpers for `/profil`.
- `functions/_profile-schemas.js`: Added profile mutation Zod schemas for `/profile-data`.
- `functions/_profile-utils.js`: Added shared profile API response, audit, normalization, id, and Clerk identity helpers.
- `functions/_profile-recommendations.js`: Added franchisee recommendation query/scoring helpers.
- `functions/_profile-listing-patch.js`: Added owner listing patch normalization and update SQL helpers.
- `src/lib/franchise-text.ts`: Added shared static page text, URL, escaping, generated HTML cleanup, and canonical legacy-link helpers.
- `.context/session-20260630-1123.md`: Added this session snapshot.

### Changed
- `js/profile-page.js`: Refactored the profile client into a 900-line controller facade while delegating account, role, lead, Premium membership, saved-opportunity storage, and shared UI helpers to modules.
- `js/profile-premium.js`: Expanded the existing Premium helper to render the `/profil` Membership tab while keeping payment/confirmation fetch workflows in `js/profile-page.js`.
- `src/pages/profil/index.astro`: Loads the new profile helper modules before `js/profile-page.js`.
- `functions/profile-data.js`: Delegates schemas, shared utilities, recommendation scoring, listing patch construction, and Premium workflows to helper modules, reducing the endpoint facade to 869 lines.
- `src/lib/franchise-static.ts`: Delegates text normalization, escaping, URL cleanup, `slugify`, generated HTML cleanup, and legacy-link canonicalization to `src/lib/franchise-text.ts`, reducing the renderer to 785 lines.
- `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, and `SUGGESTION.md`: Updated refactor status, module map, inventories, and follow-up suggestions for the new profile/static module boundaries.
- `json/d1-franchise-static-data.json` and `json/d1-generated-pages-manifest.json`: Refreshed during build validation.

## 2026-06-30 10:24 (Asia/Jakarta)
### Added
- `js/dashboard-utils.js`: Added shared browser helpers for dashboard escaping, Rupiah formatting, form-value writes, and icon-only action toolbar/button/link rendering.
- `js/dashboard-premium-operations.js`: Added a Premium Operations dashboard module for Premium funnel/settings/payment/email queue rendering and admin actions.
- `js/dashboard-review.js`: Added a dashboard Review/Data Quality module for quality rows, guided listing edit fields, edit suggestion submission/review, and claim review.
- `.context/session-20260630-1024.md`: Added this session snapshot.

### Changed
- `js/dashboard-admin.js`: Delegated shared render helpers, Premium Operations logic, and Review/Data Quality/Claim workflows to dashboard modules, reducing the main dashboard controller to 541 lines.
- `src/pages/dashboard/index.astro`: Loads `dashboard-utils.js`, `dashboard-premium-operations.js`, and `dashboard-review.js` before `dashboard-admin.js`.
- `SUGGESTION.md`: Marked suggestion 32 done, marked suggestion 33 in progress after review extraction, and added suggestion 34 for profile client modularization.
- `AUDIT.md`, `CODEBASE.md`, and `TECHNICAL_INVENTORY.md`: Refreshed current-stack language, actual large-file refactor sizes, dashboard module split status, and next refactor targets.
- `AUDIT.md`: Added detailed refactor split plans for files over 900 lines: `js/profile-page.js`, `functions/profile-data.js`, and `src/lib/franchise-static.ts`.
- `docs/architecture/RESEND_EMAIL_DELIVERY.md`: Recorded the successful Premium email worker GitHub Action summary with delivery configured and no due email work.
- `json/d1-generated-pages-manifest.json`: Refreshed generated timestamps during build validation; listing hashes were unchanged.

## 2026-06-30 09:20 (Asia/Jakarta)
### Added
- `migrations/0013_premium_lifecycle_settings_reports.sql`: Added Premium lifecycle settings, grace-period notification idempotency, annual report records, HTML email bodies, and order discount fields.
- `docs/architecture/RESEND_EMAIL_DELIVERY.md`: Added the Resend/Cloudflare Pages email delivery reference for queued Premium emails.
- `.context/session-20260630-0920.md`: Added this session snapshot.

### Changed
- Remote Cloudflare: Applied `0013_premium_lifecycle_settings_reports.sql` to `franchise_db`, verified the new settings/report/grace objects, verified default settings, and verified `premium_orders` discount columns.
- `AGENTS.md`: Added a hard rule to never run remote `cfman`/Wrangler verification commands in parallel.
- `functions/_premium.js`, `functions/_premium-ops.js`, `functions/_premium-email-worker.js`, `functions/_profile-premium.js`, and `functions/premium-email-worker.js`: Added admin-managed Premium settings, discount-aware order pricing, HTML email support, annual report queueing, grace-period daily emails, and downgrade-after-grace behavior with rebuild queue writes.
- `functions/_dashboard-schemas.js`, `functions/_dashboard-actions.js`, `functions/_dashboard-queries.js`, and `functions/dashboard-data.js`: Added Premium settings validation, update handling, dashboard read payloads for settings/reports, and audit writes.
- `src/pages/dashboard/index.astro` and `js/dashboard-admin.js`: Added Premium settings controls and recent annual report rendering in Premium Operations.
- `js/profile-page.js`: Shows a discount row in Premium payment instructions when multi-brand discount applies.
- `json/d1-generated-pages-manifest.json`: Refreshed generated timestamps during the local build validation; listing hashes were unchanged.
- `SUGGESTION.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/README.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, and `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`: Documented Premium lifecycle completion, Resend setup, dashboard refactor recommendation, stale workflow removal, and migration status.

### Removed
- `.github/workflows/generate-pages.yaml`: Removed stale Google Sheets auto-update workflow; D1/Astro publish queue is now the active public directory update path.

## 2026-06-30 08:38 (Asia/Jakarta)
### Added
- `functions/_premium-email-worker.js` and `functions/premium-email-worker.js`: Added the protected Premium email worker, Resend delivery path, retry backoff, provider message-id storage, expired-subscription marking, and renewal reminder queueing.
- `.github/workflows/premium-email-worker.yaml`: Added a scheduled/manual GitHub Actions trigger for `/premium-email-worker`.
- `migrations/0012_premium_email_worker_guardrails.sql`: Added email delivery metadata, renewal reminder idempotency, due-email indexing, and Premium duplicate-order/source-order guardrails.
- `.context/session-20260630-0838.md`: Added this session snapshot.

### Changed
- Remote Cloudflare: Checked for duplicate pending Premium orders/source orders, applied `0012_premium_email_worker_guardrails.sql` to `franchise_db`, and verified the new columns/table/indexes.
- `functions/_premium-ops.js`, `functions/_dashboard-schemas.js`, `functions/_dashboard-actions.js`, `functions/_dashboard-queries.js`, and `functions/dashboard-data.js`: Added renewal reminder helpers, recent email queue reads, admin email retry/cancel validation/actions, and dashboard payload support.
- `js/dashboard-admin.js` and `src/pages/dashboard/index.astro`: Made the edit form role-aware so admin sees direct-edit wording, added Premium email queue row controls, refreshed dynamic tooltips, and kept the payment-method save action icon-only.
- `json/d1-generated-pages-manifest.json`: Refreshed generated timestamps during `pnpm run build`; the D1 builder reported 197 detail pages skipped and no content rewrites.
- `SUGGESTION.md`, `AUDIT.md`, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `docs/architecture/TECH_STACK_DECISIONS.md`, and `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`: Marked suggestions 27-30 implemented, documented the email worker/provider setup state, and added suggestion 31 for expired Premium public downgrade behavior.

## 2026-06-30 08:20 (Asia/Jakarta)
### Added
- `.context/session-20260630-0820.md`: Added this session snapshot.

### Changed
- `AGENTS.md`: Made the end-of-session suggestion pass mandatory for every work session, including an explicit final-response phrase when there are no new suggestions.
- `SUGGESTION.md`: Added follow-up recommendations 27-30 for outbound email delivery, Premium expiry reminders, queued-email admin controls, and Premium renewal/order data guardrails.

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
