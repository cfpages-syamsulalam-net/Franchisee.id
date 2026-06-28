(function (window, document) {
  const endpoint = "/product-event";

  document.addEventListener("DOMContentLoaded", function () {
    const detailButton = document.querySelector(".fr-save-opportunity-wrap--detail [data-save-franchise]");
    if (detailButton) {
      record(detailButton.getAttribute("data-save-franchise"), "listing_view", "detail");
    }
  });

  document.addEventListener("click", function (event) {
    const contactLink = event.target.closest && event.target.closest("a[href^='tel:'], a[href^='mailto:'], a[href*='wa.me'], .franchise-contact-block a[target='_blank']");
    if (!contactLink) return;
    const detailButton = document.querySelector(".fr-save-opportunity-wrap--detail [data-save-franchise]");
    if (!detailButton) return;
    const href = contactLink.getAttribute("href") || "";
    const channel = href.indexOf("mailto:") === 0 ? "email" : href.indexOf("tel:") === 0 ? "phone" : href.indexOf("wa.me") >= 0 ? "whatsapp" : "link";
    record(detailButton.getAttribute("data-save-franchise"), "contact_click", "detail", channel);
  });

  window.FranchiseProductEvents = {
    record,
  };

  function record(franchiseId, eventType, surface, channel) {
    if (!franchiseId || !eventType) return;
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
})(window, document);
