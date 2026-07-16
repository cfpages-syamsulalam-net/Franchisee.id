CREATE TABLE IF NOT EXISTS staff_google_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google_contacts',
  google_sub TEXT,
  google_email TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  granted_scopes TEXT,
  token_type TEXT,
  expires_at TEXT,
  connected_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  last_error TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_google_connections_user_provider
  ON staff_google_connections(user_id, provider);

CREATE TABLE IF NOT EXISTS staff_google_oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  clerk_user_id TEXT NOT NULL,
  return_path TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  consumed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_google_oauth_states_user
  ON staff_google_oauth_states(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_staff_google_oauth_states_expires
  ON staff_google_oauth_states(expires_at);
