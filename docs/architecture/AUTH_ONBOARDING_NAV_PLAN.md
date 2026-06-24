# Auth Onboarding And Navbar Plan

Last updated: 2026-06-25 03:56 (Asia/Jakarta)

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
- `js/auth-clerk.js` already owns custom Clerk login/register/verification UI, public Google OAuth, pending role storage, pending next storage, `/auth-sync`, and the `window.FranchiseAuth` helper.
- `css/auth-clerk.css` already isolates custom auth styling and protects `[hidden]` state from legacy CSS.
- `/login/index.html` is still a legacy WordPress shell whose WPForms block is replaced at runtime by `js/auth-clerk.js`.
- `/register/index.html` is a dedicated auth page using the same shared auth root.
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
   - Franchisee: `input[name="email"]` from Clerk primary email, and `input[name="full_name"]` from Clerk display name when empty.
   - Franchisor: `input[name="email_contact"]` from Clerk primary email, and contact/PIC name only if a matching existing field is present and empty.
4. Submission remains protected by `/form-submit` bearer tokens and D1 role checks.

## Navbar Auth State Plan
Create a small public navbar controller instead of duplicating auth logic in static HTML:

- Candidate file: `js/auth-navbar.js`.
- It should load after `js/auth-clerk-debug.js` and `js/auth-clerk.js` on public pages with the legacy Elementor/HFE navbar.
- It should call `window.FranchiseAuth.init()` and then `/auth-sync` when a Clerk session exists.
- It should find login/register anchors by normalized href/text, not brittle menu item ids.
- Logged-out state keeps existing links.
- Logged-in public state replaces the two auth links with one compact account control:
  - Primary text: Clerk/D1 display name or email prefix.
  - Badge: `Franchisee` or `Franchisor` from D1 roles.
  - Menu links: `Lengkapi Profil`, future `Profil Saya`, and `Logout`.
- Staff/admin dashboard behavior should remain separate. Public navbar can show `Dashboard` only for `staff` or `admin`, but server authorization remains D1-enforced.

## UI Plan
- Convert `/login` auth fields to an inline label/input grid matching `/daftar` form rows, with stacked layout below mobile breakpoints.
- Replace current auth tabs with a segmented toggle that has an animated active indicator.
- Move the public registration role selector above the Google button so SSO users must choose role first.
- Reuse the same segmented-control pattern for `/daftar` tabs.
- Add a moving indicator to `.registration-tabs` driven by class or CSS variables set in `openTab()`.
- Respect `prefers-reduced-motion` by disabling the sliding indicator transition.

## Implementation Tracker

| Status | Step | Notes |
| --- | --- | --- |
| Done | Audit current auth and form constraints | Read form preservation, schema, Clerk setup, technical inventory, auth runtime, and form navigation modules. |
| Done | Create planning tracker | This document records the route, role, navbar, and UI plan before code changes. |
| Planned | Add shared public navbar auth controller | Prefer `js/auth-navbar.js` with selector-based legacy menu replacement. |
| Planned | Wire navbar script into public page surfaces | Use the least-broad static/template insertion point available after inspecting build/copy behavior. Avoid unnecessary full legacy rewrites. |
| Planned | Update `/login` auth template | Role-first register panel, inline fields, animated segmented tabs, and better post-register copy. |
| Planned | Reconcile `/register` with `/login` | Either keep `/register` as a direct register-mode page using the same component or redirect/canonicalize to `/login?mode=register`. |
| Planned | Redirect completed registration to `/daftar` | Set role-specific pending next for email/password and Google SSO registration. |
| Planned | Add `/daftar` role deep-link and prefill | Extend form init with `role` query handling and safe Clerk email/name prefill. Claim deep links still take priority. |
| Planned | Animate `/daftar` role tabs | Add a sliding indicator with reduced-motion fallback in the modular form CSS and `openTab()` state update. |
| Planned | Update documentation and tests | Sync `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `CHANGELOG.md`, and run syntax/build checks for touched JS/CSS surfaces. |

## Open Decisions
- Should `/register/` stay public, or should it become a redirect to `/login?mode=register`? Keeping it is lower risk because it already exists and shares the auth root.
- Should the logged-in navbar dropdown include `Logout` immediately, or should logout live only in the future profile/dashboard page? Immediate logout is more useful and can use Clerk directly.
- Should `/daftar` require login before users type the multi-step form? The current protected submit path allows typing before login but fails on submit without Clerk. A softer gate can show a logged-in identity banner and only require login at submit time.
