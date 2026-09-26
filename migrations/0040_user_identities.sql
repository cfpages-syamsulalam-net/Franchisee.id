-- 0040_user_identities.sql
--
-- One D1 user reachable through more than one Clerk application.
--
-- Why this exists: each network site has its own Clerk application, so the same person receives a different
-- Clerk user id on each site, while brand ownership, roles and premium orders all key on the shared
-- `users.id`. Clerk's own answer to that is satellite domains, which require a paid plan for production.
-- Instead, D1 owns the link: `users.clerk_user_id` stays as the **home identity** (the first identity ever
-- linked, never overwritten by a second application), and every additional identity from any application is
-- recorded here. Resolution order and the linking policy live in `functions/_clerk-auth.js`.
--
-- Consequences worth knowing before reading the code:
--   * `users.clerk_user_id` remains NOT NULL UNIQUE, so it must still be populated on insert. It is no longer
--     where all the answers are — lookups must consult this table first.
--   * Linking is matched on the **verified email** of the incoming Clerk user. Control of an inbox is
--     therefore sufficient to attach an identity to a row, including a privileged one. That risk is accepted
--     and recorded in the shared data contract; every link is auditable through the columns below.
--   * `link_basis` says how the row came to exist: `first_identity` for the home identity, `verified_email`
--     for an automatic link, `admin_grant` for a manual one.
--
-- Idempotent: the table, its indexes and the backfill all tolerate being run again.

CREATE TABLE IF NOT EXISTS user_identities (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  provider       TEXT NOT NULL DEFAULT 'clerk',
  app_key        TEXT NOT NULL,
  clerk_user_id  TEXT NOT NULL,
  email_at_link  TEXT,
  link_basis     TEXT NOT NULL CHECK (link_basis IN ('first_identity', 'verified_email', 'admin_grant')),
  verified_email INTEGER NOT NULL DEFAULT 0 CHECK (verified_email IN (0, 1)),
  linked_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at   TEXT,
  revoked_at     TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (provider, clerk_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user
  ON user_identities(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_user_identities_lookup
  ON user_identities(clerk_user_id, provider);

-- Backfill: every existing `users` row is its own home identity, attributed to the site that has been running
-- in production. `verified_email` is 0 because the home identity was not acquired by an email match and the
-- historical verification state was never stored (there is no column for it in `users`).
-- `INSERT OR IGNORE` plus the UNIQUE (provider, clerk_user_id) constraint makes this safe to re-run.
INSERT OR IGNORE INTO user_identities (
  id, user_id, provider, app_key, clerk_user_id, email_at_link, link_basis, verified_email, linked_at, last_seen_at
)
SELECT
  'ident_' || lower(hex(randomblob(8))),
  u.id,
  'clerk',
  'franchisee_id',
  u.clerk_user_id,
  u.primary_email,
  'first_identity',
  0,
  COALESCE(u.created_at, CURRENT_TIMESTAMP),
  u.updated_at
FROM users u
WHERE u.clerk_user_id IS NOT NULL
  AND TRIM(u.clerk_user_id) <> '';
