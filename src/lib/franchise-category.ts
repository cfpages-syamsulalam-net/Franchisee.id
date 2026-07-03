import type { CategoryRouteEntry, FranchiseStaticRow } from "./franchise-static";
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
    });
  }

  addCategoryAlias(entries, "makanan-minuman-fb", "Makanan & Minuman", rows, (row) => categorySlug(row) === "makanan-minuman");
  addCategoryAlias(entries, "perhotelan-travel", "Penginapan & Agen Travel", rows, (row) => categorySlug(row) === "penginapan-agen-travel");
  addCategoryAlias(entries, "properti-furniture", "Properti & Furniture", rows, (row) => categorySlug(row) === "furnitur-konstruksi-properti");
  addCategoryAlias(entries, "teknologi-digital", "Teknologi Digital", rows, (row) => categorySlug(row) === "komputer-teknologi");
  addCategoryAlias(entries, "jasa-layanan", "Jasa & Layanan", rows, (row) => categorySlug(row).includes("jasa") || categorySlug(row).includes("laundry"));

  return [...entries.values()].filter((entry) => entry.rows.length > 0).sort((a, b) => a.label.localeCompare(b.label, "id-ID"));
}

export function getCategorySummaries(rows: FranchiseStaticRow[]) {
  const categories = new Map<string, { label: string; slug: string; rows: FranchiseStaticRow[]; count: number }>();
  for (const row of rows) {
    const label = normalizeText(row.category) || "Bisnis Umum";
    const slug = slugify(label);
    const current = categories.get(slug) || { label, slug, rows: [], count: 0 };
    current.rows.push(row);
    current.count += 1;
    categories.set(slug, current);
  }
  return [...categories.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "id-ID"));
}

export function canonicalCategoryHref(categoryOrSlug: string) {
  return `/peluang-usaha?kategori=${slugify(categoryOrSlug)}`;
}

function addCategoryAlias(
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
  });
}

export function categorySlug(row: FranchiseStaticRow) {
  return slugify(normalizeText(row.category) || "Bisnis Umum");
}
