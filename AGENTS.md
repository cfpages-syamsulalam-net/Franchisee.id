# AGENTS.md - Local Audit Notes & Working Rules

Last updated: 2026-04-04 (Asia/Jakarta)

## Persistent Rules
- Every file create/update/delete in this repository must be recorded in `CHANGELOG.md` in the same work session.
- Before making form/logic edits, check `GEMINI.md`, `FORM_SCHEMA.md`, and `TECHNICAL_INVENTORY.md` for continuity constraints.
- Keep this file updated when new project-level conventions are introduced.
- For large legacy files such as `/daftar/index.html` and `js/form-franchise.js`, avoid full rewrites; use targeted edits with enough surrounding context to prevent accidental loss.
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
  - `js/form-franchise.js`
  - `js/build-listing.js`
  - `js/build-details.js`
  - `js/build-sitemap.js`
  - `functions/get-franchises.js`
  - `functions/form-submit.js`
- Integration points in `/daftar/index.html` for tab switching and form scripts.

## Fix Applied During Audit
- File: `js/form-franchise.js`
- Issue: `window.renderPackageInputs(1)` was called in claim flow but no local definition exists.
- Action: Added defensive checks before calling it, so claim mode does not crash if the function is unavailable.
- Additional hardening: submission error now falls back to `result.error` when `result.message` is missing.

## Current Status
- No other blocking JS wiring issues found in the checked custom paths.
- Note: direct `node --check` validation is restricted in this sandbox due an EPERM path-resolution issue; review was completed via source inspection and targeted cross-reference checks.

## Root Markdown Instruction Index
- `KNOWLEDGE.md`: Consolidated operational knowledge (quickstart, architecture, conventions, gotchas). Use as first-stop implementation context.
- `GEMINI.md`: Primary architecture and governance source of truth; prioritize it for technical direction.
- `PRD.md`: Feature roadmap and requirement scope (non-changelog).
- `FORM_SCHEMA.md`: Canonical form input inventory. Do not remove/rename fields in `/daftar/index.html` without updating this file.
- `TECHNICAL_INVENTORY.md`: Canonical inventory of key functions/variables in `/js` and `/functions`. Update after logic additions/removals/refactors.
- `franchise-info-form.md`: Detailed UX/data spec for franchise listing form sections and conditional logic; use as reference when revising form UX.
- `README.md`: Currently auto-generated sitemap URL listing; treat as generated artifact.
- `AGENTS.md`: Persistent local operating instructions for future coding sessions.
- `CHANGELOG.md`: Mandatory running log of repository modifications.

## Additional Project Notes
- The registration page was historically developed under `/pendaftaran/index.html` and later renamed to `/daftar/index.html`. When tracing git history or comparing old artifacts such as `old_version.txt`, treat them as the same page lineage.
