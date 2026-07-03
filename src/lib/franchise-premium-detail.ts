import type { D1FranchiseRow } from "./shared-schemas";
import {
  escapeAttr,
  escapeHtml,
  formatRupiah,
  normalizeBrandName,
  normalizeExternalUrl,
  normalizeText,
  normalizeUrl,
  slugify,
} from "./franchise-text";

export interface DetailTabEntry {
  label: string;
  icon: string;
  content: string;
}

export function isPremiumListing(row: D1FranchiseRow) {
  return normalizeText(row.verification_tier || row.status).toLowerCase() === "premium";
}

export function generatePremiumLeadPanel(row: D1FranchiseRow) {
  if (!isPremiumListing(row)) return "";
  const brandName = normalizeBrandName(row.brand_name);
  const whatsappUrl = whatsappHref(row.whatsapp || row.phone);
  const detailPath = `/peluang-usaha/${row.slug}`;
  const hasProposal = extractUrls(row.proposal_url).length > 0;

  return `
    <section class="fr-premium-lead-panel" aria-label="Aksi calon mitra">
      <div>
        <span class="fr-premium-eyebrow"><i class="fas fa-crown" aria-hidden="true"></i> Premium</span>
        <h2>Tertarik dengan ${escapeHtml(brandName)}?</h2>
        <p>Simpan peluang ini atau hubungi brand agar proses tanya jawab lebih mudah dilanjutkan.</p>
      </div>
      <div class="fr-premium-lead-actions">
        ${whatsappUrl ? `<a class="fr-premium-action is-whatsapp" href="${escapeAttr(whatsappUrl)}" target="_blank" rel="noopener noreferrer" data-product-event="contact_click" data-franchise-id="${escapeAttr(row.id)}" data-product-channel="premium_whatsapp"><i class="fab fa-whatsapp" aria-hidden="true"></i><span>WhatsApp</span></a>` : ""}
        <button class="fr-premium-action" type="button" data-create-franchise-inquiry="${escapeAttr(row.id)}" data-inquiry-brand="${escapeAttr(brandName)}"><i class="fas fa-paper-plane" aria-hidden="true"></i><span>Minta info</span></button>
        ${hasProposal ? `<a class="fr-premium-action is-secondary" href="${escapeAttr(detailPath)}#proposal"><i class="fas fa-file-lines" aria-hidden="true"></i><span>Lihat proposal</span></a>` : ""}
      </div>
    </section>`;
}

export function generatePremiumTabs(row: D1FranchiseRow): DetailTabEntry[] {
  const tabs: DetailTabEntry[] = [];
  const mediaTab = generateMediaTab(row);
  const proposalTab = generateProposalTab(row);
  const faqTab = generateFaqTab(row);

  if (mediaTab) tabs.push(mediaTab);
  if (proposalTab) tabs.push(proposalTab);
  if (isPremiumListing(row)) tabs.push(faqTab);
  return tabs;
}

function generateMediaTab(row: D1FranchiseRow): DetailTabEntry | null {
  if (!isPremiumListing(row)) return null;
  const brandName = normalizeBrandName(row.brand_name);
  const images = uniqueUrls([
    normalizeUrl(row.cover_url),
    normalizeUrl(row.logo_url),
    ...extractUrls(row.gallery_urls).filter(isImageUrl),
  ]);
  const videoUrl = normalizeExternalUrl(row.video_url);
  if (!images.length && !videoUrl) return null;

  const imageGrid = images.length
    ? `<div class="fr-premium-gallery">${images
        .map(
          (url, index) => `
            <figure>
              <img loading="lazy" src="${escapeAttr(url)}" alt="${escapeAttr(`${brandName} media ${index + 1}`)}">
            </figure>`,
        )
        .join("")}</div>`
    : "";
  const video = videoUrl
    ? `<p class="fr-premium-video-link"><a href="${escapeAttr(videoUrl)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-play" aria-hidden="true"></i> Buka video brand</a></p>`
    : "";

  return {
    label: "Galeri",
    icon: "fa-images",
    content: `<div class="fr-premium-tab-block"><h3>Media brand</h3><p>Foto dan materi visual untuk mengenal brand lebih cepat.</p>${imageGrid}${video}</div>`,
  };
}

function generateProposalTab(row: D1FranchiseRow): DetailTabEntry | null {
  const brandName = normalizeBrandName(row.brand_name);
  const urls = extractUrls(row.proposal_url);
  const imageUrls = uniqueUrls(urls.filter(isImageUrl));
  const pdfUrls = uniqueUrls(urls.filter(isPdfUrl));
  if (!imageUrls.length && !pdfUrls.length) return null;

  const encodedImages = escapeAttr(JSON.stringify(imageUrls));
  const directPdf = pdfUrls[0] || "";
  const pages = imageUrls.length
    ? `<div class="fr-proposal-pages">${imageUrls
        .map(
          (url, index) => `
            <figure class="fr-proposal-page">
              <img loading="lazy" src="${escapeAttr(url)}" alt="${escapeAttr(`${brandName} proposal halaman ${index + 1}`)}">
              <figcaption>Halaman ${index + 1}</figcaption>
            </figure>`,
        )
        .join("")}</div>`
    : "";
  const directLink = directPdf
    ? `<a class="fr-proposal-direct-link" href="${escapeAttr(directPdf)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-pdf" aria-hidden="true"></i> Buka PDF asli</a>`
    : "";
  const downloadButton = imageUrls.length
    ? `<button class="fr-proposal-download" type="button" data-proposal-pdf data-proposal-images="${encodedImages}" data-proposal-brand="${escapeAttr(slugify(brandName) || "proposal")}" data-franchise-id="${escapeAttr(row.id)}"><i class="fas fa-file-arrow-down" aria-hidden="true"></i><span>Download PDF</span></button>`
    : "";

  return {
    label: "Proposal",
    icon: "fa-file-lines",
    content: `
      <div class="fr-premium-tab-block fr-proposal-tab" id="proposal">
        <div class="fr-proposal-head">
          <div>
            <h3>Proposal ${escapeHtml(brandName)}</h3>
            <p>Baca ringkasan materi kemitraan, lalu download sebagai PDF bila ingin disimpan.</p>
          </div>
          ${downloadButton}
        </div>
        <div class="fr-proposal-status" data-proposal-status aria-live="polite"></div>
        ${directLink}
        ${pages || `<p class="fr-premium-muted">Proposal tersedia sebagai file PDF.</p>`}
      </div>`,
  };
}

function generateFaqTab(row: D1FranchiseRow): DetailTabEntry {
  const brandName = normalizeBrandName(row.brand_name);
  const investment = formatRupiah(row.total_investment_idr || row.min_investment_idr || row.package_price_idr || row.package_min_capital_idr);
  const category = normalizeText(row.category) || "kategori ini";
  const support = normalizeText(row.support_system);
  const faqItems = [
    ["Berapa estimasi modal awal?", investment === "Tanya Admin" ? "Modal belum ditampilkan lengkap. Gunakan tombol minta info untuk mendapatkan rincian terbaru dari brand." : `Estimasi modal yang tersedia mulai dari ${investment}.`],
    ["Cocok untuk siapa?", `${brandName} cocok dipertimbangkan oleh calon mitra yang mencari peluang di ${category}.`],
    ["Apa support yang diberikan?", support ? support.slice(0, 220) : "Detail support akan dijelaskan langsung oleh brand saat Anda meminta info."],
    ["Bagaimana langkah berikutnya?", "Simpan peluang ini, hubungi brand, atau minta info agar percakapan kemitraan bisa dilanjutkan dari profil Anda."],
  ];

  return {
    label: "FAQ",
    icon: "fa-circle-question",
    content: `<div class="fr-premium-tab-block"><h3>Pertanyaan umum</h3><div class="fr-premium-faq">${faqItems
      .map(([question, answer]) => `<article><h4>${escapeHtml(question)}</h4><p>${escapeHtml(answer)}</p></article>`)
      .join("")}</div></div>`,
  };
}

function extractUrls(value: unknown) {
  const text = decodeEntities(normalizeText(value));
  if (!text) return [];
  const fromJson = parseJsonUrls(text);
  const urlMatches = text.match(/https?:\/\/[^\s"'<>),]+/gi) || [];
  const srcMatches = [...text.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
  const lineValues = text.split(/[\n\r,]+/).map((item) => item.trim()).filter((item) => /^https?:\/\//i.test(item));
  return uniqueUrls([...fromJson, ...srcMatches, ...urlMatches, ...lineValues].map(cleanUrl));
}

function parseJsonUrls(text: string) {
  if (!/^\s*[\[{]/.test(text)) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.flatMap((item) => (typeof item === "string" ? [item] : item?.url ? [item.url] : []));
    if (parsed && typeof parsed === "object" && typeof parsed.url === "string") return [parsed.url];
  } catch (_error) {
    return [];
  }
  return [];
}

function cleanUrl(url: unknown) {
  return normalizeExternalUrl(
    normalizeText(url)
      .replace(/&quot;|&#34;/g, "")
      .replace(/&amp;/g, "&")
      .replace(/[)"'>]+$/g, ""),
  );
}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'");
}

function uniqueUrls(urls: string[]) {
  return [...new Set(urls.filter(Boolean))];
}

function isImageUrl(url: string) {
  return /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(url) || /blogger\.googleusercontent\.com|blogspot\.com/i.test(url);
}

function isPdfUrl(url: string) {
  return /\.pdf(?:[?#].*)?$/i.test(url);
}

function whatsappHref(value: unknown) {
  const text = normalizeText(value);
  if (!text) return "";
  const direct = normalizeExternalUrl(text);
  if (/wa\.me|api\.whatsapp\.com/i.test(direct)) return direct;
  const digits = text.replace(/[^\d]/g, "");
  if (!digits || digits.length < 8) return "";
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("62") ? digits : `62${digits}`;
  return `https://wa.me/${normalized}`;
}
