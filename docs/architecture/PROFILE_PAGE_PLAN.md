# Profil Page Plan

Last updated: 2026-06-25 06:09 (Asia/Jakarta)

## Objective
Create `/profil` as the logged-in user control center for Franchisee.id:

- Keep `/daftar` focused on first-time profile/listing completion.
- Make Clerk identity fields in `/daftar` read-only once known from login/Google SSO.
- Give users a proper place to review account identity, franchisee interest profile, franchisor profile, owned listing data, claim status, and publish state.
- Keep D1 authoritative for app authorization and business records; Clerk remains the identity/session source.

## Immediate UI Fixes To Fold Into Implementation

### Toggle Coloring
The current segmented toggles still rely too heavily on yellow. The next fix should make active and hover states subtle:

- Indicator: white or near-white surface with shadow only.
- Active text: dark ink, never yellow.
- Hover/focus: no solid yellow fill. Use a very light yellow tint such as `rgba(240, 202, 0, 0.14)`, dark text, and maybe a thin yellow border/underline.
- Selected role/card state: light tint plus border, not full yellow background.
- Animation: only the indicator moves. Text color should not animate through low-contrast states.

### `/daftar` Identity Locking
When Clerk/D1 identity is known, `/daftar` should prefill and lock identity-owned fields:

- Franchisee `name` and `email`: read-only from Clerk/D1.
- Franchisor `pic_name` and `email_contact`: read-only when they are populated from Clerk/D1 identity.
- Add a short helper note near locked fields: `Dikelola dari Profil`.
- Do not remove fields; keep names and required attributes intact.
- Profile edits should happen in `/profil`, not inside first-time `/daftar`.

## Route Strategy

### `/profil`
New protected Astro route:

- Source: `src/pages/profil/index.astro`.
- Runtime controller: `js/profile-page.js`.
- Styles: `css/profile.css`, using the existing public site visual language from `/daftar` and auth components.
- Auth runtime: load `js/auth-clerk-debug.js`, `js/auth-clerk.js`, and `js/auth-navbar.js`.
- Anonymous access: redirect to `/login/?next=/profil/` with the same login-required message pattern.

### Navbar Behavior
Logged-in navbar account link should go to `/profil/`, not `/daftar/`.

- `Daftar Mitra` remains `/daftar/` for logged-out users.
- Logged-in name/role badge opens `/profil/`.
- `/profil` can show a primary CTA to continue `/daftar` only when the relevant profile/listing is incomplete.

## Page Structure
Use a side-tab layout, not stacked cards. On mobile, side tabs collapse into a top segmented/tabs row.

Recommended tabs:

1. `Ringkasan`
   - Account status, role badges, completion checklist.
   - CTA to complete franchisee profile or franchisor listing in `/daftar` when missing.
   - Link to public listing when franchisor listing is published.

2. `Akun`
   - Clerk/D1 identity summary: name, email, Clerk user id hint, D1 user id hint.
   - Name/email changes must use Clerk-safe flows. If custom Clerk update APIs are not confirmed yet, show read-only identity and defer editable identity fields.
   - Logout action.

3. `Profil Franchisee`
   - Show `franchisee_profiles` data for the current D1 user.
   - Editable user preference fields can be handled here later: city, WhatsApp, interest category, budget, location plan, message.
   - Must preserve existing `/daftar` field names if reusing payloads.

4. `Profil Franchisor`
   - Show `franchisor_profiles` data for the current D1 user.
   - Contact/profile fields separate from immutable Clerk identity.
   - Link to owned listing management when a listing exists.

5. `Listing Brand`
   - Show owned `franchises` rows for the current user.
   - Include public URL, publication status, verification/tier, category, investment data, media completion, and rebuild status.
   - Editing public listing fields should use the same validation/write path direction as dashboard edit suggestions, but scoped to the owner.
   - Public-page-affecting updates must queue `site_rebuild_requests`.

6. `Klaim`
   - Show `franchise_claims` submitted by the current user.
   - Status: pending, approved, rejected.
   - Link back to `/daftar?claim=...` for incomplete claim completion where appropriate.

## Backend Contract

Add a protected profile API instead of overloading `/form-submit`:

- Proposed file: `functions/profile-data.js`.
- Use `functions/_clerk-auth.js` to verify Clerk token and map user into D1.
- Use Zod for query/action payload validation.
- GET response should include:
  - `user`: D1 user, normalized email, display name, roles.
  - `clerk`: safe identity hints only, no tokens/secrets.
  - `franchisee_profile`: current user's profile or null.
  - `franchisor_profile`: current user's profile or null.
  - `owned_franchises`: rows where `owner_user_id` or `franchisor_profile_id` maps to the user.
  - `claims`: current user's claim rows.
  - `completion`: computed checklist for each role.
- POST actions can be phased:
  - `update_franchisee_profile`
  - `update_franchisor_profile`
  - `suggest_listing_update` or owner-safe `update_listing`
  - `request_publish_refresh`

## Data Ownership Rules

- Clerk identity fields are the source for login identity. Do not let `/daftar` silently override identity-derived name/email.
- D1 `users` remains authorization and application identity map.
- `franchisee_profiles` and `franchisor_profiles` are role-specific business/profile records.
- `franchises` is the owned public listing record.
- Listing edits that affect public SEO pages must enqueue the static rebuild queue through `functions/_site-publish-queue.js`.
- Staff/admin dashboard edits remain operational moderation; `/profil` owner edits are user-facing and need their own validation/audit trail.

## Implementation Tracker

| Status | Step | Notes |
| --- | --- | --- |
| Done | Fix segmented toggle colors | `/login` and `/daftar` hover/active states now use subtle tint and dark text instead of high-contrast yellow text/fill conflicts. |
| Done | Lock `/daftar` identity fields | Known Clerk/D1 name/email/PIC fields are read-only and keep original field names/required attributes. |
| Done | Create protected `/profil` shell | Added `src/pages/profil/index.astro` with public-site header, protected loading state, and profile root. |
| Done | Add profile API GET | `functions/profile-data.js` returns user, roles, profiles, owned franchises, claims, completion state. |
| Done | Wire `/profil` client controller | `js/profile-page.js` loads API data, renders side-tab content, and handles edits/empty/error states. |
| Done | Move logged-in navbar account link | Logged-in account control now points to `/profil/`; logged-out `Daftar Mitra` remains `/daftar/`. |
| Done | Add owner profile edit actions | Account, franchisee profile, and franchisor profile edits validate with Zod and write audit events. |
| Done | Add owner listing edit workflow | Owner listing edits apply to D1, are limited to one edit per listing per 6 hours, and queue static rebuilds. |
| Done | Documentation and verification | Updated repo docs/changelog/context and ran syntax checks for changed browser scripts; full build verification is pending. |

## Open Decisions Before Coding

- Resolved: account name/email are read-only by default with an edit icon that unlocks editing and updates Clerk and D1 together.
- Resolved: franchisor owner listing edits apply directly, but are rate-limited and only queue static rebuilds instead of triggering immediate builds.
- Resolved: `/daftar` redirects completed users to `/profil`; `/daftar` remains initial completion.
- Resolved: `/profil` shows a `/dashboard` shortcut for admin/staff only.
