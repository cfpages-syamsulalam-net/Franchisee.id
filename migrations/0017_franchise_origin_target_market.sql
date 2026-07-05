ALTER TABLE franchises ADD COLUMN brand_country TEXT;
ALTER TABLE franchises ADD COLUMN target_market TEXT;

CREATE INDEX IF NOT EXISTS idx_franchises_brand_country ON franchises(brand_country);
