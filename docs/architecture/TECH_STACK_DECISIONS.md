# Franchisee.id Tech Stack Decisions

Last updated: 2026-06-30 08:38 (Asia/Jakarta)

## Purpose
This document records stack decisions for the migration from a static WordPress export with Google Sheets storage into an authenticated franchise directory application. Treat it as the implementation compass for new backend, data, auth, and validation work.

## Decisions

| Area | Decision | Notes |
| --- | --- | --- |
| Default language | TypeScript for all new app, backend, schema, importer, and migration-adjacent code. | Existing legacy JavaScript can remain until touched or migrated. New Astro routes, Cloudflare handlers, importers, and shared utilities should be `.ts`. |
| Runtime validation | Zod for request bodies, form payloads, Clerk webhook payloads, environment/config parsing, CSV import rows, and D1 write inputs. | TypeScript checks code at build time; Zod checks untrusted runtime data before it reaches database writes or business logic. |
| Database | Cloudflare D1 `franchise_db` as the application source of truth. | Google Sheets is archive/import-only; new writes should target D1 after validation and authorization. |
| Migrations | Source-controlled SQL migrations from the beginning. | Use Wrangler D1 migrations or Drizzle-generated SQL, but keep migration files committed and reviewable. |
| Auth | Clerk for login/register and identity. | Clerk user ids map into D1 `users.clerk_user_id`. |
| Roles | D1-authoritative roles: `franchisee`, `franchisor`, `admin`, `staff`. | Clerk metadata/session claims may cache small UI hints only; server authorization must verify D1 role/permission state. |
| Public onboarding | Lightweight account creation happens in the custom Clerk auth UI; business/profile completion happens in `/daftar`. | Role must be selected before public registration, including Google SSO. `/daftar` keeps its URL but should be presented as profile/listing completion after login. See `docs/architecture/AUTH_ONBOARDING_NAV_PLAN.md`. |
| Assets | Cloudflare R2 for logos, covers, gallery images, proposal PDFs, and imported legacy assets. | D1 stores metadata and R2 object keys; R2 stores binary files. |
| Framework | Astro on Cloudflare by default. | Current workspace uses Astro 5.x because local Node is 20.19.4. Astro 6 requires Node >=22.12.0. Next.js remains an option only if dashboard complexity becomes strongly React-heavy. |
| Styling | Existing CSS only unless explicitly approved. | Do not add a styling framework for the migration. |
| Package manager | pnpm only. | Use `pnpm install`, `pnpm run`, and `pnpm exec`. |

## Shared Network Database
`franchise_db` is designed to be shared by the owned franchise network, including:

- `franchisee.id`
- `franchisor.id`
- `franchise.id`
- `waralaba.id`
- `franchise.co.id`
- `waralaba.co.id`
- Future owned franchise/waralaba domains

This is possible and is the right direction if all sites use the same D1 binding/database and server-side authorization model. The important rule is that each site should write to shared canonical records, not create a separate copy of the same franchise per domain.

The initial schema supports this with:

- `network_sites`: registered domains/sites in the network.
- `franchises`: one canonical franchise/listing record.
- `franchise_site_publications`: where a franchise is visible and which slug/canonical URL each site uses.
- `subscriptions` and `subscription_site_entitlements`: payment/plan state that can grant publication across one or all network sites.
- `premium_orders`, `premium_payment_confirmations`, and `franchise_subscriptions`: current manual premium membership workflow for transfer orders, owner confirmations, admin review, and active listing membership state.
- `payment_methods`, `premium_funnel_events`, `premium_notifications`, `notification_email_queue`, and `premium_subscription_reminders`: current premium operations workflow for admin-managed payment instructions, conversion tracking, owner/admin status messages, queued/sent payment emails, expiry follow-up, and renewal-reminder idempotency.
- `audit_events`: who changed what, from which site.
- `franchise_product_events`: privacy-safe interaction signals for ranking/recommendations without storing IP or user-agent data.
- `operation_events`: operational telemetry for dashboard health, webhook/API failure visibility, and support diagnostics.

For example, one franchisor payment can activate a premium membership for one `franchise_id`, and the approval flow can grant publication to `franchisee.id`, `franchise.id`, `franchisor.id`, `waralaba.id`, and the other network domains without duplicating the listing.

## Why Zod
Zod is a TypeScript-first schema validation library. In this project, it fills the gap TypeScript cannot cover:

- TypeScript cannot prove that a browser form submission, CSV row, Clerk webhook, or environment variable is valid at runtime.
- Zod parses unknown input into validated data before it reaches D1 or application services.
- Zod schemas can infer TypeScript types, reducing duplicate interfaces between forms, APIs, importers, and database code.
- Zod should sit at all trust boundaries: HTTP request bodies, query parameters, imports from `/csv`, legacy Google Sheets rows, Clerk webhook payloads, and admin actions.
- Shared schema modules now exist for active validation paths: `functions/_shared-schemas.js` covers Pages Function payload/query/action schemas, while `src/lib/shared-schemas.ts` covers CSV import rows and D1 static snapshot rows used by import/build/Astro code.

Practical example for later implementation:

```ts
import { z } from "zod";

export const RoleSchema = z.enum(["franchisee", "franchisor", "admin", "staff"]);

export const FranchiseeProfileInputSchema = z.object({
  full_name: z.string().trim().min(2),
  email: z.string().trim().email(),
  whatsapp: z.string().trim().min(8),
  city: z.string().trim().optional(),
  budget: z.string().trim().optional(),
});

export type FranchiseeProfileInput = z.infer<typeof FranchiseeProfileInputSchema>;
```

## SQL Migrations
D1 schema changes must be made through committed SQL migration files. Do not manually mutate production tables without recording the change in a migration.

Recommended first commands, adjusted for the final database name:

```bash
pnpm exec wrangler d1 migrations apply franchise_db --local
pnpm exec wrangler d1 migrations apply franchise_db --remote
```

Recommended binding:

```jsonc
{
  "d1_databases": [
    {
      "binding": "franchise_db",
      "database_name": "franchise_db",
      "database_id": "<cloudflare-d1-database-id>",
      "migrations_dir": "migrations"
    }
  ]
}
```

The Pages dashboard binding currently uses `franchise_db` for both binding name and database value. Wrangler still needs the real Cloudflare D1 database UUID in local config before remote migrations can be applied from this repository.

Active UUID for `franchise_db`: `812cd8ac-edd0-45d9-981f-c9a15358317b`.

Remote migration status:
- Earlier direct Wrangler attempts failed because the ambient `CLOUDFLARE_API_TOKEN` was scoped to the wrong account.
- `cfman` account alias `franchise-network` now reaches account `0ba63b7f0096bc267a93fe5c80b1f571`.
- If Wrangler fails on `/memberships` with authentication error `10000`, the token may still be valid but unable to perform account discovery. Set `CLOUDFLARE_ACCOUNT_ID=0ba63b7f0096bc267a93fe5c80b1f571` before `cfman wrangler` D1 commands.
- `0001_initial_network_schema.sql` was applied remotely to `franchise_db` on 2026-06-16.
- `0007_contacts_quality_dashboard.sql` was applied remotely to `franchise_db` on 2026-06-28 and verified to create `franchise_contacts` and `franchise_quality_checks`.
- `0009_premium_membership.sql` was applied remotely to `franchise_db` on 2026-06-28 and verified to create `premium_orders`, `premium_payment_confirmations`, and `franchise_subscriptions`.
- `0010_premium_operations.sql` was applied remotely to `franchise_db` on 2026-06-29 and verified to create `payment_methods`, `premium_funnel_events`, and `premium_notifications`, including default `manual_bca` payment details.
- `0011_notification_email_queue.sql` was applied remotely to `franchise_db` on 2026-06-30 and verified to create `notification_email_queue`.
- `0012_premium_email_worker_guardrails.sql` was applied remotely to `franchise_db` on 2026-06-30 and verified to add email delivery metadata, `premium_subscription_reminders`, due-email indexes, and Premium duplicate-order/subscription guardrails.
- Remote verification confirmed `d1_migrations` contains `0001_initial_network_schema.sql`.

## Cloudflare Account Switching
Use `cfman` to manage multiple Cloudflare accounts and run Wrangler commands under an explicit account alias. This avoids accidentally applying D1 migrations with the wrong `CLOUDFLARE_API_TOKEN`.

Recommended local setup:

```bash
npx cfman token add --name franchise-network --token <cloudflare_api_token_for_franchise_db_account>
npx cfman wrangler --account franchise-network d1 list
npx cfman wrangler --account franchise-network d1 migrations apply franchise_db --remote
```

Current status as of 2026-06-16:
- `npx cfman --help` works through `npx`.
- `franchise-network` is configured and can run remote D1 commands.
- Run Cloudflare commands sequentially; multiple parallel `cfman wrangler` invocations were unreliable during verification.

Do not commit tokens to this repository. `cfman` stores them in the user config directory outside the repo.

## D1 Static Public Generation
Public franchise listing/detail pages must stay static HTML for SEO. The source of truth is D1, not generated legacy HTML or Google Sheets.

D1 changes do not automatically trigger a Cloudflare Pages build. D1 is a database, not a build event source. Static HTML only reflects a D1 change after a new Pages build/deploy runs `pnpm run build:astro` and regenerates the D1 snapshot/pages.

Current bridge:

```bash
pnpm run build:d1:franchises:dry
pnpm run build:d1:franchises
pnpm run build:astro
```

`scripts/build-d1-franchise-pages.ts` currently:
- Queries published `site_franchisee_id` records from `franchise_db`.
- Includes imported public `phone` and `office_address` fields in the static snapshot so unclaimed detail pages can still show existing public contact data.
- Renders `/peluang-usaha/index.html` and flat `/peluang-usaha/{slug}.html` detail files using the existing WordPress-exported templates.
- Writes `json/d1-franchise-static-data.json` for Astro static routes.
- Writes `json/d1-generated-pages-manifest.json` so unchanged pages are skipped on rerun.
- Prunes only pages that were previously generated by this D1 builder and still contain the `d1-generated:franchisee.id` marker.
- Regenerates `json/unclaimed-brands.json` from D1 unclaimed rows for the claim-search frontend.

Astro scaffold:
- `astro.config.mjs` is configured for static output with `trailingSlash: "never"` and `build.format: "preserve"`.
- `src/lib/franchise-static.ts` validates the D1 snapshot with Zod and renders the existing listing/detail templates.
- `src/pages/peluang-usaha/index.astro` builds canonical `/peluang-usaha/index.html` with query-param controls for search, recommendation/popular/alphabetical/category sorting, status filtering, and category filtering.
- `src/pages/peluang-usaha/[slug].astro` uses `getStaticPaths` to build one flat `/peluang-usaha/{slug}.html` file per franchise slug under `build.format: "preserve"`.
- Legacy duplicate directory/category URLs (`/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori`, `/category`, and known category aliases) are redirect-only compatibility paths to `/peluang-usaha` query-param states.
- Directory cards use a CSS-only fallback placeholder when D1 has no cover/logo URL, so missing legacy placeholder image assets do not break the public archive layout.
- Franchise detail pages are listings, not blog posts; generated output removes the legacy header placeholder and fake WordPress `By admin` date block, and detail metadata is generated from the franchise row instead of inherited post metadata.
- Unclaimed detail pages are not contactless by default. If D1 has imported public phone, office address, or social/contact data, the page may show it with clear public/unclaimed wording and a claim CTA for corrections.
- Raw legacy phone text is presentation-normalized in `src/lib/franchise-static.ts` during Astro rendering. The renderer splits common Indonesian multi-number strings, preserves labels such as Marketing, WA/WhatsApp, Kantor, Office, and Owner, outputs `tel:` links for numbers, and adds WhatsApp claim-notification links for unclaimed mobile/WhatsApp-capable numbers.
- Mostly all-uppercase imported descriptions are presentation-normalized in `src/lib/franchise-static.ts` during Astro rendering while preserving legal prefixes/acronyms such as PT, CV, UD, BPOM, NIB, and F&B. Raw D1 text is not mutated by the renderer.
- `migrations/0007_contacts_quality_dashboard.sql` adds `franchise_contacts` for high-confidence normalized contact data and `franchise_quality_checks` for persistent dashboard quality checks. Current public rendering still reads the existing snapshot fields until the static generator is intentionally moved to the normalized table.
- `astro.config.mjs` uses `build.format: "preserve"` so index routes remain index files while detail pages can be stored as flat `.html` files.
- `pnpm run build:astro` refreshes the D1 snapshot first, then builds the D1-backed public directory pages into `dist/` from the current D1 data.
- `pnpm run build` is the conventional Cloudflare Pages entrypoint and delegates to `pnpm run build:astro`; `wrangler.toml` declares `pages_build_output_dir = "dist"`.
- Cloudflare Pages project settings must still include a build command. If no build command is configured, Pages skips dependency installation and the Functions bundler cannot resolve npm imports such as `zod` or `@clerk/backend`.
- Cloudflare Pages config validation rejects `account_id` in `wrangler.toml`; account selection must come from the Pages project, `cfman`, or GitHub environment/variables.
- The D1 static builder prefers the Cloudflare D1 HTTP API for build-time reads when `CLOUDFLARE_API_TOKEN` is available. This avoids Wrangler account-discovery calls during Cloudflare Pages and CI builds.
- The build output is hybrid: Astro writes D1-backed routes to `dist`, then `scripts/copy-legacy-static.mjs` copies legacy static pages/assets into `dist` without overwriting Astro output.
- The legacy copy skips top-level `/peluang-usaha`, duplicate directory archives, and known category aliases, then rewrites copied HTML links to canonical `/peluang-usaha` query URLs so legacy static pages do not leak duplicate directory routes.

Dashboard scaffold:
- `/dashboard` is implemented as a static Astro shell so the project can keep the same Cloudflare Pages/Astro deployment path.
- `/dashboard-data` is the protected Pages Function and authorization boundary. It requires D1 role `staff`; `admin` is allowed through the existing elevated-role rule.
- Dashboard MVP scope is Franchisee.id only (`site_franchisee_id`). Multi-site centralized dashboard work is deferred.
- `migrations/0004_dashboard_operations.sql` adds `listing_outreach_events`, `staff_auto_approval_rules`, and `listing_edit_suggestions`.
- `migrations/0007_contacts_quality_dashboard.sql` adds normalized contact and persistent quality-check tables for dashboard operations.
- Staff WhatsApp outreach uses generated `wa.me` links with prefilled text; no WhatsApp API is used. Outreach is logged only after staff manually confirms the message was sent.
- Staff edit policy is implemented in the dashboard MVP: staff submit guided field changes backed by shared editable-field definitions; admin approve/reject applies approved values field-by-field to D1, writes audit events, and queues static rebuilds. Active `staff_auto_approval_rules` allow trusted staff edits to apply immediately while preserving the same audit/suggestion trail.
- Data Quality can refresh persistent checks and normalized contacts from current listing/profile fields. The read path falls back to computed warnings before migration/refresh data exists.
- Claim review is implemented for pending `franchise_claims`: admin approval attaches owner/profile data where present, moves unclaimed listings to free claimed state, writes audit events, and queues static rebuilds. Rejection records the review without changing the public listing.
- Leads and system health are MVP panels. `operation_events` now backs webhook/API failure visibility, recent operation summaries, and dashboard health counts. Premium Operations shows funnel/payment-method data, recent payment notifications, upcoming expiries, queued email rows, and admin retry/cancel controls. Deeper R2 asset health still needs a dedicated data model.
- Admin publication controls can update `franchise_site_publications.publication_status` per site and enqueue rebuild requests for the affected site. Franchisors see read-only distribution status in `/profil`.
- Premium email delivery uses `/premium-email-worker`, a protected Pages Function triggered by `.github/workflows/premium-email-worker.yaml`. The first provider path is Resend via `RESEND_API_KEY`; required runtime setup also includes `PREMIUM_EMAIL_WORKER_SECRET`, `PREMIUM_EMAIL_FROM`, and optional `PREMIUM_EMAIL_REPLY_TO`.

### D1 Change To Static Publish Mechanism
Target mechanism for franchisor edits, admin edits, claims, listing deletes, and publication-status changes:

Detailed strategy comparison lives in `docs/architecture/D1_STATIC_PUBLISH_STRATEGY.md`. Current decision: twice-daily publishing is the safe baseline, but the preferred target after the dirty queue exists is 30-minute GitHub Actions polling where GitHub checks D1 and calls the Cloudflare Pages Deploy Hook only when D1 is dirty and guardrails allow a publish. GitHub direct `dist/` deploy remains the fallback if Cloudflare Pages build quota becomes constrained. The poller must not commit generated output back to `main`, because that can trigger an extra Cloudflare Git build.

Implementation status:
- `migrations/0003_site_publish_queue.sql` creates `site_rebuild_requests` and `site_publish_state`; it was applied to remote `franchise_db` on 2026-06-18.
- `functions/_site-publish-queue.js` provides queue statements for Pages Functions.
- `/form-submit` enqueues public-page rebuild requests for franchisor listing submissions, claim submissions, dev unclaimed creation, and dev test-data clearing.
- `/dashboard-data` enqueues public-page rebuild requests for approved listing edit suggestions, auto-approved trusted staff edits, and approved claim reviews.
- `.github/workflows/d1-static-publish.yaml` runs the 30-minute poller and supports Cloudflare Deploy Hook publishing plus direct `dist/` deploy fallback.
- Repository secrets still need to be set before the workflow can run in GitHub: `CLOUDFLARE_API_TOKEN` and `PAGES_DEPLOY_HOOK_FRANCHISEE_ID`.

1. All app-owned D1 mutation endpoints must write the data change and a `site_rebuild_requests` row in the same logical operation.
2. Rebuild requests are scoped by `site_id`, `franchise_id`, `reason`, and `status` so multiple edits can be coalesced instead of triggering one build per field edit.
3. D1 writes must not call the Cloudflare Pages Deploy Hook immediately by default.
4. Safe baseline: a scheduled publish job runs twice daily, checks for pending rebuild requests, and calls the Cloudflare Pages Deploy Hook for the relevant site only when there is something to publish.
5. Preferred target: a GitHub Actions poller runs every 30 minutes, checks D1 for pending rebuild requests, and calls the Cloudflare Pages Deploy Hook only when dirty and allowed by guardrails.
6. GitHub direct `dist/` deploy remains the fallback if Cloudflare Pages build quota becomes constrained.
7. An authenticated admin-only manual trigger may call the deploy hook for urgent changes, but this should be exceptional.
8. The cooldown/debounce policy is the publish window itself: all edits before the next scheduled run or poll are batched into one build.
9. The Pages build runs `pnpm run build:astro`, queries the current remote D1 data, writes the static snapshot, builds `dist/`, and deploys fresh HTML.
10. After a successful deploy, the job marks requests as `deployed` with the deployment id/time. Failed deploys remain retryable.

Recommended schedule:
- Twice daily: 09:00 and 21:00 Asia/Jakarta.
- This is intentionally conservative for Cloudflare Pages free-tier usage.
- Upgrade path: 30-minute GitHub Actions polling after `site_rebuild_requests` and `site_publish_state` exist, with Cloudflare Deploy Hook as the first publish mode and GitHub direct deploy as the fallback/upgrade mode.
- If the business later needs near-real-time publishing, increase frequency only after confirming build quota and cost impact.

Recommended implementation order:

- Done: add `site_rebuild_requests` migration and helper functions such as `siteRebuildStatements(db, { siteId, franchiseId, reason })`.
- Done: add `site_publish_state` migration for per-site dirty/published timestamps, publish mode, and guardrail counters.
- Add Cloudflare Pages secret `PAGES_DEPLOY_HOOK_FRANCHISEE_ID`.
- Done: add a scheduled GitHub Actions poller that runs every 30 minutes, checks D1 for pending rebuild requests, and calls the deploy hook only when pending work exists and guardrails allow a publish.
- Done: keep direct `wrangler pages deploy dist` as the documented fallback if Cloudflare Pages build quota becomes constrained.
- Add an authenticated admin endpoint for urgent manual publishing.
- Done: update `/form-submit` public-page write paths to enqueue rebuild requests.
- Pending: update future listing edit endpoints, admin publication endpoints, and claim approval/delete flows to enqueue rebuild requests.

Current package pins:
- `astro@5.18.2` because local Node is 20.19.4.
- `@astrojs/cloudflare@12.6.13` for Astro 5 compatibility if/when Cloudflare server output is enabled.
- `wrangler@4.86.0` because newer resolved versions require Node 22 in this environment.
- `typescript@5.9.3` and `@types/node@20.19.25` to match Astro 5 peer expectations and the local Node 20 runtime.

## Drizzle Decision
Drizzle is a TypeScript ORM/query builder that supports Cloudflare D1. It is useful when application code starts doing non-trivial D1 reads/writes because it gives typed table definitions and safer query composition.

Recommended approach:
- Start with explicit SQL migrations for the initial D1 schema so the database contract is easy to inspect.
- Add Drizzle when building the first Astro/Cloudflare server routes that query D1.
- If Drizzle is adopted, keep generated SQL migrations committed and configure Wrangler's migration pattern if Drizzle uses nested migration files.
- Avoid using Drizzle as an excuse to hide schema decisions; D1 table shape and migration SQL remain project architecture.

Use plain SQL first if the immediate work is only importing CSV snapshots and replacing a single endpoint. Use Drizzle once route handlers, dashboards, filters, role checks, and update flows need shared typed queries.

## Role Model

### Roles
| Role | Purpose | Initial permissions |
| --- | --- | --- |
| `franchisee` | Buyer/prospect account. | Manage own profile, save opportunities, submit inquiries, view own inquiry history. |
| `franchisor` | Brand owner/operator account. | Manage own company profile, listings, packages, assets, claim requests, and incoming leads. |
| `staff` | Internal operations account. | Review claims/listings/imports and moderate data according to assigned permissions. No unrestricted destructive access by default. |
| `admin` | System owner account. | Full moderation, role assignment, configuration, import/export, and destructive operations. |

### Authorization Rules
- D1 is the source of truth for roles and permissions.
- Clerk authenticates the user; D1 authorizes what the user can do.
- Store Clerk id on `users.clerk_user_id`.
- Role checks must happen server-side in API/server routes before reading or mutating protected resources.
- Clerk public/private metadata may contain small role hints for UI routing, but never trust user-controlled unsafe metadata for authorization.
- Staff permissions should be granular enough to avoid giving every internal helper admin-level access.

### Initial Tables
Use these as the first schema target:

- `users`: id, Clerk user id, email, display name, status, timestamps.
- `user_roles`: user id, role, assigned by, timestamps.
- `franchisee_profiles`: user id, contact profile, interest, budget, preferred location.
- `franchisor_profiles`: user id, company/legal/contact profile.
- `franchises`: brand/listing record, owner user id, slug, status, verification tier, source type, legacy ids.
- `franchise_claims`: unclaimed/listing claim requests with review status and evidence.
- `franchise_packages`: package and investment variants tied to a franchise.
- `franchise_assets`: R2 object keys, asset type, ownership, moderation status.
- `franchise_leads`: franchisee inquiries and franchisor lead state.
- `franchise_saved_opportunities`: logged-in franchisee saved listings across devices.
- `locations`: normalized city/province/search location data.
- `audit_events`: role, claim, publish, import, and admin action log.

## Switching From Google Sheets To D1 Today
Do the cutover in controlled steps; do not delete or abandon Sheets until D1 reads and writes are verified.

1. Confirm Wrangler is authenticated to the same Cloudflare account that owns the Pages binding for `franchise_db`.
2. Add the real `franchise_db` database UUID to Wrangler config.
3. Apply `migrations/0001_initial_network_schema.sql` locally, then remotely.
4. Export or reuse current snapshots from `csv/franchisors.csv`, `csv/unclaimed.csv`, and `csv/franchisee.csv`.
5. Write a TypeScript importer that validates each row with Zod before inserting into D1.
6. Preserve existing slugs, source type, legacy sheet ids, claim-search sanitization, and duplicate detection rules during import.
7. Run import locally first, then remote after comparing row counts and sampled listings against current generated pages.
8. Change read APIs first: move `/get-franchises` or its replacement to D1 and compare output with the current Sheets-backed API.
9. Change write APIs second: move `/form-submit` to D1 transactions while preserving current frontend payload fields.
10. Freeze Sheets as archive/export-only; do not add new Sheets writes.
11. Rebuild listing/detail generation from D1.

Current importer implementation:

```bash
pnpm run import:csv:dry
pnpm run import:csv:sql
pnpm run import:csv:remote
```

The first remote CSV snapshot import completed on 2026-06-16 through `cfman` into `franchise_db`. Verified counts are 197 franchises, 190 packages, 197 site publications, 2 franchisee profiles, 1 franchisor profile, and 199 legacy source rows.

Runtime cutover status as of 2026-06-17:
- `/get-franchises` uses D1 first through the Pages binding `franchise_db`, with a Sheets read fallback only for explicit transition/testing use.
- `/form-submit` writes to D1 only. It no longer appends to Google Sheets.
- Google Sheets is now archive/import-only. Do not add new Sheets write paths.
- `/form-submit` now requires Clerk bearer tokens, maps Clerk users into D1 `users`, checks D1 roles, and writes ownership/audit actor fields.
- Clerk/D1 bidirectional sync is explicit: Clerk webhooks push identity lifecycle changes into D1, and D1 role mutations push metadata snapshots back to Clerk.

Clerk setup details:
- Custom UI and env setup are documented in `docs/architecture/CLERK_SETUP.md`.
- Required Cloudflare Pages env vars: `PUBLIC_CLERK_PUBLISHABLE_KEY` preferred for Astro/static runtime config, `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SIGNING_SECRET`. `/auth-config` also accepts `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_PUBLISHABLE_KEY` as compatibility fallbacks.
- Optional origin hardening: `CLERK_AUTHORIZED_PARTIES`.
- Raw/manual D1 SQL changes are not automatically visible to Clerk; run `/sync-clerk-metadata` after manual role edits.

Immediate caution areas:
- Claim cleanup semantics must be preserved when moving `UNCLAIMED` rows into owned `franchises`.
- Slug collisions must be detected and resolved deterministically.
- Phone/email normalization must match existing duplicate checks. Public phone display normalization is currently render-time only and must not be confused with D1 duplicate/identity normalization until a normalized contact table is added.
- Imports must be idempotent so rerunning them does not duplicate brands or users.
- Production migrations need backups/export discipline before destructive schema changes.

## External Docs Checked
- Cloudflare D1 migrations and Wrangler commands.
- Drizzle Cloudflare D1 connector.
- Zod documentation.
- Clerk user metadata and organization roles/permissions documentation.
