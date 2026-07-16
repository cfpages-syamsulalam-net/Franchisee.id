# Dashboard Integration Guide

Last updated: 2026-07-16 15:11 (Asia/Jakarta)

## Purpose

This document is the focused setup reference for third-party integrations needed by `/dashboard`. The in-app dashboard guide lives in `src/components/dashboard/DashboardIntegrationGuide.astro`; keep its anchors and this file aligned.

Stable in-app anchors:

| Integration | Dashboard anchor |
| --- | --- |
| Google Contacts Outreach | `/dashboard/#google-contacts-setup` |
| OCR Provider Setup | `/dashboard/#ocr-provider-setup` |
| OCR Scheduler Setup | `/dashboard/#ocr-scheduler-setup` |
| Email Delivery Setup | `/dashboard/#email-delivery-setup` |
| Publish Automation Setup | `/dashboard/#publish-automation-setup` |

Dashboard warnings should link to the matching anchor when a staff/admin action is blocked by missing setup.

## Google Contacts Outreach

Used by the Outreach `Simpan kontak` action to save franchisor names and phone numbers into the currently linked Google account for the logged-in staff member.

Implementation decision:

- Do not put `https://www.googleapis.com/auth/contacts` on the main Clerk Google login.
- Normal login stays `openid email profile` only for all users.
- `/dashboard` uses a separate staff/admin-only Google Contacts OAuth flow. Staff connect Contacts from the Outreach tab after D1 has already confirmed their `staff` or `admin` role.
- Contacts tokens are stored in D1 as encrypted envelopes in `staff_google_connections`; transient OAuth state is stored in `staff_google_oauth_states`.

Steps:

1. Open the Google Cloud People API page: <https://console.cloud.google.com/apis/library/people.googleapis.com>.
2. Select the Google Cloud project used for the dashboard Contacts integration.
3. Enable the People API.
4. Open Google Auth Platform > Clients and create a Web application OAuth client for dashboard Contacts.
5. Add this authorized redirect URI: `https://franchisee.id/google-contacts-callback`.
6. In Google Auth Platform > Branding, add the production homepage `https://franchisee.id/`, privacy policy `https://franchisee.id/privacy-policy`, terms URL `https://franchisee.id/terms-of-service`, support email `email@franchisee.id`, and authorized domain `franchisee.id`.
7. In Google Auth Platform > Data Access, add only this extra scope for the dashboard Contacts client: `https://www.googleapis.com/auth/contacts`.
8. Submit Google verification for the Contacts scope before broad production use. While unverified/testing, add staff email addresses as test users.
9. In Cloudflare Pages production secrets/variables, set:
   - `GOOGLE_CONTACTS_CLIENT_ID`
   - `GOOGLE_CONTACTS_CLIENT_SECRET`
   - `GOOGLE_CONTACTS_TOKEN_KEY`
   - Optional override: `GOOGLE_CONTACTS_REDIRECT_URI` if it differs from `https://franchisee.id/google-contacts-callback`.
10. Apply migration `0033_staff_google_contacts_oauth.sql` to D1.
11. Ask staff to open `/dashboard/#outreach`, click `Hubungkan Google Contacts`, approve the Google consent, then retry `Simpan kontak`.
12. If staff needs to change Google accounts or consent is revoked, use the Outreach reconnect/disconnect controls next to the connected Google account pill.

Useful references:

- Google People API `people.batchCreateContacts`: <https://developers.google.com/people/api/rest/v1/people/batchCreateContacts>
- Google OAuth app verification: <https://support.google.com/cloud/answer/13463073>
- Google OAuth production audience/testing: <https://support.google.com/cloud/answer/15549945>
- Google OAuth incremental authorization best practice: <https://developers.google.com/identity/protocols/oauth2/resources/best-practices>

Runtime behavior:

- `/google-contacts-start` requires the Clerk session and D1 `staff`/`admin` role, creates a short-lived OAuth state row, and returns a Google authorization URL.
- `/google-contacts-callback` exchanges the Google code, encrypts the access/refresh tokens with `GOOGLE_CONTACTS_TOKEN_KEY`, and redirects back to `/dashboard/#outreach`.
- `/dashboard-data` returns `google_contacts` connection state, token health, last connection error/timestamps, routes `save_outreach_google_contacts` to `functions/_google-contacts.js`, and routes `disconnect_google_contacts` to the revoke helper in `functions/_google-contacts-oauth.js`.
- The server reads the current unclaimed outreach queue from D1.
- The server retrieves the staff member's encrypted dashboard Contacts token from D1 and refreshes it when possible.
- Existing Google Contacts are searched first with Google People API.
- Duplicate phone numbers are skipped before `people:batchCreateContacts`.
- Setup-required failures return `documentation_url: "/dashboard/#google-contacts-setup"` so the dashboard warning can show a direct setup link.

## OCR Provider Setup

Used by OCR dry-run and OCR batch actions.

Steps:

1. Open Cloudflare Pages for the project.
2. Go to Settings > Environment variables.
3. Add `OCR_KEY` as a secret. Keep this value stable; if it changes, previously encrypted OCR credentials may no longer decrypt.
4. Open `/dashboard/#ocr`.
5. In the OCR tab, choose a provider and fill the credential fields required by that provider.
6. Enable the provider in the priority list.
7. Run `Dry run 1 aset`.
8. Only run a broad OCR batch after the dry-run returns useful text.

Useful references:

- Cloudflare Pages environment variables: <https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables>

Runtime behavior:

- OCR provider credentials are stored in D1 encrypted with `OCR_KEY`.
- Dashboard reads return masked provider state only, never stored key values.
- OCR calls only happen through explicit admin dry-run/batch actions or the protected OCR worker path.

## OCR Scheduler Setup

Used for long-running OCR batches that should continue while the browser tab is inactive.

Steps:

1. Add Cloudflare secret `OCR_SECRET`. This protects `/ocr-worker`.
2. If using QStash, create or open the Upstash QStash account.
3. Copy a token that can publish a request to the OCR worker URL.
4. Open `/dashboard/#ocr`.
5. In the OCR scheduler settings, select the scheduler provider.
6. Fill the scheduler token and destination URL.
7. Save the scheduler settings.
8. Start a small batch first. The dashboard should run scheduler preflight before creating a large batch.
9. If preflight fails, check the token, destination URL, and `OCR_SECRET`.

Useful references:

- QStash getting started: <https://upstash.com/docs/qstash/overall/getstarted>
- Cloudflare Pages Functions bindings: <https://developers.cloudflare.com/pages/functions/bindings/>

Runtime behavior:

- Dashboard creates persisted OCR batch rows.
- Scheduler dispatch wakes `/ocr-worker` in small chunks.
- Batch rows expose progress, pause, retry, and scheduler ETA/status in the OCR tab.

## Email Delivery Setup

Used for Premium payment, renewal, grace-period, and annual report email delivery.

Steps:

1. Open Resend and add the sender domain.
2. Add the DNS records Resend asks for.
3. Wait until the domain is verified.
4. Add secret `RESEND_API_KEY`.
5. Add `PREMIUM_EMAIL_FROM`, for example `Franchisee.id <premium@example.com>`.
6. Add `PREMIUM_EMAIL_REPLY_TO` if replies should go to a different address.
7. Add `PREMIUM_EMAIL_WORKER_SECRET`.
8. Trigger the email worker or wait for the configured schedule.
9. Check the Premium email queue in the dashboard.

Useful references:

- Resend domain verification: <https://resend.com/docs/dashboard/domains/introduction>
- Resend send email API: <https://resend.com/docs/api-reference/emails/send-email>

Runtime behavior:

- Premium events enqueue email rows in D1.
- The protected email worker sends due rows through Resend.
- Dashboard queue controls can retry or cancel rows, but real delivery still depends on Resend/API/sender-domain setup.

## Publish Automation Setup

Used so approved listing changes can reach production pages.

Steps:

1. Open Cloudflare Pages for the production project.
2. Set build command to `pnpm run build` or `pnpm run build:astro`.
3. Set output directory to `dist`.
4. Confirm Pages Functions has D1 binding `franchise_db`.
5. Confirm the build environment has the D1 read credential/token needed by `scripts/build-d1-franchise-pages.ts`.
6. Create or verify the Pages deploy hook used by the publish poller.
7. Approve one small public listing edit.
8. Confirm `site_rebuild_requests` is queued and the deploy hook is triggered by the poller.

Useful references:

- Cloudflare Pages build configuration: <https://developers.cloudflare.com/pages/configuration/build-configuration/>
- Cloudflare Pages Functions bindings: <https://developers.cloudflare.com/pages/functions/bindings/>
- Cloudflare Pages deploy hooks: <https://developers.cloudflare.com/pages/configuration/deploy-hooks/>

Runtime behavior:

- Public-page-affecting D1 writes enqueue `site_rebuild_requests`.
- The publish poller checks dirty rows and triggers the Pages deploy hook within guardrails.
- Generated `dist/` output is build output and should not be left in the repo after local validation.
