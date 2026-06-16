# GEMINI.md - Compatibility Entry Point

Last updated: 2026-06-17 02:00 (Asia/Jakarta)

This file is kept so older Gemini-oriented workflows still have a root entry point. It is not an independent source of truth.

Use these canonical documents instead:
- `AGENTS.md` for working rules.
- `docs/README.md` for the documentation index.
- `CODEBASE.md` for the current codebase map.
- `AUDIT.md` for migration progress.
- `docs/architecture/TECH_STACK_DECISIONS.md` for the Astro/D1/R2/Clerk/TypeScript/Zod direction.
- `FORM_SCHEMA.md`, `FORM_PRESERVATION_MANDATE.md`, and `TECHNICAL_INVENTORY.md` for form/runtime contracts.

Project direction: D1 is the shared source of truth, Google Sheets is archive/import-only, public franchise SEO pages are generated from D1 through the bridge plus Astro static routes, and future authenticated work should use Clerk identity with D1-authoritative roles.
