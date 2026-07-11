export const OCR_PROVIDER_FIELD_NAMES = [
  "api_key",
  "api_secret",
  "account_id",
  "endpoint_url",
  "region",
  "model",
  "clear_api_key",
  "clear_api_secret",
];

export const OCR_PROVIDER_METADATA = {
  ocr_space: {
    fields: ["api_key"],
    labels: { api_key: "OCR.Space API key" },
    help: { api_key: "Dari dashboard OCR.Space. Tidak perlu secret, account ID, region, atau model." },
    requirements: ["api_key"],
    limits: {
      summary: "500 request/hari per IP; 25.000 request/bulan untuk Engine 1/2; Engine 3 punya 2.500 konversi/bulan tambahan.",
      free_quota_limit: 500,
      free_quota_period: "daily",
      quota_unit: "requests",
      rate_limit_window_seconds: 3600,
      rate_limit_max_requests: 180,
      file_limit: "Free plan: file sampai 1 MB; PDF sampai 3 halaman.",
      reset_hint: "Kuota harian mengikuti reset provider/IP. Counter lokal dipakai untuk mencegah melewati jatah gratis.",
      source_label: "OCR.Space API docs",
      source_url: "https://ocr.space/ocrapi",
      note: "Rate limit 180/jam adalah guard lokal berdasarkan error OCR.Space Free Plan E553 yang pernah diterima sistem.",
    },
  },
  azure_vision: {
    fields: ["api_key", "endpoint_url"],
    labels: { api_key: "Azure Vision key", endpoint_url: "Azure Vision endpoint" },
    help: {
      api_key: "Gunakan salah satu key dari resource Azure AI Vision.",
      endpoint_url: "Endpoint resource Azure, misalnya https://nama-resource.cognitiveservices.azure.com/.",
    },
    requirements: ["api_key", "endpoint_url"],
    limits: {
      summary: "F0 umum: 5.000 transaksi/bulan; throttle lokal 20 transaksi/menit.",
      free_quota_limit: 5000,
      free_quota_period: "monthly",
      quota_unit: "transactions",
      rate_limit_window_seconds: 60,
      rate_limit_max_requests: 20,
      file_limit: "Mengikuti endpoint Azure AI Vision Read yang dipakai.",
      reset_hint: "Reset bulanan mengikuti billing/resource Azure.",
      source_label: "Azure AI Vision pricing",
      source_url: "https://azure.microsoft.com/en-us/pricing/details/ai-vision/",
      note: "Availability F0 bisa berbeda per region/resource; cek Azure portal untuk limit akun final.",
    },
  },
  cloudflare_workers_ai: {
    fields: ["api_key", "account_id", "model"],
    labels: { api_key: "Cloudflare API token", account_id: "Cloudflare account ID", model: "Workers AI model" },
    help: {
      api_key: "Token perlu izin Workers AI Read/Edit untuk menjalankan model via REST.",
      account_id: "Account ID Cloudflare yang memiliki Workers AI.",
      model: "Model vision yang dipakai. Gunakan default jika belum melakukan pengujian sendiri.",
    },
    requirements: ["api_key", "account_id"],
    limits: {
      summary: "10.000 Neurons/hari gratis; bukan kuota halaman tetap.",
      free_quota_limit: 10000,
      free_quota_period: "compute_daily",
      quota_unit: "neurons",
      rate_limit_window_seconds: 60,
      rate_limit_max_requests: 20,
      file_limit: "Bergantung model vision dan ukuran input.",
      reset_hint: "Reset harian 00:00 UTC menurut dokumentasi Workers AI.",
      source_label: "Cloudflare Workers AI pricing",
      source_url: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
      note: "Karena unitnya compute, counter lokal menghitung 1 job sebagai 1 unit sementara sampai adapter membaca pemakaian neuron aktual.",
    },
  },
  google_vision: {
    fields: ["api_key"],
    labels: { api_key: "Google Vision API key" },
    help: { api_key: "Untuk rencana awal image OCR sederhana. Service account/PDF async belum dipakai di konfigurasi ini." },
    requirements: ["api_key"],
    limits: {
      summary: "1.000 unit/bulan pertama gratis untuk Text Detection dan Document Text Detection.",
      free_quota_limit: 1000,
      free_quota_period: "monthly",
      quota_unit: "units",
      rate_limit_window_seconds: 60,
      rate_limit_max_requests: 30,
      file_limit: "Mengikuti Cloud Vision image annotate request yang dipakai.",
      reset_hint: "Reset bulanan mengikuti billing Google Cloud.",
      source_label: "Google Cloud Vision pricing",
      source_url: "https://cloud.google.com/vision/pricing",
      note: "Satu gambar biasanya dihitung sebagai satu unit per fitur; cek billing Google untuk akun final.",
    },
  },
  groq_vision: {
    fields: ["api_key", "model"],
    labels: { api_key: "Groq API key", model: "Groq vision model" },
    help: {
      api_key: "API key Groq untuk endpoint OpenAI-compatible chat completions.",
      model: "Model vision yang dipakai untuk transkripsi gambar.",
    },
    requirements: ["api_key"],
    limits: {
      summary: "Free plan tergantung model; contoh vision model Llama 4 Scout: 30 RPM dan 1.000 RPD.",
      free_quota_limit: 1000,
      free_quota_period: "daily",
      quota_unit: "requests",
      rate_limit_window_seconds: 60,
      rate_limit_max_requests: 30,
      file_limit: "Bergantung model vision dan token input/output.",
      reset_hint: "Rate limit exact mengikuti halaman Limits di akun Groq.",
      source_label: "Groq rate limits",
      source_url: "https://console.groq.com/docs/rate-limits",
      note: "Dashboard Groq adalah sumber final karena rate limit berlaku per organisasi dan model.",
    },
  },
  aws_textract: {
    fields: ["api_key", "api_secret", "region"],
    labels: { api_key: "AWS access key ID", api_secret: "AWS secret access key", region: "AWS region" },
    help: {
      api_key: "Access key ID dari IAM user/role yang boleh memakai Textract.",
      api_secret: "Secret access key pasangannya. Kolom kosong mempertahankan secret lama.",
      region: "Region Textract, misalnya ap-southeast-1.",
    },
    requirements: ["api_key", "api_secret", "region"],
    limits: {
      summary: "AWS Free Tier baru: Detect Document Text 1.000 halaman/bulan selama 3 bulan.",
      free_quota_limit: 1000,
      free_quota_period: "trial",
      quota_unit: "pages",
      rate_limit_window_seconds: 60,
      rate_limit_max_requests: 10,
      file_limit: "Mengikuti batas Amazon Textract DetectDocumentText.",
      reset_hint: "Trial 3 bulan dan reset bulanan mengikuti akun AWS.",
      source_label: "Amazon Textract pricing",
      source_url: "https://aws.amazon.com/textract/pricing/",
      note: "Tidak recurring selamanya; jangan aktifkan untuk batch gratis setelah trial habis.",
    },
  },
  veryfi: {
    fields: ["api_key", "api_secret", "account_id"],
    labels: { api_key: "Veryfi API key", api_secret: "Veryfi username / auth secret", account_id: "Veryfi client ID" },
    help: {
      api_key: "API key dari akun Veryfi.",
      api_secret: "Isi nilai username/auth secret yang dibutuhkan header Veryfi. Kolom kosong mempertahankan nilai lama.",
      account_id: "Client ID dari aplikasi Veryfi.",
    },
    requirements: ["api_key", "api_secret", "account_id"],
    limits: {
      summary: "Free plan: sampai 100 dokumen/bulan.",
      free_quota_limit: 100,
      free_quota_period: "monthly",
      quota_unit: "documents",
      rate_limit_window_seconds: 60,
      rate_limit_max_requests: 10,
      file_limit: "Veryfi menghitung per dokumen; satu transaksi mencakup dokumen sampai 15 halaman.",
      reset_hint: "Reset bulanan mengikuti akun Veryfi.",
      source_label: "Veryfi pricing",
      source_url: "https://www.veryfi.com/pricing/",
      note: "Veryfi lebih cocok sebagai fallback dokumen, bukan OCR halaman gambar massal.",
    },
  },
  mindee: {
    fields: ["api_key"],
    labels: { api_key: "Mindee API key" },
    help: { api_key: "API key Mindee. Trial/limit ditampilkan sebagai metadata, bukan input." },
    requirements: ["api_key"],
    limits: {
      summary: "Kuota gratis/trial perlu dikonfirmasi di akun Mindee; halaman publik tidak selalu menampilkan angka stabil.",
      free_quota_limit: null,
      free_quota_period: "account_specific",
      quota_unit: "pages",
      rate_limit_window_seconds: 60,
      rate_limit_max_requests: 10,
      file_limit: "Mengikuti API/model Mindee yang dipakai.",
      reset_hint: "Cek dashboard Mindee untuk sisa kuota dan reset.",
      source_label: "Mindee pricing",
      source_url: "https://www.mindee.com/pricing",
      note: "Sistem tidak memasukkan Mindee ke combined known quota sampai angka akun diisi/terkonfirmasi.",
    },
  },
  pdf_co: {
    fields: ["api_key"],
    labels: { api_key: "PDF.co API key" },
    help: { api_key: "API key PDF.co. Kredit trial ditampilkan sebagai metadata, bukan input." },
    requirements: ["api_key"],
    limits: {
      summary: "Paket berbayar mulai 16.500 credits/bulan; free trial/credit gratis mengikuti akun.",
      free_quota_limit: null,
      free_quota_period: "account_specific",
      quota_unit: "credits",
      rate_limit_window_seconds: 60,
      rate_limit_max_requests: 10,
      file_limit: "Mengikuti endpoint PDF.co dan credit calculator.",
      reset_hint: "Cek dashboard PDF.co untuk kredit trial/sisa kredit.",
      source_label: "PDF.co pricing",
      source_url: "https://pdf.co/pricing",
      note: "Tidak dimasukkan ke combined known quota kecuali limit akun tersedia di D1.",
    },
  },
  api4ai: {
    fields: ["api_key"],
    labels: { api_key: "API4AI / RapidAPI key" },
    help: { api_key: "Masukkan key dari console provider yang dipakai. Limit perlu dicek di akun provider." },
    requirements: ["api_key"],
    limits: {
      summary: "Limit free plan bersifat marketplace/account-specific; cek RapidAPI/API4AI console.",
      free_quota_limit: null,
      free_quota_period: "account_specific",
      quota_unit: "requests",
      rate_limit_window_seconds: 60,
      rate_limit_max_requests: 10,
      file_limit: "Mengikuti API4AI OCR endpoint.",
      reset_hint: "Cek console provider untuk reset quota.",
      source_label: "API4AI OCR docs",
      source_url: "https://api4.ai/docs/ocr",
      note: "Tidak dimasukkan ke combined known quota sampai angka akun tersedia.",
    },
  },
};

export function getOcrProviderMetadata(providerKey) {
  return OCR_PROVIDER_METADATA[providerKey] || {
    fields: ["api_key"],
    labels: {},
    help: {},
    requirements: ["api_key"],
  };
}

export function getOcrProviderLimitMetadata(providerKey) {
  const limits = getOcrProviderMetadata(providerKey).limits || {};
  return {
    summary: limits.summary || "Limit mengikuti akun provider.",
    free_quota_limit: limits.free_quota_limit ?? null,
    free_quota_period: limits.free_quota_period || "account_specific",
    quota_unit: limits.quota_unit || "requests",
    rate_limit_window_seconds: Number(limits.rate_limit_window_seconds || 0),
    rate_limit_max_requests: Number(limits.rate_limit_max_requests || 0),
    file_limit: limits.file_limit || "",
    reset_hint: limits.reset_hint || "",
    source_label: limits.source_label || "",
    source_url: limits.source_url || "",
    note: limits.note || "",
  };
}

export function getOcrProviderRequirementError(providerKey, config) {
  const metadata = getOcrProviderMetadata(providerKey);
  for (const requirement of metadata.requirements || []) {
    if (requirement === "api_key" && !config.apiKeyPresent) return "Masukkan API key sebelum mengaktifkan provider ini.";
    if (requirement === "api_secret" && !config.apiSecretPresent) return secretRequirementMessage(providerKey);
    if (requirement === "endpoint_url" && !config.endpoint_url) return "Masukkan endpoint resource Azure sebelum mengaktifkan provider ini.";
    if (requirement === "account_id" && !config.account_id) return accountRequirementMessage(providerKey);
    if (requirement === "region" && !config.region) return "Masukkan region sebelum mengaktifkan provider ini.";
  }
  return "";
}

function secretRequirementMessage(providerKey) {
  if (providerKey === "aws_textract") return "Masukkan AWS secret access key sebelum mengaktifkan Textract.";
  if (providerKey === "veryfi") return "Masukkan username/auth secret Veryfi sebelum mengaktifkan provider ini.";
  return "Masukkan API secret sebelum mengaktifkan provider ini.";
}

function accountRequirementMessage(providerKey) {
  if (providerKey === "cloudflare_workers_ai") return "Masukkan Cloudflare account ID sebelum mengaktifkan provider ini.";
  if (providerKey === "veryfi") return "Masukkan Veryfi client ID sebelum mengaktifkan provider ini.";
  return "Masukkan account/project/client ID sebelum mengaktifkan provider ini.";
}
