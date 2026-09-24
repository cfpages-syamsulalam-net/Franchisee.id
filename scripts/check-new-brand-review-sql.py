"""Run with python scripts/check-new-brand-review-sql.py from the repository root."""
import sqlite3
from pathlib import Path

connection = sqlite3.connect(":memory:")
connection.execute("PRAGMA foreign_keys = ON")
connection.executescript("""
CREATE TABLE users (id TEXT PRIMARY KEY);
CREATE TABLE franchises (
  id TEXT PRIMARY KEY, source_sheet TEXT, status TEXT, owner_user_id TEXT, brand_name TEXT
);
CREATE TABLE franchise_site_publications (
  id TEXT PRIMARY KEY, franchise_id TEXT, publication_status TEXT
);
INSERT INTO users VALUES ('applicant'), ('admin');
INSERT INTO franchises VALUES ('pending', 'FRANCHISOR', 'pending_review', NULL, 'Kopi Coba');
INSERT INTO franchise_site_publications VALUES ('publication', 'pending', 'draft');
""")
connection.executescript(Path("migrations/0037_new_brand_review.sql").read_text(encoding="utf-8"))
connection.executescript(Path("migrations/0038_rejected_brand_resubmission.sql").read_text(encoding="utf-8"))
connection.execute("INSERT INTO franchise_submission_reviews (id, franchise_id, applicant_user_id) VALUES (?, ?, ?)",
                   ("review", "pending", "applicant"))


def refused(sql, params=()):
    try:
        connection.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"Operation unexpectedly succeeded: {sql}")


refused("INSERT INTO franchises VALUES ('duplicate', 'FRANCHISOR', 'pending_review', NULL, ' kopi coba ')")
refused("UPDATE franchises SET owner_user_id = 'applicant' WHERE id = 'pending'")
refused("UPDATE franchises SET status = 'free' WHERE id = 'pending'")
refused("UPDATE franchise_site_publications SET publication_status = 'published' WHERE id = 'publication'")
refused("UPDATE franchise_submission_reviews SET status = 'approved' WHERE id = 'review'")
connection.execute("UPDATE franchise_submission_reviews SET status = 'rejected', review_notes = 'No independent confirmation', reviewed_by_user_id = 'admin' WHERE id = 'review'")
connection.execute("UPDATE franchises SET status = 'archived' WHERE id = 'pending'")
refused("UPDATE franchise_submission_reviews SET status = 'approved', review_notes = 'Too late' WHERE id = 'review'")
refused("UPDATE franchise_site_publications SET publication_status = 'published' WHERE id = 'publication'")
connection.execute("INSERT INTO franchises VALUES ('fresh', 'FRANCHISOR', 'pending_review', NULL, ' kopi coba ')")
connection.execute("INSERT INTO franchise_site_publications VALUES ('fresh_publication', 'fresh', 'draft')")
connection.execute("INSERT INTO franchise_submission_reviews (id, franchise_id, applicant_user_id) VALUES ('fresh_review', 'fresh', 'applicant')")
connection.execute("UPDATE franchise_submission_reviews SET status = 'approved', review_notes = 'Verified through independent brand channel', reviewed_by_user_id = 'admin' WHERE id = 'fresh_review'")
connection.execute("UPDATE franchises SET status = 'free', owner_user_id = 'applicant' WHERE id = 'fresh'")
connection.execute("UPDATE franchise_site_publications SET publication_status = 'published' WHERE id = 'fresh_publication'")
refused("UPDATE franchise_submission_reviews SET status = 'rejected' WHERE id = 'fresh_review'")
assert connection.execute("SELECT status, owner_user_id FROM franchises WHERE id = 'fresh'").fetchone() == ("free", "applicant")
assert connection.execute("SELECT status, owner_user_id FROM franchises WHERE id = 'pending'").fetchone() == ("archived", None)
print("new-brand review database guards passed")