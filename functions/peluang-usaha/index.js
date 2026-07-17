import { canonicalCategoryPath } from "../../src/shared/franchise-category-route.mjs";

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== "GET" && request.method !== "HEAD") return context.next();

  const url = new URL(request.url);
  const legacyCategory = url.searchParams.get("kategori");
  if (!legacyCategory) return context.next();

  const canonicalPath = canonicalCategoryPath(legacyCategory);
  if (canonicalPath === "/peluang-usaha") return context.next();

  url.pathname = canonicalPath;
  url.searchParams.delete("kategori");
  return new Response(null, {
    status: 301,
    headers: {
      location: url.toString(),
      "cache-control": "public, max-age=3600",
    },
  });
}
