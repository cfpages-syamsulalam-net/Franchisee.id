import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { z } from "zod";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { extractProposalCandidatesFromText, sanitizeProposalSourceText } from "../functions/_proposal-knowledge.js";

const ROOT_DIR = resolve(__dirname, "..");
const DEFAULT_OUTPUT = join(ROOT_DIR, ".context", "ocr-structured-enrichment.sql");
const FETCH_QUERY_PATH = join(ROOT_DIR, ".context", "ocr-structured-enrichment-fetch.sql");
const DEFAULT_ACCOUNT = "franchise-network";

const KnowledgeRowSchema = z
  .object({
    id: z.string(),
    asset_id: z.string(),
    franchise_id: z.string(),
    source_text: z.string().nullable().optional(),
    structured_data: z.string().nullable().optional(),
    brand_name: z.string().nullable().optional(),
    slug: z.string().nullable().optional(),
  })
  .passthrough();

type KnowledgeRow = z.infer<typeof KnowledgeRowSchema>;

interface Options {
  account: string;
  out: string;
  applyRemote: boolean;
  dryRun: boolean;
  limit: number | null;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rows = fetchRows(options);
  const statements = buildSql(rows);
  const changedRows = statements.filter((statement) => statement.startsWith("UPDATE franchise_asset_knowledge")).length;

  ensureParent(options.out);
  writeFileSync(options.out, `${statements.join("\n")}\n`, "utf8");

  console.log("OCR structured enrichment:");
  console.log(`- rows=${rows.length}`);
  console.log(`- changed=${changedRows}`);
  console.log(`- output=${options.out}`);

  if (options.applyRemote && changedRows > 0) applyRemote(options.out, options.account, options.dryRun);
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    account: DEFAULT_ACCOUNT,
    out: DEFAULT_OUTPUT,
    applyRemote: false,
    dryRun: false,
    limit: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--account") options.account = args[++i] || options.account;
    else if (arg === "--out") options.out = resolve(ROOT_DIR, args[++i] || DEFAULT_OUTPUT);
    else if (arg === "--apply-remote") options.applyRemote = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--limit") options.limit = Number.parseInt(args[++i] || "", 10);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error("--limit must be a positive integer");
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  pnpm run ocr:enrich:structured
  pnpm run ocr:enrich:structured -- --apply-remote

Options:
  --account <alias>   cfman account alias, defaults to franchise-network
  --out <path>        SQL output path, defaults to .context/ocr-structured-enrichment.sql
  --limit <number>    Process only the first N OCR knowledge rows
  --dry-run           Build SQL and print the remote command without applying it
  --apply-remote      Apply generated SQL to remote franchise_db through cfman/wrangler
`);
}

function fetchRows(options: Options): KnowledgeRow[] {
  const limitClause = options.limit ? ` LIMIT ${options.limit}` : "";
  const sql = `
SELECT
  k.id,
  k.asset_id,
  k.franchise_id,
  k.source_text,
  k.source_text_preview,
  k.source_text_length,
  k.structured_data,
  f.brand_name,
  f.slug,
  f.year_established,
  f.city_origin,
  f.brand_country,
  f.outlet_type,
  f.target_market,
  f.location_requirement,
  f.min_area_sqm,
  f.min_staff_count,
  f.setup_duration_days,
  f.rent_cost_text,
  f.contract_duration_months,
  f.fee_license_idr,
  f.fee_capex_idr,
  f.fee_construction_idr,
  f.working_capital_idr,
  f.additional_cost_notes,
  f.total_investment_idr,
  f.min_investment_idr,
  f.max_investment_idr,
  f.estimated_bep_months,
  f.estimated_bep_min_months,
  f.estimated_bep_max_months,
  f.omzet_monthly_idr,
  f.omzet_monthly_min_idr,
  f.omzet_monthly_max_idr,
  f.hpp_percent,
  f.net_profit_percent,
  f.net_profit_monthly_min_idr,
  f.net_profit_monthly_max_idr,
  f.royalty_percent,
  f.royalty_basis,
  f.royalty_period,
  f.support_system,
  f.office_address,
  f.outlets_location
FROM franchise_asset_knowledge k
JOIN franchises f ON f.id = k.franchise_id
WHERE k.extraction_status = 'extracted'
  AND COALESCE(k.source_text, '') <> ''
ORDER BY k.updated_at DESC${limitClause};`;

  ensureParent(FETCH_QUERY_PATH);
  writeFileSync(FETCH_QUERY_PATH, `${sql}\n`, "utf8");
  const result = runCfmanD1Query(options.account, compactSql(sql));
  process.stderr.write(result.stderr || "");
  if (result.status !== 0) {
    throw new Error(`Remote D1 fetch failed:\n${result.stdout || ""}\n${result.stderr || ""}\n${result.error?.message || ""}`);
  }
  const parsed = extractJsonArray(result.stdout || "");
  return parsed.flatMap((item) => {
    const envelope = z.object({ results: z.array(z.record(z.string(), z.unknown())).optional().default([]), success: z.boolean() }).parse(item);
    if (!envelope.success) throw new Error("D1 query returned success=false");
    return envelope.results.flatMap((row) => {
      const parsedRow = KnowledgeRowSchema.safeParse(row);
      return parsedRow.success ? [parsedRow.data] : [];
    });
  });
}

function buildSql(rows: KnowledgeRow[]) {
  const statements = [
    "-- Generated by scripts/enrich-ocr-structured-data.ts",
    "PRAGMA foreign_keys = ON;",
  ];
  let changed = 0;
  const changedFranchises = new Set<string>();

  for (const row of rows) {
    const sourceText = sanitizeProposalSourceText(row.source_text || "");
    const extracted = extractProposalCandidatesFromText(sourceText);
    const candidates = onlyMissingCandidates(extracted, row);
    const nextStructured = stableJson(candidates);
    const previousStructured = stableJson(parseJson(row.structured_data || "{}"));
    const sourceChanged = sourceText !== (row.source_text || "");
    const structuredChanged = nextStructured !== previousStructured;

    if (!sourceChanged && !structuredChanged) continue;
    changed++;
    changedFranchises.add(row.franchise_id);
    statements.push(
      `UPDATE franchise_asset_knowledge SET source_text = ${sql(sourceText)}, source_text_preview = ${sql(sourceText.slice(0, 1200))}, source_text_length = ${sourceText.length}, structured_data = ${sql(nextStructured)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${sql(row.id)};`,
    );
  }

  if (changed > 0) {
    statements.push(
      `INSERT INTO operation_events (id, event_type, severity, message, metadata) VALUES (${sql(`operation_${stableId(Date.now().toString(), String(changed))}`)}, 'ocr.structured_enrichment', 'info', 'OCR structured enrichment replayed.', ${sql(stableJson({ rows_changed: changed, franchises_changed: changedFranchises.size }))});`,
    );
  }

  return statements;
}

function onlyMissingCandidates(candidates: Record<string, unknown>, listing: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(candidates || {}).filter(([field]) => !hasValue(listing?.[field])));
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function parseJson(value: string) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function stableJson(value: unknown) {
  return JSON.stringify(sortObject(value));
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortObject(item)]));
}

function sql(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function stableId(...parts: string[]) {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 20);
}

function extractJsonArray(output: string): unknown[] {
  for (let i = 0; i < output.length; i++) {
    if (output[i] !== "[") continue;
    for (let j = output.length - 1; j > i; j--) {
      if (output[j] !== "]") continue;
      const candidate = output.slice(i, j + 1);
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Keep scanning until the JSON envelope is found.
      }
    }
  }
  throw new Error("Could not parse Wrangler JSON results from cfman output");
}

function applyRemote(filePath: string, account: string, dryRun: boolean) {
  const args = ["cfman", "wrangler", "--account", account, "d1", "execute", "franchise_db", "--remote", "--file", filePath];
  if (dryRun) {
    console.log(`Dry run: npx ${args.join(" ")}`);
    return;
  }
  const result = runCfmanD1File(account, filePath);
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.status !== 0) {
    throw new Error(`Remote D1 apply failed with status ${result.status}`);
  }
}

function ensureParent(filePath: string) {
  const dirPath = dirname(filePath);
  if (!existsSync(dirPath)) {
    throw new Error(`Missing output directory: ${dirPath}`);
  }
}

function runCfmanD1File(account: string, filePath: string) {
  if (process.platform === "win32") {
    return spawnSync(resolvePowerShell(), ["-NoProfile", "-Command", `npx cfman wrangler --account ${psArg(account)} d1 execute franchise_db --remote --file ${psArg(filePath)}`], {
      cwd: ROOT_DIR,
      encoding: "utf8",
      maxBuffer: 80 * 1024 * 1024,
    });
  }
  return spawnSync("npx", ["cfman", "wrangler", "--account", account, "d1", "execute", "franchise_db", "--remote", "--file", filePath], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
  });
}

function runCfmanD1Query(account: string, sqlText: string) {
  if (process.platform === "win32") {
    return spawnSync(resolvePowerShell(), ["-NoProfile", "-Command", `npx cfman wrangler --account ${psArg(account)} d1 execute franchise_db --remote --command ${psArg(sqlText)}`], {
      cwd: ROOT_DIR,
      encoding: "utf8",
      maxBuffer: 80 * 1024 * 1024,
    });
  }
  return spawnSync("npx", ["cfman", "wrangler", "--account", account, "d1", "execute", "franchise_db", "--remote", "--command", sqlText], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
  });
}

function compactSql(sqlText: string) {
  return sqlText.replace(/\s+/g, " ").trim();
}

function resolvePowerShell() {
  const pwsh = "C:\\Program Files\\PowerShell\\7\\pwsh.exe";
  return existsSync(pwsh) ? pwsh : "powershell.exe";
}

function psArg(value: string) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
