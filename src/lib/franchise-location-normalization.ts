import { normalizeText, slugify } from "./franchise-text";

export interface LocationSourceRow {
  id: string;
  city_origin?: string | null;
  office_address?: string | null;
  outlets_location?: string | null;
  location_requirement?: string | null;
  structured_locations?: string | null;
}

export interface FranchiseLocationMatch {
  label: string;
  slug: string;
  province: string;
  locationType: "head_office" | "outlet" | "available_area" | "origin";
  sourceField: "city_origin" | "office_address" | "outlets_location" | "location_requirement" | "structured_locations";
  sourceText: string;
  confidence: number;
}

export const CITY_ALIASES = [
  ["Jakarta Selatan", "DKI Jakarta", ["jakarta selatan"]],
  ["Jakarta Timur", "DKI Jakarta", ["jakarta timur"]],
  ["Jakarta Barat", "DKI Jakarta", ["jakarta barat"]],
  ["Jakarta Utara", "DKI Jakarta", ["jakarta utara"]],
  ["Jakarta Pusat", "DKI Jakarta", ["jakarta pusat"]],
  ["Jakarta", "DKI Jakarta", ["jakarta", "daerah khusus ibukota jakarta", "dki jakarta"]],
  ["Tangerang Selatan", "Banten", ["tangerang selatan", "tangsel"]],
  ["Tangerang", "Banten", ["tangerang", "kota tangerang"]],
  ["Bandung", "Jawa Barat", ["bandung"]],
  ["Surabaya", "Jawa Timur", ["surabaya"]],
  ["Bogor", "Jawa Barat", ["bogor", "cibinong"]],
  ["Depok", "Jawa Barat", ["depok", "cinere"]],
  ["Bekasi", "Jawa Barat", ["bekasi"]],
  ["Yogyakarta", "DI Yogyakarta", ["yogyakarta", "jogja", "sleman", "bantul"]],
  ["Solo", "Jawa Tengah", ["solo", "surakarta", "colomadu"]],
  ["Semarang", "Jawa Tengah", ["semarang"]],
  ["Malang", "Jawa Timur", ["malang"]],
  ["Medan", "Sumatera Utara", ["medan"]],
  ["Makassar", "Sulawesi Selatan", ["makassar"]],
  ["Denpasar", "Bali", ["denpasar", "bali"]],
  ["Batam", "Kepulauan Riau", ["batam"]],
  ["Bandar Lampung", "Lampung", ["bandar lampung", "lampung"]],
  ["Palembang", "Sumatera Selatan", ["palembang"]],
  ["Balikpapan", "Kalimantan Timur", ["balikpapan"]],
  ["Samarinda", "Kalimantan Timur", ["samarinda"]],
  ["Pontianak", "Kalimantan Barat", ["pontianak"]],
  ["Banjarmasin", "Kalimantan Selatan", ["banjarmasin"]],
  ["Pekanbaru", "Riau", ["pekanbaru"]],
  ["Padang", "Sumatera Barat", ["padang"]],
  ["Cirebon", "Jawa Barat", ["cirebon"]],
  ["Tegal", "Jawa Tengah", ["tegal"]],
  ["Purwokerto", "Jawa Tengah", ["purwokerto", "purbalingga", "banyumas"]],
  ["Madiun", "Jawa Timur", ["madiun"]],
  ["Kediri", "Jawa Timur", ["kediri"]],
  ["Jember", "Jawa Timur", ["jember"]],
  ["Gresik", "Jawa Timur", ["gresik"]],
  ["Sidoarjo", "Jawa Timur", ["sidoarjo"]],
  ["Tasikmalaya", "Jawa Barat", ["tasikmalaya"]],
  ["Pati", "Jawa Tengah", ["pati"]],
  ["Ponorogo", "Jawa Timur", ["ponorogo"]],
  ["Tulungagung", "Jawa Timur", ["tulungagung"]],
  ["Kupang", "Nusa Tenggara Timur", ["kupang"]],
  ["Kendari", "Sulawesi Tenggara", ["kendari"]],
  ["Brebes", "Jawa Tengah", ["brebes"]],
  ["Batang", "Jawa Tengah", ["batang"]],
] as const;

const FIELD_CONFIG = [
  { field: "city_origin", type: "origin", confidence: 1 },
  { field: "office_address", type: "head_office", confidence: 0.9 },
  { field: "outlets_location", type: "outlet", confidence: 0.85 },
  { field: "location_requirement", type: "available_area", confidence: 0.72 },
] as const;

const CITY_ALIAS_EXCLUSIONS: Record<string, string[]> = {
  tegal: ["tegal besar"],
};

export function extractFranchiseLocations(row: LocationSourceRow): FranchiseLocationMatch[] {
  const structured = parseStructuredLocations(row.structured_locations);
  if (structured.length) return structured;
  return inferFranchiseLocations(row);
}

export function inferFranchiseLocations(row: LocationSourceRow): FranchiseLocationMatch[] {
  const matches: FranchiseLocationMatch[] = [];
  const seen = new Set<string>();

  for (const config of FIELD_CONFIG) {
    const sourceText = normalizeText(row[config.field]);
    if (!sourceText) continue;
    for (const city of matchCityAliases(sourceText)) {
      const key = `${config.field}:${config.type}:${city.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        label: city.label,
        slug: city.slug,
        province: city.province,
        locationType: config.type,
        sourceField: config.field,
        sourceText,
        confidence: config.confidence,
      });
    }
  }

  return matches;
}

export function matchCityAliases(value: unknown) {
  const haystack = ` ${normalizeText(value).toLowerCase()} `;
  if (!haystack.trim()) return [];
  const results: Array<{ label: string; slug: string; province: string }> = [];
  const seen = new Set<string>();

  for (const [label, province, aliases] of CITY_ALIASES) {
    const slug = slugify(label);
    if ((CITY_ALIAS_EXCLUSIONS[slug] || []).some((exclusion) => includesCityToken(haystack, exclusion))) continue;
    if (!aliases.some((alias) => includesCityToken(haystack, alias))) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    results.push({ label, slug, province });
  }

  return results;
}

function parseStructuredLocations(value: unknown): FranchiseLocationMatch[] {
  const text = normalizeText(value);
  if (!text || text === "[]") return [];

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeStructuredLocation(item))
      .filter((item): item is FranchiseLocationMatch => Boolean(item));
  } catch {
    return [];
  }
}

function normalizeStructuredLocation(item: unknown): FranchiseLocationMatch | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const label = normalizeText(record.city || record.label);
  const slug = normalizeText(record.slug) || slugify(label);
  if (!label || !slug) return null;
  const locationType = normalizeLocationType(record.location_type);
  const sourceField = normalizeSourceField(record.source_field);
  return {
    label,
    slug,
    province: normalizeText(record.province),
    locationType,
    sourceField,
    sourceText: normalizeText(record.location_text),
    confidence: Number(record.confidence_score) || 0.8,
  };
}

function normalizeLocationType(value: unknown): FranchiseLocationMatch["locationType"] {
  const normalized = normalizeText(value);
  if (normalized === "head_office" || normalized === "outlet" || normalized === "available_area" || normalized === "origin") return normalized;
  return "available_area";
}

function normalizeSourceField(value: unknown): FranchiseLocationMatch["sourceField"] {
  const normalized = normalizeText(value);
  if (
    normalized === "city_origin" ||
    normalized === "office_address" ||
    normalized === "outlets_location" ||
    normalized === "location_requirement" ||
    normalized === "structured_locations"
  ) {
    return normalized;
  }
  return "structured_locations";
}

function includesCityToken(haystack: string, alias: string) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}
