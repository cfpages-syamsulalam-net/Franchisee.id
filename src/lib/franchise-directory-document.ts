import { canonicalCategoryHref } from "./franchise-category";
import type { FranchiseCategoryContent } from "./franchise-category-content";
import type { DirectoryPageOptions } from "./franchise-directory-types";
import type { D1FranchiseRow } from "./shared-schemas";
import { escapeAttr, escapeHtml, normalizeBrandName } from "./franchise-text";

export function prepareDirectoryTemplate(html: string) {
  return html.replace(
    /\s*<section class="[^"]*elementor-element-9hd9if8[\s\S]*?<\/section>/,
    "",
  );
}

export function renderCategoryEditorialContent(content: FranchiseCategoryContent) {
  const paragraphs = content.introParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  const decisionPoints = content.decisionPoints
    .map(
      (point) =>
        `<li><strong>${escapeHtml(point.title)}</strong><span>${escapeHtml(point.description)}</span></li>`,
    )
    .join("");
  const relatedCategories = content.relatedCategorySlugs
    .map((slug) => `<a href="${escapeAttr(canonicalCategoryHref(slug))}">${escapeHtml(categoryLabelFromSlug(slug))}</a>`)
    .join("");
  const internalLinks = content.internalLinks
    .map((link) => `<a href="${escapeAttr(link.href)}">${escapeHtml(link.label)}</a>`)
    .join("");

  return `
    <div class="fr-category-guide">
      <div class="fr-category-guide__header">
        <span>${escapeHtml(content.count)} peluang dalam kategori ini</span>
        <h2>Cara membandingkan franchise ${escapeHtml(content.label)}</h2>
      </div>
      ${paragraphs}
      <ul class="fr-category-decision-list">${decisionPoints}</ul>
      <nav class="fr-category-related-links" aria-label="Panduan dan kategori terkait">${internalLinks}${relatedCategories}</nav>
      <div class="fr-buyer-cta">
        <div>
          <strong>Ingin menyimpan dan membandingkan pilihan?</strong>
          <span>Buat akun franchisee agar brand yang Anda pertimbangkan mudah ditemukan kembali.</span>
        </div>
        <a href="/login/?mode=register&amp;role=franchisee&amp;next=%2Fpeluang-usaha">Daftar sebagai Franchisee</a>
      </div>
    </div>`;
}

export function applyDirectoryMeta(html: string, options: DirectoryPageOptions, rows: D1FranchiseRow[]) {
  const title = `${options.title} - Franchisee.id`;
  const subheading = options.subheading || options.description;
  const enhanced = html
    .replace(/<meta property="og:type" content="article">/, '<meta property="og:type" content="website">')
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeAttr(options.description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${escapeAttr(options.canonicalPath)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeAttr(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeAttr(options.description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${escapeAttr(options.canonicalPath)}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeAttr(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeAttr(options.description)}">`)
    .replace(
      /<h1 class="elementor-heading-title elementor-size-default">.*?<\/h1>/,
      `<h1 class="elementor-heading-title elementor-size-default">${escapeHtml(options.title)}</h1><p class="fr-directory-hero-subheading">${escapeHtml(subheading)}</p>`,
    )
    .replace(
      /<script type="application\/ld\+json" class="rank-math-schema">[\s\S]*?<\/script>/,
      generateDirectoryJsonLd(options, rows),
    );
  if (options.indexable !== false) return enhanced;
  const robots = '<meta name="robots" content="noindex, follow">';
  return /<meta name="robots" content="[^"]*">/.test(enhanced)
    ? enhanced.replace(/<meta name="robots" content="[^"]*">/, robots)
    : enhanced.replace("</head>", `${robots}\n</head>`);
}

function categoryLabelFromSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function generateDirectoryJsonLd(options: DirectoryPageOptions, rows: D1FranchiseRow[]) {
  const absoluteUrl = `https://franchisee.id${options.canonicalPath}`;
  const items = rows.slice(0, 50).map((row, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `https://franchisee.id/peluang-usaha/${row.slug}`,
    name: normalizeBrandName(row.brand_name),
  }));
  const graph = [
    {
      "@type": "BreadcrumbList",
      "@id": `${absoluteUrl}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Beranda", item: "https://franchisee.id/" },
        { "@type": "ListItem", position: 2, name: options.title, item: absoluteUrl },
      ],
    },
    {
      "@type": "CollectionPage",
      "@id": `${absoluteUrl}#webpage`,
      url: absoluteUrl,
      name: options.title,
      description: options.description,
      inLanguage: "id-ID",
      breadcrumb: { "@id": `${absoluteUrl}#breadcrumb` },
      ...(items.length ? { mainEntity: { "@id": `${absoluteUrl}#item-list` } } : {}),
    },
    ...(items.length
      ? [{ "@type": "ItemList", "@id": `${absoluteUrl}#item-list`, numberOfItems: rows.length, itemListElement: items }]
      : []),
  ];
  return `<script type="application/ld+json" class="rank-math-schema">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}
