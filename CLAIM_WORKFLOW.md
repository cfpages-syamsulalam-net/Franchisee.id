# Claim Workflow Reference

Last updated: 2026-04-04 (Asia/Jakarta)

## Goal
When a user claims a brand, the final successful submission must:
1. Append completed record to `FRANCHISOR`.
2. Remove original source row from `UNCLAIMED` (best effort, non-critical cleanup).

## Actual Runtime Flow

### 1. User Interaction (`/daftar/index.html` + `js/form-franchise.js`)
- `Klaim` tab only selects the brand source.
- On brand selection:
  - `fillMainFranchisorForm(brand)` switches to Franchisor tab.
  - Pre-fills identity fields (`brand_name`, `category`, starter `min_capital` mapping).
  - Sets hidden `unclaimed_id`.
  - Marks claim mode active (claim alert visible, brand name read-only).

### 2. Step Buttons (`Lanjut` / `Kembali`)
- `Lanjut` and `Kembali` only change step index in frontend.
- They do **not** send data to Google Sheets.
- Data is sent only on final form `submit` in Step 5.

### 3. Persisted Client State
- Claim state:
  - key: `franchise_claim_state`
  - contains: selected brand payload + expiry metadata
  - TTL: 24 hours
- Franchisor draft state:
  - key: `franchisor_form_draft`
  - contains: partial field values for refresh/session continuity
  - TTL: 72 hours
  - excludes `unclaimed_id` (claim linkage is controlled only by claim state)

### 4. Backend Submit (`functions/form-submit.js`)
- On final submit:
  - If `unclaimed_id` exists, frontend sets `form_type = 'claim'`.
  - Backend maps claim submission to `FRANCHISOR`.
  - Record is appended to `FRANCHISOR` with default `status = FREE`, `is_verified = FALSE`.
  - Post-claim cleanup runs:
    - try delete row from `UNCLAIMED` by `id` (column A),
    - fallback delete by normalized `brand_name` (column B) if `id` is missing/not matched.
- Cleanup failure is non-blocking (main submission remains successful).

## Expected Outcomes

### Expected: Claim + Complete Submit
- User completes required fields and clicks final submit.
- Data appended to `FRANCHISOR`.
- Matching source row in `UNCLAIMED` is removed (best effort).

### Not Expected: Step Navigation
- Pressing `Lanjut` does not write anything to Google Sheets.
- It only advances local UI step and saves local draft/session state.

## UX Policy for Mixed Scenarios

### Scenario A: User partially filled Franchisor, then claims a brand
- Keep existing draft values for non-identity fields.
- Override identity fields with claimed brand context (`brand_name`, `category`, `unclaimed_id`).
- Keep brand name read-only during claim mode.

### Scenario B: User refreshes while claim mode active
- Restore claim mode and selected brand context automatically (within TTL).
- Restore previously entered non-identity draft values.

### Scenario C: User exits claim mode
- Clear claim-mode state (`franchise_claim_state`) and claim linkage.
- Keep normal draft values so user can continue as non-claim Franchisor.

## Relevant Files
- Frontend flow: `js/form-franchise.js`
- Form page: `daftar/index.html`
- Backend submit + cleanup: `functions/form-submit.js`
- Field inventory: `FORM_SCHEMA.md`
- Function inventory: `TECHNICAL_INVENTORY.md`
