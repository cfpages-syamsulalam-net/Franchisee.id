import { generateDetailInfoPanel } from "./franchise-detail-summary";
import { generatePremiumTabs, type DetailTabEntry } from "./franchise-premium-detail";
import type { D1FranchiseRow } from "./shared-schemas";
import { escapeAttr, escapeHtml, formatRupiah, normalizeText, paragraphs } from "./franchise-text";

export interface DetailTabsOptions {
  description: string;
  contactHtml: string;
  logoUrl: string;
  category: string;
  minimumModal: string;
}

export function generateDetailTabEntries(row: D1FranchiseRow, options: DetailTabsOptions): DetailTabEntry[] {
  const support = normalizeText(row.support_system);
  return [
    {
      label: "Profil",
      icon: "fa-store",
      content: generateDetailInfoPanel(row, options.logoUrl, options.category, options.minimumModal),
    },
    {
      label: "Detail",
      icon: "fa-info-circle",
      content: `<section class="fr-detail-tab-block fr-detail-copy"><h3><i class="fas fa-info-circle" aria-hidden="true"></i> Tentang ${escapeHtml(row.brand_name)}</h3>${paragraphs(options.description)}</section>`,
    },
    {
      label: "Investasi",
      icon: "fa-coins",
      content: generateInvestmentTab(row, options.minimumModal),
    },
    ...(support
      ? [
          {
            label: "Support",
            icon: "fa-handshake-angle",
            content: `<section class="fr-detail-tab-block fr-detail-copy"><h3><i class="fas fa-handshake-angle" aria-hidden="true"></i> Support Franchisor</h3>${paragraphs(support)}</section>`,
          },
        ]
      : []),
    ...generatePremiumTabs(row),
    {
      label: "Kontak",
      icon: "fa-address-book",
      content: `<div class="elementor-widget-container">${options.contactHtml}</div>`,
    },
  ];
}

export function renderDetailTabsShell(tabEntries: DetailTabEntry[]) {
  return `
            <div class="e-n-tabs" data-widget-number="26009074">
                <div class="e-n-tabs-heading" role="tablist">
                    ${tabEntries
                      .map(
                        (entry, index) =>
                          `<button class="e-n-tab-title" aria-selected="${index === 0 ? "true" : "false"}" data-tab-index="${index + 1}" role="tab"><i class="fas ${escapeAttr(entry.icon)}" aria-hidden="true"></i><span>${escapeHtml(entry.label)}</span></button>`,
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
            </div>`;
}

function generateInvestmentTab(row: D1FranchiseRow, minimumModal: string) {
  const items = [
    ["fa-coins", "Modal Minimal", minimumModal],
    ["fa-file-invoice-dollar", "Franchise Fee", formatRupiah(row.fee_license_idr)],
    row.fee_capex_idr ? ["fa-boxes-stacked", "Paket Peralatan", formatRupiah(row.fee_capex_idr)] : null,
    row.fee_construction_idr ? ["fa-hammer", "Renovasi / Booth", formatRupiah(row.fee_construction_idr)] : null,
    row.working_capital_idr ? ["fa-wallet", "Modal Kerja Awal", formatRupiah(row.working_capital_idr)] : null,
    ["fa-percent", "Biaya Royalti", formatRoyaltyInfo(row)],
    ["fa-chart-line", "Estimasi BEP", bepText(row)],
    row.omzet_monthly_idr ? ["fa-sack-dollar", "Estimasi Omzet", `${formatRupiah(row.omzet_monthly_idr)} / bulan`] : null,
    rangeText(row.omzet_monthly_min_idr, row.omzet_monthly_max_idr, formatRupiah) ? ["fa-sack-dollar", "Range Omzet", `${rangeText(row.omzet_monthly_min_idr, row.omzet_monthly_max_idr, formatRupiah)} / bulan`] : null,
    row.net_profit_percent ? ["fa-chart-line", "Estimasi Laba Bersih", `${formatPercent(row.net_profit_percent)}`] : null,
    rangeText(row.net_profit_monthly_min_idr, row.net_profit_monthly_max_idr, formatRupiah) ? ["fa-chart-line", "Range Laba Bersih", `${rangeText(row.net_profit_monthly_min_idr, row.net_profit_monthly_max_idr, formatRupiah)} / bulan`] : null,
  ].filter(Boolean) as [string, string, string][];
  const notes = normalizeText(row.additional_cost_notes);

  return `<section class="fr-detail-tab-block">
    <h3><i class="fas fa-coins" aria-hidden="true"></i> Ringkasan investasi</h3>
    <p>Gunakan angka ini sebagai titik awal perbandingan. Detail final tetap perlu dikonfirmasi ke franchisor.</p>
    <div class="fr-detail-tab-cards">${items.map(([icon, label, value]) => tabInfoCard(icon, label, value)).join("")}</div>
    ${notes ? `<div class="fr-detail-tab-note"><strong>Catatan biaya tambahan:</strong> ${escapeHtml(notes)}</div>` : ""}
  </section>`;
}

function tabInfoCard(icon: string, label: string, value: string) {
  const normalized = normalizeText(value);
  const valueMarkup =
    normalized.toLowerCase() === "tanya admin" || normalized.toLowerCase() === "hubungi admin"
      ? `<button class="franchise-info-value franchise-info-value--contact" type="button" data-open-contact-tab data-fr-tooltip="Buka tab Kontak untuk meminta info ${escapeAttr(label.toLowerCase())}."><strong>${escapeHtml(normalized)}</strong><i class="fas fa-arrow-down" aria-hidden="true"></i></button>`
      : `<strong>${escapeHtml(normalized)}</strong>`;
  return `<article class="fr-detail-tab-card"><span><i class="fas ${escapeAttr(icon)}" aria-hidden="true"></i></span><div><small>${escapeHtml(label)}</small>${valueMarkup}</div></article>`;
}

function formatRoyaltyInfo(row: D1FranchiseRow) {
  if (row.royalty_basis === "none") return "Tidak ada royalti";
  if (!Number.isFinite(row.royalty_percent ?? NaN)) return "Tanya Admin";
  const basis = normalizeText(row.royalty_basis);
  return `${formatPercent(row.royalty_percent)}${basis ? ` dari ${basis}` : ""}`;
}

function formatPercent(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) return "Tanya Admin";
  return `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

function bepText(row: D1FranchiseRow) {
  const range = rangeText(row.estimated_bep_min_months, row.estimated_bep_max_months, (value) => `${value} bulan`);
  if (range) return range;
  return row.estimated_bep_months ? `${row.estimated_bep_months} bulan` : "Tanya Admin";
}

function rangeText(min: number | null | undefined, max: number | null | undefined, formatter: (value: number | null | undefined) => string) {
  const hasMin = Number.isFinite(min ?? NaN) && Number(min) > 0;
  const hasMax = Number.isFinite(max ?? NaN) && Number(max) > 0;
  if (hasMin && hasMax && Number(min) !== Number(max)) return `${formatter(min)} - ${formatter(max)}`;
  if (hasMin) return formatter(min);
  if (hasMax) return formatter(max);
  return "";
}
