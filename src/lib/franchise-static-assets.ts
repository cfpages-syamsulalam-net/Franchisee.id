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
.franchise-directory-intro {
  max-width: 1200px;
  margin: 0 auto 18px;
  padding: 18px;
  border-left: 4px solid #f0ca00;
  background: #fffaf0;
  color: #303030;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
}
.franchise-directory-intro p {
  margin: 0 0 8px;
  color: #303030;
  font-size: 15px;
  line-height: 1.6;
}
.franchise-directory-intro p:last-child {
  margin-bottom: 0;
}
.fr-owner-cta {
  max-width: 1200px;
  margin: 0 auto 24px;
  padding: clamp(18px, 3vw, 28px);
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(240, 202, 0, 0.38);
  background:
    radial-gradient(circle at 88% 16%, rgba(240, 202, 0, 0.25), transparent 30%),
    linear-gradient(135deg, #111111 0%, #1f2937 100%);
  color: #ffffff;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
}
.fr-owner-cta__content {
  max-width: 720px;
}
.fr-owner-cta__eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  color: #f0ca00;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.fr-owner-cta h2 {
  margin: 0 0 8px;
  color: #ffffff;
  font-size: clamp(22px, 3vw, 34px);
  line-height: 1.12;
}
.fr-owner-cta p {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 15px;
  line-height: 1.65;
}
.fr-owner-cta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}
.fr-owner-cta__primary,
.fr-owner-cta__secondary {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 16px;
  border-radius: 0;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  text-decoration: none !important;
}
.fr-owner-cta__primary {
  border: 1px solid #f0ca00;
  background: #f0ca00;
  color: #111111 !important;
}
.fr-owner-cta__secondary {
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff !important;
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
.franchise-status-badge > span {
  overflow: hidden;
  text-overflow: ellipsis;
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
.fr-compare-wrap--card {
  position: absolute;
  left: 52px;
  top: 8px;
  z-index: 6;
}
.fr-compare-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #111111;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
  font-weight: 800;
  cursor: pointer;
}
.fr-compare-button--card {
  width: 36px;
  height: 36px;
  padding: 0;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
}
.fr-compare-button--card span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.fr-compare-button--detail {
  min-height: 42px;
  padding: 8px 13px;
}
.fr-compare-button.is-added {
  background: #f0ca00;
  color: #111111;
}
.fr-compare-floating {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 90;
  display: none;
  align-items: center;
  gap: 8px;
  padding: 10px 13px;
  border: 1px solid #111111;
  background: #111111;
  color: #ffffff !important;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
  font-size: 13px;
  font-weight: 900;
  text-decoration: none !important;
}
.fr-compare-floating.is-visible {
  display: inline-flex;
}
.fr-site-promo-bar {
  position: sticky;
  top: 0;
  z-index: 80;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 9px 16px;
  background: #111111;
  color: #ffffff;
  font-family: "DM Sans", Arial, sans-serif;
  font-size: 14px;
  font-weight: 800;
}
.fr-site-promo-bar a {
  color: #111111 !important;
  background: #f0ca00;
  padding: 5px 9px;
  text-decoration: none !important;
}
@media (max-width: 980px) {
  .fr-owner-cta {
    align-items: flex-start;
    flex-direction: column;
  }
  .fr-owner-cta__actions {
    justify-content: flex-start;
  }
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
  .fr-owner-cta__actions,
  .fr-owner-cta__primary,
  .fr-owner-cta__secondary {
    width: 100%;
  }
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
  initCompareButtons();
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

  function initCompareButtons() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-compare-franchise]"));
    if (!buttons.length) return;
    var floating = document.querySelector("[data-compare-floating]");
    if (!floating) {
      floating = document.createElement("a");
      floating.href = "/bandingkan";
      floating.className = "fr-compare-floating";
      floating.setAttribute("data-compare-floating", "");
      floating.innerHTML = '<i class="fas fa-scale-balanced" aria-hidden="true"></i><span data-compare-count>Bandingkan</span>';
      document.body.appendChild(floating);
    }

    function getSelected() {
      try {
        return JSON.parse(localStorage.getItem("franchise_compare_ids") || "[]");
      } catch (_error) {
        return [];
      }
    }

    function setSelected(ids) {
      try {
        var nextIds = ids.slice(0, 4);
        localStorage.setItem("franchise_compare_ids", JSON.stringify(nextIds));
        var current = JSON.parse(localStorage.getItem("franchise_buyer_context") || "{}");
        current.updated_at = new Date().toISOString();
        current.last_tool = "comparison";
        current.comparison = { source: "comparison", selected_brand_ids: nextIds };
        localStorage.setItem("franchise_buyer_context", JSON.stringify(current));
      } catch (_error) {
        return null;
      }
    }

    function renderState() {
      var selected = getSelected();
      buttons.forEach(function (button) {
        var active = selected.indexOf(button.getAttribute("data-compare-franchise")) !== -1;
        button.classList.toggle("is-added", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      floating.classList.toggle("is-visible", selected.length > 0);
      var count = floating.querySelector("[data-compare-count]");
      if (count) count.textContent = selected.length + " dibandingkan";
      floating.href = selected.length ? "/bandingkan?ids=" + selected.join(",") : "/bandingkan";
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-compare-franchise");
        var selected = getSelected();
        var index = selected.indexOf(id);
        if (index >= 0) selected.splice(index, 1);
        else if (selected.length < 4) selected.push(id);
        else {
          selected.shift();
          selected.push(id);
        }
        setSelected(selected);
        renderState();
      });
    });
    renderState();
  }
}());
</script>
</body>`,
  );
}

export { injectDetailAssets } from "./franchise-detail-assets";
