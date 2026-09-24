-- A complete claim is still an allegation: only a pending claim for an unowned listing can be approved.
CREATE TRIGGER IF NOT EXISTS guard_franchise_claim_approval
BEFORE UPDATE OF status ON franchise_claims
WHEN NEW.status = 'approved' AND OLD.status <> 'approved'
BEGIN
  SELECT RAISE(ABORT, 'claim_target_not_unclaimed')
  WHERE OLD.status <> 'pending' OR NOT EXISTS (
    SELECT 1 FROM franchises
    WHERE id = NEW.franchise_id AND owner_user_id IS NULL
      AND status = 'unclaimed' AND source_sheet = 'UNCLAIMED'
  );
END;

-- Separate simultaneous requests cannot open parallel claims for one listing.
CREATE TRIGGER IF NOT EXISTS guard_franchise_claim_pending
BEFORE INSERT ON franchise_claims
WHEN NEW.status = 'pending'
BEGIN
  SELECT RAISE(ABORT, 'claim_already_pending')
  WHERE EXISTS (
    SELECT 1 FROM franchise_claims
    WHERE franchise_id = NEW.franchise_id AND status = 'pending'
  );
  SELECT RAISE(ABORT, 'claim_target_not_unclaimed')
  WHERE NOT EXISTS (
    SELECT 1 FROM franchises
    WHERE id = NEW.franchise_id AND owner_user_id IS NULL
      AND status = 'unclaimed' AND source_sheet = 'UNCLAIMED'
  );
END;

-- A second reviewer cannot silently repeat or reverse a completed decision.
CREATE TRIGGER IF NOT EXISTS guard_franchise_claim_single_review
BEFORE UPDATE OF status ON franchise_claims
WHEN OLD.status <> 'pending'
BEGIN
  SELECT RAISE(ABORT, 'claim_already_reviewed');
END;
