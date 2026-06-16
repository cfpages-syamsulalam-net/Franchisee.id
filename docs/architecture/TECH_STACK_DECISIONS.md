# Franchisee.id Tech Stack Decisions

Last updated: 2026-06-17 02:58 (Asia/Jakarta)

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
- `audit_events`: who changed what, from which site.

For example, one franchisor payment can activate a subscription for one `franchise_id`, and `subscription_site_entitlements` can grant publication to `franchisee.id`, `franchise.id`, `waralaba.id`, and the other network domains without duplicating the listing.

## Why Zod
Zod is a TypeScript-first schema validation library. In this project, it fills the gap TypeScript cannot cover:

- TypeScript cannot prove that a browser form submission, CSV row, Clerk webhook, or environment variable is valid at runtime.
- Zod parses unknown input into validated data before it reaches D1 or application services.
- Zod schemas can infer TypeScript types, reducing duplicate interfaces between forms, APIs, importers, and database code.
- Zod should sit at all trust boundaries: HTTP request bodies, query parameters, imports from `/csv`, legacy Google Sheets rows, Clerk webhook payloads, and admin actions.

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
- `0001_initial_network_schema.sql` was applied remotely to `franchise_db` on 2026-06-16.
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

Current bridge:

```bash
pnpm run build:d1:franchises:dry
pnpm run build:d1:franchises
pnpm run build:astro
```

`scripts/build-d1-franchise-pages.ts` currently:
- Queries published `site_franchisee_id` records from `franchise_db`.
- Renders `/peluang-usaha/index.html` and `/peluang-usaha/{slug}/index.html` using the existing WordPress-exported templates.
- Writes `json/d1-franchise-static-data.json` for Astro static routes.
- Writes `json/d1-generated-pages-manifest.json` so unchanged pages are skipped on rerun.
- Prunes only pages that were previously generated by this D1 builder and still contain the `d1-generated:franchisee.id` marker.
- Regenerates `json/unclaimed-brands.json` from D1 unclaimed rows for the claim-search frontend.

Astro scaffold:
- `astro.config.mjs` is configured for static output with trailing slashes.
- `src/lib/franchise-static.ts` validates the D1 snapshot with Zod and renders the existing listing/detail templates.
- `src/pages/peluang-usaha/index.astro` builds `/peluang-usaha/index.html`.
- `src/pages/peluang-usaha/[slug].astro` uses `getStaticPaths` to build one static HTML page per franchise slug.
- `pnpm run build:astro` refreshes the D1 snapshot first, then builds 198 pages into `dist/` from the current D1 data.
- The manifest/safe-prune rule remains in the D1 bridge. Astro writes to `dist/`, so it does not delete legacy/example root `/peluang-usaha` folders during validation.

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
- Required Cloudflare Pages env vars: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SIGNING_SECRET`.
- Optional origin hardening: `CLERK_AUTHORIZED_PARTIES`.
- Raw/manual D1 SQL changes are not automatically visible to Clerk; run `/sync-clerk-metadata` after manual role edits.

Immediate caution areas:
- Claim cleanup semantics must be preserved when moving `UNCLAIMED` rows into owned `franchises`.
- Slug collisions must be detected and resolved deterministically.
- Phone/email normalization must match existing duplicate checks.
- Imports must be idempotent so rerunning them does not duplicate brands or users.
- Production migrations need backups/export discipline before destructive schema changes.

## External Docs Checked
- Cloudflare D1 migrations and Wrangler commands.
- Drizzle Cloudflare D1 connector.
- Zod documentation.
- Clerk user metadata and organization roles/permissions documentation.
