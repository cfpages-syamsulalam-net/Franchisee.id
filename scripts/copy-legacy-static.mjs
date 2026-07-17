#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = join(ROOT_DIR, "dist");
const CLERK_JS_SOURCE_DIR = join(ROOT_DIR, "node_modules", "@clerk", "clerk-js", "dist");
const CLERK_JS_TARGET_DIR = join(DIST_DIR, "clerk");

const SKIP_TOP_LEVEL = new Set([
  ".agents",
  ".astro",
  ".context",
  ".git",
  ".github",
  ".grok",
  "abjad",
  "anak-balita",
  "bisnis-jasa",
  "category",
  "direktori-franchise",
  "fnb",
  "furnitur-konstruksi-properti",
  "hiburan-hobi",
  "jasa-layanan",
  "kategori",
  "kesehatan-kecantikan",
  "komputer-teknologi",
  "lainnya",
  "laundry-jasa-kebersihan",
  "makanan-minuman",
  "makanan-minuman-fb",
  "otomotif",
  "pendidikan-kursus-pelatihan",
  "penginapan-agen-travel",
  "perhotelan-travel",
  "populer",
  "properti-furniture",
  "csv",
  "dist",
  "docs",
  "functions",
  "migrations",
  "node_modules",
  "peluang-usaha",
  "progress",
  "public",
  "rekomendasi",
  "retail-minimarket",
  "scripts",
  "src",
  "templates",
  "teknologi-digital",
]);

const CANONICAL_ROUTE_MAP = new Map([
  ["/direktori-franchise", "/peluang-usaha"],
  ["/rekomendasi", "/peluang-usaha?sort=rekomendasi"],
  ["/populer", "/peluang-usaha?sort=populer"],
  ["/abjad", "/peluang-usaha?sort=abjad"],
  ["/kategori", "/peluang-usaha/kategori/"],
  ["/category", "/peluang-usaha/kategori/"],
  ["/anak-balita", "/peluang-usaha/kategori/anak-balita"],
  ["/bisnis-jasa", "/peluang-usaha/kategori/bisnis-jasa"],
  ["/fnb", "/peluang-usaha/kategori/makanan-minuman"],
  ["/furnitur-konstruksi-properti", "/peluang-usaha/kategori/furnitur-konstruksi-properti"],
  ["/hiburan-hobi", "/peluang-usaha/kategori/hiburan-hobi"],
  ["/jasa-layanan", "/peluang-usaha/kategori/jasa-layanan"],
  ["/kesehatan-kecantikan", "/peluang-usaha/kategori/kesehatan-kecantikan"],
  ["/komputer-teknologi", "/peluang-usaha/kategori/komputer-teknologi"],
  ["/lainnya", "/peluang-usaha/kategori/lainnya"],
  ["/laundry-jasa-kebersihan", "/peluang-usaha/kategori/laundry-jasa-kebersihan"],
  ["/makanan-minuman", "/peluang-usaha/kategori/makanan-minuman"],
  ["/makanan-minuman-fb", "/peluang-usaha/kategori/makanan-minuman"],
  ["/otomotif", "/peluang-usaha/kategori/otomotif"],
  ["/pendidikan-kursus-pelatihan", "/peluang-usaha/kategori/pendidikan-kursus-pelatihan"],
  ["/penginapan-agen-travel", "/peluang-usaha/kategori/penginapan-agen-travel"],
  ["/perhotelan-travel", "/peluang-usaha/kategori/penginapan-agen-travel"],
  ["/properti-furniture", "/peluang-usaha/kategori/furnitur-konstruksi-properti"],
  ["/retail-minimarket", "/peluang-usaha/kategori/retail-minimarket"],
  ["/teknologi-digital", "/peluang-usaha/kategori/komputer-teknologi"],
]);

const ROOT_FILE_NAMES = new Set(["robots.txt", "sitemap.xml", "sitemap_index.xml", "sitemap-complete.xml", "main-sitemap.xsl"]);
const ROOT_FILE_EXTENSIONS = new Set([".html", ".xml", ".xsl"]);

const LEGAL_FOOTER_LINKS = `<div class="fr-legal-footer-links" style="background:#050505;border-top:4px solid #ffc03d;margin:0;padding:18px 20px;text-align:center;color:#ffffff;font-size:14px;">
  <a href="/privacy-policy" style="color:#ffffff;text-decoration:none;font-weight:700;">Privacy Policy</a>
  <span aria-hidden="true" style="display:inline-block;margin:0 10px;color:#ffc03d;">|</span>
  <a href="/terms-of-service" style="color:#ffffff;text-decoration:none;font-weight:700;">Terms of Service</a>
</div>`;

const stats = {
  directories: 0,
  filesCopied: 0,
  filesSkipped: 0,
};

if (!existsSync(DIST_DIR)) {
  throw new Error("dist does not exist. Run Astro build before copying legacy static files.");
}

for (const entry of readdirSync(ROOT_DIR, { withFileTypes: true })) {
  const name = entry.name;
  if (name.startsWith(".")) continue;

  const sourcePath = join(ROOT_DIR, name);
  const targetPath = join(DIST_DIR, name);

  if (entry.isDirectory()) {
    if (SKIP_TOP_LEVEL.has(name)) continue;
    copyDirectoryNoOverwrite(sourcePath, targetPath);
    continue;
  }

  if (entry.isFile() && shouldCopyRootFile(name)) {
    copyFileNoOverwrite(sourcePath, targetPath);
  }
}

if (existsSync(CLERK_JS_SOURCE_DIR)) {
  copyDirectoryOverwrite(CLERK_JS_SOURCE_DIR, CLERK_JS_TARGET_DIR);
}

console.log("Legacy static copy:");
console.log(`- directories_scanned=${stats.directories}`);
console.log(`- files_copied=${stats.filesCopied}`);
console.log(`- files_skipped=${stats.filesSkipped}`);
console.log(`- clerk_assets=${existsSync(CLERK_JS_TARGET_DIR) ? "copied" : "missing"}`);
console.log("- skipped_routes=peluang-usaha,category,kategori,rekomendasi,populer,abjad,direktori-franchise,category-aliases");

function shouldCopyRootFile(fileName) {
  if (ROOT_FILE_NAMES.has(fileName)) return true;
  return ROOT_FILE_EXTENSIONS.has(fileName.slice(fileName.lastIndexOf(".")).toLowerCase());
}

function copyDirectoryNoOverwrite(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  stats.directories += 1;

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = join(sourceDir, entry.name);
    const targetPath = join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryNoOverwrite(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      copyFileNoOverwrite(sourcePath, targetPath);
    }
  }
}

function copyFileNoOverwrite(sourcePath, targetPath) {
  if (existsSync(targetPath)) {
    stats.filesSkipped += 1;
    return;
  }

  const sourceStats = statSync(sourcePath);
  if (!sourceStats.isFile()) return;

  mkdirSync(dirname(targetPath), { recursive: true });
  if (sourcePath.toLowerCase().endsWith(".html")) {
    writeFileSync(targetPath, addLegacyLegalFooterLinks(sanitizeLegacyWordPressRuntime(rewriteLegacyHtmlLinks(readFileSync(sourcePath, "utf8")))));
  } else {
    copyFileSync(sourcePath, targetPath);
  }
  stats.filesCopied += 1;
}

function copyDirectoryOverwrite(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = join(sourceDir, entry.name);
    const targetPath = join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryOverwrite(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      mkdirSync(dirname(targetPath), { recursive: true });
      copyFileSync(sourcePath, targetPath);
    }
  }
}

function rewriteLegacyHtmlLinks(html) {
  return html.replace(/\bhref=(["'])(\/[^"'#?]*)(\/)?(\?[^"']*)?(#[^"']*)?\1/g, (match, quote, path, slash, query = "", hash = "") => {
    const normalizedPath = normalizePath(path, slash);
    const mapped = mapCanonicalHref(normalizedPath);
    if (!mapped) return match;
    return `href=${quote}${mapped}${hash}${quote}`;
  });
}

function sanitizeLegacyWordPressRuntime(html) {
  return html
    .replace(/<script\b[^>]*>\s*window\._wpemojiSettings[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\bsrc=(["'])[^"']*wp-emoji-release\.min\.js[^"']*\1[^>]*>\s*<\/script>/gi, "")
    .replace(/<script\b[^>]*\bid=(["'])latepoint-main-front-js-extra\1[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\bsrc=(["'])[^"']*latepoint\/public\/javascripts\/(?:vendor-front|front)\.js[^"']*\1[^>]*>\s*<\/script>/gi, "")
    .replace(/<script\b[^>]*\bid=(["'])analyticswp-js-extra\1[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\bsrc=(["'])[^"']*analyticswp\.min\.js[^"']*\1[^>]*>\s*<\/script>/gi, "")
    .replace(/\\?\/wp-admin\\?\/admin-ajax\.php/g, "");
}

function addLegacyLegalFooterLinks(html) {
  if (html.includes("/privacy-policy") || html.includes("/terms-of-service")) return html;
  if (!/<\/footer>/i.test(html)) return html;

  return html.replace(/<\/footer>/i, `${LEGAL_FOOTER_LINKS}\n</footer>`);
}

function normalizePath(path, slash = "") {
  const normalized = `${path}${slash || ""}`.replace(/\/+$/, "");
  return normalized || "/";
}

function mapCanonicalHref(path) {
  if (CANONICAL_ROUTE_MAP.has(path)) return CANONICAL_ROUTE_MAP.get(path);

  const categoryMatch = path.match(/^\/(?:kategori|category)\/([^/]+)$/);
  if (categoryMatch) {
    const aliases = new Map([
      ["fnb", "makanan-minuman"],
      ["makanan-minuman-fb", "makanan-minuman"],
      ["perhotelan-travel", "penginapan-agen-travel"],
      ["properti-furniture", "furnitur-konstruksi-properti"],
      ["teknologi-digital", "komputer-teknologi"],
    ]);
    const slug = aliases.get(categoryMatch[1]) || categoryMatch[1];
    return `/peluang-usaha/kategori/${encodeURIComponent(slug)}`;
  }

  return "";
}
