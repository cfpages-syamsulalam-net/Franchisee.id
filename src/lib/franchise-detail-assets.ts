export function injectDetailAssets(html: string) {
  if (html.includes("franchise-detail-generated-css")) return html;
  const withStyles = html.replace(
    "</head>",
    `<style id="franchise-detail-generated-css">
.hfe-post-info a,
.hfe-post-info-item,
.hfe-post-info__terms-list-item,
.elementor-widget-post-info-widget a {
  color: #111111 !important;
}
.hfe-post-info-item,
.hfe-post-info__terms-list-item {
  background: transparent !important;
  border: 0 !important;
  padding: 0 !important;
  text-decoration: none !important;
}
.hfe-post-info-item:hover,
.hfe-post-info__terms-list-item:hover {
  background: transparent !important;
  color: #111111 !important;
}
.disclaimer-box,
.disclaimer-box strong,
.disclaimer-box i {
  color: #332600 !important;
}
.disclaimer-box a {
  color: #111111 !important;
  font-weight: 800;
  text-decoration: underline !important;
  text-decoration-thickness: 2px !important;
  text-underline-offset: 2px;
}
.disclaimer-box a:hover,
.disclaimer-box a:focus {
  color: #000000 !important;
  background: rgba(255, 255, 255, 0.45);
}
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
.franchise-css-placeholder {
  position: relative;
  width: 100%;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 20%, rgba(240, 202, 0, 0.34), transparent 28%),
    linear-gradient(135deg, #111111 0%, #3a3a3a 54%, #f0ca00 100%);
  color: #ffffff;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
  text-transform: uppercase;
}
.franchise-css-placeholder::before {
  content: "";
  position: absolute;
  inset: 12px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  pointer-events: none;
}
.franchise-css-placeholder span {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: 72px;
  height: 72px;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.74);
  background: rgba(0, 0, 0, 0.24);
  color: #ffffff;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0;
}
.franchise-css-placeholder small {
  position: relative;
  z-index: 1;
  color: rgba(255, 255, 255, 0.84);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}
.franchise-detail-image-placeholder {
  min-height: 138px;
  aspect-ratio: 300 / 138;
}
.e-n-tabs-heading {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.e-n-tab-title {
  cursor: pointer;
  border: 1px solid #dddddd !important;
  background: #f5f5f5 !important;
  color: #1f1f1f !important;
  padding: 10px 16px !important;
  border-radius: 4px !important;
  font-weight: 700 !important;
  text-transform: none !important;
}
.e-n-tab-title[aria-selected="true"] {
  border-color: #f0ca00 !important;
  background: #f0ca00 !important;
  color: #111111 !important;
}
.e-n-tab-content:not(.e-active) {
  display: none !important;
}
.franchise-contact-block ul {
  margin: 12px 0 0 0;
  padding: 0;
  list-style: none;
}
.franchise-contact-block li {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eeeeee;
}
.franchise-contact-block li span {
  color: #555555;
  font-weight: 700;
}
.franchise-contact-block li i {
  width: 16px;
  margin-right: 6px;
  color: #c28d00;
}
.franchise-contact-block a {
  color: #1d4f91 !important;
  font-weight: 700;
  text-decoration: none !important;
}
.franchise-contact-block a:hover {
  color: #c28d00 !important;
}
.franchise-whatsapp-claim-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 2px;
  padding: 3px 7px;
  border: 1px solid rgba(18, 140, 126, 0.28);
  border-radius: 4px;
  background: #e8f7ef;
  color: #075e54 !important;
  font-size: 12px;
  line-height: 1.3;
}
.franchise-whatsapp-claim-link i {
  width: auto;
  margin-right: 0;
  color: #128c7e;
}
.franchise-whatsapp-claim-link:hover,
.franchise-whatsapp-claim-link:focus {
  background: #d7f0e4;
  color: #064c45 !important;
}
.franchise-contact-note {
  margin-top: 14px;
  padding: 10px 12px;
  border-left: 4px solid #f0ca00;
  background: #fff8dc;
  color: #333333;
}
.fr-premium-lead-panel {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  margin: 18px 0 22px;
  padding: 18px;
  border: 1px solid rgba(194, 141, 0, 0.28);
  background: #fff9df;
}
.fr-premium-eyebrow {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  margin-bottom: 6px;
  color: #6a4a00;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}
.fr-premium-lead-panel h2 {
  margin: 0 0 6px;
  color: #111111;
  font-size: 22px;
}
.fr-premium-lead-panel p {
  margin: 0;
  color: #4b5563;
}
.fr-premium-lead-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.fr-premium-action,
.fr-proposal-download,
.fr-proposal-direct-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  border-radius: 4px;
  padding: 10px 14px;
  font-weight: 800;
  line-height: 1;
  text-decoration: none !important;
}
.fr-premium-action {
  border: 1px solid #111111;
  background: #111111;
  color: #ffffff !important;
  cursor: pointer;
  font: inherit;
}
.fr-premium-action.is-whatsapp {
  border-color: #128c7e;
  background: #128c7e;
}
.fr-premium-action.is-secondary,
.fr-proposal-direct-link {
  border: 1px solid #dedede;
  background: #ffffff;
  color: #111111 !important;
}
.fr-premium-tab-block h3 {
  margin: 0 0 8px;
  color: #111111;
  font-size: 22px;
}
.fr-premium-tab-block p {
  color: #4b5563;
}
.fr-premium-gallery,
.fr-proposal-pages {
  display: grid;
  gap: 14px;
}
.fr-premium-gallery {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.fr-premium-gallery figure,
.fr-proposal-page {
  margin: 0;
  border: 1px solid #eeeeee;
  background: #ffffff;
}
.fr-premium-gallery img,
.fr-proposal-page img {
  display: block;
  width: 100%;
  height: auto;
}
.fr-premium-gallery img {
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
.fr-premium-video-link a {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: #1d4f91 !important;
  font-weight: 800;
  text-decoration: none !important;
}
.fr-proposal-tab {
  position: relative;
}
.fr-proposal-head {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}
.fr-proposal-download {
  position: sticky;
  top: 84px;
  z-index: 5;
  border: 1px solid #b42318;
  background: #b42318;
  color: #ffffff;
  cursor: pointer;
  white-space: nowrap;
}
.fr-proposal-download:disabled {
  cursor: wait;
  opacity: 0.76;
}
.fr-proposal-status {
  min-height: 24px;
  margin: 0 0 10px;
  color: #374151;
  font-size: 13px;
  font-weight: 700;
}
.fr-proposal-status.is-error {
  color: #b42318;
}
.fr-proposal-page {
  padding: 10px;
}
.fr-proposal-page figcaption {
  padding-top: 8px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}
.fr-premium-faq {
  display: grid;
  gap: 10px;
}
.fr-premium-faq article {
  border: 1px solid #eeeeee;
  padding: 14px;
  background: #ffffff;
}
.fr-premium-faq h4 {
  margin: 0 0 6px;
  color: #111111;
  font-size: 16px;
}
.fr-premium-faq p {
  margin: 0;
}
.fr-premium-muted {
  color: #6b7280;
  font-weight: 700;
}
@media (max-width: 720px) {
  .fr-premium-lead-panel,
  .fr-proposal-head {
    align-items: stretch;
    flex-direction: column;
  }
  .fr-premium-lead-actions {
    justify-content: stretch;
  }
  .fr-premium-action,
  .fr-proposal-download {
    width: 100%;
  }
  .fr-proposal-download {
    top: 12px;
  }
}
</style>
</head>`,
  );
  return withStyles.replace(
    "</body>",
    `<script id="franchise-detail-tabs-js">
function setFranchiseDetailTab(tabs, index) {
  tabs.querySelectorAll(".e-n-tab-title").forEach(function (item) {
    var active = item.getAttribute("data-tab-index") === index;
    item.setAttribute("aria-selected", active ? "true" : "false");
    item.setAttribute("tabindex", active ? "0" : "-1");
  });
  tabs.querySelectorAll(".e-n-tab-content").forEach(function (panel) {
    panel.classList.toggle("e-active", panel.getAttribute("data-tab-index") === index);
  });
}
document.addEventListener("click", function (event) {
  var target = event.target;
  var button = target && target.closest ? target.closest(".e-n-tab-title") : null;
  if (!button) return;
  var tabs = button.closest(".e-n-tabs");
  if (!tabs) return;
  setFranchiseDetailTab(tabs, button.getAttribute("data-tab-index") || "1");
});
document.querySelectorAll(".e-n-tabs").forEach(function (tabs) {
  var selected = tabs.querySelector('.e-n-tab-title[aria-selected="true"]');
  setFranchiseDetailTab(tabs, selected ? selected.getAttribute("data-tab-index") || "1" : "1");
});
document.addEventListener("click", function (event) {
  var button = event.target && event.target.closest ? event.target.closest("[data-proposal-pdf]") : null;
  if (!button) return;
  event.preventDefault();
  downloadProposalPdf(button);
});
async function downloadProposalPdf(button) {
  var status = button.closest(".fr-proposal-tab")?.querySelector("[data-proposal-status]");
  var images = [];
  try {
    images = JSON.parse(button.getAttribute("data-proposal-images") || "[]");
  } catch (_error) {
    images = [];
  }
  if (!images.length) {
    setProposalStatus(status, "Proposal gambar belum tersedia untuk dibuat PDF.", true);
    return;
  }
  button.disabled = true;
  var original = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>Membuat PDF</span>';
  setProposalStatus(status, "Menyiapkan PDF proposal...");
  try {
    var pages = [];
    for (var index = 0; index < images.length; index += 1) {
      setProposalStatus(status, "Memproses halaman " + (index + 1) + " dari " + images.length + "...");
      pages.push(await imageToJpegPage(images[index]));
    }
    var pdfBlob = buildPdfFromJpegs(pages);
    var filename = (button.getAttribute("data-proposal-brand") || "proposal") + ".pdf";
    triggerDownload(pdfBlob, filename);
    setProposalStatus(status, "PDF proposal mulai diunduh.");
    if (window.FranchiseProductEvents && typeof window.FranchiseProductEvents.record === "function") {
      window.FranchiseProductEvents.record(button.getAttribute("data-franchise-id") || "", "contact_click", "proposal_pdf");
    }
  } catch (error) {
    setProposalStatus(status, error.message || "PDF belum bisa dibuat. Coba buka gambar proposal lalu simpan manual.", true);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}
function setProposalStatus(node, text, isError) {
  if (!node) return;
  node.textContent = text || "";
  node.className = "fr-proposal-status" + (isError ? " is-error" : "");
}
function imageToJpegPage(url) {
  return new Promise(function (resolve, reject) {
    var image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = function () {
      try {
        var pageWidth = 1240;
        var pageHeight = 1754;
        var canvas = document.createElement("canvas");
        canvas.width = pageWidth;
        canvas.height = pageHeight;
        var context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, pageWidth, pageHeight);
        var scale = Math.min(pageWidth / image.naturalWidth, pageHeight / image.naturalHeight);
        var drawWidth = image.naturalWidth * scale;
        var drawHeight = image.naturalHeight * scale;
        context.drawImage(image, (pageWidth - drawWidth) / 2, (pageHeight - drawHeight) / 2, drawWidth, drawHeight);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.92), width: pageWidth, height: pageHeight });
      } catch (_error) {
        reject(new Error("Browser tidak bisa membuat PDF dari gambar ini. Buka gambar proposal atau coba lagi setelah gambar dipindahkan ke media Franchisee.id."));
      }
    };
    image.onerror = function () {
      reject(new Error("Salah satu gambar proposal belum bisa dimuat."));
    };
    image.src = url;
  });
}
function buildPdfFromJpegs(pages) {
  var objects = [""];
  var kids = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "";
  pages.forEach(function (page, index) {
    var imageNumber = objects.length;
    var imageHex = dataUrlToHex(page.dataUrl);
    objects.push("<< /Type /XObject /Subtype /Image /Width " + page.width + " /Height " + page.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length " + (imageHex.length + 1) + " >>\\nstream\\n" + imageHex + ">\\nendstream");
    var content = "q\\n595.28 0 0 841.89 0 0 cm\\n/Im" + index + " Do\\nQ";
    var contentNumber = objects.length;
    objects.push("<< /Length " + content.length + " >>\\nstream\\n" + content + "\\nendstream");
    var pageNumber = objects.length;
    kids.push(pageNumber + " 0 R");
    objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im" + index + " " + imageNumber + " 0 R >> >> >> /Contents " + contentNumber + " 0 R >>");
  });
  objects[2] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + pages.length + " >>";
  var pdf = "%PDF-1.4\\n";
  var offsets = [0];
  for (var i = 1; i < objects.length; i += 1) {
    offsets[i] = pdf.length;
    pdf += i + " 0 obj\\n" + objects[i] + "\\nendobj\\n";
  }
  var xrefAt = pdf.length;
  pdf += "xref\\n0 " + objects.length + "\\n0000000000 65535 f \\n";
  for (var j = 1; j < objects.length; j += 1) {
    pdf += String(offsets[j]).padStart(10, "0") + " 00000 n \\n";
  }
  pdf += "trailer\\n<< /Size " + objects.length + " /Root 1 0 R >>\\nstartxref\\n" + xrefAt + "\\n%%EOF";
  return new Blob([pdf], { type: "application/pdf" });
}
function dataUrlToHex(dataUrl) {
  var base64 = String(dataUrl).split(",")[1] || "";
  var binary = atob(base64);
  var hex = "";
  for (var i = 0; i < binary.length; i += 1) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}
function triggerDownload(blob, filename) {
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}
</script>
</body>`,
  );
}

