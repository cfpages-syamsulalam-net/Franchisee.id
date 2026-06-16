# KNOWLEDGE.md - Compatibility Entry Point

Last updated: 2026-06-17 02:00 (Asia/Jakarta)

This file no longer duplicates project architecture. Use the canonical docs:
- `docs/README.md` for the documentation map.
- `AGENTS.md` for working rules and guardrails.
- `CODEBASE.md` for file relationships and data flows.
- `AUDIT.md` for migration status.
- `docs/architecture/TECH_STACK_DECISIONS.md` for stack direction.

Current direction: Astro static pages should consume D1-backed franchise data, Cloudflare D1 `franchise_db` is shared across the franchise network, R2 will hold assets, Clerk will handle identity, and D1 roles authorize access.
