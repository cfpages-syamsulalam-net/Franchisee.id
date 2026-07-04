import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  normalizeHakiStatusValue,
  normalizeListingStatusValue,
  normalizeRoyaltyBasisValue,
  normalizeVerificationTierValue,
} from "../src/lib/shared-schemas";

export type CsvRow = Record<string, string>;
export type ImportSource = "FRANCHISOR" | "FRANCHISEE" | "UNCLAIMED";
export type SqlValue = string | number | null | SqlRaw;

export interface ImportStats {
  seen: number;
  inserted: number;
  skipped: number;
  invalid: number;
}

export interface SqlPlan {
  statements: string[];
  stats: Record<ImportSource, ImportStats>;
  warnings: string[];
}

interface SqlRaw {
  raw: string;
}

const ROOT_DIR = resolve(__dirname, "..");
const CSV_DIR = join(ROOT_DIR, "csv");
const SITE_ID = "site_franchisee_id";
export const IMPORT_BATCH_ID = `import_csv_${csvSnapshotHash()}`;

export function loadCsv(fileName: string): CsvRow[] {
  const filePath = join(CSV_DIR, fileName);
  if (!existsSync(filePath)) {
    throw new Error(`Missing CSV file: ${filePath}`);
  }

  const rows = parseCsvRows(readFileSync(filePath, "utf8"));
  if (rows.length < 2) return [];
  const headers = rows[0].map((header, index) => normalizeHeader(header, index));

  return rows
    .slice(1)
    .map((values) => {
      const item: CsvRow = {};
      headers.forEach((header, index) => {
        if (!header) return;
        item[header] = normalizeText(values[index] || "");
      });
      return item;
    })
    .filter((item) => Object.values(item).some(Boolean));
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const input = (content || "").replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => normalizeText(cell))) rows.push(row);
      row = [];
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => normalizeText(cell))) rows.push(row);
  }

  return rows;
}

function normalizeHeader(header: string, index: number) {
  const normalized = normalizeText(header);
  if (normalized) return normalized;
  return `extra_${index + 1}`;
}

export function insert(table: string, values: Record<string, SqlValue>, conflictColumns: string[] = []) {
  const columns = Object.keys(values);
  const sqlValues = columns.map((column) => sql(values[column]));
  const conflict = conflictColumns.length
    ? ` ON CONFLICT(${conflictColumns.join(", ")}) DO NOTHING`
    : "";
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${sqlValues.join(", ")})${conflict};`;
}

export function update(table: string, values: Record<string, SqlValue>, where: Record<string, SqlValue>) {
  const setClause = Object.entries(values)
    .map(([key, value]) => `${key} = ${sql(value)}`)
    .join(", ");
  const whereClause = Object.entries(where)
    .map(([key, value]) => `${key} = ${sql(value)}`)
    .join(" AND ");
  return `UPDATE ${table} SET ${setClause} WHERE ${whereClause};`;
}

export function sqlRaw(raw: string): SqlRaw {
  return { raw };
}

function sql(value: SqlValue): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object" && "raw" in value) return value.raw;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

export function maybePackage(franchiseId: string, brandName: string, minValue?: string, label = "Investment package", maxValue?: string | null) {
  const min = moneyOrNull(minValue);
  const max = moneyOrNull(maxValue || "");
  if (!min && !max) return "-- package skipped: no price";

  const id = `package_${stableId(franchiseId, label)}`;
  return insert(
    "franchise_packages",
    {
      id,
      franchise_id: franchiseId,
      package_name: label,
      package_label: brandName,
      price_idr: min,
      min_capital_idr: min,
      max_capital_idr: max,
      description: label,
      display_order: 1,
    },
    ["id"],
  );
}

export function publication(franchiseId: string, siteId: string, slug: string, isPrimary: boolean) {
  return insert(
    "franchise_site_publications",
    {
      id: `publication_${stableId(franchiseId, siteId)}`,
      franchise_id: franchiseId,
      site_id: siteId,
      slug,
      canonical_url: `https://franchisee.id/peluang-usaha/${slug}/`,
      publication_status: "published",
      is_primary: isPrimary ? 1 : 0,
      first_published_at: sqlRaw("CURRENT_TIMESTAMP"),
      last_synced_at: sqlRaw("CURRENT_TIMESTAMP"),
    },
    ["id"],
  );
}

export function legacySource(
  source: ImportSource,
  legacyRowId: string,
  normalizedKeySeed: string,
  targetTable: string,
  targetId: string,
  payload: string,
) {
  const normalizedKey = normalizeKey(legacyRowId || normalizedKeySeed);
  return insert(
    "legacy_source_rows",
    {
      id: `legacy_${stableId(source, normalizedKey)}`,
      import_batch_id: IMPORT_BATCH_ID,
      source_sheet: source,
      legacy_row_id: textOrNull(legacyRowId),
      normalized_key: normalizedKey,
      target_table: targetTable,
      target_id: targetId,
      raw_payload: payload,
    },
    ["id"],
  );
}

export function createStats(): Record<ImportSource, ImportStats> {
  return {
    FRANCHISOR: { seen: 0, inserted: 0, skipped: 0, invalid: 0 },
    FRANCHISEE: { seen: 0, inserted: 0, skipped: 0, invalid: 0 },
    UNCLAIMED: { seen: 0, inserted: 0, skipped: 0, invalid: 0 },
  };
}

export function printStats(plan: SqlPlan) {
  console.log("CSV import plan:");
  for (const source of ["FRANCHISOR", "UNCLAIMED", "FRANCHISEE"] as ImportSource[]) {
    const item = plan.stats[source];
    console.log(
      `- ${source}: seen=${item.seen}, insert_statements=${item.inserted}, skipped=${item.skipped}, invalid=${item.invalid}`,
    );
  }
  if (plan.warnings.length) {
    console.log("\nWarnings:");
    plan.warnings.slice(0, 10).forEach((warning) => console.log(`- ${warning}`));
    if (plan.warnings.length > 10) console.log(`- ... ${plan.warnings.length - 10} more`);
  }
  console.log(`\nSQL statements: ${plan.statements.length}`);
}

export function applyRemote(outputPath: string, account: string) {
  console.log(`\nApplying SQL to remote franchise_db with cfman account "${account}"...`);
  const result = spawnSync(
    "npx",
    ["cfman", "wrangler", "--account", account, "d1", "execute", "franchise_db", "--remote", "--file", outputPath],
    {
      cwd: ROOT_DIR,
      shell: process.platform === "win32",
      stdio: "inherit",
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: "",
      },
    },
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

export function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

export function stableId(...parts: string[]) {
  return createHash("sha1")
    .update(parts.map((part) => normalizeText(part)).join("|"))
    .digest("hex")
    .slice(0, 16);
}

function csvSnapshotHash() {
  const hash = createHash("sha1");
  for (const fileName of ["franchisors.csv", "unclaimed.csv", "franchisee.csv"]) {
    const filePath = join(CSV_DIR, fileName);
    hash.update(fileName);
    hash.update(existsSync(filePath) ? readFileSync(filePath) : "");
  }
  return hash.digest("hex").slice(0, 16);
}

export function uniqueSlug(brandName: string, registry: Set<string>, legacyId: string) {
  const base = slugify(brandName) || `brand-${stableId(brandName, legacyId).slice(0, 8)}`;
  let slug = base;
  if (registry.has(slug)) slug = `${base}-${stableId(legacyId).slice(0, 6)}`;
  registry.add(slug);
  return slug;
}

export function slugify(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function normalizeText(value?: string | null) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

export function normalizeKey(value: string) {
  return normalizeText(value).toLowerCase();
}

export function textOrNull(value?: string | null) {
  const normalized = normalizeText(value);
  return normalized || null;
}

export function lowerOrNull(value?: string | null) {
  const normalized = normalizeText(value).toLowerCase();
  return normalized || null;
}

export function intOrNull(value?: string | null) {
  const digits = normalizeText(value).replace(/[^0-9-]/g, "");
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function floatOrNull(value?: string | null) {
  const normalized = normalizeText(value).replace(",", ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function moneyOrNull(value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeListingStatus(value?: string | null) {
  return normalizeListingStatusValue(value);
}

export function normalizeVerificationTier(status?: string | null, isVerified?: string | null) {
  return normalizeVerificationTierValue(status, isVerified);
}

export function normalizeRoyaltyBasis(value?: string | null) {
  return normalizeRoyaltyBasisValue(value);
}

export function normalizeHakiStatus(value?: string | null) {
  return normalizeHakiStatusValue(value);
}

export function shortDescFrom(value?: string | null) {
  const normalized = normalizeText(value?.replace(/<[^>]*>?/gm, ""));
  if (!normalized) return null;
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

export function isLikelyClaimBrandRow(item: CsvRow) {
  const brandName = normalizeText(item.brand_name);
  if (!brandName) return false;
  if (brandName.length < 2) return false;
  if (!/[a-z]/i.test(brandName)) return false;
  if (isUrlLike(brandName) || isPhoneLike(brandName)) return false;
  if (isLegalEntityLike(brandName) || isContactLabelLike(brandName) || isAddressLike(brandName)) return false;

  const hasEvidence =
    normalizeText(item.source_ignore) ||
    normalizeText(item.full_desc) ||
    normalizeText(item.company_name) ||
    normalizeText(item.phone) ||
    normalizeText(item.label);

  return Boolean(hasEvidence);
}

function isUrlLike(text: string) {
  return /^(https?:\/\/|www\.)/i.test(text);
}

function isPhoneLike(text: string) {
  const raw = normalizeText(text);
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 16 && digits.length / Math.max(raw.length, 1) > 0.6;
}

function isLegalEntityLike(text: string) {
  return /^(pt|cv|ud|pd|yayasan|koperasi|perum|tbk)\b\.?/i.test(normalizeText(text));
}

function isContactLabelLike(text: string) {
  const raw = normalizeText(text).toLowerCase();
  if (!raw) return false;
  return /\b(call|telp|telepon|whatsapp|wa|marketing|owner|admin|contact|cp|ibu|bpk)\b/.test(raw);
}

function isAddressLike(text: string) {
  const raw = normalizeText(text).toLowerCase();
  if (!raw) return false;
  const hasAddressToken = /\b(jl|jalan|rt|rw|kel|kec|kab|kota|blok|no|nomor|ruko|komplek|km|desa|kav|kavling)\b/.test(raw);
  if (!hasAddressToken) return false;
  const hasDigits = /\d/.test(raw);
  const words = raw.split(/\s+/).filter(Boolean).length;
  return hasDigits || words >= 4;
}
