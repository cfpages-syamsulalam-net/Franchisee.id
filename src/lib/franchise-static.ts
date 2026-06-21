import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";

const ROOT_DIR = resolve(process.cwd());
const DETAIL_TEMPLATE_PATH = join(ROOT_DIR, "templates", "detail-franchise-tpl.html");
const LISTING_TEMPLATE_PATH = join(ROOT_DIR, "templates", "peluang-usaha-tpl.html");
const STATIC_DATA_PATH = join(ROOT_DIR, "json", "d1-franchise-static-data.json");
const GENERATED_MARKER = "<!-- astro-generated:d1-franchisee.id";
const SITE_FALLBACK_IMAGE = "/wp-content/uploads/2025/09/franchise.id-favicon-logo.png";

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
  const html = template.replace("<!-- DYNAMIC_FRANCHISE_LISTING -->", cards);
  return normalizeGeneratedHtml(injectDirectoryStyles(applyDirectoryMeta(html, options)));
}

export function renderCategoryIndexPage(rows: FranchiseStaticRow[]) {
  const template = readFileSync(LISTING_TEMPLATE_PATH, "utf8");
  const summaries = getCategorySummaries(rows);
  const cards = summaries.map((summary, index) => generateCategoryCard(summary, index + 1)).join("");
  const html = template.replace("<!-- DYNAMIC_FRANCHISE_LISTING -->", cards);
  return normalizeGeneratedHtml(
    injectDirectoryStyles(
      applyDirectoryMeta(html, {
        title: "Kategori Franchise",
        description: "Jelajahi peluang franchise berdasarkan kategori bisnis, mulai dari makanan minuman, pendidikan, jasa, retail, otomotif, hingga kesehatan.",
        canonicalPath: "/kategori",
      }),
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
      canonicalPath: `/kategori/${summary.slug}`,
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
  const brandName = normalizeText(row.brand_name);
  const category = normalizeText(row.category) || "Bisnis Umum";
  const description = normalizeText(row.full_desc || row.short_desc) || `Peluang usaha franchise ${brandName}.`;
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

  html = applyDetailEnhancements(html, row, { logoUrl, heroImage });

  return normalizeGeneratedHtml(`${GENERATED_MARKER}:v1 slug=${escapeAttr(row.slug)} franchise_id=${escapeAttr(row.id)} -->\n${html}`);
}

function generateCard(row: FranchiseStaticRow, index: number) {
  const tier = normalizeText(row.verification_tier || row.status).toUpperCase() || "UNCLAIMED";
  const brandName = normalizeText(row.brand_name);
  const category = normalizeText(row.category) || "Bisnis Umum";
  const link = `/peluang-usaha/${row.slug}`;
  const imageUrl = getThumb(row.cover_url || row.logo_url);
  const imageBlock = imageUrl
    ? `<img loading="lazy" src="${escapeAttr(imageUrl)}" alt="${escapeAttr(brandName)}" width="300" height="150">`
    : generateCssPlaceholder(brandName, "franchise-css-placeholder");
  const modal = formatRupiah(row.total_investment_idr || row.min_investment_idr || row.package_price_idr || row.package_min_capital_idr);
  const desc = truncate(normalizeText(row.short_desc || row.full_desc) || `Peluang usaha franchise ${brandName}.`, 90);
  const badge = generateStatusBadge(tier);
  const factChips = generateFactChips(row, modal);

  return `
    <div id="uc_post_grid_elementor_d0f4a5f_item${index}" class="uc_post_grid_style_one_item ue_post_grid_item ue-item ${escapeAttr(tier.toLowerCase())}-tier">
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
                            <a href="/kategori/${escapeAttr(slugify(category))}">${escapeHtml(category)}</a>
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
  return `
    <div id="uc_post_grid_elementor_d0f4a5f_item${index}" class="uc_post_grid_style_one_item ue_post_grid_item ue-item category-directory-card">
        <a class="uc_post_grid_style_one_image" href="/kategori/${escapeAttr(summary.slug)}">
            <div class="uc_post_image">
                ${generateCssPlaceholder(summary.label, "franchise-css-placeholder category-css-placeholder")}
                <div class="uc_post_image_overlay"></div>
            </div>
        </a>
        <div class="uc_content">
            <div class="uc_content_inner">
                <div class="uc_content-info-wrapper">
                    <div class="uc_post_title">
                        <a href="/kategori/${escapeAttr(summary.slug)}" class="ue_p_title">${escapeHtml(summary.label)}</a>
                    </div>
                    <div class="ue-meta-data">
                        <span class="ue-grid-item-category">
                            <a href="/kategori/${escapeAttr(summary.slug)}">${escapeHtml(summary.count)} franchise</a>
                        </span>
                    </div>
                    <div class="uc_post_text">Lihat peluang franchise kategori ${escapeHtml(summary.label)}.</div>
                </div>
                <div class="uc_post_button">
                    <a class="uc_more_btn" href="/kategori/${escapeAttr(summary.slug)}">
                        <div class="uc_btn_inner"><div class="uc_btn_txt">Lihat Kategori</div></div>
                    </a>
                </div>
            </div>
        </div>
    </div>`;
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
    name: row.brand_name,
    description,
    url: `https://franchisee.id/peluang-usaha/${row.slug}`,
    category: row.category || "Franchise",
  };
  if (logoUrl) Object.assign(brand, { logo: logoUrl, image: imageUrl });
  return `<script type="application/ld+json">${JSON.stringify(brand)}</script>`;
}

function generateBreadcrumbs(row: FranchiseStaticRow) {
  const category = normalizeText(row.category) || "Bisnis";
  return `
    <nav class="ast-breadcrumbs" aria-label="Breadcrumbs">
        <div class="ast-breadcrumbs-wrapper">
            <span class="trail-browse">Anda di sini:</span>
            <ul class="trail-items">
                <li class="trail-item"><a href="/">Home</a></li>
                <li class="trail-item"><a href="/peluang-usaha">Peluang Usaha</a></li>
                <li class="trail-item"><a href="/kategori/${escapeAttr(slugify(category))}">${escapeHtml(category)}</a></li>
                <li class="trail-item"><span>${escapeHtml(row.brand_name)}</span></li>
            </ul>
        </div>
    </nav>`;
}

function generateBreadcrumbJsonLd(row: FranchiseStaticRow) {
  const category = normalizeText(row.category) || "Bisnis";
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://franchisee.id/" },
      { "@type": "ListItem", position: 2, name: "Peluang Usaha", item: "https://franchisee.id/peluang-usaha" },
      { "@type": "ListItem", position: 3, name: category, item: `https://franchisee.id/kategori/${slugify(category)}` },
      { "@type": "ListItem", position: 4, name: row.brand_name, item: `https://franchisee.id/peluang-usaha/${row.slug}` },
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

function generateContactBlock(row: FranchiseStaticRow) {
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
    .replace(/href="\/category\//g, 'href="/kategori/');

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

  return injectDetailStyles(enhanced);
}

function injectDirectoryStyles(html: string) {
  if (html.includes("franchise-directory-generated-css")) return html;
  return html.replace(
    "</head>",
    `<style id="franchise-directory-generated-css">
.franchise-css-placeholder {
  width: 100%;
  height: 100%;
  min-height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 18% 20%, rgba(240, 202, 0, 0.28), transparent 28%),
    linear-gradient(135deg, #111111 0%, #3a3a3a 54%, #f0ca00 100%);
  color: #ffffff;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
  font-size: 34px;
  font-weight: 700;
  text-transform: uppercase;
}
.franchise-css-placeholder span {
  display: inline-flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.7);
  background: rgba(0, 0, 0, 0.22);
}
.category-css-placeholder {
  background:
    radial-gradient(circle at 80% 22%, rgba(255, 255, 255, 0.22), transparent 24%),
    linear-gradient(135deg, #f0ca00 0%, #222222 62%, #000000 100%);
}
#uc_post_grid_elementor_d0f4a5f .ue_p_title {
  pointer-events: auto !important;
}
.franchise-card-title {
  display: flex !important;
  align-items: flex-start;
  gap: 8px;
  color: #111111 !important;
  line-height: 1.24;
  text-decoration: none !important;
}
.franchise-card-title:hover {
  color: #c28d00 !important;
}
.franchise-status-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 118px;
  min-height: 22px;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  white-space: nowrap;
  flex: 0 0 auto;
}
.franchise-status-verified {
  color: #0f5132;
  background: #d1f1dc;
  border: 1px solid rgba(15, 81, 50, 0.18);
}
.franchise-status-unclaimed {
  color: #6a4a00;
  background: #fff2bd;
  border: 1px solid rgba(194, 141, 0, 0.28);
}
.franchise-status-badge > span:not(.franchise-tooltip) {
  overflow: hidden;
  text-overflow: ellipsis;
}
.franchise-tooltip {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 50;
  width: 220px;
  padding: 8px 10px;
  border-radius: 4px;
  background: #111111;
  color: #ffffff;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 500;
  white-space: normal;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 80ms ease, transform 80ms ease;
}
.franchise-status-badge:hover .franchise-tooltip,
.franchise-status-badge:focus-within .franchise-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.franchise-card-facts {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.franchise-fact-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 4px;
  background: #f6f6f6;
  color: #222222;
  font-size: 11px;
  line-height: 1.2;
}
.franchise-fact-chip span {
  color: #767676;
}
.franchise-fact-chip strong {
  font-weight: 700;
}
</style>
</head>`,
  );
}

function injectDetailStyles(html: string) {
  if (html.includes("franchise-detail-generated-css")) return html;
  return html.replace(
    "</head>",
    `<style id="franchise-detail-generated-css">
.ast-breadcrumbs {
  margin: 18px auto 22px;
  max-width: 1200px;
  padding: 0 20px;
  font-size: 13px;
  color: #5f5f5f;
}
.ast-breadcrumbs-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.trail-browse {
  color: #6b6b6b;
  font-weight: 600;
}
.trail-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.trail-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #4b4b4b;
}
.trail-item:not(:last-child)::after {
  content: "/";
  color: #a5a5a5;
}
.trail-item a {
  color: #3c2d00 !important;
  background: #fff3c4;
  border: 1px solid rgba(194, 141, 0, 0.28);
  border-radius: 4px;
  padding: 3px 7px;
  text-decoration: none !important;
}
.trail-item a:hover {
  background: #f0ca00;
  color: #111111 !important;
}
.trail-item span {
  color: #222222;
}
.franchise-detail-image-placeholder {
  min-height: 138px;
  aspect-ratio: 300 / 138;
}
</style>
</head>`,
  );
}

function generateCssPlaceholder(label: string, className: string) {
  return `<div class="${escapeAttr(className)}" aria-label="${escapeAttr(label)}"><span>${escapeHtml(initials(label))}</span></div>`;
}

function initials(label: string) {
  const words = normalizeText(label).split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] || "F";
  const second = words.find((word) => word.length > 2 && word !== words[0])?.[0] || words[1]?.[0] || "I";
  return `${first}${second}`.toUpperCase();
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
    canonicalPath: `/kategori/${slug}`,
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
