import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { generateCssPlaceholder, injectDetailAssets, injectDirectoryAssets } from "./franchise-static-assets";

const ROOT_DIR = resolve(process.cwd());
const DETAIL_TEMPLATE_PATH = join(ROOT_DIR, "templates", "detail-franchise-tpl.html");
const LISTING_TEMPLATE_PATH = join(ROOT_DIR, "templates", "peluang-usaha-tpl.html");
const STATIC_DATA_PATH = join(ROOT_DIR, "json", "d1-franchise-static-data.json");
const GENERATED_MARKER = "<!-- astro-generated:d1-franchisee.id";
const SITE_FALLBACK_IMAGE = "/wp-content/uploads/2025/09/franchise.id-favicon-logo.png";
const TITLE_LOWER_WORDS = new Set(["dan", "di", "ke", "dari", "untuk", "yang", "atau", "dengan", "pada", "dalam"]);
const KNOWN_UPPERCASE_TERMS = new Map(
  [
    "pt",
    "cv",
    "ud",
    "tbk",
    "persero",
    "umkm",
    "bpom",
    "nib",
    "siup",
    "npwp",
    "iso",
    "sop",
    "haccp",
    "b2b",
    "b2c",
    "f&b",
    "fnb",
    "kfc",
    "spbu",
    "atm",
    "pos",
    "wa",
  ].map((term) => [term, term.toUpperCase()]),
);

const nullableString = z.string().nullish().transform((value) => value ?? null);
const nullableNumber = z.number().nullish().transform((value) => value ?? null);

export const FranchiseStaticRowSchema = z.object({
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
  first_published_at: nullableString,
  updated_at: nullableString,
});

export type FranchiseStaticRow = z.infer<typeof FranchiseStaticRowSchema>;

export interface DirectoryPageOptions {
  title: string;
  description: string;
  canonicalPath: string;
  rows?: FranchiseStaticRow[];
}

export interface CategoryRouteEntry {
  slug: string;
  label: string;
  rows: FranchiseStaticRow[];
  canonicalPath: string;
}

export function loadFranchiseStaticRows() {
  const parsed = JSON.parse(readFileSync(STATIC_DATA_PATH, "utf8"));
  return z.array(FranchiseStaticRowSchema).parse(parsed);
}

export function renderListingPage(rows: FranchiseStaticRow[], options?: DirectoryPageOptions) {
  const template = readFileSync(LISTING_TEMPLATE_PATH, "utf8");
  const sortedRows = options?.rows || [...rows].sort(compareFranchises);
  const cards = sortedRows.map((row, index) => generateCard(row, index + 1)).join("");
  const html = template
    .replace("<!-- DYNAMIC_FRANCHISE_LISTING -->", cards)
    .replace(
      '<div class="uc_post_grid_style_one " id="uc_post_grid_elementor_d0f4a5f">',
      `${generateDirectoryControls(rows)}<div class="uc_post_grid_style_one " id="uc_post_grid_elementor_d0f4a5f">`,
    );
  return normalizeGeneratedHtml(injectDirectoryAssets(applyCanonicalLegacyLinks(applyDirectoryMeta(html, options))));
}

export function renderCategoryIndexPage(rows: FranchiseStaticRow[]) {
  const template = readFileSync(LISTING_TEMPLATE_PATH, "utf8");
  const summaries = getCategorySummaries(rows);
  const cards = summaries.map((summary, index) => generateCategoryCard(summary, index + 1)).join("");
  const html = template.replace("<!-- DYNAMIC_FRANCHISE_LISTING -->", cards);
  return normalizeGeneratedHtml(
    injectDirectoryAssets(
      applyCanonicalLegacyLinks(applyDirectoryMeta(html, {
        title: "Kategori Franchise",
        description: "Jelajahi peluang franchise berdasarkan kategori bisnis, mulai dari makanan minuman, pendidikan, jasa, retail, otomotif, hingga kesehatan.",
        canonicalPath: "/peluang-usaha?view=kategori",
      })),
    ),
  );
}

export function getRecommendedRows(rows: FranchiseStaticRow[]) {
  return [...rows].sort((a, b) => scoreRecommendation(b) - scoreRecommendation(a) || compareFranchises(a, b));
}

export function getPopularRows(rows: FranchiseStaticRow[]) {
  return [...rows].sort((a, b) => scorePopularity(b) - scorePopularity(a) || compareFranchises(a, b));
}

export function getAlphabeticalRows(rows: FranchiseStaticRow[]) {
  return [...rows].sort((a, b) => normalizeText(a.brand_name).localeCompare(normalizeText(b.brand_name), "id-ID"));
}

export function getCategoryRouteEntries(rows: FranchiseStaticRow[]) {
  const summaries = getCategorySummaries(rows);
  const entries = new Map<string, CategoryRouteEntry>();

  for (const summary of summaries) {
    entries.set(summary.slug, {
      slug: summary.slug,
      label: summary.label,
      rows: summary.rows,
      canonicalPath: canonicalCategoryHref(summary.slug),
    });
  }

  addCategoryAlias(entries, "makanan-minuman-fb", "Makanan & Minuman", rows, (row) => categorySlug(row) === "makanan-minuman");
  addCategoryAlias(entries, "perhotelan-travel", "Penginapan & Agen Travel", rows, (row) => categorySlug(row) === "penginapan-agen-travel");
  addCategoryAlias(entries, "properti-furniture", "Properti & Furniture", rows, (row) => categorySlug(row) === "furnitur-konstruksi-properti");
  addCategoryAlias(entries, "teknologi-digital", "Teknologi Digital", rows, (row) => categorySlug(row) === "komputer-teknologi");
  addCategoryAlias(entries, "jasa-layanan", "Jasa & Layanan", rows, (row) => categorySlug(row).includes("jasa") || categorySlug(row).includes("laundry"));

  return [...entries.values()].filter((entry) => entry.rows.length > 0).sort((a, b) => a.label.localeCompare(b.label, "id-ID"));
}

export function renderDetailPage(row: FranchiseStaticRow) {
  const template = readFileSync(DETAIL_TEMPLATE_PATH, "utf8");
  const tier = normalizeText(row.verification_tier || row.status).toLowerCase();
  const isUnclaimed = tier === "unclaimed";
  const brandName = normalizeBrandName(row.brand_name);
  const category = normalizeText(row.category) || "Bisnis Umum";
  const description = normalizeDescriptionText(row.full_desc || row.short_desc, brandName) || `Peluang usaha franchise ${brandName}.`;
  const logoUrl = normalizeUrl(row.logo_url);
  const heroImage = normalizeUrl(row.cover_url || row.logo_url);
  const ogImage = logoUrl || heroImage || SITE_FALLBACK_IMAGE;
  const minimumModal = formatRupiah(
    row.total_investment_idr || row.min_investment_idr || row.package_price_idr || row.package_min_capital_idr,
  );
  const seoTitle = `Franchise ${brandName}: Modal ${minimumModal} - ${category}`;
  const seoDescription = truncate(
    `Cek peluang franchise ${brandName} kategori ${category}, estimasi modal ${minimumModal}, profil brand, syarat kemitraan, dan kontak franchisor di Franchisee.id.`,
    155,
  );

  const replacements: Record<string, string> = {
    "{BRAND_NAME}": escapeHtml(brandName),
    "{SLUG}": escapeAttr(row.slug),
    "{CATEGORY}": escapeHtml(category),
    "{CATEGORY-SLUG}": escapeAttr(slugify(category)),
    "{COMPANY_NAME}": escapeHtml(normalizeCompanyName(row.company_name) || "Hubungi Admin"),
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
    "{OG_IMAGE}": escapeAttr(ogImage),
    "{SEO_TITLE}": escapeHtml(seoTitle),
    "{SEO_DESCRIPTION}": escapeHtml(seoDescription),
    "{VERIFIED_ICON}": tier === "verified" || tier === "premium" ? '<i class="fas fa-check-circle franchise-verified-badge" aria-label="Brand terverifikasi"></i>' : "",
    "{JSON_LD}": generateJsonLd(row, description, logoUrl, ogImage),
    "{BREADCRUMBS}": generateBreadcrumbs(row),
    "{CLAIM_STICKY_BAR}": isUnclaimed ? generateStickyBar(row) : "",
    "{DYNAMIC_TABS_CONTENT}": generateTabs(row, description, isUnclaimed),
  };

  let html = template.replace("<!-- DYNAMIC_DISCLAIMER_BOX -->", isUnclaimed ? generateDisclaimer(row) : "");
  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(key).join(value);
  }

  html = stripLegacyDetailTabComment(html);
  html = applyDetailEnhancements(html, row, { logoUrl, heroImage });

  return normalizeGeneratedHtml(`${GENERATED_MARKER}:v1 slug=${escapeAttr(row.slug)} franchise_id=${escapeAttr(row.id)} -->\n${html}`);
}

function generateCard(row: FranchiseStaticRow, index: number) {
  const tier = normalizeText(row.verification_tier || row.status).toUpperCase() || "UNCLAIMED";
  const brandName = normalizeBrandName(row.brand_name);
  const category = normalizeText(row.category) || "Bisnis Umum";
  const link = `/peluang-usaha/${row.slug}`;
  const imageUrl = getThumb(row.cover_url || row.logo_url);
  const imageBlock = imageUrl
    ? `<img loading="lazy" src="${escapeAttr(imageUrl)}" alt="${escapeAttr(brandName)}" width="300" height="150">`
    : generateCssPlaceholder(brandName, "franchise-css-placeholder");
  const modal = formatRupiah(row.total_investment_idr || row.min_investment_idr || row.package_price_idr || row.package_min_capital_idr);
  const desc = truncate(normalizeDescriptionText(row.short_desc || row.full_desc, brandName) || `Peluang usaha franchise ${brandName}.`, 90);
  const badge = generateStatusBadge(tier);
  const factChips = generateFactChips(row, modal);
  const categorySlugValue = categorySlug(row);
  const statusKey = tier.toLowerCase();
  const modalSort = row.total_investment_idr || row.min_investment_idr || row.package_price_idr || row.package_min_capital_idr || 0;

  return `
    <div id="uc_post_grid_elementor_d0f4a5f_item${index}" class="uc_post_grid_style_one_item ue_post_grid_item ue-item ${escapeAttr(statusKey)}-tier" data-franchise-card data-brand="${escapeAttr(brandName.toLowerCase())}" data-category="${escapeAttr(category.toLowerCase())}" data-category-slug="${escapeAttr(categorySlugValue)}" data-status="${escapeAttr(statusKey)}" data-modal="${escapeAttr(modalSort)}" data-recommendation-score="${escapeAttr(scoreRecommendation(row))}" data-popularity-score="${escapeAttr(scorePopularity(row))}" data-index="${escapeAttr(index)}">
        <a class="uc_post_grid_style_one_image" href="${escapeAttr(link)}">
            <div class="uc_post_image">
                ${imageBlock}
                <div class="uc_post_image_overlay"></div>
            </div>
        </a>
        <div class="uc_content">
            <div class="uc_content_inner">
                <div class="uc_content-info-wrapper">
                    <div class="uc_post_title">
                        <a href="${escapeAttr(link)}" class="ue_p_title franchise-card-title">
                            ${escapeHtml(brandName)} ${badge}
                        </a>
                    </div>
                    <div class="ue-meta-data">
                        <span class="ue-grid-item-category">
                            <a href="${escapeAttr(canonicalCategoryHref(category))}">${escapeHtml(category)}</a>
                        </span>
                        ${factChips}
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

function generateCategoryCard(summary: { label: string; slug: string; count: number }, index: number) {
  const href = canonicalCategoryHref(summary.slug);
  return `
    <div id="uc_post_grid_elementor_d0f4a5f_item${index}" class="uc_post_grid_style_one_item ue_post_grid_item ue-item category-directory-card">
        <a class="uc_post_grid_style_one_image" href="${escapeAttr(href)}">
            <div class="uc_post_image">
                ${generateCssPlaceholder(summary.label, "franchise-css-placeholder category-css-placeholder")}
                <div class="uc_post_image_overlay"></div>
            </div>
        </a>
        <div class="uc_content">
            <div class="uc_content_inner">
                <div class="uc_content-info-wrapper">
                    <div class="uc_post_title">
                        <a href="${escapeAttr(href)}" class="ue_p_title">${escapeHtml(summary.label)}</a>
                    </div>
                    <div class="ue-meta-data">
                        <span class="ue-grid-item-category">
                            <a href="${escapeAttr(href)}">${escapeHtml(summary.count)} franchise</a>
                        </span>
                    </div>
                    <div class="uc_post_text">Lihat peluang franchise kategori ${escapeHtml(summary.label)}.</div>
                </div>
                <div class="uc_post_button">
                    <a class="uc_more_btn" href="${escapeAttr(href)}">
                        <div class="uc_btn_inner"><div class="uc_btn_txt">Lihat Kategori</div></div>
                    </a>
                </div>
            </div>
        </div>
    </div>`;
}

function generateDirectoryControls(rows: FranchiseStaticRow[]) {
  const categories = getCategorySummaries(rows);
  const categoryOptions = categories
    .map((summary) => `<option value="${escapeAttr(summary.slug)}">${escapeHtml(summary.label)} (${escapeHtml(summary.count)})</option>`)
    .join("");

  return `
    <form class="franchise-directory-controls" id="franchise-directory-controls" action="/peluang-usaha" method="get" data-directory-controls>
      <div class="franchise-directory-control-row">
        <label class="franchise-directory-search">
          <span>Cari franchise</span>
          <input type="search" name="q" placeholder="Nama brand, kategori, atau kata kunci">
        </label>
        <label>
          <span>Urutkan</span>
          <select name="sort">
            <option value="">Prioritas</option>
            <option value="rekomendasi">Rekomendasi</option>
            <option value="populer">Populer</option>
            <option value="abjad">A-Z</option>
            <option value="kategori">Kategori</option>
            <option value="modal-asc">Modal terendah</option>
            <option value="modal-desc">Modal tertinggi</option>
          </select>
        </label>
        <label>
          <span>Kategori</span>
          <select name="kategori">
            <option value="">Semua kategori</option>
            ${categoryOptions}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select name="status">
            <option value="">Semua status</option>
            <option value="verified">Terverifikasi</option>
            <option value="premium">Premium</option>
            <option value="unclaimed">Belum diklaim</option>
          </select>
        </label>
        <div class="franchise-directory-actions">
          <button type="submit">Terapkan</button>
          <a href="/peluang-usaha">Reset</a>
        </div>
      </div>
      <div class="franchise-directory-quicklinks" aria-label="Tampilan cepat">
        <a href="/peluang-usaha">Semua</a>
        <a href="/peluang-usaha?sort=rekomendasi">Rekomendasi</a>
        <a href="/peluang-usaha?sort=populer">Populer</a>
        <a href="/peluang-usaha?sort=abjad">Abjad</a>
        <a href="/peluang-usaha?view=kategori">Kategori</a>
      </div>
      <p class="franchise-directory-result-count" aria-live="polite"></p>
    </form>`;
}

function canonicalCategoryHref(categoryOrSlug: string) {
  return `/peluang-usaha?kategori=${slugify(categoryOrSlug)}`;
}

function generateStatusBadge(tier: string) {
  if (tier === "VERIFIED" || tier === "PREMIUM") {
    const label = tier === "PREMIUM" ? "Premium" : "Terverifikasi";
    const tip = tier === "PREMIUM" ? "Listing premium dengan informasi prioritas." : "Brand sudah diverifikasi oleh tim Franchisee.id.";
    return `<span class="franchise-status-badge franchise-status-verified" aria-label="${escapeAttr(label)}"><i class="fas fa-check-circle" aria-hidden="true"></i><span>${escapeHtml(label)}</span><span class="franchise-tooltip">${escapeHtml(tip)}</span></span>`;
  }

  if (tier === "UNCLAIMED") {
    return `<span class="franchise-status-badge franchise-status-unclaimed" aria-label="Belum diklaim"><i class="fas fa-exclamation-circle" aria-hidden="true"></i><span>Belum diklaim</span><span class="franchise-tooltip">Data berasal dari sumber publik. Pemilik brand dapat klaim untuk memperbarui profil.</span></span>`;
  }

  return "";
}

function generateFactChips(row: FranchiseStaticRow, modal: string) {
  const chips = [
    ["Modal", modal],
    row.estimated_bep_months ? ["BEP", `${row.estimated_bep_months} bulan`] : null,
    row.year_established ? ["Berdiri", String(row.year_established)] : null,
  ].filter(Boolean) as [string, string][];

  return `<span class="franchise-card-facts">${chips
    .map(([label, value]) => `<span class="franchise-fact-chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></span>`)
    .join("")}</span>`;
}

function generateJsonLd(row: FranchiseStaticRow, description: string, logoUrl: string, imageUrl: string) {
  const brand = {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: normalizeBrandName(row.brand_name),
    description,
    url: `https://franchisee.id/peluang-usaha/${row.slug}`,
    category: row.category || "Franchise",
  };
  if (logoUrl) Object.assign(brand, { logo: logoUrl, image: imageUrl });
  return `<script type="application/ld+json">${JSON.stringify(brand)}</script>`;
}

function generateBreadcrumbs(row: FranchiseStaticRow) {
  const category = normalizeText(row.category) || "Bisnis";
  const brandName = normalizeBrandName(row.brand_name);
  return `
    <nav class="ast-breadcrumbs" aria-label="Breadcrumbs">
        <div class="ast-breadcrumbs-wrapper">
            <span class="trail-browse">Anda di sini:</span>
            <ul class="trail-items">
                <li class="trail-item"><a href="/">Home</a></li>
                <li class="trail-item"><a href="/peluang-usaha">Peluang Usaha</a></li>
                <li class="trail-item"><a href="${escapeAttr(canonicalCategoryHref(category))}">${escapeHtml(category)}</a></li>
                <li class="trail-item"><span>${escapeHtml(brandName)}</span></li>
            </ul>
        </div>
    </nav>`;
}

function generateBreadcrumbJsonLd(row: FranchiseStaticRow) {
  const category = normalizeText(row.category) || "Bisnis";
  const brandName = normalizeBrandName(row.brand_name);
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://franchisee.id/" },
      { "@type": "ListItem", position: 2, name: "Peluang Usaha", item: "https://franchisee.id/peluang-usaha" },
      { "@type": "ListItem", position: 3, name: category, item: `https://franchisee.id${canonicalCategoryHref(category)}` },
      { "@type": "ListItem", position: 4, name: brandName, item: `https://franchisee.id/peluang-usaha/${row.slug}` },
    ],
  };
  return `<script type="application/ld+json" class="franchise-breadcrumb-schema">${JSON.stringify(schema)}</script>`;
}

function generateStickyBar(row: FranchiseStaticRow) {
  return `
    <div id="claim-sticky-bar" style="position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 2px solid #ffc107; padding: 15px; z-index: 9999; box-shadow: 0 -5px 15px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="flex: 1; min-width: 250px;">
            <strong style="display: block; color: #333;">Apakah ini Bisnis Anda?</strong>
            <span style="font-size: 13px; color: #666;">Klaim brand <strong>${escapeHtml(row.brand_name)}</strong> secara GRATIS untuk mengelola halaman ini.</span>
        </div>
        <a href="/daftar?claim=${escapeAttr(row.slug)}" style="background: #ffc107; color: #000; padding: 10px 25px; border-radius: 50px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 10px rgba(255,193,7,0.3); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">KLAIM SEKARANG</a>
    </div>`;
}

function generateDisclaimer(row: FranchiseStaticRow) {
  return `
                <div class="disclaimer-box">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Halaman Belum Diklaim:</strong> Informasi ini dikumpulkan dari sumber publik. Jika Anda pemilik brand ini, silakan <a href="/daftar?claim=${escapeAttr(row.slug)}">klaim halaman ini</a> untuk memperbarui data.
                </div>`;
}

function generateTabs(row: FranchiseStaticRow, description: string, isUnclaimed: boolean) {
  const contact = generateContactBlock(row, isUnclaimed);
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

interface ParsedPhoneContact {
  label: string;
  display: string;
  href: string;
  whatsappHref: string;
  type: "whatsapp" | "mobile" | "landline";
}

function generateContactBlock(row: FranchiseStaticRow, isUnclaimed = false) {
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

  const phoneContacts = [
    ...parsePhoneContacts(row.whatsapp, "WhatsApp", "whatsapp"),
    ...parsePhoneContacts(row.phone, "Telepon", "phone"),
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index);

  const hasPublicContact =
    phoneContacts.length > 0 || normalizeText(row.email_contact) || normalizeText(row.office_address) || links.length > 0;

  const lead = isUnclaimed
    ? hasPublicContact
      ? "Data kontak publik di bawah ini belum diklaim pemilik brand. Klaim listing untuk memperbarui atau mengoreksi data."
      : "Kontak publik belum tersedia. Pemilik brand dapat klaim listing untuk melengkapi data resmi."
    : hasPublicContact
      ? "Gunakan kontak resmi brand untuk informasi kemitraan lebih lanjut."
      : "Silakan hubungi tim acquisition untuk informasi lebih lanjut.";

  const contactRows = [
    row.pic_name ? `<li>PIC: ${escapeHtml(row.pic_name)}</li>` : "",
    row.email_contact ? `<li>Email: <a href="mailto:${escapeAttr(row.email_contact)}">${escapeHtml(row.email_contact)}</a></li>` : "",
    ...phoneContacts.map((contact) => generatePhoneContactRow(contact, row, isUnclaimed)),
    row.office_address ? generateOfficeAddressRow(row.office_address) : "",
  ].filter(Boolean);

  const contactList = contactRows.length ? `<ul>${contactRows.join("")}</ul>` : "";
  const linkList = links.length
    ? `<ul>${links.map((item) => `<li><a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a></li>`).join("")}</ul>`
    : "";
  const claimNote = isUnclaimed
    ? `<p class="franchise-contact-note"><strong>Pemilik brand?</strong> <a href="/daftar?claim=${escapeAttr(row.slug)}">Klaim listing ini</a> untuk mengelola nomor, alamat, dan informasi resmi.</p>`
    : "";

  return `<div class="franchise-contact-block"><p>${escapeHtml(lead)}</p>${contactList}${linkList}${claimNote}</div>`;
}

function parsePhoneContacts(value: unknown, defaultLabel: string, source: "whatsapp" | "phone"): ParsedPhoneContact[] {
  const text = normalizeText(value);
  if (!text) return [];

  const contacts: ParsedPhoneContact[] = [];
  const starts = findPhoneStarts(text);

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const nextStart = starts[index + 1] ?? text.length;
    const slice = text.slice(start, nextStart);
    const raw = slice.match(/^(?:\(\s*)?(?:\+?62|0)(?:[\s().-]*\d){5,15}/)?.[0];
    if (!raw) continue;

    const digits = raw.replace(/\D/g, "");
    const normalized = normalizeIndonesianDigits(digits);
    if (!isUsablePhoneNumber(normalized)) continue;

    const end = start + raw.length;
    const label = inferPhoneLabel(text, start, end, defaultLabel);
    const type = classifyPhone(normalized, label, source);
    contacts.push({
      label: label || defaultLabel,
      display: formatIndonesianPhone(normalized, type),
      href: `tel:+${toInternationalDigits(normalized)}`,
      whatsappHref: normalized.startsWith("08") ? `https://wa.me/${toInternationalDigits(normalized)}` : "",
      type,
    });
  }

  return contacts;
}

function findPhoneStarts(text: string) {
  const starts: number[] = [];
  const startPattern = /(?:\(\s*)?(?:\+?62|0)(?=[\s().-]*\d)/g;
  let match: RegExpExecArray | null;

  while ((match = startPattern.exec(text))) {
    const previous = text[match.index - 1] || "";
    if (/\d/.test(previous)) continue;
    starts.push(match.index);
  }

  return starts;
}

function inferPhoneLabel(text: string, start: number, end: number, fallback: string) {
  const before = text.slice(Math.max(0, start - 48), start);
  const after = text.slice(end, Math.min(text.length, end + 32));
  const afterParen = after.match(/^\s*\(([^()]{2,24})\)/);
  if (afterParen?.[1] && /[a-z]/i.test(afterParen[1])) return titleCaseLabel(afterParen[1]);

  const beforeColon = before.match(/([A-Za-z][A-Za-z\s./-]{1,28})\s*[:：]\s*$/);
  if (beforeColon?.[1]) return titleCaseLabel(beforeColon[1]);

  const keyword = before.match(/\b(marketing|whatsapp|wa|kantor|office|telp kantor|telepon kantor|telepon|telp|owner|admin|cp)\b\s*$/i);
  if (keyword?.[1]) return titleCaseLabel(keyword[1]);

  return fallback;
}

function classifyPhone(normalized: string, label: string, source: "whatsapp" | "phone"): ParsedPhoneContact["type"] {
  const lower = label.toLowerCase();
  if ((source === "whatsapp" || /\b(wa|whatsapp)\b/.test(lower)) && normalized.startsWith("08")) return "whatsapp";
  if (normalized.startsWith("08")) return "mobile";
  return "landline";
}

function normalizeIndonesianDigits(digits: string) {
  if (digits.startsWith("620")) return `0${digits.slice(3)}`;
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

function isUsablePhoneNumber(digits: string) {
  if (!/^0\d{7,13}$/.test(digits)) return false;
  return new Set(digits.split("")).size > 2;
}

function toInternationalDigits(normalized: string) {
  return normalized.startsWith("0") ? `62${normalized.slice(1)}` : normalized;
}

function formatIndonesianPhone(normalized: string, type: ParsedPhoneContact["type"]) {
  if (type === "landline") {
    const areaLength = normalized.startsWith("021") ? 3 : normalized.startsWith("02") || normalized.startsWith("03") || normalized.startsWith("04") ? 4 : 3;
    const area = normalized.slice(0, areaLength);
    const local = normalized.slice(areaLength);
    return `(${area}) ${groupDigits(local, 4)}`;
  }
  return groupDigits(normalized, 4);
}

function groupDigits(value: string, size: number) {
  const groups: string[] = [];
  for (let index = 0; index < value.length; index += size) groups.push(value.slice(index, index + size));
  return groups.join(" ");
}

function titleCaseLabel(label: string) {
  const normalized = normalizeText(label).replace(/[./-]+/g, " ");
  const aliases: Record<string, string> = {
    wa: "WhatsApp",
    whatsapp: "WhatsApp",
    telp: "Telepon",
    telepon: "Telepon",
    kantor: "Kantor",
    office: "Kantor",
    "telp kantor": "Telepon Kantor",
    "telepon kantor": "Telepon Kantor",
    cp: "CP",
  };
  const key = normalized.toLowerCase();
  if (aliases[key]) return aliases[key];
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function generatePhoneContactRow(contact: ParsedPhoneContact, row: FranchiseStaticRow, isUnclaimed: boolean) {
  const icon = contact.type === "whatsapp" ? "fab fa-whatsapp" : contact.type === "mobile" ? "fas fa-mobile-alt" : "fas fa-phone-alt";
  const claimMessageHref = isUnclaimed && contact.whatsappHref ? generateWhatsAppClaimHref(contact.whatsappHref, row) : "";
  const claimMessageLink = claimMessageHref
    ? ` <a class="franchise-whatsapp-claim-link" href="${escapeAttr(claimMessageHref)}" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp" aria-hidden="true"></i> Kirim info klaim</a>`
    : "";
  return `<li class="franchise-phone-contact franchise-phone-${escapeAttr(contact.type)}"><span><i class="${icon}" aria-hidden="true"></i>${escapeHtml(contact.label)}:</span> <a href="${escapeAttr(contact.href)}">${escapeHtml(contact.display)}</a>${claimMessageLink}</li>`;
}

function generateOfficeAddressRow(address: string) {
  return `<li class="franchise-office-address"><span><i class="fas fa-map-marker-alt" aria-hidden="true"></i>Alamat kantor:</span> ${escapeHtml(address)}</li>`;
}

function generateWhatsAppClaimHref(baseHref: string, row: FranchiseStaticRow) {
  const brandName = normalizeText(row.brand_name);
  const category = normalizeText(row.category) || "franchise";
  const listingUrl = `https://franchisee.id/peluang-usaha/${row.slug}`;
  const claimUrl = `https://franchisee.id/daftar?claim=${row.slug}`;
  const message = [
    `Halo, saya menemukan listing ${brandName} (${category}) di Franchisee.id: ${listingUrl}.`,
    `Status listing ini belum diklaim, jadi data franchise, kontak, dan alamatnya belum dikelola langsung oleh pemilik brand.`,
    `Mohon tim/pemilik ${brandName} klaim listing ini agar informasi publiknya bisa diperbarui resmi: ${claimUrl}`,
  ].join(" ");
  return `${baseHref}?text=${encodeURIComponent(message)}`;
}

function compareFranchises(a: FranchiseStaticRow, b: FranchiseStaticRow) {
  const weight = (row: FranchiseStaticRow) => {
    const tier = normalizeText(row.verification_tier || row.status).toLowerCase();
    if (tier === "premium") return 4;
    if (tier === "verified") return 3;
    if (tier === "free") return 2;
    if (tier === "unclaimed") return 1;
    return 0;
  };

  const diff = weight(b) - weight(a);
  if (diff) return diff;
  return normalizeBrandName(a.brand_name).localeCompare(normalizeBrandName(b.brand_name), "id-ID");
}

function formatRupiah(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return "Tanya Admin";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Miliar`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} Juta`;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

function getThumb(url: string | null | undefined) {
  const normalized = normalizeUrl(url);
  if (!normalized) return "";
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

export function slugify(text: string) {
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

function normalizeBrandName(value: unknown) {
  return normalizeTitleLikeName(value);
}

function normalizeCompanyName(value: unknown) {
  const text = normalizeText(value);
  if (!text) return "";
  return text
    .replace(/\b(PT|CV|UD)\.?\s+([^,.;]+)/gi, (_match, prefix: string, name: string) => `${prefix.toUpperCase()} ${titleCasePhrase(name)}`)
    .replace(/\b(TBK|PERSERO)\b/gi, (match) => match.toUpperCase());
}

function normalizeDescriptionText(value: unknown, brandName?: string) {
  const text = normalizeText(value);
  if (!text) return "";
  if (!looksMostlyUppercase(text)) return ensureFinalPunctuation(fixCommonIndonesianCompounds(normalizeCompanyNameInText(text)));

  let normalized = fixCommonIndonesianCompounds(text.toLowerCase());
  normalized = normalized.replace(/\b(pt|cv|ud)\.?\s+([a-z0-9&.' -]+?)(?=\s+(?:yang|bergerak|merupakan|adalah|dengan|dan|di|ke|untuk|,|\.|;|$))/g, (_match, prefix: string, name: string) => {
    return `${prefix.toUpperCase()} ${titleCasePhrase(name)}`;
  });
  normalized = normalized.replace(/\b(franchisee\.id|franchise\.id)\b/gi, (match) => match.toLowerCase());
  normalized = restoreKnownUppercaseTerms(normalized);
  normalized = sentenceCase(normalized);

  const displayBrand = normalizeBrandName(brandName);
  if (displayBrand) {
    normalized = replaceCaseInsensitivePhrase(normalized, normalizeText(brandName).toLowerCase(), displayBrand);
  }

  return ensureFinalPunctuation(normalized);
}

function normalizeTitleLikeName(value: unknown): string {
  const text = normalizeText(value);
  if (!text) return "";
  if (!looksMostlyUppercase(text)) return normalizeCompanyNameInText(text);
  return text
    .toLowerCase()
    .split(/(\s+|[-/])/)
    .map((part, index, parts) => {
      if (/^\s+$|^[-/]$/.test(part)) return part;
      const previous = parts[index - 1] || "";
      const lower = part.toLowerCase();
      if (index > 0 && previous !== "-" && TITLE_LOWER_WORDS.has(lower)) return lower;
      return formatTitleWord(part);
    })
    .join("")
    .replace(/\b(PT|CV|UD)\.?\s+/gi, (match) => match.toUpperCase().replace(".", ""));
}

function titleCasePhrase(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .split(/(\s+|[-/])/)
    .map((part, index, parts) => {
      if (/^\s+$|^[-/]$/.test(part)) return part;
      const previous = parts[index - 1] || "";
      const lower = part.toLowerCase();
      if (index > 0 && previous !== "-" && TITLE_LOWER_WORDS.has(lower)) return lower;
      return formatTitleWord(part);
    })
    .join("");
}

function looksMostlyUppercase(text: string) {
  const letters = text.match(/[A-Za-zÀ-ÿ]/g) || [];
  if (letters.length < 6) return false;
  const uppercase = letters.filter((letter) => letter === letter.toUpperCase() && letter !== letter.toLowerCase()).length;
  const lowercase = letters.filter((letter) => letter === letter.toLowerCase() && letter !== letter.toUpperCase()).length;
  return uppercase / letters.length >= 0.72 && lowercase / letters.length <= 0.12;
}

function fixCommonIndonesianCompounds(text: string) {
  return text
    .replace(/\bdibidang\b/gi, "di bidang")
    .replace(/\bdi bidang\s+retail\b/gi, "di bidang retail")
    .replace(/\bkerjasama\b/gi, "kerja sama")
    .replace(/\bfranchisee\.id\b/gi, "Franchisee.id")
    .replace(/\bfranchise\.id\b/gi, "Franchise.id");
}

function normalizeCompanyNameInText(text: string): string {
  return text
    .replace(/\b(PT|CV|UD)\.?\s+([^,.;]+)/gi, (_match, prefix: string, name: string) => `${prefix.toUpperCase()} ${titleCasePhrase(name)}`)
    .replace(/\b(TBK|PERSERO)\b/gi, (match) => match.toUpperCase());
}

function restoreKnownUppercaseTerms(text: string) {
  return text.replace(/\b[a-z0-9&.+-]+\b/gi, (word) => {
    const key = word.toLowerCase();
    return KNOWN_UPPERCASE_TERMS.get(key) || word;
  });
}

function sentenceCase(text: string) {
  let shouldCapitalize = true;
  let result = "";

  for (const char of text) {
    if (/[A-Za-zÀ-ÿ]/.test(char)) {
      result += shouldCapitalize ? char.toUpperCase() : char;
      shouldCapitalize = false;
      continue;
    }
    result += char;
    if (/[.!?]\s*$/.test(char)) shouldCapitalize = true;
  }

  return result.replace(/\bi\b/g, "I");
}

function formatTitleWord(word: string) {
  const key = word.toLowerCase();
  if (KNOWN_UPPERCASE_TERMS.has(key)) return KNOWN_UPPERCASE_TERMS.get(key) || word.toUpperCase();
  if (/^\d/.test(word)) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function replaceCaseInsensitivePhrase(text: string, needle: string, replacement: string) {
  if (!needle || !replacement || needle.length < 2) return text;
  return text.replace(new RegExp(escapeRegExp(needle), "gi"), replacement);
}

function ensureFinalPunctuation(text: string) {
  if (!text) return "";
  return /[.!?)]$/.test(text) ? text : `${text}.`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeUrl(value: unknown) {
  return normalizeText(value);
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

function normalizeGeneratedHtml(html: string) {
  return html
    .replace(/^[\t ]+/gm, (indent) => {
      let normalized = indent;
      while (normalized.includes(" \t")) normalized = normalized.replace(/ \t/g, "\t");
      return normalized;
    })
    .replace(/[ \t]+$/gm, "");
}

function applyCanonicalLegacyLinks(html: string) {
  return html
    .replace(/\bhref=(["'])\/direktori-franchise\/?\1/g, "href=$1/peluang-usaha$1")
    .replace(/\bhref=(["'])\/rekomendasi\/?\1/g, "href=$1/peluang-usaha?sort=rekomendasi$1")
    .replace(/\bhref=(["'])\/populer\/?\1/g, "href=$1/peluang-usaha?sort=populer$1")
    .replace(/\bhref=(["'])\/abjad\/?\1/g, "href=$1/peluang-usaha?sort=abjad$1")
    .replace(/\bhref=(["'])\/kategori\/?\1/g, "href=$1/peluang-usaha?view=kategori$1")
    .replace(/\bhref=(["'])\/category\/?\1/g, "href=$1/peluang-usaha?view=kategori$1")
    .replace(/\bhref=(["'])\/kategori\/([^"'#?]+)\/?\1/g, "href=$1/peluang-usaha?kategori=$2$1")
    .replace(/\bhref=(["'])\/category\/([^"'#?]+)\/?\1/g, "href=$1/peluang-usaha?kategori=$2$1");
}

function applyDirectoryMeta(html: string, options?: DirectoryPageOptions) {
  if (!options) return html;
  const title = `${options.title} - Franchise.id`;
  return html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeAttr(options.description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${escapeAttr(options.canonicalPath)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeAttr(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeAttr(options.description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${escapeAttr(options.canonicalPath)}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeAttr(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeAttr(options.description)}">`)
    .replace(/<h1 class="elementor-heading-title elementor-size-default">.*?<\/h1>/, `<h1 class="elementor-heading-title elementor-size-default">${escapeHtml(options.title)}</h1>`)
    .replace(/<h2 class="elementor-heading-title elementor-size-default">.*?<\/h2>/, `<h2 class="elementor-heading-title elementor-size-default">${escapeHtml(options.title)}</h2>`);
}

function applyDetailEnhancements(
  html: string,
  row: FranchiseStaticRow,
  assets: { logoUrl: string; heroImage: string },
) {
  let enhanced = html
    .replace(/<meta property="og:type" content="article">/, '<meta property="og:type" content="website">')
    .replace(/\s*<meta property="article:tag" content="[^"]*">\n?/g, "")
    .replace(/\s*<meta property="article:section" content="[^"]*">\n?/g, "")
    .replace(/\s*<meta property="og:updated_time" content="[^"]*">\n?/g, "")
    .replace(
      /<script type="application\/ld\+json" class="rank-math-schema">.*?<\/script><!-- \/Rank Math WordPress SEO plugin -->/,
      `${generateBreadcrumbJsonLd(row)}<!-- /Rank Math WordPress SEO plugin -->`,
    )
    .replace(/href="\/category\/([^"#?]+)"/g, 'href="/peluang-usaha?kategori=$1"')
    .replace(/href="\/kategori\/([^"#?]+)"/g, 'href="/peluang-usaha?kategori=$1"');
  enhanced = applyCanonicalLegacyLinks(enhanced);

  if (!assets.heroImage) {
    enhanced = enhanced.replace(
      /background-image: url\(''\); background-size: cover; background-position: center;/g,
      "background: radial-gradient(circle at 18% 20%, rgba(240, 202, 0, 0.28), transparent 28%), linear-gradient(135deg, #111111 0%, #3a3a3a 54%, #f0ca00 100%); background-size: cover; background-position: center;",
    );
  }

  if (!assets.logoUrl) {
    enhanced = enhanced.replace(
      /<img([^>]+)src=""([^>]*)>/g,
      generateCssPlaceholder(row.brand_name, "franchise-css-placeholder franchise-detail-image-placeholder"),
    );
  }

  return injectDetailAssets(enhanced);
}

function stripLegacyDetailTabComment(html: string) {
  return html.replace(
    /\s*<!--\s*<div class="e-n-tabs" data-widget-number="26009074"[\s\S]*?<\/div>\s*-->/,
    "",
  );
}

function getCategorySummaries(rows: FranchiseStaticRow[]) {
  const categories = new Map<string, { label: string; slug: string; rows: FranchiseStaticRow[]; count: number }>();
  for (const row of rows) {
    const label = normalizeText(row.category) || "Bisnis Umum";
    const slug = slugify(label);
    const current = categories.get(slug) || { label, slug, rows: [], count: 0 };
    current.rows.push(row);
    current.count += 1;
    categories.set(slug, current);
  }
  return [...categories.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "id-ID"));
}

function addCategoryAlias(
  entries: Map<string, CategoryRouteEntry>,
  slug: string,
  label: string,
  rows: FranchiseStaticRow[],
  predicate: (row: FranchiseStaticRow) => boolean,
) {
  const matchedRows = rows.filter(predicate);
  if (!matchedRows.length || entries.has(slug)) return;
  entries.set(slug, {
    slug,
    label,
    rows: matchedRows,
    canonicalPath: canonicalCategoryHref(slug),
  });
}

function categorySlug(row: FranchiseStaticRow) {
  return slugify(normalizeText(row.category) || "Bisnis Umum");
}

function scoreRecommendation(row: FranchiseStaticRow) {
  const tier = normalizeText(row.verification_tier || row.status).toLowerCase();
  const tierScore = tier === "premium" ? 500 : tier === "verified" ? 420 : tier === "free" ? 300 : 120;
  return tierScore + completenessScore(row);
}

function scorePopularity(row: FranchiseStaticRow) {
  const knownBrandScore = normalizeUrl(row.logo_url || row.cover_url) ? 80 : 0;
  const investment = row.total_investment_idr || row.min_investment_idr || row.package_price_idr || 0;
  const accessibleInvestmentScore = investment > 0 && investment <= 150_000_000 ? 90 : investment > 0 && investment <= 500_000_000 ? 60 : 20;
  return scoreRecommendation(row) + knownBrandScore + accessibleInvestmentScore;
}

function completenessScore(row: FranchiseStaticRow) {
  let score = 0;
  if (normalizeUrl(row.logo_url)) score += 35;
  if (normalizeUrl(row.cover_url)) score += 25;
  if (normalizeText(row.short_desc || row.full_desc).length > 80) score += 35;
  if (row.total_investment_idr || row.min_investment_idr || row.package_price_idr) score += 35;
  if (normalizeText(row.website_url || row.instagram_url || row.whatsapp)) score += 20;
  return score;
}
