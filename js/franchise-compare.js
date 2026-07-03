(function () {
  var dataNode = document.getElementById("franchise-compare-data");
  var select = document.querySelector("[data-compare-select]");
  var addButton = document.querySelector("[data-compare-add]");
  var tableWrap = document.querySelector("[data-compare-table]");
  var empty = document.querySelector("[data-compare-empty]");
  if (!dataNode || !select || !addButton || !tableWrap) return;

  var rows = JSON.parse(dataNode.textContent || "[]");
  var byId = rows.reduce(function (map, row) {
    map[row.id] = row;
    return map;
  }, {});
  var selected = loadSelected().filter(function (id) { return byId[id]; }).slice(0, 4);

  addButton.addEventListener("click", function () {
    var id = select.value;
    if (!id || selected.indexOf(id) !== -1) return;
    selected.push(id);
    selected = selected.slice(0, 4);
    saveSelected();
    render();
  });

  tableWrap.addEventListener("click", function (event) {
    var button = event.target.closest("[data-compare-remove]");
    if (!button) return;
    selected = selected.filter(function (id) { return id !== button.getAttribute("data-compare-remove"); });
    saveSelected();
    render();
  });

  render();

  function render() {
    if (empty) empty.hidden = selected.length > 0;
    if (!selected.length) {
      tableWrap.innerHTML = "";
      return;
    }
    var items = selected.map(function (id) { return byId[id]; }).filter(Boolean);
    tableWrap.innerHTML = '<table class="fr-compare-table"><tbody>' +
      row("Brand", items.map(function (item) {
        return '<div class="fr-compare-brand">' +
          (item.image ? '<img src="' + escapeAttr(item.image) + '" alt="' + escapeAttr(item.brand) + '" loading="lazy">' : '') +
          '<strong>' + escapeHtml(item.brand) + '</strong>' +
          '<button type="button" class="fr-compare-remove" data-compare-remove="' + escapeAttr(item.id) + '">Hapus</button>' +
          '</div>';
      })) +
      row("Kategori", items.map(function (item) { return escapeHtml(item.category); })) +
      row("Estimasi modal", items.map(function (item) { return escapeHtml(item.capitalLabel); })) +
      row("BEP", items.map(function (item) { return escapeHtml(item.bep); })) +
      row("Royalty", items.map(function (item) { return escapeHtml(item.royalty); })) +
      row("Kota asal", items.map(function (item) { return escapeHtml(item.city); })) +
      row("Catatan", items.map(function (item) { return escapeHtml(item.description); })) +
      row("Detail", items.map(function (item) { return '<a href="' + escapeAttr(item.href) + '">Buka listing</a>'; })) +
      '</tbody></table>';
  }

  function row(label, cells) {
    return '<tr><th>' + escapeHtml(label) + '</th>' + cells.map(function (cell) { return '<td>' + cell + '</td>'; }).join("") + '</tr>';
  }

  function loadSelected() {
    try {
      var params = new URLSearchParams(window.location.search);
      var fromUrl = (params.get("ids") || "").split(",").filter(Boolean);
      if (fromUrl.length) return fromUrl;
      return JSON.parse(localStorage.getItem("franchise_compare_ids") || "[]");
    } catch (_error) {
      return [];
    }
  }

  function saveSelected() {
    try {
      localStorage.setItem("franchise_compare_ids", JSON.stringify(selected));
    } catch (_error) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
}());
