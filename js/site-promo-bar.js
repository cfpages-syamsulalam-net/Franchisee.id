(function () {
  if (window.__franchisePromoBarLoaded) return;
  window.__franchisePromoBarLoaded = true;

  var PROMO_CACHE_KEY = "franchise_premium_promo_cache:v1";
  var PROMO_CACHE_TTL_MS = 30 * 60 * 1000;
  var PROMO_EVENT_DEDUPE_MS = 24 * 60 * 60 * 1000;

  loadPromo()
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

  function loadPromo() {
    var cached = readCachedPromo();
    if (cached) return Promise.resolve(cached);
    return fetch("/premium-promo", { headers: { accept: "application/json" } })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (promo) {
        writeCachedPromo(promo);
        return promo;
      });
  }

  function readCachedPromo() {
    try {
      var raw = window.localStorage.getItem(PROMO_CACHE_KEY);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (!cached || !cached.expiresAt || Date.now() > cached.expiresAt) return null;
      return cached.promo || null;
    } catch (_error) {
      return null;
    }
  }

  function writeCachedPromo(promo) {
    try {
      window.localStorage.setItem(PROMO_CACHE_KEY, JSON.stringify({
        expiresAt: Date.now() + PROMO_CACHE_TTL_MS,
        promo: promo || null
      }));
    } catch (_error) {}
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

  function recordPromoEvent(eventType, promo) {
    try {
      if (hasRecentPromoEvent(eventType, promo)) return;
      rememberPromoEvent(eventType, promo);
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

  function hasRecentPromoEvent(eventType, promo) {
    try {
      var key = promoEventKey(eventType, promo);
      var lastSent = parseInt(window.localStorage.getItem(key) || "0", 10) || 0;
      return lastSent > 0 && Date.now() - lastSent < PROMO_EVENT_DEDUPE_MS;
    } catch (_error) {
      return false;
    }
  }

  function rememberPromoEvent(eventType, promo) {
    try {
      window.localStorage.setItem(promoEventKey(eventType, promo), String(Date.now()));
    } catch (_error) {}
  }

  function promoEventKey(eventType, promo) {
    return "franchise_premium_event:" + eventType + ":" + (promo && promo.label ? promo.label : "default");
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
