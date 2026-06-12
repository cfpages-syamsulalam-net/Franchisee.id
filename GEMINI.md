# GEMINI.md - Franchise.id Project Context

This document is the **Single Source of Truth** for the Franchise.id project, combining technical implementation details with the strategic roadmap.

## Project Overview
Franchise.id is a high-performance directory platform (franchise.id, franchisee.id, franchisor.id) connecting Franchisors with potential Franchisees. It is a **WordPress-to-Static** conversion hosted on **Cloudflare Pages**, utilizing **Cloudflare Functions** and **GitHub Actions** for dynamic logic and automation.

- **GitHub Repository:** https://github.com/cfpages-syamsulalam-net/Franchisee.id/

### Core Tech Stack
**Current transitional stack:**
- **Hosting:** Cloudflare Pages serving static HTML/CSS/JS from the WordPress export.
- **Backend:** Cloudflare Pages Functions for form/API access.
- **Automation (SSG):** Node.js scripts running via GitHub Actions.
- **Data source:** Google Sheets tabs (`FRANCHISOR`, `UNCLAIMED`, `FRANCHISEE`) plus CSV fallbacks. Treat this as the legacy/prototype data layer, not the final application database.
- **Assets:** WordPress uploads, external URLs, and existing Cloudinary URL transforms. Treat this as legacy asset handling.

**Target upgrade direction:**
- **Framework:** Astro on Cloudflare by default, with Next.js retained as an alternative if dashboard complexity requires a React-heavy app.
- **Database:** Cloudflare D1 for users, franchisees, franchisors, listings, claims, leads, packages, locations, and audit events.
- **Assets:** Cloudflare R2 for logos, covers, galleries, proposals, and imported legacy media.
- **Auth:** Clerk for login/register, user identity/session handling, and protected franchisee/franchisor/admin route entry.
- **Backend:** Cloudflare Workers/Pages Functions or Astro server routes using D1/R2 bindings instead of Google API write paths.
- **Language:** TypeScript by default for new app, backend, importer, schema, and D1 integration work.
- **Validation:** Zod for runtime validation at trust boundaries before business logic or D1 writes.
- **Migrations:** Source-controlled SQL migrations for all D1 schema changes.
- **Authorization:** Clerk authenticates identity; D1 is authoritative for roles and permissions (`franchisee`, `franchisor`, `staff`, `admin`).

## Current Goals & Roadmap
For detailed technical plans, feature requests, and the current to-do list, refer to **[PRD.md](./PRD.md)**.

### Active Priorities
1. **Documentation Alignment:** Keep `CODEBASE.md`, `AUDIT.md`, and all governance docs aligned around the D1/R2/Clerk migration.
2. **Data Contract Design:** Define TypeScript/Zod schemas, D1 SQL migrations, role tables, and import/mapping from Sheets/CSV without losing existing form fields.
3. **Auth Foundation:** Replace static `/login` and registration intent with Clerk-backed login/register and protected role pages.
4. **Backend Replacement:** Migrate `/form-submit` and `/get-franchises` from Google Sheets access to D1-backed APIs while preserving the current frontend payload contract during transition.
5. **Asset Migration:** Move franchisor media handling toward R2 while preserving existing `*_url` field names until the form schema is formally migrated.

## Safety & Code Integrity (Lessons Learned)
- **Avoid Full Overwrites:** For large legacy files (e.g., `/daftar/index.html`), NEVER perform a full file rewrite using `write_file` if the file contains complex logic or Elementor boilerplate. Use targeted `replace` calls instead.
- **Large File Safeguards:**
    1.  **Mandatory Replace:** For any file exceeding 100 lines, use `replace` instead of `write_file`.
    2.  **Context Buffering:** When using `replace`, provide at least 5-10 lines of surrounding code in `old_string` to ensure unique matching and prevent accidental overlap deletions.
    3.  **Integrity Validation:** After editing any file > 500 lines, immediately run `(Get-Content <file_path>).Count` via shell to verify that the line count hasn't dropped drastically (e.g., >10% loss) unless explicitly intended.
    4.  **No Placeholder Edits:** Never assume sections of a file are "standard" or "unimportant" (like CSS blocks or meta tags). Every line must be treated as critical unless verified otherwise.
- **Refactor, Don't Delete:** If a file becomes too complex or has hoisting/initialization issues, refactor shared logic into a separate utility file (e.g., `js/form-utils.js`) rather than flattening or simplifying the code and losing features.
- **Verification before Deletion:** Always verify the full scope of a file's functionality (multi-step forms, calculations, uploads) before assuming code is redundant.
- **Modular Form Runtime Rule:** Keep registration runtime logic in flat modular files (`js/form-01-*.js` ... `js/form-07-*.js`). `js/form-franchise.js` is a legacy shim marker and must not be used for new runtime logic.

## Multi-Model Collaboration Protocol
- This repository is actively edited by multiple AI providers/models due usage-limit handoffs.
- All agents must follow the same continuity protocol:
  1. Read `AGENTS.md`, `GEMINI.md`, `KNOWLEDGE.md`, and the latest `/.context/session-*.md` before edits.
  2. Preserve shared conventions (JSON in `/json`, CSV in `/csv`, modular form runtime in `js/form-0x-*.js`).
  3. Log every file create/update/delete in `CHANGELOG.md` with timestamp.
  4. Sync `FORM_SCHEMA.md` and `TECHNICAL_INVENTORY.md` whenever form fields/functions/ownership change.
- Do not introduce provider-specific private conventions that diverge from these project documents.

### Handoff Checklist
1. Read latest `/.context/session-*.md` first.
2. Read `AGENTS.md` for local working rules.
3. Confirm architecture/governance alignment in `GEMINI.md` and `KNOWLEDGE.md`.
4. Apply edits with current conventions (`/json`, `/csv`, `js/form-0x-*.js`) while steering new backend work toward D1/R2/Clerk.
5. Update `CODEBASE.md`, `FORM_SCHEMA.md`, and `TECHNICAL_INVENTORY.md` when routes, data contracts, symbols, or fields change.
6. Append timestamped `CHANGELOG.md` entry before ending the session.

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
3.  **Claim Search Hygiene:** Claim autocomplete must consume sanitized brand-only rows (exclude URL/phone/address/legal-entity/contact-label noise) consistently in builder (`js/build-listing.js`), API fallback (`functions/get-franchises.js`), and frontend form modules (`js/form-01-state-helpers.js`, `js/form-02-claim-workflow.js`).
4.  **SSG Engine (current):** Scripts in `js/` fetch Sheets/CSV data and inject into `templates/` via GitHub Actions.
5.  **Serverless Logic (current):** Functions handle Sheets API access and form submissions with Google JWT auth.
6.  **Target Backend:** D1 becomes the source of truth; R2 stores franchise assets; Clerk identifies users and gates protected franchisee/franchisor/admin routes.
7.  **Target Validation/Authorization:** Zod validates untrusted runtime input; D1 role records authorize protected actions server-side.

## Key Technical Components
- **Smart Form Logic (`js/form-01-*.js` ... `js/form-07-*.js`):** Modular runtime handling calculations, validation, claim workflow, and submit orchestration.
- **Media Handling:** Existing Cloudinary/legacy URL transforms remain transitional; new upload/storage work should target Cloudflare R2.
- **SEO & Analytics:** Priority sorting and automatic JSON-LD injection for Verified pages.

## Key Directories & Files
- `/functions/`: Serverless edge functions.
- `/js/`: Client-side logic and SSG builder scripts.
- `/templates/`: Source HTML templates for the SSG engine.
- `PRD.md`: Technical project roadmap and feature details.

## Development Conventions
- **Static First:** Pre-generate all content pages for SEO.
- **Surgical HTML Edits:** Protect Elementor's DOM structure.
- **Auth Implementation:** Current Google API JWT signing uses native Web Crypto in Functions. New user auth must use Clerk rather than custom account logic.
- **Role Implementation:** New role checks must use D1 server-side state. Clerk metadata/session claims may be used only for small UI routing hints.
