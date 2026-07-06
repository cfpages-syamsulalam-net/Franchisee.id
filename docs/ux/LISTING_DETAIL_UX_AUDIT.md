# Listing Detail UX And Worker Usage Audit

Last updated: 2026-07-06 13:42 (Asia/Jakarta)

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

## Next implementation ideas

| Priority | Idea | Notes |
| --- | --- | --- |
| Done | Move save/compare icons into the title/status row | Implemented in the generated detail title row for Astro output. |
| Done | Add a sticky mini fact bar under title on mobile | Implemented compact quick-fact chips for modal, category, BEP/status, and non-Indonesia origin when available. |
| Done | Replace legacy inline styles in `generateStickyBar()` with class-based CSS | Astro renderer now uses class-based sticky claim markup/CSS; D1 bridge includes fallback CSS for committed flat pages. |
| Done | Add Cloudflare analytics review checklist before traffic campaigns | Added the route-level review sequence, required access, and trigger points above. |
| Done | Evaluate removing promo ribbon script from low-intent generated pages | Removed promo loading from generated franchise directory/detail pages and buyer tools; promo remains on `/premium` and `/profil`, with a dashboard-configured per-day view cap during the configured campaign period. |

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
- [ ] Review Cloudflare dashboard Function route metrics after deploy using the checklist above.
- [ ] QA generated detail pages on production after push, especially mobile first screen and sticky claim behavior.
