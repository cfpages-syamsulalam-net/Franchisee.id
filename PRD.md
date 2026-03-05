# Product Requirements Document (PRD): Franchise.id Expansion

## 1. Project Overview
Expanding Franchise.id from a verified-only directory to a comprehensive database by integrating "Unclaimed" franchise listings and providing a streamlined "Claim" workflow for business owners.

## 2. Feature 1: Hybrid SSG Listing (Verified + Unclaimed)
### Goal
The main listing page (`/peluang-usaha/index.html`) should display both registered franchisors and unclaimed brands to increase site depth and SEO value.

### Technical Plan
- **Modify `js/build-listing.js`**:
  - Fetch both `FRANCHISOR` and `UNCLAIMED` tabs.
  - Normalize `UNCLAIMED` data to match the `FRANCHISOR` schema (handling missing images/descriptions).
  - **Sorting Priority**: `VERIFIED` > `FREE` > `UNCLAIMED`.
  - **Visual Distinction**: Unclaimed cards should have a subtle "Unverified" or "Claim This" hint instead of the blue checkmark.
- **Automation**: Ensure GitHub Actions correctly triggers these builds upon Google Sheet updates.

## 3. Feature 2: Franchise Claiming Workflow
### Goal
Allow owners of "Unclaimed" brands to take control of their pages by providing missing information, moving them to the `FRANCHISOR` tab.

### The "Gap" Analysis
**Available in UNCLAIMED:** `brand_name`, `category`, `subcategory`, `label`, `min_capital`, `max_capital`, `full_desc`, `phone`, `office_address`, `outlets_location`.
**Required for FRANCHISOR (The Gap):**
- **Identitas**: `company_name`, `year_established`, `haki_status`, `nib_number`.
- **Biaya**: `outlet_type`, `loc_width`, `loc_length`, `rent_budget`, `fee_license`, `contract_duration`, `royalty_percent`, `net_profit_percent`.
- **Media**: `logo_url`, `cover_url`, `gallery_urls`, `proposal_url`.
- **Kontak**: `pic_name`, `email_contact`, `website_url`.

### Technical Plan
- **Frontend (`/pendaftaran/index.html`)**:
  - Add a **"Klaim Brand"** tab.
  - Implement a search/dropdown to select from existing `UNCLAIMED` brands.
  - Pre-fill the form with available data from the selected brand.
  - Highlight "Required to Claim" fields (The Gap).
- **Backend (`functions/form-submit.js`)**:
  - Add logic to handle "Claim" submissions.
  - Move the record from `UNCLAIMED` to `FRANCHISOR` in Google Sheets.
  - Trigger a re-build of the SSG engine to update the brand's status.

## 4. Feature 3: GitHub Actions Audit
### Current State
- `generate-pages.yaml`: Manually or on-schedule runs `build-listing.js` and `build-details.js`.
- `head.yaml`: Handles partial updates? (Needs deeper look).
- `sitemap-readme.yaml`: Updates sitemap and README.

### Optimization Plan
- **Trigger on Webhook**: Explore triggering the workflow immediately when Google Sheet is saved (using Apps Script to hit GitHub API).
- **Partial Builds**: If the dataset grows too large, optimize `build-details.js` to only regenerate changed rows.
- **Dependency Management**: Ensure `npm install` is cached to speed up build times.

## 5. Success Metrics
- Increase in total indexed pages.
- Number of successful "Claims" per month.
- Reduction in manual data entry for new franchisors.
