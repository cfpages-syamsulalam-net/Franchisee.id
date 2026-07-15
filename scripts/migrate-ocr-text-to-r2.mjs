import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT_DIR = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_ACCOUNT = "franchise-network";
const DEFAULT_ACCOUNT_ID = "0ba63b7f0096bc267a93fe5c80b1f571";
const DEFAULT_BUCKET = "franchise-assets";
const R2_BUCKET_LABEL = "FRANCHISE_ASSETS";

const options = parseArgs(process.argv.slice(2));
const tempDir = mkdtempSync(join(tmpdir(), "fr-ocr-r2-"));

try {
  let total = { knowledge: 0, cache: 0 };
  while (true) {
    const knowledgeRows = fetchRows(`SELECT id, asset_id, franchise_id, extraction_method, source_text FROM franchise_asset_knowledge WHERE COALESCE(source_text, '') <> '' AND COALESCE(source_text_r2_key, '') = '' ORDER BY updated_at DESC LIMIT ${options.limit};`);
    const remaining = Math.max(options.limit - knowledgeRows.length, 0);
    const cacheRows = remaining
      ? fetchRows(`SELECT c.content_hash, c.provider_key, c.text, COALESCE(j.asset_id, c.content_hash) AS asset_id, COALESCE(j.franchise_id, 'unknown') AS franchise_id FROM ocr_content_cache c LEFT JOIN ocr_jobs j ON j.content_hash = c.content_hash WHERE COALESCE(c.text, '') <> '' AND COALESCE(c.text_r2_key, '') = '' ORDER BY c.last_used_at DESC LIMIT ${remaining};`)
      : [];

    if (!knowledgeRows.length && !cacheRows.length) break;

    const statements = [];
    for (const row of knowledgeRows) {
      const text = String(row.source_text || "");
      const key = buildKey(row.franchise_id, row.asset_id, row.extraction_method || "proposal", row.id);
      putObject(key, text);
      statements.push(`UPDATE franchise_asset_knowledge SET source_text = '', source_text_r2_bucket = ${sql(R2_BUCKET_LABEL)}, source_text_r2_key = ${sql(key)}, source_text_preview = ${sql(text.slice(0, 1200))}, source_text_length = ${text.length}, updated_at = CURRENT_TIMESTAMP WHERE id = ${sql(row.id)};`);
      total.knowledge += 1;
    }
    for (const row of cacheRows) {
      const text = String(row.text || "");
      const key = buildKey(row.franchise_id, row.asset_id, "ocr-cache", row.content_hash);
      putObject(key, text);
      statements.push(`UPDATE ocr_content_cache SET text = '', text_r2_bucket = ${sql(R2_BUCKET_LABEL)}, text_r2_key = ${sql(key)}, text_preview = ${sql(text.slice(0, 1200))}, text_length = ${text.length} WHERE content_hash = ${sql(row.content_hash)};`);
      total.cache += 1;
    }

    executeSql(statements.join("\n"));
    console.log(`Migrated batch: knowledge=${knowledgeRows.length} cache=${cacheRows.length}`);
    if (!options.all) break;
  }

  if (options.all && (total.knowledge || total.cache)) {
    console.log("Remote D1 VACUUM is not requested here because Wrangler executes SQL files inside a transaction and D1 rejects VACUUM/incremental_vacuum remotely. Prune obsolete telemetry separately if the database is still above the write-size ceiling.");
  }

  console.log(`OCR text migration complete. knowledge=${total.knowledge} cache=${total.cache}`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function parseArgs(args) {
  const parsed = {
    account: DEFAULT_ACCOUNT,
    bucket: DEFAULT_BUCKET,
    limit: 25,
    all: false,
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--account") parsed.account = args[++i] || parsed.account;
    else if (arg === "--bucket") parsed.bucket = args[++i] || parsed.bucket;
    else if (arg === "--limit") parsed.limit = Math.min(Math.max(Number.parseInt(args[++i] || "", 10), 1), 100);
    else if (arg === "--all") parsed.all = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  pnpm run ocr:text:migrate-r2 -- --all
  pnpm run ocr:text:migrate-r2 -- --limit 25

Options:
  --account <alias>  cfman account alias. Default: franchise-network
  --bucket <name>    R2 bucket name. Default: franchise-assets
  --limit <number>   Rows per batch. Default: 25, max: 100
  --all              Continue until no D1 OCR text rows remain
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function fetchRows(command) {
  const result = runWrangler(["d1", "execute", "franchise_db", "--remote", "--json", "--command", command]);
  const envelopes = extractJsonArray(result.stdout);
  return envelopes.flatMap((item) => Array.isArray(item.results) ? item.results : []);
}

function putObject(key, text) {
  const filePath = join(tempDir, `${slugPart(key).slice(0, 80)}.txt`);
  writeFileSync(filePath, text, "utf8");
  runWrangler([
    "r2",
    "object",
    "put",
    `${options.bucket}/${key}`,
    "--file",
    filePath,
    "--remote",
    "--content-type",
    "text/plain; charset=utf-8",
    "--force",
  ]);
}

function executeSql(sqlText) {
  if (!sqlText.trim()) return;
  const filePath = join(tempDir, `updates-${Date.now()}.sql`);
  writeFileSync(filePath, `PRAGMA foreign_keys = ON;\n${sqlText}\n`, "utf8");
  runWrangler(["d1", "execute", "franchise_db", "--remote", "--file", filePath]);
}

function runWrangler(args) {
  const token = readCfmanToken(options.account) || process.env.CLOUDFLARE_API_TOKEN || "";
  if (!token) throw new Error(`No Cloudflare token found for cfman account "${options.account}" and CLOUDFLARE_API_TOKEN is not set`);
  return run("pnpm", ["exec", "wrangler", ...args], {
    CLOUDFLARE_API_TOKEN: token,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_ACCOUNT_ID,
  });
}

function run(command, args, env = {}) {
  const executable = process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command;
  const childEnv = { ...process.env, ...env };
  const result = process.platform === "win32"
    ? spawnSync([executable, ...args].map(shellQuote).join(" "), {
      cwd: ROOT_DIR,
      encoding: "utf8",
      maxBuffer: 100 * 1024 * 1024,
      env: childEnv,
      shell: true,
    })
    : spawnSync(executable, args, {
      cwd: ROOT_DIR,
      encoding: "utf8",
      maxBuffer: 100 * 1024 * 1024,
      env: childEnv,
    });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${result.stdout || ""}\n${result.stderr || ""}`);
  }
  return result;
}

function readCfmanToken(account) {
  const configPath = process.platform === "win32"
    ? process.env.APPDATA ? join(process.env.APPDATA, "cfman", "tokens.json") : ""
    : process.env.HOME ? join(process.env.HOME, ".config", "cfman", "tokens.json") : "";
  if (!configPath || !existsSync(configPath)) return "";
  const parsed = JSON.parse(readFileSync(configPath, "utf8"));
  const token = parsed?.[account];
  return typeof token === "string" ? token : "";
}

function shellQuote(value) {
  const text = String(value);
  if (!/[^\w./:@%+=,-]/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function extractJsonArray(stdout) {
  const start = stdout.indexOf("[");
  const end = stdout.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error(`Could not find JSON array in command output:\n${stdout.slice(0, 1000)}`);
  return JSON.parse(stdout.slice(start, end + 1));
}

function buildKey(franchiseId, assetId, kind, unique) {
  return `franchises/${slugPart(franchiseId || "unknown")}/ocr-text/${slugPart(assetId || unique)}-${slugPart(kind || "ocr")}-${slugPart(unique || Date.now()).slice(0, 32)}.txt`;
}

function slugPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "item";
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}
