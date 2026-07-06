(function (window, document) {
  const endpoint = "/product-event";
  const DAILY_PUBLIC_EVENT_LIMIT = 16;
  const LISTING_VIEW_SAMPLE_RATE = 0.03;
  const LISTING_VIEW_DEDUPE_MS = 6 * 60 * 60 * 1000;
  const CONTACT_CLICK_DEDUPE_MS = 60 * 60 * 1000;
  const ACTION_EVENT_DEDUPE_MS = 5 * 60 * 1000;

  document.addEventListener("DOMContentLoaded", function () {
    const detailButton = document.querySelector(".fr-save-opportunity-wrap--detail [data-save-franchise]");
    if (detailButton) {
      const franchiseId = detailButton.getAttribute("data-save-franchise");
      record(franchiseId, "listing_view", "detail", "", {
        sampleRate: LISTING_VIEW_SAMPLE_RATE,
        dedupeKey: "listing_view:" + franchiseId,
        dedupeMs: LISTING_VIEW_DEDUPE_MS,
      });
    }
  });

  document.addEventListener("click", function (event) {
    const contactLink = event.target.closest && event.target.closest("a[href^='tel:'], a[href^='mailto:'], a[href*='wa.me'], .franchise-contact-block a[target='_blank']");
    if (!contactLink) return;
    const detailButton = document.querySelector(".fr-save-opportunity-wrap--detail [data-save-franchise]");
    if (!detailButton) return;
    const href = contactLink.getAttribute("href") || "";
    const channel = href.indexOf("mailto:") === 0 ? "email" : href.indexOf("tel:") === 0 ? "phone" : href.indexOf("wa.me") >= 0 ? "whatsapp" : "link";
    const franchiseId = detailButton.getAttribute("data-save-franchise");
    record(franchiseId, "contact_click", "detail", channel, {
      dedupeKey: "contact_click:" + franchiseId + ":" + channel,
      dedupeMs: CONTACT_CLICK_DEDUPE_MS,
    });
  });

  window.FranchiseProductEvents = {
    record,
  };

  function record(franchiseId, eventType, surface, channel, options) {
    if (!franchiseId || !eventType) return;
    const opts = options || {};
    if (!shouldSend(eventType, opts)) return;
    const body = JSON.stringify({
      franchise_id: franchiseId,
      event_type: eventType,
      surface: surface || "",
      channel: channel || "",
    });
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon(endpoint, blob)) return;
      } catch (_) {}
    }
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(function () {});
  }

  function shouldSend(eventType, options) {
    if (typeof options.sampleRate === "number" && options.sampleRate >= 0 && options.sampleRate < 1 && Math.random() > options.sampleRate) {
      return false;
    }

    if (options.dedupeKey && hasRecentEvent(options.dedupeKey, options.dedupeMs || ACTION_EVENT_DEDUPE_MS)) {
      return false;
    }

    if (!consumeDailyBudget()) return false;

    if (options.dedupeKey) {
      rememberEvent(options.dedupeKey);
    }

    return true;
  }

  function consumeDailyBudget() {
    try {
      const key = "franchise_public_event_budget:" + new Date().toISOString().slice(0, 10);
      const count = parseInt(window.localStorage.getItem(key) || "0", 10) || 0;
      if (count >= DAILY_PUBLIC_EVENT_LIMIT) return false;
      window.localStorage.setItem(key, String(count + 1));
      return true;
    } catch (_) {
      return true;
    }
  }

  function hasRecentEvent(key, dedupeMs) {
    try {
      const lastSent = parseInt(window.localStorage.getItem(storageKey(key)) || "0", 10) || 0;
      return lastSent > 0 && Date.now() - lastSent < dedupeMs;
    } catch (_) {
      return false;
    }
  }

  function rememberEvent(key) {
    try {
      window.localStorage.setItem(storageKey(key), String(Date.now()));
    } catch (_) {}
  }

  function storageKey(key) {
    return "franchise_product_event:" + key;
  }
})(window, document);
