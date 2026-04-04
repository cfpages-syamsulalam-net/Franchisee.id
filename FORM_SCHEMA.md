# Franchise.id Form Schema Inventory

This file documents every input field for the three registration tabs in `/daftar/index.html` to ensure no data points are lost during future refactors.

## 1. Tab: Franchisee (Calon Mitra)
*Target: Individuals looking to buy a franchise.*

| Field Label | Name Attribute | Type | Required | Notes |
|-------------|----------------|------|----------|-------|
| Nama Lengkap | `name` | Text | Yes | |
| Kota Domisili | `city_origin` | Text | Yes | Autocomplete active |
| Kode Negara WhatsApp | `country_code` | Select | Yes | Default `+62` |
| WhatsApp | `whatsapp` | Tel | Yes | Phone format (812-xxx) |
| Email | `email` | Email | Yes | |
| Minat Kategori | `interest_category`| Select| Yes | F&B, Retail, etc. |
| Budget Investasi| `budget_range` | Select| Yes | <50jt, 50-100jt, etc. |
| Rencana Lokasi | `location_plan` | Select| Yes | Empty placeholder first (`Pilih Rencana Lokasi...`) |
| Pesan Tambahan | `message` | Textarea| No | |

## 2. Tab: Franchisor (Pemilik Brand)
*Target: Business owners listing their franchise. (5 Sections / Steps)*

### Section 1: Identitas & Legalitas
- `brand_name` (Text, Req): Nama Brand.
- `company_name` (Text, Req): PT/CV.
- `category` (Select, Req): Kategori Bisnis.
- `year_established` (Number, Req): Tahun Berdiri.
- `haki_status` (Radio, Req): Registered, Process, None.
- `haki_number` (Text, Cond): Required if HAKI is Registered/Process.
- `nib_number` (Text, Opt): 13 digit NIB.

### Section 2: Konsep & Biaya
- `outlet_type` (Radio, Req): Tipe A-F (Booth to Cloud Kitchen).
- `location_requirement` (Text, Req): Dimensi/Luas minimal.
- `rent_cost` (Text, Cond): Label changes based on `outlet_type`.
- `fee_license` (Number, Req): Franchise Fee.
- `fee_capex` (Number, Req): Paket Peralatan/Pusat.
- `fee_construction` (Number, Req): Estimasi Renovasi/Booth.
- `total_investment_value` (Hidden): Auto-calculated sum.
- `net_profit_percent` (Number, Req): Margin Profit (%).
- `royalty_percent` (Number, Req): Royalty Fee (%).
- `royalty_basis` (Select): Omzet / Profit.

### Section 3: Profil Marketing
- `short_desc` (Textarea, Req): Teaser (max 150 chars).
- `full_desc` (Textarea, Req): Keunggulan & Sejarah.
- `support_system` (Checkbox): List of facilities (Bahan baku, training, etc.).

### Section 4: Media & Visual (Cloudinary)
- `logo_url` (Hidden, Req): Brand Logo.
- `cover_url` (Hidden, Req): Banner Utama.
- `gallery_urls` (Hidden, Opt): Up to 5 photos.
- `video_url` (URL, Opt): YouTube Link.
- `proposal_url` (Hidden, Opt): PDF E-Proposal.

### Section 5: Kontak Leads
- `pic_name` (Text, Req): Nama Contact Person.
- `country_code` (Select, Req): WhatsApp country code (default `+62`).
- `whatsapp` (Tel, Req): WhatsApp Business PIC.
- `email_contact` (Email, Req): Official Inquiry Email.
- `website_url` (URL, Opt): Official Website.
- `instagram_url` (URL, Opt): IG Handle.

## 3. Tab: Klaim Brand (Unified Workflow)
*Target: Owners of pre-listed (Unclaimed) brands.*

- **Search Input**: `claim-brand-search` (Text).
- **Selection Action**: Triggers `fillMainFranchisorForm(brand)`.
- **Pre-filled Data**: `brand_name`, `category`, `min_capital` (maps to `pkg_price_1`).
- **Tracking ID**: `unclaimed_id` (Hidden in Franchisor form).
- **Mode**: Sets `form_type` to `claim` on submission for backend migration.
- **Search Data Guardrails**: Autocomplete must only show canonical brand labels (exclude URL/phone/address/legal-entity/contact-label rows and generic category-only labels).
- **Session Persistence**: Active claim mode and selected brand context are persisted in `localStorage` key `franchise_claim_state` and restored after page refresh.
- **Session TTL**: Persisted claim context automatically expires after 24 hours to prevent stale brand-claim state from resurfacing in later sessions.
- **Draft Persistence**: Partially filled Franchisor fields are persisted in `localStorage` key `franchisor_form_draft` (72-hour TTL) and restored after refresh.
- **Important Behavior**: `Lanjut/Kembali` only navigate frontend steps; Google Sheets write occurs only on final submit.
