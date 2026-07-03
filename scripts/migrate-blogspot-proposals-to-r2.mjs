#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT_DIR = resolve(process.cwd());
const SNAPSHOT_PATH = join(ROOT_DIR, "json", "d1-franchise-static-data.json");
const OUTPUT_DIR = join(ROOT_DIR, ".context", "proposal-r2-migration");
const FILE_DIR = join(OUTPUT_DIR, "files");
const SQL_CHUNK_DIR = join(OUTPUT_DIR, "sql-chunks");
const MANIFEST_PATH = join(OUTPUT_DIR, "manifest.json");
const SQL_PATH = join(OUTPUT_DIR, "update-proposal-assets.sql");
const DEFAULT_PUBLIC_BASE = "https://assets.franchisee.id";
const DEFAULT_BUCKET = "franchise-assets";
const SITE_ID = "site_franchisee_id";
const args = new Set(process.argv.slice(2));

const options = {
  dryRun: args.has("--dry-run"),
  download: args.has("--download") || args.has("--upload-r2") || args.has("--apply-remote"),
  uploadR2: args.has("--upload-r2"),
  writeSql: args.has("--write-sql") || args.has("--apply-remote"),
  applyRemote: args.has("--apply-remote"),
  force: args.has("--force"),
  limit: numberArg("--limit"),
  offset: numberArg("--offset"),
  sqlChunkSize: numberArg("--sql-chunk-size") || (args.has("--apply-remote") ? 5 : 0),
  account: valueArg("--account") || process.env.CFMAN_ACCOUNT || "franchise-network",
  skipExisting: !args.has("--no-skip-existing"),
  publicBase: valueArg("--public-base") || process.env.FRANCHISE_ASSETS_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE,
  bucket: valueArg("--bucket") || process.env.FRANCHISE_ASSETS_BUCKET || DEFAULT_BUCKET,
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}

async function main() {
  mkdirSync(FILE_DIR, { recursive: true });
  const rows = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
  const allMigrations = collectMigrations(rows);
  const migrations = allMigrations.slice(options.offset, options.limit ? options.offset + options.limit : undefined);

  if (!migrations.length) {
    console.log("No legacy proposal image URLs found.");
    return;
  }

  if (options.download) {
    for (const item of migrations) await downloadImage(item);
  }

  if (options.uploadR2) {
    for (const item of migrations) await uploadToR2(item);
  }

  const grouped = groupByFranchise(migrations);
  const manifest = {
    generated_at: new Date().toISOString(),
    public_base: options.publicBase,
    bucket: options.bucket,
    total_assets: migrations.length,
    total_franchises: grouped.length,
    dry_run: options.dryRun,
    franchises: grouped,
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  if (options.writeSql) {
    writeFileSync(SQL_PATH, buildSql(grouped));
    if (options.sqlChunkSize) writeSqlChunks(grouped);
  }

  if (options.applyRemote) {
    if (options.dryRun) throw new Error("--apply-remote cannot be combined with --dry-run.");
    const applyPaths = options.sqlChunkSize ? writeSqlChunks(grouped) : [SQL_PATH];
    for (const sqlPath of applyPaths) {
      await applySqlRemote(readFileSync(sqlPath, "utf8"), sqlPath);
    }
  }

  console.log(`Proposal migration manifest: ${relative(MANIFEST_PATH)}`);
  if (options.writeSql) console.log(`Proposal migration SQL: ${relative(SQL_PATH)}`);
  console.log(`Franchises=${grouped.length} assets=${migrations.length} downloaded=${options.download} uploaded=${options.uploadR2} applied=${options.applyRemote}`);
}

function collectMigrations(rows) {
  const migrations = [];
  const seen = new Set();

  for (const row of rows) {
    const urls = extractUrls(row.proposal_url).filter(isLegacyProposalImageUrl);
    urls.forEach((sourceUrl, index) => {
      const idKey = `${row.id}|${sourceUrl}`;
      if (seen.has(idKey)) return;
      seen.add(idKey);

      const hash = shortHash(sourceUrl);
      const ext = extensionFromUrl(sourceUrl) || ".jpg";
      const objectKey = `franchises/${slugPart(row.slug)}/proposal/${String(index + 1).padStart(2, "0")}-${hash}${ext}`;
      const publicUrl = joinUrl(options.publicBase, objectKey);
      const localPath = join(FILE_DIR, `${slugPart(row.slug)}-${String(index + 1).padStart(2, "0")}-${hash}${ext}`);
      migrations.push({
        franchise_id: row.id,
        slug: row.slug,
        brand_name: row.brand_name,
        display_order: index,
        source_url: sourceUrl,
        object_key: objectKey,
        public_url: publicUrl,
        local_path: localPath,
        asset_id: `asset_proposal_${shortHash(`${row.id}|${sourceUrl}`, 24)}`,
        rebuild_id: `rebuild_proposal_${shortHash(`${row.id}|${sourceUrl}|${index}`, 24)}`,
        mime_type: mimeFromExtension(ext),
        file_size_bytes: existsSync(localPath) ? statSync(localPath).size : null,
      });
    });
  }

  return migrations;
}

function extractUrls(value) {
  const text = normalizeText(value);
  if (!text) return [];

  const jsonUrls = parseJsonUrls(text);
  if (jsonUrls.length) return unique(jsonUrls);

  const htmlUrls = [...text.matchAll(/\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]);
  const rawUrls = [...text.matchAll(/https?:\/\/[^\s"',<>\\)]+/gi)].map((match) => match[0]);
  return unique([...htmlUrls, ...rawUrls].map(cleanUrl).filter(Boolean));
}

function parseJsonUrls(text) {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((item) => cleanUrl(String(item || ""))).filter(Boolean);
  } catch (_error) {
    return [];
  }
  return [];
}

function isLegacyProposalImageUrl(url) {
  const lower = url.toLowerCase();
  if (lower.includes("assets.franchisee.id/")) return false;
  if (!/\.(png|jpe?g|webp)(?:[?#].*)?$/i.test(lower) && !lower.includes("blogger.googleusercontent.com")) return false;
  return lower.includes("blogspot.") || lower.includes("blogger.googleusercontent.com") || lower.includes("googleusercontent.com");
}

async function downloadImage(item) {
  if (!options.force && existsSync(item.local_path)) {
    item.file_size_bytes = statSync(item.local_path).size;
    return;
  }
  ensureParent(item.local_path);
  if (options.dryRun) return;

  const response = await fetch(item.source_url, {
    headers: {
      "user-agent": "Franchisee.id proposal media migration",
    },
  });
  if (!response.ok) throw new Error(`Failed to download ${item.source_url}: ${response.status}`);

  const contentType = response.headers.get("content-type") || item.mime_type || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  item.mime_type = normalizeMime(contentType);
  item.file_size_bytes = buffer.length;
  writeFileSync(item.local_path, buffer);
}

async function uploadToR2(item) {
  if (options.dryRun) return;
  if (!existsSync(item.local_path)) throw new Error(`Missing downloaded file for ${item.brand_name}: ${item.local_path}`);
  if (options.skipExisting && await remoteObjectExists(item.public_url)) return;

  const command = [
    "cfman",
    "wrangler",
    "--account",
    options.account,
    "r2",
    "object",
    "put",
    `${options.bucket}/${item.object_key}`,
    "--remote",
    "--file",
    item.local_path,
    "--content-type",
    item.mime_type || "image/jpeg",
  ];
  const result = spawnSync("npx", command, { cwd: ROOT_DIR, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`R2 upload failed for ${item.object_key}`);
}

async function remoteObjectExists(url) {
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10_000) });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

function groupByFranchise(migrations) {
  const map = new Map();
  for (const item of migrations) {
    const current = map.get(item.franchise_id) || {
      franchise_id: item.franchise_id,
      slug: item.slug,
      brand_name: item.brand_name,
      proposal_urls: [],
      assets: [],
    };
    current.proposal_urls.push(item.public_url);
    current.assets.push(item);
    map.set(item.franchise_id, current);
  }
  return [...map.values()];
}

function buildSql(groups) {
  const lines = [
    "-- Generated by scripts/migrate-blogspot-proposals-to-r2.mjs",
    "-- Idempotent proposal image migration from legacy Blogspot URLs to R2.",
  ];

  for (const group of groups) {
    for (const asset of group.assets) {
      lines.push(
        `INSERT INTO franchise_assets (id, franchise_id, asset_type, r2_bucket, r2_key, public_url, legacy_url, mime_type, file_size_bytes, status, display_order) VALUES (${sql(asset.asset_id)}, ${sql(asset.franchise_id)}, 'proposal', 'FRANCHISE_ASSETS', ${sql(asset.object_key)}, ${sql(asset.public_url)}, ${sql(asset.source_url)}, ${sql(asset.mime_type)}, ${numberOrNull(asset.file_size_bytes)}, 'active', ${Number(asset.display_order || 0)}) ON CONFLICT(id) DO UPDATE SET public_url = excluded.public_url, r2_key = excluded.r2_key, legacy_url = excluded.legacy_url, mime_type = excluded.mime_type, file_size_bytes = excluded.file_size_bytes, status = 'active', display_order = excluded.display_order, updated_at = CURRENT_TIMESTAMP;`,
      );
    }

    lines.push(
      `UPDATE franchises SET proposal_url = ${sql(JSON.stringify(group.proposal_urls))}, updated_at = CURRENT_TIMESTAMP WHERE id = ${sql(group.franchise_id)};`,
      `INSERT OR IGNORE INTO site_rebuild_requests (id, site_id, franchise_id, reason, entity_type, entity_id, metadata) VALUES (${sql(`rebuild_proposal_${shortHash(group.franchise_id, 24)}`)}, ${sql(SITE_ID)}, ${sql(group.franchise_id)}, 'proposal_media_migration', 'franchises', ${sql(group.franchise_id)}, ${sql(JSON.stringify({ source: "proposal_r2_migration", slug: group.slug, brand_name: group.brand_name }))});`,
    );
  }

  lines.push(
    `INSERT INTO site_publish_state (site_id, dirty_since, last_change_at, pending_count, updated_at) VALUES (${sql(SITE_ID)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ${groups.length}, CURRENT_TIMESTAMP) ON CONFLICT(site_id) DO UPDATE SET dirty_since = COALESCE(site_publish_state.dirty_since, excluded.dirty_since), last_change_at = CURRENT_TIMESTAMP, pending_count = site_publish_state.pending_count + ${groups.length}, updated_at = CURRENT_TIMESTAMP;`,
    "",
  );
  return lines.join("\n");
}

function writeSqlChunks(groups) {
  mkdirSync(SQL_CHUNK_DIR, { recursive: true });
  const paths = [];
  for (let index = 0; index < groups.length; index += options.sqlChunkSize) {
    const chunk = groups.slice(index, index + options.sqlChunkSize);
    const path = join(SQL_CHUNK_DIR, `proposal-assets-${String(paths.length + 1).padStart(3, "0")}.sql`);
    writeFileSync(path, buildSql(chunk));
    paths.push(path);
  }
  return paths;
}

async function applySqlRemote(sqlText, sqlPath = SQL_PATH) {
  if (!sqlText.trim()) throw new Error("No SQL to apply.");
  const command = [
    "cfman",
    "wrangler",
    "--account",
    options.account,
    "d1",
    "execute",
    "franchise_db",
    "--remote",
    "--file",
    sqlPath,
  ];
  const result = spawnSync("npx", command, { cwd: ROOT_DIR, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error("Remote D1 apply failed.");
}

function sql(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? String(Math.round(numeric)) : "NULL";
}

function cleanUrl(value) {
  return value.trim().replace(/&amp;/g, "&").replace(/[).,;]+$/g, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeText(value) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}

function shortHash(value, length = 12) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, length);
}

function extensionFromUrl(url) {
  const match = new URL(url).pathname.match(/\.(png|jpe?g|webp)$/i);
  if (!match) return "";
  const ext = match[0].toLowerCase();
  return ext === ".jpeg" ? ".jpg" : ext;
}

function mimeFromExtension(ext) {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function normalizeMime(value) {
  const mime = String(value || "").split(";")[0].trim().toLowerCase();
  return mime || "application/octet-stream";
}

function slugPart(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "franchise";
}

function joinUrl(base, path) {
  return `${String(base).replace(/\/+$/g, "")}/${String(path).replace(/^\/+/g, "")}`;
}

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function relative(path) {
  return path.replace(`${ROOT_DIR}\\`, "").replace(`${ROOT_DIR}/`, "");
}

function valueArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function numberArg(name) {
  const value = valueArg(name);
  if (!value) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}
