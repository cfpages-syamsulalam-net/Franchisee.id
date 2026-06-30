(function () {
  var statusEl = document.querySelector("[data-dashboard-status]");
  var userEl = document.querySelector("[data-dashboard-user]");
  var mainEl = document.querySelector("[data-dashboard-protected]");
  var loginEl = document.querySelector("[data-dashboard-login]");
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
  var dashboardState = null;
  var currentUserIsAdmin = false;
  var dashboardUtils = window.FranchiseDashboardUtils;
  var escapeHtml = dashboardUtils.escapeHtml;
  var dashboardOperations = window.FranchiseDashboardOperations.createOperations({
    outreachRows: document.querySelector("[data-outreach-rows]"),
    outreachCount: document.querySelector("[data-outreach-count]"),
    premiumPaymentRows: document.querySelector("[data-premium-payment-rows]"),
    publishState: document.querySelector("[data-publish-state]"),
    publicationRows: document.querySelector("[data-publication-rows]"),
    leadSummary: document.querySelector("[data-lead-summary]"),
    systemHealth: document.querySelector("[data-system-health]"),
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
    editCount: document.querySelector("[data-edit-count]"),
    editForm: document.querySelector("[data-edit-form]"),
    editPanelTitle: document.querySelector("[data-edit-panel-title]"),
    editPanelCopy: document.querySelector("[data-edit-panel-copy]"),
    listingSelect: document.querySelector("[data-listing-select]"),
    editReason: document.querySelector("[data-edit-reason]"),
    editFieldList: document.querySelector("[data-edit-field-list]"),
    addEditFieldButton: document.querySelector("[data-add-edit-field]"),
    editSubmitButton: document.querySelector("[data-edit-submit]"),
    editHelp: document.querySelector("[data-edit-help]"),
    getDashboardState: function () { return dashboardState; },
    isAdmin: function () { return currentUserIsAdmin; },
    postDashboardAction: postDashboardAction,
    reloadDashboard: reloadDashboard,
    setStatus: setStatus
  });

  window.FRANCHISE_AUTH_DEBUG = true;
  bindDashboardTabs();
  if (authDebugRefresh) {
    authDebugRefresh.addEventListener("click", function () {
      renderAuthDebug("manual_refresh");
    });
  }
  if (authDebugCopy) {
    authDebugCopy.addEventListener("click", copyAuthDebug);
  }
  reviewOperations.bind();
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
    return dashboardTabs.some(function (tab) {
      return tab.getAttribute("data-dashboard-tab") === hash;
    }) ? hash : "outreach";
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

  async function boot() {
    try {
      if (!window.FranchiseAuth) throw new Error("Auth runtime belum tersedia.");
      renderAuthDebug("boot:start");
      await window.FranchiseAuth.init();
      renderAuthDebug("boot:after_init");
      var headers = await window.FranchiseAuth.getAuthHeaders();
      renderAuthDebug("boot:after_headers", { hasAuthorization: Boolean(headers.Authorization) });
      if (!headers.Authorization) {
        showLoginPanel("Login dengan akun admin/staff untuk membuka dashboard.", false);
        return;
      }

      var response = await fetch("/dashboard-data", { headers: headers });
      renderAuthDebug("dashboard_data:response", { status: response.status, ok: response.ok });
      if (response.status === 401) {
        showLoginPanel("Sesi login kedaluwarsa. Silakan login ulang.", true);
        return;
      }
      var data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || data.error || "Dashboard gagal dimuat.");
      renderDashboard(data);
    } catch (error) {
      if (loginEl) loginEl.hidden = false;
      if (userEl.textContent === "Memuat sesi...") userEl.textContent = "Akses belum diizinkan";
      setStatus(error.message, true);
      renderAuthDebug("boot:error", { message: error.message || String(error) });
    }
  }

  function renderDashboard(data) {
    dashboardState = data;
    currentUserIsAdmin = (data.user.roles || []).indexOf("admin") >= 0;
    if (mainEl) mainEl.setAttribute("data-dashboard-protected", "ready");
    if (loginEl) loginEl.hidden = true;
    setStatus("Dashboard aktif untuk site franchisee.id.", false);
    renderAuthDebug("dashboard:ready", { roles: data.user.roles || [] });
    userEl.textContent = (data.user.name || data.user.email || "Admin/staff") + " - " + data.user.roles.join(", ");
    setMetric("total_listings", data.overview.total_listings);
    setMetric("unclaimed_listings", data.overview.unclaimed_listings);
    setMetric("verified_listings", data.overview.verified_listings + data.overview.premium_listings);
    setMetric("pending_publish", (data.publish_state.requests_by_status.pending || 0) + (data.publish_state.requests_by_status.failed_retryable || 0));
    dashboardOperations.render(data);
    reviewOperations.render(data);
    premiumOperations.render(data.premium_operations || {});
    if (window.FranchiseTooltip && typeof window.FranchiseTooltip.refresh === "function") {
      window.FranchiseTooltip.refresh();
    }
  }

  async function reloadDashboard() {
    var headers = await window.FranchiseAuth.getAuthHeaders();
    var response = await fetch("/dashboard-data", { headers: headers });
    var data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || data.error || "Dashboard gagal dimuat ulang.");
    renderDashboard(data);
  }

  async function postDashboardAction(payload) {
    var headers = await window.FranchiseAuth.getAuthHeaders();
    var response = await fetch("/dashboard-data", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify(payload)
    });
    var result = await response.json().catch(function () { return {}; });
    if (!response.ok || !result.success) throw new Error(result.message || result.error || "Dashboard action failed.");
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
    userEl.textContent = "Belum login";
    if (loginEl) loginEl.hidden = false;
    setStatus(message, isError);
    renderAuthDebug("dashboard:login_panel", { message: message, isError: Boolean(isError) });
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
