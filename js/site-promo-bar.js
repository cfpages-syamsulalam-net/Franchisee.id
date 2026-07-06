(function () {
  if (window.__franchisePromoBarLoaded) return;
  window.__franchisePromoBarLoaded = true;

  var PROMO_CACHE_KEY = "franchise_premium_promo_cache:v1";
  var PROMO_CACHE_TTL_MS = 30 * 60 * 1000;
  var PROMO_EVENT_DEDUPE_MS = 24 * 60 * 60 * 1000;

  loadPromo()
    .then(function (promo) {
      if (!promo || !promo.enabled || !promo.message) return;
      if (hasReachedViewLimit(promo)) return;
      injectPromoStyles();
      var bar = document.createElement("div");
      bar.className = "fr-site-promo-bar";
      bar.innerHTML = '<span>' + escapeHtml(promo.message) + '</span>' +
        (promo.cta_url ? '<a href="' + escapeAttr(promo.cta_url) + '" data-promo-ribbon-cta>' + escapeHtml(promo.cta_label || "Lihat Premium") + '</a>' : '') +
        limitNote(promo);
      document.body.insertBefore(bar, document.body.firstChild);
      rememberPromoView(promo);
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

  function injectPromoStyles() {
    if (document.getElementById("fr-site-promo-bar-css")) return;
    var style = document.createElement("style");
    style.id = "fr-site-promo-bar-css";
    style.textContent = [
      ".fr-site-promo-bar{position:sticky;top:0;z-index:80;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;padding:9px 16px;background:#111;color:#fff;font-family:\"DM Sans\",Arial,sans-serif;font-size:14px;font-weight:800;text-align:center}",
      ".fr-site-promo-bar a{color:#111!important;background:#f0ca00;padding:5px 9px;text-decoration:none!important}",
      ".fr-site-promo-note{font-size:12px;font-weight:700;color:rgba(255,255,255,.76)}"
    ].join("");
    document.head.appendChild(style);
  }

  function limitNote(promo) {
    var limit = normalizedViewLimit(promo);
    if (limit !== 1) return "";
    return '<small class="fr-site-promo-note">Anda hanya akan melihat promo ini sekali hari ini.</small>';
  }

  function hasReachedViewLimit(promo) {
    var limit = normalizedViewLimit(promo);
    if (!limit) return false;
    try {
      var count = parseInt(window.localStorage.getItem(promoViewKey(promo)) || "0", 10) || 0;
      return count >= limit;
    } catch (_error) {
      return false;
    }
  }

  function rememberPromoView(promo) {
    var limit = normalizedViewLimit(promo);
    if (!limit) return;
    try {
      var key = promoViewKey(promo);
      var count = parseInt(window.localStorage.getItem(key) || "0", 10) || 0;
      window.localStorage.setItem(key, String(Math.min(count + 1, limit)));
    } catch (_error) {}
  }

  function normalizedViewLimit(promo) {
    var value = Number(promo && promo.max_views_per_user);
    if (!Number.isFinite(value)) return 1;
    return Math.max(0, Math.min(30, Math.floor(value)));
  }

  function promoViewKey(promo) {
    return "franchise_premium_promo_views:" + utcDayKey() + ":" + promoIdentity(promo);
  }

  function utcDayKey() {
    return new Date().toISOString().slice(0, 10);
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
    return "franchise_premium_event:" + eventType + ":" + promoIdentity(promo);
  }

  function promoIdentity(promo) {
    return [
      promo && promo.label ? promo.label : "default",
      promo && promo.starts_at ? promo.starts_at : "",
      promo && promo.ends_at ? promo.ends_at : "",
      promo && promo.message ? promo.message : ""
    ].join(":");
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
