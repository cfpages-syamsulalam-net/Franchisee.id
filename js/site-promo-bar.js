(function () {
  if (window.__franchisePromoBarLoaded) return;
  window.__franchisePromoBarLoaded = true;

  fetch("/premium-promo", { headers: { accept: "application/json" } })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (promo) {
      if (!promo || !promo.enabled || !promo.message) return;
      var bar = document.createElement("div");
      bar.className = "fr-site-promo-bar";
      bar.innerHTML = '<span>' + escapeHtml(promo.message) + '</span>' +
        (promo.cta_url ? '<a href="' + escapeAttr(promo.cta_url) + '">' + escapeHtml(promo.cta_label || "Lihat Premium") + '</a>' : '');
      document.body.insertBefore(bar, document.body.firstChild);
    })
    .catch(function () { return null; });

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
