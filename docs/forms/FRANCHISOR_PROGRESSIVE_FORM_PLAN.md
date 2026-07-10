# Franchisor Progressive Form Plan

Last updated: 2026-07-11 00:00 (Asia/Jakarta)

## Goal

Keep franchisor onboarding friction low while increasing structured listing data quality.

The form should stay multi-step and non-intimidating, but become progressive: ask a simple baseline question first, then reveal deeper optional questions only when the franchisor answers the related baseline field or uploads a brochure/proposal that can prefill candidates.

## Current form state checked

Source checked: `/daftar/index.html`, `FORM_SCHEMA.md`, `FORM_PRESERVATION_MANDATE.md`, `functions/_shared-schemas.js`, `functions/_form-submit-franchisor.js`, and `functions/_form-submit-utils.js`.

### Active `/daftar` franchisor form now

The active public franchisor form is 5 steps:

| Step | Label | Currently visible key fields |
| --- | --- | --- |
| 1 | Identitas | `brand_name`, `company_name`, `category`, `year_established`, `brand_country`, `target_market`, `haki_status`, `haki_number`, `nib_number` |
| 2 | Biaya | `min_capital`, `royalty_percent` |
| 3 | Profil | `full_desc` |
| 4 | Media | `logo_url` |
| 5 | Kontak | `pic_name`, `email_contact`, `country_code`, `whatsapp`, `website_url`, `instagram_url`, `facebook_url`, `tiktok_url`, `youtube_url`, `linkedin_url` |

### Important mismatch

`FORM_SCHEMA.md` and `FORM_PRESERVATION_MANDATE.md` describe a fuller franchisor form than the current active markup.

Fields documented as required/preserved but not currently visible in active `/daftar/index.html` include:

- `outlet_type`
- `location_requirement`
- `rent_cost`
- `fee_license`
- `fee_capex`
- `fee_construction`
- `total_investment_value`
- `net_profit_percent`
- `royalty_basis`
- `short_desc`
- `support_system`
- `cover_url`
- `gallery_urls`
- `video_url`
- `proposal_url`

Backend submission still accepts passthrough payloads and already maps many of these names through `franchiseBindValues()` into D1 `franchises`, so adding the UI back should be additive rather than a backend contract break.

### Current backend-supported listing fields

The current D1/form submit path already supports these important listing fields:

- `year_established`
- `brand_country`
- `target_market`
- `outlet_type`
- `location_requirement`
- `rent_cost`
- `fee_license`
- `fee_capex`
- `fee_construction`
- `total_investment_value`
- `estimated_bep_months`
- `net_profit_percent`
- `royalty_percent`
- `royalty_basis`
- `short_desc`
- `full_desc`
- `support_system`
- media/contact fields

This means the first UX improvement should not start by inventing a huge new schema. First restore and reorganize existing supported fields into a less intimidating progressive experience.

## Recommended form model

Keep 5 top-level steps, but each step should have:

1. Required baseline questions.
2. Optional progressive follow-up groups.
3. A clear “Lengkapi nanti” path for optional groups.
4. Brochure/OCR prefill support where possible.

Recommended step labels:

1. `Identitas`
2. `Model & Modal`
3. `Proyeksi`
4. `Profil & Dukungan`
5. `Media & Kontak`

This is better than adding a sixth step because the current form already has 5 steps and adding too many top-level steps can feel heavier.

## Progressive question map

### Step 1 - Identitas

Baseline:

- Brand name.
- Company name.
- Category.
- Year established.
- Legal status fields.

Progressive:

- Brand country / target market stays collapsed unless user selects a non-Indonesia phone country or opens “Brand dari luar Indonesia?”.
- Legal numbers stay conditional:
  - `haki_number` only after `haki_status` is registered/process.
  - `nib_number` optional/recommended.

No new canonical fields needed here yet.

### Step 2 - Model & Modal

Baseline visible first:

- Minimum investment / headline modal.
- Main outlet type.
- Royalty fee.

Progressive follow-up group A: outlet and location.

Show when `outlet_type` is selected:

- `location_requirement`
- `min_area_sqm` new canonical
- `min_staff_count` new canonical
- `rent_cost`

Follow-up copy: “Opsional, tapi membantu calon mitra menilai apakah lokasi mereka cocok.”

Progressive follow-up group B: investment breakdown.

Show when `min_capital`, `total_investment_value`, or any fee field is filled:

- `fee_license`
- `fee_capex`
- `fee_construction`
- `working_capital_idr` new canonical
- `additional_cost_notes` new canonical

Keep `total_investment_value` as calculated/hidden/display field. If the user only fills `min_capital`, keep it as the simple path.

Progressive follow-up group C: setup timing.

Show when location or investment breakdown is engaged:

- `setup_duration_days` new canonical

### Step 3 - Proyeksi

Baseline visible first:

- Ask one simple yes/no or toggle: “Punya estimasi omzet/BEP yang boleh ditampilkan?”

If yes, show:

- `estimated_bep_months` existing canonical.
- `estimated_bep_min_months` new canonical.
- `estimated_bep_max_months` new canonical.
- `omzet_monthly_idr` existing canonical.
- `omzet_monthly_min_idr` new canonical.
- `omzet_monthly_max_idr` new canonical.
- `net_profit_percent` existing canonical.
- `net_profit_monthly_min_idr` new canonical.
- `net_profit_monthly_max_idr` new canonical.
- optional projection notes / basis text later.

If no or skipped, do not show the follow-up group.

Important UX rule: do not require projection numbers. Better to have no projection than fake projection.

### Step 4 - Profil & Dukungan

Baseline:

- `short_desc`
- `full_desc`

Progressive:

- Show `support_system` after `full_desc` has meaningful content or after user clicks “Tambah dukungan untuk mitra”.
- Use checkbox chips for common support items, with optional “Lainnya” textarea.

This restores existing supported fields without overwhelming the user at the start.

### Step 5 - Media & Kontak

Baseline:

- Contact person.
- WhatsApp.
- Email.
- Logo or logo URL depending current upload path.

Progressive:

- Cover/gallery/video fields appear after logo is provided or user opens “Tambah media lain”.
- Proposal/brochure upload or URL is prominent because it can reduce manual questions:
  - “Upload brosur, nanti sistem bantu ekstrak data paket, proyeksi, dan syarat lokasi.”
- Social links stay optional and can be collapsed under “Tambah website & sosial media”.

## Canonical fields to add first

These fields are optional. They should not all be required in the form.

### Migration priority 1

Add to `franchises`:

- `min_area_sqm INTEGER`
- `min_staff_count INTEGER`
- `setup_duration_days INTEGER`
- `working_capital_idr INTEGER`
- `additional_cost_notes TEXT`
- `estimated_bep_min_months INTEGER`
- `estimated_bep_max_months INTEGER`
- `omzet_monthly_min_idr INTEGER`
- `omzet_monthly_max_idr INTEGER`
- `net_profit_monthly_min_idr INTEGER`
- `net_profit_monthly_max_idr INTEGER`

Why these first:

- They are common enough in brochures.
- They improve public comparison and buyer confidence.
- They are simple typed values.
- They can be extracted from OCR/AI and reviewed.
- They fit optional progressive questions.

### Defer for now

Do not add these as canonical yet:

- multiple package rows,
- include/exclude lists,
- product/program lists,
- testimonials,
- legal claims beyond existing HAKI/NIB/profile data,
- detailed financial scenario rows.

Store those as supplemental proposal insights later.

## Implementation plan

### Phase 1 - Schema and backend

- Add a D1 migration for the priority canonical fields above.
- Add fields to shared editable listing definitions.
- Add fields to profile/listing update schemas if owners/admins should edit them later.
- Extend `franchiseBindValues()` and franchisor submit insert/update SQL.
- Extend D1 static build snapshot query and static row schemas.
- Extend OCR/AI candidate mapping only after the fields exist.

### Phase 2 - Progressive form UI

- Restore the currently missing documented fields in `/daftar/index.html`.
- Add new optional fields under progressive groups.
- Add a small progressive-form JS module, for example `js/form-10-progressive-franchisor.js`, so this logic does not bloat current navigation/calculation modules.
- Use `data-progressive-parent`, `data-progressive-value`, or simple data attributes instead of hardcoded DOM assumptions.
- Do not remove any existing field names.
- Hidden progressive fields must not be `required`.

### Phase 3 - Autosave and validation

- Ensure autosave captures fields whether visible or currently collapsed.
- Validation should require only baseline fields.
- Optional follow-up groups validate only if the user starts filling them.
- Keep step validation short and actionable.

### Phase 4 - Public listing display

- Add the new canonical fields to public static snapshot.
- Show them only when values exist:
  - minimum area/staff/setup time in Operasional.
  - BEP/omzet/profit ranges in Proyeksi.
  - working capital/additional cost notes in Investasi.
- Keep unknown values as “Tanya Admin” only where currently useful; do not create empty cards.

### Phase 5 - OCR/AI assist

- When brochure OCR exists, AI can suggest values for the new canonical fields.
- Suggestions go through existing review flow, not direct public overwrite.
- In future owner profile, show “Kami menemukan data ini dari brosur” with accept/edit/reject.

## UX copy rules

- Avoid making optional enrichment feel mandatory.
- Prefer “Bantu calon mitra menilai lebih cepat” over “Data belum lengkap”.
- Prefer compact chips/cards over long textarea-only forms.
- Every optional section should explain why it helps:
  - “Area minimum membantu calon mitra tahu apakah lokasi mereka cocok.”
  - “Estimasi BEP membantu calon mitra membandingkan peluang, tapi boleh dilewati kalau belum ada angka resmi.”
  - “Brosur dapat membantu sistem mengisi detail secara otomatis.”

## Open implementation risk

The current active `/daftar/index.html` is missing fields that preservation docs say must exist. Before adding the new canonical fields, restore the missing existing fields into the progressive structure so existing backend-supported data does not stay unreachable from the form UI.
