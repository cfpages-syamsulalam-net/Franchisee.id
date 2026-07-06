import type { FranchiseStaticRow } from "./franchise-static";
import { getCapitalSummaries, budgetRecommendationLabel, getComparableCapital } from "./franchise-capital";
import { getCategorySummaries, canonicalCategoryHref } from "./franchise-category";
import { getCitySummaries, primaryCityLabel } from "./franchise-city";
import {
  escapeAttr,
  escapeHtml,
  formatRupiah,
  getThumb,
  normalizeBrandName,
  normalizeDescriptionText,
  normalizeText,
  slugify,
  truncate,
} from "./franchise-text";

export function renderComparisonPage(rows: FranchiseStaticRow[]) {
  const payload = comparisonPayload(rows);
  return basePage({
    title: "Bandingkan Franchise",
    description: "Bandingkan modal, kategori, BEP, royalty, dan informasi penting beberapa peluang franchise sebelum menghubungi franchisor.",
    canonicalPath: "/bandingkan",
    bodyClass: "fr-buyer-page",
    body: `
      <main class="fr-tool-shell">
        <section class="fr-tool-hero">
          <span class="fr-tool-kicker">Bandingkan</span>
          <h1>Bandingkan peluang franchise sebelum memilih.</h1>
          <p>Pilih 2 sampai 4 brand, lalu lihat perbedaan modal, kategori, BEP, royalty, dan link detailnya dalam satu tabel.</p>
        </section>
        <section class="fr-tool-panel">
          <div class="fr-compare-picker">
            <label><span>Tambah brand</span><select data-compare-select><option value="">Pilih brand</option>${payload
              .map((row) => `<option value="${escapeAttr(row.id)}">${escapeHtml(row.brand)}</option>`)
              .join("")}</select></label>
            <button type="button" data-compare-add><i class="fas fa-plus" aria-hidden="true"></i><span>Tambah</span></button>
            <a class="fr-tool-secondary" href="/peluang-usaha">Cari listing</a>
          </div>
          <div class="fr-compare-empty" data-compare-empty>Pilih brand dari direktori atau dari kolom di atas untuk mulai membandingkan.</div>
          <div class="fr-compare-table-wrap" data-compare-table></div>
        </section>
      </main>
      <script type="application/json" id="franchise-compare-data">${safeJson(payload)}</script>
      <script src="/js/franchise-compare.js" is:inline></script>
    `,
  });
}

export function renderBuyerToolsPage(rows: FranchiseStaticRow[]) {
  const payload = comparisonPayload(rows);
  const categories = getCategorySummaries(rows).slice(0, 14);
  const capitalSummaries = getCapitalSummaries(rows);
  const citySummaries = getCitySummaries(rows).slice(0, 14);
  return basePage({
    title: "Alat Bantu Pilih Franchise",
    description: "Gunakan budget matcher dan kalkulator BEP untuk menyaring peluang franchise berdasarkan modal, omzet, biaya, dan estimasi balik modal.",
    canonicalPath: "/alat-franchise",
    bodyClass: "fr-buyer-page",
    body: `
      <main class="fr-tool-shell">
        <section class="fr-tool-hero">
          <span class="fr-tool-kicker">Buyer Tools</span>
          <h1>Cari franchise sesuai budget dan hitung estimasi BEP.</h1>
          <p>Masukkan budget Anda untuk melihat listing yang masuk kisaran modal, lalu gunakan kalkulator BEP sebagai simulasi awal sebelum bertanya ke franchisor.</p>
        </section>
        <section class="fr-tool-grid">
          <article class="fr-tool-panel">
            <h2>Budget matcher</h2>
            <label><span>Budget investasi</span><input type="number" inputmode="numeric" min="0" step="1000000" placeholder="Contoh: 50000000" data-budget-input></label>
            <div class="fr-tool-actions">
              <button type="button" data-budget-match><i class="fas fa-filter" aria-hidden="true"></i><span>Cari yang cocok</span></button>
              <a class="fr-tool-secondary" href="/peluang-usaha/modal/">Lihat semua modal</a>
            </div>
            <div data-budget-result class="fr-tool-result"></div>
          </article>
          <article class="fr-tool-panel">
            <h2>Kalkulator BEP</h2>
            <div class="fr-bep-grid">
              <label><span>Modal awal</span><input type="number" min="0" step="1000000" placeholder="75000000" data-bep-investment></label>
              <label><span>Omzet per bulan</span><input type="number" min="0" step="1000000" placeholder="30000000" data-bep-revenue></label>
              <label><span>Margin bersih %</span><input type="number" min="0" max="100" step="1" placeholder="20" data-bep-margin></label>
              <label><span>Biaya tetap per bulan</span><input type="number" min="0" step="500000" placeholder="3000000" data-bep-fixed></label>
            </div>
            <button type="button" data-bep-calculate><i class="fas fa-calculator" aria-hidden="true"></i><span>Hitung BEP</span></button>
            <div data-bep-result class="fr-tool-result"></div>
          </article>
        </section>
        <section class="fr-tool-panel">
          <h2>Jalur cepat</h2>
          <div class="fr-tool-link-grid">
            ${capitalSummaries.map((item) => `<a href="${escapeAttr(item.canonicalPath)}"><strong>${escapeHtml(item.shortLabel)}</strong><span>${escapeHtml(item.count)} listing</span></a>`).join("")}
            ${categories.map((item) => `<a href="${escapeAttr(canonicalCategoryHref(item.slug))}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.count)} listing</span></a>`).join("")}
            ${citySummaries.map((item) => `<a href="${escapeAttr(item.canonicalPath)}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.count)} listing</span></a>`).join("")}
          </div>
        </section>
      </main>
      <script type="application/json" id="franchise-tool-data">${safeJson(payload)}</script>
      <script>window.FranchiseBudgetRange = ${safeJson({})};</script>
      <script src="/js/franchise-buyer-tools.js" is:inline></script>
    `,
  });
}

function comparisonPayload(rows: FranchiseStaticRow[]) {
  return rows.map((row) => {
    const capital = getComparableCapital(row);
    return {
      id: row.id,
      slug: row.slug,
      brand: normalizeBrandName(row.brand_name),
      category: normalizeText(row.category) || "Bisnis Umum",
      capital,
      capitalLabel: formatRupiah(capital),
      bep: row.estimated_bep_months ? `${row.estimated_bep_months} bulan` : "Tanya Admin",
      royalty: row.royalty_percent ? `${row.royalty_percent}%` : "Tanya Admin",
      city: primaryCityLabel(row) || normalizeText(row.city_origin) || "-",
      status: normalizeText(row.verification_tier || row.status) || "free",
      description: truncate(normalizeDescriptionText(row.short_desc || row.full_desc, row.brand_name) || `Peluang franchise ${normalizeBrandName(row.brand_name)}.`, 120),
      image: getThumb(row.cover_url || row.logo_url),
      href: `/peluang-usaha/${row.slug}`,
      budgetHref: budgetRecommendationLabel(capital)?.href || "/peluang-usaha",
    };
  }).filter((row) => row.brand).sort((a, b) => a.brand.localeCompare(b.brand, "id-ID"));
}

function basePage(options: { title: string; description: string; canonicalPath: string; bodyClass: string; body: string }) {
  const title = `${options.title} | Franchisee.id`;
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttr(options.description)}">
    <link rel="canonical" href="${escapeAttr(options.canonicalPath)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeAttr(title)}">
    <meta property="og:description" content="${escapeAttr(options.description)}">
    <meta property="og:url" content="${escapeAttr(options.canonicalPath)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(title)}">
    <meta name="twitter:description" content="${escapeAttr(options.description)}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="/css/franchise-buyer-tools.css">
  </head>
  <body class="${escapeAttr(options.bodyClass)}">
    <header class="fr-tool-header">
      <a class="fr-tool-brand" href="/">Franchisee.id</a>
      <nav aria-label="Navigasi utama">
        <a href="/peluang-usaha">Peluang Usaha</a>
        <a href="/peluang-usaha/modal/">Modal</a>
        <a href="/peluang-usaha/kategori/">Kategori</a>
        <a href="/bandingkan">Bandingkan</a>
        <a href="/premium/">Premium</a>
      </nav>
    </header>
    ${options.body}
  </body>
</html>`;
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function toolSlug(value: unknown) {
  return slugify(normalizeText(value));
}
