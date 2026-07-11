(function () {
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

  function formatCurrency(value) {
    var amount = Number(value || 0);
    if (!amount) return "-";
    return "Rp " + amount.toLocaleString("id-ID");
  }

  function setFormValue(form, name, value) {
    var input = form.querySelector('[name="' + name + '"]');
    if (input) input.value = value == null ? "" : value;
  }

  function actionClass(tone) {
    return ["dash-icon-button", "dash-action-button", tone ? "is-" + tone : ""].filter(Boolean).join(" ");
  }

  function pillActionClass(tone) {
    return ["dash-pill-action", tone ? "is-" + tone : ""].filter(Boolean).join(" ");
  }

  function renderAttrs(attrs) {
    return Object.keys(attrs || {}).map(function (name) {
      var value = attrs[name];
      if (value === false || value === null || value === undefined) return "";
      if (value === true || value === "") return " " + name;
      return " " + name + '="' + escapeAttr(value) + '"';
    }).join("");
  }

  function renderActionToolbar(items, label) {
    var html = (items || []).filter(Boolean).join("");
    if (!html) return "";
    return '<div class="dash-actions dash-toolbar" role="toolbar" aria-label="' + escapeAttr(label || "Aksi") + '">' + html + '</div>';
  }

  function renderActionButton(config) {
    config = config || {};
    var attrs = Object.assign({}, config.attrs || {}, {
      type: "button",
      "aria-label": config.label || "Aksi",
      "data-fr-tooltip": config.label || "Aksi"
    });
    return '<button class="' + escapeAttr(actionClass(config.tone)) + '"' + renderAttrs(attrs) + '><i class="' + escapeAttr(config.icon || "fas fa-circle") + '" aria-hidden="true"></i></button>';
  }

  function renderActionLink(config) {
    config = config || {};
    var attrs = Object.assign({}, config.attrs || {}, {
      href: config.href || "#",
      target: "_blank",
      rel: "noopener",
      "aria-label": config.label || "Buka",
      "data-fr-tooltip": config.label || "Buka"
    });
    return '<a class="' + escapeAttr(actionClass(config.tone)) + '"' + renderAttrs(attrs) + '><i class="' + escapeAttr(config.icon || "fas fa-external-link-alt") + '" aria-hidden="true"></i></a>';
  }

  function renderPillActionButton(config) {
    config = config || {};
    var attrs = Object.assign({}, config.attrs || {}, {
      type: "button",
      "aria-label": config.label || "Aksi",
      "data-fr-tooltip": config.tooltip || config.label || "Aksi"
    });
    return '<button class="' + escapeAttr(pillActionClass(config.tone)) + '"' + renderAttrs(attrs) + '><i class="' + escapeAttr(config.icon || "fas fa-circle") + '" aria-hidden="true"></i><span>' + escapeHtml(config.label || "Aksi") + '</span></button>';
  }

  function renderPillActionLink(config) {
    config = config || {};
    var attrs = Object.assign({}, config.attrs || {}, {
      href: config.href || "#",
      "aria-label": config.label || "Buka",
      "data-fr-tooltip": config.tooltip || config.label || "Buka"
    });
    if (config.newTab !== false) {
      attrs.target = "_blank";
      attrs.rel = "noopener";
    }
    return '<a class="' + escapeAttr(pillActionClass(config.tone)) + '"' + renderAttrs(attrs) + '><i class="' + escapeAttr(config.icon || "fas fa-external-link-alt") + '" aria-hidden="true"></i><span>' + escapeHtml(config.label || "Buka") + '</span></a>';
  }

  window.FranchiseDashboardUtils = {
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    formatCurrency: formatCurrency,
    renderActionToolbar: renderActionToolbar,
    renderActionButton: renderActionButton,
    renderActionLink: renderActionLink,
    renderPillActionButton: renderPillActionButton,
    renderPillActionLink: renderPillActionLink,
    renderAttrs: renderAttrs,
    setFormValue: setFormValue
  };
}());
