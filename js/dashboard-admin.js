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
  var publicationRows = document.querySelector("[data-publication-rows]");
  var premiumPaymentRows = document.querySelector("[data-premium-payment-rows]");
  var premiumFunnel = document.querySelector("[data-premium-funnel]");
  var premiumNotifications = document.querySelector("[data-premium-notifications]");
  var paymentMethodForm = document.querySelector("[data-payment-method-form]");
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
  if (paymentMethodForm) {
    paymentMethodForm.addEventListener("submit", submitPaymentMethod);
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
    renderPremiumOperations(data.premium_operations || {});
    renderPremiumPayments(data.pending_premium_payments || []);
    renderPublish(data.publish_state || {});
    renderPublicationControls(data.publication_controls || { sites: [], listings: [] });
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
        '<td>' + renderActionToolbar([
          renderActionButton({
            label: "Buat saran edit",
            icon: "fas fa-pen",
            attrs: {
              "data-quick-edit": "",
              "data-franchise-id": row.id,
              "data-brand": row.brand_name,
              "data-warnings": row.warnings.join(",")
            }
          })
        ], "Aksi data quality") + '</td>' +
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
        ? renderActionToolbar([
          renderActionButton({
            label: "Setujui claim",
            icon: "fas fa-check",
            tone: "success",
            attrs: {
              "data-review-claim": "",
              "data-claim-id": row.id,
              "data-decision": "approve"
            }
          }),
          renderActionButton({
            label: "Tolak claim",
            icon: "fas fa-times",
            tone: "danger",
            attrs: {
              "data-review-claim": "",
              "data-claim-id": row.id,
              "data-decision": "reject"
            }
          })
        ], "Review claim")
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

  function renderPremiumOperations(data) {
    var funnel = data.funnel || {};
    if (premiumFunnel) {
      var rows = [
        ["Halaman dilihat", funnel.premium_page_view || 0],
        ["CTA diklik", funnel.premium_cta_click || 0],
        ["Tagihan dibuat", funnel.premium_order_created || 0],
        ["Konfirmasi masuk", funnel.premium_confirmation_submitted || 0],
        ["Premium aktif", funnel.premium_activated || 0]
      ];
      premiumFunnel.innerHTML = rows.map(function (row) {
        return '<li><strong>' + escapeHtml(row[0]) + '</strong><span>' + escapeHtml(row[1]) + '</span></li>';
      }).join("");
    }

    var method = (data.payment_methods || []).find(function (item) { return item.code === "manual_bca"; }) || (data.payment_methods || [])[0];
    if (paymentMethodForm && method) {
      setFormValue(paymentMethodForm, "label", method.label || "");
      setFormValue(paymentMethodForm, "provider", method.provider || "");
      setFormValue(paymentMethodForm, "account_name", method.account_name || "");
      setFormValue(paymentMethodForm, "account_number", method.account_number || "");
      setFormValue(paymentMethodForm, "instructions", method.instructions || "");
    }

    if (premiumNotifications) {
      var notifications = data.notifications || [];
      premiumNotifications.innerHTML = notifications.length ? notifications.slice(0, 6).map(function (item) {
        return '<li><strong>' + escapeHtml(item.title || "Info Premium") + '</strong><span>' + escapeHtml((item.brand_name ? item.brand_name + " - " : "") + (item.message || "")) + '</span></li>';
      }).join("") : '<li><span>Belum ada info Premium terbaru.</span></li>';
    }
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
        ? renderActionToolbar([
          renderActionButton({
            label: "Setujui edit",
            icon: "fas fa-check",
            tone: "success",
            attrs: {
              "data-review-edit": "",
              "data-suggestion-id": row.id,
              "data-decision": "approve"
            }
          }),
          renderActionButton({
            label: "Tolak edit",
            icon: "fas fa-times",
            tone: "danger",
            attrs: {
              "data-review-edit": "",
              "data-suggestion-id": row.id,
              "data-decision": "reject"
            }
          })
        ], "Review edit")
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

  function publicationStatusOptions(selected) {
    return ["draft", "published", "hidden", "archived"].map(function (status) {
      return '<option value="' + escapeAttr(status) + '"' + (status === selected ? " selected" : "") + '>' + escapeHtml(status) + '</option>';
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
      refreshQualityButton.classList.add("is-busy");
      var result = await postDashboardAction({ action: "refresh_quality_checks" });
      setStatus("Quality checks diperbarui: " + Number(result.result && result.result.scanned || 0).toLocaleString("id-ID") + " listing dicek.", false);
      await reloadDashboard();
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      refreshQualityButton.disabled = false;
      refreshQualityButton.classList.remove("is-busy");
    }
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

  async function submitPaymentMethod(event) {
    event.preventDefault();
    if (!paymentMethodForm || !currentUserIsAdmin) {
      setStatus("Hanya admin yang bisa mengubah metode pembayaran.", true);
      return;
    }
    var button = paymentMethodForm.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    try {
      var form = new FormData(paymentMethodForm);
      await postDashboardAction({
        action: "update_payment_method",
        code: String(form.get("code") || "manual_bca"),
        label: String(form.get("label") || ""),
        provider: String(form.get("provider") || ""),
        account_name: String(form.get("account_name") || ""),
        account_number: String(form.get("account_number") || ""),
        instructions: String(form.get("instructions") || ""),
        is_active: true
      });
      setStatus("Metode pembayaran tersimpan.", false);
      await reloadDashboard();
    } catch (error) {
      setStatus(error.message || "Metode pembayaran belum bisa disimpan.", true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function setFormValue(form, name, value) {
    var input = form.querySelector('[name="' + name + '"]');
    if (input) input.value = value == null ? "" : value;
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

  function formatCurrency(value) {
    var amount = Number(value || 0);
    if (!amount) return "-";
    return "Rp " + amount.toLocaleString("id-ID");
  }

  function renderActionToolbar(items, label) {
    var html = (items || []).filter(Boolean).join("");
    if (!html) return "";
    return '<div class="dash-actions dash-toolbar" role="toolbar" aria-label="' + escapeAttr(label || "Aksi") + '">' + html + '</div>';
  }

  function renderActionButton(config) {
    config = config || {};
    var attrs = Object.assign({}, config.attrs || {}, {
      type: "button",
      "aria-label": config.label || "Aksi",
      "data-fr-tooltip": config.label || "Aksi"
    });
    return '<button class="' + escapeAttr(actionClass(config.tone)) + '"' + renderAttrs(attrs) + '><i class="' + escapeAttr(config.icon || "fas fa-circle") + '" aria-hidden="true"></i></button>';
  }

  function renderActionLink(config) {
    config = config || {};
    var attrs = Object.assign({}, config.attrs || {}, {
      href: config.href || "#",
      target: "_blank",
      rel: "noopener",
      "aria-label": config.label || "Buka",
      "data-fr-tooltip": config.label || "Buka"
    });
    return '<a class="' + escapeAttr(actionClass(config.tone)) + '"' + renderAttrs(attrs) + '><i class="' + escapeAttr(config.icon || "fas fa-external-link-alt") + '" aria-hidden="true"></i></a>';
  }

  function actionClass(tone) {
    return ["dash-icon-button", "dash-action-button", tone ? "is-" + tone : ""].filter(Boolean).join(" ");
  }

  function renderAttrs(attrs) {
    return Object.keys(attrs || {}).map(function (name) {
      var value = attrs[name];
      if (value === false || value === null || value === undefined) return "";
      if (value === true || value === "") return " " + name;
      return " " + name + '="' + escapeAttr(value) + '"';
    }).join("");
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
