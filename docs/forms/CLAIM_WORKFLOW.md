# Claim Workflow Reference

Last updated: 2026-06-08 (Asia/Jakarta)

## Migration Direction
This document describes the current claim behavior that must be preserved while migrating from the Google Sheets transition layer to Cloudflare D1/R2/Clerk. Target behavior: a claim should create a durable `franchise_claims` record, associate it with a Clerk user, transition or link the unclaimed brand in D1, and preserve the same frontend step/navigation semantics until the UI is rebuilt.

## Goal
When a user claims a brand, the final successful submission must:
1. Current transition layer: append completed record to `FRANCHISOR`.
2. Current transition layer: remove original source row from `UNCLAIMED` (best effort, non-critical cleanup).
3. Target D1 layer: create/update `franchises`, `franchisors`, and `franchise_claims` transactionally instead of mutating spreadsheet rows.

## Actual Runtime Flow

### 1. User Interaction (`/daftar/index.html` + modular form runtime)
- `Klaim` tab only selects the brand source.
- On brand selection:
  - `fillMainFranchisorForm(brand)` switches to Franchisor tab.
  - Pre-fills identity fields (`brand_name`, `category`, starter `min_capital` mapping).
  - Sets hidden `unclaimed_id`.
  - Marks claim mode active (claim alert visible, brand name read-only).

### 2. Step Buttons (`Lanjut` / `Kembali`)
- `Lanjut` and `Kembali` only change step index in frontend.
- They do **not** send data to the backend.
- Data is sent only on final form `submit` in Step 5.

### 3. Persisted Client State

### Claim State
- key: `franchise_claim_state`
- contains: selected brand payload + expiry metadata
- TTL: 24 hours

### Franchisor Draft State (Aggressive Auto-Save)
- key: `franchisor_form_draft`
- contains: partial field values for refresh/session continuity
- TTL: 72 hours
- excludes `unclaimed_id` (claim linkage is controlled only by claim state)

### Auto-Save Triggers (Multi-Layer Protection)
The form implements **aggressive auto-save** with 6 independent save triggers to ensure zero data loss:

1. **Input/Change Events (Debounced)**: Saves 300ms after user stops typing
2. **Periodic Safety Net**: Saves every 5 seconds regardless of user activity
3. **Step Navigation**: Saves before moving to next/previous step
4. **Visibility Change**: Saves when user switches browser tabs or minimizes window
5. **Before Unload**: Saves before page refresh or close
6. **Tab Switch**: Saves when switching between registration tabs

All auto-save operations include:
- Error handling (try/catch with console warnings)
- Visual feedback via `#autosave-indicator` (bottom-right toast notification)
- Non-blocking UX (never interrupts user interaction)

### Auto-Save Lifecycle
- **Starts**: When franchisor form is initialized
- **Stops**: On successful form submission (clears all timers and localStorage)
- **Restores**: Automatically on page load (within TTL window)

### 4. Backend Submit (`functions/form-submit.js`)
- On final submit:
  - If `unclaimed_id` exists, frontend sets `form_type = 'claim'`.
  - Backend maps claim submission to `FRANCHISOR`.
  - Record is appended to `FRANCHISOR` with default `status = FREE`, `is_verified = FALSE`.
  - Post-claim cleanup runs:
    - try delete row from `UNCLAIMED` by `id` (column A),
    - fallback delete by normalized `brand_name` (column B) if `id` is missing/not matched.
- Cleanup failure is non-blocking (main submission remains successful).
- Migration target: replace this append/delete behavior with a D1 transaction and Clerk user ownership while preserving duplicate checks and non-destructive claim review/audit history.

## Expected Outcomes

### Expected: Claim + Complete Submit
- User completes required fields and clicks final submit.
- Current: data appended to `FRANCHISOR`, matching source row in `UNCLAIMED` is removed (best effort).
- Target: D1 listing/claim records are created or transitioned with auditable ownership and review state.

### Not Expected: Step Navigation
- Pressing `Lanjut` does not write anything to the backend.
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
- Frontend flow: `js/form-01-state-helpers.js`, `js/form-02-claim-workflow.js`, `js/form-03-navigation-steps.js`, `js/form-06-submit-validation.js`, `js/form-07-init.js`
- Form page: `daftar/index.html`
- Current backend submit + cleanup: `functions/form-submit.js`
- Migration tracker: `AUDIT.md`
- Field inventory: `FORM_SCHEMA.md`
- Function inventory: `TECHNICAL_INVENTORY.md`
