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

### Phase 1: UI & CSS Cleanup
- **Goal**: Prevent tab overflow and centralize styling.
- **Actions**:
  - Shorten Tab Labels: "Franchisee", "Franchisor", "Klaim Brand".
  - Migrate inline CSS from `pendaftaran/index.html` to `css/form-franchise.css`.

### Phase 2: High-Performance Autocomplete
- **Goal**: Faster search experience with zero API latency.
- **Actions**:
  - Modify `js/build-listing.js` to generate a static `data/unclaimed-brands.json` file during build.
  - Update `js/form-franchise.js` to fetch this JSON once on page load (or tab open) and use it for local autocomplete, mirroring the `data-kota-id.json` logic.
  - This ensures the search is "instant" and works offline/statically.

### Phase 3: Real-Time Sync (Low Resource)
- **Goal**: Reflect Google Sheet changes on the site within seconds without manual triggers.
- **Strategy**:
  - **Google Apps Script**: Add a simple script to the "Franchise Data" Google Sheet.
  - **Trigger**: `onEdit` or a custom "Sync" button in the Sheet menu.
  - **Action**: Call GitHub's `repository_dispatch` API to trigger the `generate-pages.yaml` workflow immediately.
  - **Result**: Data stays fresh, and resources are only used when data actually changes.

## 5. Development Timeline & Progress

| Date | Milestone | Status | Details |
|------|-----------|--------|---------|
| 2026-03-06 | **Hybrid SSG Engine** | ✅ DONE | Integrated `UNCLAIMED` brands into listing & details. |
| 2026-03-06 | **Claim Workflow v1** | ✅ DONE | Form, deep-linking, and submission API active. |
| 2026-03-06 | **UI & CSS Polish** | ⏳ TODO | Shorten tabs & migrate CSS. |
| 2026-03-06 | **JSON Autocomplete** | ⏳ TODO | Generate static JSON and update search logic. |
| 2026-03-07 | **Real-time Sync** | ⏳ TODO | Setup Google Apps Script + GitHub Dispatch. |
| 2026-03-07 | **Post-Claim Cleanup** | ⏳ TODO | Auto-delete from `UNCLAIMED` tab after successful claim. |

## 6. Technical Implementation Note: Apps Script Trigger
```javascript
// To be added to Google Sheets Apps Script
function triggerGithubBuild() {
  const GITHUB_TOKEN = "GH_PAT_HERE";
  const REPO_OWNER = "OWNER";
  const REPO_NAME = "Franchisee.id";
  
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`;
  const payload = JSON.stringify({ event_type: "sheet_update" });
  
  UrlFetchApp.fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json"
    },
    contentType: "application/json",
    payload: payload
  });
}
```
