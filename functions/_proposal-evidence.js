import { sanitizeProposalSourceText } from "./_proposal-knowledge.js";
import { franchiseFieldEvidenceKeywords } from "../src/lib/franchise-field-dictionary.js";

export function sourceEvidence(field, text, value) {
  const normalized = normalizeText(sanitizeProposalSourceText(text));
  if (!normalized) return { excerpt: "", basis: "" };

  const basis = findBasis(field, normalized, value);
  if (basis) {
    const index = normalized.toLowerCase().indexOf(basis.toLowerCase());
    return {
      excerpt: normalized.slice(Math.max(0, index - 70), index + basis.length + 100).trim(),
      basis,
    };
  }

  const valueText = normalizeText(value);
  if (valueText && valueText.length >= 3) {
    const index = normalized.toLowerCase().indexOf(valueText.toLowerCase());
    if (index >= 0) {
      return {
        excerpt: normalized.slice(Math.max(0, index - 70), index + valueText.length + 100).trim(),
        basis: valueText,
      };
    }
  }

  return { excerpt: normalized.slice(0, 220).trim(), basis: "" };
}

function findBasis(field, text, value) {
  const amount = moneyPattern(value);
  const number = numberPattern(value);
  const patterns = {
    fee_license_idr: moneyLabelPatterns(amount, franchiseFieldEvidenceKeywords("fee_license_idr")),
    fee_construction_idr: moneyLabelPatterns(amount, ["renovasi", "booth", "konstruksi", "interior", "fit out"]),
    fee_capex_idr: moneyLabelPatterns(amount, ["peralatan", "equipment", "alat", "perlengkapan"]),
    working_capital_idr: moneyLabelPatterns(amount, ["modal kerja", "working capital", "stok awal", "bahan baku awal"]),
    total_investment_idr: moneyLabelPatterns(amount, franchiseFieldEvidenceKeywords("total_investment_idr", ["total investasi", "total biaya investasi", "nilai investasi"])),
    min_investment_idr: moneyLabelPatterns(amount, ["investasi", "modal", "modal awal"]),
    max_investment_idr: moneyLabelPatterns(amount, ["investasi", "modal", "modal awal"]),
    min_staff_count: [
      new RegExp(`\\b(?:minimal|min(?:imum)?|kebutuhan|jumlah)?\\s*(?:staff|staf|karyawan|crew|pegawai|terapis|barber)\\s*[:\\-]?\\s*${number}\\s*(?:orang|staff|staf|karyawan|crew|pegawai)?\\b`, "i"),
      new RegExp(`\\b${number}\\s*(?:orang\\s*)?(?:staff|staf|karyawan|crew|pegawai|terapis|barber)\\b`, "i"),
    ],
    min_area_sqm: [
      new RegExp(`\\b(?:luas|ukuran|area)[^\\n.]{0,80}${number}(?:[.,]\\d+)?\\s*(?:x\\s*\\d+(?:[.,]\\d+)?\\s*)?m(?:2|²|eter)?[^\\n.]{0,80}`, "i"),
    ],
    royalty_percent: [
      new RegExp(`\\b(?:${franchiseFieldEvidenceKeywords("royalty_percent", ["royalty", "royalti"]).map(escapeRegExp).join("|")})[^\\n.]{0,80}${number}\\s*%`, "i"),
      /\b(?:tanpa|bebas|gratis|free)\s+royalt(?:y|i)\b/i,
    ],
    royalty_basis: [
      /\b(?:tanpa|bebas|gratis|free)\s+royalt(?:y|i)\b/i,
      /\b(?:royalty|royalti)[^\n.]{0,80}(?:omzet|profit|laba|keuntungan)\b/i,
    ],
  };

  for (const pattern of patterns[field] || []) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return "";
}

function moneyLabelPatterns(amount, labels) {
  if (!amount) return [];
  return labels.flatMap((label) => [
    new RegExp(`\\b${escapeRegExp(label)}[^\\n.]{0,80}${amount}`, "i"),
    new RegExp(`\\b${amount}[^\\n.]{0,80}${escapeRegExp(label)}\\b`, "i"),
  ]);
}

function moneyPattern(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  const juta = number % 1_000_000 === 0 ? String(number / 1_000_000).replace(".", "[,.]") + "\\s*(?:juta|jt)" : "";
  const plain = String(Math.round(number)).replace(/\B(?=(\d{3})+(?!\d))/g, "[.,]?");
  return `(?:rp\\.?\\s*)?(?:${[plain, juta].filter(Boolean).join("|")})`;
}

function numberPattern(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number).replace(".", "[,.]") : escapeRegExp(normalizeText(value));
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
