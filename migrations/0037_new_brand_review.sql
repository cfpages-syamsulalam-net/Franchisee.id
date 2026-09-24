CREATE TABLE IF NOT EXISTS franchise_submission_reviews (
  id TEXT PRIMARY KEY,
  franchise_id TEXT NOT NULL UNIQUE REFERENCES franchises(id) ON DELETE CASCADE,
  applicant_user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT NOT NULL DEFAULT '',
  reviewed_by_user_id TEXT REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_franchise_submission_reviews_status
  ON franchise_submission_reviews(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_new_brand_name
ON franchises(LOWER(TRIM(brand_name)))
WHERE source_sheet = 'FRANCHISOR' AND status = 'pending_review';

CREATE TRIGGER IF NOT EXISTS guard_new_brand_review_insert
BEFORE INSERT ON franchise_submission_reviews
BEGIN
  SELECT RAISE(ABORT, 'new_brand_not_pending')
  WHERE NEW.status <> 'pending' OR NOT EXISTS (
    SELECT 1 FROM franchises WHERE id = NEW.franchise_id
      AND source_sheet = 'FRANCHISOR' AND status = 'pending_review' AND owner_user_id IS NULL
  );
END;

CREATE TRIGGER IF NOT EXISTS guard_new_brand_review_decision
BEFORE UPDATE OF status ON franchise_submission_reviews
BEGIN
  SELECT RAISE(ABORT, 'new_brand_already_approved') WHERE OLD.status = 'approved';
  SELECT RAISE(ABORT, 'new_brand_invalid_decision')
  WHERE NEW.status = 'pending' OR NEW.status = OLD.status;
  SELECT RAISE(ABORT, 'new_brand_evidence_required')
  WHERE TRIM(COALESCE(NEW.review_notes, '')) = '' OR NEW.reviewed_by_user_id IS NULL;
  SELECT RAISE(ABORT, 'new_brand_not_pending')
  WHERE NOT EXISTS (
    SELECT 1 FROM franchises WHERE id = NEW.franchise_id
      AND source_sheet = 'FRANCHISOR' AND status = 'pending_review' AND owner_user_id IS NULL
  );
END;

CREATE TRIGGER IF NOT EXISTS guard_unreviewed_brand_owner
BEFORE UPDATE OF owner_user_id, status ON franchises
WHEN EXISTS (SELECT 1 FROM franchise_submission_reviews r WHERE r.franchise_id = NEW.id AND r.status <> 'approved')
  AND (NEW.owner_user_id IS NOT NULL OR NEW.status IN ('free', 'verified', 'premium'))
BEGIN
  SELECT RAISE(ABORT, 'new_brand_review_required');
END;

CREATE TRIGGER IF NOT EXISTS guard_unreviewed_brand_publication_insert
BEFORE INSERT ON franchise_site_publications
WHEN NEW.publication_status = 'published'
  AND EXISTS (SELECT 1 FROM franchise_submission_reviews r WHERE r.franchise_id = NEW.franchise_id AND r.status <> 'approved')
BEGIN
  SELECT RAISE(ABORT, 'new_brand_review_required');
END;

CREATE TRIGGER IF NOT EXISTS guard_unreviewed_brand_publication_update
BEFORE UPDATE OF publication_status ON franchise_site_publications
WHEN NEW.publication_status = 'published'
  AND EXISTS (SELECT 1 FROM franchise_submission_reviews r WHERE r.franchise_id = NEW.franchise_id AND r.status <> 'approved')
BEGIN
  SELECT RAISE(ABORT, 'new_brand_review_required');
END;