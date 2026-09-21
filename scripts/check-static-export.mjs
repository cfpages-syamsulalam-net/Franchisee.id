import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { isPublicLegacyFile } from "./static-export-policy.mjs";

for (const path of ["json/d1-franchise-static-data.json", "json/d1-generated-pages-manifest.json", "json/future-private.json", "css/.env", "js/notes.md", "wp-content/config.php"]) {
  assert.equal(isPublicLegacyFile(path), false, path);
}
for (const path of ["json/unclaimed-brands.json", "json/country-metadata.json", "json/data-kota-id.json", "css/legacy-shell.css", "js/auth-clerk.js"]) {
  assert.equal(isPublicLegacyFile(path), true, path);
}

const root = mkdtempSync(join(tmpdir(), "franchisee-export-check-"));
try {
  for (const dir of ["scripts", "json", "dist/json", "css"]) mkdirSync(join(root, dir), { recursive: true });
  for (const name of ["copy-legacy-static.mjs", "static-export-policy.mjs"]) copyFileSync(new URL(name, import.meta.url), join(root, "scripts", name));
  writeFileSync(join(root, "index.html"), '<html><head></head><body><footer></footer></body></html>');
  writeFileSync(join(root, "json/d1-franchise-static-data.json"), '{"private":"fixture"}');
  writeFileSync(join(root, "dist/json/d1-franchise-static-data.json"), '{"stale":"fixture"}');
  writeFileSync(join(root, "json/unclaimed-brands.json"), '[]');
  writeFileSync(join(root, "css/.env"), 'PRIVATE=fixture');
  const run = spawnSync(process.execPath, [join(root, "scripts/copy-legacy-static.mjs")], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(existsSync(join(root, "dist/json/d1-franchise-static-data.json")), false);
  assert.equal(existsSync(join(root, "dist/css/.env")), false);
  assert.equal(readFileSync(join(root, "dist/json/unclaimed-brands.json"), "utf8"), '[]');
  assert.match(readFileSync(join(root, "dist/index.html"), "utf8"), /href="\/css\/legacy-shell\.css"/);
  console.log("Static export privacy and legacy shell checks passed.");
} finally {
  // root is the exact directory returned by mkdtempSync, never a supplied path.
  rmSync(root, { recursive: true, force: true });
}
