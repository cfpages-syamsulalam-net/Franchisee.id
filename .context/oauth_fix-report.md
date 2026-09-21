# OAuth lifecycle fix

Implemented the bound OAuth callback repair in `functions/_google-contacts-oauth.js` and `scripts/check-google-contacts.ts`.

- Callback expiry is fail-closed for invalid/NaN timestamps and expired states remain auditable.
- Active D1 `staff`/`admin` authorization is rechecked before provider exchange.
- A valid state is atomically consumed with a conditional D1 `UPDATE ... RETURNING`; replay and concurrent reuse are rejected before provider network work.
- Google userinfo now requires a nonempty `sub`.
- A stored refresh token is reused only for the same nonrevoked Google subject. An account switch without a fresh provider refresh token fails closed, preserving account binding.
- Denial, expiry, forbidden, provider failure, and recovery redirects remain recoverable dashboard redirects.

Validation: `pnpm run google-contacts:check` passed with behavioral mocked D1/provider cases for account switching, same-account rotation, missing subject, invalid expiry, revoked role, and replay.

Existing unrelated worktree changes were preserved; no commit, push, migration, network mutation, or remote state change was performed.
