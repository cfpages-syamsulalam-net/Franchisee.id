# UI fix audit

## Changes

- Added the shared `/css/legacy-shell.css` link through `normalizeGeneratedHtml`, removing any prior copy of the same link first so repeated normalization stays idempotent.
- Hid closed HFE dropdown navigation with `.hfe-dropdown:not(.menu-is-active)`; the selector follows `wp-content/plugins/header-footer-elementor/inc/js/frontend.js`, which adds `menu-is-active` when the mobile toggle opens.
- Constrained the known legacy shell containers to the viewport and removed the directory hero image at source with a warm cream background.
- Kept the directory search full width on small screens, placed the remaining filters in two columns, and removed quick links duplicated by the sort select (`Rekomendasi`, `Populer`, `Abjad`). Category, capital, city, budget tool, and compare paths remain reachable.

## Verification

- `pnpm run directory:check`: passed for 197 listings and 14 category routes.
- TypeScript compilation: `pnpm exec tsc --noEmit --pretty false` passed.
- `normalizeGeneratedHtml` idempotence assertion passed with exactly one `legacy-shell-css` link after two passes.
- Browser fixture with Chrome at `https://franchisee.id/`, stylesheet injected from the source file: viewport 390 reported `scrollWidth=390`, `innerWidth=390`; viewport 1440 reported `scrollWidth=1440`, `innerWidth=1440`.

The live deployment still serves the previous generated directory HTML, so its current quick links and hero image are expected until the parent build is published. The 390px fixture confirmed the closed dropdown computes to `display:none`; the HFE source confirms the open state is `menu-is-active`, preserving the opened menu when the generated output is rebuilt.
