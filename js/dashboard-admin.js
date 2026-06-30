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
  var outreachRows = document.querySelector("[data-outreach-rows]");
  var publishState = document.querySelector("[data-publish-state]");
  var publicationRows = document.querySelector("[data-publication-rows]");
  var premiumPaymentRows = document.querySelector("[data-premium-payment-rows]");
  var premiumFunnel = document.querySelector("[data-premium-funnel]");
  var premiumNotifications = document.querySelector("[data-premium-notifications]");
  var premiumReports = document.querySelector("[data-premium-reports]");
  var premiumExpiring = document.querySelector("[data-premium-expiring]");
  var premiumEmailQueue = document.querySelector("[data-premium-email-queue]");
  var paymentMethodForm = document.querySelector("[data-payment-method-form]");
  var premiumSettingsForm = document.querySelector("[data-premium-settings-form]");
  var outreachCount = document.querySelector("[data-outreach-count]");
  var leadSummary = document.querySelector("[data-lead-summary]");
  var systemHealth = document.querySelector("[data-system-health]");
  var dashboardState = null;
  var currentUserIsAdmin = false;
  var dashboardUtils = window.FranchiseDashboardUtils;
  var escapeHtml = dashboardUtils.escapeHtml;
  var escapeAttr = dashboardUtils.escapeAttr;
  var formatCurrency = dashboardUtils.formatCurrency;
  var renderActionToolbar = dashboardUtils.renderActionToolbar;
  var renderActionButton = dashboardUtils.renderActionButton;
  var renderActionLink = dashboardUtils.renderActionLink;
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
    renderOutreach(data.outreach_queue || [], data.outreach_summary || {});
    reviewOperations.render(data);
    premiumOperations.render(data.premium_operations || {});
    renderPremiumPayments(data.pending_premium_payments || []);
    renderPublish(data.publish_state || {});
    renderPublicationControls(data.publication_controls || { sites: [], listings: [] });
    renderLeads(data.lead_summary || { by_status: {}, recent: [] });
    renderHealth(data.system_health || {});
    if (window.FranchiseTooltip && typeof window.FranchiseTooltip.refresh === "function") {
      window.FranchiseTooltip.refresh();
    }
  }

  function renderOutreach(rows, summary) {
    var contactReady = Number(summary.contact_ready || 0);
    var publishedUnclaimed = Number(summary.published_unclaimed || 0);
    var queueLimit = Number(summary.queue_limit || 0);
    var badge = rows.length + " listing";
    if (contactReady || publishedUnclaimed) {
      badge = rows.length + " dari " + contactReady + " kontak siap";
      if (publishedUnclaimed > contactReady) badge += " / " + publishedUnclaimed + " unclaimed published";
      if (queueLimit && contactReady > rows.length) badge += " (limit " + queueLimit + ")";
    }
    outreachCount.textContent = badge;
    if (!rows.length) {
      outreachRows.innerHTML = '<tr><td colspan="4" class="dash-empty">Tidak ada unclaimed listing dengan nomor WhatsApp/mobile.</td></tr>';
      return;
    }
    outreachRows.innerHTML = rows.map(function (row) {
      var contact = row.contacts && row.contacts[0];
      var waUrl = row.primary_whatsapp_url || "";
      var message = waUrl.indexOf("text=") >= 0 ? decodeURIComponent(waUrl.split("text=")[1] || "") : "";
      return '<tr>' +
        '<td><a href="' + escapeAttr(row.public_url) + '" target="_blank" rel="noopener">' + escapeHtml(row.brand_name) + '</a><br><span class="dash-badge">' + escapeHtml(row.category || "Tanpa kategori") + '</span></td>' +
        '<td>' + (contact ? escapeHtml(contact.label + ": " + contact.display) : '<span class="dash-badge bad">Tidak ada WA</span>') + '</td>' +
        '<td>' + (row.last_outreach_at ? 'Terakhir: ' + escapeHtml(row.last_outreach_at) : '<span class="dash-badge good">Belum pernah</span>') + '</td>' +
        '<td>' + renderActionToolbar([
          waUrl ? renderActionLink({
            href: waUrl,
            label: "Buka WhatsApp",
            icon: "fab fa-whatsapp",
            tone: "success"
          }) : "",
          waUrl ? renderActionButton({
            label: "Catat outreach terkirim",
            icon: "fas fa-check",
            attrs: {
              "data-log-outreach": "",
              "data-franchise-id": row.id,
              "data-contact": contact.display,
              "data-message": message
            }
          }) : "",
          renderActionLink({
            href: row.claim_url,
            label: "Buka halaman claim",
            icon: "fas fa-link"
          })
        ], "Aksi outreach") + '</td>' +
      '</tr>';
    }).join("");

    outreachRows.querySelectorAll("[data-log-outreach]").forEach(function (link) {
      link.addEventListener("click", function () {
        logOutreach(link);
      });
    });
  }

  function renderPublish(state) {
    var counts = state.requests_by_status || {};
    publishState.innerHTML = [
      ["Enabled", state.is_enabled ? "Ya" : "Tidak"],
      ["Dirty since", state.dirty_since || "-"],
      ["Pending", counts.pending || 0],
      ["Queued", counts.queued || 0],
      ["Failed retryable", counts.failed_retryable || 0],
      ["Last publish", state.last_publish_triggered_at || state.last_published_at || "-"]
    ].map(function (item) {
      return '<li><strong>' + escapeHtml(item[0]) + '</strong><span>' + escapeHtml(item[1]) + '</span></li>';
    }).join("");
  }

  function renderPremiumPayments(rows) {
    if (!premiumPaymentRows) return;
    if (!rows.length) {
      premiumPaymentRows.innerHTML = '<tr><td colspan="5" class="dash-empty">Tidak ada konfirmasi Premium pending.</td></tr>';
      return;
    }
    premiumPaymentRows.innerHTML = rows.map(function (row) {
      var readiness = row.readiness || {};
      var proof = row.proof_url
        ? '<br><a class="dash-link" href="' + escapeAttr(row.proof_url) + '" target="_blank" rel="noopener"><i class="fas fa-receipt" aria-hidden="true"></i> Bukti transfer</a>'
        : '<br><span class="dash-badge bad">Tanpa bukti</span>';
      var actions = currentUserIsAdmin
        ? renderActionToolbar([
          renderActionButton({
            label: "Aktifkan Premium",
            icon: "fas fa-check",
            tone: "success",
            attrs: {
              "data-review-premium": "",
              "data-confirmation-id": row.id,
              "data-decision": "approve"
            }
          }),
          renderActionButton({
            label: "Tolak konfirmasi",
            icon: "fas fa-times",
            tone: "danger",
            attrs: {
              "data-review-premium": "",
              "data-confirmation-id": row.id,
              "data-decision": "reject"
            }
          })
        ], "Review pembayaran Premium")
        : '<span class="dash-muted">Menunggu admin.</span>';
      return '<tr>' +
        '<td><strong>' + escapeHtml(row.brand_name || row.franchise_id) + '</strong><br><span class="dash-muted">' + escapeHtml(row.order_id || "") + '</span></td>' +
        '<td><strong>' + escapeHtml(formatCurrency(row.submitted_amount)) + '</strong><br><span class="dash-muted">Tagihan ' + escapeHtml(formatCurrency(row.payable_amount)) + ' / kode ' + escapeHtml(row.unique_code || "-") + '</span></td>' +
        '<td>' + escapeHtml(row.payer_name || row.display_name || row.primary_email || "-") + '<br><span class="dash-muted">' + escapeHtml(row.payer_bank || "Bank belum diisi") + ' · ' + escapeHtml(row.submitted_paid_at || row.created_at || "") + '</span>' + proof + '</td>' +
        '<td><span class="dash-badge ' + (readiness.is_ready ? "good" : "warn") + '">' + escapeHtml((readiness.score || 0) + "/" + (readiness.total || 0)) + '</span><br><span class="dash-muted">' + escapeHtml((readiness.missing || []).slice(0, 3).join(", ") || "Siap tampil") + '</span></td>' +
        '<td>' + actions + '</td>' +
      '</tr>';
    }).join("");

    premiumPaymentRows.querySelectorAll("[data-review-premium]").forEach(function (button) {
      button.addEventListener("click", function () {
        reviewPremiumPayment(button);
      });
    });
  }

  function renderPublicationControls(data) {
    if (!publicationRows) return;
    var sites = data.sites || [];
    var listings = data.listings || [];
    if (!listings.length) {
      publicationRows.innerHTML = '<tr><td colspan="2" class="dash-empty">Belum ada data publikasi.</td></tr>';
      return;
    }
    publicationRows.innerHTML = listings.slice(0, 40).map(function (row) {
      var publications = row.publications || [];
      return '<tr>' +
        '<td><strong>' + escapeHtml(row.brand_name || row.franchise_id) + '</strong><br><span class="dash-muted">' + escapeHtml(row.franchise_id) + '</span></td>' +
        '<td><div class="dash-publication-grid">' + sites.map(function (site) {
          var publication = publications.find(function (item) { return item.site_id === site.id; });
          var status = publication ? publication.publication_status : "draft";
          var disabled = !currentUserIsAdmin || !publication;
          return '<label class="dash-publication-cell">' +
            '<span>' + escapeHtml(site.domain || site.name || site.id) + '</span>' +
            '<select data-publication-status data-last-value="' + escapeAttr(status) + '" data-franchise-id="' + escapeAttr(row.franchise_id) + '" data-site-id="' + escapeAttr(site.id) + '" ' + (disabled ? "disabled" : "") + '>' +
              publicationStatusOptions(status) +
            '</select>' +
          '</label>';
        }).join("") + '</div></td>' +
      '</tr>';
    }).join("");

    publicationRows.querySelectorAll("[data-publication-status]").forEach(function (select) {
      select.addEventListener("change", function () {
        updatePublicationStatus(select);
      });
    });
  }

  function renderLeads(data) {
    var counts = data.by_status || {};
    var recent = data.recent || [];
    var total = Object.keys(counts).reduce(function (sum, key) { return sum + Number(counts[key] || 0); }, 0);
    leadSummary.innerHTML = [
      '<li><strong>Total leads</strong><span>' + escapeHtml(total) + '</span></li>',
      '<li><strong>New</strong><span>' + escapeHtml(counts.new || 0) + '</span></li>',
      '<li><strong>Contacted/qualified</strong><span>' + escapeHtml(Number(counts.contacted || 0) + Number(counts.qualified || 0)) + '</span></li>'
    ].concat(recent.slice(0, 4).map(function (row) {
      return '<li><strong>' + escapeHtml(row.brand_name || "Lead umum") + '</strong><span>' + escapeHtml(row.name || row.email || row.whatsapp || "Tanpa kontak") + ' - ' + escapeHtml(row.status) + '</span></li>';
    })).join("");
  }

  function renderHealth(data) {
    var migration = data.d1 && data.d1.latest_migration;
    var rebuild = data.publish && data.publish.recent_rebuild;
    var operations = data.operations || {};
    var opCounts = operations.last_24h_by_severity || {};
    var analytics = data.analytics && data.analytics.last_30d_by_type ? data.analytics.last_30d_by_type : {};
    var webhookCount = (data.webhooks || []).reduce(function (sum, row) { return sum + Number(row.count || 0); }, 0);
    var recentOps = operations.recent || [];
    systemHealth.innerHTML = [
      '<li><strong>D1</strong><span>' + escapeHtml(migration && migration.name ? migration.name : "Connected") + '</span></li>',
      '<li><strong>Clerk</strong><span>' + escapeHtml(data.clerk && data.clerk.note ? data.clerk.note : "Session verified") + '</span></li>',
      '<li><strong>Recent rebuild</strong><span>' + escapeHtml(rebuild && rebuild.status ? rebuild.status + " - " + (rebuild.reason || "") : "-") + '</span></li>',
      '<li><strong>API 24 jam</strong><span>' + escapeHtml("error " + (opCounts.error || 0) + " / warning " + (opCounts.warning || 0)) + '</span></li>',
      '<li><strong>Webhook</strong><span>' + escapeHtml(webhookCount ? webhookCount + " event tercatat" : "Belum ada event tercatat") + '</span></li>',
      '<li><strong>Aktivitas 30 hari</strong><span>' + escapeHtml("view " + (analytics.listing_view || 0) + " / save " + (analytics.save || 0) + " / inquiry " + (analytics.inquiry || 0)) + '</span></li>'
    ].concat(recentOps.slice(0, 3).map(function (row) {
      return '<li><strong>' + escapeHtml(row.event_type || "Event") + '</strong><span>' + escapeHtml((row.severity || "") + " - " + (row.message || row.route || "")) + '</span></li>';
    })).join("");
  }

  function publicationStatusOptions(selected) {
    return ["draft", "published", "hidden", "archived"].map(function (status) {
      return '<option value="' + escapeAttr(status) + '"' + (status === selected ? " selected" : "") + '>' + escapeHtml(status) + '</option>';
    }).join("");
  }

  async function logOutreach(link) {
    try {
      link.disabled = true;
      link.classList.add("is-busy");
      var headers = await window.FranchiseAuth.getAuthHeaders();
      var response = await fetch("/dashboard-data", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, headers),
        body: JSON.stringify({
          action: "log_outreach",
          franchise_id: link.getAttribute("data-franchise-id"),
          contact_value: link.getAttribute("data-contact") || "",
          message_text: link.getAttribute("data-message") || "",
          outcome: "contacted"
        })
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok || !result.success) throw new Error(result.message || result.error || "Gagal mencatat outreach.");
      link.classList.remove("is-busy");
      link.classList.add("is-done");
    } catch (error) {
      link.disabled = false;
      link.classList.remove("is-busy");
      console.warn("Outreach log failed", error);
    }
  }

  async function reviewPremiumPayment(button) {
    try {
      button.disabled = true;
      await postDashboardAction({
        action: "review_premium_payment",
        confirmation_id: button.getAttribute("data-confirmation-id"),
        decision: button.getAttribute("data-decision"),
        notes: ""
      });
      await reloadDashboard();
    } catch (error) {
      button.disabled = false;
      setStatus(error.message, true);
    }
  }

  async function updatePublicationStatus(select) {
    var previous = select.getAttribute("data-last-value") || "";
    var value = select.value;
    select.disabled = true;
    try {
      await postDashboardAction({
        action: "update_publication",
        franchise_id: select.getAttribute("data-franchise-id"),
        site_id: select.getAttribute("data-site-id"),
        publication_status: value
      });
      select.setAttribute("data-last-value", value);
      setStatus("Status publikasi diperbarui.", false);
      await reloadDashboard();
    } catch (error) {
      if (previous) select.value = previous;
      setStatus(error.message || "Status publikasi gagal diperbarui.", true);
    } finally {
      select.disabled = !currentUserIsAdmin;
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
