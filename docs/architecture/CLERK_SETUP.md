# Clerk Setup For Franchisee.id

Last updated: 2026-06-25 04:59 (Asia/Jakarta)

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
   - `https://franchisee.id/sso-callback/`
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
- `/login/` keeps the legacy page shell and replaces the old WPForms block at runtime with a custom Clerk `Masuk` / `Buat Akun` email/password and Google UI.
- `/register/` redirects to `/login?mode=register`; do not add a second public registration surface.
- Public registration requires selecting `Daftar sebagai` (`franchisee` or `franchisor`) before email/password or Google SSO starts.
- New public accounts redirect to `/daftar/?role=franchisee&continue=1` or `/daftar/?role=franchisor&continue=1` for profile/listing completion after Clerk identity creation.
- `/daftar/` requires a Clerk session before completion, opens the requested role tab from `?role=`, and prefills empty email/name/PIC fields from Clerk/D1 identity. Anonymous visitors are redirected to `/login?next=<current-daftar-url>`, where the auth UI explains that login is required before continuing.
- `js/auth-navbar.js` normalizes logged-out nav links to `Masuk` and `Daftar Mitra`; `Daftar Mitra` points to protected `/daftar/`, not `/login?mode=register`, so the completion form remains the canonical CTA. Logged-in public users see their name, D1 role badge, `/daftar` account link, and immediate red icon-only logout with Font Awesome icons.
- `/dashboard/` uses the same custom auth runtime but mounts a login-only admin/staff Google/email surface on the same URL. It does not show public registration or franchisee/franchisor role choices.
- Admin/staff sessions can still inspect `/login` auth forms while logged in; public logged-in users see the compact already-logged-in continue state.
- `/sso-callback/` is a hidden technical callback route for Google OAuth. It must be allowed in Clerk but is not a user-facing login page.
- `/auth-config` returns the publishable Clerk key to the browser and prefers the Astro-style `PUBLIC_CLERK_PUBLISHABLE_KEY` variable.
- `js/auth-clerk.js` writes the resolved publishable key to `window.__clerk_publishable_key` and the Clerk script tag before loading `clerk.browser.js`; Clerk's browser bundle needs the key available while the script evaluates, not only later during `clerk.load()`.
- `js/auth-clerk.js` supports Google sign-in/sign-up through ClerkJS. It stores the post-login destination, strips stale Clerk callback params before starting OAuth, and calls Clerk's redirect callback handler before any token/dashboard checks after Google returns. The handler runs on `/sso-callback/` even when Clerk returns without visible `__clerk_*` URL parameters.
- `/dashboard/` includes a masked Auth Debug panel while locked. Use it to diagnose Google SSO by checking `clerk.hasUser`, `clerk.hasSession`, `clerk.clientSessionCount`, redirect callback state, and recent `FranchiseAuth` events without exposing raw tokens.
- Public Google registration stores the selected self-assignable role across the OAuth redirect, then syncs that role to D1 as soon as `Auth.syncUser()` or a protected token request runs after the Clerk session is active.
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
4. Email/password register uses `clerk.client.signUp.create()` and email-code verification when Clerk requires it; public registration must include the selected role.
5. Google sign-in/sign-up uses Clerk OAuth redirect methods from the custom UI; public sign-up stores selected role and role-specific `/daftar` completion URL before redirect.
6. Google redirects back to `/sso-callback/`, where `js/auth-clerk.js` calls `clerk.handleRedirectCallback()` before reading `clerk.session`; the route itself is treated as the callback signal even if no Clerk query/hash parameters are visible.
7. After callback completion, Clerk redirects to the saved destination such as `/dashboard` or `/daftar/?role=franchisor&continue=1`.
8. Public Google registration stores the selected `franchisee` or `franchisor` role in `sessionStorage`; after OAuth completes, `Auth.syncUser()` or the next authenticated token request syncs that role through `/auth-sync`.
9. After a session is active, the browser calls `/auth-sync` with the selected role for new public registrations.
10. `/auth-sync` maps Clerk user id into D1 `users.clerk_user_id`, applies active `email_role_grants`, and inserts the allowed D1 role.
11. `/daftar` initializes Clerk, redirects anonymous users to `/login?next=<current-url>`, opens the requested role tab, and prefills empty identity fields. `/login` shows a login-required message when this redirect happens.
12. `/daftar` submissions attach `Authorization: Bearer <session-token>` to `/form-submit`.
13. `/form-submit` verifies the token with `@clerk/backend`, maps the Clerk user to D1, checks role authorization, and writes ownership fields.

## Dashboard SSO Troubleshooting
When Google says it is returning to `franchisee.id` but `/dashboard/` still shows `Belum login`, inspect the `Auth Debug` panel and browser console entry `[DashboardAuthDebug]`.

Key readings:
- `hasWindowClerk=false`: ClerkJS did not load.
- `clerk.loaded=false`: Clerk script loaded but initialization did not finish.
- `clerk.hasUser=false` and `clerk.clientSessionCount=0`: Clerk has no browser session after the Google redirect.
- `clerk.clientSessionCount>0` but `clerk.hasSession=false`: Clerk sees a session candidate but it is not active.
- `clerk.hasSession=true` but `hasAuthorization=false` in the `boot:after_headers` stage: token creation failed.
- `dashboard_data:response` status `401` or `403`: Clerk token exists, but server-side D1 role authorization failed.
- If `/sso-callback/` stays on screen, copy its debug output directly; the callback route now stops there when Clerk returns without creating an active session.

The panel masks token/session values by design, so screenshots of it are safe for debugging.

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
