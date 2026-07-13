import type { D1FranchiseRow } from "./shared-schemas";
import { countryDisplay, normalizeCountryName } from "./country-metadata";
import { generateCssPlaceholder } from "./franchise-static-assets";
import {
  escapeAttr,
  escapeHtml,
  formatRupiah,
  normalizeBrandName,
  normalizeCompanyName,
  normalizeExternalUrl,
  normalizeText,
  slugify,
  truncate,
} from "./franchise-text";

export function generateDetailQuickFacts(row: D1FranchiseRow, tier: string) {
  const origin = nonIndonesiaCountryDisplay(row.brand_country);
  const target = origin ? marketDisplay(row.target_market || "Indonesia") : "";
  const facts = [
    row.estimated_bep_months ? ["BEP", `${row.estimated_bep_months} bulan`] : null,
    origin ? ["Asal", origin] : null,
    target ? ["Target", target] : null,
    tier === "premium" ? ["Status", "Premium"] : tier === "verified" ? ["Status", "Terverifikasi"] : null,
  ].filter(Boolean) as [string, string][];

  if (!facts.length) return "";

  return `<div class="franchise-detail-quickfacts" aria-label="Ringkasan franchise">${facts
    .map(([label, value]) => `<span class="franchise-detail-quickfact"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>`)
    .join("")}</div>`;
}

export function generateDetailInfoPanel(row: D1FranchiseRow, logoUrl: string, category: string, minimumModal: string) {
  const brandName = normalizeBrandName(row.brand_name);
  const origin = nonIndonesiaCountryDisplay(row.brand_country);
  const target = origin ? marketDisplay(row.target_market || "Indonesia") : "";
  const support = normalizeText(row.support_system);
  const fields = [
    detailInfoItem("fa-store", "Nama Franchise", brandName),
    detailInfoItem("fa-coins", "Modal Minimal", minimumModal),
    detailInfoItem("fa-tags", "Kategori Franchise", category, {
      href: `/peluang-usaha?kategori=${slugify(category)}`,
      tooltip:
        "Kelompok usaha brand ini. Klik untuk melihat peluang franchise lain di kategori yang sama.",
    }),
    detailInfoItem("fa-file-invoice-dollar", "Biaya Kemitraan Awal", formatRupiah(row.fee_license_idr)),
    detailInfoItem("fa-building", "Nama Perusahaan", normalizeCompanyName(row.company_name) || "Hubungi Admin"),
    detailInfoItem("fa-percent", "Biaya Royalti", formatRoyalty(row)),
    detailInfoItem("fa-calendar-alt", "Berdiri Sejak", row.year_established ? String(row.year_established) : "-"),
    detailInfoItem("fa-bullhorn", "Biaya Advertising", "Tanya Admin"),
    detailInfoItem("fa-map-marker-alt", "Gerai / Area", normalizeText(row.outlets_location) || normalizeText(row.city_origin) || "-"),
    detailInfoItem("fa-chart-line", "Estimasi BEP", row.estimated_bep_months ? `${row.estimated_bep_months} bulan` : "Tanya Admin"),
    origin ? detailInfoItem("fa-flag", "Asal Brand", origin) : "",
    target ? detailInfoItem("fa-bullseye", "Target Pasar", target) : "",
    normalizeText(row.outlet_type) ? detailInfoItem("fa-shop", "Tipe Outlet", normalizeText(row.outlet_type)) : "",
    normalizeText(row.location_requirement) ? detailInfoItem("fa-ruler-combined", "Kriteria Lokasi", truncate(normalizeText(row.location_requirement), 120)) : "",
    row.min_area_sqm ? detailInfoItem("fa-ruler-combined", "Luas Minimum", `${row.min_area_sqm} m²`) : "",
    row.min_staff_count ? detailInfoItem("fa-users-gear", "Staff Minimum", `${row.min_staff_count} orang`) : "",
    row.setup_duration_days ? detailInfoItem("fa-screwdriver-wrench", "Estimasi Setup", `${row.setup_duration_days} hari`) : "",
    row.contract_duration_months ? detailInfoItem("fa-file-signature", "Durasi Kontrak", formatMonths(row.contract_duration_months)) : "",
    row.omzet_monthly_idr ? detailInfoItem("fa-sack-dollar", "Estimasi Omzet", `${formatRupiah(row.omzet_monthly_idr)} / bulan`) : "",
    rangeText(row.omzet_monthly_min_idr, row.omzet_monthly_max_idr, formatRupiah) ? detailInfoItem("fa-sack-dollar", "Range Omzet", `${rangeText(row.omzet_monthly_min_idr, row.omzet_monthly_max_idr, formatRupiah)} / bulan`) : "",
    row.net_profit_percent ? detailInfoItem("fa-chart-line", "Estimasi Laba Bersih", `${formatPercent(row.net_profit_percent)}`) : "",
    rangeText(row.net_profit_monthly_min_idr, row.net_profit_monthly_max_idr, formatRupiah) ? detailInfoItem("fa-chart-line", "Range Laba Bersih", `${rangeText(row.net_profit_monthly_min_idr, row.net_profit_monthly_max_idr, formatRupiah)} / bulan`) : "",
    support ? detailInfoItem("fa-handshake-angle", "Support Franchisor", truncate(support, 140)) : "",
  ].filter(Boolean);
  const logo = logoUrl
    ? `<img decoding="async" loading="lazy" src="${escapeAttr(logoUrl)}" alt="${escapeAttr(`Logo ${brandName}`)}">`
    : generateCssPlaceholder(brandName, "franchise-css-placeholder franchise-info-logo-placeholder");
  const socialLinks = generateDetailSocialLinks(row);

  return `
														<section class="franchise-info-panel" aria-label="Informasi utama ${escapeAttr(brandName)}">
															<div class="franchise-info-brand-card">
																<div class="franchise-info-logo-card">
																	${logo}
																</div>
																${socialLinks}
															</div>
															<div class="franchise-info-grid">
																${fields.join("")}
															</div>
														</section>`;
}

function detailInfoItem(icon: string, label: string, value: string, options: { href?: string; tooltip?: string } = {}) {
  const tooltip = options.tooltip || infoTooltip(label);
  const valueMarkup = renderInfoValue(label, value, options.href);
  return `<article class="franchise-info-item">
																	<span class="franchise-info-item__icon"><i class="fas ${escapeAttr(icon)}" aria-hidden="true"></i></span>
																	<span class="franchise-info-item__body"><small>${escapeHtml(label)}${tooltip ? ` <span class="franchise-info-help" aria-label="Info ${escapeAttr(label)}" data-fr-tooltip="${escapeAttr(tooltip)}"><i class="fas fa-question-circle" aria-hidden="true"></i></span>` : ""}</small>${valueMarkup}</span>
																</article>`;
}

function renderInfoValue(label: string, value: string, href?: string) {
  const normalized = normalizeText(value);
  if (href) {
    return `<a class="franchise-info-value franchise-info-value--link" href="${escapeAttr(href)}"><strong>${escapeHtml(normalized)}</strong></a>`;
  }
  if (isContactPlaceholder(normalized)) {
    return `<button class="franchise-info-value franchise-info-value--contact" type="button" data-open-contact-tab data-fr-tooltip="Buka tab Kontak untuk meminta info ${escapeAttr(label.toLowerCase())}."><strong>${escapeHtml(normalized)}</strong><i class="fas fa-arrow-down" aria-hidden="true"></i></button>`;
  }
  return `<strong class="franchise-info-value">${escapeHtml(normalized)}</strong>`;
}

function isContactPlaceholder(value: string) {
  const normalized = value.toLowerCase();
  return normalized === "tanya admin" || normalized === "hubungi admin";
}

function infoTooltip(label: string) {
  const tips: Record<string, string> = {
    "Nama Franchise": "Nama brand atau peluang usaha yang ditawarkan.",
    "Modal Minimal": "Perkiraan dana awal paling rendah untuk mulai menjadi mitra. Angka ini bisa mencakup paket, peralatan, bahan awal, atau kebutuhan outlet tergantung brand.",
    "Kategori Franchise": "Jenis usaha brand, misalnya makanan, minuman, pendidikan, laundry, atau jasa. Kategori membantu Anda membandingkan brand sejenis.",
    "Biaya Kemitraan Awal": "Biaya awal untuk memakai merek, sistem, panduan operasional, atau hak kemitraan dari franchisor. Sebagian brand menyebutnya franchise fee, license fee, biaya lisensi, biaya franchise, biaya kemitraan, biaya join, atau joining fee.",
    "Nama Perusahaan": "Badan usaha atau pengelola resmi di balik brand.",
    "Biaya Royalti": "Biaya berkala yang biasanya dibayar mitra kepada franchisor. Bisa berupa persentase omzet, persentase profit, nominal tetap, atau tidak ada royalti.",
    "Berdiri Sejak": "Tahun brand mulai beroperasi. Brand yang lebih lama biasanya punya pengalaman operasional lebih banyak, tetapi tetap perlu dicek kualitas sistemnya.",
    "Biaya Advertising": "Kontribusi untuk promosi bersama, materi marketing, campaign brand, atau aktivitas pemasaran lain jika diwajibkan.",
    "Gerai / Area": "Lokasi outlet yang sudah ada, asal brand, atau area ekspansi yang disebut dalam data listing.",
    "Estimasi BEP": "Perkiraan waktu balik modal. Ini bukan jaminan hasil, karena performa tetap dipengaruhi lokasi, operasional, biaya, dan penjualan.",
    "Asal Brand": "Negara asal brand. Brand non-Indonesia tetap bisa mencari mitra di Indonesia.",
    "Target Pasar": "Negara atau wilayah yang menjadi sasaran ekspansi brand.",
    "Tipe Outlet": "Format operasional yang ditawarkan, misalnya booth, gerobak, ruko, dine-in, cloud kitchen, atau model lain.",
    "Kriteria Lokasi": "Syarat lokasi yang biasanya dibutuhkan agar outlet berpeluang berjalan baik.",
    "Luas Minimum": "Estimasi luas minimum area outlet yang dibutuhkan.",
    "Staff Minimum": "Jumlah tim awal yang disarankan untuk menjalankan operasional.",
    "Estimasi Setup": "Perkiraan waktu persiapan sampai outlet siap beroperasi.",
    "Durasi Kontrak": "Masa kerja sama lisensi/kemitraan sebelum perlu diperpanjang.",
    "Estimasi Omzet": "Perkiraan penjualan kotor sebelum dikurangi biaya. Ini berbeda dari laba bersih.",
    "Range Omzet": "Kisaran penjualan kotor bulanan yang disebutkan pemilik brand atau brosur. Angka tetap perlu dikonfirmasi.",
    "Estimasi Laba Bersih": "Perkiraan persentase keuntungan setelah biaya utama. Angka ini tetap perlu divalidasi dengan franchisor.",
    "Range Laba Bersih": "Kisaran laba bersih bulanan yang disebutkan pemilik brand atau brosur. Angka tetap perlu dikonfirmasi.",
    "Support Franchisor": "Bentuk dukungan dari franchisor, misalnya training, SOP, supply bahan, marketing, atau bantuan pembukaan outlet.",
  };
  return tips[label] || "";
}

function generateDetailSocialLinks(row: D1FranchiseRow) {
  const links = [
    ["Website", "fas fa-globe", row.website_url],
    ["Instagram", "fab fa-instagram", row.instagram_url],
    ["Facebook", "fab fa-facebook-f", row.facebook_url],
    ["TikTok", "fab fa-tiktok", row.tiktok_url],
    ["YouTube", "fab fa-youtube", row.youtube_url],
    ["LinkedIn", "fab fa-linkedin-in", row.linkedin_url],
  ]
    .map(([label, icon, url]) => ({ label, icon, url: normalizeExternalUrl(url) }))
    .filter((item) => item.url);

  if (!links.length) return "";

  return `<div class="franchise-info-social" aria-label="Kanal resmi brand">${links
    .map(
      (item) =>
        `<a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(item.label)}" data-fr-tooltip="${escapeAttr(item.label)}"><i class="${escapeAttr(item.icon)}" aria-hidden="true"></i></a>`,
    )
    .join("")}</div>`;
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

function formatRoyalty(row: D1FranchiseRow) {
  if (row.royalty_basis === "none") return "Tidak ada royalti";
  if (!Number.isFinite(row.royalty_percent ?? NaN)) return "Tanya Admin";
  const basis = normalizeText(row.royalty_basis);
  return `${formatPercent(row.royalty_percent)}${basis ? ` dari ${basis}` : ""}`;
}

function formatPercent(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) return "Tanya Admin";
  return `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

function formatMonths(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return "-";
  if (value % 12 === 0) return `${value / 12} tahun`;
  return `${value} bulan`;
}

function rangeText(min: number | null | undefined, max: number | null | undefined, formatter: (value: number | null | undefined) => string) {
  const hasMin = Number.isFinite(min ?? NaN) && Number(min) > 0;
  const hasMax = Number.isFinite(max ?? NaN) && Number(max) > 0;
  if (hasMin && hasMax && Number(min) !== Number(max)) return `${formatter(min)} - ${formatter(max)}`;
  if (hasMin) return formatter(min);
  if (hasMax) return formatter(max);
  return "";
}
