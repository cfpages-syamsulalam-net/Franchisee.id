(function (window) {
  function createOperations(options) {
    var utils = window.FranchiseDashboardUtils;
    var escapeHtml = utils.escapeHtml;
    var escapeAttr = utils.escapeAttr;
    var formatCurrency = utils.formatCurrency;
    var renderActionToolbar = utils.renderActionToolbar;
    var renderActionButton = utils.renderActionButton;
    var renderActionLink = utils.renderActionLink;
    var premiumPaymentRows = options.premiumPaymentRows;
    var publishState = options.publishState;
    var publicationRows = options.publicationRows;
    var publicationCount = options.publicationCount;
    var leadSummary = options.leadSummary;
    var systemHealth = options.systemHealth;
    var trafficGuardrails = options.trafficGuardrails;
    var reconcileMigrationsButton = options.reconcileMigrationsButton;
    var outreach = window.FranchiseDashboardOutreach.createOutreach(options);
    if (reconcileMigrationsButton) {
      reconcileMigrationsButton.addEventListener("click", reconcileD1MigrationLedger);
    }

    function render(data) {
      outreach.render(data.outreach_queue || [], data.outreach_summary || {}, data.outreach_pipeline || [], data.user || {}, data.google_contacts || {});
      renderPremiumPayments(data.pending_premium_payments || []);
      renderPublish(data.publish_state || {});
      renderPublicationControls(data.publication_controls || { sites: [], listings: [] });
      renderLeads(data.lead_summary || { by_status: {}, recent: [] });
      renderHealth(data.system_health || {});
      renderTrafficGuardrails(data.system_health && data.system_health.traffic_guardrails ? data.system_health.traffic_guardrails : {});
    }

    function renderPublish(state) {
      var counts = state.requests_by_status || {};
      publishState.innerHTML = [
        ["Enabled", state.is_enabled ? "Ya" : "Tidak"],
        ["Dirty since", state.dirty_since || "-"],
        ["Pending", counts.pending || 0],
        ["Queued", counts.queued || 0],
        ["Failed retryable", counts.failed_retryable || 0],
        ["Last publish", state.last_publish_triggered_at || state.last_published_at || "-"],
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
        var actions = options.isAdmin()
          ? renderActionToolbar([
            renderActionButton({
              label: "Aktifkan Premium",
              icon: "fas fa-check",
              tone: "success",
              attrs: { "data-review-premium": "", "data-confirmation-id": row.id, "data-decision": "approve" },
            }),
            renderActionButton({
              label: "Tolak konfirmasi",
              icon: "fas fa-times",
              tone: "danger",
              attrs: { "data-review-premium": "", "data-confirmation-id": row.id, "data-decision": "reject" },
            }),
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
      if (publicationCount) {
        publicationCount.textContent = listings.length ? listings.length + " listing" : "0 listing";
      }
      if (!listings.length) {
        publicationRows.innerHTML = '<div class="dash-empty">Belum ada data publikasi.</div>';
        return;
      }
      publicationRows.innerHTML = listings.slice(0, 80).map(function (row) {
        var publications = row.publications || [];
        var publishedCount = publications.filter(function (item) { return item.publication_status === "published"; }).length;
        return '<article class="dash-publication-item">' +
          '<div class="dash-publication-item-head">' +
            '<div>' +
              '<strong>' + escapeHtml(row.brand_name || row.franchise_id) + '</strong>' +
              '<span>' + escapeHtml(row.franchise_id) + '</span>' +
            '</div>' +
            '<span class="dash-publication-summary">' + escapeHtml(publishedCount + "/" + sites.length + " published") + '</span>' +
          '</div>' +
          '<div class="dash-publication-site-grid">' + sites.map(function (site) {
            var publication = publications.find(function (item) { return item.site_id === site.id; });
            var status = publication ? publication.publication_status : "draft";
            var disabled = !options.isAdmin() || !publication;
            var url = publication && publication.canonical_url ? publication.canonical_url : "";
            return '<label class="dash-publication-site is-' + escapeAttr(publicationStatusClass(status)) + (disabled ? ' is-disabled' : '') + '">' +
              '<span class="dash-publication-site-head">' +
                '<span>' + escapeHtml(site.domain || site.name || site.id) + '</span>' +
                '<span class="dash-publication-status is-' + escapeAttr(publicationStatusClass(status)) + '">' + escapeHtml(publicationStatusLabel(status)) + '</span>' +
              '</span>' +
              '<span class="dash-publication-site-meta">' + escapeHtml(site.is_active ? "Situs aktif" : "Situs nonaktif") + (url ? ' · <a href="' + escapeAttr(url) + '" target="_blank" rel="noopener">Buka</a>' : '') + '</span>' +
              '<select data-publication-status data-last-value="' + escapeAttr(status) + '" data-franchise-id="' + escapeAttr(row.franchise_id) + '" data-site-id="' + escapeAttr(site.id) + '" ' + (disabled ? "disabled" : "") + ' aria-label="Status publikasi ' + escapeAttr(row.brand_name || row.franchise_id) + ' di ' + escapeAttr(site.domain || site.name || site.id) + '">' +
                publicationStatusOptions(status) +
              '</select>' +
            '</label>';
          }).join("") + '</div>' +
        '</article>';
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
        '<li><strong>Contacted/qualified</strong><span>' + escapeHtml(Number(counts.contacted || 0) + Number(counts.qualified || 0)) + '</span></li>',
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
        '<li><strong>Aktivitas 30 hari</strong><span>' + escapeHtml("view " + (analytics.listing_view || 0) + " / save " + (analytics.save || 0) + " / inquiry " + (analytics.inquiry || 0)) + '</span></li>',
      ].concat(recentOps.slice(0, 3).map(function (row) {
        return '<li><strong>' + escapeHtml(row.event_type || "Event") + '</strong><span>' + escapeHtml((row.severity || "") + " - " + (row.message || row.route || "")) + '</span></li>';
      })).join("");
    }

    function renderTrafficGuardrails(data) {
      if (!trafficGuardrails) return;
      var dailyLimit = Number(data.daily_limit || 100000);
      var warning = Number(data.warning_threshold || 90000);
      var actual = data.actual_usage || {};
      var controls = data.active_controls || [];
      var usageText = actual.configured
        ? "Credential tersedia, query aktual sengaja tidak otomatis."
        : "Usage aktual belum disambungkan; guardrail ini berbasis limit dan throttle lokal.";
      trafficGuardrails.innerHTML = [
        '<li><strong>' + escapeHtml(data.plan || "Cloudflare Workers / Pages Functions Free") + '</strong><span>' + escapeHtml("Limit " + formatNumber(dailyLimit) + " request/hari, warning " + formatNumber(warning) + ", reset " + (data.reset_utc || "00:00") + " UTC") + '</span></li>',
        '<li><strong>Status usage aktual</strong><span>' + escapeHtml(usageText) + '</span></li>',
      ].concat(controls.map(function (item) {
        return '<li><strong>' + escapeHtml(item.label || "Guardrail") + '</strong><span>' + escapeHtml(item.value || "-") + '</span></li>';
      })).join("");
    }

    function formatNumber(value) {
      try {
        return new Intl.NumberFormat("id-ID").format(value);
      } catch (_error) {
        return String(value);
      }
    }

    function publicationStatusOptions(selected) {
      return ["draft", "published", "hidden", "archived"].map(function (status) {
        return '<option value="' + escapeAttr(status) + '"' + (status === selected ? " selected" : "") + '>' + escapeHtml(publicationStatusLabel(status)) + '</option>';
      }).join("");
    }

    function publicationStatusLabel(status) {
      return {
        draft: "Draft",
        published: "Published",
        hidden: "Hidden",
        archived: "Archived",
      }[status] || status || "Draft";
    }

    function publicationStatusClass(status) {
      return {
        draft: "draft",
        published: "published",
        hidden: "hidden",
        archived: "archived",
      }[status] || "draft";
    }

    async function reviewPremiumPayment(button) {
      try {
        button.disabled = true;
        await options.postDashboardAction({
          action: "review_premium_payment",
          confirmation_id: button.getAttribute("data-confirmation-id"),
          decision: button.getAttribute("data-decision"),
          notes: "",
        });
        await options.reloadDashboard();
      } catch (error) {
        button.disabled = false;
        options.setStatus(error.message, true);
      }
    }

    async function updatePublicationStatus(select) {
      var previous = select.getAttribute("data-last-value") || "";
      var value = select.value;
      select.disabled = true;
      try {
        await options.postDashboardAction({
          action: "update_publication",
          franchise_id: select.getAttribute("data-franchise-id"),
          site_id: select.getAttribute("data-site-id"),
          publication_status: value,
        });
        select.setAttribute("data-last-value", value);
        options.setStatus("Status publikasi diperbarui.", false);
        await options.reloadDashboard();
      } catch (error) {
        if (previous) select.value = previous;
        options.setStatus(error.message || "Status publikasi gagal diperbarui.", true);
      } finally {
        select.disabled = !options.isAdmin();
      }
    }

    async function reconcileD1MigrationLedger() {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa reconcile ledger migrasi D1.", true);
        return;
      }
      reconcileMigrationsButton.disabled = true;
      try {
        var result = await options.postDashboardAction({ action: "reconcile_d1_migration_ledger" });
        options.setStatus(result.message || "Ledger migrasi D1 sudah diselaraskan.", false);
        await options.reloadDashboard();
      } catch (error) {
        options.setStatus(error.message || "Ledger migrasi D1 gagal diselaraskan.", true);
      } finally {
        reconcileMigrationsButton.disabled = false;
      }
    }

    return { render: render };
  }

  window.FranchiseDashboardOperations = { createOperations: createOperations };
})(window);
