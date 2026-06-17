import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";

const ROOT_DIR = resolve(process.cwd());
const DETAIL_TEMPLATE_PATH = join(ROOT_DIR, "templates", "detail-franchise-tpl.html");
const LISTING_TEMPLATE_PATH = join(ROOT_DIR, "templates", "peluang-usaha-tpl.html");
const STATIC_DATA_PATH = join(ROOT_DIR, "json", "d1-franchise-static-data.json");
const GENERATED_MARKER = "<!-- astro-generated:d1-franchisee.id";

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
  package_name: nullableString,
  package_price_idr: nullableNumber,
  package_min_capital_idr: nullableNumber,
  package_max_capital_idr: nullableNumber,
  canonical_url: nullableString,
  publication_status: nullableString,
  is_primary: nullableNumber,
});

export type FranchiseStaticRow = z.infer<typeof FranchiseStaticRowSchema>;

export function loadFranchiseStaticRows() {
  const parsed = JSON.parse(readFileSync(STATIC_DATA_PATH, "utf8"));
  return z.array(FranchiseStaticRowSchema).parse(parsed);
}

export function renderListingPage(rows: FranchiseStaticRow[]) {
  const template = readFileSync(LISTING_TEMPLATE_PATH, "utf8");
  const cards = [...rows].sort(compareFranchises).map((row, index) => generateCard(row, index + 1)).join("");
  return normalizeGeneratedHtml(template.replace("<!-- DYNAMIC_FRANCHISE_LISTING -->", cards));
}

export function renderDetailPage(row: FranchiseStaticRow) {
  const template = readFileSync(DETAIL_TEMPLATE_PATH, "utf8");
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

function generateCard(row: FranchiseStaticRow, index: number) {
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

function generateJsonLd(row: FranchiseStaticRow, description: string, logoUrl: string) {
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

function generateBreadcrumbs(row: FranchiseStaticRow) {
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
    ? "Kontak belum tersedia. Silakan gunakan tombol Klaim untuk memverifikasi kepemilikan."
    : "Silakan hubungi tim acquisition untuk informasi lebih lanjut.";
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
                        <div class="elementor-widget-container"><p>${escapeHtml(contact)}</p></div>
                    </div>
                    ${
                      support
                        ? `<div class="e-n-tab-content" data-tab-index="3"><div class="elementor-widget-container">${paragraphs(support)}</div></div>`
                        : ""
                    }
                </div>
            </div>`;
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
  return normalizeText(value);
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
