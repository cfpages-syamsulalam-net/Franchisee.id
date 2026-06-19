#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = join(ROOT_DIR, "dist");

const SKIP_TOP_LEVEL = new Set([
  ".agents",
  ".astro",
  ".context",
  ".git",
  ".github",
  ".grok",
  "csv",
  "dist",
  "docs",
  "functions",
  "migrations",
  "node_modules",
  "peluang-usaha",
  "progress",
  "scripts",
  "src",
  "templates",
]);

const ROOT_FILE_NAMES = new Set(["robots.txt", "sitemap.xml", "sitemap_index.xml", "sitemap-complete.xml", "main-sitemap.xsl"]);
const ROOT_FILE_EXTENSIONS = new Set([".html", ".xml", ".xsl"]);

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

console.log("Legacy static copy:");
console.log(`- directories_scanned=${stats.directories}`);
console.log(`- files_copied=${stats.filesCopied}`);
console.log(`- files_skipped=${stats.filesSkipped}`);
console.log("- skipped_route=peluang-usaha");

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
  copyFileSync(sourcePath, targetPath);
  stats.filesCopied += 1;
}
