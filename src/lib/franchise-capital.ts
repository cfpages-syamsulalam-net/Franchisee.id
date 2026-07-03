import type { FranchiseStaticRow } from "./franchise-static";
import { formatRupiah, normalizeBrandName, normalizeText, slugify } from "./franchise-text";

export interface CapitalRangeEntry {
  slug: string;
  label: string;
  shortLabel: string;
  min: number;
  max: number | null;
  rows: FranchiseStaticRow[];
  canonicalPath: string;
  description: string;
}

const CAPITAL_RANGES = [
  { slug: "dibawah-10-juta", label: "Franchise Modal di Bawah 10 Juta", shortLabel: "< 10 Juta", min: 0, max: 10_000_000 },
  { slug: "10-25-juta", label: "Franchise Modal 10-25 Juta", shortLabel: "10-25 Juta", min: 10_000_000, max: 25_000_000 },
  { slug: "25-50-juta", label: "Franchise Modal 25-50 Juta", shortLabel: "25-50 Juta", min: 25_000_000, max: 50_000_000 },
  { slug: "50-100-juta", label: "Franchise Modal 50-100 Juta", shortLabel: "50-100 Juta", min: 50_000_000, max: 100_000_000 },
  { slug: "100-250-juta", label: "Franchise Modal 100-250 Juta", shortLabel: "100-250 Juta", min: 100_000_000, max: 250_000_000 },
  { slug: "250-500-juta", label: "Franchise Modal 250-500 Juta", shortLabel: "250-500 Juta", min: 250_000_000, max: 500_000_000 },
  { slug: "diatas-500-juta", label: "Franchise Modal di Atas 500 Juta", shortLabel: "> 500 Juta", min: 500_000_000, max: null },
];

export function getCapitalRouteEntries(rows: FranchiseStaticRow[]): CapitalRangeEntry[] {
  return CAPITAL_RANGES.map((range) => {
    const matchedRows = rows
      .filter((row) => {
        const capital = getComparableCapital(row);
        if (!capital) return false;
        return capital >= range.min && (range.max === null || capital <= range.max);
      })
      .sort((a, b) => getComparableCapital(a) - getComparableCapital(b) || normalizeBrandName(a.brand_name).localeCompare(normalizeBrandName(b.brand_name), "id-ID"));

    return {
      ...range,
      rows: matchedRows,
      canonicalPath: capitalHref(range.slug),
      description: capitalDescription(range.label, range.min, range.max, matchedRows.length),
    };
  }).filter((entry) => entry.rows.length > 0);
}

export function getCapitalSummaries(rows: FranchiseStaticRow[]) {
  return getCapitalRouteEntries(rows).map(({ slug, label, shortLabel, rows, canonicalPath }) => ({
    slug,
    label,
    shortLabel,
    count: rows.length,
    canonicalPath,
  }));
}

export function capitalHref(slug: string) {
  return `/peluang-usaha/modal/${slug}`;
}

export function capitalLandingCopy(entry: CapitalRangeEntry) {
  const examples = entry.rows.slice(0, 3).map((row) => normalizeBrandName(row.brand_name)).filter(Boolean);
  const exampleText = examples.length ? ` Contoh brand yang bisa dibandingkan: ${examples.join(", ")}.` : "";
  return [
    `<p>${entry.description}</p>`,
    `<p>Gunakan filter kategori, status, dan urutan modal untuk mempersempit pilihan. Angka modal adalah estimasi dari data listing yang tersedia, jadi tetap cek halaman brand sebelum menghubungi franchisor.${exampleText}</p>`,
  ].join("");
}

export function capitalIndexCopy(rows: FranchiseStaticRow[]) {
  const known = rows.filter((row) => getComparableCapital(row) > 0).length;
  return [
    `<p>Pilih direktori berdasarkan kisaran modal agar pencarian peluang usaha lebih cepat. Setiap halaman dibuat dari data brand yang sama dengan direktori utama dan ikut berubah saat listing diperbarui.</p>`,
    `<p>Saat ini ada ${known} listing dengan estimasi modal yang bisa difilter berdasarkan budget.</p>`,
  ].join("");
}

export function getComparableCapital(row: FranchiseStaticRow) {
  const values = [
    row.package_min_capital_idr,
    row.min_investment_idr,
    row.package_price_idr,
    row.total_investment_idr,
    row.fee_license_idr,
  ].map((value) => Number(value || 0)).filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : 0;
}

export function budgetRecommendationLabel(value: number) {
  const entry = CAPITAL_RANGES.find((range) => value >= range.min && (range.max === null || value <= range.max));
  return entry ? { label: entry.label, href: capitalHref(entry.slug) } : null;
}

function capitalDescription(label: string, min: number, max: number | null, count: number) {
  const rangeText = max === null
    ? `mulai ${formatRupiah(min)} ke atas`
    : min <= 0
      ? `di bawah ${formatRupiah(max)}`
      : `antara ${formatRupiah(min)} sampai ${formatRupiah(max)}`;
  return `${label} berisi ${count} peluang franchise dengan estimasi modal ${rangeText}.`;
}

export function capitalSlugFromValue(value: unknown) {
  const number = Number(value || 0);
  const entry = CAPITAL_RANGES.find((range) => number >= range.min && (range.max === null || number <= range.max));
  return entry?.slug || slugify(normalizeText(value));
}
