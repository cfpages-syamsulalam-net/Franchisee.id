# Premium Monetization Plan

Last updated: 2026-07-04 00:10 (Asia/Jakarta)

This is the working plan and progress tracker for monetizing the Franchisee.id network while keeping the public franchise directory free.

## Product Positioning

Franchisee.id stays a free directory for franchise discovery. Premium is not a paywall for basic presence; it is a paid distribution and conversion layer for franchisors who want more qualified attention, stronger trust signals, better listing presentation, and easier lead handling across the owned network.

Working offer:

| Plan | Price | Audience | Core promise |
| --- | ---: | --- | --- |
| Free Directory | Rp 0 | Any franchise/brand listing | Basic discoverability and claim path. |
| Premium Network | Rp 3.000.000 / year | Franchisors ready to recruit franchisees | Better visibility, stronger trust, lead capture, and distribution across Franchisee.id, Franchise.id, Franchisor.id, and Waralaba.id. |

The price target is modest for B2B lead generation: Rp 3.000.000 / year is Rp 250.000 / month. The value story should be framed as "one serious franchisee inquiry can justify the yearly fee" while avoiding guaranteed ROI claims.

## Benefits That Justify Premium

### 1. Network Distribution

Premium listings should publish across:
- `franchisee.id`: buyer-facing franchise opportunity directory.
- `franchise.id`: broad franchise education and brand discovery.
- `franchisor.id`: franchisor/operator-facing authority surface.
- `waralaba.id`: Indonesian-language franchise/waralaba SEO surface.

Implementation idea:
- Free: visible on Franchisee.id only, plus claim page.
- Premium: eligible for all network sites through `franchise_site_publications`.
- Dashboard shows publication status per site and public URLs.

Why it matters:
- The franchisor pays once but gets multiple search surfaces and domain contexts.
- The network can target different search intent without duplicating brand data.

### 2. Priority Placement Without Damaging Directory Trust

Premium should get better placement, but free results must remain useful. Avoid making the directory feel like ads only.

Suggested ranking:
- Search exact match always wins.
- Verified/premium gets a moderate boost in category and recommendation views.
- Premium gets "Featured" slots in category pages, but clearly labeled.
- Limit featured cards per viewport/section so organic directory quality remains intact.

Premium surfaces:
- Top category placements.
- Homepage/category "Rekomendasi" modules.
- Related listings on detail pages.
- Recommendation feed in `/profil` for matching franchisees.

### 3. Better Listing Page

Free listing page:
- Basic brand facts.
- Public imported contact info when available.
- Claim CTA.

Premium listing page:
- Verified/premium badge.
- Rich hero with logo/cover.
- Franchise package cards.
- Investment range, royalty, outlet count, support, training, and requirements.
- Downloadable proposal/brochure PDF.
- WhatsApp CTA and inquiry form above the fold.
- FAQ section.
- Gallery/video/embed support.
- "Why partner with this brand" section.
- Owner-managed updates through `/profil`.

The premium page should feel like a mini landing page inside the trusted directory.

Implemented public listing surfaces:
- [x] Premium CTA panel above the detail tabs with WhatsApp, "Minta info", and proposal shortcut when proposal assets exist.
- [x] Dynamic premium tabs on franchise detail pages: Galeri, Proposal, and FAQ appear only when relevant data exists.
- [x] Proposal tab reads image-based proposal assets from `proposal_url`, including legacy imported Blogspot/Blogger image URL lists from the old `brochures` CSV column.
- [x] Proposal image pages are displayed inline and can be combined into a browser-downloaded PDF from a sticky "Download PDF" button inside the Proposal tab.
- [x] Direct PDF proposal assets are shown as a clear "Buka PDF asli" link.

Implementation note:
- Legacy Blogspot/Blogger proposal images have been moved into the owned R2 media bucket for the migrated rows, so proposal display/download now reads first-party `assets.franchisee.id` image URLs after the static snapshot is refreshed. Current decision: keep PDF generation client-side from those first-party images so we do not store duplicate PDF files in R2. Revisit stored PDFs only if production usage shows mobile performance or sharing problems.

Client-side PDF method:
- Proposal images are stored once in R2 as page images.
- The detail page embeds those image URLs in the Proposal tab button metadata.
- When a visitor clicks Download PDF, browser JavaScript loads each image, draws it onto an A4-sized canvas, converts each canvas page to JPEG data, builds a PDF Blob in memory, and triggers a normal browser download.
- The generated PDF exists only on the visitor's device. It is not uploaded to R2 and does not create a second stored file.
- This saves storage while keeping the user-facing download behavior. If a very large proposal causes slow mobile downloads later, the fallback decision can be revisited.

### 4. Trust And Verification

Premium should include a clear trust layer, not just a badge.

Suggested verification checklist:
- Company identity reviewed.
- Brand ownership/contact verified.
- Package data reviewed.
- Public contact checked.
- Optional document upload: NIB, brand certificate, legal entity, proposal PDF.

Public copy should say simple things like:
- "Data utama sudah ditinjau."
- "Kontak brand sudah dikonfirmasi."

Avoid exposing internal terms such as D1, Clerk, webhook, or database.

### 5. Lead Capture And Routing

Premium franchisors should get better lead handling:
- Lead form on listing detail.
- WhatsApp click tracking.
- Saved opportunity count.
- Inquiry count.
- Lead inbox in `/profil`.
- Lead status pipeline: baru, dihubungi, qualified, tidak cocok, closing.
- Email notification for new inquiry.
- Export CSV.
- Optional weekly lead summary email.

High-value feature:
- Matching lead context: budget, location, category interest, and preferred timeline from franchisee profile.
- This makes the lead more useful than a raw phone number.

Current implementation:
- [x] Premium detail CTA sends logged-in franchisees through the same lead creation path as `/profil`.
- [x] If the franchisee has not completed their interest profile, the inline message returns a direct CTA to complete the form first.
- [x] WhatsApp/contact clicks and proposal PDF downloads reuse product event tracking so owner analytics can show meaningful actions.

### 6. Analytics Dashboard

Premium should include a simple performance report:
- Listing views.
- WhatsApp clicks.
- Inquiry submits.
- Save count.
- Top source site.
- Top categories/keywords when available.
- Conversion rate from view to inquiry.
- 30-day and 12-month trend.

Keep public copy practical:
- "Lihat berapa kali profil brand dilihat dan berapa calon mitra yang tertarik."

Implementation can reuse `franchise_product_events`.

Current implementation:
- [x] `/profil` includes an Analytics tab for franchisors and staff/admin users.
- [x] Owner analytics show 30-day views, saves, inquiries, contact clicks, and view-to-inquiry conversion.
- [x] Each owned listing has a per-listing analytics card with total and recent counts.

### 7. Content And SEO Support

Premium can include light editorial support:
- One brand profile article per year.
- Inclusion in category roundups when relevant.
- Inclusion in "franchise modal..." pages if package data matches.
- Internal links from educational articles.
- Optional interview/Q&A template.

This is valuable because it compounds traffic over time.

### 8. Media And Proposal Hosting

Premium includes:
- Logo and cover image hosting.
- Gallery images.
- Proposal PDF hosting.
- Brand introduction video link/embed.
- Standardized asset presentation across network sites.

This gives franchisors a cleaner public sales page even if they do not have a polished website.

Current implementation:
- [x] Owner profile already supports logo, cover, and proposal upload.
- [x] Public detail build now includes `gallery_urls`, `video_url`, and `proposal_url` in the D1 snapshot query.
- [x] Premium Galeri tab displays cover/logo/gallery images and a video link when available.
- [x] Add first-party proposal image ingestion from legacy Blogspot assets into the owned media bucket.
- [x] Keep proposal PDF download client-side from first-party R2 images to avoid duplicate PDF storage.

Migration note: on 2026-07-04, `scripts/migrate-blogspot-proposals-to-r2.mjs` migrated 491 legacy proposal images for 34 franchises into R2, wrote `franchise_assets` rows with the original source URLs, replaced `franchises.proposal_url` with first-party public image arrays, and queued static rebuild requests.

### 9. Claim And Edit Priority

Premium franchisors get:
- Faster claim review.
- Faster edit review.
- Owner-controlled updates with reasonable publishing limits.
- Public correction priority.

This is operationally cheap but valuable for the buyer.

### 10. Optional Concierge Add-ons

These should not be included in the Rp 3.000.000/year base package unless capacity is available:
- Proposal design help.
- Photo cleanup/compression.
- Copywriting refresh.
- Paid article package.
- WhatsApp follow-up service.
- Featured homepage takeover.
- Extra domain/network expansion.

Possible future pricing:
- Proposal cleanup: Rp 500.000 one-time.
- Brand article: Rp 750.000 one-time.
- Featured homepage slot: Rp 1.000.000/month.
- Lead follow-up admin service: custom.

## Minimum Premium Package Definition

The first version should be simple enough to ship.

Premium Network includes:
- One year active premium status.
- Publication across Franchisee.id, Franchise.id, Franchisor.id, and Waralaba.id when content is complete.
- Premium badge.
- Higher placement in relevant pages.
- Rich listing page with media/proposal.
- Lead form and WhatsApp CTA.
- Lead inbox in `/profil`.
- Basic analytics.
- One annual data review.

Not guaranteed:
- Number of leads.
- Closing result.
- Search ranking position on Google.

Suggested public wording:

> Tampil lebih lengkap dan lebih sering ditemukan calon mitra di jaringan Franchisee.id.

## Traffic Growth Plan

Premium can only be sold repeatedly if franchisors believe the network brings attention. The site needs visible traffic growth and transparent reporting.

### SEO Growth

Build SEO clusters:
- Franchise by category: makanan, minuman, laundry, pendidikan, ekspedisi, otomotif, kecantikan.
- Franchise by capital: modal 5 juta, 10 juta, 25 juta, 50 juta, 100 juta, 500 juta.
- Franchise by format: booth, gerobak, outlet kecil, cloud kitchen, jasa, online.
- Franchise by city/region intent: peluang franchise di Jakarta, Bandung, Surabaya, Medan, Makassar.
- Education guides: cara memilih franchise, pertanyaan sebelum beli franchise, biaya franchise, BEP, royalty fee, franchise vs kemitraan.
- Brand comparison pages: compare 2-5 brands in the same category.

Implementation guardrail:
- Avoid thin duplicate pages. Category/capital/city pages need real filters, useful explanations, and internal links.

### Buyer Tools

Tools create repeat usage and better leads:
- Franchise budget matcher.
- Category recommender.
- BEP calculator.
- Saved opportunity list.
- Compare listings.
- "Ask franchisor" inquiry flow.
- Checklist download.

These also justify premium because franchisors receive better-qualified leads.

### Content And Distribution

Channels:
- Weekly franchise opportunity roundup.
- WhatsApp broadcast/newsletter for buyers.
- LinkedIn posts for franchisor/business audience.
- TikTok/Shorts snippets: "franchise modal kecil", "cara cek franchise".
- Event/calendar pages for franchise expos.
- Partner articles with business communities.

Operational cadence:
- 2 SEO articles/week.
- 1 category/capital page improvement/week.
- 1 brand profile or comparison/week.
- Monthly traffic/lead report for internal review.

### Trust Signals

Show on `/premium`:
- Total listings.
- Number of categories.
- Network sites included.
- How leads are captured.
- Example premium listing layout.

Do not show traffic numbers publicly until they are meaningful and measured. Instead, show internal dashboard metrics to paying franchisors.

## `/premium` Page Plan

Route: `/premium/`

Audience:
- Claimed franchisors.
- Unclaimed brand owners.
- Franchisors comparing channels to recruit franchisees.

Primary CTA:
- "Daftar Premium"
- "Konfirmasi Pembayaran"
- If logged in franchisor: go to `/profil/?tab=membership`.
- If not logged in: go to `/login/?mode=register&role=franchisor&next=/premium/`.

Sections:

1. Hero
   - Headline: "Premium Network untuk Franchisor"
   - Supporting copy: "Tampilkan brand Anda lebih lengkap di jaringan Franchisee.id agar calon mitra lebih mudah menemukan, memahami, dan menghubungi Anda."
   - CTA: Daftar Premium.

2. Price
   - Rp 3.000.000 / tahun.
   - Covers one brand/listing.
   - Multi-brand pricing later.

3. What You Get
   - Network publication.
   - Premium badge.
   - Rich listing page.
   - Lead form and WhatsApp CTA.
   - Lead inbox.
   - Basic analytics.
   - Media/proposal upload.

4. Why It Is Worth It
   - Rp 250.000/month effective cost.
   - One serious candidate can justify the year.
   - Better data and presentation improves buyer confidence.

5. Payment
   - Bank BCA.
   - Account name: Syamsul Alam.
   - Account number: 0183579751.
   - Amount: Rp 3.000.000 + unique code.
   - Example: Rp 3.000.127.
   - Unique code expires after a payment window.

6. Confirmation
   - CTA: "Saya sudah transfer".
   - Form fields: brand, payer name, bank used, amount, transfer time, proof upload optional, notes.
   - Logged-in users should not retype known account/listing data.

7. FAQ
   - Is the directory still free?
   - Does premium guarantee leads?
   - How long until premium active?
   - Can I pay for multiple brands?
   - Can I cancel/refund?
   - Can I update listing data?

8. Contact
   - WhatsApp admin/support.
   - Email support if available later.

## Payment Confirmation Plan

### Phase 1: Manual Transfer With Unique Code

Use this first because it is fastest and works before payment gateway approval.

Flow:
1. User clicks "Daftar Premium".
2. System creates `premium_orders` row with:
   - order id.
   - user id.
   - franchise id.
   - base amount `3000000`.
   - unique code `001-999`.
   - payable amount.
   - expires at.
   - status `pending_payment`.
3. `/premium` displays payment instructions.
4. User transfers to BCA.
5. User clicks "Saya sudah transfer".
6. User submits confirmation.
7. Admin dashboard shows pending payment confirmations.
8. Admin approves after checking bank statement.
9. System creates/updates `franchise_subscriptions` and sets listing tier/publication as premium.

Unique code rules:
- Use the smallest unused code in the current active window, or random `001-999` with collision retry.
- Code must be included in payable amount.
- Expire after 24 hours.
- If expired, generate a new code.
- If amount is exact Rp 3.000.000 without code, allow manual matching but mark lower confidence.

Manual review data:
- Claimed account.
- Listing id.
- Expected amount.
- Submitted amount.
- Submitted bank/payer.
- Submitted timestamp.
- Uploaded proof.
- Matching confidence.

### Phase 2: Payment Gateway Webhooks

Recommended next step: use a payment gateway for automatic confirmation. This avoids risky direct bank scraping and gives reliable payment callbacks.

Candidate providers:
- Midtrans: payment links, invoices, Core API, QRIS/VA support, and HTTP notification/webhook docs.
- Xendit: payment links/invoices via API and webhooks for real-time payment status.
- Duitku: Indonesian payment gateway with dashboard/API integration options.

Preferred product:
- Dynamic invoice/payment link.
- Payment methods: VA BCA/other bank, QRIS, e-wallet.
- Webhook endpoint: `/payment-webhook`.
- On paid status: activate premium automatically.

Flow:
1. User creates premium order.
2. System creates invoice/payment link through gateway API.
3. User pays via VA/QRIS/e-wallet.
4. Gateway sends webhook.
5. System validates signature.
6. System marks order paid.
7. System activates premium membership.
8. Dashboard/profile shows active membership and invoice.

Why gateway is better:
- No need to read personal bank login.
- Webhook status is designed for automation.
- Payment methods expand without changing our core flow.
- Refund/reporting is cleaner.

### Phase 3: Official BCA API

BCA has official APIs for Mutasi Rekening, Virtual Account, and QRIS MPM. This can support direct bank-side reconciliation, but it is likely more operationally involved than a gateway.

Use this only if:
- Business/legal setup is ready.
- KlikBCA Bisnis / BCA API cooperation is approved.
- We want direct BCA VA/QRIS without gateway abstraction.

Possible BCA-backed flows:
- BCA VA for every order.
- BCA Mutasi Rekening polling for unique-code bank transfer matching.
- BCA QRIS MPM generate QR + notification.

Risks:
- Longer onboarding.
- API credentials and bank security handling.
- More compliance and operational responsibility.
- Personal account may not be appropriate for production automation; use a business account when possible.

Recommendation:
- Do not build screen-scraping against internet banking.
- Do not store bank login credentials.
- Start with manual unique-code transfer, then add payment gateway webhook.
- Treat official BCA API as future direct integration after payment volume justifies it.

## Data Model Plan

Tables to add later:

`premium_orders`
- `id`
- `user_id`
- `franchise_id`
- `plan_code`
- `base_amount`
- `unique_code`
- `payable_amount`
- `currency`
- `status`
- `payment_method`
- `payment_provider`
- `provider_invoice_id`
- `provider_payment_url`
- `expires_at`
- `paid_at`
- `created_at`
- `updated_at`

`premium_payment_confirmations`
- `id`
- `order_id`
- `user_id`
- `franchise_id`
- `payer_name`
- `payer_bank`
- `submitted_amount`
- `submitted_paid_at`
- `proof_asset_id`
- `notes`
- `review_status`
- `reviewed_by_user_id`
- `reviewed_at`
- `created_at`

`franchise_subscriptions`
- `id`
- `franchise_id`
- `user_id`
- `plan_code`
- `status`
- `starts_at`
- `ends_at`
- `renewal_status`
- `source_order_id`
- `created_at`
- `updated_at`

`premium_plan_features`
- optional later if we want editable packages in dashboard.

Existing table alignment:
- `franchise_site_publications`: controls where premium listing appears.
- `franchise_product_events`: feeds analytics.
- `franchise_assets`: stores proof/media/proposal assets.
- `audit_events`: records payment review and membership changes.
- `operation_events`: records webhook/API failures.

## Admin Dashboard Plan

Add Operations tab sections:
- Premium Orders.
- Payment Confirmations.
- Active Premium Listings.
- Expiring Soon.
- Payment Settings.

Admin actions:
- Approve manual payment.
- Reject manual payment with reason.
- Extend subscription.
- Cancel subscription.
- Regenerate unique code.
- Add/edit payment methods shown on `/premium`.
- Add QRIS image/payment instructions.

Staff actions:
- View pending confirmations.
- Add review notes.
- Cannot activate subscription unless given explicit permission.

## Franchisor `/profil` Plan

Add `Membership` side tab for franchisors:
- Current plan: Free/Premium.
- Premium expiry date.
- Network publication status.
- CTA to upgrade.
- Payment instructions for pending order.
- Confirm payment form.
- Payment history.
- Invoice/receipt download later.

Owner experience:
- If free: show clear benefits and upgrade CTA.
- If pending: show payable amount and confirmation CTA.
- If active: show benefits, analytics, and renewal CTA.
- If expired: keep listing free but remove premium boosts and badge.

## Traffic And Premium KPI

Internal KPIs:
- Organic sessions/month.
- Directory listing views.
- Detail page views.
- Inquiry submits.
- WhatsApp clicks.
- Saved opportunities.
- Profile-complete franchisees.
- Premium conversion from claimed franchisors.
- Renewal rate.

Premium-facing metrics:
- Listing views.
- Leads.
- Contact clicks.
- Saves.
- Network publication status.

Do not sell with unverified numbers. Show real metrics once collected.

## Implementation Milestones

### Milestone 1: Premium Plan Foundation

- [x] Add SQL migration for `premium_orders`, `premium_payment_confirmations`, and `franchise_subscriptions`.
- [x] Add shared payment/membership schemas.
- [x] Add `/premium/` static Astro page.
- [x] Add manual transfer order generation with unique code.
- [x] Add payment confirmation form.
- [x] Add admin dashboard pending payment review.
- [x] Activate premium on admin approval.
- [x] Add premium badge and ranking boost.
- [x] Add `/profil` membership tab.

Implementation note: the first production-ready version is a manual unique-code transfer flow. A franchisor creates an order from `/profil/?tab=membership`, transfers the generated amount, submits confirmation, and an admin approves/rejects it in `/dashboard`. Approval activates one brand/listing for one year, marks it premium, creates missing publication rows for Franchisee.id, Franchise.id, Franchisor.id, and Waralaba.id, publishes them, records audit events, and queues public rebuilds.

Operations note: payment instructions now read from admin-managed `payment_methods` with a BCA fallback, optional QRIS image upload is available from `/dashboard`, Premium funnel events track `/premium` CTA views/clicks plus profile/dashboard payment milestones, owner/admin Premium notifications are persisted, proof-of-payment files can be uploaded to R2 and reviewed from dashboard, and Premium emails are queued for delivery through the protected email worker once provider secrets are configured.

### Milestone 2: Premium Listing Value

- [x] Premium listing hero/media/gallery.
- [x] Proposal PDF display/download.
- [x] Premium FAQ section.
- [x] Lead form prominence for premium.
- [x] Owner analytics in `/profil`.
- [x] Network publication status shown to owner.
- [x] Premium readiness checklist shown to owner and admin reviewers.

Implementation note: Premium detail pages now add richer owner-facing value directly on the listing: a highlighted inquiry/contact block, dynamic Galeri/Proposal/FAQ tabs, proposal image rendering from first-party R2 proposal URLs where legacy assets have been migrated, and an in-browser PDF download action on the Proposal tab. `/profil` now includes owner analytics for views, saves, inquiries, contact clicks, and conversion rate. Since proposal images are now first-party, the browser PDF path is the preferred storage-light approach for now.

### Milestone 3: Payment Automation

- [ ] Choose provider: Midtrans, Xendit, or Duitku.
- [ ] Add provider config as Cloudflare secrets.
- [ ] Add invoice/payment link creation endpoint.
- [ ] Add signed webhook endpoint.
- [ ] Auto-activate premium after paid webhook.
- [ ] Keep manual transfer as fallback.
- [x] Store editable manual payment method instructions.
- [x] Upload QRIS image for manual payment instructions.
- [x] Accept proof-of-payment attachment for manual review.
- [x] Notify owner/admin about manual payment status.
- [x] Track manual premium funnel events in dashboard.
- [x] Queue/send payment status emails through an outbound email worker.

### Milestone 4: Traffic Growth

- [ ] Build capital-based directory pages.
- [ ] Build category landing pages with useful copy and filters.
- [ ] Add comparison feature.
- [ ] Add buyer tools: budget matcher and BEP calculator.
- [ ] Add weekly content workflow.
- [x] Add internal analytics report for premium sales proof.

### Milestone 5: Renewal And Retention

- [x] 30/14/7/1-day renewal reminders.
- [x] Renewal payment order creation.
- [x] Expired premium downgrade behavior.
- [x] Annual performance report.
- [x] Multi-brand discount rules.

Implementation note: Premium lifecycle settings are managed from `/dashboard` Premium Operations. Defaults are 3 grace days, daily grace email enabled, annual report enabled, and multi-brand discount disabled at 0%. After grace, Premium returns to Free and Premium network publication rows are hidden until renewal.

## Open Decisions

- [x] Should premium cover exactly one brand or all brands owned by the same franchisor account? Decision: one premium membership covers one brand/listing.
- [ ] Should early customers get founder pricing or full Rp 3.000.000/year immediately?
- [x] Should premium activation wait for listing completeness review? Decision: do not block payment/approval yet; show readiness warnings to owners and admin reviewers so incomplete listings can be fixed before or after activation.
- [ ] Should premium include one editorial article or make it paid add-on?
- [ ] Which payment gateway should be first after manual transfer?
- [x] Should the public `/premium` page show the BCA account immediately, or only after the user creates an order with a unique code? Decision: public page can show the BCA account for clarity, but exact payable amount is generated after login/order.

## Email Delivery Setup

Chosen first path: Resend. The code can already send queued Premium emails through `/premium-email-worker`, but real delivery starts only after the sender is verified and secrets are configured.

Manual setup checklist:

1. Create a Resend account and add the sending domain or sender address.
2. Add the DNS records Resend asks for, then wait until Resend shows the domain/sender as verified.
3. Create a Resend API key.
4. Add these Cloudflare Pages production secrets:
   - `RESEND_API_KEY`
   - `PREMIUM_EMAIL_WORKER_SECRET`
   - `PREMIUM_EMAIL_FROM`, for example `Franchisee.id <premium@franchisee.id>`
   - Optional: `PREMIUM_EMAIL_REPLY_TO`
5. Add the same `PREMIUM_EMAIL_WORKER_SECRET` as a GitHub repository secret.
6. Optional: add GitHub repository variable `FRANCHISEE_SITE_URL=https://franchisee.id`.
7. After the next deploy, run `.github/workflows/premium-email-worker.yaml` manually once from GitHub Actions and check `/dashboard` Premium Operations for sent/failed queue status.

## Recommended Decisions

1. Premium covers one brand/listing.
2. Full price stays Rp 3.000.000/year by default; multi-brand discounts are an admin setting and are disabled until intentionally enabled.
3. Premium can be paid before listing is complete, but public premium publication waits until minimum content is complete.
4. Public `/premium` should explain the price, but exact payable amount should be generated after login/order so unique code works.
5. Start manual BCA unique-code flow first, then implement gateway webhooks.
6. Use payment gateway before BCA direct API unless direct BCA integration becomes strategically necessary.

## External References Checked

- Midtrans docs: payment links, Core API, QRIS/payment method references, and HTTP notification/webhook references are available in the current docs: https://docs.midtrans.com/docs/payment-link and https://docs.midtrans.com/docs/https-notification-webhooks
- Xendit docs: API setup requires a dashboard account and secret API key over HTTPS with test/live environments: https://docs.xendit.co/apidocs
- Duitku docs: Indonesian payment gateway with dashboard, API integration, and disbursement references: https://docs.duitku.com/
- BCA Developer API: BCA lists APIs for Mutasi Rekening, Informasi Saldo, Virtual Account, and business API onboarding/cooperation flow: https://developer.bca.co.id/
- Resend: chosen first outbound email provider candidate for Premium notifications because it has a generous free tier and Cloudflare Workers examples; setup still requires a verified sender/domain and API key: https://resend.com/pricing and https://resend.com/docs/send-with-cloudflare-workers
