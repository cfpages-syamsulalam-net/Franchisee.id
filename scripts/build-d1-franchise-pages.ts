import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { z } from "zod";

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

const nullableString = z.string().nullish().transform((value) => value ?? null);
const nullableNumber = z.number().nullish().transform((value) => value ?? null);

const D1FranchiseRowSchema = z.object({
  id: z.string().min(1),
  brand_name: z.string().min(1),
  slug: z.string().min(1),
  category: nullableString,
  subcategory: nullableString,
  label: nullableString,
  status: nullableString,
  verification_tier: nullableString,
  source_sheet: nullableString,
  year_established: nullableNumber,
  city_origin: nullableString,
  outlet_type: nullableString,
  location_requirement: nullableString,
  rent_cost_text: nullableString,
  contract_duration_months: nullableNumber,
  fee_license_idr: nullableNumber,
  fee_capex_idr: nullableNumber,
  fee_construction_idr: nullableNumber,
  total_investment_idr: nullableNumber,
  min_investment_idr: nullableNumber,
  max_investment_idr: nullableNumber,
  estimated_bep_months: nullableNumber,
  omzet_monthly_idr: nullableNumber,
  hpp_percent: nullableNumber,
  net_profit_percent: nullableNumber,
  royalty_percent: nullableNumber,
  royalty_basis: nullableString,
  royalty_period: nullableString,
  short_desc: nullableString,
  full_desc: nullableString,
  support_system: nullableString,
  phone: nullableString,
  office_address: nullableString,
  outlets_location: nullableString,
  logo_url: nullableString,
  cover_url: nullableString,
  gallery_urls: nullableString,
  video_url: nullableString,
  proposal_url: nullableString,
  raw_payload: nullableString,
  company_name: nullableString,
  pic_name: nullableString,
  email_contact: nullableString,
  whatsapp: nullableString,
  website_url: nullableString,
  instagram_url: nullableString,
  facebook_url: nullableString,
  tiktok_url: nullableString,
  youtube_url: nullableString,
  linkedin_url: nullableString,
  package_name: nullableString,
  package_price_idr: nullableNumber,
  package_min_capital_idr: nullableNumber,
  package_max_capital_idr: nullableNumber,
  canonical_url: nullableString,
  publication_status: nullableString,
  is_primary: nullableNumber,
});

type D1FranchiseRow = z.infer<typeof D1FranchiseRowSchema>;

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
  const sql = `SELECT f.id,f.brand_name,p.slug,f.category,f.status,f.verification_tier,f.source_sheet,f.year_established,f.fee_license_idr,f.total_investment_idr,f.min_investment_idr,f.max_investment_idr,f.estimated_bep_months,f.royalty_percent,f.short_desc,f.full_desc,f.support_system,f.logo_url,f.cover_url,f.outlets_location,fp.company_name,fp.pic_name,fp.email_contact,fp.whatsapp,fp.website_url,fp.instagram_url,fp.facebook_url,fp.tiktok_url,fp.youtube_url,fp.linkedin_url,(SELECT price_idr FROM franchise_packages pkg WHERE pkg.franchise_id=f.id AND pkg.is_active=1 ORDER BY pkg.display_order,pkg.created_at LIMIT 1) package_price_idr,(SELECT min_capital_idr FROM franchise_packages pkg WHERE pkg.franchise_id=f.id AND pkg.is_active=1 ORDER BY pkg.display_order,pkg.created_at LIMIT 1) package_min_capital_idr,(SELECT max_capital_idr FROM franchise_packages pkg WHERE pkg.franchise_id=f.id AND pkg.is_active=1 ORDER BY pkg.display_order,pkg.created_at LIMIT 1) package_max_capital_idr,p.canonical_url,p.publication_status,p.is_primary FROM franchises f JOIN franchise_site_publications p ON p.franchise_id=f.id LEFT JOIN franchisor_profiles fp ON fp.id=f.franchisor_profile_id WHERE p.site_id='${SITE_ID}' AND p.publication_status='published' AND f.status NOT IN ('archived','suspended') ORDER BY CASE f.verification_tier WHEN 'premium' THEN 4 WHEN 'verified' THEN 3 WHEN 'free' THEN 2 WHEN 'unclaimed' THEN 1 ELSE 0 END DESC,f.brand_name ASC;`;

  const token = resolveOptionalCloudflareToken(options.account);
  if (token) {
    return fetchRowsFromD1Http(sql, token);
  }

  return fetchRowsFromD1Wrangler(sql, options);
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
  const cards = rows.map((row, index) => generateCard(row, index + 1)).join("");
  const html = normalizeGeneratedHtml(template.replace("<!-- DYNAMIC_FRANCHISE_LISTING -->", cards));
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
  const seen = new Set<string>();
  const unclaimed = rows
    .filter((row) => normalizeText(row.verification_tier || row.status).toLowerCase() === "unclaimed")
    .map((row) => ({
      id: row.id,
      brand_name: normalizeText(row.brand_name),
      category: normalizeText(row.category),
      min_capital: row.min_investment_idr || row.package_min_capital_idr || null,
      slug: row.slug,
    }))
    .filter((item) => {
      const key = item.brand_name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const content = JSON.stringify(unclaimed);
  if (existsSync(UNCLAIMED_JSON_PATH) && readFileSync(UNCLAIMED_JSON_PATH, "utf8") === content) {
    return;
  }

  stats.unclaimedWritten = true;
  if (!options.dryRun) {
    writeFileSync(UNCLAIMED_JSON_PATH, content, "utf8");
  }
}

function renderDetailPage(row: D1FranchiseRow, template: string): string {
  const tier = normalizeText(row.verification_tier || row.status).toLowerCase();
  const isUnclaimed = tier === "unclaimed";
  const brandName = normalizeText(row.brand_name);
  const category = normalizeText(row.category) || "Bisnis Umum";
  const description = normalizeText(row.full_desc || row.short_desc) || `Peluang usaha franchise ${brandName}.`;
  const logoUrl = normalizeUrl(row.logo_url) || "/wp-content/uploads/woocommerce-placeholder.png";
  const heroImage = normalizeUrl(row.cover_url || row.logo_url) || logoUrl;
  const minimumModal = formatRupiah(
    row.total_investment_idr || row.min_investment_idr || row.package_price_idr || row.package_min_capital_idr,
  );
  const seoTitle = `Franchise ${brandName} - Info Modal & Peluang Usaha 2026`;
  const seoDescription = `Cek modal dan biaya franchise ${brandName}. Dapatkan profil lengkap, syarat jadi mitra, dan kontak resmi franchisor ${brandName} di Franchisee.id.`;

  const replacements: Record<string, string> = {
    "{BRAND_NAME}": escapeHtml(brandName),
    "{SLUG}": escapeAttr(row.slug),
    "{CATEGORY}": escapeHtml(category),
    "{CATEGORY-SLUG}": escapeAttr(slugify(category)),
    "{COMPANY_NAME}": escapeHtml(normalizeText(row.company_name) || "Hubungi Admin"),
    "{MINIMUM_MODAL}": escapeHtml(minimumModal),
    "{FRANCHISE_FEE}": escapeHtml(formatRupiah(row.fee_license_idr)),
    "{ROYALTY_FEE}": escapeHtml(row.royalty_percent ? `${row.royalty_percent}%` : "Tanya Admin"),
    "{YEAR_ESTABLISHED}": escapeHtml(row.year_established ? String(row.year_established) : "-"),
    "{OUTLETS_NUMBER}": escapeHtml(normalizeText(row.outlets_location) || "-"),
    "{BEP_PERIOD}": escapeHtml(row.estimated_bep_months ? `${row.estimated_bep_months} bulan` : "Tanya Admin"),
    "{ADVERTISING_FEE}": "Tanya Admin",
    "{LONG_DESCRIPTION}": escapeHtml(description),
    "{LOGO_URL}": escapeAttr(logoUrl),
    "{HERO_IMAGE}": escapeAttr(heroImage),
    "{OG_IMAGE}": escapeAttr(logoUrl),
    "{SEO_TITLE}": escapeHtml(seoTitle),
    "{SEO_DESCRIPTION}": escapeHtml(seoDescription),
    "{VERIFIED_ICON}": tier === "verified" || tier === "premium" ? '<i class="fas fa-check-circle franchise-verified-badge" title="Verified Brand"></i>' : "",
    "{JSON_LD}": generateJsonLd(row, description, logoUrl),
    "{BREADCRUMBS}": generateBreadcrumbs(row),
    "{CLAIM_STICKY_BAR}": isUnclaimed ? generateStickyBar(row) : "",
    "{DYNAMIC_TABS_CONTENT}": generateTabs(row, description, isUnclaimed),
  };

  let html = template.replace("<!-- DYNAMIC_DISCLAIMER_BOX -->", isUnclaimed ? generateDisclaimer(row) : "");

  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(key).join(value);
  }

  return normalizeGeneratedHtml(`${GENERATED_MARKER}:v1 slug=${escapeAttr(row.slug)} franchise_id=${escapeAttr(row.id)} -->\n${html}`);
}

function generateCard(row: D1FranchiseRow, index: number) {
  const tier = normalizeText(row.verification_tier || row.status).toUpperCase() || "UNCLAIMED";
  const brandName = normalizeText(row.brand_name);
  const category = normalizeText(row.category) || "Bisnis Umum";
  const link = `/peluang-usaha/${row.slug}`;
  const imageUrl = getThumb(row.cover_url || row.logo_url);
  const modal = formatRupiah(row.total_investment_idr || row.min_investment_idr || row.package_price_idr || row.package_min_capital_idr);
  const desc = truncate(normalizeText(row.short_desc || row.full_desc) || `Peluang usaha franchise ${brandName}.`, 90);
  const badge =
    tier === "VERIFIED" || tier === "PREMIUM"
      ? `<i class="fas fa-check-circle" style="color:#2980b9; margin-left:4px;" title="Verified"></i>`
      : tier === "UNCLAIMED"
        ? `<span style="font-size: 10px; background: #eee; color: #777; padding: 1px 5px; border-radius: 3px; margin-left: 5px; font-weight: normal; vertical-align: middle;">Belum Diklaim</span>`
        : "";

  return `
    <div id="uc_post_grid_elementor_d0f4a5f_item${index}" class="uc_post_grid_style_one_item ue_post_grid_item ue-item ${escapeAttr(tier.toLowerCase())}-tier">
        <a class="uc_post_grid_style_one_image" href="${escapeAttr(link)}">
            <div class="uc_post_image">
                <img loading="lazy" src="${escapeAttr(imageUrl)}" alt="${escapeAttr(brandName)}" width="300" height="150">
                <div class="uc_post_image_overlay"></div>
            </div>
        </a>
        <div class="uc_content">
            <div class="uc_content_inner">
                <div class="uc_content-info-wrapper">
                    <div class="uc_post_title">
                        <a href="${escapeAttr(link)}" class="ue_p_title" style="display:flex; align-items:center;">
                            ${escapeHtml(brandName)} ${badge}
                        </a>
                    </div>
                    <div class="ue-meta-data">
                        <span class="ue-grid-item-category">
                            <a href="/kategori/${escapeAttr(slugify(category))}">${escapeHtml(category)}</a>
                        </span>
                        <span style="font-size:11px; color:#666; display:block; width:100%; margin-top:5px;">
                            Modal: <b>${escapeHtml(modal)}</b>
                        </span>
                    </div>
                    <div class="uc_post_text">${escapeHtml(desc)}</div>
                </div>
                <div class="uc_post_button">
                    <a class="uc_more_btn" href="${escapeAttr(link)}">
                        <div class="uc_btn_inner"><div class="uc_btn_txt">${tier === "UNCLAIMED" ? "Klaim Brand" : "Info Franchise"}</div></div>
                    </a>
                </div>
            </div>
        </div>
    </div>`;
}

function generateJsonLd(row: D1FranchiseRow, description: string, logoUrl: string) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: row.brand_name,
    description,
    url: `https://franchisee.id/peluang-usaha/${row.slug}`,
    logo: logoUrl,
    category: row.category || "Franchise",
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function generateBreadcrumbs(row: D1FranchiseRow) {
  const category = normalizeText(row.category) || "Bisnis";
  return `
    <nav class="ast-breadcrumbs" aria-label="Breadcrumbs">
        <div class="ast-breadcrumbs-wrapper">
            <span class="trail-browse">Anda di sini:</span>
            <ul class="trail-items">
                <li class="trail-item"><a href="/">Home</a></li>
                <li class="trail-item"><a href="/peluang-usaha">Peluang Usaha</a></li>
                <li class="trail-item"><a href="/category/${escapeAttr(slugify(category))}">${escapeHtml(category)}</a></li>
                <li class="trail-item"><span>${escapeHtml(row.brand_name)}</span></li>
            </ul>
        </div>
    </nav>`;
}

function generateStickyBar(row: D1FranchiseRow) {
  return `
    <div id="claim-sticky-bar" style="position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 2px solid #ffc107; padding: 15px; z-index: 9999; box-shadow: 0 -5px 15px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="flex: 1; min-width: 250px;">
            <strong style="display: block; color: #333;">Apakah ini Bisnis Anda?</strong>
            <span style="font-size: 13px; color: #666;">Klaim brand <strong>${escapeHtml(row.brand_name)}</strong> secara GRATIS untuk mengelola halaman ini.</span>
        </div>
        <a href="/daftar?claim=${escapeAttr(row.slug)}" style="background: #ffc107; color: #000; padding: 10px 25px; border-radius: 50px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 10px rgba(255,193,7,0.3); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">KLAIM SEKARANG</a>
    </div>
    <style>
        body { padding-bottom: 80px !important; }
        @media (max-width: 600px) {
            #claim-sticky-bar { text-align: center; justify-content: center; }
            #claim-sticky-bar div { text-align: center; }
        }
    </style>`;
}

function generateDisclaimer(row: D1FranchiseRow) {
  return `
                <div class="disclaimer-box">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Halaman Belum Diklaim:</strong> Informasi ini dikumpulkan dari sumber publik. Jika Anda pemilik brand ini, silakan <a href="/daftar?claim=${escapeAttr(row.slug)}">klaim halaman ini</a> untuk memperbarui data.
                </div>`;
}

function generateTabs(row: D1FranchiseRow, description: string, isUnclaimed: boolean) {
  const contact = isUnclaimed
    ? "<p>Kontak belum tersedia. Silakan gunakan tombol Klaim untuk memverifikasi kepemilikan.</p>"
    : generateContactBlock(row);
  const support = normalizeText(row.support_system);

  return `
            <div class="e-n-tabs" data-widget-number="26009074">
                <div class="e-n-tabs-heading" role="tablist">
                    <button class="e-n-tab-title" aria-selected="true" data-tab-index="1" role="tab">Profil</button>
                    <button class="e-n-tab-title" aria-selected="false" data-tab-index="2" role="tab">Kontak</button>
                    ${support ? '<button class="e-n-tab-title" aria-selected="false" data-tab-index="3" role="tab">Support</button>' : ""}
                </div>
                <div class="e-n-tabs-content">
                    <div class="e-n-tab-content e-active" data-tab-index="1">
                        <div class="elementor-widget-container">${paragraphs(description)}</div>
                    </div>
                    <div class="e-n-tab-content" data-tab-index="2">
                        <div class="elementor-widget-container">${contact}</div>
                    </div>
                    ${
                      support
                        ? `<div class="e-n-tab-content" data-tab-index="3"><div class="elementor-widget-container">${paragraphs(support)}</div></div>`
                        : ""
                    }
                </div>
            </div>`;
}

function generateContactBlock(row: D1FranchiseRow) {
  const links = [
    ["Website", row.website_url],
    ["Instagram", row.instagram_url],
    ["Facebook", row.facebook_url],
    ["TikTok", row.tiktok_url],
    ["YouTube", row.youtube_url],
    ["LinkedIn", row.linkedin_url],
  ]
    .map(([label, url]) => ({ label, url: normalizeExternalUrl(url) }))
    .filter((item) => item.url);

  const lead = normalizeText(row.email_contact || row.whatsapp)
    ? "Gunakan kontak resmi brand untuk informasi kemitraan lebih lanjut."
    : "Silakan hubungi tim acquisition untuk informasi lebih lanjut.";

  const contactRows = [
    row.pic_name ? `<li>PIC: ${escapeHtml(row.pic_name)}</li>` : "",
    row.email_contact ? `<li>Email: ${escapeHtml(row.email_contact)}</li>` : "",
    row.whatsapp ? `<li>WhatsApp: ${escapeHtml(row.whatsapp)}</li>` : "",
  ].filter(Boolean);

  const contactList = contactRows.length ? `<ul>${contactRows.join("")}</ul>` : "";
  const linkList = links.length
    ? `<ul>${links.map((item) => `<li><a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a></li>`).join("")}</ul>`
    : "";

  return `<p>${escapeHtml(lead)}</p>${contactList}${linkList}`;
}

function loadManifest(): Manifest | null {
  if (!existsSync(MANIFEST_PATH)) return null;
  const parsed = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const manifest = ManifestSchema.parse(parsed);
  if (manifest.generator !== GENERATOR_NAME || manifest.site_id !== SITE_ID) return null;
  return manifest;
}

function compareFranchises(a: D1FranchiseRow, b: D1FranchiseRow) {
  const weight = (row: D1FranchiseRow) => {
    const tier = normalizeText(row.verification_tier || row.status).toLowerCase();
    if (tier === "premium") return 4;
    if (tier === "verified") return 3;
    if (tier === "free") return 2;
    if (tier === "unclaimed") return 1;
    return 0;
  };

  const diff = weight(b) - weight(a);
  if (diff) return diff;
  return a.brand_name.localeCompare(b.brand_name, "id-ID");
}

function formatRupiah(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return "Tanya Admin";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Miliar`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} Juta`;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

function getThumb(url: string | null | undefined) {
  const normalized = normalizeUrl(url);
  if (!normalized) return "/wp-content/uploads/woocommerce-placeholder.png";
  if (!normalized.includes("cloudinary.com")) return normalized;
  return normalized.replace("/upload/", "/upload/w_400,h_200,c_fill,q_auto,f_auto/");
}

function paragraphs(text: string) {
  return normalizeText(text)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function truncate(text: string, maxLength: number) {
  const normalized = normalizeText(text);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function slugify(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function normalizeText(value: unknown) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}

function normalizeUrl(value: unknown) {
  const text = normalizeText(value);
  if (!text) return "";
  return text;
}

function normalizeExternalUrl(value: unknown) {
  const text = normalizeText(value);
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  if (/^\/\//.test(text)) return `https:${text}`;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(text)) return `https://${text}`;
  return "";
}

function escapeHtml(value: unknown) {
  return normalizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: unknown) {
  return escapeHtml(value);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown) {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

function normalizeGeneratedHtml(html: string) {
  return html
    .replace(/^[\t ]+/gm, (indent) => {
      let normalized = indent;
      while (normalized.includes(" \t")) normalized = normalized.replace(/ \t/g, "\t");
      return normalized;
    })
    .replace(/[ \t]+$/gm, "");
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
