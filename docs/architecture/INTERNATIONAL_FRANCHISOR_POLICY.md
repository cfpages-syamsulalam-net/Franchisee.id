# International Franchisor Policy

Last updated: 2026-07-05 23:55 (Asia/Jakarta)

## Rule
Franchisee.id should stay low-friction for Indonesian franchisors while still clearly supporting overseas brands that want Indonesian partners.

## Defaults
- If a franchisor does not provide explicit origin/market metadata, treat the listing as:
  - `brand_country`: `Indonesia`
  - `target_market`: `Indonesia`
- Indonesian contact numbers are an acceptable operational signal for this default, because Indonesian mobile numbers usually require local identity registration.
- Owners can correct these fields later from `/profil`; admins can correct them from `/dashboard`.

## Form UX
- Do not show origin/target-market as required visible questions for the default Indonesian case.
- Keep the fields collapsed under a “Brand dari luar Indonesia?” section.
- If a franchisor selects a non-Indonesia contact country code, open the section and prefill the matching brand country while keeping target market as Indonesia.
- For non-Indonesia franchisors, the form should support Southeast Asia and nearby Asian markets with flag labels.
- Supported country names, dial codes, aliases, flag labels, WhatsApp digit ranges, and international mobile patterns live in `data/country-metadata.json`; runtime adapters and public JSON should stay aligned with that source.

## Public Listing UX
- Do not add country badges to Indonesian listings.
- Show country/target facts only when `brand_country` is not Indonesia.
- Use flag emoji where useful for non-Indonesia country display.

## Data Backfill
- Existing listings with null origin/target fields may be backfilled from clear phone-country signals.
- Indonesian phone signals can safely backfill both fields to Indonesia.
- Non-Indonesia phone-country signals can backfill brand origin to the detected country and target market to Indonesia, as a practical starting point that owners/admins can correct.
