# AGENTS.md - Local Audit Notes & Working Rules

Last updated: 2026-04-04 (Asia/Jakarta)

## Persistent Rules
- Every file create/update/delete in this repository must be recorded in `CHANGELOG.md` in the same work session.
- Before making form/logic edits, check `GEMINI.md`, `FORM_SCHEMA.md`, and `TECHNICAL_INVENTORY.md` for continuity constraints.
- Keep this file updated when new project-level conventions are introduced.
- For claim-search data (`UNCLAIMED`), preserve strict brand sanitization (exclude URL/phone/address/legal-entity/contact-label rows) consistently across `js/build-listing.js`, `functions/get-franchises.js`, and modular form scripts (`js/form-01-state-helpers.js`, `js/form-02-claim-workflow.js`).
- Do not reintroduce naive CSV parsing for sheet fallbacks; keep quote-aware parsing to avoid `brand_name` column shifts.
- Keep repository data assets centralized: JSON files in `/json` and CSV files in `/csv`. Update script paths/docs together when adding or moving data assets.
- Keep per-session context snapshots in `/.context` using timestamped Markdown files (`session-YYYYMMDD-HHmm.md`) for new-session continuity.
- For large legacy files such as `/daftar/index.html`, avoid full rewrites; use targeted edits with enough surrounding context to prevent accidental loss.
- Keep form runtime logic modular in flat prefixed files (`js/form-01-*.js` ... `js/form-07-*.js`); avoid reintroducing monolithic `js/form-franchise.js` logic.
- After editing files larger than 500 lines, verify line count immediately to catch unintended truncation.
- Before changing files in a directory, check nearby local `.md` or `.txt` context files first because they may contain restoration notes or historical constraints.
- When adding or refactoring form/logic features, sync `FORM_SCHEMA.md` and `TECHNICAL_INVENTORY.md` if fields, functions, or key variables change.
- Every `CHANGELOG.md` entry must include date and hour with timezone.

## Context Source
- `GEMINI.md` has been reviewed and is treated as the project context baseline.
- Historical context for the registration page must account for the route/folder rename from `/pendaftaran` to `/daftar`; older commits, notes, and temporary comparison files may still use the old path.

## What Was Checked
- Repository structure and key runtime areas (`/js`, `/functions`, `/daftar`).
- Core custom scripts:
  - `js/form-utils.js`
  - `js/form-01-state-helpers.js`
  - `js/form-02-claim-workflow.js`
  - `js/form-03-navigation-steps.js`
  - `js/form-04-calculation-city.js`
  - `js/form-05-country-whatsapp.js`
  - `js/form-06-submit-validation.js`
  - `js/form-07-init.js`
  - `js/build-listing.js`
  - `js/build-details.js`
  - `js/build-sitemap.js`
  - `functions/get-franchises.js`
  - `functions/form-submit.js`
- Integration points in `/daftar/index.html` for tab switching and form scripts.
- CSS architecture in `/css/form-franchise/` (modular split files).

## Fix Applied During Audit
- File: modular form runtime (`js/form-02-claim-workflow.js`, previously `js/form-franchise.js`)
- Issue: `window.renderPackageInputs(1)` was called in claim flow but no local definition exists.
- Action: Added defensive checks before calling it, so claim mode does not crash if the function is unavailable.
- Additional hardening: submission error now falls back to `result.error` when `result.message` is missing.

## Enhancement Applied: Aggressive Auto-Save (2026-04-04 19:15)
- **Files Modified**:
  - `js/form-01-state-helpers.js`: Enhanced `saveFranchisorDraft` with error handling + visual feedback
  - `js/form-06-submit-validation.js`: Added 6 independent auto-save triggers (debounced, periodic, navigation, visibility, unload, tab switch)
  - `daftar/index.html`: Added `#autosave-indicator` HTML element
  - `css/form-franchise/01-utilities.css`: Added toast notification styles
- **Documentation Created**:
  - `AUTO_SAVE.md`: Comprehensive implementation reference with triggers, lifecycle, UX scenarios, and testing checklist
- **Documentation Updated**:
  - `TECHNICAL_INVENTORY.md`, `CLAIM_WORKFLOW.md`, `KNOWLEDGE.md`, `QWEN.md`, `FORM_SCHEMA.md`, `AGENTS.md`, `CHANGELOG.md`
- **Line Count Verification**:
  - `form-06-submit-validation.js`: 220 lines ✓
  - `form-01-state-helpers.js`: 236 lines ✓
  - `daftar/index.html`: 1219 lines ✓
- **Syntax Validation**: Both JS files pass `node --check` ✓

## Enhancement Applied: Franchisee Multi-Step Form (2026-04-04 19:45)
- **Files Created**:
  - `js/form-08-franchisee-steps.js`: Franchisee 2-step navigation logic (129 lines)
  - `FRANCHISEE_MULTISTEP.md`: Comprehensive implementation guide
- **Files Modified**:
  - `daftar/index.html`: Converted Franchisee form to 2-step layout with step indicator, progress bar, and navigation buttons
  - `TECHNICAL_INVENTORY.md`: Added form-08 function inventory
  - `FORM_SCHEMA.md`: Updated Franchisee table with step column and multi-step documentation
  - `QWEN.md`: Added Franchisee 2-step structure description
  - `AGENTS.md`: Added FRANCHISEE_MULTISTEP.md to instruction index
  - `CHANGELOG.md`: Logged all changes
- **Key Features**:
  - Step 1: Data Pribadi (name, city, WhatsApp, email)
  - Step 2: Minat & Budget (interest, budget, location, message)
  - Step validation before proceeding
  - Progress bar and step indicators
  - localStorage persistence for step restoration
  - Separate from Franchisor step logic (no interference)
- **Submission Integrity**:
  - Form ID unchanged (`franchiseeForm`)
  - All field names unchanged
  - Submit listener unchanged (still works identically)
  - No breaking changes to backend
- **Line Count Verification**:
  - `form-08-franchisee-steps.js`: 129 lines ✓
  - `daftar/index.html`: 1255 lines (grew from 1220, +35 lines) ✓
- **Syntax Validation**: `form-08-franchisee-steps.js` passes `node --check` ✓

## Current Status
- No other blocking JS wiring issues found in the checked custom paths.
- Note: direct `node --check` validation is restricted in this sandbox due an EPERM path-resolution issue; review was completed via source inspection and targeted cross-reference checks.

## Root Markdown Instruction Index
- `KNOWLEDGE.md`: Consolidated operational knowledge (quickstart, architecture, conventions, gotchas). Use as first-stop implementation context.
- `GEMINI.md`: Primary architecture and governance source of truth; prioritize it for technical direction.
- `PRD.md`: Feature roadmap and requirement scope (non-changelog).
- `FORM_SCHEMA.md`: Canonical form input inventory. Do not remove/rename fields in `/daftar/index.html` without updating this file.
- `TECHNICAL_INVENTORY.md`: Canonical inventory of key functions/variables in `/js` and `/functions`. Update after logic additions/removals/refactors.
- `CLAIM_WORKFLOW.md`: Canonical claim-flow reference (frontend step behavior, local persistence, backend append/cleanup semantics).
- `AUTO_SAVE.md`: Comprehensive auto-save implementation reference (triggers, lifecycle, UX scenarios, testing).
- `FRANCHISEE_MULTISTEP.md`: Franchisee form 2-step implementation guide (structure, navigation, validation, testing).
- `FORM_VALIDATION_FIXES.md`: Form validation and auto-formatting guide (name title-case, WhatsApp formatting, email validation, city autocomplete).
- `FORM_UX_FIXES.md`: UX improvements guide (step navigation, visual feedback, email errors, console logging).
- `TEST_DATA_GENERATOR.md`: Test data generator implementation plan (FAB, data generation, Google Sheets integration, cleanup).
- `DEBUGGING.md`: Personal debugging reference (`?dev=1` toggle + DevTools disable-cache workflow).
- `franchise-info-form.md`: Detailed UX/data spec for franchise listing form sections and conditional logic; use as reference when revising form UX.
- `README.md`: Currently auto-generated sitemap URL listing; treat as generated artifact.
- `AGENTS.md`: Persistent local operating instructions for future coding sessions.
- `CHANGELOG.md`: Mandatory running log of repository modifications.
- `css/form-franchise/CSS_USAGE_MAP.md`: Selector/module mapping for the split form CSS architecture and usage references.
- `/.context/*.md`: Timestamped session context snapshots for cross-session continuity.

## Additional Project Notes
- The registration page was historically developed under `/pendaftaran/index.html` and later renamed to `/daftar/index.html`. When tracing git history or comparing old artifacts such as `old_version.txt`, treat them as the same page lineage.
