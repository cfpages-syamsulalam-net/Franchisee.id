(function () {
  var statusEl = document.querySelector("[data-dashboard-status]");
  var userEl = document.querySelector("[data-dashboard-user]");
  var mainEl = document.querySelector("[data-dashboard-protected]");
  var loginEl = document.querySelector("[data-dashboard-login]");
  var loadingEl = document.querySelector("[data-dashboard-loading]");
  var authDebugSummary = document.querySelector("[data-auth-debug-summary]");
  var authDebugOutput = document.querySelector("[data-auth-debug-output]");
  var authDebugRefresh = document.querySelector("[data-auth-debug-refresh]");
  var authDebugCopy = document.querySelector("[data-auth-debug-copy]");
  var dashboardTabs = Array.from(document.querySelectorAll("[data-dashboard-tab]"));
  var dashboardPanels = Array.from(document.querySelectorAll("[data-dashboard-panel]"));
  var premiumFunnel = document.querySelector("[data-premium-funnel]");
  var premiumNotifications = document.querySelector("[data-premium-notifications]");
  var premiumReports = document.querySelector("[data-premium-reports]");
  var premiumExpiring = document.querySelector("[data-premium-expiring]");
  var premiumEmailQueue = document.querySelector("[data-premium-email-queue]");
  var paymentMethodForm = document.querySelector("[data-payment-method-form]");
  var premiumSettingsForm = document.querySelector("[data-premium-settings-form]");
  var ocrClient = window.FranchiseDashboardOcr;
  var DASHBOARD_CACHE_KEY = "franchise_dashboard_state_v1";
  var DASHBOARD_CACHE_TTL_MS = 90 * 1000;
  var dashboardState = null;
  var currentUserIsAdmin = false;
  var dashboardUtils = window.FranchiseDashboardUtils;
  var escapeHtml = dashboardUtils.escapeHtml;
  var DASHBOARD_DEEP_LINK_TABS = {
    "dashboard-setup-guide": "operations",
    "google-contacts-setup": "operations",
    "ocr-provider-setup": "operations",
    "ocr-scheduler-setup": "operations",
    "email-delivery-setup": "operations",
    "publish-automation-setup": "operations"
  };
  var dashboardOperations = window.FranchiseDashboardOperations.createOperations({
    outreachRows: document.querySelector("[data-outreach-rows]"),
    outreachCount: document.querySelector("[data-outreach-count]"),
    outreachActions: document.querySelector("[data-outreach-actions]"),
    premiumPaymentRows: document.querySelector("[data-premium-payment-rows]"),
    publishState: document.querySelector("[data-publish-state]"),
    publicationRows: document.querySelector("[data-publication-rows]"),
    publicationCount: document.querySelector("[data-publication-count]"),
    leadSummary: document.querySelector("[data-lead-summary]"),
    systemHealth: document.querySelector("[data-system-health]"),
    trafficGuardrails: document.querySelector("[data-traffic-guardrails]"),
    isAdmin: function () { return currentUserIsAdmin; },
    postDashboardAction: postDashboardAction,
    reloadDashboard: reloadDashboard,
    setStatus: setStatus
  });
  var premiumOperations = window.FranchiseDashboardPremium.createOperations({
    premiumFunnel: premiumFunnel,
    premiumNotifications: premiumNotifications,
    premiumReports: premiumReports,
    premiumExpiring: premiumExpiring,
    premiumEmailQueue: premiumEmailQueue,
    paymentMethodForm: paymentMethodForm,
    premiumSettingsForm: premiumSettingsForm,
    isAdmin: function () { return currentUserIsAdmin; },
    postDashboardAction: postDashboardAction,
    reloadDashboard: reloadDashboard,
    setStatus: setStatus
  });
  var reviewOperations = window.FranchiseDashboardReview.createOperations({
    qualityRows: document.querySelector("[data-quality-rows]"),
    refreshQualityButton: document.querySelector("[data-refresh-quality]"),
    claimRows: document.querySelector("[data-claim-rows]"),
    editRows: document.querySelector("[data-edit-rows]"),
    ocrReviewRows: document.querySelector("[data-ocr-review-rows]"),
    editCount: document.querySelector("[data-edit-count]"),
    ocrReviewCount: document.querySelector("[data-ocr-review-count]"),
    editForm: document.querySelector("[data-edit-form]"),
    editPanelTitle: document.querySelector("[data-edit-panel-title]"),
    editPanelCopy: document.querySelector("[data-edit-panel-copy]"),
    listingSelect: document.querySelector("[data-listing-select]"),
    editReason: document.querySelector("[data-edit-reason]"),
    editFieldList: document.querySelector("[data-edit-field-list]"),
    addEditFieldButton: document.querySelector("[data-add-edit-field]"),
    editSubmitButton: document.querySelector("[data-edit-submit]"),
    editHelp: document.querySelector("[data-edit-help]"),
    locationForm: document.querySelector("[data-location-form]"),
    locationListingSelect: document.querySelector("[data-location-listing-select]"),
    locationText: document.querySelector("[data-location-text]"),
    locationSubmit: document.querySelector("[data-location-submit]"),
    locationCurrent: document.querySelector("[data-location-current]"),
    locationHelp: document.querySelector("[data-location-help]"),
    getDashboardState: function () { return dashboardState; },
    isAdmin: function () { return currentUserIsAdmin; },
    postDashboardAction: postDashboardAction,
    reloadDashboard: reloadDashboard,
    setStatus: setStatus
  });
  var ocrOperations = ocrClient.createOperations({
    subtabs: Array.from(document.querySelectorAll("[data-ocr-subtab]")),
    subpanels: Array.from(document.querySelectorAll("[data-ocr-subpanel]")),
    providerList: document.querySelector("[data-ocr-provider-list]"),
    jobStatus: document.querySelector("[data-ocr-job-status]"),
    jobLimitSelect: document.querySelector("[data-ocr-job-limit]"),
    jobRows: document.querySelector("[data-ocr-job-rows]"),
    resultRows: document.querySelector("[data-ocr-result-rows]"),
    ocrReviewRows: document.querySelector("[data-ocr-review-rows]"),
    resultFilterForm: document.querySelector("[data-ocr-result-filter-form]"),
    resultFilterStatus: document.querySelector("[data-ocr-result-filter-status]"),
    resultFranchiseLimitSelect: document.querySelector("[data-ocr-result-franchise-limit]"),
    resultLoadMoreButton: document.querySelector("[data-ocr-result-load-more]"),
    resultResetButton: document.querySelector("[data-ocr-result-reset]"),
    dryRunButton: document.querySelector("[data-ocr-dry-run]"),
    enqueueButton: document.querySelector("[data-ocr-enqueue]"),
    runButton: document.querySelector("[data-ocr-run]"),
    retryFailedButton: document.querySelector("[data-ocr-retry-failed]"),
    batchRows: document.querySelector("[data-ocr-batch-rows]"),
    providerSelect: document.querySelector("[data-ocr-provider-select]"),
    form: document.querySelector("[data-ocr-config-form]"),
    status: document.querySelector("[data-ocr-config-status]"),
    schedulerSelect: document.querySelector("[data-ocr-scheduler-select]"),
    schedulerForm: document.querySelector("[data-ocr-scheduler-form]"),
    schedulerStatus: document.querySelector("[data-ocr-scheduler-status]"),
    isAdmin: function () { return currentUserIsAdmin; },
    postDashboardAction: postDashboardAction,
    reloadDashboard: reloadDashboard,
    setStatus: setStatus
  });

  window.FRANCHISE_AUTH_DEBUG = true;
  bindDashboardTabs();
  bindDashboardDeepLinks();
  if (authDebugRefresh) {
    authDebugRefresh.addEventListener("click", function () {
      renderAuthDebug("manual_refresh");
    });
  }
  if (authDebugCopy) {
    authDebugCopy.addEventListener("click", copyAuthDebug);
  }
  reviewOperations.bind();
  ocrOperations.bind();
  if (paymentMethodForm) {
    paymentMethodForm.addEventListener("submit", premiumOperations.submitPaymentMethod);
  }
  if (premiumSettingsForm) {
    premiumSettingsForm.addEventListener("submit", premiumOperations.submitPremiumSettings);
  }
  activateDashboardTab(initialDashboardTab(), false);
  boot();

  function bindDashboardTabs() {
    dashboardTabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        activateDashboardTab(tab.getAttribute("data-dashboard-tab"), true);
      });
      tab.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        var nextIndex = index;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % dashboardTabs.length;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + dashboardTabs.length) % dashboardTabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = dashboardTabs.length - 1;
        dashboardTabs[nextIndex].focus();
        activateDashboardTab(dashboardTabs[nextIndex].getAttribute("data-dashboard-tab"), true);
      });
    });
  }

  function initialDashboardTab() {
    var hash = (window.location.hash || "").replace(/^#/, "");
    if (dashboardTabs.some(function (tab) {
      return tab.getAttribute("data-dashboard-tab") === hash;
    })) return hash;
    return DASHBOARD_DEEP_LINK_TABS[hash] || "outreach";
  }

  function activateDashboardTab(name, updateHash) {
    if (!name) name = "outreach";
    dashboardTabs.forEach(function (tab) {
      var active = tab.getAttribute("data-dashboard-tab") === name;
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    });
    dashboardPanels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-dashboard-panel") !== name;
    });
    if (updateHash && window.history && window.history.replaceState) {
      window.history.replaceState(window.history.state, document.title, "#" + name);
    }
  }

  function bindDashboardDeepLinks() {
    document.addEventListener("click", function (event) {
      var link = event.target.closest && event.target.closest("a[href]");
      if (!link) return;
      var url;
      try {
        url = new URL(link.getAttribute("href"), window.location.href);
      } catch (_error) {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname.replace(/\/+$/, "") !== window.location.pathname.replace(/\/+$/, "")) return;
      var targetId = (url.hash || "").replace(/^#/, "");
      if (!DASHBOARD_DEEP_LINK_TABS[targetId]) return;
      event.preventDefault();
      if (window.history && window.history.pushState) {
        window.history.pushState(window.history.state, document.title, url.pathname + url.search + url.hash);
      } else {
        window.location.hash = targetId;
      }
      activateDashboardDeepLink(targetId);
    });

    window.addEventListener("hashchange", function () {
      var targetId = (window.location.hash || "").replace(/^#/, "");
      if (dashboardTabs.some(function (tab) { return tab.getAttribute("data-dashboard-tab") === targetId; })) {
        activateDashboardTab(targetId, false);
        return;
      }
      activateDashboardDeepLink(targetId);
    });
  }

  function activateDashboardDeepLink(targetId) {
    var tabName = DASHBOARD_DEEP_LINK_TABS[targetId];
    if (!tabName) return;
    activateDashboardTab(tabName, false);
    scrollDashboardDeepLink(targetId);
  }

  function scrollDashboardDeepLink(targetId) {
    window.setTimeout(function () {
      var target = document.getElementById(targetId);
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.scrollIntoView({ block: "start", behavior: "smooth" });
      target.focus({ preventScroll: true });
    }, 0);
  }

  async function boot() {
    try {
      if (!window.FranchiseAuth) throw new Error("Auth runtime belum tersedia.");
      showLoadingPanel("Memeriksa sesi admin/staff...");
      renderAuthDebug("boot:start");
      await window.FranchiseAuth.init();
      renderAuthDebug("boot:after_init");
      var cached = readDashboardCache();
      if (cached) {
        renderDashboard(cached, { cached: true });
      }

      var headers = await window.FranchiseAuth.getAuthHeaders();
      renderAuthDebug("boot:after_headers", { hasAuthorization: Boolean(headers.Authorization) });
      if (!headers.Authorization) {
        clearDashboardCache();
        showLoginPanel("Login dengan akun admin/staff untuk membuka dashboard.", false);
        return;
      }

      var response = await fetch("/dashboard-data", { headers: headers, cache: "no-store" });
      renderAuthDebug("dashboard_data:response", { status: response.status, ok: response.ok });
      if (response.status === 401) {
        clearDashboardCache();
        showLoginPanel("Sesi login kedaluwarsa. Silakan login ulang.", true);
        return;
      }
      var data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || data.error || "Dashboard gagal dimuat.");
      renderDashboard(data);
      writeDashboardCache(data);
    } catch (error) {
      if (dashboardState) {
        if (loadingEl) loadingEl.hidden = true;
        if (loginEl) loginEl.hidden = true;
        setStatus("Dashboard cache tampil, tetapi refresh data terbaru gagal: " + escapeHtml(error.message || String(error)), true);
        renderAuthDebug("boot:refresh_error_after_cache", { message: error.message || String(error) });
        return;
      }
      if (loadingEl) loadingEl.hidden = true;
      if (loginEl) loginEl.hidden = false;
      mountDeferredLogin();
      if (userEl.textContent === "Memuat sesi...") userEl.textContent = "Akses belum diizinkan";
      setStatus(error.message, true);
      renderAuthDebug("boot:error", { message: error.message || String(error) });
    }
  }

  function renderDashboard(data, options) {
    options = options || {};
    dashboardState = data;
    currentUserIsAdmin = (data.user.roles || []).indexOf("admin") >= 0;
    if (mainEl) mainEl.setAttribute("data-dashboard-protected", "ready");
    if (loadingEl) loadingEl.hidden = true;
    if (loginEl) loginEl.hidden = true;
    setStatus(options.cached ? "Dashboard dibuka dari cache sesi. Data sedang diperbarui..." : "Dashboard aktif untuk site franchisee.id.", false);
    renderAuthDebug(options.cached ? "dashboard:cache_ready" : "dashboard:ready", { roles: data.user.roles || [], cached: Boolean(options.cached) });
    userEl.textContent = (data.user.name || data.user.email || "Admin/staff") + " - " + data.user.roles.join(", ");
    setMetric("total_listings", data.overview.total_listings);
    setMetric("unclaimed_listings", data.overview.unclaimed_listings);
    setMetric("verified_listings", data.overview.verified_listings + data.overview.premium_listings);
    setMetric("pending_publish", (data.publish_state.requests_by_status.pending || 0) + (data.publish_state.requests_by_status.failed_retryable || 0));
    dashboardOperations.render(data);
    reviewOperations.render(data);
    premiumOperations.render(data.premium_operations || {});
    ocrOperations.render(data.ocr_providers || {}, data.ocr_jobs || {}, data.ocr_schedulers || {});
    if (window.FranchiseTooltip && typeof window.FranchiseTooltip.refresh === "function") {
      window.FranchiseTooltip.refresh();
    }
    activateDashboardDeepLink((window.location.hash || "").replace(/^#/, ""));
  }

  async function reloadDashboard() {
    var headers = await window.FranchiseAuth.getAuthHeaders();
    var response = await fetch("/dashboard-data", { headers: headers, cache: "no-store" });
    var data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || data.error || "Dashboard gagal dimuat ulang.");
    renderDashboard(data);
    writeDashboardCache(data);
  }

  async function postDashboardAction(payload) {
    var headers = await window.FranchiseAuth.getAuthHeaders();
    var response = await fetch("/dashboard-data", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify(payload)
    });
    var result = await response.json().catch(function () { return {}; });
    if (!response.ok || !result.success) {
      var actionError = new Error(result.message || result.error || "Dashboard action failed.");
      actionError.dashboardResult = result;
      throw actionError;
    }
    return result;
  }

  function setMetric(name, value) {
    var el = document.querySelector('[data-metric="' + name + '"]');
    if (el) el.textContent = Number(value || 0).toLocaleString("id-ID");
  }

  function setStatus(message, isError) {
    statusEl.innerHTML = message;
    statusEl.classList.toggle("dash-error", Boolean(isError));
  }

  function showLoginPanel(message, isError) {
    dashboardState = null;
    currentUserIsAdmin = false;
    userEl.textContent = "Belum login";
    if (mainEl) mainEl.setAttribute("data-dashboard-protected", "locked");
    if (loadingEl) loadingEl.hidden = true;
    if (loginEl) loginEl.hidden = false;
    mountDeferredLogin();
    setStatus(message, isError);
    renderAuthDebug("dashboard:login_panel", { message: message, isError: Boolean(isError) });
  }

  function showLoadingPanel(message) {
    userEl.textContent = "Memuat sesi...";
    if (loadingEl) loadingEl.hidden = false;
    if (loginEl) loginEl.hidden = true;
    setStatus(message || "Memeriksa akses admin/staff...", false);
  }

  function mountDeferredLogin() {
    var root = document.getElementById("franchise-auth-root");
    if (!root || root.getAttribute("data-auth-rendered") === "true") return;
    if (window.FranchiseAuth && typeof window.FranchiseAuth.mountAuthPage === "function") {
      window.FranchiseAuth.mountAuthPage({ force: true });
    }
  }

  function readDashboardCache() {
    try {
      if (!window.sessionStorage || !window.FranchiseAuth || !window.FranchiseAuth.clerk) return null;
      var raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
      if (!raw) return null;
      var envelope = JSON.parse(raw);
      if (!envelope || !envelope.data || !envelope.clerk_user_id || !envelope.cached_at) return null;
      if (Date.now() - Number(envelope.cached_at || 0) > DASHBOARD_CACHE_TTL_MS) return null;
      var clerkUserId = window.FranchiseAuth.clerk.user && window.FranchiseAuth.clerk.user.id;
      var hasSession = Boolean(window.FranchiseAuth.clerk.session);
      if (!hasSession) return null;
      if (!clerkUserId || envelope.clerk_user_id !== clerkUserId) return null;
      return envelope.data;
    } catch (_error) {
      return null;
    }
  }

  function writeDashboardCache(data) {
    try {
      if (!window.sessionStorage || !window.FranchiseAuth || !window.FranchiseAuth.clerk || !data || !data.success) return;
      if (!window.FranchiseAuth.clerk.session) return;
      var clerkUserId = window.FranchiseAuth.clerk.user && window.FranchiseAuth.clerk.user.id;
      if (!clerkUserId) return;
      sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
        clerk_user_id: clerkUserId,
        cached_at: Date.now(),
        data: data
      }));
    } catch (_error) {
      // Cache is an optional speed-up only.
    }
  }

  function clearDashboardCache() {
    try {
      if (window.sessionStorage) sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
    } catch (_error) {
      // Ignore cache cleanup failures.
    }
  }

  function renderAuthDebug(stage, extra) {
    if (!authDebugOutput || !authDebugSummary) return;
    var snapshot = window.FranchiseAuth && typeof window.FranchiseAuth.getDebugSnapshot === "function"
      ? window.FranchiseAuth.getDebugSnapshot()
      : { generatedAt: new Date().toISOString(), events: [], note: "FranchiseAuth.getDebugSnapshot belum tersedia." };
    var clerk = snapshot.clerk || {};
    var view = {
      stage: stage,
      extra: extra || {},
      generatedAt: snapshot.generatedAt,
      location: snapshot.location,
      hasWindowClerk: snapshot.hasWindowClerk,
      hasAuthClerk: snapshot.hasAuthClerk,
      clerk: clerk,
      storage: snapshot.storage,
      browserState: snapshot.browserState,
      redirect: snapshot.redirect,
      syncedUser: snapshot.syncedUser,
      recentEvents: (snapshot.events || []).slice(-18)
    };
    authDebugSummary.textContent = [
      "stage=" + stage,
      "loaded=" + Boolean(clerk.loaded),
      "user=" + Boolean(clerk.hasUser),
      "session=" + Boolean(clerk.hasSession),
      "clientSessions=" + Number(clerk.clientSessionCount || 0)
    ].join(" | ");
    authDebugOutput.textContent = JSON.stringify(view, null, 2);
    if (window.console && console.info) console.info("[DashboardAuthDebug]", view);
  }

  async function copyAuthDebug() {
    if (!authDebugOutput) return;
    var text = authDebugOutput.textContent || "";
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        copyTextFallback(text);
      }
      if (authDebugSummary) authDebugSummary.textContent = "Auth debug copied. Paste it into the chat.";
    } catch (error) {
      copyTextFallback(text);
      if (authDebugSummary) authDebugSummary.textContent = "Auth debug copied with fallback. Paste it into the chat.";
    }
  }

  function copyTextFallback(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

}());
