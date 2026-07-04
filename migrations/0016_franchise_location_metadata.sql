-- Add metadata for generated franchise location/service-area rows.

PRAGMA foreign_keys = ON;

ALTER TABLE franchise_locations ADD COLUMN source_field TEXT;
ALTER TABLE franchise_locations ADD COLUMN confidence_score REAL NOT NULL DEFAULT 0.8;

CREATE INDEX IF NOT EXISTS idx_locations_slug ON locations(slug);
CREATE INDEX IF NOT EXISTS idx_franchise_locations_franchise ON franchise_locations(franchise_id);
CREATE INDEX IF NOT EXISTS idx_franchise_locations_location ON franchise_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_franchise_locations_type ON franchise_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_franchise_locations_source_field ON franchise_locations(source_field);
