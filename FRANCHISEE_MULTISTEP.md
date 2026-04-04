# Franchisee Multi-Step Form Implementation

Last updated: 2026-04-04 19:45 (Asia/Jakarta)

## Overview
The Franchisee form has been converted from a single-page layout to a **2-step multi-step form** to improve user experience, reduce cognitive load, and match the UX pattern established in the Franchisor form.

## Step Structure

### Step 1: Data Pribadi (Personal Information)
**Purpose**: Collect essential contact information

**Fields**:
- Nama Lengkap (`name`) - Required
- Kota Domisili (`city_origin`) - Required, with autocomplete
- WhatsApp (`whatsapp`) - Required, with country code selector
- Email (`email`) - Required

**Navigation**:
- **Next Button**: "LANJUT" (triggers validation before proceeding)

### Step 2: Minat & Budget (Interest & Budget)
**Purpose**: Understand user's business interests and financial capacity

**Fields**:
- Minat Kategori (`interest_category`) - Required, dropdown selection
- Budget Investasi (`budget_range`) - Required, budget range selection
- Rencana Lokasi (`location_plan`) - Required, location status
- Pesan Tambahan (`message`) - Optional, free-text message

**Navigation**:
- **Back Button**: "KEMBALI" (returns to Step 1 without validation)
- **Submit Button**: "DAFTAR SEKARANG" (submits entire form)

## Technical Implementation

### New Module: `js/form-08-franchisee-steps.js`

This file contains all Franchisee-specific step navigation logic, completely **separate** from the Franchisor form's step system.

#### Core Functions

**`window.franchiseeNextStep(stepIndex)`**
- Validates current step before proceeding
- Hides current step, shows next step
- Updates progress bar and step indicators
- Saves current step to `localStorage`
- Scrolls to top of form

**`window.franchiseePrevStep(stepIndex)`**
- Navigates to previous step (no validation)
- Updates UI and progress bar
- Saves current step to `localStorage`
- Scrolls to top of form

**`validateFranchiseeStep(stepIndex)`** (private)
- Queries all required fields in current step
- Runs native HTML validation (`checkValidity()`)
- Adds/removes `is-invalid` class
- Shows native validation messages

**`updateFranchiseeProgressBar()`** (private)
- Calculates percentage: `(currentStep / totalSteps) * 100`
- Updates `#franchisee_progress_bar` width
- Updates step indicator classes (`active`, `completed`)

**`restoreFranchiseeStep()`** (private)
- Reads `franchisee_form_step` from localStorage
- Hides Step 1, shows saved step
- Restores UI state on page load

### State Management

```javascript
const franchiseeState = {
    currentStep: 1,      // Current active step
    totalSteps: 2        // Total number of steps
};
```

**localStorage Keys**:
- `franchisee_form_step`: Stores current step number (1 or 2)

### HTML Structure

```html
<!-- Step Indicator -->
<div class="step-indicator-wrapper mb-4">
    <ul class="step-indicator">
        <li class="step-item active" data-step="1">
            <div class="step-circle">1</div>
            <div class="step-text">Data Pribadi</div>
        </li>
        <li class="step-item" data-step="2">
            <div class="step-circle">2</div>
            <div class="step-text">Minat & Budget</div>
        </li>
    </ul>
    <div class="progress mt-2" style="height: 4px;">
        <div id="franchisee_progress_bar" class="progress-bar bg-warning" 
             role="progressbar" style="width: 50%;"></div>
    </div>
</div>

<!-- Form -->
<form id="franchiseeForm" class="async-form">
    <!-- Step 1 -->
    <div id="franchisee-step-1" class="form-step active">
        <!-- Fields here -->
        <button type="button" onclick="franchiseeNextStep(2)">LANJUT</button>
    </div>

    <!-- Step 2 -->
    <div id="franchisee-step-2" class="form-step" style="display:none;">
        <!-- Fields here -->
        <button type="button" onclick="franchiseePrevStep(2)">KEMBALI</button>
        <button type="submit">DAFTAR SEKARANG</button>
    </div>
</form>
```

### CSS Classes Used

- `.step-indicator-wrapper`: Container for step indicators
- `.step-indicator`: Flex container for step items
- `.step-item`: Individual step circle + label
- `.step-circle`: Numbered circle (active/completed states)
- `.step-text`: Step label text
- `.form-step`: Step content container (active = visible)
- `.progress`: Progress bar container
- `#franchisee_progress_bar`: Dynamic progress indicator

## Form Submission

### Unchanged Submission Logic

The form submission logic remains **exactly the same** as before:

1. Form ID: `franchiseeForm` (unchanged)
2. Submit listener in `js/form-06-submit-validation.js` (unchanged)
3. Submission type: `FRANCHISEE` (unchanged)
4. All field names unchanged
5. Posts to `/form-submit` Cloudflare Function (unchanged)

### Why Submission Still Works

- All form field `name` attributes remain identical
- Form ID `franchiseeForm` is unchanged
- Submit event listener is attached to the form element regardless of step structure
- Step divs are purely visual/presentation layer, don't affect form data collection
- `FormData(form)` collects from all steps (hidden fields still submitted)

## User Experience Flow

### Scenario A: Normal Completion
1. User fills Step 1 (Data Pribadi)
2. Clicks "LANJUT" → validation runs
3. If valid → Step 2 appears
4. User fills Step 2 (Minat & Budget)
5. Clicks "DAFTAR SEKARANG" → submits entire form
6. Success → page reloads, form resets

### Scenario B: Validation Failure
1. User fills Step 1 partially
2. Clicks "LANJUT" → validation fails
3. Browser shows native validation messages
4. User completes missing fields
5. Clicks "LANJUT" again → validation passes
6. Proceeds to Step 2

### Scenario C: Go Back and Edit
1. User completes Step 1, moves to Step 2
2. Fills some Step 2 fields
3. Clicks "KEMBALI" → returns to Step 1
4. Edits Step 1 fields
5. Clicks "LANJUT" → proceeds to Step 2 again
6. All Step 2 data is preserved (form not submitted yet)

### Scenario D: Page Refresh Mid-Form
1. User fills Step 1, moves to Step 2
2. Refreshes browser
3. `restoreFranchiseeStep()` runs on page load
4. Form returns to Step 2 (last active step)
5. **Note**: Field values not restored (no auto-save for Franchisee yet)

## Differences from Franchisor Form

| Aspect | Franchisee Form | Franchisor Form |
|--------|----------------|-----------------|
| **Steps** | 2 steps | 5 steps |
| **Auto-Save** | No (only step persistence) | Yes (aggressive multi-trigger) |
| **State Variable** | `franchiseeState` (local) | `FF.state` (global) |
| **Navigation Functions** | `franchiseeNextStep`, `franchiseePrevStep` | `nextStep`, `prevStep` |
| **Progress Bar ID** | `franchisee_progress_bar` | `main_progress_bar` |
| **Step IDs** | `franchisee-step-1`, `franchisee-step-2` | `step-1` through `step-5` |
| **Validation** | Native HTML only | Custom validation + Rp 0 warning |
| **localStorage Step Key** | `franchisee_form_step` | `franchise_form_step` |

## Design Decisions

### Why Separate Module?
- **Isolation**: Franchisee logic doesn't interfere with Franchisor
- **Maintainability**: Clear separation of concerns
- **Scalability**: Easy to modify one without affecting the other
- **Naming Convention**: Follows `form-0x-*.js` pattern

### Why No Auto-Save?
- Franchisee form is simpler (2 steps vs 5 steps)
- Less data entry overall
- Can be added later if needed
- Out of scope for this change

### Why Native Validation?
- Franchisee fields are straightforward
- No complex custom validation rules needed
- Reduces code complexity
- Browser handles UX consistently

### Why Optional Message Field?
- Provides flexibility for users to express specific needs
- Not required to avoid friction
- Useful for lead qualification
- Added in Step 2 (logical placement)

## Testing Checklist

- [ ] Fill Step 1, click LANJUT → Step 2 appears
- [ ] Leave required field empty → validation blocks progress
- [ ] Fill Step 1, go to Step 2, click KEMBALI → Step 1 reappears
- [ ] Complete all steps, submit → form sends all data correctly
- [ ] Refresh on Step 2 → returns to Step 2
- [ ] Submit success → form resets, page reloads
- [ ] Tab switching → step state preserved
- [ ] No console errors in DevTools
- [ ] Progress bar updates correctly (50% → 100%)
- [ ] Step indicators show correct states (active/completed)

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (all recent versions)
- **Mobile**: iOS Safari, Android Chrome
- **Fallback**: If JavaScript disabled, form degrades to single-page submission (all fields visible)

## Future Enhancements

1. **Auto-Save for Franchisee**: Add same aggressive auto-save as Franchisor
2. **Conditional Fields**: Show/hide fields based on previous selections
3. **Inline Validation**: Real-time field validation with custom messages
4. **Analytics**: Track step completion rates and drop-off points
5. **Keyboard Navigation**: Arrow keys to navigate between steps
6. **Step Animations**: Smooth transitions between steps

## Files Modified

### JavaScript (New)
- `js/form-08-franchisee-steps.js` - Franchisee step navigation logic

### HTML (Modified)
- `daftar/index.html` - Converted Franchisee form to 2-step layout

### Documentation (Updated)
- `TECHNICAL_INVENTORY.md` - Added form-08 function inventory
- `FORM_SCHEMA.md` - Updated with step column and multi-step docs
- `QWEN.md` - Added Franchisee form 2-step description
- `CHANGELOG.md` - Logged all changes

## Related Documentation

- `AUTO_SAVE.md` - Franchisor auto-save implementation
- `CLAIM_WORKFLOW.md` - Claim process reference
- `FORM_SCHEMA.md` - Complete form field inventory
- `TECHNICAL_INVENTORY.md` - Function/variable inventory

---

*Implementation completed: 2026-04-04 19:45 (Asia/Jakarta)*
