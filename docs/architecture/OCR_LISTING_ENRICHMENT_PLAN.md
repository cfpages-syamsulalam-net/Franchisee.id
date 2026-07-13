# OCR Listing Enrichment Plan

Last updated: 2026-07-13 15:09 (Asia/Jakarta)

## Why this exists

The OCR pipeline is already producing enough brochure text to improve public franchise detail pages beyond the current basic listing fields. The next product step is not more OCR by itself; it is turning OCR text into reviewable, source-backed listing facts and optional detail tabs.

Principle: do not show empty tabs. A tab/section appears only when a franchise has enough reviewed or high-confidence data for that section.

## Remote D1 snapshot checked

Read-only remote D1 checks on `franchise_db` found:

| Metric | Value |
| --- | ---: |
| Extracted OCR/proposal knowledge rows | 164 |
| Franchises with extracted knowledge | 19 |
| Rows with finance/projection signals | 44 |
| Rows with package/include/exclude signals | 18 |
| Rows with support/training/SOP signals | 26 |
| Rows with location/requirement/sarana signals | 22 |
| Rows with legal/NIB/merek signals | 15 |
| Rows with proof/testimonial/mitra signals | 59 |

## 2026-07-12 structured candidate replay

After the broader OCR backfill, remote `franchise_db` had 479 extracted proposal-knowledge rows. Running `pnpm run ocr:enrich:structured -- --apply-remote` replayed the shared sanitizer and deterministic extractor against those rows, updated sanitized `source_text` plus missing-field `structured_data`, and then verified a clean no-op replay.

| Metric | Before replay | After replay |
| --- | ---: | ---: |
| Extracted OCR/proposal knowledge rows | 479 | 479 |
| Rows with structured candidates | 56 | 164 |
| Rows containing the filtered source watermark marker | 9 | 0 |

Observed structured candidate coverage after replay:

| Candidate group | Rows |
| --- | ---: |
| Support/partner assistance | 93 |
| Royalty percent/basis/period | 20 |
| Total investment | 16 |
| Minimum area | 8 |
| Monthly profit | 6 |
| Franchise/license fee | 4 |
| BEP | 2 |
| Monthly omzet | 1 |

This replay still does not mutate canonical `franchises` fields. It enriches OCR knowledge rows so admin review and later AI/supplemental insight work can start from structured, source-backed candidates.

## 2026-07-12 grouped review queue

Suggestion 87 is implemented as the first review UX layer on top of the deterministic structured candidates:

- `functions/_ocr-enrichment-review.js` groups candidate fields by `franchise_id`, ignores canonical fields that already have values, normalizes candidate values through the shared editable-listing sanitizer, and keeps source page/excerpt context per field.
- `/dashboard-data` now exposes this as `ocr_jobs.enrichment_queue` and accepts the admin-only `create_ocr_enrichment_suggestion` action.
- The OCR Results dashboard renders `Kandidat Review OCR` above result cards, with shared source, public listing, pending-state, and `Buat Review` pill actions.
- Pending document-derived suggestions render in a dedicated `Review OCR` dashboard subtab with a full-width Brand/Diff/Reason/Aksi table, separate from generic manual/staff listing review. This includes both older `proposal_extraction` suggestions and newer grouped `ocr_enrichment_bundle` suggestions.
- New review bundles store per-field evidence under `old_value.__ocr_evidence`, including source page, OCR excerpt, and brochure image URL when available. The OCR Review diff shows the excerpt and reuses the shared image hover-preview component for the brochure source.
- Older document suggestions that lack embedded evidence are enriched at dashboard read time from `franchise_asset_knowledge` by `_dashboard-review-evidence.js`, so each field can still show sanitized excerpt context and a brochure image hover preview when the source asset URL exists.
- OCR Review diffs format `_idr` fields as Rupiah with Indonesian thousand separators and normalize short classification values such as outlet type/category to title case for easier admin scanning.
- Admin approvals are granular: each field has an approval checkbox, and `/dashboard-data` applies only the selected `approved_fields` while recording skipped fields in review notes/audit metadata.
- Review creation writes one pending `listing_edit_suggestions` row per franchise with `field_name='ocr_enrichment_bundle'`. The `suggested_value` JSON contains the actual canonical field changes, so the existing admin approval path still sanitizes and applies normal editable fields.
- No new D1 migration was needed; this reuses `franchise_asset_knowledge`, `listing_edit_suggestions`, and the existing review/audit/public rebuild path.

Dense current examples:

| Franchise | OCR rows/pages | Approx chars | Useful observed content |
| --- | ---: | ---: | --- |
| Gorillaz | 23 | 21,951 | Package investment, optimistic/pessimistic projection, royalty 0%, HPP/material cost, price list, support/training, testimonials, competitor comparison, outlet network claims. |
| Coolio Barbershop | 10 | 9,929 | Package costs, include/exclude list, recruitment mechanism, operational costs, location/building exclusions. |
| NEC | 9 | 7,874 | Company profile, program/service list, branch-opening requirements, sarana/prasarana, staffing standards. |
| Hydrophobic Lab | 18 | 7,483 | Benefit/reason-to-join copy, royalty/fee notes, training/support, long-term cooperation terms. |
| Codero | 15 | 6,212 | Legal/company profile, outlet locations, product/program curriculum, package/license fee, include/exclude tools, training/support, market/education positioning. |

The current deterministic extractor catches only a small subset (`outlet_type`, `location_requirement`, investment, BEP, royalty, profit, support). The text itself contains richer structured information than the current extractor can reliably map.

## Recommended public listing tabs

These are ordered by likely public value and data availability.

### 1. Paket & Investasi

Use when OCR/form data has one or more franchise packages, investment amounts, include/exclude lists, license duration, tools/equipment, construction/renovation notes, or required additional costs.

This should probably become the strongest new tab because brochures often explain the buying decision through packages, not a single investment number.

Suggested content:

- Package cards: package name, price/range, duration, included items, excluded costs.
- “Yang termasuk” and “Belum termasuk” lists.
- Notes such as rent, renovation, shipping, trainer travel, monthly system/POS fees.
- Existing canonical listing fields: `fee_license_idr` (`Biaya lisensi / kemitraan`, including franchise fee, license fee, biaya kemitraan, or investasi kemitraan wording), `fee_capex_idr`, `fee_construction_idr`, `total_investment_idr`, `min_investment_idr`, `max_investment_idr`, `contract_duration_months`.
- `total_investment_idr` must remain conservative. Do not infer it from a single `biaya kemitraan` / license-fee row; extract it only from explicit total/nilai investasi wording or from a future reviewed calculation model that can show all included components.

### 2. Proyeksi Usaha

Keep the existing projection concept, but make it richer and source-backed.

Use when OCR/form data has revenue assumptions, pessimistic/realistic/optimistic scenarios, BEP, monthly omzet, HPP/material cost, operating cost, net profit, royalty, or example financial reports.

Suggested content:

- Scenario cards: pesimis / moderat / optimis if detected.
- Monthly revenue, monthly cost, estimated net profit, BEP.
- Assumptions: daily customer/vehicle/student count, average transaction, service mix.
- Fees: royalty percent/basis/period, management fee, marketing fee.
- Clear disclaimer: “Proyeksi berasal dari brosur dan perlu diverifikasi langsung dengan brand.”

This tab should be sourced from canonical fields when reviewed, and from supplemental OCR insights only after confidence/review rules are met.

### 3. Syarat Lokasi & Operasional

Use when OCR/form data has outlet type, area, room count, utilities, equipment, staffing, opening requirements, recruitment process, operating model, or location notes.

Suggested content:

- Format outlet: booth, gerobak, ruko, rumah/ruko, center, dine-in, etc.
- Minimum area/room requirements.
- Staff requirements and recruitment timeline.
- Required facilities/equipment.
- Opening preparation checklist.
- Existing fields: `outlet_type`, `location_requirement`, `rent_cost_text`, `outlets_location`.

This directly answers why form fields like area needed/outlet type should matter on the public listing.

### 4. Dukungan Mitra

Use when OCR/form data has training, SOP, marketing support, software/POS, opening assistance, monitoring, recruitment help, supply chain, curriculum, or operational guidance.

Suggested content:

- Training & onboarding.
- Grand opening assistance.
- Marketing and content/ads support.
- SOP/software/monitoring.
- Recruitment/HR support.
- Ongoing consultation.
- Existing field: `support_system`, plus supplemental support items.

### 5. Produk, Layanan, atau Program

Use when the brochure contains a meaningful service/product/program list.

This matters because some franchises are not simple F&B menus. Education brands expose curricula/programs; automotive/service brands expose treatment packages; retail brands expose product categories.

Suggested content:

- Product/service categories.
- Program/curriculum levels.
- Example price list only when not too noisy and likely public-facing.
- Target customer segment.
- Existing fields that can help: `category`, `subcategory`, `target_market`, `short_desc`, `full_desc`.

### 6. Legalitas & Kredibilitas

Use when brochure text mentions company entity, NIB, trademark/brand registration, year established, headquarters, branch counts, partner counts, or awards.

Suggested content:

- Company/PT name.
- NIB/trademark/registration facts.
- Established year/head office/city origin.
- Outlet/partner/student/customer counts.
- Awards/recognitions if present.

This tab should be conservative: never imply verification unless the site has verified it. Label as “tercantum di brosur” unless reviewed.

### 7. Bukti & Testimoni

Use when OCR text has testimonials, partner stories, financial screenshots, branch maps, or customer/partner proof.

Suggested content:

- Short testimonial snippets after review.
- Branch/network highlights.
- “Klaim dari brosur” cards for proof points.

This should be optional and review-heavy because testimonials and claims can be promotional/noisy.

### 8. Komparasi / Keunggulan

Use sparingly. Some brochures compare against competitors or list USPs. This can help, but it is riskier because competitor claims can be subjective.

Suggested content:

- Internal USP bullets.
- Avoid naming competitor brands unless explicitly reviewed.
- Prefer “Keunggulan yang diklaim brand” over definitive claims.

## Better UX model for tabs

Do not create too many top-level tabs at once. A good public detail page can use:

1. `Profil` - existing description plus company profile enrichment.
2. `Investasi` - package + fee + include/exclude.
3. `Proyeksi` - BEP/omzet/profit/scenarios.
4. `Operasional` - location, staff, support, requirements.
5. `Produk` - service/program/menu when available.
6. `Legal & Bukti` - legalitas, network, testimonials, proof; only when reviewed enough.
7. `Brosur` - existing brochure viewer/download.

For smaller screens, keep tabs horizontally scrollable or convert to compact chips. If only one enriched section exists, render it as a section inside the existing info area instead of adding a single extra tab.

## Data model direction

There are two different kinds of data:

1. Canonical listing fields that already exist in `franchises`.
2. Supplemental brochure insights that may not fit one simple column.

Use both instead of forcing everything into `franchises`.

### Canonical field decision rule

Add a new canonical field only when the data is:

- common enough across many franchise brochures or franchisor submissions,
- stable enough to maintain as a listing fact,
- useful for public UI, sorting, filtering, comparison, SEO snippets, or recommendation logic,
- representable with a clear type, such as integer money/months/area, percent, enum, or short text,
- reviewable against a source, and
- not better represented as a repeatable package/scenario/support item.

Do not make every brochure detail canonical. If the data can have many rows per franchise, varies by package, or needs source excerpts to make sense, store it as supplemental `franchise_proposal_insights` first.

Recommended split:

| Data kind | Store as canonical field? | Reason |
| --- | --- | --- |
| Single headline investment range, BEP, royalty, outlet type, target market, minimum area | Yes | Useful in cards, filters, comparison tables, and top facts. |
| Multiple packages with include/exclude lists | No, use supplemental insight/table | Repeatable and package-specific. |
| Financial scenarios such as pesimis/moderat/optimis | Mostly supplemental, with optional canonical summary | Scenario assumptions matter; one flat value can mislead. |
| Product/program/service lists | Supplemental first | Often many items and category-specific. |
| Legal/company facts like PT/NIB/trademark | Supplemental first, maybe canonical later | Needs careful review and language around verification. |
| Testimonials/proof/competitor claims | Supplemental only | High review risk and not a stable listing fact. |

### Existing canonical fields to enrich

OCR/AI should propose updates for these existing fields through the existing review workflow:

- `year_established`
- `city_origin`
- `outlet_type`
- `location_requirement`
- `rent_cost_text`
- `contract_duration_months`
- `fee_license_idr` for biaya lisensi / kemitraan / franchise fee / license fee wording.
- `fee_capex_idr`
- `fee_construction_idr`
- `total_investment_idr` only when the document explicitly says total/nilai investasi or a future reviewed calculation model can prove the included cost components.
- `min_investment_idr`
- `max_investment_idr`
- `estimated_bep_months`
- `omzet_monthly_idr`
- `hpp_percent`
- `net_profit_percent`
- `royalty_percent`
- `royalty_basis`
- `royalty_period`
- `short_desc`
- `full_desc`
- `support_system`
- `office_address`
- `outlets_location`
- `brand_country`
- `target_market`

### Proposed additional canonical fields

These are optional fields worth considering because OCR and AI can extract them into structured values and the public UI can use them directly. They should not all be required in the franchisor form.

Business/model:

- `outlet_format_tags` JSON/text list: normalized formats such as `gerobak`, `booth`, `kios`, `ruko`, `rumah`, `dine_in`, `cloud_kitchen`, `mobile`.
- `min_area_sqm` integer.
- `ideal_area_sqm` integer.
- `min_staff_count` integer.
- `setup_duration_days` integer.
- `opening_training_days` integer.

Investment:

- `working_capital_idr` integer.
- `initial_stock_idr` integer.
- `equipment_cost_idr` integer.
- `renovation_cost_idr` integer.
- `additional_cost_notes` short text for rent, shipping, trainer travel, POS, utilities, etc.

Projection:

- `estimated_bep_min_months` integer.
- `estimated_bep_max_months` integer.
- `omzet_monthly_min_idr` integer.
- `omzet_monthly_max_idr` integer.
- `net_profit_monthly_min_idr` integer.
- `net_profit_monthly_max_idr` integer.
- `average_transaction_idr` integer.
- `projection_basis` short text, for example per day, per month, per outlet, or brochure scenario.

Fees/contract:

- `marketing_fee_percent` real.
- `management_fee_percent` real.
- `renewal_fee_text` short text.
- `contract_duration_text` short text when a normalized month value is not enough.

Credibility:

- `company_legal_name` text.
- `trademark_status_text` text.
- `nib_text` text.
- `outlet_count_claimed` integer.
- `partner_count_claimed` integer.

Priority if implemented:

1. Add `min_area_sqm`, `min_staff_count`, `setup_duration_days`, and BEP/omzet/profit min-max fields first because they directly improve public comparison and can be extracted from many brochures.
2. Keep package rows, product lists, support items, testimonials, and legal details in `franchise_proposal_insights` until enough data shows they deserve dedicated tables.
3. Do not expose legal/proof canonical fields as “verified” unless a separate verification process exists.

### Franchisor form strategy

The owner-facing form should stay simple at the beginning. Completeness should grow through progressive disclosure instead of showing a huge questionnaire upfront.

Detailed current-form audit and implementation planning live in `docs/forms/FRANCHISOR_PROGRESSIVE_FORM_PLAN.md`.

Recommended form behavior:

1. Ask only the high-value baseline fields first:
   - brand name,
   - category,
   - short description,
   - investment range,
   - contact,
   - city/origin,
   - proposal/brochure upload.
2. If the user answers a baseline area, reveal related follow-up questions:
   - if they fill investment, ask optional package/include/exclude details;
   - if they fill BEP/omzet/profit, ask projection assumptions;
   - if they choose outlet type, ask area/staff/location requirements;
   - if they upload a brochure, let OCR/AI prefill candidates later instead of asking everything manually;
   - if they skip a baseline section, do not ask its deeper follow-ups.
3. Save partial progress and show a completeness path after submission:
   - “Tambah proyeksi usaha”,
   - “Lengkapi syarat lokasi”,
   - “Tambah paket investasi”,
   - “Review data dari brosur”.
4. Keep AI/OCR suggestions as assistive prefill:
   - show “Kami menemukan data ini dari brosur”,
   - let franchisor/admin accept/edit/reject,
   - never force the owner to manually answer what the brochure already contains.

This gives the product both outcomes: low-friction onboarding and increasingly structured data as engaged franchisors or OCR/AI provide more information.

### New supplemental structure

Add a reviewed, source-backed table instead of storing all extra insight as free-form JSON in the listing row.

Recommended table: `franchise_proposal_insights`

Suggested columns:

- `id`
- `franchise_id`
- `asset_id`
- `insight_type` enum-like text:
  - `package`
  - `financial_projection`
  - `operational_requirement`
  - `support_system`
  - `product_service`
  - `legal_credibility`
  - `social_proof`
  - `competitive_claim`
- `title`
- `summary`
- `structured_data` JSON text
- `source_text_excerpt`
- `source_page`
- `confidence`
- `status`: `draft`, `pending_review`, `approved`, `rejected`, `archived`
- `reviewed_by_user_id`
- `reviewed_at`
- `created_at`
- `updated_at`

Optional child tables later, only if needed:

- `franchise_investment_packages`
- `franchise_financial_scenarios`
- `franchise_operational_requirements`
- `franchise_support_items`
- `franchise_product_services`

Start with `franchise_proposal_insights` first to avoid over-modeling before enough OCR coverage exists.

## AI integration direction

I agree AI should be integrated here, but only as an extractor/classifier that produces structured, reviewable facts with source references. It should not directly rewrite public listing copy or overwrite canonical listing fields.

Recommended pipeline:

1. OCR stores raw text per proposal page in `franchise_asset_knowledge`.
2. A new AI extraction job groups all pages for one franchise.
3. AI receives:
   - brand name/category,
   - existing canonical listing fields,
   - all OCR text for that franchise,
   - strict JSON schema for canonical candidates and supplemental insights.
4. AI returns:
   - `canonical_field_candidates`,
   - `proposal_insights`,
   - `source_page` / evidence excerpt for every claim,
   - confidence per item,
   - “insufficient evidence” instead of guessing.
5. Backend validates JSON with Zod.
6. Canonical candidates go into `listing_edit_suggestions`.
7. Supplemental insights go into `franchise_proposal_insights` as `pending_review`.
8. Dashboard review lets admin approve/reject/edit per item.
9. Public listing renders only approved canonical data and approved supplemental insights.

Guardrails:

- Never infer missing financial numbers.
- Never show unreviewed AI facts on public pages.
- Keep source page/excerpt for admin review.
- Prefer numeric normalized values plus original display text.
- If multiple pages conflict, keep both as candidates and require review.
- Preserve “tercantum di brosur” language for claims that are not independently verified.

## Suggested implementation phases

### Phase 1 - Read-only analysis and schema design

- Add migration for `franchise_proposal_insights`.
- Add Zod schemas for AI extraction output.
- Add a server-side helper that groups OCR text by franchise and page/source.
- Add dashboard read-only preview: “Potensi insight dari brosur” per franchise.

### Phase 2 - AI extraction job

- Add an admin-triggered “Analisis AI per franchise” action.
- Process one franchise at a time so full brochure context is preserved.
- Store extracted insight candidates with source references.
- Add retries/error status separate from OCR status.

### Phase 3 - Dashboard review workflow

- Add review cards grouped by tab category.
- Let admin approve/edit/reject each insight.
- Canonical field candidates continue using `listing_edit_suggestions`.
- Supplemental insights use `franchise_proposal_insights.status`.

### Phase 4 - Public listing rendering

- Add dynamic public detail sections/tabs:
  - Paket & Investasi
  - Proyeksi Usaha
  - Syarat Lokasi & Operasional
  - Dukungan Mitra
  - Produk/Layanan
  - Legal & Bukti
- Render a tab only when approved content exists.
- Use compact cards and avoid long OCR dumps.

### Phase 5 - Quality scoring

- Track coverage per listing:
  - has package data,
  - has projection,
  - has operational requirements,
  - has support system,
  - has legal/proof.
- Use coverage to prioritize which franchises need manual review first.

## Immediate recommendation

Implement `franchise_proposal_insights` + AI extraction review before changing public tabs. The current OCR output already proves the value, but rendering raw or deterministic-only extraction would be too noisy.

The first public tab worth shipping after review is `Paket & Investasi`, followed by a richer `Proyeksi` tab and an `Operasional` tab. These have the clearest buyer value and map well to both existing form fields and brochure content.
