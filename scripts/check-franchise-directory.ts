import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  getCategoryRouteEntries,
  loadFranchiseStaticRows,
  renderCategoryLandingPage,
  renderListingPage,
} from "../src/lib/franchise-static";
import { canonicalCategoryHref } from "../src/lib/franchise-category";
import { getFranchiseCategoryContent } from "../src/lib/franchise-category-content";
import { applyCanonicalLegacyLinks } from "../src/lib/franchise-text";
import { canonicalCategoryPath } from "../src/shared/franchise-category-route.mjs";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { onRequest as redirectLegacyCategory } from "../functions/peluang-usaha/index.js";

const root = resolve(process.cwd());
const legacyCategoryUrlPattern = /\/peluang-usaha\/?\?kategori=/;
const rows = loadFranchiseStaticRows();
const directoryHtml = renderListingPage(rows);
const categoryEntries = getCategoryRouteEntries(rows);

assert.equal((directoryHtml.match(/type="search" name="q"/g) || []).length, 1, "directory must expose one primary search input");
assert.ok(!directoryHtml.includes('data-id="9hd9if8"'), "legacy explanatory section must be removed");
assert.ok(directoryHtml.indexOf("data-directory-controls") < directoryHtml.indexOf("data-franchise-card"), "controls must precede results");
assert.ok(directoryHtml.indexOf("fr-owner-cta--directory") > directoryHtml.indexOf("<!-- end Post Grid -->"), "owner CTA must follow results");
assert.ok(directoryHtml.includes("Punya peluang usaha franchise? Tampilkan brand franchise Anda gratis di Franchisee.id."));
assert.ok(directoryHtml.includes('"@type":"CollectionPage"'), "directory schema must describe a collection page");
assert.ok(!directoryHtml.includes('"@type":"Article"'), "directory schema must not describe an article");
assert.ok(!directoryHtml.includes('"name":"admin"'), "directory schema must not expose the legacy admin author");
assert.ok(directoryHtml.includes("franchise-directory-content-css"), "directory content styles must be injected");

const routeSlugs = new Set(categoryEntries.map((entry) => entry.slug));
for (const alias of ["fnb", "makanan-minuman-fb", "perhotelan-travel", "properti-furniture", "teknologi-digital"]) {
  assert.ok(!routeSlugs.has(alias), `${alias} must not be emitted as a duplicate category page`);
}
assert.equal(canonicalCategoryHref("FnB"), "/peluang-usaha/kategori/makanan-minuman");
assert.equal(canonicalCategoryHref("perhotelan-travel"), "/peluang-usaha/kategori/penginapan-agen-travel");
assert.equal(canonicalCategoryPath("FnB"), "/peluang-usaha/kategori/makanan-minuman");
assert.equal(
  applyCanonicalLegacyLinks('<a href="/peluang-usaha?kategori=fnb&amp;sort=populer">Kategori</a>'),
  '<a href="/peluang-usaha/kategori/makanan-minuman?sort=populer">Kategori</a>',
  "legacy HTML canonicalization must preserve non-category query state",
);

const categoryTitles = categoryEntries.map((entry) => getFranchiseCategoryContent(entry.slug, entry.label, entry.rows.length).seoTitle);
assert.equal(new Set(categoryTitles).size, categoryTitles.length, "category SEO titles must be unique");
const nonIndexableEntry = categoryEntries.find((entry) => !entry.indexable);
assert.ok(nonIndexableEntry, "sparse or catch-all category must exercise the noindex policy");
assert.ok(renderCategoryLandingPage(nonIndexableEntry, rows).includes('name="robots" content="noindex, follow"'));

const foodEntry = categoryEntries.find((entry) => entry.slug === "makanan-minuman");
assert.ok(foodEntry, "canonical food category must exist");
const foodHtml = renderCategoryLandingPage(foodEntry, rows);
assert.ok(foodHtml.includes(`data-directory-path="${foodEntry.canonicalPath}"`));
assert.ok(foodHtml.includes(`${foodEntry.rows.length} peluang`), "category copy must use the real listing count");
assert.ok(foodHtml.includes("/peluang-usaha/kategori/makanan-minuman"));
assert.ok(!legacyCategoryUrlPattern.test(foodHtml), "category pages must not emit query-based category links");

const assetSource = readFileSync(resolve(root, "src/lib/franchise-directory-client.ts"), "utf8");
assert.ok(assetSource.includes('"/peluang-usaha/kategori/"'), "directory controller must build canonical category routes");
assert.ok(!assetSource.includes('next.set("kategori"'), "directory controller must not write category query params");
assert.ok(assetSource.includes('params.get("kategori")'), "directory controller must retain a browser fallback for legacy category URLs");

async function checkLegacyRedirect() {
  const request = new Request("https://franchisee.id/peluang-usaha?kategori=fnb&q=kopi&sort=populer");
  const response = await redirectLegacyCategory({ request, next: () => Promise.reject(new Error("redirect should not fall through")) });
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://franchisee.id/peluang-usaha/kategori/makanan-minuman?q=kopi&sort=populer");

  let passedThrough = false;
  const plainResponse = await redirectLegacyCategory({
    request: new Request("https://franchisee.id/peluang-usaha?q=kopi"),
    next: () => {
      passedThrough = true;
      return Promise.resolve(new Response("static"));
    },
  });
  assert.equal(plainResponse.status, 200);
  assert.ok(passedThrough, "plain directory requests must continue to the static asset");

  const copySource = readFileSync(resolve(root, "scripts/copy-legacy-static.mjs"), "utf8");
  assert.ok(!copySource.includes("/peluang-usaha?kategori="), "legacy copy must rewrite category links to canonical routes");
  const bridgeRendererSource = readFileSync(resolve(root, "scripts/d1-page-renderer.ts"), "utf8");
  assert.ok(!bridgeRendererSource.includes("/peluang-usaha?kategori="), "bridge renderer must emit canonical category routes");

  const runtimeSources = [
    "js/build-details.js",
    "js/build-listing.js",
    "templates/detail-franchise-tpl.html",
  ];
  const staleRuntimeSources = runtimeSources.filter((file) => legacyCategoryUrlPattern.test(readFileSync(resolve(root, file), "utf8")));
  assert.deepEqual(staleRuntimeSources, [], "runtime category-link producers must not emit the legacy query shape");

  const staticDirectory = resolve(root, "peluang-usaha");
  const staleStaticSnapshots = readdirSync(staticDirectory)
    .filter((file) => file.endsWith(".html"))
    .filter((file) => legacyCategoryUrlPattern.test(readFileSync(resolve(staticDirectory, file), "utf8")));
  assert.deepEqual(staleStaticSnapshots, [], "tracked directory/detail HTML snapshots must not retain legacy category links");

  console.log(`Directory checks passed for ${rows.length} listings and ${categoryEntries.length} category routes.`);
}

checkLegacyRedirect().catch((error) => {
  console.error(error);
  process.exit(1);
});
