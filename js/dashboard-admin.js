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
  var refreshQualityButton = document.querySelector("[data-refresh-quality]");
  var claimRows = document.querySelector("[data-claim-rows]");
  var publishState = document.querySelector("[data-publish-state]");
  var outreachCount = document.querySelector("[data-outreach-count]");
  var editRows = document.querySelector("[data-edit-rows]");
  var editCount = document.querySelector("[data-edit-count]");
  var editForm = document.querySelector("[data-edit-form]");
  var listingSelect = document.querySelector("[data-listing-select]");
  var editReason = document.querySelector("[data-edit-reason]");
  var editFieldList = document.querySelector("[data-edit-field-list]");
  var addEditFieldButton = document.querySelector("[data-add-edit-field]");
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
  if (editForm) {
    editForm.addEventListener("submit", submitEditSuggestion);
  }
  if (addEditFieldButton) {
    addEditFieldButton.addEventListener("click", function () {
      addEditFieldRow("phone", "");
    });
  }
  if (listingSelect) {
    listingSelect.addEventListener("change", refreshFieldOldValues);
  }
  if (refreshQualityButton) {
    refreshQualityButton.addEventListener("click", refreshQualityChecks);
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
    renderQuality(data.data_quality || []);
    renderClaims(data.pending_claims || []);
    renderPublish(data.publish_state || {});
    renderListingOptions(data.editable_listings || []);
    ensureEditFieldRows();
    renderEditSuggestions(data.edit_suggestions || { summary: {}, pending: [] });
    renderLeads(data.lead_summary || { by_status: {}, recent: [] });
    renderHealth(data.system_health || {});
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
      var actions = currentUserIsAdmin
        ? '<div class="dash-actions"><button class="dash-button" type="button" data-review-edit data-suggestion-id="' + escapeAttr(row.id) + '" data-decision="approve">Approve</button><button class="dash-button secondary" type="button" data-review-edit data-suggestion-id="' + escapeAttr(row.id) + '" data-decision="reject">Reject</button></div>'
        : '<span class="dash-muted">Menunggu admin.</span>';
      return '<tr>' +
        '<td><a href="' + escapeAttr(row.public_url || "#") + '" target="_blank" rel="noopener">' + escapeHtml(row.brand_name) + '</a><br><span class="dash-muted">' + escapeHtml(row.suggested_by_email || row.suggested_by_name || "staff") + '</span></td>' +
        '<td>' + renderFieldDiff(row.old_value || {}, row.suggested_value || {}) + '</td>' +
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
    renderSeededEditFields(warnings);
    if (editFieldList) {
      var firstInput = editFieldList.querySelector("[data-edit-value]");
      if (firstInput) firstInput.focus();
    }
  }

  function renderSeededEditFields(warnings) {
    var fields = [];
    if (warnings.indexOf("missing_contact") >= 0 || warnings.indexOf("suspicious_contact") >= 0) fields.push("phone");
    if (warnings.indexOf("missing_category") >= 0) fields.push("category");
    if (warnings.indexOf("missing_description") >= 0 || warnings.indexOf("likely_all_caps") >= 0) fields.push("short_desc");
    if (warnings.indexOf("missing_image") >= 0) fields.push("logo_url");
    if (warnings.indexOf("invalid_url") >= 0) fields.push("logo_url");
    if (!fields.length) fields.push("short_desc");
    clearEditFieldRows();
    fields.forEach(function (field) {
      addEditFieldRow(field, "");
    });
  }

  function ensureEditFieldRows() {
    if (!editFieldList) return;
    if (!editFieldList.children.length) addEditFieldRow("phone", "");
  }

  function clearEditFieldRows() {
    if (editFieldList) editFieldList.innerHTML = "";
  }

  function addEditFieldRow(fieldName, value) {
    if (!editFieldList) return;
    var fields = getEditableFields();
    var selected = fields.some(function (field) { return field.name === fieldName; }) ? fieldName : fields[0].name;
    var row = document.createElement("div");
    row.className = "dash-field-row";
    row.innerHTML = '<div class="dash-field-main">' +
      '<label>Field<select data-edit-field>' + renderFieldOptions(selected) + '</select></label>' +
      '<label>Nilai baru<span data-edit-value-wrap></span><span class="dash-field-old" data-edit-old></span></label>' +
      '</div>' +
      '<button class="dash-icon-button dash-field-remove" type="button" data-remove-edit-field aria-label="Hapus field" data-fr-tooltip="Hapus field"><i class="fas fa-trash-alt" aria-hidden="true"></i></button>';
    editFieldList.appendChild(row);
    bindEditFieldRow(row, value);
  }

  function bindEditFieldRow(row, value) {
    var fieldSelect = row.querySelector("[data-edit-field]");
    var removeButton = row.querySelector("[data-remove-edit-field]");
    fieldSelect.addEventListener("change", function () {
      renderValueInput(row, "");
      refreshFieldOldValue(row);
    });
    removeButton.addEventListener("click", function () {
      if (editFieldList.children.length <= 1) {
        renderValueInput(row, "");
        return;
      }
      row.remove();
    });
    renderValueInput(row, value);
    refreshFieldOldValue(row);
    if (window.FranchiseTooltip && typeof window.FranchiseTooltip.refresh === "function") {
      window.FranchiseTooltip.refresh();
    }
  }

  function renderValueInput(row, value) {
    var fieldName = row.querySelector("[data-edit-field]").value;
    var field = getFieldDef(fieldName);
    var wrap = row.querySelector("[data-edit-value-wrap]");
    if (!wrap) return;

    if (field.type === "select") {
      wrap.innerHTML = '<select data-edit-value>' + (field.options || []).map(function (option) {
        return '<option value="' + escapeAttr(option) + '">' + escapeHtml(option) + '</option>';
      }).join("") + '</select>';
    } else if (field.type === "textarea") {
      wrap.innerHTML = '<textarea data-edit-value></textarea>';
    } else {
      var inputType = field.type === "integer" || field.type === "number" ? "number" : field.type === "url" ? "url" : "text";
      var step = field.type === "number" ? ' step="0.01"' : "";
      wrap.innerHTML = '<input data-edit-value type="' + inputType + '"' + step + '>';
    }

    var input = wrap.querySelector("[data-edit-value]");
    if (input) input.value = value == null ? "" : value;
  }

  function refreshFieldOldValues() {
    if (!editFieldList) return;
    Array.from(editFieldList.querySelectorAll(".dash-field-row")).forEach(refreshFieldOldValue);
  }

  function refreshFieldOldValue(row) {
    var fieldName = row.querySelector("[data-edit-field]").value;
    var oldEl = row.querySelector("[data-edit-old]");
    var listing = selectedListing();
    if (!oldEl) return;
    oldEl.textContent = "Saat ini: " + formatFieldValue(listing ? listing[fieldName] : "");
  }

  function collectEditChanges() {
    if (!listingSelect || !listingSelect.value) throw new Error("Pilih listing terlebih dahulu.");
    if (!editFieldList) throw new Error("Tambahkan minimal satu field.");
    var changes = {};
    Array.from(editFieldList.querySelectorAll(".dash-field-row")).forEach(function (row) {
      var fieldName = row.querySelector("[data-edit-field]").value;
      var input = row.querySelector("[data-edit-value]");
      var value = input ? input.value : "";
      if (!String(value).trim()) return;
      changes[fieldName] = value;
    });
    if (!Object.keys(changes).length) throw new Error("Isi nilai baru minimal pada satu field.");
    return changes;
  }

  function renderFieldOptions(selected) {
    return getEditableFields().map(function (field) {
      return '<option value="' + escapeAttr(field.name) + '"' + (field.name === selected ? " selected" : "") + '>' + escapeHtml(field.label || field.name) + '</option>';
    }).join("");
  }

  function getEditableFields() {
    return dashboardState && dashboardState.editable_fields && dashboardState.editable_fields.length
      ? dashboardState.editable_fields
      : [
        { name: "phone", label: "Telepon/WhatsApp", type: "text" },
        { name: "office_address", label: "Alamat kantor", type: "textarea" },
        { name: "category", label: "Kategori", type: "text" },
        { name: "short_desc", label: "Deskripsi singkat", type: "textarea" },
        { name: "logo_url", label: "URL logo", type: "url" }
      ];
  }

  function getFieldDef(fieldName) {
    return getEditableFields().filter(function (field) { return field.name === fieldName; })[0] || getEditableFields()[0];
  }

  function selectedListing() {
    if (!dashboardState || !listingSelect) return null;
    return (dashboardState.editable_listings || []).filter(function (listing) {
      return listing.id === listingSelect.value;
    })[0] || null;
  }

  function renderFieldDiff(oldValue, suggestedValue) {
    var fields = Object.keys(suggestedValue || {});
    if (!fields.length) return '<span class="dash-muted">Tidak ada field.</span>';
    return '<div class="dash-field-diff">' + fields.map(function (fieldName) {
      var field = getFieldDef(fieldName);
      return '<div class="dash-field-diff-row">' +
        '<strong>' + escapeHtml(field.label || fieldName) + '</strong>' +
        '<span><b>Semula:</b> ' + escapeHtml(formatFieldValue(oldValue[fieldName])) + '<br><b>Usulan:</b> ' + escapeHtml(formatFieldValue(suggestedValue[fieldName])) + '</span>' +
      '</div>';
    }).join("") + '</div>';
  }

  function formatFieldValue(value) {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  async function refreshQualityChecks() {
    try {
      refreshQualityButton.disabled = true;
      refreshQualityButton.innerHTML = '<i class="fas fa-sync-alt" aria-hidden="true"></i> Refreshing...';
      var result = await postDashboardAction({ action: "refresh_quality_checks" });
      setStatus("Quality checks diperbarui: " + Number(result.result && result.result.scanned || 0).toLocaleString("id-ID") + " listing dicek.", false);
      await reloadDashboard();
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      refreshQualityButton.disabled = false;
      refreshQualityButton.innerHTML = '<i class="fas fa-sync-alt" aria-hidden="true"></i> Refresh checks';
    }
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
      var changes = collectEditChanges();
      var result = await postDashboardAction({
        action: "suggest_edit",
        franchise_id: listingSelect.value,
        changes: changes,
        reason: editReason.value || ""
      });
      setStatus(result.applied ? "Edit langsung diterapkan dan publish queue sudah ditandai dirty." : "Edit suggestion dikirim untuk admin review.", false);
      clearEditFieldRows();
      ensureEditFieldRows();
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
