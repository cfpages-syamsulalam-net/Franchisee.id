-- Rejected applications release the pending brand name; a later attempt must be a fresh review.
DROP TRIGGER IF EXISTS guard_new_brand_review_decision;
CREATE TRIGGER guard_new_brand_review_decision
BEFORE UPDATE OF status ON franchise_submission_reviews
BEGIN
  SELECT RAISE(ABORT, 'new_brand_already_reviewed') WHERE OLD.status <> 'pending';
  SELECT RAISE(ABORT, 'new_brand_invalid_decision') WHERE NEW.status NOT IN ('approved', 'rejected');
  SELECT RAISE(ABORT, 'new_brand_evidence_required')
    WHERE TRIM(COALESCE(NEW.review_notes, '')) = '' OR NEW.reviewed_by_user_id IS NULL;
  SELECT RAISE(ABORT, 'new_brand_not_pending') WHERE NOT EXISTS (
    SELECT 1 FROM franchises WHERE id = NEW.franchise_id
      AND source_sheet = 'FRANCHISOR' AND status = 'pending_review' AND owner_user_id IS NULL
  );
END;