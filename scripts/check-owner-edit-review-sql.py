"""Check the D1 guard for reviewed owner edits without touching production."""
import sqlite3
from pathlib import Path

con = sqlite3.connect(':memory:')
con.executescript("""
CREATE TABLE franchises (id TEXT PRIMARY KEY, owner_user_id TEXT);
CREATE TABLE listing_edit_suggestions (
  id TEXT PRIMARY KEY, franchise_id TEXT, suggested_by_user_id TEXT,
  field_name TEXT, status TEXT, review_notes TEXT, reason TEXT
);
INSERT INTO franchises VALUES ('listing', 'owner');
INSERT INTO listing_edit_suggestions VALUES ('profile', 'listing', 'owner', 'franchisor_profile', 'pending', NULL, 'Perubahan pemilik setelah listing diterbitkan');
INSERT INTO listing_edit_suggestions VALUES ('listing-edit', 'listing', 'owner', 'json_diff', 'pending', NULL, 'Perubahan pemilik setelah listing diterbitkan');
""")
con.executescript(Path('migrations/0039_owner_edit_review_guard.sql').read_text(encoding='utf-8'))

def denied(statement):
    try:
        con.execute(statement)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f'Unexpected approval: {statement}')

denied("UPDATE listing_edit_suggestions SET status='approved' WHERE id='profile'")
con.execute("UPDATE franchises SET owner_user_id='attacker' WHERE id='listing'")
denied("UPDATE listing_edit_suggestions SET status='approved', review_notes='Checked independently' WHERE id='profile'")
denied("UPDATE listing_edit_suggestions SET status='approved' WHERE id='listing-edit'")
con.execute("UPDATE franchises SET owner_user_id='owner' WHERE id='listing'")
con.execute("UPDATE listing_edit_suggestions SET status='approved', review_notes='Checked independently' WHERE id='profile'")
denied("UPDATE listing_edit_suggestions SET status='rejected' WHERE id='profile'")
print('Owner review D1 guards prevent stale ownership and repeated decisions')