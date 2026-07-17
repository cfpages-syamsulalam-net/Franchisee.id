import type { CategoryRouteEntry } from "./franchise-directory-types";
import type { D1FranchiseRow as FranchiseStaticRow } from "./shared-schemas";
import { normalizeText, slugify } from "./franchise-text";

export function getCategoryRouteEntries(rows: FranchiseStaticRow[]) {
  const summaries = getCategorySummaries(rows);
  const entries = new Map<string, CategoryRouteEntry>();

  for (const summary of summaries) {
    entries.set(summary.slug, {
      slug: summary.slug,
      label: summary.label,
      rows: summary.rows,
      canonicalPath: canonicalCategoryHref(summary.slug),
      indexable: summary.count >= 3 && summary.slug !== "lainnya",
    });
  }

  addCategoryHub(entries, "jasa-layanan", "Jasa & Layanan", rows, (row) => {
    const slug = categorySlug(row);
    return slug === "bisnis-jasa" || slug === "laundry-jasa-kebersihan";
  });

  return [...entries.values()].filter((entry) => entry.rows.length > 0).sort((a, b) => a.label.localeCompare(b.label, "id-ID"));
}

export function getCategorySummaries(rows: FranchiseStaticRow[]) {
  const categories = new Map<string, { label: string; slug: string; rows: FranchiseStaticRow[]; count: number }>();
  for (const row of rows) {
    const category = canonicalCategory(normalizeText(row.category) || "Bisnis Umum");
    const { label, slug } = category;
    const current = categories.get(slug) || { label, slug, rows: [], count: 0 };
    current.rows.push(row);
    current.count += 1;
    categories.set(slug, current);
  }
  return [...categories.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "id-ID"));
}

export function canonicalCategoryHref(categoryOrSlug: string) {
  return `/peluang-usaha/kategori/${canonicalCategory(categoryOrSlug).slug}`;
}

function addCategoryHub(
  entries: Map<string, CategoryRouteEntry>,
  slug: string,
  label: string,
  rows: FranchiseStaticRow[],
  predicate: (row: FranchiseStaticRow) => boolean,
) {
  const matchedRows = rows.filter(predicate);
  if (!matchedRows.length || entries.has(slug)) return;
  entries.set(slug, {
    slug,
    label,
    rows: matchedRows,
    canonicalPath: canonicalCategoryHref(slug),
    indexable: true,
  });
}

export function categorySlug(row: FranchiseStaticRow) {
  return canonicalCategory(normalizeText(row.category) || "Bisnis Umum").slug;
}

function canonicalCategory(value: string) {
  const slug = slugify(value);
  const aliases: Record<string, { slug: string; label: string }> = {
    fnb: { slug: "makanan-minuman", label: "Makanan & Minuman" },
    "makanan-minuman-fb": { slug: "makanan-minuman", label: "Makanan & Minuman" },
    "perhotelan-travel": { slug: "penginapan-agen-travel", label: "Penginapan & Agen Travel" },
    "properti-furniture": { slug: "furnitur-konstruksi-properti", label: "Furnitur, Konstruksi, Properti" },
    "teknologi-digital": { slug: "komputer-teknologi", label: "Komputer & Teknologi" },
  };
  return aliases[slug] || { slug, label: normalizeText(value) || "Bisnis Umum" };
}
