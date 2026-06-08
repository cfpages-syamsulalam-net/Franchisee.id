# FORM FIELD PRESERVATION MANDATE

**Last Updated**: 2026-06-08 (Asia/Jakarta)

## ⚠️ CRITICAL RULE: DO NOT REMOVE FORM FIELDS

**All form inputs, selects, textareas, radio buttons, checkboxes, and hidden fields in `/daftar/index.html` MUST be preserved unless explicitly requested by the user.**

### What Happened
During recent refactoring, the following fields were **accidentally removed** from Franchisor Step 1:
- `haki_status` (Radio: Terdaftar, Masih Proses, Belum Daftar)
- `haki_number` (Text, conditional: Nomor Sertifikat / ID Merek)
- `nib_number` (Text, optional: 13 digit NIB)

These fields existed in the historical versions (`/pendaftaran/index.html` → `/daftar/index.html` old versions) and were part of the complete form specification.

### Why This Matters
1. **Data Integrity**: These fields map to the current backend payload and legacy Google Sheets columns. During migration, they must be mapped to D1 before any UI/schema change.
2. **User Expectations**: Franchisors expect to provide legal documentation (HAKI, NIB).
3. **Backend Validation**: Cloud functions expect these fields for verification workflows.
4. **Historical Continuity**: Forms should only grow, not shrink, unless explicitly requested.

## Historical Form Fields (From `/pendaftaran/index.html` → `/daftar/index.html`)

### Franchisor Step 1: Identitas & Legalitas
These fields MUST exist:
- ✅ `brand_name` (Text, Required)
- ✅ `company_name` (Text, Required)
- ✅ `category` (Select, Required)
- ✅ `year_established` (Number, Required)
- ✅ `haki_status` (Radio, Required) - **RESTORED 2026-04-05**
- ✅ `haki_number` (Text, Conditional) - **RESTORED 2026-04-05**
- ✅ `nib_number` (Text, Optional) - **RESTORED 2026-04-05**

### Franchisor Step 2: Konsep & Biaya
These fields MUST exist:
- ✅ `outlet_type` (Radio Cards, Required)
- ✅ `location_requirement` (Text, Required)
- ✅ `rent_cost` (Text, Conditional)
- ✅ `fee_license` (Number, Required)
- ✅ `fee_capex` (Number, Required)
- ✅ `fee_construction` (Number, Required)
- ✅ `total_investment_value` (Hidden, Auto-calculated)
- ✅ `net_profit_percent` (Number, Required)
- ✅ `royalty_percent` (Number, Required)
- ✅ `royalty_basis` (Select)

### Franchisor Step 3: Profil Marketing
These fields MUST exist:
- ✅ `short_desc` (Textarea, Required)
- ✅ `full_desc` (Textarea, Required)
- ✅ `support_system` (Checkboxes)

### Franchisor Step 4: Media & Visual
These fields MUST exist:
- ✅ `logo_url` (Hidden, Required, legacy URL field; target R2-compatible)
- ✅ `cover_url` (Hidden, Required, legacy URL field; target R2-compatible)
- ✅ `gallery_urls` (Hidden, Optional, legacy URL field; target R2-compatible)
- ✅ `video_url` (URL, Optional)
- ✅ `proposal_url` (Hidden, Optional, legacy URL field; target R2-compatible)

### Franchisor Step 5: Kontak Leads
These fields MUST exist:
- ✅ `pic_name` (Text, Required)
- ✅ `country_code` (Select, Required)
- ✅ `whatsapp` (Tel, Required)
- ✅ `email_contact` (Email, Required)
- ✅ `website_url` (URL, Optional)
- ✅ `instagram_url` (URL, Optional)

## Rules for AI Agents & Future Editors

### ✅ ALLOWED Operations
1. **Adding new fields**: Always safe, document in `FORM_SCHEMA.md`
2. **Changing field order**: Safe if doesn't break UX
3. **Updating labels/placeholders**: Safe if meaning preserved
4. **Adding validation**: Safe, must not remove fields
5. **Improving UX**: Safe (autocomplete, formatting, etc.)

### ❌ FORBIDDEN Operations (Without Explicit User Request)
1. **Removing form fields**: NEVER delete inputs, selects, textareas, radios, checkboxes, or hidden fields
2. **Removing field attributes**: NEVER remove `name`, `required`, `id`, or `class` without confirmation
3. **Simplifying forms by deletion**: NEVER remove fields to "simplify" the form
4. **Assuming fields are redundant**: NEVER remove fields because "similar data exists elsewhere"
5. **Hiding fields permanently**: NEVER change `type="hidden"` unless explicitly requested

## Checklist Before Editing Forms

Before making ANY changes to `/daftar/index.html` or form-related JS files:

- [ ] Read `FORM_SCHEMA.md` to understand all existing fields
- [ ] Read `FORM_UX_FIXES.md` for UX context
- [ ] Read `FORM_VALIDATION_FIXES.md` for validation rules
- [ ] Check `CHANGELOG.md` for recent form changes
- [ ] Verify NO fields are being removed (only additions allowed)
- [ ] If removing fields, get explicit user confirmation first
- [ ] Update `FORM_SCHEMA.md` after any field changes
- [ ] Update `TECHNICAL_INVENTORY.md` after any JS changes
- [ ] Log changes in `CHANGELOG.md` with timestamp

## Related JavaScript Files

These files interact with form fields and MUST be checked when editing forms:

| File | Purpose |
|------|---------|
| `js/form-utils.js` | Validation, auto-formatting, number formatting |
| `js/form-01-state-helpers.js` | Draft persistence, claim state, state management |
| `js/form-02-claim-workflow.js` | Claim search, brand pre-fill |
| `js/form-03-navigation-steps.js` | Step navigation, validation on step change |
| `js/form-04-calculation-city.js` | BEP calculation, city autocomplete |
| `js/form-05-country-whatsapp.js` | Country code dropdown, WhatsApp formatting |
| `js/form-06-submit-validation.js` | Form submission, validation, auto-save |
| `js/form-07-init.js` | DOM ready bootstrap, HAKI toggle, initialization |
| `js/form-08-franchisee-steps.js` | Franchisee 2-step navigation |
| `js/form-09-test-data-generator.js` | Dev mode test data generation |

## Recovery Reference

If fields are accidentally removed, restore from:
- `/daftar/old_version.txt` (complete historical version)
- `/daftar/old_content.txt` (alternative historical reference)
- `/daftar/old_content_structure.txt` (structure-only reference)
- `/daftar/current_version.txt` (snapshot before recent changes)

## Enforcement

This file serves as a **binding constraint** for all AI agents working on this repository. Violating these rules will result in:
1. Data loss in current submissions and future D1 migrations
2. Broken form validation workflows
3. User trust degradation
4. Additional recovery work

**When in doubt: ASK the user before removing ANY form field.**

---

*Last reviewed: 2026-04-05 02:45 (Asia/Jakarta)*
*Related files: `FORM_SCHEMA.md`, `CHANGELOG.md`, `TECHNICAL_INVENTORY.md`, `AGENTS.md`*
