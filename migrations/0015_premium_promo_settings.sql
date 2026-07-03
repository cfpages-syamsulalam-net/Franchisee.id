-- Admin-managed Premium promo/event ribbon settings.

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO premium_settings (setting_key, value_number, value_text) VALUES
  ('promo_enabled', 0, NULL),
  ('promo_discount_percent', 0, NULL),
  ('promo_label', NULL, ''),
  ('promo_message', NULL, ''),
  ('promo_bonus_text', NULL, ''),
  ('promo_cta_label', NULL, 'Lihat Premium'),
  ('promo_cta_url', NULL, '/premium/'),
  ('promo_starts_at', NULL, ''),
  ('promo_ends_at', NULL, '');
