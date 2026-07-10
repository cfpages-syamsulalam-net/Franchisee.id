-- Optional canonical fields for progressive franchisor form enrichment.
-- These fields are intentionally nullable so first-step franchisor onboarding stays low friction.

ALTER TABLE franchises ADD COLUMN min_area_sqm INTEGER;
ALTER TABLE franchises ADD COLUMN min_staff_count INTEGER;
ALTER TABLE franchises ADD COLUMN setup_duration_days INTEGER;
ALTER TABLE franchises ADD COLUMN working_capital_idr INTEGER;
ALTER TABLE franchises ADD COLUMN additional_cost_notes TEXT;
ALTER TABLE franchises ADD COLUMN estimated_bep_min_months INTEGER;
ALTER TABLE franchises ADD COLUMN estimated_bep_max_months INTEGER;
ALTER TABLE franchises ADD COLUMN omzet_monthly_min_idr INTEGER;
ALTER TABLE franchises ADD COLUMN omzet_monthly_max_idr INTEGER;
ALTER TABLE franchises ADD COLUMN net_profit_monthly_min_idr INTEGER;
ALTER TABLE franchises ADD COLUMN net_profit_monthly_max_idr INTEGER;
