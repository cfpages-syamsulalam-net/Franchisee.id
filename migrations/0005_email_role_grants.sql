-- Email-based role grants for pre-authorizing users before their first Clerk login.
-- This supports Google SSO onboarding without creating fake D1 users or passwords.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS email_role_grants (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('franchisee', 'franchisor', 'admin', 'staff')),
  scope_type TEXT NOT NULL DEFAULT 'network' CHECK (scope_type IN ('network', 'site')),
  scope_id TEXT NOT NULL DEFAULT 'network',
  site_id TEXT,
  granted_by_user_id TEXT,
  note TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  applied_user_id TEXT,
  applied_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (applied_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (email_normalized, role, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_email_role_grants_email ON email_role_grants(email_normalized, is_active);
CREATE INDEX IF NOT EXISTS idx_email_role_grants_applied_user ON email_role_grants(applied_user_id);

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
