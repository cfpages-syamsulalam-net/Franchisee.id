-- Add optional brand social profile links for franchisor-owned listings.
-- These fields live on franchisor_profiles for now because the existing
-- website_url and instagram_url fields are already stored there.

ALTER TABLE franchisor_profiles ADD COLUMN facebook_url TEXT;
ALTER TABLE franchisor_profiles ADD COLUMN tiktok_url TEXT;
ALTER TABLE franchisor_profiles ADD COLUMN youtube_url TEXT;
ALTER TABLE franchisor_profiles ADD COLUMN linkedin_url TEXT;
