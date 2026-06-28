(function (window, document) {
  function send(eventType, metadata) {
    try {
      if (!window.fetch) return;
      window.fetch("/premium-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          event_type: eventType,
          surface: "premium",
          channel: "web",
          metadata: metadata || {},
        }),
      }).catch(function () {});
    } catch (_error) {}
  }

  send("premium_page_view", { path: window.location.pathname || "/premium/" });

  document.addEventListener("click", function (event) {
    var link = event.target && event.target.closest ? event.target.closest("[data-premium-cta]") : null;
    if (!link) return;
    send("premium_cta_click", {
      label: link.getAttribute("data-premium-cta") || link.textContent || "cta",
      href: link.getAttribute("href") || "",
    });
  });
})(window, document);
