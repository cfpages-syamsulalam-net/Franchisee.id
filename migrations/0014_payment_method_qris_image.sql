-- Add optional QRIS image URL storage for manual Premium payment instructions.

PRAGMA foreign_keys = ON;

ALTER TABLE payment_methods ADD COLUMN qris_image_url TEXT;
ALTER TABLE payment_methods ADD COLUMN qris_image_alt TEXT;
