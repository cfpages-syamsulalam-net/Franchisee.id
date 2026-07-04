import type { FranchiseStaticRow } from "./franchise-static";
import { extractFranchiseLocations } from "./franchise-location-normalization";
import { normalizeBrandName, normalizeText, slugify } from "./franchise-text";

export interface CityRouteEntry {
  slug: string;
  label: string;
  rows: FranchiseStaticRow[];
  canonicalPath: string;
  description: string;
}

const MIN_CITY_LISTINGS = 2;

export function getCityRouteEntries(rows: FranchiseStaticRow[]): CityRouteEntry[] {
  const map = new Map<string, { label: string; rows: FranchiseStaticRow[] }>();
  for (const row of rows) {
    const matched = matchedCities(row);
    for (const label of matched) {
      const slug = slugify(label);
      const current = map.get(slug) || { label, rows: [] };
      current.rows.push(row);
      map.set(slug, current);
    }
  }

  return [...map.entries()]
    .map(([slug, value]) => ({
      slug,
      label: value.label,
      rows: dedupeRows(value.rows).sort((a, b) => normalizeBrandName(a.brand_name).localeCompare(normalizeBrandName(b.brand_name), "id-ID")),
      canonicalPath: cityHref(slug),
      description: `Peluang franchise yang memiliki data lokasi atau outlet terkait ${value.label}.`,
    }))
    .filter((entry) => entry.rows.length >= MIN_CITY_LISTINGS)
    .sort((a, b) => b.rows.length - a.rows.length || a.label.localeCompare(b.label, "id-ID"));
}

export function getCitySummaries(rows: FranchiseStaticRow[]) {
  return getCityRouteEntries(rows).map((entry) => ({
    slug: entry.slug,
    label: entry.label,
    count: entry.rows.length,
    canonicalPath: entry.canonicalPath,
  }));
}

export function primaryCityLabel(row: FranchiseStaticRow) {
  return matchedCities(row)[0] || "";
}

export function cityHref(slug: string) {
  return `/peluang-usaha/kota/${slug}`;
}

export function cityIndexCopy(rows: FranchiseStaticRow[]) {
  const cityCount = getCityRouteEntries(rows).length;
  return [
    `<p>Pilih kota untuk melihat brand yang datanya menyebut lokasi kantor, outlet, atau rencana ekspansi di kota tersebut.</p>`,
    `<p>Halaman kota dibuat dari data listing yang tersedia. Tetap cek halaman brand dan hubungi franchisor untuk memastikan area kemitraan terbaru.</p>`,
    `<p>Saat ini ada ${cityCount} halaman kota dengan cukup listing untuk dibandingkan.</p>`,
  ].join("");
}

export function cityLandingCopy(entry: CityRouteEntry) {
  const examples = entry.rows.slice(0, 4).map((row) => normalizeBrandName(row.brand_name)).filter(Boolean);
  return [
    `<p>Direktori ini menampilkan ${entry.rows.length} peluang franchise yang memiliki data lokasi, kantor, outlet, atau ekspansi terkait ${entry.label}.</p>`,
    `<p>${examples.length ? `Beberapa brand yang bisa mulai dibandingkan: ${examples.join(", ")}. ` : ""}Gunakan filter kategori, status, dan modal untuk mempersempit pilihan sebelum menghubungi franchisor.</p>`,
  ].join("");
}

function matchedCities(row: FranchiseStaticRow) {
  return [...new Set(extractFranchiseLocations(row).map((location) => location.label).filter(Boolean))];
}

function dedupeRows(rows: FranchiseStaticRow[]) {
  const seen = new Set<string>();
  const result: FranchiseStaticRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    result.push(row);
  }
  return result;
}
