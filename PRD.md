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

### Phase 3: Real-Time Sync [IN PROGRESS]
- Google Apps Script + GitHub Repository Dispatch.

## 5. Development Timeline & Progress

| Date & Hour | Milestone | Status | Details |
|------|-----------|--------|---------|
| 2026-03-06 20:00 | **Project Kickoff** | ✅ DONE | Initial analysis of WordPress-to-Static transition. |
| 2026-03-06 20:15 | **Documentation Sync** | ✅ DONE | Synced PRD, GEMINI.md with codebase and external docs. |
| 2026-03-06 20:30 | **Hybrid SSG Engine** | ✅ DONE | Updated `build-listing.js` & `get-franchises.js` for `UNCLAIMED` brands. |
| 2026-03-06 21:00 | **Claim Workflow UI** | ✅ DONE | Implemented "Klaim Brand" tab, Autocomplete & Data-Gap form. |
| 2026-03-06 21:30 | **Deep-Linking & Auto-Fill** | ✅ DONE | Added `?claim=slug` support for seamless transitions. |
| 2026-03-06 22:00 | **Actions Bugfix** | ✅ DONE | Fixed multiple `run` commands in `generate-pages.yaml`. |
| 2026-03-06 22:30 | **UI & CSS Polish** | ✅ DONE | Shortened tab names & moved CSS to `form-franchise.css`. |
| 2026-03-06 22:45 | **Static Autocomplete** | ✅ DONE | Switched from API to `unclaimed-brands.json` for speed. |
| 2026-03-06 23:15 | **Automated Sync Logic** | ✅ DONE | Designed `onEdit` trigger with debounce for Google Sheets. |
| 2026-03-07 09:00 | **Post-Claim Cleanup** | ⏳ TODO | Auto-delete from `UNCLAIMED` tab after successful claim. |

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
