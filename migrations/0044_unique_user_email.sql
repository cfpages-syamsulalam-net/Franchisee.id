-- 0044_unique_user_email.sql
--
-- Makes real the invariant the identity linker already relies on.
--
-- The linker matches a second Clerk application's identity to an existing person by `lower(primary_email)`,
-- which silently assumes one users row per email. Nothing enforced that: `users.primary_email` has no UNIQUE
-- constraint, so two rows could share an address — reachable through the profile email-change path, which
-- replaces the address in Clerk and then updates this column without checking it is unused.
--
-- That assumption is load-bearing and its failure is severe: with two rows sharing an email, the linker cannot
-- tell two people apart, and the wrong choice hands over someone else's brand, roles and premium. So rather
-- than only detecting the condition, this prevents it.
--
-- Partial, because the column is nullable by design and SQLite treats NULLs as distinct anyway; the guard is
-- wanted exactly where an address actually exists. `lower()` and `TRIM()` match the comparison the linker and
-- the duplicate-email audit both use, so the index enforces precisely the invariant they assume.
--
-- Consequence to handle in the application: an email change that collides now fails with a constraint error
-- instead of silently creating ambiguity. That surface should report it as "this email is already in use".

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_primary_email_unique
  ON users(lower(TRIM(primary_email)))
  WHERE primary_email IS NOT NULL AND TRIM(primary_email) <> '';
