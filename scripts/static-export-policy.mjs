const PUBLIC_JSON_FILES = new Set([
  "country-codes.json",
  "country-metadata.json",
  "data-kota-id.json",
  "unclaimed-brands.json",
]);

// The D1 snapshot is a build input, not a public API. New browser datasets
// require an explicit addition here after their fields have been reviewed.
export function isPublicLegacyFile(relativePath) {
  const path = relativePath.replaceAll("\\", "/");
  if (path.split("/").some((part) => part.startsWith("."))) return false;
  if (/\.(?:md|sql|toml|env|php|lock|map)$/i.test(path)) return false;
  if (path.startsWith("json/")) return PUBLIC_JSON_FILES.has(path.slice(5));
  return true;
}
