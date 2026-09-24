# Brand claim guard, 2026-09-24

Owner: `/form-submit` pending claim and `/dashboard-data` admin review. Updated code, documentation and remote D1 triggers in migration 0035. Local check: `pnpm exec tsx scripts/check-claim-workflow.ts`; SQLite trigger semantics checked separately; run `pnpm run build:astro`. User expects commit/push to GitHub and Cloudflare deployment parity. Production browser flow still requires controlled test accounts and disposable unclaimed listing. Remote migration history lists 0034 and 0035 unapplied despite direct application; 0035 SQL is idempotent. Never use a real brand to test ownership changes.
Follow-up: blocked the exact existing-brand-name route through new-brand registration; regression covers this bypass.
