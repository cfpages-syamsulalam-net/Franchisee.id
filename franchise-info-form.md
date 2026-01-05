## Instruksi Pembuatan Form Listing Franchise

**Role:** Kamu adalah Expert Web Developer.
**Task:** Buatkan kode HTML form yang profesional, responsif (menggunakan framework Bootstrap 5 atau Tailwind CSS), dengan struktur data sebagai berikut. Pastikan ada validasi input dasar.

**Struktur Form:**
Bagi form menjadi 5 Bagian (Section) menggunakan `Fieldset` atau `Card` agar rapi.

### BAGIAN 1: Identitas Bisnis & Legalitas (Verifikasi)
*Tujuannya untuk validasi admin dan display informasi dasar.*

1.  **Nama Brand / Merek:**
    *   Type: `Text Input`
    *   Label: Nama Brand
    *   Placeholder: Contoh: Kopi Kenangan Mantan
    *   *Required*
2.  **Nama Perusahaan (PT/CV):**
    *   Type: `Text Input`
    *   Label: Nama Badan Usaha (PT / CV / Perseorangan)
    *   Placeholder: Contoh: PT. Kopi Maju Jaya
    *   *Required*
3.  **Kategori Bisnis:**
    *   Type: `Select Dropdown`
    *   Options:
        1.  F&B (Makanan & Minuman)
        2.  Retail & Minimarket
        3.  Jasa & Layanan (Laundry, Ekspedisi, dll)
        4.  Pendidikan & Pelatihan
        5.  Kecantikan & Kesehatan (Salon, Spa, Klinik)
        6.  Otomotif (Bengkel, Cuci Mobil)
        7.  Agribisnis & Peternakan
        8.  Lainnya
    *   *Required*
4.  **Tahun Berdiri:**
    *   Type: `Number` (Min: 1900, Max: Current Year)
    *   Label: Tahun Berdiri
    *   *Required*
5.  **Status HAKI (Merek):**
    *   Type: `Radio Button`
    *   Options:
        *   Sudah Terdaftar (Registered)
        *   Sedang Proses (On Process)
        *   Belum Terdaftar
    *   *Logic:* Jika user pilih "Sudah Terdaftar", munculkan field baru: **Nomor Sertifikat Merek / ID Merek** (`Text Input`).
6.  **Nomor Induk Berusaha (NIB):**
    *   Type: `Text Input` / `Number`
    *   Label: Nomor NIB (Untuk Verifikasi Admin, Tidak Ditampilkan Publik)
    *   Placeholder: Masukkan 13 digit NIB
    *   *Optional but Recommended*

### BAGIAN 2: Konsep Outlet & Struktur Biaya

**Instruksi untuk AI:**
Bagian ini memiliki *Conditional Logic*. Tampilan form harus dinamis berdasarkan pilihan "Jenis Outlet".

#### A. Kategorisasi Outlet (Taxonomy)
*Pisahkan Kios (Permanen) dan Container (Semi-permanen).*

1.  **Jenis Paket / Outlet yang Ditawarkan:**
    *   Type: `Radio Button` (Pilih Satu Paket Utama untuk Listing ini)
    *   *Note: Jika Franchisor punya banyak tipe, arahkan mereka mengisi form untuk tipe yang paling laku dulu.*
    *   Options:
        *   **Tipe A: Booth / Gerobak** (Mobile/Portable, Space < 4m2)
        *   **Tipe B: Container / Booth Outdoor** (Semi-permanen, Outdoor)
        *   **Tipe C: Island / Stand Mall** (Indoor Open Space)
        *   **Tipe D: Kiosk** (Bangunan Permanen 1 Lantai/Partisi Gedung)
        *   **Tipe E: Ruko / Cafe / Resto** (Bangunan Penuh/Bertingkat)
        *   **Tipe F: Virtual / Cloud Kitchen** (Tanpa Dine-in)

2.  **Kebutuhan Luas Lokasi:**
    *   Type: `Text Input`
    *   Label: Dimensi Minimal (PxL) atau Luas (m2)
    *   Placeholder: Contoh: 3x4 Meter atau Min. 50 m2

#### B. Logic Estimasi Sewa Tempat (Conditional)
*Field ini hanya muncul/berubah labelnya berdasarkan pilihan di poin A.*

3.  **Rekomendasi Budget Sewa Lokasi:**
    *   *Logic Script:*
        *   **IF** user select **Tipe A, B, C (Kecil):**
            *   Label: "Estimasi Sewa Lahan (Teras/Space) per Bulan"
            *   Placeholder: Contoh: Rp 500rb - Rp 1.5 Juta / bulan
        *   **IF** user select **Tipe D, E (Besar):**
            *   Label: "Rekomendasi Budget Sewa Ruko/Bangunan per Tahun"
            *   Placeholder: Contoh: Rp 50 Juta - Rp 100 Juta / tahun
        *   **IF** user select **Tipe F:** Hide this field.
    *   *Helper Text:* "Angka ini tidak dijumlahkan ke paket franchise, hanya sebagai referensi bagi calon mitra untuk mencari lokasi."

#### C: Breakdown Investasi & Konstruksi

**Instruksi untuk AI:**
Pada bagian ini, gunakan *Conditional Rendering* untuk Label dan Placeholder pada **Field No. 6**, tergantung pada pilihan "Tipe Outlet" yang dipilih user di Bagian A sebelumnya.

4.  **Biaya Kemitraan (Franchise Fee):**
    *   Type: `Number` (Currency IDR)
    *   Label: Biaya Lisensi / Franchise Fee (Hak Merek)
    *   Placeholder: Rp ...
    *   *Note:* Biaya ini hangus (intangible asset).

5.  **Biaya Paket ke Pusat (Capex Utama):**
    *   Type: `Number` (Currency IDR)
    *   Label: Biaya Paket Peralatan, Sistem & Stok Awal
    *   *Tooltip:* Total uang yang disetor ke Pusat (diluar Franchise Fee) untuk mendapatkan starter kit.

6.  **Biaya Konstruksi / Persiapan Fisik (Variable):**
    *   *Field ini Label-nya berubah otomatis (Dynamic Label) berdasarkan Tipe Outlet di Bagian A.*
    
    *   **LOGIC 1: Jika user pilih Tipe A (Booth), B (Container), C (Island):**
        *   **Label:** "Estimasi Pembuatan / Pembelian Booth & Container"
        *   **Placeholder:** Masukkan estimasi biaya pembuatan booth (jika tidak termasuk paket pusat)
        *   **Helper Text:** "Jika Booth/Gerobak sudah termasuk di 'Biaya Paket ke Pusat' (Poin 5), silakan isi 0. Jika Mitra harus bikin sendiri, isi estimasi biayanya."
        
    *   **LOGIC 2: Jika user pilih Tipe D (Kiosk), E (Ruko/Resto):**
        *   **Label:** "Estimasi Renovasi Interior & Sipil"
        *   **Placeholder:** Biaya tukang, cat, partisi, mebel, dll.
        *   **Helper Text:** "Estimasi biaya perbaikan bangunan yang disiapkan mandiri oleh mitra (di luar biaya sewa)."
        
    *   **LOGIC 3: Jika user pilih Tipe F (Cloud Kitchen):**
        *   **Label:** "Estimasi Setup Dapur"
        *   **Helper Text:** "Biaya penyesuaian dapur / exhaust system."

7.  **TOTAL MODAL USAHA (Display):**
    *   Type: `Calculated Field` (Editable)
    *   Formula: (Field 4 + Field 5 + Field 6)
    *   Label: **TOTAL Estimasi Modal Awal**
    *   *Style:* Bold, Large Font.
    *   *Note:* Ini angka final yang akan ditampilkan sebagai "Harga Investasi" di listing.


#### D. Total & Profitability (Auto-Calculation)

7.  **TOTAL INVESTASI (Tanpa Sewa Tempat):**
    *   Type: `Calculated Field` (Read Only but Editable)
    *   Formula: (Field No. 4 + Field No. 5 + Field No. 6)
    *   Label: **Total Modal Usaha (Estimasi)**
    *   *Note:* Beri warna background berbeda agar mencolok. Ini angka "Headline" yang akan tampil di card listing website.

8.  **HPP & Profit Margin:**
    *   Type: `Text Input`
    *   Label: Rata-rata HPP (Harga Pokok Penjualan)
    *   Placeholder: Contoh: 40% - 50%
    *   *Why:* Calon mitra yang pintar akan menghitung margin dari sini (100% - HPP = Gross Profit).

### BAGIAN 3: Profil & Keunggulan (Marketing)
*Tempat franchisor "jualan".*

1.  **Deskripsi Singkat (Teaser):**
    *   Type: `Textarea` (Max 150 chars)
    *   Label: Deskripsi Singkat (Akan muncul di halaman depan/list)
    *   Placeholder: Jelaskan bisnis Anda dalam 1 kalimat yang menarik.
2.  **Tentang Brand (Full Description):**
    *   Type: `Textarea` (Rich Text Editor if possible, otherwise standard Textarea with 10 rows)
    *   Label: Deskripsi Lengkap & Keunggulan
    *   Placeholder: Ceritakan sejarah, keunikan produk, dan kenapa orang harus memilih franchise ini.
3.  **Fasilitas / Support System:**
    *   Type: `Checkbox Group` (Multiple Selection)
    *   Label: Apa yang didapatkan Mitra?
    *   Options:
        *   [ ] Survei Lokasi
        *   [ ] Desain Outlet/Interior
        *   [ ] Peralatan Operasional
        *   [ ] Bahan Baku Awal
        *   [ ] Pelatihan Karyawan (Training)
        *   [ ] Sistem Kasir (POS)
        *   [ ] Marketing Support Nasional
        *   [ ] SOP Book

### BAGIAN 4: Media & Aset Visual
*Instruksikan bahwa file harus High Resolution.*

1.  **Upload Logo:**
    *   Type: `File Input` (Accept: .png, .jpg, .jpeg)
    *   Label: Logo Brand (Disarankan rasio 1:1, max 2MB)
    *   *Required*
2.  **Upload Foto Cover / Banner:**
    *   Type: `File Input`
    *   Label: Foto Banner Utama (Landscape, max 2MB)
3.  **Upload Galeri Foto:**
    *   Type: `File Input` (Multiple)
    *   Label: Foto Produk & Suasana Outlet (Max 5 foto)
4.  **Link Video (Opsional):**
    *   Type: `URL Input`
    *   Label: Link Video Youtube Profile (Jika ada)
5.  **Upload Brosur / Proposal:**
    *   Type: `File Input` (Accept: .pdf)
    *   Label: E-Proposal Kemitraan (PDF, Max 5MB)
    *   *Note: Ini akan didownload oleh calon mitra.*

### BAGIAN 5: Kontak Leads (Call to Action)
*Kemana data calon pembeli akan dikirim.*

1.  **Nama Contact Person:**
    *   Type: `Text Input`
    *   Label: Nama PIC Kemitraan
2.  **Nomor WhatsApp Bisnis:**
    *   Type: `Tel Input` / `Number`
    *   Label: Nomor WhatsApp (Untuk tombol "Hubungi via WA")
    *   Placeholder: 0812xxxx (Format angka saja)
    *   *Required*
3.  **Email Resmi:**
    *   Type: `Email Input`
    *   Label: Email untuk Inquiry
4.  **Website / Social Media:**
    *   Type: `URL Input`
    *   Label: Link Website Resmi
    *   Type: `URL Input`
    *   Label: Link Instagram

---
**Tombol Submit:**
Label: "Kirim Data Listing"
Style: Besar dan menonjol.

**Catatan Tambahan untuk AI:**
*   Berikan komentar pada kode di bagian mana logic JS (seperti show/hide kolom HAKI) harus diletakkan.
*   Gunakan styling modern yang bersih (clean look).



---