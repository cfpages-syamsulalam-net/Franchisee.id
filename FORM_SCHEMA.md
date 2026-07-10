# Franchise.id Form Schema Inventory

This file documents every input field for the three registration tabs in `/daftar/index.html` to ensure no data points are lost during future refactors.

## Migration Direction
The field inventory is storage-provider neutral. The current frontend posts these names to `/form-submit`, which writes to D1 through Clerk-authenticated Pages Functions. Future D1/R2/Clerk work must preserve or explicitly map every field here before changing the UI.

## 1. Tab: Franchisee (Calon Mitra)
*Target: Individuals looking to buy a franchise.*

**Multi-Step Layout (2 Steps)**:
- **Step 1: Data Pribadi** - Personal information (name, city, WhatsApp, email)
- **Step 2: Minat & Budget** - Business interests and budget details
- Step navigation: `franchiseeNextStep()` and `franchiseePrevStep()` functions
- Progress indicator: `#franchisee_progress_bar` with 2-step indicator
- Step persistence: `localStorage` key `franchisee_form_step`

| Field Label | Name Attribute | Type | Required | Step | Notes |
|-------------|----------------|------|----------|------|-------|
| Nama Lengkap | `name` | Text | Yes | 1 | |
| Kota Domisili | `city_origin` | Text | Yes | 1 | Autocomplete active |
| Kode Negara WhatsApp | `country_code` | Select | Yes | 1 | Default `+62` |
| WhatsApp | `whatsapp` | Tel | Yes | 1 | Phone format (812-xxx) |
| Email | `email` | Email | Yes | 1 | |
| Minat Kategori | `interest_category`| Select| Yes | 2 | F&B, Retail, etc. |
| Budget Investasi| `budget_range` | Select| Yes | 2 | <50jt, 50-100jt, etc. |
| Rencana Lokasi | `location_plan` | Select| Yes | 2 | Empty placeholder first (`Pilih Rencana Lokasi...`) |
| Pesan Tambahan | `message` | Textarea| No | 2 | Optional message field |

## 2. Tab: Franchisor (Pemilik Brand)
*Target: Business owners listing their franchise. (5 Sections / Steps)*

**Auto-Save Behavior**: All fields in this tab are automatically saved with aggressive multi-layer protection:
- Debounced save 300ms after user stops typing
- Periodic save every 5 seconds as safety net
- Save before step navigation, tab switches, and page close
- Visual feedback indicator (bottom-right toast notification)
- Draft persists in `localStorage` key `franchisor_form_draft` (72-hour TTL)
- Automatically restores on page refresh within TTL window

### Section 1: Identitas & Legalitas
- `brand_name` (Text, Req): Nama Brand.
- `company_name` (Text, Req): PT/CV.
- `category` (Select, Req): Kategori Bisnis.
- `year_established` (Number, Req): Tahun Berdiri.
- `brand_country` (Select, Opt, Collapsed): Negara asal brand. Default sistem adalah `Indonesia`; field disembunyikan dalam bagian “Brand dari luar Indonesia?” untuk mengurangi friksi brand Indonesia, dan otomatis terbuka/prefill saat country code kontak non-Indonesia dipilih.
- `target_market` (Text, Opt, Collapsed): Target pasar atau area ekspansi. Default sistem adalah `Indonesia`; hanya perlu disentuh untuk brand non-Indonesia atau kebutuhan ekspansi khusus.
- `haki_status` (Radio, Req): Registered, Process, None.
- `haki_number` (Text, Cond): Required if HAKI is Registered/Process.
- `nib_number` (Text, Opt): 13 digit NIB.

### Section 2: Model & Modal
- `min_capital` (Text/Rupiah, Req): Investasi terendah / modal headline.
- `outlet_type` (Select, Opt, Progressive): Format outlet utama. Membuka follow-up lokasi/operasional.
- `location_requirement` (Text, Opt, Progressive): Dimensi/luas/syarat lokasi.
- `min_area_sqm` (Number, Opt, Progressive): Luas minimum dalam m².
- `min_staff_count` (Number, Opt, Progressive): Jumlah staff minimum.
- `setup_duration_days` (Number, Opt, Progressive): Estimasi waktu setup sampai siap buka.
- `rent_cost` (Text, Opt, Progressive): Referensi biaya sewa lokasi.
- `fee_license` (Text/Rupiah, Opt, Progressive): Franchise Fee.
- `fee_capex` (Text/Rupiah, Opt, Progressive): Paket peralatan/stok awal/pusat.
- `fee_construction` (Text/Rupiah, Opt, Progressive): Estimasi renovasi/booth/setup fisik.
- `working_capital_idr` (Text/Rupiah, Opt, Progressive): Modal kerja awal.
- `additional_cost_notes` (Textarea, Opt, Progressive): Catatan biaya tambahan seperti sewa, pengiriman, akomodasi trainer, POS bulanan.
- `total_investment_value` (Hidden): Auto-calculated sum dari rincian modal, fallback ke `min_capital`.
- `royalty_percent` (Number, Opt): Royalty Fee (%).
- `royalty_basis` (Select, Opt): Omzet / Profit / Fixed / None.

### Section 3: Proyeksi
- Projection trigger (Select, no submit name): Membuka follow-up proyeksi jika user punya angka.
- `estimated_bep_months` (Number, Opt, Progressive): Estimasi BEP utama dalam bulan.
- `estimated_bep_min_months` (Number, Opt, Progressive): BEP minimum.
- `estimated_bep_max_months` (Number, Opt, Progressive): BEP maksimum.
- `omzet_monthly_idr` (Text/Rupiah, Opt, Progressive): Estimasi omzet bulanan utama.
- `omzet_monthly_min_idr` (Text/Rupiah, Opt, Progressive): Omzet bulanan minimum.
- `omzet_monthly_max_idr` (Text/Rupiah, Opt, Progressive): Omzet bulanan maksimum.
- `net_profit_percent` (Number, Opt, Progressive): Margin laba bersih (%).
- `net_profit_monthly_min_idr` (Text/Rupiah, Opt, Progressive): Laba bersih bulanan minimum.
- `net_profit_monthly_max_idr` (Text/Rupiah, Opt, Progressive): Laba bersih bulanan maksimum.

### Section 4: Profil Marketing & Dukungan
- `short_desc` (Textarea, Opt): Teaser singkat.
- `full_desc` (Textarea, Req): Keunggulan & Sejarah.
- `support_system` (Hidden/Text, Opt, Progressive): Diisi dari checkbox dukungan + catatan tambahan.
- Support choices (Checkboxes, no submit name): Survei lokasi, desain outlet, peralatan, bahan baku, training, POS, marketing support, SOP.
- Support extra (Textarea, no submit name): Dukungan lain.

### Section 5: Media & Kontak Leads
- `logo_url` (Text URL, Req): Brand Logo compatibility URL.
- `cover_url` (Text URL, Opt, Progressive): Banner Utama compatibility URL.
- `gallery_urls` (Textarea URLs, Opt, Progressive): Up to 5 photos.
- `video_url` (URL, Opt): YouTube Link.
- `proposal_url` (Text URL, Opt, Progressive): PDF E-Proposal.
Note: these `*_url` field names remain compatibility fields for `/daftar` and D1 listing storage. Owner edits in `/profil` now upload logo, cover, and proposal files through the R2-backed media path and update these URL fields after upload.
- `pic_name` (Text, Req): Nama Contact Person.
- `country_code` (Select, Req): WhatsApp country code (default `+62`).
- `whatsapp` (Tel, Req): WhatsApp Business PIC.
- `email_contact` (Email, Req): Official Inquiry Email.
- `website_url` (URL, Opt): Official Website.
- `instagram_url` (URL, Opt): IG Handle.
- `facebook_url` (URL, Opt): Facebook page/profile.
- `tiktok_url` (URL, Opt): TikTok profile.
- `youtube_url` (URL, Opt): YouTube channel/profile.
- `linkedin_url` (URL, Opt): LinkedIn company page.

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
- **Draft Persistence**: Partially filled Franchisor fields are persisted in `localStorage` key `franchisor_form_draft` (72-hour TTL) and restored after refresh. **Note**: When claim mode is active, the auto-save includes the pre-filled brand data plus any additional user input.
- **Important Behavior**: `Lanjut/Kembali` only navigate frontend steps; backend write occurs only on final submit. Current backend writes to D1 through `/form-submit`; Google Sheets is archive/import-only.
