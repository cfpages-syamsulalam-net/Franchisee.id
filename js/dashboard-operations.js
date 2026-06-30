(function (window) {
  function createOperations(options) {
    var utils = window.FranchiseDashboardUtils;
    var escapeHtml = utils.escapeHtml;
    var escapeAttr = utils.escapeAttr;
    var formatCurrency = utils.formatCurrency;
    var renderActionToolbar = utils.renderActionToolbar;
    var renderActionButton = utils.renderActionButton;
    var renderActionLink = utils.renderActionLink;
    var outreachRows = options.outreachRows;
    var outreachCount = options.outreachCount;
    var premiumPaymentRows = options.premiumPaymentRows;
    var publishState = options.publishState;
    var publicationRows = options.publicationRows;
    var leadSummary = options.leadSummary;
    var systemHealth = options.systemHealth;

    function render(data) {
      renderOutreach(data.outreach_queue || [], data.outreach_summary || {});
      renderPremiumPayments(data.pending_premium_payments || []);
      renderPublish(data.publish_state || {});
      renderPublicationControls(data.publication_controls || { sites: [], listings: [] });
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
            waUrl ? renderActionLink({ href: waUrl, label: "Buka WhatsApp", icon: "fab fa-whatsapp", tone: "success" }) : "",
            waUrl ? renderActionButton({
              label: "Catat outreach terkirim",
              icon: "fas fa-check",
              attrs: {
                "data-log-outreach": "",
                "data-franchise-id": row.id,
                "data-contact": contact.display,
                "data-message": message,
              },
            }) : "",
            renderActionLink({ href: row.claim_url, label: "Buka halaman claim", icon: "fas fa-link" }),
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
            var disabled = !options.isAdmin() || !publication;
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

    function publicationStatusOptions(selected) {
      return ["draft", "published", "hidden", "archived"].map(function (status) {
        return '<option value="' + escapeAttr(status) + '"' + (status === selected ? " selected" : "") + '>' + escapeHtml(status) + '</option>';
      }).join("");
    }

    async function logOutreach(link) {
      try {
        link.disabled = true;
        link.classList.add("is-busy");
        await options.postDashboardAction({
          action: "log_outreach",
          franchise_id: link.getAttribute("data-franchise-id"),
          contact_value: link.getAttribute("data-contact") || "",
          message_text: link.getAttribute("data-message") || "",
          outcome: "contacted",
        });
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

    return { render: render };
  }

  window.FranchiseDashboardOperations = { createOperations: createOperations };
})(window);
