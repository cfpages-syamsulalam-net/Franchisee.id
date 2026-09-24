-- Brand name lookup is used while completing the franchisor form and on final submit.
CREATE INDEX IF NOT EXISTS idx_franchises_brand_match
  ON franchises(LOWER(TRIM(brand_name)));
