-- Backfill legacy listing origin/target metadata from clear phone-country signals.
-- Indonesian phone signals default old listings to Indonesia/Indonesia.
-- Recognized non-Indonesia phone signals default brand origin to that country and target market to Indonesia.

WITH contact_signals AS (
  SELECT
    f.id,
    lower(
      COALESCE(f.phone, '') || ' ' ||
      COALESCE(fp.whatsapp, '') || ' ' ||
      COALESCE((
        SELECT group_concat(COALESCE(fc.value, '') || ' ' || COALESCE(fc.normalized_value, ''), ' ')
        FROM franchise_contacts fc
        WHERE fc.franchise_id = f.id
          AND fc.status = 'active'
          AND fc.contact_type IN ('phone', 'whatsapp')
      ), '')
    ) AS contact_text
  FROM franchises f
  LEFT JOIN franchisor_profiles fp ON fp.id = f.franchisor_profile_id
),
inferred_origin AS (
  SELECT
    id,
    CASE
      WHEN contact_text LIKE '%+62%' OR contact_text LIKE '%628%' OR contact_text LIKE '08%' OR contact_text LIKE '% 08%' OR contact_text LIKE '%/08%' OR contact_text LIKE '%-08%' THEN 'Indonesia'
      WHEN contact_text LIKE '%+886%' OR contact_text LIKE '%8869%' THEN 'Taiwan'
      WHEN contact_text LIKE '%+852%' OR contact_text LIKE '%8525%' OR contact_text LIKE '%8526%' OR contact_text LIKE '%8529%' THEN 'Hong Kong'
      WHEN contact_text LIKE '%+853%' OR contact_text LIKE '%8536%' THEN 'Macau'
      WHEN contact_text LIKE '%+86%' OR contact_text LIKE '%8613%' OR contact_text LIKE '%8615%' OR contact_text LIKE '%8617%' OR contact_text LIKE '%8618%' THEN 'China'
      WHEN contact_text LIKE '%+60%' OR contact_text LIKE '%601%' THEN 'Malaysia'
      WHEN contact_text LIKE '%+65%' OR contact_text LIKE '%659%' OR contact_text LIKE '%658%' OR contact_text LIKE '%656%' THEN 'Singapore'
      WHEN contact_text LIKE '%+673%' OR contact_text LIKE '%6737%' OR contact_text LIKE '%6738%' THEN 'Brunei'
      WHEN contact_text LIKE '%+855%' OR contact_text LIKE '%8551%' OR contact_text LIKE '%8559%' THEN 'Cambodia'
      WHEN contact_text LIKE '%+670%' OR contact_text LIKE '%6707%' THEN 'Timor-Leste'
      WHEN contact_text LIKE '%+856%' OR contact_text LIKE '%85620%' THEN 'Laos'
      WHEN contact_text LIKE '%+95%' OR contact_text LIKE '%959%' THEN 'Myanmar'
      WHEN contact_text LIKE '%+63%' OR contact_text LIKE '%639%' THEN 'Philippines'
      WHEN contact_text LIKE '%+66%' OR contact_text LIKE '%668%' OR contact_text LIKE '%669%' OR contact_text LIKE '%666%' THEN 'Thailand'
      WHEN contact_text LIKE '%+84%' OR contact_text LIKE '%849%' OR contact_text LIKE '%848%' OR contact_text LIKE '%847%' OR contact_text LIKE '%843%' THEN 'Vietnam'
      WHEN contact_text LIKE '%+81%' OR contact_text LIKE '%8190%' OR contact_text LIKE '%8180%' OR contact_text LIKE '%8170%' THEN 'Japan'
      WHEN contact_text LIKE '%+82%' OR contact_text LIKE '%8210%' THEN 'South Korea'
      WHEN contact_text LIKE '%+91%' OR contact_text LIKE '%916%' OR contact_text LIKE '%917%' OR contact_text LIKE '%918%' OR contact_text LIKE '%919%' THEN 'India'
      WHEN contact_text LIKE '%+880%' OR contact_text LIKE '%8801%' THEN 'Bangladesh'
      WHEN contact_text LIKE '%+92%' OR contact_text LIKE '%923%' THEN 'Pakistan'
      WHEN contact_text LIKE '%+94%' OR contact_text LIKE '%947%' THEN 'Sri Lanka'
      WHEN contact_text LIKE '%+977%' OR contact_text LIKE '%97798%' OR contact_text LIKE '%97797%' THEN 'Nepal'
      ELSE NULL
    END AS brand_country
  FROM contact_signals
)
UPDATE franchises
SET
  brand_country = CASE
    WHEN brand_country IS NULL OR TRIM(brand_country) = ''
      THEN (SELECT brand_country FROM inferred_origin WHERE inferred_origin.id = franchises.id)
    ELSE brand_country
  END,
  target_market = CASE
    WHEN target_market IS NULL OR TRIM(target_market) = ''
      THEN 'Indonesia'
    ELSE target_market
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT id
  FROM inferred_origin
  WHERE brand_country IS NOT NULL
)
AND (
  brand_country IS NULL OR TRIM(brand_country) = '' OR
  target_market IS NULL OR TRIM(target_market) = ''
);
