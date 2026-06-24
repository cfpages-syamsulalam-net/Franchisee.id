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
  var qualityRows = document.querySelector("[data-quality-rows]");
  var claimRows = document.querySelector("[data-claim-rows]");
  var publishState = document.querySelector("[data-publish-state]");
  var outreachCount = document.querySelector("[data-outreach-count]");
  var editRows = document.querySelector("[data-edit-rows]");
  var editCount = document.querySelector("[data-edit-count]");
  var editForm = document.querySelector("[data-edit-form]");
  var listingSelect = document.querySelector("[data-listing-select]");
  var editReason = document.querySelector("[data-edit-reason]");
  var editJson = document.querySelector("[data-edit-json]");
  var leadSummary = document.querySelector("[data-lead-summary]");
  var systemHealth = document.querySelector("[data-system-health]");
  var dashboardState = null;
  var currentUserIsAdmin = false;

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
  if (editJson && !editJson.value) {
    editJson.value = JSON.stringify({ phone: "0812 0000 0000", office_address: "Jakarta" }, null, 2);
  }
  if (editForm) {
    editForm.addEventListener("submit", submitEditSuggestion);
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
    renderOutreach(data.outreach_queue || []);
    renderQuality(data.data_quality || []);
    renderClaims(data.pending_claims || []);
    renderPublish(data.publish_state || {});
    renderListingOptions(data.editable_listings || []);
    renderEditSuggestions(data.edit_suggestions || { summary: {}, pending: [] });
    renderLeads(data.lead_summary || { by_status: {}, recent: [] });
    renderHealth(data.system_health || {});
  }

  function renderOutreach(rows) {
    outreachCount.textContent = rows.length + " listing";
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
        '<td><div class="dash-actions">' +
          (waUrl ? '<a class="dash-button" href="' + escapeAttr(waUrl) + '" target="_blank" rel="noopener">Buka WA</a>' : '') +
          (waUrl ? '<button class="dash-button secondary" type="button" data-log-outreach data-franchise-id="' + escapeAttr(row.id) + '" data-contact="' + escapeAttr(contact.display) + '" data-message="' + escapeAttr(message) + '">Catat terkirim</button>' : '') +
          '<a class="dash-button secondary" href="' + escapeAttr(row.claim_url) + '" target="_blank" rel="noopener">Claim</a>' +
        '</div></td>' +
      '</tr>';
    }).join("");

    outreachRows.querySelectorAll("[data-log-outreach]").forEach(function (link) {
      link.addEventListener("click", function () {
        logOutreach(link);
      });
    });
  }

  function renderQuality(rows) {
    if (!rows.length) {
      qualityRows.innerHTML = '<tr><td colspan="4" class="dash-empty">Tidak ada warning prioritas.</td></tr>';
      return;
    }
    qualityRows.innerHTML = rows.map(function (row) {
      return '<tr>' +
        '<td><a href="' + escapeAttr(row.public_url) + '" target="_blank" rel="noopener">' + escapeHtml(row.brand_name) + '</a></td>' +
        '<td>' + escapeHtml(row.category || "-") + '</td>' +
        '<td>' + row.warnings.map(function (warning) { return '<span class="dash-badge">' + escapeHtml(warning) + '</span>'; }).join(" ") + '</td>' +
        '<td><button class="dash-button secondary" type="button" data-quick-edit data-franchise-id="' + escapeAttr(row.id) + '" data-brand="' + escapeAttr(row.brand_name) + '" data-warnings="' + escapeAttr(row.warnings.join(",")) + '">Suggest</button></td>' +
      '</tr>';
    }).join("");

    qualityRows.querySelectorAll("[data-quick-edit]").forEach(function (button) {
      button.addEventListener("click", function () {
        seedEditSuggestion(button);
      });
    });
  }

  function renderClaims(rows) {
    if (!rows.length) {
      claimRows.innerHTML = '<li><strong>Tidak ada claim pending</strong><span>Queue claim kosong.</span></li>';
      return;
    }
    claimRows.innerHTML = rows.map(function (row) {
      var actions = currentUserIsAdmin
        ? '<div class="dash-actions"><button class="dash-button" type="button" data-review-claim data-claim-id="' + escapeAttr(row.id) + '" data-decision="approve">Approve</button><button class="dash-button secondary" type="button" data-review-claim data-claim-id="' + escapeAttr(row.id) + '" data-decision="reject">Reject</button></div>'
        : '<span>Login admin dibutuhkan untuk approve/reject.</span>';
      return '<li><strong>' + escapeHtml(row.brand_name) + '</strong><span>' + escapeHtml(row.claimant_email || row.claimant_name || "Tanpa claimant") + ' - ' + escapeHtml(row.created_at) + '</span>' + actions + '</li>';
    }).join("");

    claimRows.querySelectorAll("[data-review-claim]").forEach(function (button) {
      button.addEventListener("click", function () {
        reviewClaim(button);
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

  function renderListingOptions(rows) {
    if (!listingSelect) return;
    listingSelect.innerHTML = '<option value="">Pilih listing...</option>' + rows.map(function (row) {
      return '<option value="' + escapeAttr(row.id) + '">' + escapeHtml(row.brand_name + " - " + (row.category || "Tanpa kategori")) + '</option>';
    }).join("");
  }

  function renderEditSuggestions(data) {
    var pending = data.pending || [];
    var summary = data.summary || {};
    editCount.textContent = (summary.pending || 0) + " pending";
    if (!pending.length) {
      editRows.innerHTML = '<tr><td colspan="4" class="dash-empty">Tidak ada edit suggestion pending.</td></tr>';
      return;
    }

    editRows.innerHTML = pending.map(function (row) {
      var diff = Object.keys(row.suggested_value || {}).map(function (field) {
        return '<span class="dash-badge">' + escapeHtml(field) + '</span>';
      }).join(" ");
      var actions = currentUserIsAdmin
        ? '<div class="dash-actions"><button class="dash-button" type="button" data-review-edit data-suggestion-id="' + escapeAttr(row.id) + '" data-decision="approve">Approve</button><button class="dash-button secondary" type="button" data-review-edit data-suggestion-id="' + escapeAttr(row.id) + '" data-decision="reject">Reject</button></div>'
        : '<span class="dash-muted">Menunggu admin.</span>';
      return '<tr>' +
        '<td><a href="' + escapeAttr(row.public_url || "#") + '" target="_blank" rel="noopener">' + escapeHtml(row.brand_name) + '</a><br><span class="dash-muted">' + escapeHtml(row.suggested_by_email || row.suggested_by_name || "staff") + '</span></td>' +
        '<td>' + diff + '<pre class="dash-muted">' + escapeHtml(JSON.stringify(row.suggested_value || {}, null, 2)) + '</pre></td>' +
        '<td>' + escapeHtml(row.reason || "-") + '</td>' +
        '<td>' + actions + '</td>' +
      '</tr>';
    }).join("");

    editRows.querySelectorAll("[data-review-edit]").forEach(function (button) {
      button.addEventListener("click", function () {
        reviewEditSuggestion(button);
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
    systemHealth.innerHTML = [
      '<li><strong>D1</strong><span>' + escapeHtml(migration && migration.name ? migration.name : "Connected") + '</span></li>',
      '<li><strong>Clerk</strong><span>' + escapeHtml(data.clerk && data.clerk.note ? data.clerk.note : "Session verified") + '</span></li>',
      '<li><strong>Recent rebuild</strong><span>' + escapeHtml(rebuild && rebuild.status ? rebuild.status + " - " + (rebuild.reason || "") : "-") + '</span></li>'
    ].join("");
  }

  function seedEditSuggestion(button) {
    var franchiseId = button.getAttribute("data-franchise-id") || "";
    var warnings = (button.getAttribute("data-warnings") || "").split(",");
    listingSelect.value = franchiseId;
    editReason.value = "Data quality: " + warnings.filter(Boolean).join(", ");
    editJson.value = JSON.stringify(suggestedEmptyDiff(warnings), null, 2);
    editJson.focus();
  }

  function suggestedEmptyDiff(warnings) {
    var diff = {};
    if (warnings.indexOf("missing_contact") >= 0) diff.phone = "";
    if (warnings.indexOf("missing_category") >= 0) diff.category = "";
    if (warnings.indexOf("missing_description") >= 0 || warnings.indexOf("likely_all_caps") >= 0) diff.short_desc = "";
    if (warnings.indexOf("missing_image") >= 0) diff.logo_url = "";
    return Object.keys(diff).length ? diff : { short_desc: "" };
  }

  async function logOutreach(link) {
    try {
      link.disabled = true;
      link.textContent = "Mencatat...";
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
      link.textContent = "Tercatat";
    } catch (error) {
      link.disabled = false;
      link.textContent = "Catat terkirim";
      console.warn("Outreach log failed", error);
    }
  }

  async function submitEditSuggestion(event) {
    event.preventDefault();
    try {
      var changes = JSON.parse(editJson.value || "{}");
      var result = await postDashboardAction({
        action: "suggest_edit",
        franchise_id: listingSelect.value,
        changes: changes,
        reason: editReason.value || ""
      });
      setStatus(result.applied ? "Edit langsung diterapkan dan publish queue sudah ditandai dirty." : "Edit suggestion dikirim untuk admin review.", false);
      await reloadDashboard();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function reviewEditSuggestion(button) {
    try {
      button.disabled = true;
      await postDashboardAction({
        action: "review_edit_suggestion",
        suggestion_id: button.getAttribute("data-suggestion-id"),
        decision: button.getAttribute("data-decision"),
        notes: ""
      });
      await reloadDashboard();
    } catch (error) {
      button.disabled = false;
      setStatus(error.message, true);
    }
  }

  async function reviewClaim(button) {
    try {
      button.disabled = true;
      await postDashboardAction({
        action: "review_claim",
        claim_id: button.getAttribute("data-claim-id"),
        decision: button.getAttribute("data-decision"),
        notes: ""
      });
      await reloadDashboard();
    } catch (error) {
      button.disabled = false;
      setStatus(error.message, true);
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
}());
