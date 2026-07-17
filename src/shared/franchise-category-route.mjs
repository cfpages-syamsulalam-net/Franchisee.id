export const CATEGORY_ROUTE_ALIASES = Object.freeze({
  fnb: Object.freeze({ slug: "makanan-minuman", label: "Makanan & Minuman" }),
  "makanan-minuman-fb": Object.freeze({ slug: "makanan-minuman", label: "Makanan & Minuman" }),
  "perhotelan-travel": Object.freeze({ slug: "penginapan-agen-travel", label: "Penginapan & Agen Travel" }),
  "properti-furniture": Object.freeze({ slug: "furnitur-konstruksi-properti", label: "Furnitur, Konstruksi, Properti" }),
  "teknologi-digital": Object.freeze({ slug: "komputer-teknologi", label: "Komputer & Teknologi" }),
});

export function categoryRouteSlug(value) {
  const slug = slugifyCategoryRoute(value);
  return CATEGORY_ROUTE_ALIASES[slug]?.slug || slug;
}

export function resolveCategoryRoute(value) {
  const sourceSlug = slugifyCategoryRoute(value);
  const alias = CATEGORY_ROUTE_ALIASES[sourceSlug];
  return alias || { slug: sourceSlug, label: "" };
}

export function canonicalCategoryPath(value) {
  const slug = categoryRouteSlug(value);
  return slug ? `/peluang-usaha/kategori/${slug}` : "/peluang-usaha";
}

function slugifyCategoryRoute(value) {
  let decoded = String(value ?? "").trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch (_error) {
    // Keep malformed legacy values deterministic instead of failing the request.
  }
  return decoded
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}
