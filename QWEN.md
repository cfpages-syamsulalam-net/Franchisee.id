# Franchise.id Project Context

## Project Overview

**Franchise.id** is a high-performance franchise directory platform connecting franchisors (business owners) with franchisees (potential investors) in Indonesia. The project uses a **WordPress-to-Static** architecture, combining static site generation for SEO performance with serverless edge functions for dynamic interactions.

### Core Purpose
- List verified franchise opportunities alongside "unclaimed" brand listings
- Enable franchise owners to claim and manage their brand listings
- Provide financial calculation tools (BEP, ROI, profit margins) for prospective franchisees
- Serve as a lead generation platform for franchise businesses

### Technology Stack
| Layer | Technology |
|-------|------------|
| **Hosting** | Cloudflare Pages (static assets) |
| **Backend** | Cloudflare Functions (edge runtime) |
| **SSG/Automation** | Node.js scripts via GitHub Actions |
| **CMS/Data Source** | Google Sheets (FRANCHISOR, UNCLAIMED, FRANCHISEE tabs) |
| **Asset Management** | Cloudinary (direct uploads, AI optimization) |
| **Frontend** | HTML5, Bootstrap/Tailwind CSS, Vanilla JavaScript |
| **SEO** | JSON-LD structured data, dynamic sitemaps |

---

## Directory Structure

```
Franchisee.id/
├── .github/workflows/       # GitHub Actions automation
│   ├── generate-pages.yaml  # SSG trigger from Google Sheets updates
│   ├── head.yaml            # Header management
│   └── sitemap-readme.yaml  # Sitemap documentation
├── data/                    # Generated static data files
│   └── unclaimed-brands.json # Autocomplete data for claim workflow
├── functions/               # Cloudflare serverless functions
│   ├── form-submit.js       # Form submission handler
│   └── get-franchises.js    # API endpoint for franchise data
├── js/                      # Client-side & SSG builder scripts
│   ├── build-listing.js     # Generates main listing page
│   ├── build-details.js     # Generates individual franchise pages
│   ├── build-sitemap.js     # Generates XML sitemap
│   ├── form-franchise.js    # Main form logic (validation, calculations)
│   └── form-utils.js        # Shared utility functions
├── templates/               # HTML templates for SSG engine
├── pendaftaran/             # Registration form pages
├── peluang-usaha/           # Generated franchise listing pages
├── css/                     # Stylesheets
├── wp-content/              # WordPress theme assets (static)
├── wp-includes/             # WordPress core assets (static)
├── CHANGELOG.md             # Mandatory change log (all modifications)
├── GEMINI.md                # Architecture & governance source of truth
├── PRD.md                   # Product requirements & roadmap
├── FORM_SCHEMA.md           # Canonical form input inventory
├── TECHNICAL_INVENTORY.md   # Function/variable inventory
├── franchise-info-form.md   # Form UX specification
└── AGENTS.md                # Local audit notes & working rules
```

---

## Building and Running

### Prerequisites
- Node.js 18+
- Google Cloud service account with Sheets API access
- GitHub repository with workflow permissions

### Environment Variables
Create a `.env` file with:
```
G_SHEET_ID=<your_google_sheet_id>
G_CLIENT_EMAIL=<service_account_email>
G_PRIVATE_KEY=<service_account_private_key>
```

### Build Commands

| Command | Description |
|---------|-------------|
| `node js/build-listing.js` | Regenerate main listing page (`/peluang-usaha/index.html`) |
| `node js/build-details.js` | Regenerate individual franchise detail pages |
| `node js/build-sitemap.js` | Regenerate XML sitemap |
| `npm install googleapis dotenv --no-save` | Install build dependencies |

### Full Build Sequence
```bash
npm install googleapis dotenv --no-save
node js/build-listing.js
node js/build-details.js
node js/build-sitemap.js
```

### Automation
- **Primary Trigger**: Google Sheets Apps Script sends `repository_dispatch` webhook on data changes
- **Fallback**: Scheduled GitHub Action runs every 12 hours
- **Hash-based optimization**: Build only runs when Google Sheets data hash changes (state persisted in `.github/sheets-sync-state.json`)

---

## Development Conventions

### Documentation Hierarchy
| File | Purpose |
|------|---------|
| `GEMINI.md` | **Primary**: Architecture, governance, technical direction |
| `CHANGELOG.md` | **Mandatory**: Log all create/update/delete operations with timestamp |
| `PRD.md` | Product requirements, feature scope, roadmap (non-changelog) |
| `FORM_SCHEMA.md` | Canonical form input inventory - update before removing/renaming fields |
| `TECHNICAL_INVENTORY.md` | Function/variable inventory - update after logic changes |
| `franchise-info-form.md` | Form UX specification and conditional logic reference |
| `AGENTS.md` | Local audit notes and session-specific working rules |

### Changelog Format
Every session must log changes in `CHANGELOG.md`:
```markdown
## YYYY-MM-DD HH:mm (Asia/Jakarta)
### Added
- Description of additions

### Changed
- Description of modifications

### Removed
- Description of deletions
```

### Code Safety Rules
1. **Avoid full overwrites** for large legacy files (>100 lines) - use targeted `replace` operations
2. **Context buffering**: Include 5-10 lines of surrounding code when replacing
3. **Integrity validation**: Verify line counts after editing large files
4. **No placeholder edits**: Treat all code as critical unless verified otherwise
5. **Refactor, don't delete**: Extract shared logic to utility files instead of removing functionality

### Form Field Safety
- Never remove/rename form inputs in `/pendaftaran/index.html` without updating `FORM_SCHEMA.md`
- The form has 3 tabs: **Franchisee**, **Franchisor**, **Klaim Brand** (Claim)
- Each tab has specific required fields documented in `FORM_SCHEMA.md`

---

## Key Features

### 1. Hybrid SSG Listing
- Merges **FRANCHISOR** (verified) and **UNCLAIMED** (potential) data sources
- Visual distinction: "Belum Diklaim" badge for unclaimed brands
- Tier-based sorting (Verified > Free > Unclaimed)

### 2. Franchise Claiming Workflow
- Third tab "Klaim Brand" with autocomplete search
- Selection pre-fills main Franchisor form with brand data
- Hidden `unclaimed_id` tracks source for post-claim cleanup
- Backend removes claimed entry from UNCLAIMED tab

### 3. Financial Calculator
- Real-time BEP (Break-Even Point) calculation
- ROI (Return on Investment) projections
- Profit margin analysis
- Auto-calculated total investment from component costs

### 4. Multi-Step Registration Form
**Franchisor Form (5 Sections):**
1. **Identitas & Legalitas**: Brand name, company, category, HAKI status, NIB
2. **Konsep & Biaya**: Outlet type, location requirements, fee structure, investment totals
3. **Profil Marketing**: Descriptions, support system checkboxes
4. **Media & Visual**: Logo, cover, gallery, video, proposal (Cloudinary uploads)
5. **Kontak Leads**: PIC name, WhatsApp, email, website, social media

---

## Data Flow Architecture

```
Google Sheets (CMS)
       ↓
GitHub Actions (Scheduled/Webhook)
       ↓
Node.js SSG Scripts (build-*.js)
       ↓
Static HTML Pages (Cloudflare Pages)
       ↓
User Browser
       ↓
Cloudflare Functions (form-submit.js, get-franchises.js)
       ↓
Google Sheets (write-back) + Supabase (analytics)
```

### Claim Workflow
```
1. User searches unclaimed brand → data/unclaimed-brands.json
2. Selection → fillMainFranchisorForm(brand) → switches to Franchisor tab
3. User completes form → submits with form_type="claim" + unclaimed_id
4. Backend (form-submit.js) → appends to FRANCHISOR tab
5. Post-success → deleteFromUnclaimed(unclaimed_id)
```

---

## Testing & Validation

### Manual Testing Checklist
- [ ] Tab switching in `/pendaftaran` form (Franchisee/Franchisor/Klaim)
- [ ] Claim workflow with `?claim=<slug>` deep-link
- [ ] Financial calculations (BEP, ROI, total investment)
- [ ] Form validation and error messages
- [ ] Cloudinary image upload preview
- [ ] Generated pages in `/peluang-usaha/` directory
- [ ] Sitemap completeness

### Validation Commands
```bash
# Check JavaScript syntax (may have EPERM issues in some environments)
node --check js/form-franchise.js

# Verify file integrity after edits
(Get-Content path/to/file.js).Count  # PowerShell line count
```

---

## Gotchas & Known Issues

1. **`node --check` EPERM**: May fail in restricted sandbox environments due to path-resolution issues. Fall back to source inspection.

2. **Optional Function Guards**: `form-franchise.js` references `window.renderPackageInputs(1)` which may not exist. Always guard optional global calls:
   ```javascript
   if (typeof window.renderPackageInputs === 'function') {
       window.renderPackageInputs(1);
   }
   ```

3. **Workflow Trigger Policy**: Primary trigger is `repository_dispatch` from Google Sheets. Scheduled polling is a fallback. Build should only run when sheet hash changes.

4. **Large File Edits**: Files like `pendaftaran/index.html` contain Elementor boilerplate. Use surgical edits to avoid breaking the DOM structure.

5. **Cloudinary Integration**: Direct browser uploads require proper credentials. Upload preview logic is in `form-franchise.js`.

---

## Related Documentation

- **[GEMINI.md](./GEMINI.md)**: Architecture and governance (primary reference)
- **[PRD.md](./PRD.md)**: Product requirements and feature roadmap
- **[CHANGELOG.md](./CHANGELOG.md)**: Running change log (mandatory updates)
- **[FORM_SCHEMA.md](./FORM_SCHEMA.md)**: Form field inventory
- **[TECHNICAL_INVENTORY.md](./TECHNICAL_INVENTORY.md)**: Code symbol inventory
- **[AGENTS.md](./AGENTS.md)**: Session-specific audit notes

---

## Quick Reference: Key Functions

### `/js/form-franchise.js`
- `slugify(text)` - URL-friendly slug generator
- `fetchUnclaimedBrands()` - Load unclaimed brands (static JSON or API fallback)
- `window.openTab(tabName)` - Tab switching
- `window.nextStep(stepIndex)` / `window.prevStep(stepIndex)` - Multi-step navigation
- `calculateAll()` - BEP/ROI/profit calculations
- `fillMainFranchisorForm(brand)` - Claim workflow pre-fill
- `submitToCloudflare(formElement, type)` - Form submission

### `/js/build-listing.js`
- `loadFromCSV(filePath)` - Fallback data loading
- `generateCard(item, index)` - HTML card generator
- `async build()` - Main orchestration

### `/functions/form-submit.js`
- `onRequestPost()` - Entry point
- `getGoogleAuthToken()` - RS256 JWT authentication
- `ensureSheetExists()` - Tab validation/creation
- `appendDataSmart()` - Dynamic column mapping
- `deleteFromUnclaimed(id)` - Post-claim cleanup

---

*Last updated: 2026-03-09 (Asia/Jakarta)*
