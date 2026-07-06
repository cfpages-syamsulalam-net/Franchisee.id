(function (window, document) {
  var EVENT_DEDUPE_MS = 6 * 60 * 60 * 1000;

  function send(eventType, metadata, options) {
    try {
      if (hasRecentEvent(eventType, metadata, options || {})) return;
      rememberEvent(eventType, metadata, options || {});
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

  send("premium_page_view", { path: window.location.pathname || "/premium/" }, { dedupeMs: EVENT_DEDUPE_MS });

  document.addEventListener("click", function (event) {
    var link = event.target && event.target.closest ? event.target.closest("[data-premium-cta]") : null;
    if (!link) return;
    send("premium_cta_click", {
      label: link.getAttribute("data-premium-cta") || link.textContent || "cta",
      href: link.getAttribute("href") || "",
    }, { dedupeMs: 10 * 60 * 1000 });
  });

  function hasRecentEvent(eventType, metadata, options) {
    try {
      var key = eventKey(eventType, metadata);
      var lastSent = parseInt(window.localStorage.getItem(key) || "0", 10) || 0;
      return lastSent > 0 && Date.now() - lastSent < (options.dedupeMs || EVENT_DEDUPE_MS);
    } catch (_error) {
      return false;
    }
  }

  function rememberEvent(eventType, metadata) {
    try {
      window.localStorage.setItem(eventKey(eventType, metadata), String(Date.now()));
    } catch (_error) {}
  }

  function eventKey(eventType, metadata) {
    return "franchise_premium_page_event:" + eventType + ":" + (metadata && (metadata.href || metadata.path || metadata.label) || "default");
  }
})(window, document);
