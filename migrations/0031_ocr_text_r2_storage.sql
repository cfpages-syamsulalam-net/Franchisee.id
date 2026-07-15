-- Move long OCR/proposal extracted text out of D1 and into R2 objects.
-- D1 keeps preview/search metadata plus R2 pointers.

PRAGMA foreign_keys = ON;

ALTER TABLE franchise_asset_knowledge ADD COLUMN source_text_r2_bucket TEXT;
ALTER TABLE franchise_asset_knowledge ADD COLUMN source_text_r2_key TEXT;
ALTER TABLE franchise_asset_knowledge ADD COLUMN source_text_preview TEXT;
ALTER TABLE franchise_asset_knowledge ADD COLUMN source_text_length INTEGER NOT NULL DEFAULT 0;

UPDATE franchise_asset_knowledge
SET
  source_text_preview = SUBSTR(COALESCE(source_text, ''), 1, 1200),
  source_text_length = LENGTH(COALESCE(source_text, ''))
WHERE source_text_preview IS NULL;

CREATE INDEX IF NOT EXISTS idx_franchise_asset_knowledge_text_r2
  ON franchise_asset_knowledge(source_text_r2_key);

ALTER TABLE ocr_content_cache ADD COLUMN text_r2_bucket TEXT;
ALTER TABLE ocr_content_cache ADD COLUMN text_r2_key TEXT;
ALTER TABLE ocr_content_cache ADD COLUMN text_preview TEXT;

UPDATE ocr_content_cache
SET text_preview = SUBSTR(COALESCE(text, ''), 1, 1200)
WHERE text_preview IS NULL;

CREATE INDEX IF NOT EXISTS idx_ocr_content_cache_text_r2
  ON ocr_content_cache(text_r2_key);
