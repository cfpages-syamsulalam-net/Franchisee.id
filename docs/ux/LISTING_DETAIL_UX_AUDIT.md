# Listing Detail UX And Worker Usage Audit

Last updated: 2026-07-06 21:44 (Asia/Jakarta)

## Verdict

The public detail page was usable but too scroll-heavy for traffic growth. The first screen spent too much space on media, breadcrumbs, repeated owner-claim prompts, and vertically separated actions before the user reached core franchise facts/contact paths.

Worker usage risk was also tied to public-page JavaScript: static HTML itself does not count as a Worker request, but every automatic call to a Pages Function does. The highest-risk paths were listing-detail analytics and the premium promo ribbon.

## Cloudflare limit evidence

- Cloudflare Workers Free includes 100,000 requests per day, and Pages Functions requests count against the Workers Free quota.
- Cloudflare Pages static asset requests are free/unlimited when they do not invoke Functions.
- The Free daily request limit resets at midnight UTC.

Official references:

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/pages/platform/limits/

## Likely request drivers found in code

| Source | Trigger | Risk | Session action |
| --- | --- | --- | --- |
| `js/product-events.js` -> `/product-event` | Auto `listing_view` on every generated listing-detail page load | High on traffic spikes because every detail view invoked a Function | Added 3% sampling, 6-hour per-listing dedupe, and per-browser daily event budget |
| `js/site-promo-bar.js` -> `/premium-promo` | Promo config fetch on every page where the ribbon script is injected | High across public page traversal | Removed promo script from generated low-intent directory/detail/buyer-tool pages; kept it on `/premium` and `/profil`; added 30-minute localStorage cache and 15-minute response cache |
| `js/site-promo-bar.js` -> `/premium-event` | Promo ribbon view event after rendering | Medium/high because it ran on page load when promo is enabled | Added dashboard-configured per-day view cap and 24-hour per-promo event dedupe |
| `js/premium-page.js` -> `/premium-event` | Premium page view and CTA events | Medium | Added 6-hour page-view dedupe and 10-minute CTA dedupe |
| Auth/profile/dashboard Functions | User-triggered protected flows | Lower for anonymous public traffic | No change this session |
| `/dashboard-data` traffic guardrail | Staff/admin read-only visibility | Low | Added a local guardrail panel that shows Free-plan limit, reset time, and active throttle/cache controls without calling Cloudflare Analytics automatically |

## Cloudflare analytics review checklist before traffic campaigns

Use this before paid traffic, influencer drops, newsletter blasts, or any other planned spike. This is an operational checklist, not an automated blocker.

Official references:

- Cloudflare Pages Functions Metrics: https://developers.cloudflare.com/pages/functions/metrics/
- Cloudflare Workers Metrics and Analytics: https://developers.cloudflare.com/workers/observability/metrics-and-analytics/
- Cloudflare GraphQL Analytics API: https://developers.cloudflare.com/analytics/graphql-api/

### Required access

- Cloudflare dashboard access to the Franchisee.id Pages project.
- If using GraphQL instead of the dashboard: an Analytics API token, the account ID, and either the Pages project name or Worker script identifier.
- A 24-hour comparison window before launch, then the launch window, then 24 hours after launch.

### Review sequence

1. In Cloudflare Pages, open the Franchisee.id project metrics and record total Functions requests, successful requests, and errored requests for the last 24 hours.
2. Compare the same counters during the campaign window against the Free-plan daily limit shown in `/dashboard` Traffic Guardrail.
3. Check route-level request drivers where available. Prioritize:
   - `/product-event`
   - `/premium-promo`
   - `/premium-event`
   - `/auth-config`
   - `/dashboard-data`
   - `/profile-data`
4. If Functions requests rise faster than pageviews, inspect whether the spike is from public endpoints (`/product-event`, `/premium-promo`, `/premium-event`) or protected/auth endpoints.
5. If `/premium-promo` rises unexpectedly, confirm generated franchise pages are not loading `js/site-promo-bar.js` and confirm the promo browser cache is not bypassed.
6. If `/product-event` rises unexpectedly, confirm sampling and daily browser budget are still active in `js/product-events.js`.
7. If `/auth-config` rises unexpectedly, inspect whether bots are hitting login/register/profile routes or whether public pages accidentally load auth scripts.
8. If errors rise, inspect route status/error breakdown first, then dashboard `operation_events` only for app-level failures.
9. Record the reviewed window, top request drivers, mitigation taken, and whether the site stayed below the daily warning threshold.

### Trigger points

- At 70,000 Function requests/day: keep the campaign running but check the top routes every few hours.
- At 90,000 Function requests/day: pause avoidable promo/analytics calls first; do not wait for the hard limit.
- If public traffic is mostly static pageviews and Function usage stays flat, no action is needed.

## Listing detail UX issues

| Issue | Impact | Session action |
| --- | --- | --- |
| Hero/detail image area felt too tall | Core info and contact tabs were pushed below the fold | Capped generated detail image height and reduced image widget margin |
| Breadcrumb looked visually loud | It competed with page title and first action | Made breadcrumb smaller, neutral, and text-link based |
| Multiple claim prompts | Users saw repeated “klaim” CTAs in sticky bar, disclaimer, contact note, and WhatsApp helper link | Kept only the floating/sticky claim CTA; made inline status copy informational |
| Save/compare actions consumed a row | Useful secondary actions should not delay access to facts/contact | Converted detail save/compare to compact icon buttons with shared tooltips |
| Large vertical gaps before tabs/sidebar | Page required more scrolling than necessary | Reduced generated spacing around actions, tabs, promo lead, and image widgets |
| Title area lacked an at-a-glance summary | Users had to scroll/scan to understand modal, category, BEP, and status | Added compact quick-fact chips under the brand title, with horizontal sticky behavior on mobile |
| Floating claim CTA used inline styling | Harder to tune responsively and easy to drift from page theme | Converted generated Astro sticky claim CTA to class-based markup/CSS; D1 bridge keeps fallback CSS for committed flat pages |
| H1 action placement fought centered hero composition | Save/compare buttons beside the H1 made the centered title feel visually off-balance | Moved detail save/compare actions into the `Informasi Franchise` H2 row |
| Quick facts repeated the existing icon metadata row | Category appeared twice, with the second instance using weaker formatting | Removed repeated modal/category from hero quick facts; hero chips now only show complementary BEP, international origin/target, or verified/premium status when available |
| Compare icon contrast was weak in compact mode | White icon on light/white button state could be unreadable | Forced compact detail action buttons to use black/yellow contrast in normal, hover, focus, and selected states |
| Sticky claim sentence broke mid-copy | Nested brand name was styled as block text, causing `Klaim brand` / brand / `secara gratis` to split awkwardly | Scoped sticky claim CSS so the first headline remains block but the brand name inside the sentence stays inline |
| Logo, social links, and franchise facts were still separated vertically | Users had to scroll through a logo and then a plain two-column list before reaching tabs/contact | Added a compact brand card + enriched fact panel under `Informasi Franchise`, using icons and available D1/form fields such as social links, origin/target, outlet type, location requirement, contract duration, omzet, profit, and support |
| Dummy social buttons remained in the legacy detail body | Placeholder `#` social links reduce trust | Hid the legacy dummy social block and render real social links only when D1/form data has official URLs |
| Some fact icons did not render in the generated detail page | Newer Font Awesome aliases can fail against the template's older icon bundle | Switched `Berdiri Sejak` and `Gerai / Area` to older compatible icon classes |
| Unknown values such as `Tanya Admin` were dead text | Buyers who need a missing fee/detail had no obvious next action | Made `Tanya Admin` / `Hubungi Admin` values clickable; they open and scroll to the `Kontak` tab |
| Detail tabs looked like detached buttons | Users may not understand that clicking a tab swaps the content below | Restyled generated tabs as connected tab headers with an active panel edge |
| Economic/franchise terms were not self-explanatory | Lay buyers may not know the difference between modal, franchise fee, royalty, advertising fee, BEP, and omzet | Added shared-tooltip explanations to fact labels |
| Category fact did not help exploration | Category is a useful browse path and should connect to similar opportunities | Linked `Kategori Franchise` to the relevant `/peluang-usaha?kategori=...` page |
| `/profil` and `/dashboard` browser tabs lacked site favicon consistency | Protected app shells felt less integrated with Franchisee.id | Added Franchisee.id favicon/apple-touch icon links to both Astro pages |
| Tab heading and content still felt visually disconnected | The heading row border visually separated the active tab from the panel, and the panel width could feel driven by inner content rather than the full tab shell | Make the whole tab widget a full-width connected shell, let the active tab overlap the panel edge, and move the border to the shared tab/content container |
| Logo/facts and description competed with tabs | The page had a separate facts panel plus tabs, so users had to decide whether the real content was above or inside tabs | Move the logo/social/fact panel into the `Profil` tab and move the description into a dedicated `Detail` tab |
| Hero image still consumed first-screen space | The cover image added scroll cost without adding enough decision value on listing detail pages | Hide the generated hero image/title block and promote the information-section brand heading to the page H1 |
| Tab menu could carry more buyer intent | Two or three tabs did not expose enough of the decision journey | Add intent-based tabs from existing data: `Profil`, `Detail`, `Investasi`, optional `Support`, optional `Galeri`, optional `Brosur`, optional `FAQ`, and `Kontak` |

## 2026-07-06 brochure and listing enrichment plan

| Workstream | Implementation decision | Acceptance check |
| --- | --- | --- |
| Form facts on public listings | Expand the D1 static snapshot query to include the existing outlet, location, cost, contract, omzet, profit, and royalty fields already supported by the shared row schema/detail renderer. | A populated `outlet_type` or `location_requirement` reaches the generated `Profil` tab instead of becoming `null` in the snapshot. |
| Profile/tab styling | Remove the nested card border around the `Profil` content and remove top/side borders from tab buttons; distinguish active/inactive tabs with background and text color. | The tab shell remains readable without a border-inside-border appearance. |
| Brochure reader | Show one brochure page at a time with previous/next buttons, page count, keyboard navigation, and compatible Font Awesome icons. | Visitors can move through pages without scrolling the whole brochure. |
| Download watermark | Composite the current Franchisee.id logo/name at bottom-right only while browser-generated PDF pages are rasterized. Keep stored R2 originals unchanged. | Downloaded image-based PDFs are attributed; changing the configured watermark later does not require rewriting R2 objects. |
| Dynamic contact buttons | Replace the legacy hard-coded Alam WhatsApp/phone floats on generated detail pages with the listing's parsed WhatsApp/phone and PIC label. Hide unavailable channels. | A listing never presents Alam as its brand contact unless Alam is actually its saved PIC. |
| Brochure knowledge | Extract selectable PDF text after owner upload, store source text plus deterministic structured candidates, and create a reviewable listing-edit suggestion for missing facts rather than silently overwriting owner data. | Digital PDFs produce auditable knowledge; scanned/image-only brochures remain marked for OCR/backfill. |

## 2026-07-07 brochure download and legacy-runtime cleanup plan

| Workstream | Implementation decision | Acceptance check |
| --- | --- | --- |
| Brochure PDF download failure | Move image-to-PDF generation from browser canvas to `/proposal-download`, a Pages Function that fetches allowlisted proposal image hosts server-side and adds the Franchisee.id watermark only to the returned PDF. | R2 image CORS no longer blocks PDF download, originals remain unchanged, and the route cannot fetch arbitrary hosts. |
| Download progress | Convert the download button into an in-button status/progress state while the PDF Function prepares the file. | Users see “Menyiapkan PDF” and a progress fill instead of a silent wait. |
| Brochure controls | Put previous/next hit areas over the left/right 50% of the image, and show the download/top bar inside the image on hover/focus. | Page controls do not consume extra vertical space and remain keyboard/click accessible. |
| Proposal status layout | Keep `fr-proposal-status` hidden when empty and show it inside the image top bar next to the download control when there is a message. | Empty status text does not create blank spacing. |
| WordPress runtime cleanup | Strip unused `analyticswp`, `wp-emoji-release`, LatePoint front runtime, and `/wp-admin/admin-ajax.php` references during static HTML generation/copy. | Generated/copy output no longer triggers irrelevant WordPress AJAX/MIME console errors. |

## Next implementation ideas

| Priority | Idea | Notes |
| --- | --- | --- |
| Done | Move save/compare icons into the title/status row | Implemented in the generated detail title row for Astro output. |
| Done | Add a sticky mini fact bar under title on mobile | Implemented compact quick-fact chips for modal, category, BEP/status, and non-Indonesia origin when available. |
| Done | Replace legacy inline styles in `generateStickyBar()` with class-based CSS | Astro renderer now uses class-based sticky claim markup/CSS; D1 bridge includes fallback CSS for committed flat pages. |
| Done | Add Cloudflare analytics review checklist before traffic campaigns | Added the route-level review sequence, required access, and trigger points above. |
| Done | Evaluate removing promo ribbon script from low-intent generated pages | Removed promo loading from generated franchise directory/detail pages and buyer tools; promo remains on `/premium` and `/profil`, with a dashboard-configured per-day view cap during the configured campaign period. |
| Done | Move listing-detail actions out of the H1 and into the information section | H1 stays centered; compact save/compare actions sit beside the `Informasi Franchise` brand H2. |
| Done | Replace the old logo + plain detail list with an enriched summary panel | Generated detail pages now render a side-by-side brand card and icon-enriched data grid, while hiding the legacy vertical blocks. |
| Done | Render official social links in the brand summary area | Social icons now use D1/form URLs and only appear when real Website/Instagram/Facebook/TikTok/YouTube/LinkedIn links exist. |
| Done | Make hero quick facts complementary rather than repetitive | Hero facts no longer repeat modal/category; they only appear for BEP, verified/premium status, or international brand context. |
| Done | Make missing detail values actionable | `Tanya Admin` and `Hubungi Admin` values now open the Kontak tab instead of behaving like static unknown text. |
| Done | Add layperson tooltips for franchise facts | Modal, fee, royalty, advertising, BEP, omzet, profit, support, and related labels now use shared instant tooltip hints. |
| Done | Make detail tabs read visually as tabs | Tab headers now connect to the active panel and look less like independent buttons. |
| Done | Integrate tab content with the active tab | The tab shell now owns the border/background, active tabs overlap the panel edge, and tab content spans the full shell width. |
| Done | Move profile facts into the tab system | The logo/social/fact summary now lives in the `Profil` tab; the old separate summary panel is no longer rendered above tabs. |
| Done | Add decision-oriented tabs | Generated detail pages now include `Detail`, `Investasi`, optional `Support`, optional Premium/media tabs, and `Kontak` in addition to `Profil`. |
| Done | Remove hero-image real estate from generated detail pages | The legacy hero/cover section is hidden and the brand heading in the information section is promoted to H1. |

## Traffic readiness checklist

- [x] Remove per-view listing analytics invocation.
- [x] Cache promo ribbon config in the browser.
- [x] Dedupe promo and premium page events.
- [x] Remove requested Maxim GIF from detail template.
- [x] Reduce detail-page vertical friction.
- [x] Move detail save/compare actions into the title row.
- [x] Add compact quick-fact chips under the title.
- [x] Add `/dashboard` local traffic guardrail visibility without external Cloudflare Analytics calls.
- [x] Add Cloudflare analytics review checklist before traffic campaigns.
- [x] Remove promo ribbon loading from generated low-intent pages.
- [x] Add dashboard-configured promo view cap that resets per visitor/device/day.
- [x] Keep listing-detail H1 centered and move secondary actions to the information section.
- [x] Enrich `Informasi Franchise` with side-by-side brand card, real social links, and icon facts from D1/form fields.
- [x] Make missing info values open the contact path.
- [x] Add explanatory tooltips to franchise fact labels.
- [x] Add Franchisee.id favicons to `/profil` and `/dashboard`.
- [x] Connect active tab headers directly to their tab content panel.
- [x] Move generated detail logo/facts and description into the tab content model.
- [x] Remove the listing-detail hero image from the visible generated layout.
- [ ] Review Cloudflare dashboard Function route metrics after deploy using the checklist above.
- [ ] QA generated detail pages on production after push, especially mobile first screen and sticky claim behavior.
