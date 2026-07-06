import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { z } from "zod";
import { D1FranchiseRowSchema, type D1FranchiseRow } from "../src/lib/shared-schemas";
import { buildListingHtml, buildUnclaimedItems, compareFranchises, renderDetailPage, sha256, stableJson } from "./d1-page-renderer";

const ROOT_DIR = resolve(__dirname, "..");
const DETAIL_TEMPLATE_PATH = join(ROOT_DIR, "templates", "detail-franchise-tpl.html");
const LISTING_TEMPLATE_PATH = join(ROOT_DIR, "templates", "peluang-usaha-tpl.html");
const OUTPUT_DIR = join(ROOT_DIR, "peluang-usaha");
const JSON_DIR = join(ROOT_DIR, "json");
const MANIFEST_PATH = join(JSON_DIR, "d1-generated-pages-manifest.json");
const UNCLAIMED_JSON_PATH = join(JSON_DIR, "unclaimed-brands.json");
const STATIC_DATA_PATH = join(JSON_DIR, "d1-franchise-static-data.json");
const SITE_ID = "site_franchisee_id";
const DEFAULT_ACCOUNT = "franchise-network";
const DEFAULT_CLOUDFLARE_ACCOUNT_ID = "0ba63b7f0096bc267a93fe5c80b1f571";
const DEFAULT_D1_DATABASE_ID = "812cd8ac-edd0-45d9-981f-c9a15358317b";
const GENERATOR_NAME = "d1-franchise-pages";
const GENERATED_MARKER = "<!-- d1-generated:franchisee.id";

const ManifestSchema = z.object({
  generator: z.string(),
  site_id: z.string(),
  generated_at: z.string(),
  index: z
    .object({
      path: z.string(),
      hash: z.string(),
    })
    .optional(),
  pages: z.record(
    z.string(),
    z.object({
      franchise_id: z.string(),
      slug: z.string(),
      path: z.string(),
      hash: z.string(),
      data_hash: z.string(),
      generated_at: z.string(),
    }),
  ),
});

type Manifest = z.infer<typeof ManifestSchema>;

interface BuildOptions {
  account: string;
  dryRun: boolean;
  prune: boolean;
  limit: number | null;
  fromJson: string;
}

interface BuildStats {
  fetched: number;
  detailWritten: number;
  detailSkipped: number;
  detailPruned: number;
  indexWritten: boolean;
  indexSkipped: boolean;
  unclaimedWritten: boolean;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rows = options.fromJson ? loadRowsFromJson(options.fromJson) : await fetchRowsFromD1(options);
  const franchises = options.limit ? rows.slice(0, options.limit) : rows;
  const previousManifest = loadManifest();
  const template = readFileSync(DETAIL_TEMPLATE_PATH, "utf8");
  const listingTemplate = readFileSync(LISTING_TEMPLATE_PATH, "utf8");

  const now = new Date().toISOString();
  const nextManifest: Manifest = {
    generator: GENERATOR_NAME,
    site_id: SITE_ID,
    generated_at: now,
    pages: {},
  };

  const stats: BuildStats = {
    fetched: franchises.length,
    detailWritten: 0,
    detailSkipped: 0,
    detailPruned: 0,
    indexWritten: false,
    indexSkipped: false,
    unclaimedWritten: false,
  };

  ensureDir(JSON_DIR);
  ensureDir(OUTPUT_DIR);

  const sorted = [...franchises].sort(compareFranchises);
  buildListingIndex(sorted, listingTemplate, previousManifest, nextManifest, options, stats);
  buildUnclaimedJson(sorted, options, stats);

  const currentSlugs = new Set<string>();
  for (const row of sorted) {
    currentSlugs.add(row.slug);
    const html = renderDetailPage(row, template);
    const hash = sha256(html);
    const pagePath = join(OUTPUT_DIR, `${row.slug}.html`);
    const relativePath = toRepoPath(pagePath);
    const previous = previousManifest?.pages[row.slug];

    nextManifest.pages[row.slug] = {
      franchise_id: row.id,
      slug: row.slug,
      path: relativePath,
      hash,
      data_hash: sha256(stableJson(row)),
      generated_at: now,
    };

    if (previous?.hash === hash && existsSync(pagePath)) {
      stats.detailSkipped++;
      continue;
    }

    stats.detailWritten++;
    if (!options.dryRun) {
      ensureDir(dirname(pagePath));
      writeFileSync(pagePath, html, "utf8");
    }
  }

  if (options.prune && previousManifest) {
    for (const [slug, page] of Object.entries(previousManifest.pages)) {
      const nextPage = nextManifest.pages[slug];
      if (currentSlugs.has(slug) && nextPage?.path === page.path) continue;
      const pagePath = resolve(ROOT_DIR, page.path);
      if (!existsSync(pagePath)) continue;
      const content = readFileSync(pagePath, "utf8");
      if (!content.includes(GENERATED_MARKER)) continue;

      stats.detailPruned++;
      if (!options.dryRun) {
        pruneGeneratedPage(pagePath);
      }
    }
  }

  if (!options.dryRun) {
    writeFileSync(STATIC_DATA_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
    writeFileSync(MANIFEST_PATH, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
  }

  printStats(stats, options);
}

function parseArgs(args: string[]): BuildOptions {
  const options: BuildOptions = {
    account: DEFAULT_ACCOUNT,
    dryRun: false,
    prune: true,
    limit: null,
    fromJson: "",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--no-prune") options.prune = false;
    else if (arg === "--account") options.account = args[++i] || DEFAULT_ACCOUNT;
    else if (arg === "--limit") options.limit = Number.parseInt(args[++i] || "", 10);
    else if (arg === "--from-json") options.fromJson = args[++i] || "";
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
  pnpm run build:d1:franchises:dry
  pnpm run build:d1:franchises

Options:
  --dry-run           Query/parse/render without writing files
  --no-prune          Do not delete previously D1-generated pages missing from D1
  --account <alias>   cfman account alias, defaults to franchise-network
  --limit <number>    Render only the first N D1 rows
  --from-json <path>  Build from a saved D1 row JSON array instead of querying remote D1
`);
}

async function fetchRowsFromD1(options: BuildOptions): Promise<D1FranchiseRow[]> {
  const sql = `SELECT f.id,f.brand_name,p.slug,f.category,f.subcategory,f.label,f.status,f.verification_tier,f.source_sheet,f.year_established,f.city_origin,f.brand_country,f.outlet_type,f.target_market,f.location_requirement,f.rent_cost_text,f.contract_duration_months,f.fee_license_idr,f.fee_capex_idr,f.fee_construction_idr,f.total_investment_idr,f.min_investment_idr,f.max_investment_idr,f.estimated_bep_months,f.omzet_monthly_idr,f.hpp_percent,f.net_profit_percent,f.royalty_percent,f.royalty_basis,f.royalty_period,f.short_desc,f.full_desc,f.support_system,f.phone,f.office_address,f.logo_url,f.cover_url,f.gallery_urls,f.video_url,f.proposal_url,f.outlets_location,f.raw_payload,(SELECT COALESCE(json_group_array(json_object('city',l.city,'slug',l.slug,'province',l.province,'location_type',fl.location_type,'location_text',fl.location_text,'source_field',fl.source_field,'confidence_score',fl.confidence_score)),'[]') FROM franchise_locations fl LEFT JOIN locations l ON l.id=fl.location_id WHERE fl.franchise_id=f.id AND l.city IS NOT NULL AND (fl.source_field='owner_profile' OR NOT EXISTS (SELECT 1 FROM franchise_locations manual WHERE manual.franchise_id=f.id AND manual.source_field='owner_profile'))) structured_locations,fp.company_name,fp.pic_name,fp.email_contact,fp.whatsapp,fp.website_url,fp.instagram_url,fp.facebook_url,fp.tiktok_url,fp.youtube_url,fp.linkedin_url,(SELECT name FROM franchise_packages pkg WHERE pkg.franchise_id=f.id AND pkg.is_active=1 ORDER BY pkg.display_order,pkg.created_at LIMIT 1) package_name,(SELECT price_idr FROM franchise_packages pkg WHERE pkg.franchise_id=f.id AND pkg.is_active=1 ORDER BY pkg.display_order,pkg.created_at LIMIT 1) package_price_idr,(SELECT min_capital_idr FROM franchise_packages pkg WHERE pkg.franchise_id=f.id AND pkg.is_active=1 ORDER BY pkg.display_order,pkg.created_at LIMIT 1) package_min_capital_idr,(SELECT max_capital_idr FROM franchise_packages pkg WHERE pkg.franchise_id=f.id AND pkg.is_active=1 ORDER BY pkg.display_order,pkg.created_at LIMIT 1) package_max_capital_idr,p.canonical_url,p.publication_status,p.is_primary,p.first_published_at,f.updated_at FROM franchises f JOIN franchise_site_publications p ON p.franchise_id=f.id LEFT JOIN franchisor_profiles fp ON fp.id=f.franchisor_profile_id WHERE p.site_id='${SITE_ID}' AND p.publication_status='published' AND f.status NOT IN ('archived','suspended') ORDER BY CASE f.verification_tier WHEN 'premium' THEN 4 WHEN 'verified' THEN 3 WHEN 'free' THEN 2 WHEN 'unclaimed' THEN 1 ELSE 0 END DESC,f.brand_name ASC;`;

  const token = resolveOptionalCloudflareToken(options.account);
  const query = sql.replace("SELECT name FROM franchise_packages", "SELECT package_name FROM franchise_packages");
  if (token) {
    return fetchRowsFromD1Http(query, token);
  }

  return fetchRowsFromD1Wrangler(query, options);
}

async function fetchRowsFromD1Http(sql: string, token: string): Promise<D1FranchiseRow[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || DEFAULT_D1_DATABASE_ID;
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const message = payload?.errors?.map((error: { message?: string }) => error.message).join("; ") || response.statusText;
    throw new Error(`D1 HTTP query failed: ${message}`);
  }

  const result = Array.isArray(payload.result) ? payload.result[0] : payload.result;
  const rows = z.array(D1FranchiseRowSchema).parse(result?.results || []);
  return rows;
}

function fetchRowsFromD1Wrangler(sql: string, options: BuildOptions): D1FranchiseRow[] {
  const token = resolveCloudflareToken(options.account);
  const result =
    process.platform === "win32"
      ? spawnSync(resolvePowerShell(), ["-NoProfile", "-Command", windowsWranglerCommand(sql)], {
          cwd: ROOT_DIR,
          encoding: "utf8",
          env: { ...process.env, CLOUDFLARE_API_TOKEN: token },
          maxBuffer: 20 * 1024 * 1024,
        })
      : spawnSync("pnpm", ["exec", "wrangler", "d1", "execute", "franchise_db", "--remote", "--command", sql], {
          cwd: ROOT_DIR,
          encoding: "utf8",
          env: { ...process.env, CLOUDFLARE_API_TOKEN: token },
          maxBuffer: 20 * 1024 * 1024,
        });

  if (result.status !== 0) {
    throw new Error(`D1 query failed:\n${result.stdout || ""}\n${result.stderr || ""}\n${result.error?.message || ""}`);
  }

  const parsed = extractJsonArray(result.stdout);
  const rows = parsed.flatMap((item) => {
    const envelope = z.object({ results: z.array(D1FranchiseRowSchema), success: z.boolean() }).parse(item);
    if (!envelope.success) throw new Error("D1 query returned success=false");
    return envelope.results;
  });

  return rows;
}

function resolveOptionalCloudflareToken(account: string) {
  return readCfmanToken(account) || process.env.CLOUDFLARE_API_TOKEN || "";
}

function resolveCloudflareToken(account: string) {
  const tokenFromCfman = readCfmanToken(account);
  if (tokenFromCfman) return tokenFromCfman;
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  throw new Error(`No Cloudflare token found for cfman account "${account}" and CLOUDFLARE_API_TOKEN is not set`);
}

function readCfmanToken(account: string) {
  const configPath =
    process.platform === "win32"
      ? process.env.APPDATA
        ? join(process.env.APPDATA, "cfman", "tokens.json")
        : ""
      : process.env.HOME
        ? join(process.env.HOME, ".config", "cfman", "tokens.json")
        : "";

  if (!configPath || !existsSync(configPath)) return "";

  const parsed = JSON.parse(readFileSync(configPath, "utf8"));
  const token = parsed?.[account];
  return typeof token === "string" ? token : "";
}

function resolvePowerShell() {
  const pwsh = "C:\\Program Files\\PowerShell\\7\\pwsh.exe";
  return existsSync(pwsh) ? pwsh : "powershell.exe";
}

function windowsWranglerCommand(sql: string) {
  return `pnpm exec wrangler d1 execute franchise_db --remote --command @'
${sql}
'@`;
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

function loadRowsFromJson(filePath: string): D1FranchiseRow[] {
  const resolved = resolve(ROOT_DIR, filePath);
  const parsed = JSON.parse(readFileSync(resolved, "utf8"));
  return z.array(D1FranchiseRowSchema).parse(parsed);
}

function buildListingIndex(
  rows: D1FranchiseRow[],
  template: string,
  previousManifest: Manifest | null,
  nextManifest: Manifest,
  options: BuildOptions,
  stats: BuildStats,
) {
  const html = buildListingHtml(rows, template);
  const hash = sha256(html);
  const indexPath = join(OUTPUT_DIR, "index.html");

  nextManifest.index = {
    path: toRepoPath(indexPath),
    hash,
  };

  if (previousManifest?.index?.hash === hash && existsSync(indexPath)) {
    stats.indexSkipped = true;
    return;
  }

  stats.indexWritten = true;
  if (!options.dryRun) {
    writeFileSync(indexPath, html, "utf8");
  }
}

function buildUnclaimedJson(rows: D1FranchiseRow[], options: BuildOptions, stats: BuildStats) {
  const unclaimed = buildUnclaimedItems(rows);
  const content = JSON.stringify(unclaimed);
  if (existsSync(UNCLAIMED_JSON_PATH) && readFileSync(UNCLAIMED_JSON_PATH, "utf8") === content) {
    return;
  }

  stats.unclaimedWritten = true;
  if (!options.dryRun) {
    writeFileSync(UNCLAIMED_JSON_PATH, content, "utf8");
  }
}

function loadManifest(): Manifest | null {
  if (!existsSync(MANIFEST_PATH)) return null;
  const parsed = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const manifest = ManifestSchema.parse(parsed);
  if (manifest.generator !== GENERATOR_NAME || manifest.site_id !== SITE_ID) return null;
  return manifest;
}

function ensureDir(dirPath: string) {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
}

function pruneGeneratedPage(pagePath: string) {
  rmSync(pagePath, { force: true });
  if (basename(pagePath) !== "index.html") return;

  const dirPath = dirname(pagePath);
  if (dirPath === OUTPUT_DIR || !existsSync(dirPath)) return;
  if (readdirSync(dirPath).length === 0) {
    rmdirSync(dirPath);
  }
}

function toRepoPath(filePath: string) {
  return filePath.replace(ROOT_DIR, "").replace(/^[\\/]/, "").replace(/\\/g, "/");
}

function printStats(stats: BuildStats, options: BuildOptions) {
  console.log("D1 franchise page build:");
  console.log(`- fetched=${stats.fetched}`);
  console.log(`- detail_written=${stats.detailWritten}`);
  console.log(`- detail_skipped=${stats.detailSkipped}`);
  console.log(`- detail_pruned=${stats.detailPruned}`);
  console.log(`- index_written=${stats.indexWritten ? 1 : 0}`);
  console.log(`- index_skipped=${stats.indexSkipped ? 1 : 0}`);
  console.log(`- unclaimed_json_written=${stats.unclaimedWritten ? 1 : 0}`);
  if (options.dryRun) console.log("- dry_run=1");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
