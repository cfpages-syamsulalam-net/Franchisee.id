CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_owner_review ON listing_edit_suggestions (franchise_id, suggested_by_user_id, field_name) WHERE status = 'pending' AND reason = 'Perubahan pemilik setelah listing diterbitkan';

CREATE TRIGGER IF NOT EXISTS guard_owner_edit_review_decision
BEFORE UPDATE OF status ON listing_edit_suggestions
WHEN NEW.status IN ('approved', 'rejected')
BEGIN
  SELECT RAISE(ABORT, 'owner_edit_already_reviewed') WHERE OLD.status <> 'pending';
  SELECT RAISE(ABORT, 'owner_edit_target_changed')
    WHERE NEW.status = 'approved' AND OLD.reason = 'Perubahan pemilik setelah listing diterbitkan'
      AND NOT EXISTS (
        SELECT 1 FROM franchises f
        WHERE f.id = OLD.franchise_id AND f.owner_user_id = OLD.suggested_by_user_id
      );  SELECT RAISE(ABORT, 'owner_edit_review_notes_required')
    WHERE OLD.field_name = 'franchisor_profile'
      AND TRIM(COALESCE(NEW.review_notes, '')) = '';
END;