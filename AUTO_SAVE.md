# Aggressive Auto-Save Implementation

Last updated: 2026-04-04 19:15 (Asia/Jakarta)

## Overview
The Franchisor form now features **aggressive multi-layer auto-save** to ensure zero data loss when users refresh, close the browser, or switch tabs. This feature automatically saves form progress in `localStorage` with a 72-hour TTL and restores it on page load.

## Auto-Save Triggers (6 Independent Layers)

### 1. **Debounced Input/Change Save** (300ms delay)
- **When**: User stops typing for 300 milliseconds
- **Why**: Prevents excessive saves during fast typing
- **Events**: `input`, `change` on all form fields
- **Config**: `FF.autoSaveConfig.debounceMs = 300`

### 2. **Periodic Safety-Net Save** (Every 5 seconds)
- **When**: Every 5 seconds regardless of user activity
- **Why**: Catches edge cases where events might not fire
- **Config**: `FF.autoSaveConfig.periodicIntervalMs = 5000`
- **Timer**: `setInterval` cleared on form submit

### 3. **Step Navigation Save**
- **When**: Before clicking "Lanjut" (Next) or "Kembali" (Back)
- **Why**: Ensures data is saved before UI transitions
- **Implementation**: Wraps `window.nextStep` and `window.prevStep`

### 4. **Visibility Change Save**
- **When**: User switches browser tabs or minimizes window
- **Why**: Captures data before user leaves the page
- **Event**: `document.visibilitychange` (when `visibilityState === 'hidden'`)

### 5. **Before Unload Save**
- **When**: Before page refresh or browser close
- **Why**: Last-chance save before potential data loss
- **Event**: `window.beforeunload`

### 6. **Tab Switch Save**
- **When**: User switches between Franchisee/Franchisor/Klaim tabs
- **Why**: Preserves data when navigating away from Franchisor form
- **Implementation**: Wraps `window.openTab`

## Technical Implementation

### Core Functions

#### `FF.autoSaveConfig`
Configuration object managing auto-save behavior:
```javascript
{
    enabled: true,              // Master switch
    debounceMs: 300,            // Debounce delay
    periodicIntervalMs: 5000,   // Periodic save interval
    debounceTimer: null,        // Debounce timer reference
    periodicTimer: null         // Periodic timer reference
}
```

#### `FF.debounceAutoSave(form)`
Debounced save function that waits for user to stop typing:
- Clears existing debounce timer
- Sets new 300ms timer
- Calls `FF.saveFranchisorDraft(form)` after delay

#### `FF.startPeriodicAutoSave(form)`
Starts the 5-second safety-net interval:
- Clears existing periodic timer (if any)
- Sets new `setInterval` for 5000ms
- Calls `FF.saveFranchisorDraft(form)` periodically

#### `FF.stopPeriodicAutoSave()`
Cleanup function called on form submission:
- Clears periodic timer
- Clears debounce timer
- Prevents further auto-saves

### Enhanced Save Function

#### `FF.saveFranchisorDraft(form)` (Enhanced)
Now includes:
1. **Try/catch error handling**
2. **Visual feedback** via `#autosave-indicator`
3. **Console warnings** on failure

```javascript
FF.saveFranchisorDraft = function (form) {
    if (!form) return;
    try {
        const payload = { fields: {}, saved_at: Date.now() };
        const fd = new FormData(form);
        
        // Collect all form fields (except unclaimed_id)
        for (const [key, value] of fd.entries()) {
            if (key === 'unclaimed_id') continue;
            // ... field collection logic
        }
        
        localStorage.setItem(FF.constants.FRANCHISOR_DRAFT_KEY, JSON.stringify(payload));
        
        // Visual feedback
        const indicator = document.getElementById('autosave-indicator');
        if (indicator) {
            indicator.classList.add('saving');
            setTimeout(() => indicator.classList.remove('saving'), 800);
        }
    } catch (err) {
        console.warn('[AutoSave] Failed to save draft:', err);
    }
};
```

## Visual Feedback

### Auto-Save Indicator (`#autosave-indicator`)
- **Position**: Fixed, bottom-right corner (20px from edges)
- **Appearance**: Yellow badge with checkmark icon
- **Animation**: Fades in/out with smooth transition
- **Behavior**: Shows briefly on each save (800ms)
- **Z-index**: 9999 (above all other elements)

### CSS Implementation
```css
#autosave-indicator {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 8px 16px;
    background: #f8b526;
    color: #fff;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(248, 181, 38, 0.3);
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s ease;
    pointer-events: none;
    z-index: 9999;
}

#autosave-indicator.saving {
    opacity: 1;
    transform: translateY(0);
}

#autosave-indicator::before {
    content: '✓';
    margin-right: 6px;
    font-weight: bold;
}
```

## Data Persistence

### Storage Key
- `franchisor_form_draft` (localStorage)

### Data Structure
```javascript
{
    fields: {
        brand_name: "Kopi Kenangan",
        company_name: "PT. Kopi Maju Jaya",
        category: "F&B (Makanan & Minuman)",
        // ... all other form fields
    },
    saved_at: 1712242500000  // Timestamp in milliseconds
}
```

### TTL (Time-To-Live)
- **Duration**: 72 hours (3 days)
- **Constant**: `FF.constants.FRANCHISOR_DRAFT_TTL_MS = 72 * 60 * 60 * 1000`
- **Expiration**: Automatic cleanup on access or page load

### Excluded Fields
- `unclaimed_id`: Claim linkage is controlled by claim state, not draft

## Auto-Save Lifecycle

### Start
- Triggered when `FF.initFormSubmission()` runs on `DOMContentLoaded`
- Only applies to Franchisor form (`#franchiseListingForm`)
- Franchisee form does NOT have auto-save (intentional)

### Active
- All 6 triggers operate independently
- Debounce timer: Short-lived (300ms per input)
- Periodic timer: Long-running (every 5s)

### Stop
- Triggered on successful form submission
- Clears all timers via `FF.stopPeriodicAutoSave()`
- Clears localStorage via `FF.clearFranchisorDraft()`
- Also clears claim state if applicable

### Restore
- Automatic on page load via `FF.restoreFranchisorDraft(lForm)`
- Restores all field values from localStorage
- Respects TTL (ignores drafts older than 72 hours)

## User Experience Scenarios

### Scenario A: User Refreshes Mid-Form
1. User fills out Steps 1-3, then accidentally refreshes
2. Page reloads, `FF.restoreFranchisorDraft()` runs
3. All previously entered fields are restored
4. User continues from where they left off
5. **Result**: Zero data loss, no frustration

### Scenario B: User Switches Browser Tabs
1. User is filling Step 2, switches to another tab
2. `visibilitychange` event fires with `hidden` state
3. Auto-save captures all current field values
4. User returns minutes/hours later
5. **Result**: Data is safe, even if browser crashed

### Scenario C: User Closes Browser Accidentally
1. User fills out Steps 1-4, closes browser
2. `beforeunload` event fires, triggers save
3. Data is persisted to localStorage
4. User reopens page within 72 hours
5. **Result**: All progress restored automatically

### Scenario D: Claim Mode + Auto-Save
1. User claims a brand from "Klaim" tab
2. `fillMainFranchisorForm()` pre-fills brand data
3. User fills remaining fields
4. Auto-save captures both pre-filled and new data
5. On submit, both claim state and draft are cleared
6. **Result**: Seamless claim workflow with full data protection

## Performance Considerations

### Debounce Optimization
- 300ms delay prevents excessive writes during typing
- Only one save operation per input pause
- Timer cleared and reset on each keystroke

### Periodic Save Efficiency
- 5-second interval is infrequent enough to avoid performance impact
- Acts as safety net for edge cases missed by event-based saves
- Timer is cleared on form submit to prevent memory leaks

### localStorage Limits
- Typical browser limit: 5-10MB per domain
- Form draft size: ~2-5KB (well within limits)
- Automatic TTL cleanup prevents accumulation

## Error Handling

### Try/Catch Protection
All save operations wrapped in try/catch:
```javascript
try {
    // Save logic
} catch (err) {
    console.warn('[AutoSave] Failed to save draft:', err);
}
```

### Graceful Degradation
- Auto-save failures are non-blocking
- User can still complete and submit form normally
- Errors logged to console for debugging only

### No User Interruption
- Errors don't show alerts or block UX
- Visual indicator only shows on success
- Form submission works regardless of auto-save state

## Testing Checklist

- [ ] Fill out Steps 1-2, refresh page, verify data restoration
- [ ] Fill form, switch browser tab, verify save indicator appears
- [ ] Fill form, close browser, reopen within 72 hours, verify restore
- [ ] Fill form rapidly, verify debounce prevents excessive saves
- [ ] Submit form successfully, verify draft is cleared
- [ ] Switch between tabs (Franchisee/Franchisor/Klaim), verify saves
- [ ] Use claim workflow, verify pre-filled data is saved
- [ ] Wait 5 seconds without input, verify periodic save
- [ ] Check console for any auto-save errors (should be none)
- [ ] Verify visual indicator appears bottom-right on saves

## Files Modified

### JavaScript
- `js/form-01-state-helpers.js` - Enhanced save function
- `js/form-06-submit-validation.js` - Added auto-save triggers

### HTML
- `daftar/index.html` - Added indicator element

### CSS
- `css/form-franchise/01-utilities.css` - Added indicator styles

### Documentation
- `TECHNICAL_INVENTORY.md` - Updated function inventory
- `CLAIM_WORKFLOW.md` - Added auto-save documentation
- `KNOWLEDGE.md` - Added feature description
- `QWEN.md` - Added protection note
- `FORM_SCHEMA.md` - Added behavior notes
- `CHANGELOG.md` - Logged all changes

## Future Enhancements (Optional)

1. **Cloud Sync**: Sync drafts to Supabase for cross-device continuity
2. **Conflict Resolution**: Handle multiple tabs editing same form
3. **Version History**: Keep multiple draft versions with timestamps
4. **Analytics**: Track auto-save frequency and success rates
5. **Configurable Interval**: Allow users to adjust save frequency
6. **Network Indicator**: Show different UI when offline vs online

## Related Documentation

- `FORM_SCHEMA.md` - Form field inventory
- `CLAIM_WORKFLOW.md` - Claim process reference
- `TECHNICAL_INVENTORY.md` - Function/variable inventory
- `KNOWLEDGE.md` - Operational knowledge
- `QWEN.md` - Project context

---

*Implementation completed: 2026-04-04 19:15 (Asia/Jakarta)*
