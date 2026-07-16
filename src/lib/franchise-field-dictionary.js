export const FRANCHISE_FIELD_DICTIONARY = [
  {
    name: "fee_license_idr",
    label: "Biaya Lisensi / Kemitraan",
    aliases: [
      "biaya lisensi",
      "license fee",
      "franchise fee",
      "biaya franchise",
      "biaya kemitraan",
      "investasi kemitraan",
      "joining fee",
      "biaya join",
      "join fee",
    ],
    evidence_keywords: ["lisensi", "license fee", "franchise fee", "franchise", "kemitraan", "investasi kemitraan", "joining fee", "join"],
    review_note: "Satu konsep canonical untuk biaya awal hak bergabung/kemitraan. Jangan buat field biaya baru hanya karena brosur memakai sinonim.",
  },
  {
    name: "total_investment_idr",
    label: "Total investasi",
    aliases: ["total investasi", "total biaya investasi", "perkiraan biaya investasi", "total modal awal"],
    evidence_keywords: ["total investasi", "total biaya investasi", "perkiraan biaya investasi", "total modal awal"],
    no_infer: "Jangan infer dari satu komponen biaya. Pakai hanya jika dokumen menyebut total, atau hitung dari komponen biaya yang eksplisit dan sudah terpisah.",
  },
  {
    name: "royalty_percent",
    label: "Royalti (%)",
    aliases: ["royalty", "royalty fee", "royalti", "royalti fee"],
    evidence_keywords: ["royalty", "royalty fee", "royalti", "royalti fee", "gratis royalty"],
  },
  {
    name: "royalty_basis",
    label: "Dasar royalti",
    aliases: ["dasar royalti", "basis royalty", "royalty basis"],
    evidence_keywords: ["omzet", "profit", "keuntungan", "royalty basis", "dasar royalti"],
  },
  {
    name: "support_system",
    label: "Dukungan mitra",
    aliases: ["support system", "dukungan mitra", "support mitra", "fasilitas mitra"],
    evidence_keywords: ["support system", "dukungan", "training", "pelatihan", "sop", "bahan baku", "marketing"],
  },
  {
    name: "outlet_type",
    label: "Tipe outlet",
    aliases: ["tipe outlet", "jenis outlet", "format outlet", "booth", "kios", "ruko"],
    evidence_keywords: ["tipe outlet", "jenis outlet", "format outlet", "booth", "kios", "ruko"],
  },
];

const FIELD_BY_NAME = new Map(FRANCHISE_FIELD_DICTIONARY.map((field) => [field.name, field]));

export function getFranchiseFieldDefinition(fieldName) {
  return FIELD_BY_NAME.get(fieldName) || null;
}

export function franchiseFieldLabel(fieldName, fallback = fieldName) {
  return getFranchiseFieldDefinition(fieldName)?.label || fallback;
}

export function franchiseFieldEvidenceKeywords(fieldName, fallback = []) {
  return getFranchiseFieldDefinition(fieldName)?.evidence_keywords || fallback;
}
