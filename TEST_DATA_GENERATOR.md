# Test Data Generator - Implementation Plan

Last updated: 2026-04-04 22:00 (Asia/Jakarta)

## Overview

Dev-mode test data generator that auto-fills Franchisee, Franchisor, and Claim forms with realistic Indonesian-sounding data. Test data is marked with a special `is_test_data` column in Google Sheets for easy identification and cleanup.

---

## Design Principles

### ✅ DO
- Use realistic Indonesian names (Budi Pratama, Siti Wijaya, etc.)
- Use realistic city names (Jakarta Selatan, Surabaya, Bandung)
- Mark test data with `is_test_data` column in Google Sheets
- Only show test generator FAB when `?dev=1` is active
- Let user manually review and submit data
- Provide clear test data cleanup options

### ❌ DON'T
- Don't add timestamps to names/cities (breaks data immersion)
- Don't auto-submit forms (user needs to verify data first)
- Don't show test generator in production (hidden behind `?dev=1`)
- Don't mix test data with real data without clear markers

---

## Architecture

### 1. Test Data Marking Strategy

**Google Sheets: New Column `is_test_data`**

| Column A | Column B | ... | Column Z (NEW) |
|----------|----------|-----|----------------|
| `name` | `email` | ... | `is_test_data` |
| Budi | test@example.com | ... | `TRUE` |
| Real User | real@company.com | ... | *(empty)* |

**Benefits**:
- Easy filtering: `Filter → is_test_data = TRUE`
- Easy deletion: Delete all rows where `is_test_data = TRUE`
- No data pollution in real columns
- Clear separation of test vs production data

**Implementation**:
- Backend `form-submit.js` adds `is_test_data` field when `body.is_test_data === true`
- Frontend sends `is_test_data: true` with all test form submissions
- Clear test data button calls backend to delete rows where `is_test_data = TRUE`

---

### 2. File Structure

```
Franchisee.id/
├── js/
│   └── form-09-test-data-generator.js  (NEW - ~400 lines)
│       ├── TestDataGenerator.generateName()
│       ├── TestDataGenerator.generateEmail()
│       ├── TestDataGenerator.generatePhone()
│       ├── TestDataGenerator.generateCity()
│       ├── TestDataGenerator.generateBrandName()
│       ├── TestDataGenerator.generateCompanyName()
│       ├── TestDataGenerator.fillFranchiseeForm()
│       ├── TestDataGenerator.fillFranchisorForm()
│       ├── TestDataGenerator.fillClaimForm()
│       └── TestDataGenerator.clearAllForms()
│
├── functions/
│   └── form-submit.js  (MODIFIED)
│       ├── Add is_test_data column handling
│       ├── Add test data cleanup endpoint
│       └── Add clearTestData() function
│
├── daftar/
│   └── index.html  (MODIFIED)
│       ├── Load form-09-test-data-generator.js in dev mode
│       └── Add FAB container HTML
│
├── TEST_DATA_GENERATOR.md  (THIS FILE)
├── AGENTS.md  (MODIFIED - add reference)
└── CHANGELOG.md  (MODIFIED - log changes)
```

---

### 3. UI Components

#### 3.1 Floating Action Button (FAB)

**Appearance**:
- Purple floating button (💾 icon) bottom-left corner
- Only visible when `?dev=1` is in URL
- Click opens dropdown menu
- Z-index: 9999 (above all elements)

**Position**:
```css
#dev-test-generator-fab {
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 9999;
}
```

**Menu Items**:
```
🧪 Test Data Generator
├─ 🚀 Fill Franchisee Form
├─ 🏢 Fill Franchisor Form (All Steps)
├─ 🔍 Fill Claim Form + Create UNCLAIMED
├─ 🗑️ Clear All Test Data
└─ 📊 View Test Stats (optional)
```

---

### 4. Data Generation

#### 4.1 Name Generator

**Realistic Indonesian Names**:

```javascript
const FIRST_NAMES = [
    'Budi', 'Siti', 'Ahmad', 'Dewi', 'Rizky', 'Rina', 'Agus', 'Putri',
    'Eko', 'Nur', 'Hendra', 'Lestari', 'Yudi', 'Ratna', 'Fajar', 'Indah',
    'Dimas', 'Wulan', 'Arif', 'Maya', 'Bambang', 'Sri', 'Joko', 'Ani',
    'Teguh', 'Fitri', 'Andi', 'Reni', 'Susanto', 'Yuliana'
];

const LAST_NAMES = [
    'Pratama', 'Wijaya', 'Sari', 'Putra', 'Hidayat', 'Kusuma', 'Santoso',
    'Purnama', 'Lestari', 'Susanti', 'Hermawan', 'Wahyuni', 'Setiawan',
    'Rahayu', 'Nugroho', 'Utami', 'Firmansyah', 'Handayani', 'Saputra',
    'Maulida', 'Kurniawan', 'Permata', 'Yulianto', 'Dewi', 'Purnomo'
];

// Generate: "Budi Pratama", "Siti Wijaya", etc.
// Add random number suffix to ensure uniqueness: "Budi Pratama 42"
```

**Uniqueness**: Add small random number (1-999) instead of timestamp:
- ✅ Good: `Budi Pratama 42`
- ❌ Bad: `Budi Pratama 1712253000000`

#### 4.2 Email Generator

```javascript
// Format: test_{random_number}@example.com
// Example: test_42@example.com, test_817@example.com
// Random ensures uniqueness without timestamps
```

#### 4.3 Phone Generator

```javascript
// Format: 812-XXXX-XXXX (valid Indonesian format)
// Examples: 812-4567-8901, 812-3456-7890
// Random middle and last parts ensure uniqueness
```

#### 4.4 City Generator

```javascript
const CITIES = [
    'Jakarta Selatan', 'Jakarta Utara', 'Surabaya', 'Bandung', 'Semarang',
    'Medan', 'Makassar', 'Yogyakarta', 'Denpasar', 'Palembang',
    'Tangerang', 'Bekasi', 'Depok', 'Bogor', 'Malang',
    'Padang', 'Pekanbaru', 'Manado', 'Balikpapan', 'Batam'
];

// Add random number suffix: "Jakarta Selatan 42"
```

#### 4.5 Brand Name Generator

```javascript
const BRAND_PREFIXES = [
    'Kopi', 'Burger', 'Ayam', 'Nasi', 'Teh', 'Roti', 'Bakso', 'Sate',
    'Mie', 'Dimsum', 'Kebab', 'Pizza', 'Es Krim', 'Jajanan', 'Snack'
];

const BRAND_SUFFIXES = [
    'Nusantara', 'Sejahtera', 'Maju', 'Bersama', 'Mandiri', 'Jaya',
    'Sentosa', 'Makmur', 'Lestari', 'Abadi', 'Harapan', 'Kreasi'
];

// Format: "Kopi Nusantara 42", "Burger Jaya 817"
```

#### 4.6 Company Name Generator

```javascript
// Format: "PT {Brand} {Suffix}"
// Example: "PT Kopi Nusantara 42", "PT Burger Sejahtera 817"
```

---

### 5. Form Fillers

#### 5.1 Franchisee Form Filler

**Fields to fill (2 steps)**:
```javascript
// Step 1: Data Pribadi
{
    name: generateName(),                    // "Budi Pratama 42"
    city_origin: generateCity(),              // "Jakarta Selatan 42"
    country_code: '+62',                      // Fixed
    whatsapp: generatePhone(),                // "812-4567-8901"
    email: generateEmail(),                   // "test_42@example.com"
}

// Step 2: Minat & Budget
{
    interest_category: random(['fb', 'retail', 'service', 'edu', 'beauty']),
    budget_range: random(['<50jt', '50-100jt', '100-500jt', '>500jt']),
    location_plan: random(['ready', 'searching']),
    message: 'Generated test data for validation'
}
```

**Implementation**:
```javascript
TestDataGenerator.fillFranchiseeForm = function() {
    const step1Data = this.generateFranchiseeStep1Data();
    const step2Data = this.generateFranchiseeStep2Data();
    
    // Fill Step 1 fields
    this.fillFormFields(step1Data);
    
    // Navigate to Step 2
    if (typeof window.franchiseeNextStep === 'function') {
        window.franchiseeNextStep(2);
    }
    
    // Fill Step 2 fields
    this.fillFormFields(step2Data);
    
    // Navigate back to Step 1 for user review
    if (typeof window.franchiseePrevStep === 'function') {
        window.franchiseePrevStep(2);
    }
    
    // Mark form for test data submission
    this.markFormAsTestData('franchiseeForm');
    
    this.showToast('✅ Franchisee form filled (both steps)! Review and click LANJUT.');
};
```

#### 5.2 Franchisor Form Filler

**Fields to fill (all 5 steps)**:

```javascript
{
    // Step 1: Identitas & Legalitas
    brand_name: generateBrandName(),          // "Kopi Nusantara 42"
    company_name: generateCompanyName(),      // "PT Kopi Nusantara 42"
    category: random(['fb', 'retail', 'service']),
    year_established: '2020',                 // Fixed
    haki_status: 'registered',                // Fixed
    haki_number: 'IDM000' + random(100, 999),
    nib_number: generateNIB(),                // 13 digits
    
    // Step 2: Konsep & Biaya
    outlet_type: random(['A', 'B', 'C', 'D']),
    location_requirement: '3x4 meter',
    rent_cost: '1000000',
    fee_license: '5000000',
    fee_capex: '15000000',
    fee_construction: '10000000',
    net_profit_percent: '30',
    royalty_percent: '5',
    royalty_basis: 'omzet',
    
    // Step 3: Profil Marketing
    short_desc: 'Franchise test description',
    full_desc: 'Auto-generated test data for validation testing.',
    support_system: ['Bahan baku', 'Training'],
    
    // Step 4: Media & Visual
    logo_url: 'https://res.cloudinary.com/test/logo.png',
    cover_url: 'https://res.cloudinary.com/test/cover.jpg',
    
    // Step 5: Kontak
    pic_name: generateName(),
    country_code: '+62',
    whatsapp: generatePhone(),
    email_contact: generateEmail(),
    website_url: 'https://example.com',
    instagram_url: '@test_42'
}
```

**Implementation**:
```javascript
TestDataGenerator.fillFranchisorForm = function() {
    const data = this.generateFranchisorData();
    
    // Fill all fields
    this.fillFormFields(data);
    
    // Mark hidden test data field
    const testFlag = document.createElement('input');
    testFlag.type = 'hidden';
    testFlag.name = 'is_test_data';
    testFlag.value = 'TRUE';
    document.getElementById('franchiseListingForm').appendChild(testFlag);
    
    this.showToast('✅ Franchisor form filled! Navigate through steps to verify.');
};
```

#### 5.3 Claim Form Filler + UNCLAIMED Generation

**Two-step process**:

1. **Create UNCLAIMED data in Google Sheets** (backend call)
2. **Search and claim the brand** (frontend auto-fill)

```javascript
TestDataGenerator.fillClaimForm = async function() {
    // Step 1: Generate UNCLAIMED brand data
    const unclaimedData = {
        brand_name: 'Test Brand ' + random(1, 999),
        category: random(['F&B', 'Retail', 'Jasa']),
        min_capital: random(50, 500) + '000000',
        city: generateCity(),
        is_test_data: 'TRUE'  // Mark as test data
    };
    
    // Step 2: Send to backend to create UNCLAIMED row
    const response = await fetch('/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            test_action: 'create_unclaimed',
            is_test_data: true,
            ...unclaimedData
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        // Step 3: Trigger brand search
        const searchInput = document.querySelector('#claim-brand-search');
        searchInput.value = unclaimedData.brand_name;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Step 4: Wait for autocomplete, select first match
        setTimeout(() => {
            const suggestion = document.querySelector('.suggestion-item');
            if (suggestion) suggestion.click();
            
            this.showToast('✅ Claim form ready! Submit to test claim workflow.');
        }, 500);
    }
};
```

---

### 6. Backend Integration

#### 6.1 Form Submit Changes

**File**: `functions/form-submit.js`

**Add test data column to sheets**:

```javascript
// In appendDataSmart()
const headers = await getSheetHeaders(sheetId);

// Add is_test_data column if not exists
if (!headers.includes('is_test_data')) {
    await appendToSheet(sheetId, [[]]); // Add header row
    await updateCell(sheetId, 'Z1', 'is_test_data');
}

// Include is_test_data in submitted data
const rowData = {
    ...mappedData,
    is_test_data: body.is_test_data || ''  // 'TRUE' for test, empty for real
};

await appendToSheet(sheetId, [rowData]);
```

#### 6.2 Test Data Cleanup Endpoint

**New endpoint**: `POST /form-submit?test_action=clear_test_data`

```javascript
if (body.test_action === 'clear_test_data') {
    // Delete rows from FRANCHISOR where is_test_data = TRUE
    await clearTestData('FRANCHISOR');
    
    // Delete rows from FRANCHISEE where is_test_data = TRUE
    await clearTestData('FRANCHISEE');
    
    // Delete rows from UNCLAIMED where is_test_data = TRUE
    await clearTestData('UNCLAIMED');
    
    return {
        success: true,
        message: `Cleared ${count} test records from all tabs`
    };
}

// Helper function
async function clearTestData(sheetName) {
    const data = await getSheetData(sheetName);
    const headerRow = data[0];
    const testDataColIndex = headerRow.indexOf('is_test_data');
    
    if (testDataColIndex === -1) return 0;
    
    let deletedCount = 0;
    
    // Iterate backwards to delete without shifting indices
    for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][testDataColIndex] === 'TRUE') {
            await deleteSheetRow(sheetName, i + 1); // +1 for 1-based indexing
            deletedCount++;
        }
    }
    
    return deletedCount;
}
```

---

### 7. Security Considerations

### 7.1 Dev Mode Activation Check

```javascript
// In form-09-test-data-generator.js
TestDataGenerator.isDevMode = function() {
    return new URLSearchParams(window.location.search).get('dev') === '1';
};

TestDataGenerator.init = function() {
    if (!this.isDevMode()) return; // Don't load in production
    
    // Create FAB and attach to DOM
    this.createFAB();
};
```

### 7.2 Test Data Marker

- **Frontend**: Adds `is_test_data: 'TRUE'` to form data
- **Backend**: Writes to `is_test_data` column in Google Sheets
- **Clear function**: Only deletes rows where `is_test_data = TRUE`
- **Production safety**: Real data (empty `is_test_data`) is never deleted

---

### 8. User Flow

#### 8.1 Testing Franchisee Form

1. Open `/daftar?dev=1`
2. Click 💾 FAB → "Fill Franchisee Form"
3. All fields auto-filled with realistic data
4. Review data (optional: edit any field)
5. Click "DAFTAR SEKARANG" to submit
6. Check Google Sheets: New row with `is_test_data = TRUE`
7. Repeat with different data (randomized each time)
8. Click "Clear All Test Data" when done

#### 8.2 Testing Franchisor Form

1. Open `/daftar?dev=1` → Switch to Franchisor tab
2. Click 💾 FAB → "Fill Franchisor Form"
3. All 5 steps auto-filled
4. Navigate through steps to verify:
   - Step 1 → Step 2: Click LANJUT (validates step 1)
   - Step 2 → Step 3: Click LANJUT (validates step 2)
   - ... and so on
5. Click "SIMPAN LISTING" to submit
6. Check Google Sheets: New row with `is_test_data = TRUE`
7. Clear test data when done

#### 8.3 Testing Claim Workflow

1. Open `/daftar?dev=1` → Switch to Klaim tab
2. Click 💾 FAB → "Fill Claim Form + Create UNCLAIMED"
3. Backend creates UNCLAIMED row with `is_test_data = TRUE`
4. Frontend auto-searches for the brand
5. Autocomplete shows the test brand
6. User selects brand (or auto-select)
7. Switches to Franchisor tab with pre-filled data
8. Complete remaining fields (or click "Fill Franchisor Form")
9. Submit form
10. Verify:
    - FRANCHISOR sheet: New row with claimed brand
    - UNCLAIMED sheet: Test brand removed
11. Clear test data when done

---

### 9. Toast Notifications

**Implementation**:
```javascript
TestDataGenerator.showToast = function(message) {
    const toast = document.createElement('div');
    toast.className = 'dev-test-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 20px;
        background: #7c3aed;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9998;
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};
```

---

### 10. CSS for FAB

```css
/* Test Data Generator FAB */
#dev-test-generator-fab {
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 9999;
    display: none; /* Hidden by default, shown via JS when ?dev=1 */
}

#dev-test-generator-fab.active {
    display: block;
}

.dev-fab-button {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #7c3aed;
    color: white;
    border: none;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    transition: all 0.2s ease;
}

.dev-fab-button:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
}

.dev-fab-menu {
    position: absolute;
    bottom: 70px;
    left: 0;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 8px;
    min-width: 240px;
    display: none;
}

.dev-fab-menu.active {
    display: block;
}

.dev-fab-menu button {
    display: block;
    width: 100%;
    padding: 10px 16px;
    background: transparent;
    border: none;
    text-align: left;
    font-size: 14px;
    cursor: pointer;
    border-radius: 4px;
}

.dev-fab-menu button:hover {
    background: #f3f4f6;
}

@keyframes slideIn {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(-100%); opacity: 0; }
}
```

---

## Implementation Order

### Phase 1: Core Generator (1-2 hours)
- [ ] Create `js/form-09-test-data-generator.js`
- [ ] Implement data generation functions
- [ ] Implement Franchisee form filler
- [ ] Add FAB HTML/CSS/JS
- [ ] Test Franchisee form

### Phase 2: Franchisor Support (1-2 hours)
- [ ] Implement Franchisor form filler (all 5 steps)
- [ ] Add hidden `is_test_data` field injection
- [ ] Test step navigation with filled data
- [ ] Test submission

### Phase 3: Claim Workflow (2-3 hours)
- [ ] Add backend endpoint to create UNCLAIMED row
- [ ] Implement claim form filler
- [ ] Test end-to-end claim workflow
- [ ] Verify UNCLAIMED → FRANCHISOR conversion

### Phase 4: Cleanup & Polish (30 minutes)
- [ ] Add `is_test_data` column handling in backend
- [ ] Implement clear test data endpoint
- [ ] Add clear test data button to FAB
- [ ] Test data cleanup flow
- [ ] Documentation

---

## Testing Checklist

### Franchisee Form
- [ ] Click FAB → Franchisee form filled
- [ ] All fields populated with realistic data
- [ ] Data passes validation (green checkmarks)
- [ ] Submit to Google Sheets works
- [ ] Row appears in FRANCHISEE tab
- [ ] `is_test_data` column = `TRUE`
- [ ] Different data generated each time

### Franchisor Form
- [ ] Click FAB → All 5 steps filled
- [ ] Navigate step-by-step: no validation errors
- [ ] Auto-calculated fields work (total investment)
- [ ] Submit to Google Sheets works
- [ ] Row appears in FRANCHISOR tab
- [ ] `is_test_data` column = `TRUE`
- [ ] Different data generated each time

### Claim Workflow
- [ ] Click FAB → UNCLAIMED row created
- [ ] Brand appears in claim autocomplete
- [ ] Selecting brand switches to Franchisor tab
- [ ] Pre-filled data matches UNCLAIMED brand
- [ ] Complete and submit form
- [ ] FRANCHISOR tab: New claimed brand row
- [ ] UNCLAIMED tab: Test brand removed
- [ ] Both rows marked `is_test_data = TRUE`

### Clear Test Data
- [ ] Click "Clear All Test Data" in FAB
- [ ] Confirm dialog appears
- [ ] All rows with `is_test_data = TRUE` deleted
- [ ] Real data (empty `is_test_data`) preserved
- [ ] Toast notification shows count of deleted rows

---

## Data Format Reference

### Franchisee Example
```json
{
    "name": "Budi Pratama 42",
    "city_origin": "Jakarta Selatan 42",
    "country_code": "+62",
    "whatsapp": "812-4567-8901",
    "email": "test_42@example.com",
    "interest_category": "fb",
    "budget_range": "50-100jt",
    "location_plan": "searching",
    "message": "Generated test data for validation",
    "is_test_data": "TRUE"
}
```

### Franchisor Example
```json
{
    "brand_name": "Kopi Nusantara 42",
    "company_name": "PT Kopi Nusantara 42",
    "category": "fb",
    "year_established": "2020",
    "haki_status": "registered",
    "haki_number": "IDM000456",
    "nib_number": "1234567890123",
    "outlet_type": "A",
    "location_requirement": "3x4 meter",
    "rent_cost": "1000000",
    "fee_license": "5000000",
    "fee_capex": "15000000",
    "fee_construction": "10000000",
    "total_investment_value": "30000000",
    "net_profit_percent": "30",
    "royalty_percent": "5",
    "royalty_basis": "omzet",
    "short_desc": "Franchise test description",
    "full_desc": "Auto-generated test data for validation testing.",
    "logo_url": "https://res.cloudinary.com/test/logo.png",
    "cover_url": "https://res.cloudinary.com/test/cover.jpg",
    "pic_name": "Ahmad Wijaya 42",
    "country_code": "+62",
    "whatsapp": "812-3456-7890",
    "email_contact": "test_42@example.com",
    "website_url": "https://example.com",
    "instagram_url": "@test_42",
    "is_test_data": "TRUE"
}
```

### UNCLAIMED Example (Google Sheets)
```json
{
    "brand_name": "Test Brand 817",
    "category": "F&B",
    "min_capital": "150000000",
    "city": "Bandung 817",
    "is_test_data": "TRUE"
}
```

---

## Future Enhancements

1. **Bulk Generation**: Generate 10+ test submissions at once
2. **Custom Data Templates**: Save/load preferred test data patterns
3. **Edge Case Testing**: Test invalid data, empty fields, etc.
4. **Analytics Dashboard**: Show test submission history
5. **Multi-Language Support**: Generate non-Indonesian test data

---

## Related Documentation

- `FORM_SCHEMA.md` - Form field inventory
- `TECHNICAL_INVENTORY.md` - Function/variable inventory
- `AUTO_SAVE.md` - Franchisor auto-save implementation
- `FORM_UX_FIXES.md` - UX improvements guide
- `CLAIM_WORKFLOW.md` - Claim process reference

---

*Plan created: 2026-04-04 22:00 (Asia/Jakarta)*
*Ready for implementation upon approval.*
