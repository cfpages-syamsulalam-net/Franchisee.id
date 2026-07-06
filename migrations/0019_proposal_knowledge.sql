-- Preserve extracted brochure/proposal text and structured candidates without
-- treating machine-derived values as canonical listing data before review.

CREATE TABLE IF NOT EXISTS franchise_asset_knowledge (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  franchise_id TEXT NOT NULL,
  extraction_method TEXT NOT NULL,
  extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'extracted', 'needs_ocr', 'failed')),
  source_text TEXT,
  structured_data TEXT,
  page_count INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES franchise_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  UNIQUE (asset_id)
);

CREATE INDEX IF NOT EXISTS idx_franchise_asset_knowledge_listing
  ON franchise_asset_knowledge(franchise_id, extraction_status, created_at DESC);
