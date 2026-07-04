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
        (promo.cta_url ? '<a href="' + escapeAttr(promo.cta_url) + '" data-promo-ribbon-cta>' + escapeHtml(promo.cta_label || "Lihat Premium") + '</a>' : '');
      document.body.insertBefore(bar, document.body.firstChild);
      recordPromoEvent("promo_ribbon_view", promo);
      var cta = bar.querySelector("[data-promo-ribbon-cta]");
      if (cta) {
        cta.addEventListener("click", function () {
          recordPromoEvent("promo_ribbon_click", promo);
        });
      }
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

  function recordPromoEvent(eventType, promo) {
    try {
      if (!navigator.sendBeacon) {
        fetch("/premium-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promoPayload(eventType, promo)),
          keepalive: true
        }).catch(function () { return null; });
        return;
      }
      navigator.sendBeacon("/premium-event", new Blob([JSON.stringify(promoPayload(eventType, promo))], { type: "application/json" }));
    } catch (_error) {
      return null;
    }
  }

  function promoPayload(eventType, promo) {
    return {
      event_type: eventType,
      surface: "promo_ribbon",
      channel: "web",
      metadata: {
        label: promo.label || "",
        discount_percent: promo.discount_percent || 0,
        bonus: promo.bonus_text || "",
        cta_url: promo.cta_url || ""
      }
    };
  }
}());
