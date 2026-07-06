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
    detailInfoItem("fa-tags", "Kategori Franchise", category),
    detailInfoItem("fa-file-invoice-dollar", "Franchise Fee", formatRupiah(row.fee_license_idr)),
    detailInfoItem("fa-building", "Nama Perusahaan", normalizeCompanyName(row.company_name) || "Hubungi Admin"),
    detailInfoItem("fa-percent", "Biaya Royalti", formatRoyalty(row)),
    detailInfoItem("fa-calendar-days", "Berdiri Sejak", row.year_established ? String(row.year_established) : "-"),
    detailInfoItem("fa-bullhorn", "Biaya Advertising", "Tanya Admin"),
    detailInfoItem("fa-location-dot", "Gerai / Area", normalizeText(row.outlets_location) || normalizeText(row.city_origin) || "-"),
    detailInfoItem("fa-chart-line", "Estimasi BEP", row.estimated_bep_months ? `${row.estimated_bep_months} bulan` : "Tanya Admin"),
    origin ? detailInfoItem("fa-flag", "Asal Brand", origin) : "",
    target ? detailInfoItem("fa-bullseye", "Target Pasar", target) : "",
    normalizeText(row.outlet_type) ? detailInfoItem("fa-shop", "Tipe Outlet", normalizeText(row.outlet_type)) : "",
    normalizeText(row.location_requirement) ? detailInfoItem("fa-ruler-combined", "Kriteria Lokasi", truncate(normalizeText(row.location_requirement), 120)) : "",
    row.contract_duration_months ? detailInfoItem("fa-file-signature", "Durasi Kontrak", formatMonths(row.contract_duration_months)) : "",
    row.omzet_monthly_idr ? detailInfoItem("fa-sack-dollar", "Estimasi Omzet", `${formatRupiah(row.omzet_monthly_idr)} / bulan`) : "",
    row.net_profit_percent ? detailInfoItem("fa-arrow-trend-up", "Estimasi Laba Bersih", `${formatPercent(row.net_profit_percent)}`) : "",
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

function detailInfoItem(icon: string, label: string, value: string) {
  return `<article class="franchise-info-item">
																	<span class="franchise-info-item__icon"><i class="fas ${escapeAttr(icon)}" aria-hidden="true"></i></span>
																	<span class="franchise-info-item__body"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>
																</article>`;
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
