function normalizeText(value: unknown) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
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

export function generateCssPlaceholder(label: string, className: string) {
  return `<div class="${escapeAttr(className)}" aria-label="${escapeAttr(label)}"><span>${escapeHtml(initials(label))}</span><small>Logo belum tersedia</small></div>`;
}

function initials(label: string) {
  const words = normalizeText(label).split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] || "F";
  const second = words.find((word) => word.length > 2 && word !== words[0])?.[0] || words[1]?.[0] || "I";
  return `${first}${second}`.toUpperCase();
}

export function injectDirectoryAssets(html: string) {
  if (html.includes("franchise-directory-generated-css")) return html;
  const withStyles = html.replace(
    "</head>",
    `<style id="franchise-directory-generated-css">
.franchise-directory-controls {
  max-width: 1200px;
  margin: 0 auto 24px;
  padding: 18px;
  border: 1px solid #e4e4e4;
  background: #ffffff;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
}
.franchise-directory-control-row {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(3, minmax(150px, 1fr)) auto;
  gap: 12px;
  align-items: end;
}
.franchise-directory-controls label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #2b2b2b;
  font-size: 12px;
  font-weight: 700;
}
.franchise-directory-controls input,
.franchise-directory-controls select {
  min-height: 42px;
  width: 100%;
  border: 1px solid #d6d6d6;
  border-radius: 4px;
  padding: 8px 10px;
  background: #ffffff;
  color: #111111;
  font: inherit;
}
.franchise-directory-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.franchise-directory-actions button,
.franchise-directory-actions a {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  text-decoration: none !important;
}
.franchise-directory-actions button {
  border: 1px solid #111111;
  background: #111111;
  color: #ffffff;
  cursor: pointer;
}
.franchise-directory-actions a {
  border: 1px solid #dedede;
  background: #f7f7f7;
  color: #111111 !important;
}
.franchise-directory-quicklinks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.franchise-directory-quicklinks a {
  border: 1px solid #e3d083;
  border-radius: 999px;
  padding: 6px 10px;
  background: #fff8d7;
  color: #2b2100 !important;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none !important;
}
.franchise-directory-quicklinks a.is-active {
  background: #f0ca00;
  border-color: #c28d00;
  color: #111111 !important;
}
.franchise-directory-result-count {
  margin: 12px 0 0;
  color: #4d4d4d;
  font-size: 13px;
  font-weight: 600;
}
.franchise-directory-empty {
  display: none;
  max-width: 1200px;
  margin: 0 auto 20px;
  padding: 14px 18px;
  border-left: 4px solid #f0ca00;
  background: #fff9df;
  color: #312500;
  font-weight: 700;
}
.franchise-css-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 130px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 20%, rgba(240, 202, 0, 0.28), transparent 28%),
    linear-gradient(135deg, #111111 0%, #3a3a3a 54%, #f0ca00 100%);
  color: #ffffff;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
  font-size: 34px;
  font-weight: 700;
  text-transform: uppercase;
}
.franchise-css-placeholder span {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.7);
  background: rgba(0, 0, 0, 0.22);
}
.franchise-css-placeholder small {
  position: relative;
  z-index: 1;
  display: block;
  max-width: calc(100% - 24px);
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  text-transform: none;
}
.category-css-placeholder {
  background:
    radial-gradient(circle at 80% 22%, rgba(255, 255, 255, 0.22), transparent 24%),
    linear-gradient(135deg, #f0ca00 0%, #222222 62%, #000000 100%);
}
#uc_post_grid_elementor_d0f4a5f .ue_p_title {
  pointer-events: auto !important;
}
#uc_post_grid_elementor_d0f4a5f,
#uc_post_grid_elementor_d0f4a5f .uc-items-wrapper,
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_wrap,
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_item,
#uc_post_grid_elementor_d0f4a5f .uc_content,
#uc_post_grid_elementor_d0f4a5f .uc_content_inner,
#uc_post_grid_elementor_d0f4a5f .uc_post_title {
  overflow: visible !important;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_item {
  position: relative;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_item:has(.franchise-status-badge:hover),
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_item:has(.franchise-status-badge:focus-within) {
  z-index: 20;
}
.franchise-card-title {
  display: flex !important;
  align-items: flex-start;
  gap: 8px;
  color: #111111 !important;
  line-height: 1.24;
  text-decoration: none !important;
}
.franchise-card-title:hover {
  color: #c28d00 !important;
}
.franchise-status-badge {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 118px;
  min-height: 22px;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  white-space: nowrap;
  flex: 0 0 auto;
}
.franchise-status-badge:hover,
.franchise-status-badge:focus-within {
  z-index: 30;
}
.franchise-status-verified {
  color: #0f5132;
  background: #d1f1dc;
  border: 1px solid rgba(15, 81, 50, 0.18);
}
.franchise-status-unclaimed {
  color: #6a4a00;
  background: #fff2bd;
  border: 1px solid rgba(194, 141, 0, 0.28);
}
.franchise-status-badge > span:not(.franchise-tooltip) {
  overflow: hidden;
  text-overflow: ellipsis;
}
.franchise-tooltip {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 9999;
  width: 220px;
  padding: 8px 10px;
  border-radius: 4px;
  background: #111111;
  color: #ffffff;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 500;
  white-space: normal;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 80ms ease, transform 80ms ease;
}
.franchise-status-badge:hover .franchise-tooltip,
.franchise-status-badge:focus-within .franchise-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.franchise-card-facts {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.franchise-fact-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 4px;
  background: #f6f6f6;
  color: #222222;
  font-size: 11px;
  line-height: 1.2;
}
.franchise-fact-chip span {
  color: #767676;
}
.franchise-fact-chip strong {
  font-weight: 700;
}
@media (max-width: 980px) {
  .franchise-directory-control-row {
    grid-template-columns: 1fr 1fr;
  }
  .franchise-directory-search {
    grid-column: 1 / -1;
  }
  .franchise-directory-actions {
    grid-column: 1 / -1;
  }
}
@media (max-width: 640px) {
  .franchise-directory-control-row {
    grid-template-columns: 1fr;
  }
}
</style>
</head>`,
  );

  if (withStyles.includes("franchise-directory-generated-js")) return withStyles;

  return withStyles.replace(
    "</body>",
    `<script id="franchise-directory-generated-js">
(function () {
  var form = document.querySelector("[data-directory-controls]");
  var grid = document.querySelector("#uc_post_grid_elementor_d0f4a5f .uc-items-wrapper");
  if (!form || !grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll("[data-franchise-card]"));
  var count = form.querySelector(".franchise-directory-result-count");
  var params = new URLSearchParams(window.location.search);
  var inputs = {
    q: form.querySelector('[name="q"]'),
    sort: form.querySelector('[name="sort"]'),
    kategori: form.querySelector('[name="kategori"]'),
    status: form.querySelector('[name="status"]')
  };

  function setField(name, value) {
    if (inputs[name]) inputs[name].value = value || "";
  }

  setField("q", params.get("q"));
  setField("sort", params.get("sort") || (params.get("view") === "kategori" ? "kategori" : ""));
  setField("kategori", params.get("kategori"));
  setField("status", params.get("status"));

  function asNumber(card, attr) {
    var value = Number(card.getAttribute(attr) || "0");
    return Number.isFinite(value) ? value : 0;
  }

  function applyFilters() {
    var query = (inputs.q && inputs.q.value || "").trim().toLowerCase();
    var sort = inputs.sort && inputs.sort.value || "";
    var category = inputs.kategori && inputs.kategori.value || "";
    var status = inputs.status && inputs.status.value || "";
    var visible = cards.filter(function (card) {
      var matchesQuery = !query || card.textContent.toLowerCase().indexOf(query) !== -1;
      var matchesCategory = !category || card.getAttribute("data-category-slug") === category;
      var matchesStatus = !status || card.getAttribute("data-status") === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });

    visible.sort(function (a, b) {
      if (sort === "rekomendasi") return asNumber(b, "data-recommendation-score") - asNumber(a, "data-recommendation-score") || a.getAttribute("data-brand").localeCompare(b.getAttribute("data-brand"), "id-ID");
      if (sort === "populer") return asNumber(b, "data-popularity-score") - asNumber(a, "data-popularity-score") || a.getAttribute("data-brand").localeCompare(b.getAttribute("data-brand"), "id-ID");
      if (sort === "abjad") return a.getAttribute("data-brand").localeCompare(b.getAttribute("data-brand"), "id-ID");
      if (sort === "kategori") return a.getAttribute("data-category").localeCompare(b.getAttribute("data-category"), "id-ID") || a.getAttribute("data-brand").localeCompare(b.getAttribute("data-brand"), "id-ID");
      if (sort === "modal-asc") return asNumber(a, "data-modal") - asNumber(b, "data-modal");
      if (sort === "modal-desc") return asNumber(b, "data-modal") - asNumber(a, "data-modal");
      return asNumber(a, "data-index") - asNumber(b, "data-index");
    });

    cards.forEach(function (card) { card.style.display = "none"; });
    visible.forEach(function (card) {
      card.style.display = "";
      grid.appendChild(card);
    });
    if (count) count.textContent = visible.length + " franchise ditampilkan dari " + cards.length + " listing.";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var next = new URLSearchParams();
    Object.keys(inputs).forEach(function (key) {
      var input = inputs[key];
      if (input && input.value) next.set(key, input.value);
    });
    var query = next.toString();
    window.history.replaceState({}, "", query ? "/peluang-usaha?" + query : "/peluang-usaha");
    applyFilters();
  });

  form.querySelectorAll(".franchise-directory-quicklinks a").forEach(function (link) {
    if (link.href === window.location.href || link.search === window.location.search) link.classList.add("is-active");
  });

  applyFilters();
}());
</script>
</body>`,
  );
}

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
</script>
</body>`,
  );
}
