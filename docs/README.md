# Documentation Index

Last updated: 2026-07-05 23:27 (Asia/Jakarta)

This repository previously accumulated many root-level Markdown files. Going forward, root Markdown should stay small and operational. Longer references live under `docs/` and should be linked instead of duplicated.

## Source Of Truth
- `AGENTS.md`: working rules for coding sessions.
- `CODEBASE.md`: living map of project-owned logic, routes, files, data contracts, and data flows.
- `AUDIT.md`: migration audit and progress tracker.
- `docs/architecture/TECH_STACK_DECISIONS.md`: stack decisions for Astro, D1, R2, Clerk, TypeScript, Zod, SQL migrations, roles, and Drizzle timing.
- `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md`: comparison of twice-daily static publishing versus GitHub Actions polling/direct deploy for D1-backed SEO pages.
- `docs/architecture/AUTH_ONBOARDING_NAV_PLAN.md`: implementation tracker for public login/register, role-first onboarding, `/daftar` completion, and logged-in navbar state.
- `docs/architecture/PROFILE_PAGE_PLAN.md`: implementation tracker for `/profil`, read-only identity fields in `/daftar`, profile/listing ownership UX, and owner-facing profile APIs.
- `docs/architecture/INTERNATIONAL_FRANCHISOR_POLICY.md`: low-friction defaults and public-display rules for Indonesian vs overseas franchisor origin/target-market metadata.
- `docs/ux/TRAFFIC_FUNNEL_UX_AUDIT.md`: traffic-readiness and UX tracker for homepage-to-member-to-Premium conversion flow.
- `FORM_SCHEMA.md`: canonical form field inventory.
- `FORM_PRESERVATION_MANDATE.md`: binding rule set for preserving existing form fields and payloads.
- `TECHNICAL_INVENTORY.md`: function/module inventory for runtime and migration code.
- `DASHBOARD.md`: admin/staff dashboard progress tracker and planning document.
- `SUGGESTION.md`: assistant-owned proactive recommendation backlog for product, UX, reliability, performance, security, data quality, operations, migration safety, and developer workflow improvements.
- `CHANGELOG.md`: chronological record of every repository file change.

## Architecture
- `docs/architecture/TECH_STACK_DECISIONS.md`: migration direction and operational notes for D1, Cloudflare account switching, static generation, roles, and importer cutover.
- `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md`: D1-to-static freshness strategy, polling/build options, recommended 30-minute GitHub Actions path, and guardrails.
- `docs/architecture/CLERK_SETUP.md`: Clerk dashboard/env setup, custom auth flow, D1 user mapping, bidirectional sync endpoints, and role authorization rules.
- `docs/architecture/AUTH_ONBOARDING_NAV_PLAN.md`: staged plan for reconciling lightweight account creation with `/daftar` profile/listing completion and public navbar account state.
- `docs/architecture/PROFILE_PAGE_PLAN.md`: staged plan for the protected `/profil` account center, side-tab sections, D1 profile/listing reads, and owner edit workflows.
- `docs/architecture/INTERNATIONAL_FRANCHISOR_POLICY.md`: default Indonesia behavior, non-Indonesia form expansion, flag display rules, and legacy origin/target backfill policy.
- `docs/architecture/PREMIUM_MONETIZATION_PLAN.md`: premium network membership, `/premium` page, manual payment operations, conversion tracking, payment confirmation, traffic growth, and renewal roadmap.
- `docs/architecture/RESEND_EMAIL_DELIVERY.md`: Resend/Cloudflare Pages email delivery setup for queued Premium emails, reports, and reminders.

## Forms
- `docs/forms/AUTO_SAVE.md`: franchisor draft autosave behavior.
- `docs/forms/CLAIM_WORKFLOW.md`: claim-search and claim submission behavior.
- `docs/forms/FRANCHISEE_MULTISTEP.md`: franchisee multi-step form behavior.
- `docs/forms/FORM_VALIDATION_FIXES.md`: form validation and formatting behavior.
- `docs/forms/FORM_UX_FIXES.md`: form UX fixes and debug notes.
- `docs/forms/franchise-info-form.md`: detailed franchise listing form UX/data specification.

## Testing And Debugging
- `docs/testing/DEBUGGING.md`: personal `/daftar?dev=1` and cache debugging workflow.
- `docs/testing/TEST_DATA_GENERATOR.md`: dev-only test data generator plan and cleanup notes.

## UX And Conversion
- `docs/ux/TRAFFIC_FUNNEL_UX_AUDIT.md`: readiness verdict, code-path evidence, visual critique, and implementation tracker for the homepage, free member, `/profil`, and Premium funnel.

## Compatibility Pointer Files
`GEMINI.md`, `KNOWLEDGE.md`, `QWEN.md`, and `PRD.md` may remain as compatibility entry points for other tools or older workflows. Do not let them become independent sources of truth. They should point back to the canonical files above when project direction changes.

## Documentation Rules
- Prefer updating one canonical document plus links from this index.
- Avoid copying the same migration strategy into multiple model-specific files.
- When a route, script, schema, generated asset, or backend responsibility changes, update `CODEBASE.md`.
- When a stack decision changes, update `docs/architecture/TECH_STACK_DECISIONS.md`.
- When a user-facing migration task progresses, update `AUDIT.md`.
- Every file move or edit still needs a `CHANGELOG.md` entry.
- For Cloudflare Pages deploy changes, keep `wrangler.toml`, `CODEBASE.md`, `AUDIT.md`, and the relevant architecture doc aligned. The current Pages output is `dist`, and the project build command should be `pnpm run build`.
