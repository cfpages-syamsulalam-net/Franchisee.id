-- Initial shared-network D1 schema for Franchisee.id / Franchisor.id / Franchise.id / Waralaba.id.
-- This database is intended to be the shared source of truth across the owned franchise network.
-- IDs are TEXT so application code can generate stable UUID/ULID values before insert.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS network_sites (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  site_type TEXT NOT NULL CHECK (site_type IN ('franchisee', 'franchisor', 'directory', 'waralaba', 'admin', 'network')),
  locale TEXT NOT NULL DEFAULT 'id-ID',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO network_sites (id, domain, name, site_type) VALUES
  ('site_franchisee_id', 'franchisee.id', 'Franchisee.id', 'franchisee'),
  ('site_franchisor_id', 'franchisor.id', 'Franchisor.id', 'franchisor'),
  ('site_franchise_id', 'franchise.id', 'Franchise.id', 'directory'),
  ('site_waralaba_id', 'waralaba.id', 'Waralaba.id', 'waralaba'),
  ('site_franchise_co_id', 'franchise.co.id', 'Franchise.co.id', 'directory'),
  ('site_waralaba_co_id', 'waralaba.co.id', 'Waralaba.co.id', 'waralaba');

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL UNIQUE,
  primary_email TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended', 'deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('franchisee', 'franchisor', 'admin', 'staff')),
  scope_type TEXT NOT NULL DEFAULT 'network' CHECK (scope_type IN ('network', 'site')),
  scope_id TEXT NOT NULL DEFAULT 'network',
  site_id TEXT,
  assigned_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (user_id, role, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS franchisee_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  source_site_id TEXT,
  name TEXT,
  email TEXT,
  country_code TEXT,
  whatsapp TEXT,
  city_origin TEXT,
  interest_category TEXT,
  budget_range TEXT,
  location_plan TEXT,
  message TEXT,
  legacy_row_id TEXT UNIQUE,
  legacy_timestamp TEXT,
  raw_payload TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_site_id) REFERENCES network_sites(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS franchisor_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  source_site_id TEXT,
  company_name TEXT,
  legal_name TEXT,
  pic_name TEXT,
  email_contact TEXT,
  country_code TEXT,
  whatsapp TEXT,
  website_url TEXT,
  instagram_url TEXT,
  nib_number TEXT,
  haki_status TEXT CHECK (haki_status IS NULL OR haki_status IN ('registered', 'process', 'none')),
  haki_number TEXT,
  legacy_row_id TEXT UNIQUE,
  legacy_timestamp TEXT,
  raw_payload TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_site_id) REFERENCES network_sites(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS franchises (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  franchisor_profile_id TEXT,
  source_site_id TEXT,
  brand_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT,
  subcategory TEXT,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('unclaimed', 'draft', 'pending_review', 'free', 'verified', 'premium', 'suspended', 'archived')),
  verification_tier TEXT NOT NULL DEFAULT 'free' CHECK (verification_tier IN ('unclaimed', 'free', 'verified', 'premium')),
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'franchisor_form', 'claim', 'sheet_import', 'csv_import', 'admin_import', 'scrape_import')),
  source_sheet TEXT CHECK (source_sheet IS NULL OR source_sheet IN ('FRANCHISOR', 'FRANCHISEE', 'UNCLAIMED')),
  legacy_row_id TEXT,
  legacy_timestamp TEXT,
  year_established INTEGER,
  city_origin TEXT,
  outlet_type TEXT,
  location_requirement TEXT,
  rent_cost_text TEXT,
  contract_duration_months INTEGER,
  fee_license_idr INTEGER,
  fee_capex_idr INTEGER,
  fee_construction_idr INTEGER,
  total_investment_idr INTEGER,
  min_investment_idr INTEGER,
  max_investment_idr INTEGER,
  estimated_bep_months INTEGER,
  omzet_monthly_idr INTEGER,
  hpp_percent REAL,
  net_profit_percent REAL,
  royalty_percent REAL,
  royalty_basis TEXT CHECK (royalty_basis IS NULL OR royalty_basis IN ('omzet', 'profit', 'fixed', 'none')),
  royalty_period TEXT,
  short_desc TEXT,
  full_desc TEXT,
  support_system TEXT,
  phone TEXT,
  office_address TEXT,
  outlets_location TEXT,
  logo_url TEXT,
  cover_url TEXT,
  gallery_urls TEXT,
  video_url TEXT,
  proposal_url TEXT,
  raw_payload TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (franchisor_profile_id) REFERENCES franchisor_profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (source_site_id) REFERENCES network_sites(id) ON DELETE SET NULL,
  UNIQUE (source_sheet, legacy_row_id)
);

CREATE TABLE IF NOT EXISTS franchise_packages (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  package_name TEXT,
  package_label TEXT,
  price_idr INTEGER,
  min_capital_idr INTEGER,
  max_capital_idr INTEGER,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS franchise_claims (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  claimant_user_id TEXT,
  franchisor_profile_id TEXT,
  source_site_id TEXT,
  unclaimed_legacy_row_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  evidence_text TEXT,
  review_notes TEXT,
  reviewed_by_user_id TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (claimant_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (franchisor_profile_id) REFERENCES franchisor_profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (source_site_id) REFERENCES network_sites(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS franchise_assets (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  uploaded_by_user_id TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'cover', 'gallery', 'video', 'proposal', 'document', 'other')),
  r2_bucket TEXT,
  r2_key TEXT,
  public_url TEXT,
  legacy_url TEXT,
  mime_type TEXT,
  file_size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_review', 'rejected', 'deleted')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL DEFAULT 'ID',
  province TEXT,
  city TEXT NOT NULL,
  district TEXT,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS franchise_locations (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  location_id TEXT,
  location_text TEXT,
  location_type TEXT NOT NULL DEFAULT 'available_area' CHECK (location_type IN ('head_office', 'outlet', 'available_area', 'origin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS franchise_leads (
  id TEXT PRIMARY KEY,
  franchise_id TEXT,
  franchisee_user_id TEXT,
  franchisee_profile_id TEXT,
  source_site_id TEXT,
  name TEXT,
  email TEXT,
  country_code TEXT,
  whatsapp TEXT,
  city_origin TEXT,
  budget_range TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'sent', 'viewed', 'contacted', 'qualified', 'closed', 'spam', 'archived')),
  raw_payload TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE SET NULL,
  FOREIGN KEY (franchisee_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (franchisee_profile_id) REFERENCES franchisee_profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (source_site_id) REFERENCES network_sites(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS franchise_site_publications (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  canonical_url TEXT,
  publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published', 'hidden', 'archived')),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  first_published_at TEXT,
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  UNIQUE (franchise_id, site_id),
  UNIQUE (site_id, slug)
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_idr INTEGER,
  billing_period TEXT NOT NULL DEFAULT 'one_time' CHECK (billing_period IN ('one_time', 'monthly', 'quarterly', 'yearly')),
  includes_all_network_sites INTEGER NOT NULL DEFAULT 0 CHECK (includes_all_network_sites IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  franchise_id TEXT,
  owner_user_id TEXT,
  franchisor_profile_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'past_due', 'cancelled', 'expired', 'refunded')),
  payment_provider TEXT,
  payment_reference TEXT,
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (franchisor_profile_id) REFERENCES franchisor_profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS subscription_site_entitlements (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  entitlement_type TEXT NOT NULL DEFAULT 'publication' CHECK (entitlement_type IN ('publication', 'featured', 'lead_delivery', 'analytics')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired')),
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES network_sites(id) ON DELETE CASCADE,
  UNIQUE (subscription_id, site_id, entitlement_type)
);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('csv', 'google_sheet', 'manual', 'api')),
  source_site_id TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  rows_seen INTEGER NOT NULL DEFAULT 0,
  rows_inserted INTEGER NOT NULL DEFAULT 0,
  rows_updated INTEGER NOT NULL DEFAULT 0,
  rows_skipped INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  FOREIGN KEY (source_site_id) REFERENCES network_sites(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS legacy_source_rows (
  id TEXT PRIMARY KEY,
  import_batch_id TEXT,
  source_sheet TEXT NOT NULL CHECK (source_sheet IN ('FRANCHISOR', 'FRANCHISEE', 'UNCLAIMED')),
  legacy_row_id TEXT,
  normalized_key TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  raw_payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE SET NULL,
  UNIQUE (source_sheet, normalized_key)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  source_site_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_site_id) REFERENCES network_sites(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_scope ON user_roles(role, scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_franchisee_profiles_user_id ON franchisee_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_franchisor_profiles_user_id ON franchisor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_franchises_owner_user_id ON franchises(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_franchises_franchisor_profile_id ON franchises(franchisor_profile_id);
CREATE INDEX IF NOT EXISTS idx_franchises_status_tier ON franchises(status, verification_tier);
CREATE INDEX IF NOT EXISTS idx_franchises_category ON franchises(category);
CREATE INDEX IF NOT EXISTS idx_franchises_brand_name ON franchises(brand_name);
CREATE INDEX IF NOT EXISTS idx_franchise_claims_status ON franchise_claims(status);
CREATE INDEX IF NOT EXISTS idx_franchise_assets_franchise_type ON franchise_assets(franchise_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_franchise_leads_franchise_status ON franchise_leads(franchise_id, status);
CREATE INDEX IF NOT EXISTS idx_franchise_leads_source_site ON franchise_leads(source_site_id);
CREATE INDEX IF NOT EXISTS idx_franchise_site_publications_site_status ON franchise_site_publications(site_id, publication_status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_franchise_status ON subscriptions(franchise_id, status);
CREATE INDEX IF NOT EXISTS idx_subscription_entitlements_site ON subscription_site_entitlements(site_id, status);
CREATE INDEX IF NOT EXISTS idx_legacy_source_rows_target ON legacy_source_rows(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);
