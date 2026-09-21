# Public franchise privacy fix

## Root cause

`GET /get-franchises` accepted `tab=FRANCHISEE` anonymously, selected all rows from `franchisee_profiles` or the FRANCHISEE Google Sheet, mapped applicant email, WhatsApp, location plan, and message, and returned the result with public caching and wildcard CORS.

## Change

`functions/get-franchises.js` now rejects `FRANCHISEE` immediately after query validation with `403 PUBLIC_FRANCHISEE_EXPORT_UNAVAILABLE` and `Cache-Control: no-store`. The guard runs before D1 selection or Sheets token/fetch work. The protected dashboard remains the consumer for applicant data. Public `FRANCHISOR` and `UNCLAIMED` paths are unchanged.

## Verification

Run `pnpm exec tsx scripts/check-public-franchise-privacy.ts`.

The check executes the real handler with mocked D1 and `fetch`, proves both public sources are rejected without touching either dependency, and proves an `UNCLAIMED` D1 claim-search response remains available.

## Limitations

This is local handler coverage with no deployed-route or CDN verification. A parent/coordinator must verify the deployed endpoint after publication. Repository-wide build checks are outside this focused function change.
