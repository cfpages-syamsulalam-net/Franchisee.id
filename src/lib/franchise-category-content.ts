export type CanonicalFranchiseCategorySlug =
  | "makanan-minuman"
  | "pendidikan-kursus-pelatihan"
  | "laundry-jasa-kebersihan"
  | "otomotif"
  | "retail-minimarket"
  | "anak-balita"
  | "bisnis-jasa"
  | "lainnya"
  | "furnitur-konstruksi-properti"
  | "hiburan-hobi"
  | "penginapan-agen-travel"
  | "kesehatan-kecantikan"
  | "komputer-teknologi";

export interface CategoryDecisionPoint {
  title: string;
  description: string;
}

export interface CategoryInternalLinkSuggestion {
  kind: "article" | "tool";
  label: string;
  href: string;
}

export interface FranchiseCategoryContent {
  canonicalSlug: CanonicalFranchiseCategorySlug | string;
  label: string;
  count: number;
  seoTitle: string;
  metaDescription: string;
  subheading: string;
  introParagraphs: string[];
  decisionPoints: CategoryDecisionPoint[];
  relatedCategorySlugs: CanonicalFranchiseCategorySlug[];
  internalLinks: CategoryInternalLinkSuggestion[];
}

interface CategoryProfile {
  label: string;
  title: (count: number) => string;
  meta: (count: number) => string;
  subheading: string;
  intro: (count: number) => string[];
  decisionPoints: CategoryDecisionPoint[];
  relatedCategorySlugs: CanonicalFranchiseCategorySlug[];
  articleLabel: string;
}

const CATEGORY_ALIASES: Record<string, CanonicalFranchiseCategorySlug> = {
  fnb: "makanan-minuman",
};

const CATEGORY_PROFILES: Record<CanonicalFranchiseCategorySlug, CategoryProfile> = {
  "makanan-minuman": {
    label: "Makanan & Minuman",
    title: (count) => `Franchise Makanan & Minuman: ${count} Peluang Usaha`,
    meta: (count) =>
      `Temukan ${count} peluang franchise makanan dan minuman. Bandingkan modal, konsep, kebutuhan lokasi, dan informasi kemitraan tiap brand.`,
    subheading: "Bandingkan konsep kuliner berdasarkan kebutuhan operasional, bukan tren saja.",
    intro: (count) => [
      `Direktori ini memuat ${count} peluang franchise makanan dan minuman yang dapat Anda telaah dari data listing yang tersedia.`,
      "Periksa rincian paket setiap brand untuk memastikan format outlet, perlengkapan, bahan baku, dan dukungan yang benar-benar termasuk.",
    ],
    decisionPoints: [
      { title: "Isi paket", description: "Cocokkan biaya awal dengan perlengkapan, stok pembuka, pelatihan, dan biaya lanjutan yang dijelaskan brand." },
      { title: "Beban operasional", description: "Nilai kebutuhan staf, persiapan produk, penyimpanan, masa simpan, dan standar kebersihan." },
      { title: "Lokasi dan permintaan", description: "Uji kecocokan harga, jam ramai, akses pengantaran, dan profil pelanggan di area target." },
    ],
    relatedCategorySlugs: ["retail-minimarket", "penginapan-agen-travel", "bisnis-jasa"],
    articleLabel: "Pelajari cara menilai peluang usaha kuliner",
  },
  "pendidikan-kursus-pelatihan": {
    label: "Pendidikan, Kursus, Pelatihan",
    title: (count) => `Franchise Pendidikan & Kursus: ${count} Pilihan`,
    meta: (count) =>
      `Jelajahi ${count} peluang franchise pendidikan, kursus, dan pelatihan. Tinjau target peserta, metode belajar, kebutuhan pengajar, serta dukungan brand.`,
    subheading: "Pilih model belajar yang cocok dengan kebutuhan peserta dan kemampuan tim Anda.",
    intro: (count) => [
      `Ada ${count} peluang franchise pendidikan, kursus, dan pelatihan dalam kategori ini berdasarkan listing yang tersedia.`,
      "Bandingkan bukan hanya modal, tetapi juga kurikulum, pelatihan pengajar, pola akuisisi peserta, dan cara menjaga kualitas layanan.",
    ],
    decisionPoints: [
      { title: "Peserta dan kurikulum", description: "Pastikan kelompok usia, hasil belajar, materi, dan metode evaluasinya dijelaskan dengan jelas." },
      { title: "Kesiapan pengajar", description: "Periksa kualifikasi, kebutuhan rekrutmen, pelatihan, dan pemantauan mutu tenaga pengajar." },
      { title: "Siklus pendaftaran", description: "Hitung dampak kalender sekolah, masa libur, kapasitas kelas, dan retensi peserta pada arus kas." },
    ],
    relatedCategorySlugs: ["anak-balita", "komputer-teknologi", "bisnis-jasa"],
    articleLabel: "Pelajari dasar memilih bisnis pendidikan",
  },
  "laundry-jasa-kebersihan": {
    label: "Laundry & Jasa Kebersihan",
    title: (count) => `Franchise Laundry & Kebersihan: ${count} Pilihan`,
    meta: (count) =>
      `Bandingkan ${count} peluang franchise laundry dan jasa kebersihan dari sisi modal, kapasitas, kebutuhan lokasi, standar layanan, dan dukungan operasional.`,
    subheading: "Ukur kapasitas, mutu layanan, dan biaya rutin sebelum menentukan brand.",
    intro: (count) => [
      `Kategori ini menampilkan ${count} peluang franchise laundry dan jasa kebersihan dari data listing yang tersedia.`,
      "Cermati jenis layanan yang ditawarkan tiap brand karena kebutuhan mesin, bahan, tenaga kerja, dan area layanan dapat berbeda.",
    ],
    decisionPoints: [
      { title: "Kapasitas dan utilitas", description: "Hitung kapasitas harian serta kebutuhan listrik, air, ruang kerja, perawatan mesin, dan bahan habis pakai." },
      { title: "Standar layanan", description: "Periksa cakupan layanan, waktu pengerjaan, penanganan keluhan, dan tanggung jawab atas barang pelanggan." },
      { title: "Area pelanggan", description: "Nilai kepadatan permukiman atau bisnis sekitar serta biaya layanan antar-jemput bila relevan." },
    ],
    relatedCategorySlugs: ["bisnis-jasa", "otomotif", "penginapan-agen-travel"],
    articleLabel: "Pelajari cara menilai bisnis jasa berulang",
  },
  otomotif: {
    label: "Otomotif",
    title: (count) => `Franchise Otomotif: ${count} Peluang Bisnis`,
    meta: (count) =>
      `Lihat ${count} peluang franchise otomotif. Bandingkan jenis layanan, alat, kebutuhan teknisi, lokasi, modal, dan dukungan operasional setiap brand.`,
    subheading: "Sesuaikan jenis layanan dengan keterampilan tim, alat, dan karakter kendaraan di area Anda.",
    intro: (count) => [
      `Tersedia ${count} peluang franchise otomotif untuk dibandingkan berdasarkan informasi pada listing.`,
      "Ruang lingkup usaha dapat berbeda, sehingga rincian alat, suku cadang, tenaga ahli, lokasi, dan standar pengerjaan perlu diperiksa langsung.",
    ],
    decisionPoints: [
      { title: "Layanan dan alat", description: "Pastikan jenis pekerjaan, peralatan wajib, stok, serta biaya kalibrasi atau perawatan sudah diperhitungkan." },
      { title: "Tenaga teknis", description: "Tinjau kebutuhan pengalaman, sertifikasi bila relevan, pelatihan, dan pengawasan kualitas pekerjaan." },
      { title: "Kelayakan lokasi", description: "Periksa akses kendaraan, luas area kerja, keselamatan, pembuangan limbah, dan aturan setempat." },
    ],
    relatedCategorySlugs: ["laundry-jasa-kebersihan", "retail-minimarket", "bisnis-jasa"],
    articleLabel: "Pelajari cara memeriksa kesiapan operasional usaha",
  },
  "retail-minimarket": {
    label: "Retail & Minimarket",
    title: (count) => `Franchise Retail & Minimarket: ${count} Pilihan`,
    meta: (count) =>
      `Temukan ${count} peluang franchise retail dan minimarket. Tinjau kebutuhan stok, pemasok, lokasi, sistem kasir, modal kerja, dan dukungan brand.`,
    subheading: "Nilai perputaran stok dan mutu pasokan sebelum mengejar luas gerai.",
    intro: (count) => [
      `Halaman ini menghimpun ${count} peluang franchise retail dan minimarket dari listing yang tersedia.`,
      "Komposisi produk dan bentuk gerai dapat berbeda, jadi verifikasi kebutuhan stok, sistem penjualan, pemasok, dan modal kerja pada tiap brand.",
    ],
    decisionPoints: [
      { title: "Produk dan pasokan", description: "Tinjau komposisi barang, pemasok wajib, jadwal pengiriman, retur, dan risiko stok kedaluwarsa." },
      { title: "Modal kerja", description: "Pisahkan biaya pembukaan dari dana untuk isi ulang stok, sewa, gaji, dan kebutuhan kas harian." },
      { title: "Lokasi dan sistem", description: "Ukur lalu lintas pelanggan, persaingan sekitar, keamanan stok, serta kemampuan sistem kasir dan laporan." },
    ],
    relatedCategorySlugs: ["makanan-minuman", "komputer-teknologi", "bisnis-jasa"],
    articleLabel: "Pelajari cara membandingkan usaha berbasis stok",
  },
  "anak-balita": {
    label: "Anak & Balita",
    title: (count) => `Franchise Anak & Balita: ${count} Peluang Usaha`,
    meta: (count) =>
      `Jelajahi ${count} peluang franchise anak dan balita. Bandingkan layanan, standar keamanan, kebutuhan staf, lokasi, modal, dan dukungan brand.`,
    subheading: "Utamakan keselamatan, mutu pendampingan, dan kepercayaan orang tua.",
    intro: (count) => [
      `Kategori anak dan balita saat ini memuat ${count} peluang franchise berdasarkan listing yang tersedia.`,
      "Karena bentuk layanan dapat berbeda, teliti kelompok usia, standar keamanan, kompetensi staf, dan bukti dukungan yang diberikan brand.",
    ],
    decisionPoints: [
      { title: "Usia dan keamanan", description: "Pastikan batas usia, desain ruang, prosedur darurat, kebersihan, dan pengawasan sesuai jenis layanan." },
      { title: "Staf dan kapasitas", description: "Periksa kompetensi staf serta jumlah anak yang dapat dilayani dengan mutu yang konsisten." },
      { title: "Kepercayaan orang tua", description: "Tinjau cara brand menyampaikan hasil, menangani keluhan, melindungi data, dan menjaga komunikasi." },
    ],
    relatedCategorySlugs: ["pendidikan-kursus-pelatihan", "kesehatan-kecantikan", "hiburan-hobi"],
    articleLabel: "Pelajari dasar menilai usaha untuk keluarga",
  },
  "bisnis-jasa": {
    label: "Bisnis Jasa",
    title: (count) => `Franchise Bisnis Jasa: ${count} Peluang`,
    meta: (count) =>
      `Bandingkan ${count} peluang franchise bisnis jasa dari sisi kebutuhan pasar, keterampilan tim, wilayah layanan, biaya operasional, dan dukungan brand.`,
    subheading: "Cari layanan dengan kebutuhan nyata, proses terukur, dan mutu yang bisa dijaga.",
    intro: (count) => [
      `Direktori ini menampilkan ${count} peluang franchise bisnis jasa dari data listing yang tersedia.`,
      "Setiap layanan memiliki proses dan sumber pendapatan berbeda; periksa kebutuhan tenaga, wilayah kerja, standar layanan, dan pola permintaannya.",
    ],
    decisionPoints: [
      { title: "Permintaan berulang", description: "Cari tahu siapa pelanggan utama, seberapa sering mereka membutuhkan layanan, dan bagaimana lead diperoleh." },
      { title: "Proses dan keterampilan", description: "Petakan kebutuhan staf, pelatihan, alat, waktu penyelesaian, dan ukuran mutu layanan." },
      { title: "Wilayah layanan", description: "Tinjau batas area, biaya perjalanan, target waktu respons, dan potensi tumpang tindih dengan mitra lain." },
    ],
    relatedCategorySlugs: ["laundry-jasa-kebersihan", "komputer-teknologi", "pendidikan-kursus-pelatihan"],
    articleLabel: "Pelajari cara mengevaluasi model bisnis jasa",
  },
  lainnya: {
    label: "Lainnya",
    title: (count) => `Peluang Franchise Kategori Lainnya: ${count} Pilihan`,
    meta: (count) =>
      `Telusuri ${count} peluang franchise kategori lainnya. Pahami model usaha, sumber pendapatan, kebutuhan operasional, modal, dan dukungan tiap brand.`,
    subheading: "Pahami model usahanya terlebih dahulu, lalu bandingkan dengan kategori yang paling mendekati.",
    intro: (count) => [
      `Kategori lainnya memuat ${count} peluang franchise yang belum dikelompokkan ke kategori utama berdasarkan data listing saat ini.`,
      "Gunakan halaman detail untuk memahami produk atau layanan, lalu verifikasi paket, biaya, dan proses operasional langsung kepada pemilik brand.",
    ],
    decisionPoints: [
      { title: "Model usaha", description: "Identifikasi pelanggan, produk atau layanan inti, cara memperoleh pendapatan, dan aktivitas harian utama." },
      { title: "Kelengkapan paket", description: "Minta rincian tertulis tentang biaya, hak penggunaan brand, perlengkapan, pelatihan, dan dukungan." },
      { title: "Pembanding yang relevan", description: "Bandingkan dengan kategori terdekat agar kebutuhan modal, tenaga, lokasi, dan risikonya lebih mudah diuji." },
    ],
    relatedCategorySlugs: ["bisnis-jasa", "retail-minimarket", "makanan-minuman"],
    articleLabel: "Pelajari dasar menilai peluang franchise",
  },
  "furnitur-konstruksi-properti": {
    label: "Furnitur, Konstruksi, Properti",
    title: (count) => `Franchise Furnitur, Konstruksi & Properti: ${count} Pilihan`,
    meta: (count) =>
      `Lihat ${count} peluang franchise furnitur, konstruksi, dan properti. Tinjau proyek, pemasok, modal kerja, kompetensi tim, serta dukungan brand.`,
    subheading: "Uji kebutuhan modal kerja dan kemampuan memenuhi standar proyek.",
    intro: (count) => [
      `Kategori furnitur, konstruksi, dan properti memuat ${count} peluang franchise berdasarkan listing yang tersedia.`,
      "Cakupan pekerjaan dapat berbeda; telaah sumber proyek, kebutuhan tenaga, pemasok, pengukuran, pemasangan, dan tanggung jawab purnajual.",
    ],
    decisionPoints: [
      { title: "Arus proyek", description: "Periksa sumber prospek, panjang siklus penjualan, nilai pesanan, dan ketergantungan pada kondisi pasar lokal." },
      { title: "Modal kerja", description: "Hitung uang muka pemasok, biaya tenaga, pengiriman, pemasangan, serta jeda sampai pembayaran diterima." },
      { title: "Standar pelaksanaan", description: "Tinjau kemampuan tim menjaga pengukuran, mutu bahan, jadwal, keselamatan, dan layanan purnajual." },
    ],
    relatedCategorySlugs: ["retail-minimarket", "bisnis-jasa", "komputer-teknologi"],
    articleLabel: "Pelajari cara menilai usaha berbasis proyek",
  },
  "hiburan-hobi": {
    label: "Hiburan & Hobi",
    title: (count) => `Franchise Hiburan & Hobi: ${count} Peluang`,
    meta: (count) =>
      `Temukan ${count} peluang franchise hiburan dan hobi. Bandingkan konsep, target pelanggan, lokasi, aset, pola kunjungan, dan dukungan operasional.`,
    subheading: "Cocokkan pengalaman yang ditawarkan dengan komunitas dan pola kunjungan lokal.",
    intro: (count) => [
      `Ada ${count} peluang franchise hiburan dan hobi pada snapshot listing saat ini.`,
      "Sebelum memilih, periksa target pelanggan, kebutuhan tempat atau aset, pola kunjungan, perawatan, dan cara brand membangun permintaan.",
    ],
    decisionPoints: [
      { title: "Pasar dan musim", description: "Ukur ukuran komunitas, frekuensi kunjungan, pengaruh hari libur, cuaca, dan tren lokal." },
      { title: "Aset dan keselamatan", description: "Hitung kapasitas, usia pakai, perawatan, kebersihan, pengawasan, serta prosedur keselamatan." },
      { title: "Pengalaman pelanggan", description: "Nilai kemudahan reservasi, waktu tunggu, kualitas pendampingan, dan alasan pelanggan untuk kembali." },
    ],
    relatedCategorySlugs: ["anak-balita", "penginapan-agen-travel", "pendidikan-kursus-pelatihan"],
    articleLabel: "Pelajari cara menguji permintaan usaha rekreasi",
  },
  "penginapan-agen-travel": {
    label: "Penginapan & Agen Travel",
    title: (count) => `Franchise Penginapan & Agen Travel: ${count} Pilihan`,
    meta: (count) =>
      `Jelajahi ${count} peluang franchise penginapan dan agen travel. Tinjau pemasok, musim, biaya operasional, layanan pelanggan, dan dukungan brand.`,
    subheading: "Periksa ketahanan arus kas dan kesiapan layanan saat permintaan berubah.",
    intro: (count) => [
      `Kategori penginapan dan agen travel menampilkan ${count} peluang franchise dari listing yang tersedia.`,
      "Model layanannya dapat berbeda, sehingga kontrak pemasok, aturan pembatalan, kebutuhan izin, biaya tetap, dan dukungan pelanggan perlu diverifikasi.",
    ],
    decisionPoints: [
      { title: "Pemasok dan aturan", description: "Pahami sumber inventori, komisi, perubahan jadwal, pembatalan, pengembalian dana, dan tanggung jawab layanan." },
      { title: "Musim dan arus kas", description: "Uji pengaruh musim ramai dan sepi terhadap penjualan, biaya tetap, kebutuhan staf, dan modal kerja." },
      { title: "Mutu pelayanan", description: "Periksa jam dukungan, penanganan masalah, kecepatan respons, dan pelatihan bagi tim yang menghadapi pelanggan." },
    ],
    relatedCategorySlugs: ["hiburan-hobi", "bisnis-jasa", "makanan-minuman"],
    articleLabel: "Pelajari cara menilai bisnis dengan permintaan musiman",
  },
  "kesehatan-kecantikan": {
    label: "Kesehatan & Kecantikan",
    title: (count) => `Franchise Kesehatan & Kecantikan: ${count} Pilihan`,
    meta: (count) =>
      `Bandingkan ${count} peluang franchise kesehatan dan kecantikan. Tinjau kompetensi staf, keamanan layanan, alat, bahan, izin, dan dukungan brand.`,
    subheading: "Dahulukan kompetensi, keamanan, dan batas layanan yang dapat dipertanggungjawabkan.",
    intro: (count) => [
      `Saat ini terdapat ${count} peluang franchise kesehatan dan kecantikan dalam data listing kategori ini.`,
      "Jenis layanan tiap brand perlu diperiksa langsung, termasuk kompetensi pelaksana, standar kebersihan, penggunaan alat dan bahan, serta perizinan yang relevan.",
    ],
    decisionPoints: [
      { title: "Kompetensi dan batas layanan", description: "Pastikan tindakan, kualifikasi staf, pengawasan, dan rujukan mengikuti kebutuhan serta aturan yang berlaku." },
      { title: "Keamanan dan bahan", description: "Tinjau kebersihan, alat, bahan habis pakai, penyimpanan, persetujuan pelanggan, dan penanganan keluhan." },
      { title: "Janji kepada pelanggan", description: "Hindari klaim hasil yang tidak dapat dibuktikan dan periksa pedoman komunikasi yang diberikan brand." },
    ],
    relatedCategorySlugs: ["anak-balita", "laundry-jasa-kebersihan", "retail-minimarket"],
    articleLabel: "Pelajari cara memeriksa usaha layanan personal",
  },
  "komputer-teknologi": {
    label: "Komputer & Teknologi",
    title: (count) => `Franchise Komputer & Teknologi: ${count} Pilihan`,
    meta: (count) =>
      `Temukan ${count} peluang franchise komputer dan teknologi. Bandingkan produk, lisensi, kebutuhan tenaga, dukungan teknis, keamanan, dan model pendapatan.`,
    subheading: "Pilih produk yang jelas nilai gunanya dan realistis untuk didukung oleh tim Anda.",
    intro: (count) => [
      `Kategori komputer dan teknologi memuat ${count} peluang franchise berdasarkan listing yang tersedia.`,
      "Teliti produk atau layanan, hak penggunaan perangkat lunak, kebutuhan teknis, pelatihan, dukungan, keamanan data, dan pola pendapatannya.",
    ],
    decisionPoints: [
      { title: "Produk dan lisensi", description: "Pahami fungsi produk, hak penggunaan, pembaruan, ketergantungan vendor, dan biaya langganan atau lisensi." },
      { title: "Dukungan teknis", description: "Periksa kemampuan tim, pelatihan, target waktu respons, eskalasi gangguan, serta dukungan dari pemilik brand." },
      { title: "Pendapatan dan data", description: "Uji sumber pendapatan berulang, biaya akuisisi pelanggan, keamanan data, pencadangan, dan kewajiban layanan." },
    ],
    relatedCategorySlugs: ["bisnis-jasa", "pendidikan-kursus-pelatihan", "retail-minimarket"],
    articleLabel: "Pelajari cara menilai peluang usaha teknologi",
  },
};

export function getFranchiseCategoryContent(slug: string, label: string, count: number): FranchiseCategoryContent {
  const normalizedInputSlug = normalizeSlug(slug);
  const canonicalSlug = CATEGORY_ALIASES[normalizedInputSlug] || normalizedInputSlug;
  const normalizedCount = normalizeCount(count);
  const profile = CATEGORY_PROFILES[canonicalSlug as CanonicalFranchiseCategorySlug];

  if (!profile) {
    return createFallbackContent(canonicalSlug, label, normalizedCount);
  }

  const resolvedLabel = normalizedInputSlug === "fnb" ? profile.label : normalizeLabel(label, profile.label);
  return {
    canonicalSlug,
    label: resolvedLabel,
    count: normalizedCount,
    seoTitle: profile.title(normalizedCount),
    metaDescription: profile.meta(normalizedCount),
    subheading: profile.subheading,
    introParagraphs: [...profile.intro(normalizedCount)],
    decisionPoints: profile.decisionPoints.map((point) => ({ ...point })),
    relatedCategorySlugs: [...profile.relatedCategorySlugs],
    internalLinks: buildInternalLinks(profile.articleLabel, resolvedLabel),
  };
}

function createFallbackContent(slug: string, label: string, count: number): FranchiseCategoryContent {
  const resolvedLabel = normalizeLabel(label, "Peluang Usaha");
  return {
    canonicalSlug: slug || "lainnya",
    label: resolvedLabel,
    count,
    seoTitle: `Franchise ${resolvedLabel}: ${count} Peluang Usaha`,
    metaDescription: `Temukan ${count} peluang franchise ${resolvedLabel}. Bandingkan modal, kebutuhan operasional, informasi kemitraan, dan dukungan setiap brand.`,
    subheading: `Bandingkan pilihan ${resolvedLabel} berdasarkan kebutuhan usaha dan data pada tiap listing.`,
    introParagraphs: [
      `Halaman ini menampilkan ${count} peluang franchise ${resolvedLabel} berdasarkan listing yang tersedia.`,
      "Periksa rincian modal, biaya lanjutan, kebutuhan lokasi, kegiatan operasional, dan dukungan langsung pada setiap brand sebelum memutuskan.",
    ],
    decisionPoints: [
      { title: "Kebutuhan pasar", description: "Pastikan produk atau layanan menjawab kebutuhan pelanggan yang dapat diuji di area target." },
      { title: "Biaya menyeluruh", description: "Pisahkan biaya paket awal dari modal kerja, sewa, gaji, stok, pemasaran, dan biaya rutin." },
      { title: "Dukungan brand", description: "Minta rincian tertulis tentang pelatihan, pasokan, pemasaran, wilayah, standar mutu, dan penanganan masalah." },
    ],
    relatedCategorySlugs: ["bisnis-jasa", "makanan-minuman", "retail-minimarket"],
    internalLinks: buildInternalLinks("Pelajari dasar menilai peluang franchise", resolvedLabel),
  };
}

function buildInternalLinks(articleLabel: string, categoryLabel: string): CategoryInternalLinkSuggestion[] {
  return [
    { kind: "article", label: articleLabel, href: "/franchisepedia/" },
    { kind: "tool", label: `Cocokkan budget untuk ${categoryLabel}`, href: "/alat-franchise/" },
    { kind: "tool", label: `Bandingkan brand ${categoryLabel}`, href: "/bandingkan/" },
  ];
}

function normalizeSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLabel(value: string, fallback: string) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  return normalized || fallback;
}

function normalizeCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
