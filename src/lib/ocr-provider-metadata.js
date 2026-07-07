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
  },
  azure_vision: {
    fields: ["api_key", "endpoint_url"],
    labels: { api_key: "Azure Vision key", endpoint_url: "Azure Vision endpoint" },
    help: {
      api_key: "Gunakan salah satu key dari resource Azure AI Vision.",
      endpoint_url: "Endpoint resource Azure, misalnya https://nama-resource.cognitiveservices.azure.com/.",
    },
    requirements: ["api_key", "endpoint_url"],
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
  },
  google_vision: {
    fields: ["api_key"],
    labels: { api_key: "Google Vision API key" },
    help: { api_key: "Untuk rencana awal image OCR sederhana. Service account/PDF async belum dipakai di konfigurasi ini." },
    requirements: ["api_key"],
  },
  groq_vision: {
    fields: ["api_key", "model"],
    labels: { api_key: "Groq API key", model: "Groq vision model" },
    help: {
      api_key: "API key Groq untuk endpoint OpenAI-compatible chat completions.",
      model: "Model vision yang dipakai untuk transkripsi gambar.",
    },
    requirements: ["api_key"],
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
  },
  mindee: {
    fields: ["api_key"],
    labels: { api_key: "Mindee API key" },
    help: { api_key: "API key Mindee. Trial/limit ditampilkan sebagai metadata, bukan input." },
    requirements: ["api_key"],
  },
  pdf_co: {
    fields: ["api_key"],
    labels: { api_key: "PDF.co API key" },
    help: { api_key: "API key PDF.co. Kredit trial ditampilkan sebagai metadata, bukan input." },
    requirements: ["api_key"],
  },
  api4ai: {
    fields: ["api_key"],
    labels: { api_key: "API4AI / RapidAPI key" },
    help: { api_key: "Masukkan key dari console provider yang dipakai. Limit perlu dicek di akun provider." },
    requirements: ["api_key"],
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
