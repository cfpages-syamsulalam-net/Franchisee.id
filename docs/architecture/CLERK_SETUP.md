# Clerk Setup For Franchisee.id

Last updated: 2026-06-24 03:27 (Asia/Jakarta)

## Purpose
Clerk is the identity/session provider. D1 remains the authorization source of truth through `users` and `user_roles`.

## Required Clerk Dashboard Settings
1. Create or open the Clerk application for the franchise network.
2. Enable email/password authentication.
3. Enable Google SSO as a social connection.
4. Enable email verification by code for sign-up.
5. Add allowed application URLs:
   - `https://franchisee.id`
   - `https://franchisee.id/login/`
   - `https://franchisee.id/register/`
   - Any Cloudflare Pages preview domain you use for testing.
   - Local dev URL when testing with Wrangler or Astro locally.

## Required Cloudflare Pages Environment Variables
Set these in Cloudflare Pages project settings for Production and Preview:

```text
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

Optional hardening:

```text
CLERK_AUTHORIZED_PARTIES=https://franchisee.id,https://<preview-domain>
```

Do not commit Clerk secret keys to this repository. `PUBLIC_CLERK_PUBLISHABLE_KEY` is public by design, but it is still loaded from the `/auth-config` Function so the static HTML does not need per-environment rewrites. `/auth-config` also accepts `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_PUBLISHABLE_KEY` as compatibility fallbacks.

## Current Implementation
- `/login/` keeps the legacy page shell and replaces the old WPForms block at runtime with a custom Clerk email/password UI.
- `/register/` is a dedicated custom registration page with a franchisee/franchisor role selector.
- `/dashboard/` uses the same custom auth runtime but mounts a login-only admin/staff Google/email surface on the same URL. It does not show public registration or franchisee/franchisor role choices.
- `/auth-config` returns the publishable Clerk key to the browser and prefers the Astro-style `PUBLIC_CLERK_PUBLISHABLE_KEY` variable.
- `js/auth-clerk.js` writes the resolved publishable key to `window.__clerk_publishable_key` and the Clerk script tag before loading `clerk.browser.js`; Clerk's browser bundle needs the key available while the script evaluates, not only later during `clerk.load()`.
- `js/auth-clerk.js` supports Google sign-in/sign-up through ClerkJS. It stores the post-login destination, strips stale Clerk callback params before starting OAuth, and calls Clerk's redirect callback handler before any token/dashboard checks after Google returns.
- Public Google registration stores the selected self-assignable role across the OAuth redirect, then syncs that role to D1 after the Clerk session is active.
- `/auth-sync` verifies the active Clerk session, upserts D1 `users`, and self-assigns only `franchisee` or `franchisor`.
- `email_role_grants` lets admins pre-authorize an email for `admin` or `staff` before a real Clerk user id exists. When that email first logs in through Clerk/Google, `_clerk-auth.js` upserts the real D1 user and applies the pending role grant.
- `/clerk-webhook` verifies Clerk webhooks and syncs Clerk `user.created`, `user.updated`, and `user.deleted` events into D1.
- `/user-role` lets an authenticated `admin` assign/remove D1 roles and immediately pushes the updated D1 role snapshot to Clerk metadata.
- `/sync-clerk-metadata` lets an authenticated `admin` resync one or all D1 users into Clerk metadata after manual D1 changes.
- `/form-submit` requires a Clerk bearer token and checks D1 roles before D1 writes.
- `admin` and `staff` roles must be assigned server-side or manually in D1. They cannot be self-assigned from browser registration.

## Runtime Flow
1. Browser loads `/js/auth-clerk.js`.
2. The script fetches `/auth-config`, resolves the publishable key, sets Clerk's script-load key globals/attributes, loads the locally copied ClerkJS asset from `/clerk/clerk.browser.js` with CDN fallbacks, and initializes Clerk.
3. Email/password login uses `clerk.client.signIn.create()`.
4. Email/password register uses `clerk.client.signUp.create()` and email-code verification when Clerk requires it.
5. Google sign-in/sign-up uses Clerk OAuth redirect methods from the custom UI.
6. After Google redirects back, `js/auth-clerk.js` detects Clerk callback params and calls `clerk.handleRedirectCallback()` before reading `clerk.session`.
7. Public Google registration stores the selected `franchisee` or `franchisor` role in `sessionStorage`; after OAuth completes, the next authenticated request syncs that role through `/auth-sync`.
8. After a session is active, the browser calls `/auth-sync` with the selected role for new public registrations.
9. `/auth-sync` maps Clerk user id into D1 `users.clerk_user_id`, applies active `email_role_grants`, and inserts the allowed D1 role.
10. `/daftar` submissions attach `Authorization: Bearer <session-token>` to `/form-submit`.
11. `/form-submit` verifies the token with `@clerk/backend`, maps the Clerk user to D1, checks role authorization, and writes ownership fields.

## Bidirectional Sync Contract

### Clerk To D1
Clerk is the identity source, so Clerk user lifecycle changes flow into D1 through `/clerk-webhook`.

Configure this Clerk webhook endpoint:

```text
https://franchisee.id/clerk-webhook
```

Subscribe to:
- `user.created`
- `user.updated`
- `user.deleted`

Behavior:
- `user.created` and `user.updated` upsert D1 `users` by `clerk_user_id`.
- Active `email_role_grants` matching the normalized primary email are applied during upsert, then marked with `applied_user_id` / `applied_at`.
- `user.deleted` marks the D1 user as `deleted`.
- After upsert, the current D1 role snapshot is pushed back to Clerk metadata.

### D1 To Clerk
D1 is the authorization source, so role changes must be reflected back into Clerk as metadata for UI/routing hints.

App-driven role changes must use:

```text
POST /user-role
```

That endpoint requires D1 `admin`, mutates D1 `user_roles`, and updates Clerk `publicMetadata.franchiseNetwork` plus `privateMetadata.franchiseNetwork`.

For manual SQL changes, D1 cannot automatically notify Clerk. Run the repair sync:

```text
POST /sync-clerk-metadata
```

Body examples:

```json
{ "user_id": "user_..." }
```

```json
{ "clerk_user_id": "user_..." }
```

```json
{ "all": true, "limit": 500 }
```

Clerk metadata remains non-authoritative. Server permissions must still query D1 roles.

## Role Rules
- `franchisee` can write franchisee profile submissions.
- `franchisor` can write franchisor listing and claim submissions.
- `admin` is the global elevated role.
- `staff` is limited to staff-level operational actions and does not satisfy admin/franchisee/franchisor checks.
- Dev test-data create/clear actions require `staff` or `admin`.

## Pre-Authorizing Admin/Staff Before First Google Login
Use `email_role_grants` when the user does not exist in D1 yet because Clerk has not created the Google SSO user.

```sql
INSERT OR IGNORE INTO email_role_grants (
  id, email, email_normalized, role, scope_type, scope_id, site_id, note, is_active
) VALUES
  (
    'grant_admin_alampintar_org',
    'admin@alampintar.org',
    lower('admin@alampintar.org'),
    'admin',
    'network',
    'network',
    'site_franchisee_id',
    'Bootstrap admin grant for admin@alampintar.org Google/email login.',
    1
  ),
  (
    'grant_admin_email_franchisor_id',
    'email@franchisor.id',
    lower('email@franchisor.id'),
    'admin',
    'network',
    'network',
    'site_franchisee_id',
    'Bootstrap admin grant for email@franchisor.id Google/email login.',
    1
  );
```

Do not create fake rows in `users`; `users.clerk_user_id` must come from Clerk. After the first Google/email login, `/auth-sync` or `/dashboard-data` will create the real D1 user and attach the pending role.

## Manual Role Assignment Example
Use this only after confirming the target D1 user id:

```sql
INSERT OR IGNORE INTO user_roles (id, user_id, role, scope_type, scope_id, site_id)
VALUES ('role_manual_admin_001', '<d1-user-id>', 'admin', 'network', 'network', 'site_franchisee_id');
```

After any manual role SQL, call `/sync-clerk-metadata` as an admin so Clerk metadata reflects D1. Prefer `/user-role` for normal role changes because it updates both systems in one operation.
