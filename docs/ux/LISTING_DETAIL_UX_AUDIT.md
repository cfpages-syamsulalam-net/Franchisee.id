# Listing Detail UX And Worker Usage Audit

Last updated: 2026-07-06 10:39 (Asia/Jakarta)

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
| `js/site-promo-bar.js` -> `/premium-promo` | Promo config fetch on every page where the ribbon script is injected | High across public page traversal | Added 30-minute localStorage cache and increased response cache header to 15 minutes |
| `js/site-promo-bar.js` -> `/premium-event` | Promo ribbon view event after rendering | Medium/high because it ran on page load when promo is enabled | Added 24-hour per-promo event dedupe |
| `js/premium-page.js` -> `/premium-event` | Premium page view and CTA events | Medium | Added 6-hour page-view dedupe and 10-minute CTA dedupe |
| Auth/profile/dashboard Functions | User-triggered protected flows | Lower for anonymous public traffic | No change this session |

## Listing detail UX issues

| Issue | Impact | Session action |
| --- | --- | --- |
| Hero/detail image area felt too tall | Core info and contact tabs were pushed below the fold | Capped generated detail image height and reduced image widget margin |
| Breadcrumb looked visually loud | It competed with page title and first action | Made breadcrumb smaller, neutral, and text-link based |
| Multiple claim prompts | Users saw repeated “klaim” CTAs in sticky bar, disclaimer, contact note, and WhatsApp helper link | Kept only the floating/sticky claim CTA; made inline status copy informational |
| Save/compare actions consumed a row | Useful secondary actions should not delay access to facts/contact | Converted detail save/compare to compact icon buttons with shared tooltips |
| Large vertical gaps before tabs/sidebar | Page required more scrolling than necessary | Reduced generated spacing around actions, tabs, promo lead, and image widgets |

## Next implementation ideas

| Priority | Idea | Notes |
| --- | --- | --- |
| High | Move save/compare icons into the title/status row | Current session made them compact; next step is placing them next to brand name if the legacy template title structure is stable enough. |
| High | Add a sticky mini fact bar under title on mobile | Show modal range, category, location/target market, and contact CTA before long text. |
| Medium | Replace legacy inline styles in `generateStickyBar()` with class-based CSS | Makes the floating claim CTA easier to tune responsively. |
| Medium | Add Cloudflare analytics review checklist before traffic campaigns | Confirm whether remaining request spikes come from `/product-event`, `/premium-promo`, `/auth-config`, or bot traffic. |
| Low | Evaluate removing promo ribbon script from low-intent generated pages | If Worker quota remains tight, show promo only on `/premium`, `/profil`, and high-intent pages. |

## Traffic readiness checklist

- [x] Remove per-view listing analytics invocation.
- [x] Cache promo ribbon config in the browser.
- [x] Dedupe promo and premium page events.
- [x] Remove requested Maxim GIF from detail template.
- [x] Reduce detail-page vertical friction.
- [ ] Review Cloudflare dashboard Function route metrics after deploy.
- [ ] QA generated detail pages on production after push, especially mobile first screen and sticky claim behavior.
