# Traffic Funnel UX Audit

Last updated: 2026-07-04 22:54 (Asia/Jakarta)

## Verdict

Do not pour significant paid traffic into the site yet.

The codebase has the core path for free membership and Premium membership, but the funnel is not prominent enough and the logged-in `/profil` experience does not yet feel visually aligned with the homepage/Premium surface. The site is acceptable for low-risk organic traffic while implementation continues, but before aggressive paid traffic the site needs stronger CTA hierarchy, brand consistency, and one production QA pass through the full member-to-Premium journey.

## Current Funnel Map

| Funnel step | Current code path | Readiness | Finding |
| --- | --- | --- | --- |
| Landing / homepage | `index.html` | Needs work | Homepage still uses `Franchise.id` title/copy/assets in several places and mostly drives users to directory/contact pages, not a clear free-member or Premium ladder. |
| Directory / top pages | `src/pages/peluang-usaha/*`, `templates/peluang-usaha-tpl.html`, generated detail pages | Mostly ready | Public directory/detail routes exist, with save/inquiry/claim/member paths. The buyer path is clearer than the franchisor-to-Premium path. |
| Account creation | `login/index.html`, `js/auth-clerk-ui.js`, `js/auth-clerk.js`, `js/auth-clerk-core.js` | Mostly ready, needs production QA | Login/register uses role selection, Google/email flows, and `next` redirects. Code path is coherent, but identity/OAuth still needs real production verification before paid traffic. |
| Free member completion | `/daftar/index.html`, `js/form-06-submit-validation.js`, `functions/form-submit.js` and helpers | Mostly ready, needs production QA | Authenticated D1 writes exist for franchisee/franchisor/claim paths. The UI should more explicitly tell franchisors that free member/listing completion is step 1 before Premium. |
| Logged-in landing after member creation | `src/pages/profil/index.astro`, `js/profile-page.js`, profile modules | Needs UX work | `/profil` shows completion status and tabs, but it does not strongly surface the next best action. A franchisor with a completed free listing should see a prominent “Aktifkan Premium” card without needing to discover the Membership tab. |
| Premium education | `src/pages/premium/index.astro`, `css/premium.css`, `js/premium-page.js` | Good base | `/premium` explains price, benefits, steps, and CTA. The copy should be adjusted so cold users understand the sequence: create a free franchisor account/listing first, then activate Premium. |
| Premium order/payment | `js/profile-premium.js`, `functions/_profile-premium.js`, `/premium-receipt-upload` | Code path exists | The Membership tab can create an order, show payment instructions, upload proof, and submit confirmation. Needs end-to-end production QA and stronger entry points from `/profil`. |
| Admin approval to live Premium | `dashboard-data` Premium review modules, publish queue | Code path exists | Admin approval, subscription activation, notifications, and rebuild queue behavior exist. Needs one controlled production test before scaling. |

## UX Findings

### P0 - Must fix before serious traffic

| ID | Finding | Evidence | Required change | Status |
| --- | --- | --- | --- | --- |
| TF-01 | Homepage brand is inconsistent with app pages. | `index.html` title/copy/schema still say `Franchise.id`; app pages use `Franchisee.id`. | Decide the public brand for this domain and update homepage metadata, visible copy, logo alt text, and schema so users are not confused after login. | Planned |
| TF-02 | Homepage does not clearly present the member ladder. | Main homepage CTAs point to `/direktori-franchise` and `/kontak-kami`; login/daftar are in nav but not framed as “Daftar Brand Gratis” or “Jadi Member”. | Add primary CTAs: “Cari Peluang Usaha”, “Daftar Brand Gratis”, and a secondary “Upgrade Premium” path for franchisors. | Planned |
| TF-03 | Full production account/member/Premium path is not yet manually verified after the latest modularization. | Code path exists across Clerk, D1, `/daftar`, `/profil`, Premium order, receipt upload, dashboard approval, and static publish queue. | Run a controlled production QA script after push: create franchisor account, complete free listing, see `/profil`, create Premium order, submit proof, approve in dashboard, verify Premium state and public rebuild. | Planned |

### P1 - Should fix before broad paid acquisition

| ID | Finding | Evidence | Required change | Status |
| --- | --- | --- | --- | --- |
| TF-04 | `/profil` feels too white and detached from the homepage/Premium visual language. | `css/profile.css` uses many white cards on `#f6f7f8`; homepage uses stronger yellow/black, square CTAs, high-contrast sections, and `Outfit` headings. | Retheme `/profil` with shared yellow/black/cream tokens, stronger header/hero, dark/yellow next-action cards, and less “white SaaS dashboard” density. | Planned |
| TF-05 | Logged-in franchisors do not get a strong Premium next step. | `summaryPanel()` shows completion stats and missing-data notices, but no prominent Premium CTA when listing data is complete. | Add a “Langkah berikutnya” panel to `/profil`: if franchisor data/listing is incomplete, show free-listing completion; if complete and no active/pending Premium, show “Aktifkan Premium Network”. | Planned |
| TF-06 | Premium is hidden behind a tab for eligible users. | `membership` is one tab among many in `js/profile-page.js`; active tab defaults to summary unless URL requests membership. | Add a visible Premium CTA in the profile hero/summary for franchisors, and consider defaulting to Membership only when arriving from `/premium` or after free listing completion. | Planned |
| TF-07 | `/premium` CTA wording can overpromise the first action. | Public CTA says “Daftar Premium”, but cold users must first create an account and have a listing to upgrade. | Change primary copy to “Daftar Brand Gratis, lalu aktifkan Premium” or similar; keep payment confirmation CTA for returning users. | Planned |
| TF-08 | Directory/detail pages are buyer-strong, franchisor-weak. | Detail pages support claim CTA, but general franchisor Premium entry is not a repeated network-wide CTA. | Add tasteful franchisor CTA modules on directory/detail pages: “Punya brand franchise? Daftar gratis / tampil Premium”. | Planned |

### P2 - Optimization after core funnel is stable

| ID | Finding | Evidence | Required change | Status |
| --- | --- | --- | --- | --- |
| TF-09 | Free member value proposition can be clearer. | `/daftar` is functional, but funnel copy should explain what free users get before asking for form completion. | Add short free-member benefit copy near role selection and profile completion CTAs. | Planned |
| TF-10 | Premium readiness state is useful but not persuasive. | `js/profile-premium.js` shows readiness checks and allows payment even when incomplete. | Add clearer “best result” guidance and a compact checklist summary on the profile summary page. | Planned |
| TF-11 | Traffic confidence needs analytics checkpoints. | Premium and product events exist, but UX success thresholds are not documented here. | Track landing CTA clicks, register starts, free profile completions, Premium order starts, payment confirmations, and admin approvals. | Planned |

## `/profil` Visual Direction

I agree with the “too white” assessment.

The current profile page works as an account center, but it visually reads like a generic light dashboard. The homepage/Premium identity is more direct: yellow `#ffc03d`, black/dark ink, square buttons, uppercase/strong CTAs, large display headings, and high-contrast sections. `/profil` should borrow that language while staying usable for forms.

Implementation direction:

- Add profile-level design tokens:
  - `--fr-yellow: #ffc03d`
  - `--fr-yellow-hover: #f8b526`
  - `--fr-ink: #111827`
  - `--fr-cream: #fff7d9`
  - `--fr-page: #f8f6ef` or another warmer background than flat gray.
- Change the profile header/hero from plain white to a stronger brand block or warm section.
- Keep form fields white for readability, but put panels inside warmer/darker containers with stronger hierarchy.
- Make primary buttons yellow/black and square, aligned with homepage Elementor button behavior.
- Add a prominent “next best action” card above tabs:
  - Missing free member data: complete free profile/listing.
  - Completed franchisor listing and no Premium: activate Premium.
  - Pending Premium payment: confirm payment or wait for review.
  - Active Premium: improve listing/readiness/analytics.

## Codewise Flow Notes

The backend/client pieces for the full journey are present:

1. `/login` renders custom Clerk login/register UI and role selection.
2. Register/login stores role and redirects to `/daftar/?role=...&continue=1` or the intended `next` URL.
3. `/daftar` requires Clerk auth and submits via `js/form-06-submit-validation.js` to `/form-submit`.
4. `/form-submit` verifies Clerk/D1 roles and delegates writes to focused D1 workflow modules.
5. `/profil` loads protected `/profile-data`, shows role-specific tabs, and supports role add-on, listing management, leads, analytics, and Membership.
6. Membership can create Premium orders, show payment instructions, upload proof, and submit confirmation.
7. Dashboard approval can activate Premium, enqueue rebuilds, and notify owners/admins.

Main risk is UX prominence and production verification, not absence of the code path.

## Implementation Tracker

| Phase | Task | Files likely touched | Status |
| --- | --- | --- | --- |
| 1 | Fix homepage brand mismatch and top CTA hierarchy. | `index.html`, maybe generated/nav helper scripts if added | Planned |
| 1 | Add homepage franchisor CTA: free brand listing first, Premium second. | `index.html` | Planned |
| 1 | Retheme `/profil` to match site: warmer background, dark/yellow hero, square CTAs, stronger contrast. | `css/profile.css`, `css/profile-premium.css`, `css/profile-franchisor.css`, `css/profile-analytics.css` | Planned |
| 1 | Add `/profil` next-best-action panel above tabs. | `js/profile-page.js`, `js/profile-premium.js`, `css/profile.css`, `css/profile-premium.css` | Planned |
| 1 | Make Premium CTA visible from profile summary/hero for completed franchisors. | `js/profile-page.js`, `js/profile-premium.js`, `css/profile.css` | Planned |
| 2 | Adjust `/premium` copy so cold users understand free listing before Premium. | `src/pages/premium/index.astro`, `css/premium.css` if CTA layout changes | Planned |
| 2 | Add franchisor CTA modules on directory/detail pages without distracting buyers. | `src/lib/franchise-static.ts`, `src/lib/franchise-static-assets.ts`, `src/lib/franchise-detail-assets.ts`, templates if needed | Planned |
| 2 | Add a production QA checklist for full free-member-to-Premium flow. | `docs/testing/` or this document | Planned |
| 3 | Add analytics checkpoints and dashboard report for funnel steps. | `functions/premium-event.js`, `js/premium-page.js`, profile/form auth events, dashboard metrics | Planned |

## Recommended Next Work Session

Implement Phase 1 first:

1. Fix homepage brand/CTA clarity.
2. Retheme `/profil`.
3. Add the profile next-best-action panel.
4. Validate with `pnpm exec tsc --noEmit --pretty false`, `pnpm exec astro build`, and targeted static searches for old homepage brand/copy.
