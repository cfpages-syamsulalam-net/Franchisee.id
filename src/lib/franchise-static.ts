import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { capitalIndexCopy, capitalLandingCopy, getCapitalRouteEntries, getCapitalSummaries } from "./franchise-capital";
import { canonicalCategoryHref, categorySlug, getCategoryRouteEntries, getCategorySummaries } from "./franchise-category";
import { cityIndexCopy, cityLandingCopy, getCityRouteEntries, getCitySummaries, type CityRouteEntry } from "./franchise-city";
import { generateContactBlock } from "./franchise-contact";
import { countryDisplay, normalizeCountryName } from "./country-metadata";
import { generateCssPlaceholder, injectDetailAssets, injectDirectoryAssets } from "./franchise-static-assets";
import { generatePremiumLeadPanel, generatePremiumTabs } from "./franchise-premium-detail";
import { compareFranchises, getAlphabeticalRows, getPopularRows, getRecommendedRows, scorePopularity, scoreRecommendation } from "./franchise-ranking";
import {
  applyCanonicalLegacyLinks,
  escapeAttr,
  escapeHtml,
  formatRupiah,
  getThumb,
  normalizeBrandName,
  normalizeCompanyName,
  normalizeDescriptionText,
  normalizeGeneratedHtml,
  normalizeText,
  normalizeUrl,
  paragraphs,
  slugify,
  truncate,
} from "./franchise-text";
import { D1FranchiseRowSchema } from "./shared-schemas";
export { slugify } from "./franchise-text";
export { getAlphabeticalRows, getCapitalRouteEntries, getCategoryRouteEntries, getCityRouteEntries, getPopularRows, getRecommendedRows };

const ROOT_DIR = resolve(process.cwd());
const DETAIL_TEMPLATE_PATH = join(ROOT_DIR, "templates", "detail-franchise-tpl.html");
const LISTING_TEMPLATE_PATH = join(ROOT_DIR, "templates", "peluang-usaha-tpl.html");
const STATIC_DATA_PATH = join(ROOT_DIR, "json", "d1-franchise-static-data.json");
const GENERATED_MARKER = "<!-- astro-generated:d1-franchisee.id";
const SITE_FALLBACK_IMAGE = "/wp-content/uploads/2025/09/franchise.id-favicon-logo.png";

export const FranchiseStaticRowSchema = D1FranchiseRowSchema;

export type FranchiseStaticRow = z.infer<typeof FranchiseStaticRowSchema>;

export interface DirectoryPageOptions {
  title: string;
  description: string;
  canonicalPath: string;
  rows?: FranchiseStaticRow[];
  introHtml?: string;
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
      `${generateDirectoryIntro(options)}${generateDirectoryControls(rows)}${generateFranchisorDirectoryCta()}<div class="uc_post_grid_style_one " id="uc_post_grid_elementor_d0f4a5f">`,
    );
  return normalizeGeneratedHtml(applySiteBranding(injectDirectoryAssets(applyCanonicalLegacyLinks(applyDirectoryMeta(html, options)))));
}

export function renderCategoryIndexPage(rows: FranchiseStaticRow[]) {
  const template = readFileSync(LISTING_TEMPLATE_PATH, "utf8");
  const summaries = getCategorySummaries(rows);
  const cards = summaries.map((summary, index) => generateCategoryCard(summary, index + 1)).join("");
  const html = template
    .replace("<!-- DYNAMIC_FRANCHISE_LISTING -->", cards)
    .replace(
      '<div class="uc_post_grid_style_one " id="uc_post_grid_elementor_d0f4a5f">',
      `${generateDirectoryIntro({
        title: "Kategori Franchise",
        description: "Jelajahi peluang franchise berdasarkan kategori bisnis, mulai dari makanan minuman, pendidikan, jasa, retail, otomotif, hingga kesehatan.",
        canonicalPath: "/peluang-usaha/kategori/",
        introHtml: "<p>Pilih kategori bisnis untuk melihat listing yang lebih relevan dengan minat, pengalaman, dan target lokasi Anda.</p>",
      })}${generateFranchisorDirectoryCta()}<div class="uc_post_grid_style_one " id="uc_post_grid_elementor_d0f4a5f">`,
    );
  return normalizeGeneratedHtml(
    applySiteBranding(injectDirectoryAssets(
      applyCanonicalLegacyLinks(applyDirectoryMeta(html, {
        title: "Kategori Franchise",
        description: "Jelajahi peluang franchise berdasarkan kategori bisnis, mulai dari makanan minuman, pendidikan, jasa, retail, otomotif, hingga kesehatan.",
        canonicalPath: "/peluang-usaha/kategori/",
      })),
    )),
  );
}

export function renderCategoryLandingPage(entry: CategoryRouteEntry, allRows: FranchiseStaticRow[]) {
  const label = normalizeText(entry.label) || "Bisnis Umum";
  const introHtml = [
    `<p>Temukan ${escapeHtml(entry.rows.length)} peluang franchise kategori ${escapeHtml(label)}. Gunakan filter modal, status, dan pencarian brand agar pilihan lebih cepat mengerucut.</p>`,
    "<p>Daftar ini diperbarui berkala agar calon mitra bisa melihat pilihan yang lebih relevan dan pemilik brand punya ruang tampil yang lebih rapi.</p>",
  ].join("");
  return renderListingPage(allRows, {
    title: `Franchise ${label}`,
    description: `Cari peluang franchise kategori ${label}. Bandingkan modal, BEP, status listing, dan detail brand sebelum menghubungi franchisor.`,
    canonicalPath: entry.canonicalPath,
    rows: entry.rows,
    introHtml,
  });
}

export function renderCapitalIndexPage(rows: FranchiseStaticRow[]) {
  const template = readFileSync(LISTING_TEMPLATE_PATH, "utf8");
  const cards = getCapitalSummaries(rows).map((summary, index) => generateCapitalCard(summary, index + 1)).join("");
  const html = template
    .replace("<!-- DYNAMIC_FRANCHISE_LISTING -->", cards)
    .replace(
      '<div class="uc_post_grid_style_one " id="uc_post_grid_elementor_d0f4a5f">',
      `${generateDirectoryIntro({
        title: "Franchise Berdasarkan Modal",
        description: "Pilih peluang franchise berdasarkan kisaran modal investasi agar pencarian lebih sesuai budget.",
        canonicalPath: "/peluang-usaha/modal/",
        introHtml: capitalIndexCopy(rows),
      })}${generateFranchisorDirectoryCta()}<div class="uc_post_grid_style_one " id="uc_post_grid_elementor_d0f4a5f">`,
    );
  return normalizeGeneratedHtml(
    applySiteBranding(injectDirectoryAssets(
      applyCanonicalLegacyLinks(applyDirectoryMeta(html, {
        title: "Franchise Berdasarkan Modal",
        description: "Pilih peluang franchise berdasarkan kisaran modal investasi agar pencarian lebih sesuai budget.",
        canonicalPath: "/peluang-usaha/modal/",
      })),
    )),
  );
}

export function renderCapitalLandingPage(entry: ReturnType<typeof getCapitalRouteEntries>[number], allRows: FranchiseStaticRow[]) {
  return renderListingPage(allRows, {
    title: entry.label,
    description: entry.description,
    canonicalPath: entry.canonicalPath,
    rows: entry.rows,
    introHtml: capitalLandingCopy(entry),
  });
}

export function renderCityIndexPage(rows: FranchiseStaticRow[]) {
  const template = readFileSync(LISTING_TEMPLATE_PATH, "utf8");
  const cards = getCitySummaries(rows).map((summary, index) => generateCityCard(summary, index + 1)).join("");
  const html = template
    .replace("<!-- DYNAMIC_FRANCHISE_LISTING -->", cards)
    .replace(
      '<div class="uc_post_grid_style_one " id="uc_post_grid_elementor_d0f4a5f">',
      `${generateDirectoryIntro({
        title: "Franchise Berdasarkan Kota",
        description: "Temukan peluang franchise berdasarkan data kota, kantor, outlet, atau ekspansi yang tersedia di listing.",
        canonicalPath: "/peluang-usaha/kota/",
        introHtml: cityIndexCopy(rows),
      })}${generateFranchisorDirectoryCta()}<div class="uc_post_grid_style_one " id="uc_post_grid_elementor_d0f4a5f">`,
    );
  return normalizeGeneratedHtml(
    applySiteBranding(injectDirectoryAssets(
      applyCanonicalLegacyLinks(applyDirectoryMeta(html, {
        title: "Franchise Berdasarkan Kota",
        description: "Temukan peluang franchise berdasarkan data kota, kantor, outlet, atau ekspansi yang tersedia di listing.",
        canonicalPath: "/peluang-usaha/kota/",
      })),
    )),
  );
}

export function renderCityLandingPage(entry: CityRouteEntry, allRows: FranchiseStaticRow[]) {
  return renderListingPage(allRows, {
    title: `Peluang Franchise di ${entry.label}`,
    description: `Cari peluang franchise di ${entry.label}. Bandingkan modal, kategori, BEP, dan detail brand sebelum menghubungi franchisor.`,
    canonicalPath: entry.canonicalPath,
    rows: entry.rows,
    introHtml: cityLandingCopy(entry),
  });
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
    "{INTERNATIONAL_FACTS}": generateInternationalFacts(row),
    "{LONG_DESCRIPTION}": escapeHtml(description),
    "{LOGO_URL}": escapeAttr(logoUrl),
    "{HERO_IMAGE}": escapeAttr(heroImage),
    "{OG_IMAGE}": escapeAttr(ogImage),
    "{SEO_TITLE}": escapeHtml(seoTitle),
    "{SEO_DESCRIPTION}": escapeHtml(seoDescription),
    "{VERIFIED_ICON}": tier === "verified" || tier === "premium" ? '<i class="fas fa-check-circle franchise-verified-badge" aria-label="Brand terverifikasi"></i>' : "",
    "{TITLE_ACTIONS}": generateDetailTitleActions(row),
    "{DETAIL_QUICK_FACTS}": generateDetailQuickFacts(row, category, minimumModal, tier),
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
  html = applySiteBranding(html);

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
    <div id="uc_post_grid_elementor_d0f4a5f_item${index}" class="uc_post_grid_style_one_item ue_post_grid_item ue-item ${escapeAttr(statusKey)}-tier" data-franchise-card data-franchise-id="${escapeAttr(row.id)}" data-brand="${escapeAttr(brandName.toLowerCase())}" data-category="${escapeAttr(category.toLowerCase())}" data-category-slug="${escapeAttr(categorySlugValue)}" data-status="${escapeAttr(statusKey)}" data-modal="${escapeAttr(modalSort)}" data-recommendation-score="${escapeAttr(scoreRecommendation(row))}" data-popularity-score="${escapeAttr(scorePopularity(row))}" data-index="${escapeAttr(index)}">
        <a class="uc_post_grid_style_one_image" href="${escapeAttr(link)}">
            <div class="uc_post_image">
                ${imageBlock}
                <div class="uc_post_image_overlay"></div>
            </div>
        </a>
        ${generateSaveOpportunityButton(row, "card")}
        ${generateCompareButton(row, "card")}
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
                        <div class="uc_btn_inner"><div class="uc_btn_txt">Info Franchise</div></div>
                    </a>
                </div>
            </div>
        </div>
    </div>`;
}

function generateCompareButton(row: FranchiseStaticRow, variant: "card" | "detail" = "detail") {
  const brandName = normalizeBrandName(row.brand_name);
  const className = variant === "card" ? "fr-compare-button fr-compare-button--card" : "fr-compare-button fr-compare-button--detail";
  return `
    <span class="fr-compare-wrap fr-compare-wrap--${escapeAttr(variant)}">
      <button class="${className}" type="button" data-compare-franchise="${escapeAttr(row.id)}" data-compare-brand="${escapeAttr(brandName)}" aria-label="Bandingkan ${escapeAttr(brandName)}" data-fr-tooltip="Tambah ke perbandingan">
        <i class="fas fa-scale-balanced" aria-hidden="true"></i><span>Bandingkan</span>
      </button>
    </span>`;
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

function generateCapitalCard(summary: { label: string; shortLabel: string; count: number; canonicalPath: string }, index: number) {
  return `
    <div id="uc_post_grid_elementor_d0f4a5f_item${index}" class="uc_post_grid_style_one_item ue_post_grid_item ue-item category-directory-card">
        <a class="uc_post_grid_style_one_image" href="${escapeAttr(summary.canonicalPath)}">
            <div class="uc_post_image">
                ${generateCssPlaceholder(summary.shortLabel, "franchise-css-placeholder category-css-placeholder")}
                <div class="uc_post_image_overlay"></div>
            </div>
        </a>
        <div class="uc_content">
            <div class="uc_content_inner">
                <div class="uc_content-info-wrapper">
                    <div class="uc_post_title">
                        <a href="${escapeAttr(summary.canonicalPath)}" class="ue_p_title">${escapeHtml(summary.label)}</a>
                    </div>
                    <div class="ue-meta-data">
                        <span class="ue-grid-item-category">
                            <a href="${escapeAttr(summary.canonicalPath)}">${escapeHtml(summary.count)} franchise</a>
                        </span>
                    </div>
                    <div class="uc_post_text">Lihat peluang franchise dengan kisaran modal ${escapeHtml(summary.shortLabel)}.</div>
                </div>
                <div class="uc_post_button">
                    <a class="uc_more_btn" href="${escapeAttr(summary.canonicalPath)}">
                        <div class="uc_btn_inner"><div class="uc_btn_txt">Lihat Modal</div></div>
                    </a>
                </div>
            </div>
        </div>
    </div>`;
}

function generateCityCard(summary: { label: string; count: number; canonicalPath: string }, index: number) {
  return `
    <div id="uc_post_grid_elementor_d0f4a5f_item${index}" class="uc_post_grid_style_one_item ue_post_grid_item ue-item category-directory-card">
        <a class="uc_post_grid_style_one_image" href="${escapeAttr(summary.canonicalPath)}">
            <div class="uc_post_image">
                ${generateCssPlaceholder(summary.label, "franchise-css-placeholder category-css-placeholder")}
                <div class="uc_post_image_overlay"></div>
            </div>
        </a>
        <div class="uc_content">
            <div class="uc_content_inner">
                <div class="uc_content-info-wrapper">
                    <div class="uc_post_title">
                        <a href="${escapeAttr(summary.canonicalPath)}" class="ue_p_title">Franchise di ${escapeHtml(summary.label)}</a>
                    </div>
                    <div class="ue-meta-data">
                        <span class="ue-grid-item-category">
                            <a href="${escapeAttr(summary.canonicalPath)}">${escapeHtml(summary.count)} franchise</a>
                        </span>
                    </div>
                    <div class="uc_post_text">Lihat brand dengan data lokasi atau outlet terkait ${escapeHtml(summary.label)}.</div>
                </div>
                <div class="uc_post_button">
                    <a class="uc_more_btn" href="${escapeAttr(summary.canonicalPath)}">
                        <div class="uc_btn_inner"><div class="uc_btn_txt">Lihat Kota</div></div>
                    </a>
                </div>
            </div>
        </div>
    </div>`;
}

function generateDirectoryIntro(options?: DirectoryPageOptions) {
  if (!options?.introHtml) return "";
  return `<section class="franchise-directory-intro" aria-label="Panduan direktori">${options.introHtml}</section>`;
}

function generateFranchisorDirectoryCta() {
  return `
    <section class="fr-owner-cta fr-owner-cta--directory" aria-label="Untuk pemilik brand franchise">
      <div class="fr-owner-cta__content">
        <span class="fr-owner-cta__eyebrow">Punya brand franchise?</span>
        <h2>Tampilkan brand gratis, lalu tingkatkan saat siap menarik calon mitra.</h2>
        <p>Buat halaman brand agar orang lebih mudah memahami peluang Anda. Setelah data rapi, Premium membantu brand tampil lebih meyakinkan.</p>
      </div>
      <div class="fr-owner-cta__actions">
        <a class="fr-owner-cta__primary" href="/login/?mode=register&amp;role=franchisor&amp;next=%2Fdaftar%2F%3Frole%3Dfranchisor%26continue%3D1">Tampilkan Brand Gratis</a>
        <a class="fr-owner-cta__secondary" href="/premium/">Pelajari Premium</a>
      </div>
    </section>`;
}

function generateFranchisorDetailCta() {
  return `
            <section class="fr-owner-cta fr-owner-cta--detail" aria-label="Untuk pemilik brand franchise">
              <div class="fr-owner-cta__content">
                <span class="fr-owner-cta__eyebrow">Untuk pemilik brand</span>
                <h2>Ingin brand Anda lebih mudah dipercaya calon mitra?</h2>
                <p>Mulai dengan halaman brand gratis. Saat sudah siap menerima lebih banyak perhatian, aktifkan Premium agar langkah berikutnya lebih jelas bagi calon mitra.</p>
              </div>
              <div class="fr-owner-cta__actions">
                <a class="fr-owner-cta__primary" href="/login/?mode=register&amp;role=franchisor&amp;next=%2Fdaftar%2F%3Frole%3Dfranchisor%26continue%3D1">Mulai Gratis</a>
                <a class="fr-owner-cta__secondary" href="/premium/">Lihat Premium</a>
              </div>
            </section>`;
}

function generateSaveOpportunityButton(row: FranchiseStaticRow, variant: "card" | "detail" = "detail") {
  const wrapClass = variant === "card" ? "fr-save-opportunity-wrap fr-save-opportunity-wrap--card" : "fr-save-opportunity-wrap fr-save-opportunity-wrap--detail";
  const buttonClass =
    variant === "card"
      ? "fr-save-opportunity-button fr-save-opportunity-button--card"
      : "fr-save-opportunity-button fr-save-opportunity-button--detail";
  const labelClass = variant === "card" ? "fr-save-opportunity-label fr-save-opportunity-label--hidden" : "fr-save-opportunity-label";
  return `
    <span class="${wrapClass}" data-save-franchise-wrap>
      <button class="${buttonClass}" type="button" data-save-franchise="${escapeAttr(row.id)}" data-saved="false" aria-label="Simpan peluang" data-fr-tooltip="Simpan peluang">
        <i class="fas fa-bookmark" aria-hidden="true"></i><span class="${labelClass}">Simpan</span>
      </button>
    </span>`;
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
        <a href="/peluang-usaha/kategori/">Kategori</a>
        <a href="/peluang-usaha/modal/">Modal</a>
        <a href="/peluang-usaha/kota/">Kota</a>
        <a href="/alat-franchise/">Budget & BEP</a>
        <a href="/bandingkan">Bandingkan</a>
      </div>
      <p class="franchise-directory-result-count" aria-live="polite"></p>
    </form>`;
}

function generateStatusBadge(tier: string) {
  if (tier === "VERIFIED" || tier === "PREMIUM") {
    const label = tier === "PREMIUM" ? "Premium" : "Terverifikasi";
    const tip = tier === "PREMIUM" ? "Listing premium dengan informasi prioritas." : "Brand sudah diverifikasi oleh tim Franchisee.id.";
    return `<span class="franchise-status-badge franchise-status-verified" aria-label="${escapeAttr(label)}" data-fr-tooltip="${escapeAttr(tip)}"><i class="fas fa-check-circle" aria-hidden="true"></i><span>${escapeHtml(label)}</span></span>`;
  }

  if (tier === "UNCLAIMED") {
    return `<span class="franchise-status-badge franchise-status-unclaimed" aria-label="Belum diklaim" data-fr-tooltip="Data ini belum dikelola langsung oleh pemilik brand. Pemilik brand dapat klaim untuk memperbarui profil."><i class="fas fa-exclamation-circle" aria-hidden="true"></i><span>Belum diklaim</span></span>`;
  }

  return "";
}

function generateFactChips(row: FranchiseStaticRow, modal: string) {
  const origin = nonIndonesiaCountryDisplay(row.brand_country);
  const target = origin ? marketDisplay(row.target_market || "Indonesia") : "";
  const chips = [
    ["Modal", modal],
    row.estimated_bep_months ? ["BEP", `${row.estimated_bep_months} bulan`] : null,
    row.year_established ? ["Berdiri", String(row.year_established)] : null,
    origin ? ["Asal", origin] : null,
    target ? ["Target", target] : null,
  ].filter(Boolean) as [string, string][];

  return `<span class="franchise-card-facts">${chips
    .map(([label, value]) => `<span class="franchise-fact-chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></span>`)
    .join("")}</span>`;
}

function generateDetailTitleActions(row: FranchiseStaticRow) {
  return `
            <div class="franchise-detail-actions" aria-label="Aksi cepat">
                ${generateSaveOpportunityButton(row)}
                ${generateCompareButton(row)}
            </div>`;
}

function generateDetailQuickFacts(row: FranchiseStaticRow, category: string, modal: string, tier: string) {
  const origin = nonIndonesiaCountryDisplay(row.brand_country);
  const facts = [
    ["Modal", modal],
    ["Kategori", category],
    row.estimated_bep_months ? ["BEP", `${row.estimated_bep_months} bulan`] : null,
    origin ? ["Asal", origin] : null,
    [tier === "premium" ? "Status" : "Data", tier === "premium" ? "Premium" : tier === "verified" ? "Terverifikasi" : tier === "unclaimed" ? "Belum diklaim" : "Listing aktif"],
  ].filter(Boolean) as [string, string][];

  return `<div class="franchise-detail-quickfacts" aria-label="Ringkasan franchise">${facts
    .map(([label, value]) => `<span class="franchise-detail-quickfact"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>`)
    .join("")}</div>`;
}

function generateInternationalFacts(row: FranchiseStaticRow) {
  const origin = nonIndonesiaCountryDisplay(row.brand_country);
  if (!origin) return "";

  const target = marketDisplay(row.target_market || "Indonesia");
  const facts = [
    ["Asal Brand", origin],
    target ? ["Target Pasar", target] : null,
  ].filter(Boolean) as [string, string][];

  return facts
    .map(
      ([label, value]) => `
                                                            <div class="elementor-element elementor-widget elementor-widget-icon-box" data-element_type="widget" data-widget_type="icon-box.default">
																<div class="elementor-widget-container">
																	<div class="elementor-icon-box-wrapper">
																		<div class="elementor-icon-box-content">
																			<h6 class="elementor-icon-box-title"><span>${escapeHtml(label)}</span></h6>
																			<p class="elementor-icon-box-description">${escapeHtml(value)}</p>
																		</div>
																	</div>
																</div>
															</div>`,
    )
    .join("");
}

function nonIndonesiaCountryDisplay(value: unknown) {
  const country = normalizeCountryName(value);
  if (!country || country === "Indonesia") return "";
  return countryDisplay(country);
}

function marketDisplay(value: unknown) {
  const country = normalizeCountryName(value);
  return country ? countryDisplay(country) : normalizeText(value);
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
    <div id="claim-sticky-bar" class="fr-claim-sticky">
        <div class="fr-claim-sticky__copy">
            <strong>Apakah ini Bisnis Anda?</strong>
            <span>Klaim brand <strong>${escapeHtml(row.brand_name)}</strong> secara gratis untuk mengelola halaman ini.</span>
        </div>
        <a class="fr-claim-sticky__button" href="/daftar?claim=${escapeAttr(row.slug)}">Klaim Sekarang</a>
    </div>`;
}

function generateDisclaimer(row: FranchiseStaticRow) {
  return `
                <div class="disclaimer-box">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Halaman Belum Diklaim:</strong> Informasi ini dikumpulkan dari sumber publik dan belum dikelola langsung oleh pemilik brand.
                </div>`;
}

function generateTabs(row: FranchiseStaticRow, description: string, isUnclaimed: boolean) {
  const contact = generateContactBlock(row, isUnclaimed);
  const support = normalizeText(row.support_system);
  const tabEntries = [
    {
      label: "Profil",
      icon: "fa-store",
      content: `<div class="elementor-widget-container">${paragraphs(description)}</div>`,
    },
    {
      label: "Kontak",
      icon: "fa-address-book",
      content: `<div class="elementor-widget-container">${contact}</div>`,
    },
    ...(support
      ? [
          {
            label: "Support",
            icon: "fa-handshake-angle",
            content: `<div class="elementor-widget-container">${paragraphs(support)}</div>`,
          },
        ]
      : []),
    ...generatePremiumTabs(row),
  ];

  return `
            ${generatePremiumLeadPanel(row)}
            <div class="e-n-tabs" data-widget-number="26009074">
                <div class="e-n-tabs-heading" role="tablist">
                    ${tabEntries
                      .map(
                        (entry, index) =>
                          `<button class="e-n-tab-title" aria-selected="${index === 0 ? "true" : "false"}" data-tab-index="${index + 1}" role="tab"><i class="fas ${escapeAttr(entry.icon)}" aria-hidden="true"></i> ${escapeHtml(entry.label)}</button>`,
                      )
                      .join("")}
                </div>
                <div class="e-n-tabs-content">
                    ${tabEntries
                      .map(
                        (entry, index) =>
                          `<div class="e-n-tab-content ${index === 0 ? "e-active" : ""}" data-tab-index="${index + 1}">${entry.content}</div>`,
                      )
                      .join("")}
                </div>
            </div>
            ${generateFranchisorDetailCta()}`;
}

function applyDirectoryMeta(html: string, options?: DirectoryPageOptions) {
  if (!options) return html;
  const title = `${options.title} - Franchisee.id`;
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

function applySiteBranding(html: string) {
  return html
    .replace(/Franchise\.id/g, "Franchisee.id")
    .replace(/logo website franchise\.id white/g, "logo website Franchisee.id white")
    .replace(/email@franchise\.id/g, "email@franchisee.id");
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
    .replace(/href="\/category\/([^"#?]+)"/g, 'href="/peluang-usaha/kategori/$1"')
    .replace(/href="\/kategori\/([^"#?]+)"/g, 'href="/peluang-usaha/kategori/$1"');
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
