# Auth Onboarding And Navbar Plan

Last updated: 2026-06-25 16:12 (Asia/Jakarta)

## Objective
Make public account entry feel like one connected flow:

- Logged-in public users should see their name and D1-authoritative status in the navbar instead of separate `Login` and `Daftar` links.
- `/login` should be the lightweight identity gate for login and account creation.
- `/daftar` should be the profile/listing completion form after identity is known, with known Clerk fields such as email prefilled.
- Google SSO registration must ask for `Daftar sebagai` before starting the redirect so the requested D1 role is explicit.
- Login and registration UI should visually match the more polished `/daftar` form rhythm, including inline labels and animated segmented controls.

## Naming Recommendation
Keep the `/daftar` URL for compatibility, but rename the visible page intent away from generic account registration. Good options:

- `Lengkapi Profil` - best after a user has already created a Clerk account.
- `Daftar Mitra & Brand` - best for public navigation before the user starts.
- `Form Kemitraan` - neutral label that covers franchisee interest, franchisor listing, and claim flow.

Recommended copy split:

- Navbar CTA before login: `Daftar Mitra`
- `/login` register tab title: `Buat Akun`
- `/daftar` page heading after login: `Lengkapi Profil`
- `/daftar` page heading for anonymous visitors: `Daftar Mitra & Brand`

This avoids making users think `/login` registration and `/daftar` are duplicate forms.

## Current Implementation Notes
- `js/auth-clerk.js` already owns custom Clerk login/register/verification UI, public Google OAuth, pending role storage, pending next storage, `/auth-sync`, and the `window.FranchiseAuth` helper. It also shows a login-required message after protected `/daftar` redirects and keeps forms visible for logged-in admin/staff QA.
- `css/auth-clerk.css` already isolates custom auth styling and protects `[hidden]` state from legacy CSS.
- `/login/index.html` is still a legacy WordPress shell whose WPForms block is replaced at runtime by `js/auth-clerk.js`.
- `/register/index.html` now redirects to `/login?mode=register`; the canonical public registration surface is the `/login` register tab.
- `/daftar/index.html` is the multi-step business/profile form and must keep every existing field. It has hard-coded tabs for `franchisee`, `franchisor`, and `klaim`.
- `js/form-03-navigation-steps.js` controls `/daftar` tab switching through `window.openTab()`.
- `js/form-07-init.js` restores the last tab, handles claim deep links, and bootstraps form modules.
- `functions/auth-sync.js` and `functions/_clerk-auth.js` keep D1 authoritative for roles. Clerk metadata is only a UI/routing hint.

## Target Flow

### Existing User Login
1. User opens `/login`.
2. User chooses `Masuk`, then email/password or Google.
3. After Clerk session is active, `js/auth-clerk.js` calls `/auth-sync`.
4. If `next` exists, continue there. Otherwise route public `franchisee`/`franchisor` users to `/daftar/?continue=1` only when profile/listing completion is still needed; otherwise stay on the intended page or go to a future profile area.
5. Navbar replaces auth links with display name and role badge.

### New Account Creation
1. User opens `/login?mode=register` or `/register`.
2. User chooses `Daftar sebagai` before both Google SSO and email/password registration.
3. Auth runtime stores:
   - `franchise_auth_pending_role`: `franchisee` or `franchisor`
   - `franchise_auth_pending_next`: `/daftar/?role=franchisee&continue=1` or `/daftar/?role=franchisor&continue=1`
4. Clerk account is created by email/password or Google SSO.
5. `/auth-sync` self-assigns only the selected public role in D1.
6. User lands on `/daftar`, the matching tab opens, and known email/name fields are prefilled from Clerk.

### Profile Completion On `/daftar`
1. `/daftar` initializes Clerk through the existing custom runtime.
2. If `?role=franchisee`, open the franchisee tab. If `?role=franchisor`, open the franchisor tab. If `?claim=...`, claim flow still wins.
3. Prefill only empty fields:
   - Franchisee: `input[name="email"]` from Clerk primary email, and `input[name="name"]` from Clerk display name when empty.
   - Franchisor: `input[name="email_contact"]` from Clerk primary email, and contact/PIC name only if a matching existing field is present and empty.
4. Submission remains protected by `/form-submit` bearer tokens and D1 role checks.

### Role Correction And Add-On Flow
Users can misunderstand the initial `Daftar sebagai` choice. A common case: someone signs up as a franchisee because they are browsing opportunities, then realizes they need franchisor access to add or claim a brand listing.

The preferred behavior is additive, not destructive:

- Do not force users to abandon or replace their original public role.
- Let a logged-in `franchisee` request `franchisor` access from `/profil` when they want to add a brand or claim a listing.
- Let a logged-in `franchisor` add `franchisee` interests later if they also want recommendations or buyer-side alerts.
- Keep `admin` and `staff` role changes out of this self-service flow; those remain admin-controlled.

Recommended UX:

1. In `/profil`, show a contextual CTA when the opposite public role is missing:
   - Franchisee-only user: `Tambahkan brand franchise` / `Saya pemilik brand`.
   - Franchisor-only user: `Cari peluang franchise juga`.
2. On click, explain the plain-language effect in a short confirmation modal:
   - `Anda tetap bisa memakai akun ini. Kami akan menambahkan akses untuk mengisi data brand.`
3. After confirmation, call a protected role-add action that only permits self-service public roles: `franchisee` and `franchisor`.
4. Sync D1 roles back to Clerk metadata through the existing auth sync path.
5. Send the user to `/daftar/?role=franchisor&continue=1` or `/daftar/?role=franchisee&continue=1` to complete the missing first-time form.

Copy guidance:

- Say `tambahkan akses` or `lengkapi data brand`, not `switch role`, `D1 role`, or `metadata`.
- Avoid making users choose between identities. The account can represent both a person looking for franchises and a brand owner.
- Only hide role sections in `/profil` when the role is absent; once added, both public sections can appear for that user.

Implementation direction:

- Reuse `/auth-sync` only if it remains safe for already-authenticated public self-assignment; otherwise add a focused `/profile-data` action such as `add_public_role`.
- Validate the requested role with Zod and allow only `franchisee` or `franchisor`.
- Write an `audit_events` row for role additions.
- After the server writes the role, the current implementation sends the user to the matching `/daftar` tab so the newly available profile/listing data can be completed immediately.

## Navbar Auth State Plan
Create a small public navbar controller instead of duplicating auth logic in static HTML:

- Implemented file: `js/auth-navbar.js`.
- It should load after `js/auth-clerk-debug.js` and `js/auth-clerk.js` on public pages with the legacy Elementor/HFE navbar.
- It should call `window.FranchiseAuth.init()` and then `/auth-sync` when a Clerk session exists.
- It should find login/register anchors by normalized href/text, not brittle menu item ids.
- Logged-out state relabels `Login` to `Masuk` and keeps `Daftar`/`Daftar Mitra` pointed at `/daftar/`; `/daftar` is protected and redirects anonymous users to `/login?next=...` with an explanatory message.
- Logged-in public state replaces the two auth links with one compact account control:
  - Primary text: Clerk/D1 display name or email prefix.
  - Badge: `Franchisee` or `Franchisor` from D1 roles.
  - Direct link: `Lengkapi Profil`.
  - Logout: immediate red Font Awesome icon-only button in the navbar.
- Staff/admin dashboard behavior should remain separate. Public navbar can show `Dashboard` only for `staff` or `admin`, but server authorization remains D1-enforced.

## UI Plan
- Convert `/login` auth fields to an inline label/input grid matching `/daftar` form rows, with stacked layout below mobile breakpoints.
- Replace current auth tabs with a segmented toggle that has an animated active indicator, Font Awesome icons, and dark active text over the white indicator for readable transitions.
- Move the public registration role selector above the Google button so SSO users must choose role first.
- Reuse the same segmented-control pattern for `/daftar` tabs.
- Add a moving white indicator to `.registration-tabs` driven by class or CSS variables set in `openTab()`, with active text kept dark and yellow reserved for hover/focus.
- Respect `prefers-reduced-motion` by disabling the sliding indicator transition.

## Implementation Tracker

| Status | Step | Notes |
| --- | --- | --- |
| Done | Audit current auth and form constraints | Read form preservation, schema, Clerk setup, technical inventory, auth runtime, and form navigation modules. |
| Done | Create planning tracker | This document records the route, role, navbar, and UI plan before code changes. |
| Done | Add shared public navbar auth controller | `js/auth-navbar.js` replaces legacy nav auth links with name, D1 role badge, and red icon-only logout when a session exists. |
| Done | Wire navbar script into public page surfaces | Added auth CSS/runtime/navbar hooks to `/login`, `/daftar`, and D1 page templates. |
| Done | Update `/login` auth template | Role-first register panel, inline fields, animated segmented tabs, and better post-register copy. |
| Done | Correct logged-out navbar CTA | `Daftar Mitra` now points to protected `/daftar/`; anonymous users receive a login-required message on `/login?next=...`. |
| Done | Normalize icons and navbar compactness | Auth/navbar/dashboard controls use the existing Font Awesome library; navbar logout is a compact red icon-only button. |
| Done | Improve admin/staff QA access | Logged-in admin/staff can inspect `/login` forms while public users still see the compact logged-in state. |
| Done | Reconcile `/register` with `/login` | `/register` redirects to `/login?mode=register` through `_redirects` and static fallback metadata/script. |
| Done | Redirect completed registration to `/daftar` | Set role-specific pending next for email/password and Google SSO registration. |
| Done | Add `/daftar` role deep-link and prefill | Extend form init with `role` query handling and safe Clerk email/name prefill. Claim deep links still take priority. |
| Done | Animate `/daftar` role tabs | Add a sliding indicator with reduced-motion fallback in the modular form CSS and `openTab()`. |
| Done | Update documentation and tests | Synced `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `CLERK_SETUP.md`, `CHANGELOG.md`, and ran syntax, TypeScript, and full build checks. |
| Done | Add public role add-on flow | Logged-in franchisee/franchisor users can add the opposite public role from `/profil`, confirm the change, then continue to the matching `/daftar` form. |

## Open Decisions
- Resolved: `/register/` redirects to `/login?mode=register`.
- Resolved: logout is immediate, icon-only, and red in the navbar.
- Resolved: `/daftar` requires a Clerk session before profile/listing completion.
- Resolved: public `Daftar Mitra` stays on `/daftar/`; `/login?mode=register` is only for explicit account creation and `/register` compatibility.
- Resolved: admin/staff sessions can inspect auth pages while logged in.
