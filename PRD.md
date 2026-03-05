# Product Requirements Document (PRD): Franchise.id Expansion

## 1. Project Overview
Expanding Franchise.id from a verified-only directory to a comprehensive database by integrating "Unclaimed" franchise listings and providing a streamlined "Claim" workflow for business owners.

## 2. Feature 1: Hybrid SSG Listing (Verified + Unclaimed)
### Goal
The main listing page (`/peluang-usaha/index.html`) should display both registered franchisors and unclaimed brands to increase site depth and SEO value.

### Implementation Status: [DONE]
- **Modified `js/build-listing.js`**:
  - Fetches both `FRANCHISOR` and `UNCLAIMED` tabs.
  - Normalizes `UNCLAIMED` data to match the `FRANCHISOR` schema.
  - **Sorting Priority**: `VERIFIED` > `FREE` > `UNCLAIMED`.
  - **Visual Distinction**: Added "Belum Diklaim" badge for unclaimed brands.
- **Automation**: Updated `.github/workflows/generate-pages.yaml` to include all build scripts and cron triggers.

## 3. Feature 2: Franchise Claiming Workflow
### Goal
Allow owners of "Unclaimed" brands to take control of their pages by providing missing information, moving them to the `FRANCHISOR` tab.

### Implementation Status: [DONE]
- **Frontend (`/pendaftaran/index.html`)**:
  - Added **"Klaim Brand"** tab with autocomplete search.
  - Deep-link support via `?claim=slug` to auto-open and pre-fill the form.
  - Visual "Data Gap" highlighting (yellow background for missing fields).
- **Backend (`functions/get-franchises.js`)**:
  - Added support for `?tab=UNCLAIMED` parameter.
- **Backend (`functions/form-submit.js`)**:
  - Added logic to handle `form_type: "claim"` submissions.
  - Maps claim data to the `FRANCHISOR` sheet with `status: "FREE"`.

## 4. Feature 3: GitHub Actions & SSG Optimization
### Current State: [IN PROGRESS]
- **Fixed**: Multiple `run` commands in `generate-pages.yaml`.
- **Added**: Trigger on `push` for local CSV data sync.
- **Added**: 12-hour cron schedule for data freshness.

### Next Steps
- **Trigger on Webhook**: Optimize for real-time builds using GitHub Repository Dispatch.
- **Data Cleanup**: Implement automatic deletion from `UNCLAIMED` tab after a successful claim (requires Google Sheets API `deleteDimension`).

## 5. Development Timeline & Progress

| Date | Milestone | Status | Details |
|------|-----------|--------|---------|
| 2026-03-06 | **Project Kickoff** | ✅ DONE | Initial analysis of WordPress-to-Static transition. |
| 2026-03-06 | **Documentation Sync** | ✅ DONE | Synced PRD, GEMINI.md, and .knowledge.md with codebase and external Google Docs. |
| 2026-03-06 | **Hybrid SSG Engine** | ✅ DONE | Updated `build-listing.js` and `get-franchises.js` to support `UNCLAIMED` brands. |
| 2026-03-06 | **Claim Workflow UI** | ✅ DONE | Implemented "Klaim Brand" tab, Autocomplete search, and Data-Gap form in `/pendaftaran`. |
| 2026-03-06 | **Deep-Linking & Auto-Fill** | ✅ DONE | Added `?claim=slug` support to `js/form-franchise.js` for seamless transitions. |
| 2026-03-06 | **Actions Optimization** | ✅ DONE | Fixed `generate-pages.yaml` and added sync triggers for CSV files. |
| 2026-03-07 | **Verification Logic** | ⏳ TODO | Enhance `form-submit.js` to handle brand migration (Delete from Unclaimed). |
| 2026-03-07 | **Real-time SSG** | ⏳ TODO | Setup GitHub Repository Dispatch from Google Apps Script. |

## 6. Success Metrics
- Increase in total indexed pages (Target: 2x current listing).
- Number of successful "Claims" per month.
- Reduction in manual data entry for new franchisors.
