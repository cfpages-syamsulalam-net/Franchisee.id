export const FRANCHISE_DIRECTORY_CLIENT = `<script id="franchise-directory-generated-js">
(function () {
  var form = document.querySelector("[data-directory-controls]");
  var grid = document.querySelector("#uc_post_grid_elementor_d0f4a5f .uc-items-wrapper");
  var directoryEmpty = document.querySelector("#uc_post_grid_elementor_d0f4a5f_empty_message");
  var locationPath = normalizePath(window.location.pathname);
  var pathParts = locationPath.split("/");
  var currentCategory = pathParts.length === 4 && pathParts[1] === "peluang-usaha" && pathParts[2] === "kategori"
    ? safeDecode(pathParts[3])
    : "";
  var currentCanonicalPath = currentCategory ? categoryPath(currentCategory) : "/peluang-usaha";
  initCompareButtons();
  if (!form || !grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll("[data-franchise-card]"));
  var count = form.querySelector(".franchise-directory-result-count");
  var params = new URLSearchParams(window.location.search);
  var reset = form.querySelector("[data-directory-reset]") || form.querySelector(".franchise-directory-actions a");
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
  setField("kategori", currentCategory || params.get("kategori"));
  setField("status", params.get("status"));
  form.setAttribute("action", currentCanonicalPath);
  if (reset) reset.setAttribute("href", currentCanonicalPath);

  if (directoryEmpty) {
    directoryEmpty.classList.add("franchise-directory-empty");
    directoryEmpty.setAttribute("role", "status");
    directoryEmpty.setAttribute("aria-live", "polite");
    directoryEmpty.innerHTML = '<strong>Belum ada franchise yang cocok.</strong><span>Ubah kata kunci atau filter untuk melihat pilihan lainnya.</span><a href="' + currentCanonicalPath + '" data-directory-empty-reset>Hapus filter</a>';
  }

  function normalizePath(path) {
    var normalized = path || "/";
    while (normalized.length > 1 && normalized.charAt(normalized.length - 1) === "/") {
      normalized = normalized.slice(0, -1);
    }
    return normalized || "/";
  }

  function safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch (_error) {
      return value;
    }
  }

  function categoryPath(slug) {
    return "/peluang-usaha/kategori/" + encodeURIComponent(slug);
  }

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
    if (directoryEmpty) directoryEmpty.style.display = visible.length ? "none" : "grid";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var next = new URLSearchParams();
    ["q", "sort", "status"].forEach(function (key) {
      var input = inputs[key];
      if (input && input.value) next.set(key, input.value);
    });
    var selectedCategory = inputs.kategori && inputs.kategori.value || "";
    var targetPath = selectedCategory ? categoryPath(selectedCategory) : "/peluang-usaha";
    var query = next.toString();
    var target = targetPath + (query ? "?" + query : "");
    if (normalizePath(targetPath) !== locationPath) {
      window.location.assign(target);
      return;
    }
    window.history.replaceState({}, "", target);
    applyFilters();
  });

  form.querySelectorAll(".franchise-directory-quicklinks a").forEach(function (link) {
    var linkUrl = new URL(link.href, window.location.origin);
    if (normalizePath(linkUrl.pathname) === locationPath && linkUrl.search === window.location.search) {
      link.classList.add("is-active");
    }
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
      floating.innerHTML = '<i class="fas fa-balance-scale" aria-hidden="true"></i><span data-compare-count>Bandingkan</span>';
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
</script>`;
