# Franchisee.id Tech Stack Decisions

Last updated: 2026-06-13 01:46 (Asia/Jakarta)

## Purpose
This document records stack decisions for the migration from a static WordPress export with Google Sheets storage into an authenticated franchise directory application. Treat it as the implementation compass for new backend, data, auth, and validation work.

## Decisions

| Area | Decision | Notes |
| --- | --- | --- |
| Default language | TypeScript for all new app, backend, schema, importer, and migration-adjacent code. | Existing legacy JavaScript can remain until touched or migrated. New Astro routes, Cloudflare handlers, importers, and shared utilities should be `.ts`. |
| Runtime validation | Zod for request bodies, form payloads, Clerk webhook payloads, environment/config parsing, CSV import rows, and D1 write inputs. | TypeScript checks code at build time; Zod checks untrusted runtime data before it reaches database writes or business logic. |
| Database | Cloudflare D1 as the application source of truth. | Google Sheets remains a transition/import source only. |
| Migrations | Source-controlled SQL migrations from the beginning. | Use Wrangler D1 migrations or Drizzle-generated SQL, but keep migration files committed and reviewable. |
| Auth | Clerk for login/register and identity. | Clerk user ids map into D1 `users.clerk_user_id`. |
| Roles | D1-authoritative roles: `franchisee`, `franchisor`, `admin`, `staff`. | Clerk metadata/session claims may cache small UI hints only; server authorization must verify D1 role/permission state. |
| Assets | Cloudflare R2 for logos, covers, gallery images, proposal PDFs, and imported legacy assets. | D1 stores metadata and R2 object keys; R2 stores binary files. |
| Framework | Astro on Cloudflare by default. | Next.js remains an option only if dashboard complexity becomes strongly React-heavy. |
| Styling | Existing CSS only unless explicitly approved. | Do not add a styling framework for the migration. |
| Package manager | pnpm only. | Use `pnpm install`, `pnpm run`, and `pnpm exec`. |

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
pnpm exec wrangler d1 create franchisee_db
pnpm exec wrangler d1 migrations create franchisee_db initial_schema
pnpm exec wrangler d1 migrations apply franchisee_db --local
pnpm exec wrangler d1 migrations apply franchisee_db --remote
```

Recommended binding:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "franchisee_db",
      "database_id": "<cloudflare-d1-database-id>",
      "migrations_dir": "migrations"
    }
  ]
}
```

Use the database name when applying migrations when practical, because binding names can change between environments while the database name is stable.

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

1. Create D1 and add the `DB` binding in `wrangler` config.
2. Create the initial SQL migration for the role/listing/profile/claim tables.
3. Export or reuse current snapshots from `csv/franchisors.csv`, `csv/unclaimed.csv`, and `csv/franchisee.csv`.
4. Write a TypeScript importer that validates each row with Zod before inserting into D1.
5. Preserve existing slugs, source type, legacy sheet ids, claim-search sanitization, and duplicate detection rules during import.
6. Run import locally first, then remote after comparing row counts and sampled listings against current generated pages.
7. Change read APIs first: move `/get-franchises` or its replacement to D1 and compare output with the current Sheets-backed API.
8. Change write APIs second: move `/form-submit` to D1 transactions while preserving current frontend payload fields.
9. Optionally dual-write to Sheets for a short rollback window, but do not build new features on Sheets.
10. Rebuild listing/detail generation from D1, then freeze Sheets as archive/export-only.

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
