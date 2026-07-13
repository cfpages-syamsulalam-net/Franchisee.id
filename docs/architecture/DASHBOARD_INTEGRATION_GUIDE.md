# Dashboard Integration Guide

Last updated: 2026-07-13 21:04 (Asia/Jakarta)

## Purpose

This document is the focused setup reference for third-party integrations needed by `/dashboard`. Keep warning links and in-app dashboard setup anchors aligned with this file.

The in-app Operations tab includes a compact `Panduan Integrasi Dashboard` component with stable deep-link anchors:

| Integration | Dashboard anchor |
| --- | --- |
| Google Contacts Outreach | `/dashboard/#google-contacts-setup` |
| OCR Provider Setup | `/dashboard/#ocr-provider-setup` |
| OCR Scheduler Setup | `/dashboard/#ocr-scheduler-setup` |
| Email Delivery Setup | `/dashboard/#email-delivery-setup` |
| Publish Automation Setup | `/dashboard/#publish-automation-setup` |

Dashboard warnings should link to the matching anchor when a staff/admin action is blocked by missing setup.

## Google Contacts Outreach

Required for the Outreach `Simpan kontak` action:

- Enable Google People API in the Google Cloud project used by the Clerk Google OAuth connection.
- Add the Contacts OAuth scope to Clerk's Google connection: `https://www.googleapis.com/auth/contacts`.
- Save the Clerk provider settings.
- Ask staff to logout and login again with Google so Clerk receives a fresh OAuth token with the new Contacts permission.

Runtime behavior:

- `/dashboard-data` routes `save_outreach_google_contacts` to `functions/_google-contacts.js`.
- The server reads the current unclaimed outreach queue from D1.
- The server retrieves the staff member's linked Google OAuth access token through Clerk.
- Existing Google Contacts are searched first with Google People API.
- Duplicate phone numbers are skipped before `people:batchCreateContacts`.
- Setup-required failures return `documentation_url: "/dashboard/#google-contacts-setup"` so the dashboard warning can show a direct setup link.

If the warning says `Izin menyimpan Google Contacts belum aktif`, update the Clerk Google scope, confirm People API is enabled, then ask the staff user to logout and login again with Google before retrying.

## OCR Provider Setup

Required for OCR provider configuration and OCR dry-run/batch actions:

- Configure Cloudflare Pages secret `OCR_KEY`.
- Use the OCR tab to save at least one provider credential set.
- Enable the provider in the provider priority list after required credentials are present.
- Run `Dry run 1 aset` before running broad OCR batches.

Runtime behavior:

- OCR provider credentials are stored in D1 encrypted with `OCR_KEY`.
- Dashboard reads return only masked provider state, never stored key values.
- OCR calls only happen through explicit admin dry-run/batch actions or the protected OCR worker path.

## OCR Scheduler Setup

Required for long-running OCR batches that continue while the browser tab is inactive:

- Configure Cloudflare Pages secret `OCR_SECRET` for `/ocr-worker`.
- Configure the selected scheduler provider in the OCR Scheduler panel.
- For Upstash QStash, ensure the token and destination URL pass dashboard preflight before a large batch is created.

Runtime behavior:

- Dashboard creates persisted OCR batch rows.
- Scheduler dispatch wakes `/ocr-worker` in small chunks.
- Batch rows expose progress, pause, retry, and scheduler ETA/status in the OCR tab.

## Email Delivery Setup

Required for Premium payment, renewal, grace-period, and annual report email delivery:

- Verify the sender domain and DNS records in Resend.
- Configure `RESEND_API_KEY`.
- Configure `PREMIUM_EMAIL_FROM`.
- Configure `PREMIUM_EMAIL_REPLY_TO` when a reply-to address should differ from the sender.
- Configure `PREMIUM_EMAIL_WORKER_SECRET` in the secret store used by the protected email worker trigger.

Runtime behavior:

- Premium events enqueue email rows in D1.
- The protected email worker sends due rows through Resend.
- Dashboard queue controls can retry or cancel rows, but real delivery still depends on Resend/API/sender-domain setup.

## Publish Automation Setup

Required for approved public listing changes to reach production pages:

- Cloudflare Pages build command should be `pnpm run build` or `pnpm run build:astro`.
- Cloudflare Pages output directory should be `dist`.
- Cloudflare Pages must have D1 binding `franchise_db`.
- Cloudflare Pages builds need the D1 read credential/token required by `scripts/build-d1-franchise-pages.ts`.
- The D1 static publish poller needs the Franchisee.id Pages deploy hook.

Runtime behavior:

- Public-page-affecting D1 writes enqueue `site_rebuild_requests`.
- The publish poller checks dirty rows and triggers the Pages deploy hook within guardrails.
- Generated `dist/` output is build output and should not be left in the repo after local validation.

