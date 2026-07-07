const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 0;
const MAX_PAGES = 40;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;

export async function buildProposalPdfResponse(input, env = {}) {
  const images = normalizeImages(input?.images);
  if (!images.length) return jsonResponse({ success: false, message: "Gambar brosur belum tersedia." }, { status: 400 });
  if (images.length > MAX_PAGES) return jsonResponse({ success: false, message: `Brosur maksimal ${MAX_PAGES} halaman per download.` }, { status: 400 });

  const pages = [];
  let totalBytes = 0;
  for (let index = 0; index < images.length; index += 1) {
    const url = images[index];
    if (!isAllowedProposalImageUrl(url, env)) {
      return jsonResponse({ success: false, message: "Sumber gambar brosur tidak didukung untuk download PDF." }, { status: 400 });
    }
    const image = await fetchProposalImage(url);
    totalBytes += image.bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) return jsonResponse({ success: false, message: "Ukuran brosur terlalu besar untuk dibuat PDF." }, { status: 413 });
    pages.push({ ...image, sourceUrl: url, pageNumber: index + 1 });
  }

  const filename = `${slugPart(input?.brand || "proposal")}.pdf`;
  const pdf = buildPdfFromJpegs(pages, { watermark: "FRANCHISEE.ID" });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function buildPdfFromJpegs(pages, options = {}) {
  const objects = [null];
  const kids = [];
  objects[1] = ascii("<< /Type /Catalog /Pages 2 0 R >>");
  objects[2] = ascii("");

  pages.forEach((page, index) => {
    const imageObjectNumber = objects.length;
    objects.push(pdfObjectStream(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>`,
      page.bytes,
    ));

    const content = pageContent(page.width, page.height, index, options.watermark || "FRANCHISEE.ID");
    const contentNumber = objects.length;
    objects.push(pdfObjectStream(`<< /Length ${byteLength(content)} >>`, ascii(content)));

    const pageNumber = objects.length;
    kids.push(`${pageNumber} 0 R`);
    objects.push(ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> /XObject << /Im${index} ${imageObjectNumber} 0 R >> >> /Contents ${contentNumber} 0 R >>`));
  });

  objects[2] = ascii(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`);
  return assemblePdf(objects);
}

function pageContent(imageWidth, imageHeight, index, watermark) {
  const maxWidth = A4_WIDTH - PAGE_MARGIN * 2;
  const maxHeight = A4_HEIGHT - PAGE_MARGIN * 2;
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const x = (A4_WIDTH - drawWidth) / 2;
  const y = (A4_HEIGHT - drawHeight) / 2;
  const watermarkText = pdfString(watermark);
  const watermarkBoxWidth = 124;
  const watermarkBoxHeight = 28;
  const watermarkX = A4_WIDTH - watermarkBoxWidth - 18;
  const watermarkY = 18;
  return [
    "q",
    `${formatNumber(drawWidth)} 0 0 ${formatNumber(drawHeight)} ${formatNumber(x)} ${formatNumber(y)} cm`,
    `/Im${index} Do`,
    "Q",
    "q",
    "1 1 1 rg",
    "0.82 0.82 0.82 RG",
    `${formatNumber(watermarkX)} ${formatNumber(watermarkY)} ${watermarkBoxWidth} ${watermarkBoxHeight} re`,
    "B",
    "Q",
    "BT",
    "/F1 12 Tf",
    "0.07 0.07 0.07 rg",
    `${formatNumber(watermarkX + 12)} ${formatNumber(watermarkY + 9)} Td`,
    `(${watermarkText}) Tj`,
    "ET",
  ].join("\n");
}

async function fetchProposalImage(url) {
  const response = await fetch(url, {
    headers: {
      "Accept": "image/jpeg,image/jpg,*/*;q=0.1",
    },
  });
  if (!response.ok) throw new Error(`Gambar brosur belum bisa dimuat (${response.status}).`);
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error("Salah satu halaman brosur terlalu besar.");
  if (!isJpeg(bytes, contentType)) throw new Error("Download PDF saat ini mendukung halaman brosur JPG/JPEG.");
  const size = jpegSize(bytes);
  return { bytes, width: size.width, height: size.height };
}

function isAllowedProposalImageUrl(value, env) {
  let parsed = null;
  try {
    parsed = new URL(value);
  } catch (_error) {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const allowedHosts = new Set(["assets.franchisee.id", "blogger.googleusercontent.com"]);
  const configuredBase = normalizeText(env.FRANCHISE_ASSETS_PUBLIC_BASE_URL || env.R2_PUBLIC_BASE_URL);
  if (configuredBase) {
    try {
      allowedHosts.add(new URL(configuredBase).host.toLowerCase());
    } catch (_error) {
      // Ignore invalid optional config.
    }
  }
  const host = parsed.host.toLowerCase();
  return allowedHosts.has(host) || host.endsWith(".blogspot.com");
}

function normalizeImages(value) {
  return Array.isArray(value)
    ? value.map((item) => normalizeText(item)).filter(Boolean).slice(0, MAX_PAGES)
    : [];
}

function isJpeg(bytes, contentType) {
  return contentType.includes("jpeg") || contentType.includes("jpg") || (bytes[0] === 0xff && bytes[1] === 0xd8);
}

function jpegSize(bytes) {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
      };
    }
    offset += 2 + length;
  }
  throw new Error("Ukuran gambar brosur tidak terbaca.");
}

function assemblePdf(objects) {
  const chunks = [ascii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = [0];
  let position = chunks[0].length;

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = position;
    const prefix = ascii(`${index} 0 obj\n`);
    const suffix = ascii("\nendobj\n");
    chunks.push(prefix, objects[index], suffix);
    position += prefix.length + objects[index].length + suffix.length;
  }

  const xrefAt = position;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  chunks.push(ascii(xref));
  return concat(chunks);
}

function pdfObjectStream(header, streamBytes) {
  return concat([ascii(`${header}\nstream\n`), streamBytes, ascii("\nendstream")]);
}

function concat(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

function ascii(value) {
  return new TextEncoder().encode(value);
}

function byteLength(value) {
  return ascii(value).length;
}

function pdfString(value) {
  return normalizeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatNumber(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function slugPart(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "proposal";
}

function normalizeText(value) {
  return (value ?? "").toString().trim().replace(/\s+/g, " ");
}

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}
