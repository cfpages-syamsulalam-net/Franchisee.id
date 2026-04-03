# GEMINI.md - Franchise.id Project Context

This document is the **Single Source of Truth** for the Franchise.id project, combining technical implementation details with the strategic roadmap.

## Project Overview
Franchise.id is a high-performance directory platform (franchise.id, franchisee.id, franchisor.id) connecting Franchisors with potential Franchisees. It is a **WordPress-to-Static** conversion hosted on **Cloudflare Pages**, utilizing **Cloudflare Functions** and **GitHub Actions** for dynamic logic and automation.

- **GitHub Repository:** https://github.com/cfpages-syamsulalam-net/Franchisee.id/

### Core Tech Stack
- **Hosting:** Cloudflare Pages (Static HTML/CSS/JS).
- **Backend:** Cloudflare Functions (Edge Runtime) for forms and API access.
- **Automation (SSG):** Node.js scripts running via GitHub Actions (CRON: 15m to 3h).
- **CMS:** Google Sheets (Spreadsheet ID: `1p3Ke25SYZx0Yanv2MHy73eCbK_jE-qgzVC7ue5Tu3mU`).
- **Database/Auth:** Supabase (for analytics, user accounts, and dashboards).
- **Assets:** Cloudinary (Direct browser uploads + AI-powered optimization).

## Current Goals & Roadmap
For detailed technical plans, feature requests, and the current to-do list, refer to **[PRD.md](./PRD.md)**.

### Active Priorities
1.  **Hybrid SSG Engine (Phase 1):** Integrate "Unclaimed" brands into the main listing page.
2.  **Franchise Claiming:** Implement the third "Claim Brand" tab in the registration form.
3.  **Action Optimization:** Audit and enhance GitHub Actions for performance and real-time sync.

## Safety & Code Integrity (Lessons Learned)
- **Avoid Full Overwrites:** For large legacy files (e.g., `js/form-franchise.js`, `/daftar/index.html`), NEVER perform a full file rewrite using `write_file` if the file contains complex logic or Elementor boilerplate. Use targeted `replace` calls instead.
- **Large File Safeguards:**
    1.  **Mandatory Replace:** For any file exceeding 100 lines, use `replace` instead of `write_file`.
    2.  **Context Buffering:** When using `replace`, provide at least 5-10 lines of surrounding code in `old_string` to ensure unique matching and prevent accidental overlap deletions.
    3.  **Integrity Validation:** After editing any file > 500 lines, immediately run `(Get-Content <file_path>).Count` via shell to verify that the line count hasn't dropped drastically (e.g., >10% loss) unless explicitly intended.
    4.  **No Placeholder Edits:** Never assume sections of a file are "standard" or "unimportant" (like CSS blocks or meta tags). Every line must be treated as critical unless verified otherwise.
- **Refactor, Don't Delete:** If a file becomes too complex or has hoisting/initialization issues, refactor shared logic into a separate utility file (e.g., `js/form-utils.js`) rather than flattening or simplifying the code and losing features.
- **Verification before Deletion:** Always verify the full scope of a file's functionality (multi-step forms, calculations, uploads) before assuming code is redundant.

## Logic Inventory & Continuity
- **Mandatory Tracking**: The `TECHNICAL_INVENTORY.md` file is the source of truth for all functions and key variables in `/js` and `/functions`.
- **Folder Context**: Before making changes in any directory (e.g., `/daftar`, `/js`), ALWAYS check for local `.md` files (like `commits.md`, `technical_comparison.md`, `symbols_inventory.md`). These files contain critical historical context, feature lists, and instructions that override general assumptions.
- **Form Schema**: The `FORM_SCHEMA.md` file is the source of truth for all HTML form inputs. NEVER remove an input or a tab from `/daftar` without explicitly updating the schema and confirming with the user.

- **Sync Requirement:** When adding new features or refactoring, update `TECHNICAL_INVENTORY.md` and `FORM_SCHEMA.md` to reflect changes in symbols and UI fields.
- **Audit Requirement:** During major "vibe coding" sessions or refactors, perform a comparison against both inventory files to ensure zero-loss of business logic or user data points.

## Project Governance & Maintenance
- **Changelog Authority:** All code changes (create/update/delete) must be logged in `CHANGELOG.md`.
- **Timestamping:** Every new `CHANGELOG.md` entry must include date and hour with timezone (e.g., `2026-03-09 21:45 (Asia/Jakarta)`).
- **PRD Scope:** `PRD.md` is for requirements, roadmap, and feature plans; it should not be used as an ongoing code-change log.
- **Single Source of Truth:** `GEMINI.md` takes precedence for architecture and governance; `CHANGELOG.md` is the implementation history log.
- **Branching Strategy:** To protect the `main` branch, all new features or significant edits should be performed in a dedicated branch (e.g., `feature/name` or `fix/issue`).
    1.  Create a new branch: `git checkout -b feature/your-feature-name`.
    2.  Perform edits and verify changes.
    3.  Commit changes to the feature branch.
    4.  Merge into `main` only after validation.
    *Note: Gemini CLI should not create or push branches unless explicitly directed by the user.*

## Architecture & Data Flow
1.  **Data Tiers:** `UNCLAIMED` (Scraped/Potential), `FREE` (Claimed/Basic), `VERIFIED` (Paid/Priority).
2.  **Claiming Workflow:** Transition brands from `UNCLAIMED` to `FRANCHISOR` upon data completion.
3.  **Claim Search Hygiene:** Claim autocomplete must consume sanitized brand-only rows (exclude URL/phone/address/legal-entity/contact-label noise) consistently in builder (`js/build-listing.js`), API fallback (`functions/get-franchises.js`), and frontend (`js/form-franchise.js`).
4.  **SSG Engine:** Scripts in `js/` fetch data and inject into `templates/` via GitHub Actions.
5.  **Serverless Logic:** Functions handle API access and form submissions with custom JWT auth.

## Key Technical Components
- **Smart Form Logic (`js/form-franchise.js`):** Real-time calculations (BEP, ROI) and data validation.
- **Cloudinary Module:** Automatic image optimization and direct browser uploads.
- **SEO & Analytics:** Priority sorting and automatic JSON-LD injection for Verified pages.

## Key Directories & Files
- `/functions/`: Serverless edge functions.
- `/js/`: Client-side logic and SSG builder scripts.
- `/templates/`: Source HTML templates for the SSG engine.
- `PRD.md`: Technical project roadmap and feature details.

## Development Conventions
- **Static First:** Pre-generate all content pages for SEO.
- **Surgical HTML Edits:** Protect Elementor's DOM structure.
- **Auth Implementation:** Native Web Crypto API in Functions for speed.
