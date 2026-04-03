# Product Requirements Document (PRD): Franchise.id Expansion

## 1. Project Overview
Expanding Franchise.id from a verified-only directory to a comprehensive database by integrating "Unclaimed" franchise listings and providing a streamlined "Claim" workflow for business owners.

## 2. Feature 1: Hybrid SSG Listing (Verified + Unclaimed)
### Goal
The main listing page (`/peluang-usaha/index.html`) should display both registered franchisors and unclaimed brands to increase site depth and SEO value.

### Implementation Status: [DONE]
- **Modified `js/build-listing.js`**: Fetches and merges `FRANCHISOR` and `UNCLAIMED` tabs.
- **Visual Distinction**: Added "Belum Diklaim" badge and tier-based sorting.

## 3. Feature 2: Franchise Claiming Workflow
### Goal
Allow owners of "Unclaimed" brands to take control of their pages.

### Implementation Status: [DONE]
- **Frontend**: Added "Klaim Brand" tab with deep-link support.
- **Backend**: API support for fetching unclaimed brands and processing claim submissions.

## 4. Optimization Plan (v2.0)

### Phase 1: UI & CSS Cleanup [DONE]
- Shortened Tab Labels: "Franchisee", "Franchisor", "Klaim Brand".
- Migrated inline CSS to `css/form-franchise.css`.

### Phase 2: High-Performance Autocomplete [DONE]
- Static `data/unclaimed-brands.json` generated during build.
- Instant search with zero API latency.

### Phase 3: Real-Time Sync [DONE]
- Google Apps Script + GitHub Repository Dispatch.

### Phase 4: SEO & Conversion Optimization [DONE]
- JSON-LD, Breadcrumbs, Sticky CTA, and Dynamic Sitemap active.

### Phase 5: Unified Claiming Workflow [IN PROGRESS]
- **Goal**: Merge "Claim" into the main "Franchisor" flow for a better user experience and data consistency.
- **Actions**:
  - **Autocomplete UI**: Simplify to show only `brand_name`.
  - **Data Hygiene**: Enforce brand-only extraction/sanitization across builder/API/frontend to exclude URL/phone/address/legal-entity/contact-label rows.
  - **CSS Polish**: Enhance `.suggestion-item` hover/active states in `css/form-franchise.css`.
  - **Workflow Merge**: Selection in "Klaim" tab now redirects to "Franchisor" tab with pre-filled data.
  - **Data Mapping Fix**: Correctly map `brand_name`, `min_capital`, and `category` to the Franchisor form fields.
  - **Unclaimed Tracker**: Inject a hidden `unclaimed_id` into the main Franchisor form so `form-submit.js` can perform the post-claim cleanup.

## 5. Change Log Location
- Development timeline and code-change history are now maintained in `CHANGELOG.md` only.
- `PRD.md` remains focused on product requirements, feature scope, and implementation direction.

## 6. Technical Implementation Note: Apps Script Trigger
```javascript
// To be added to Google Sheets Apps Script (Extensions > Apps Script)
// 1. Paste this code
// 2. Set GITHUB_TOKEN (Personal Access Token)
// 3. Add to a Button or onEdit trigger
function triggerGithubBuild() {
  const GITHUB_TOKEN = "YOUR_GH_PAT_HERE";
  const REPO_OWNER = "syamsulalamcom"; // Based on PRD info
  const REPO_NAME = "Franchisee.id";
  
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`;
  const payload = JSON.stringify({ 
    event_type: "sheet_update",
    client_payload: {
      message: "Data updated via Google Sheets"
    }
  });
  
  const options = {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "GoogleAppsScript"
    },
    contentType: "application/json",
    payload: payload,
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  Logger.log(response.getContentText());
  
  if (response.getResponseCode() === 204) {
    SpreadsheetApp.getActiveSpreadsheet().toast("🚀 Sync triggered successfully!", "GitHub SSG", 5);
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast("❌ Error: " + response.getContentText(), "Sync Failed", 10);
  }
}

// Add a menu to trigger manually
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Franchise.id')
      .addItem('Sync to Website', 'triggerGithubBuild')
      .addToUi();
}
```
