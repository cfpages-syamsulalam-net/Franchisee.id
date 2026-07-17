# Topical Authority And Directory SEO Plan

Last updated: 2026-07-17 12:24 (Asia/Jakarta)

This plan captures the requested direction for improving Franchisee.id organic growth, especially `/peluang-usaha` and category landing pages. Implementation is intentionally staged so the directory UI, static routes, generated metadata, and broader content strategy can be changed without losing the product intent.

## Product SEO Position

Franchisee.id should help two sides of the market:

- Prospective franchisees: people who have capital or business intent but do not yet know which opportunity fits their budget, location, risk profile, category interest, and operating capacity.
- Prospective franchisors: business owners who have a working business or expansion idea and need to understand the logical next step: document the system, package the offer, list the brand, gather leads, and eventually grow through Premium/network distribution.

The site wins when more good franchisors and more qualified franchisees can find each other. SEO content should therefore be practical, user-first, and tied to real directory actions rather than thin keyword pages.

## Current `/peluang-usaha` Findings

| Finding | Why it matters | Desired direction |
| --- | --- | --- |
| Listing rows are pushed too far below the top content. | The page job is to help users find franchise opportunities quickly. | First viewport should expose search/filter and the beginning of listing results without excessive intro copy. |
| Search appears duplicated. | Users can hesitate because two controls seem to do the same job. | Keep one clear directory search/filter surface. Remove or suppress legacy template search if present. |
| Cards feel visually weak and too padded for a large directory. | Many franchise brands need compact scanning. | Redesign cards for density, stronger hierarchy, consistent media, and clear action controls. |
| Owner CTA copy is too vague. | Franchisors may not understand that they can list a brand for free. | Use direct copy: "Punya peluang usaha franchise? Tampilkan brand franchise Anda gratis di Franchisee.id." |
| Page purpose is split. | The directory should convert two clear intents. | Buyers should register as franchisee members when they want more info/save/compare; owners should register as franchisors to list or claim a brand. |
| Category query URLs are weak for SEO. | `/peluang-usaha/?kategori=makanan-minuman` is not a strong canonical landing page. | Category browsing should use `/peluang-usaha/kategori/[slug]` as the indexable URL, with query params only for temporary search/sort/status state. |

## URL And Indexing Policy

| URL type | Indexing role | Rule |
| --- | --- | --- |
| `/peluang-usaha` | Main directory hub | Indexable. General discovery page with compact directory controls and broad franchise value proposition. |
| `/peluang-usaha/kategori/` | Category hub | Indexable if it helps users choose categories. |
| `/peluang-usaha/kategori/[slug]` | Category landing page | Generated for navigation. Indexable when it has at least three listings, unique useful copy, and is not the catch-all `lainnya`; sparse/catch-all pages use `noindex, follow`. |
| `/peluang-usaha?sort=...` | Temporary sort state | Prefer canonical to `/peluang-usaha`; not a separate SEO landing page. |
| `/peluang-usaha?kategori=...` | Temporary fallback/filter state | Avoid using as the primary category path. Category selection should navigate to `/peluang-usaha/kategori/[slug]`. |
| Combined filters/search | User session state | Useful for users, but not intended as thin indexable pages. |

## Category Page Content Requirements

Each indexable category page should include:

- Dynamic title, meta description, H1, subheading, and intro based on the category label.
- Real listing count from the generated D1 snapshot.
- A short practical paragraph explaining what the user can compare in that category.
- Category-specific subtopics where relevant, such as outlet type, format, budget range, and common operating model.
- Internal links to related category, modal, city, comparison, calculator, and registration paths.
- Buyer CTA: become a franchisee member, save opportunities, compare brands, or request more info.
- Owner CTA: list a franchise brand for free or claim an existing listing.

Example direction for Makanan & Minuman:

- Mention food and beverage franchise choices such as booth, cart/gerobak, kiosk, cafe, restaurant, drink, snack, chicken, coffee, tea, dessert, and cloud-kitchen style where data supports it.
- Use the actual count: "Temukan [count] peluang franchise makanan dan minuman..."
- Avoid pretending every format exists unless matching listings or category text supports it.

## Persona And Intent Map

| Persona | Search intent | Best page/content answer | Conversion path |
| --- | --- | --- | --- |
| First-time buyer with capital | "franchise modal kecil", "peluang usaha makanan" | Directory, modal pages, category pages, calculator | Save/compare, register as franchisee, request info. |
| Buyer comparing categories | "franchise makanan vs laundry", "franchise pendidikan" | Category hubs and comparison content | Compare brands/categories, register for saved opportunities. |
| Location-driven buyer | "franchise di Bandung", "usaha franchise Jakarta" | City pages with real location/service-area data | Filter by city, request info. |
| Existing business owner | "cara franchise-kan bisnis", "daftar franchise gratis" | Franchisor education and `/daftar` path | Register as franchisor, create listing. |
| Growth-ready franchisor | "promosi franchise", "cari calon mitra franchise" | Premium/network distribution content | Complete listing, activate Premium. |
| Unsure entrepreneur | "punya modal tapi bingung usaha apa" | Guides that map budget, skill, category, and risk | Use tools, browse recommendations, register. |

## Topical Authority Content Clusters

| Cluster | Purpose | Example content |
| --- | --- | --- |
| Franchise directory | Help users find real opportunities. | Main directory, category pages, modal pages, city pages, brand detail pages. |
| Buyer decision support | Help users choose logically. | Budget guide, BEP calculator, category comparison, risk checklist, operational readiness. |
| Franchisor education | Help business owners expand properly. | How to build SOP, define franchise package, prepare support system, legal/trademark basics, listing readiness. |
| Franchise operations | Build trust with practical business knowledge. | Staff planning, outlet formats, royalty/fee explanations, location criteria, training/support expectations. |
| Premium/network growth | Explain paid value after free listing. | How Premium improves visibility, lead handling, network publication, proof quality. |

## Implementation Backlog

| Item | Priority | Ship now? | Notes |
| --- | --- | --- | --- |
| Document UI reference and scope triage rules. | P0 | Yes | Covered by suggestions 104 and 105. |
| Capture `/peluang-usaha` SEO/UX direction. | P0 | Yes | This document is the implementation basis. |
| Change category filter to navigate to `/peluang-usaha/kategori/[slug]` for category-only selection. | P1 | Done | Search/sort/status remain temporary query state on the canonical hub/category path; category is no longer written as a query parameter. |
| Remove duplicate search and shorten top section so listings appear earlier. | P1 | Done | The legacy explanatory/search section is removed at render time and the hero/controls are compact. |
| Redesign directory cards for compact scanning. | P1 | Done | Responsive cards now use stable contained media, denser facts, icon-only save/compare actions, and one-column mobile layout. |
| Rewrite directory owner CTA copy. | P1 | Done | Uses the requested direct free-listing message and keeps the CTA after results. |
| Expand category landing copy with dynamic count and category-specific paragraphs. | P1 | Done | Typed content profiles cover 13 canonical categories with decision points, real snapshot counts, buyer CTA, and evidence-safe fallback copy. |
| Add richer internal links from category pages to related category/tool pages. | P2 | Done | Related categories, Franchisepedia, budget tool, and comparison links render below category results. |
| Build broader topical authority content calendar. | P2 | Tracker ready | `docs/seo/CATEGORY_CONTENT_BACKLOG.md` contains 35 categorized article ideas with status, intent, funnel stage, CTA, and evidence guardrails. Editorial research/publication remains separate work. |

## Implemented Directory Contract - 2026-07-17

- The page has one primary directory search; the duplicate legacy search/content section is removed from generated output.
- Search and filters appear before the compact result grid. Category guidance, buyer registration, and the franchisor free-listing CTA appear after results.
- Category selection navigates to `/peluang-usaha/kategori/[slug]`; query parameters only preserve temporary search, sort, and status state.
- `FnB` and legacy aliases consolidate into canonical categories. `jasa-layanan` remains an intentional aggregate hub for `bisnis-jasa` and `laundry-jasa-kebersihan`.
- Category pages use category-specific title, description, H1 supporting copy, actual listing count, decision points, and internal links.
- Directory JSON-LD is now `CollectionPage` plus `ItemList`/breadcrumbs; the legacy WordPress `Article` and `admin` author schema is removed.
- Sparse categories and `lainnya` remain reachable for users but use `noindex, follow` until they meet the content/indexability rule.
- Focused regression coverage is available through `pnpm run directory:check`.

## Acceptance Criteria For Future `/peluang-usaha` Implementation

- First viewport shows a clear way to search/filter and at least the start of franchise results on common desktop and mobile viewports.
- Only one search surface is visually primary.
- Category selection leads to canonical category URLs when the selected category is the main state.
- Category pages have unique metadata and body copy tied to category label, count, and useful category-specific decision points.
- Cards are compact, readable, and action-oriented.
- Buyer and owner CTAs are both explicit, but the listing discovery job remains dominant.
- No public copy uses internal implementation language.
