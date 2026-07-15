(function (window) {
  function createOutreach(options) {
    var utils = window.FranchiseDashboardUtils;
    var escapeHtml = utils.escapeHtml;
    var escapeAttr = utils.escapeAttr;
    var renderActionToolbar = utils.renderActionToolbar;
    var renderActionButton = utils.renderActionButton;
    var renderActionLink = utils.renderActionLink;
    var renderPillActionButton = utils.renderPillActionButton;
    var outreachBoard = options.outreachBoard;
    var outreachStageSummary = options.outreachStageSummary;
    var outreachCount = options.outreachCount;
    var outreachTabBadge = options.outreachTabBadge;
    var outreachActions = options.outreachActions;
    var GOOGLE_CONTACTS_SETUP_DOC = "/dashboard/#google-contacts-setup";
    var FALLBACK_OUTREACH_PIPELINE = [
      { value: "uncontacted", label: "Uncontacted", short_label: "Uncontacted", description: "Belum ada kontak yang dicatat.", icon: "fas fa-inbox", tone: "neutral" },
      { value: "saved_contact", label: "Saved Contact", short_label: "Saved", description: "Nama dan nomor sudah disimpan ke kontak staff.", icon: "fas fa-address-book", tone: "info" },
      { value: "contacted", label: "Contacted", short_label: "Contacted", description: "Pesan pertama sudah dikirim.", icon: "fas fa-paper-plane", tone: "info" },
      { value: "responded", label: "Responded", short_label: "Responded", description: "Franchisor sudah membalas.", icon: "fas fa-reply", tone: "good" },
      { value: "qualified", label: "Qualified", short_label: "Qualified", description: "Kontak valid dan punya peluang lanjut.", icon: "fas fa-filter", tone: "good" },
      { value: "claim_started", label: "Claim Started", short_label: "Claim", description: "Proses klaim listing sudah dimulai.", icon: "fas fa-flag", tone: "warning" },
      { value: "claimed", label: "Claimed", short_label: "Claimed", description: "Listing sudah diklaim atau punya owner.", icon: "fas fa-store", tone: "good" },
      { value: "subscribed", label: "Subscribed", short_label: "Subscribed", description: "Brand sedang punya subscription aktif.", icon: "fas fa-crown", tone: "premium" },
      { value: "renewal_risk", label: "Renewal Risk", short_label: "Risk", description: "Subscription perlu follow-up renewal.", icon: "fas fa-hourglass-half", tone: "warning" },
      { value: "burned", label: "Burned", short_label: "Burned", description: "Tidak lanjut, tidak respons, atau tidak renew.", icon: "fas fa-ban", tone: "bad" },
    ];

    function render(rows, summary, pipelineMetadata) {
      rows = rows || [];
      summary = summary || {};
      var contactReady = Number(summary.contact_ready || 0);
      var publishedUnclaimed = Number(summary.published_unclaimed || 0);
      var queueLimit = Number(summary.queue_limit || 0);
      var pipeline = normalizePipeline(pipelineMetadata || window.FranchiseOutreachPipeline || []);
      var counts = countRowsByStatus(rows, pipeline, summary.by_pipeline_status || {});
      var badge = rows.length + " listing";
      if (contactReady || publishedUnclaimed) {
        badge = rows.length + " dari " + contactReady + " kontak siap";
        if (publishedUnclaimed > contactReady) badge += " / " + publishedUnclaimed + " unclaimed published";
        if (queueLimit && contactReady > rows.length) badge += " (limit " + queueLimit + ")";
      }
      outreachCount.textContent = badge;
      renderOutreachTabBadge(counts);
      renderOutreachSummary(pipeline, counts);
      renderOutreachActions(rows);
      if (!rows.length) {
        outreachBoard.innerHTML = '<div class="dash-empty">Tidak ada listing dengan nomor WhatsApp/mobile untuk sales outreach.</div>';
        return;
      }
      outreachBoard.innerHTML = pipeline.map(function (status) {
        var stageRows = rows.filter(function (row) { return normalizeOutreachStatus(row.current_status) === status.value; });
        return '<section class="dash-outreach-column" data-outreach-drop-status="' + escapeAttr(status.value) + '" aria-label="' + escapeAttr(status.label) + '">' +
          '<div class="dash-outreach-column-head">' +
            '<div><i class="' + escapeAttr(status.icon || "fas fa-circle") + '" aria-hidden="true"></i><strong>' + escapeHtml(status.label) + '</strong></div>' +
            '<span class="dash-outreach-count">' + escapeHtml(stageRows.length) + '</span>' +
          '</div>' +
          '<p>' + escapeHtml(status.description || "") + '</p>' +
          '<div class="dash-outreach-card-list">' +
            (stageRows.length ? stageRows.map(function (row) { return renderOutreachCard(row, pipeline); }).join("") : '<div class="dash-outreach-empty">Kosong</div>') +
          '</div>' +
        '</section>';
      }).join("");

      outreachBoard.querySelectorAll("[data-log-outreach]").forEach(function (link) {
        link.addEventListener("click", function () {
          logOutreach(link);
        });
      });
      outreachBoard.querySelectorAll("[data-outreach-status-select]").forEach(function (select) {
        select.addEventListener("change", function () {
          updateOutreachStatus(select.getAttribute("data-franchise-id"), select.value, select);
        });
      });
      bindOutreachDragAndDrop();
    }

    function renderOutreachCard(row, pipeline) {
      var contact = row.contacts && row.contacts[0];
      var waUrl = row.primary_whatsapp_url || "";
      var message = waUrl.indexOf("text=") >= 0 ? decodeURIComponent(waUrl.split("text=")[1] || "") : "";
      var status = normalizeOutreachStatus(row.current_status);
      var meta = pipeline.find(function (item) { return item.value === status; }) || pipeline[0];
      var subscription = row.active_subscription_ends_at
        ? '<span><i class="fas fa-crown" aria-hidden="true"></i> Aktif sampai ' + escapeHtml(row.active_subscription_ends_at) + '</span>'
        : row.latest_subscription_ends_at
          ? '<span><i class="fas fa-hourglass-end" aria-hidden="true"></i> Subscription terakhir ' + escapeHtml(row.latest_subscription_ends_at) + '</span>'
          : "";
      return '<article class="dash-outreach-card is-' + escapeAttr(meta.tone || "neutral") + '" draggable="true" data-outreach-card data-franchise-id="' + escapeAttr(row.id) + '">' +
        '<div class="dash-outreach-card-head">' +
          '<div>' +
            '<a href="' + escapeAttr(row.public_url) + '" target="_blank" rel="noopener">' + escapeHtml(row.brand_name) + '</a>' +
            '<span>' + escapeHtml(row.category || "Tanpa kategori") + '</span>' +
          '</div>' +
          renderOutreachStatusBadge(meta) +
        '</div>' +
        '<div class="dash-outreach-contact">' + (contact ? '<i class="fab fa-whatsapp" aria-hidden="true"></i><span>' + escapeHtml(contact.label + ": " + contact.display) + '</span>' : '<span class="dash-badge bad">Tidak ada WA</span>') + '</div>' +
        '<div class="dash-outreach-meta">' +
          '<span><i class="fas fa-clock" aria-hidden="true"></i> ' + escapeHtml(row.last_outreach_at ? "Terakhir " + row.last_outreach_at : "Belum pernah dikontak") + '</span>' +
          subscription +
        '</div>' +
        '<label class="dash-outreach-status-control">' +
          '<span>Status</span>' +
          '<select data-outreach-status-select data-last-value="' + escapeAttr(status) + '" data-franchise-id="' + escapeAttr(row.id) + '">' + renderOutreachStatusOptions(pipeline, status) + '</select>' +
        '</label>' +
        '<div class="dash-outreach-actions">' + renderActionToolbar([
          waUrl ? renderActionLink({ href: waUrl, label: "Buka WhatsApp", icon: "fab fa-whatsapp", tone: "success" }) : "",
          waUrl ? renderActionButton({
            label: "Catat terkirim",
            icon: "fas fa-check",
            attrs: {
              "data-log-outreach": "",
              "data-franchise-id": row.id,
              "data-contact": contact ? contact.display : "",
              "data-message": message,
            },
          }) : "",
          renderActionLink({ href: row.claim_url, label: "Buka claim", icon: "fas fa-link" }),
        ], "Aksi outreach") + '</div>' +
      '</article>';
    }

    function renderOutreachStatusBadge(status) {
      return '<span class="dash-outreach-status-badge is-' + escapeAttr(status.tone || "neutral") + '">' +
        '<i class="' + escapeAttr(status.icon || "fas fa-circle") + '" aria-hidden="true"></i>' +
        '<span>' + escapeHtml(status.short_label || status.label || status.value) + '</span>' +
      '</span>';
    }

    function renderOutreachStatusOptions(pipeline, selected) {
      return pipeline.map(function (status) {
        return '<option value="' + escapeAttr(status.value) + '"' + (status.value === selected ? " selected" : "") + '>' + escapeHtml(status.label) + '</option>';
      }).join("");
    }

    function renderOutreachSummary(pipeline, counts) {
      if (!outreachStageSummary) return;
      outreachStageSummary.innerHTML = pipeline.map(function (status) {
        return '<span class="dash-outreach-summary-pill is-' + escapeAttr(status.tone || "neutral") + '">' +
          '<i class="' + escapeAttr(status.icon || "fas fa-circle") + '" aria-hidden="true"></i>' +
          '<strong>' + escapeHtml(status.short_label || status.label) + '</strong>' +
          '<span>' + escapeHtml(counts[status.value] || 0) + '</span>' +
        '</span>';
      }).join("");
    }

    function renderOutreachTabBadge(counts) {
      if (!outreachTabBadge) return;
      var activeCount = ["uncontacted", "saved_contact", "contacted", "responded", "qualified", "claim_started", "renewal_risk"].reduce(function (sum, status) {
        return sum + Number(counts[status] || 0);
      }, 0);
      outreachTabBadge.textContent = activeCount > 99 ? "99+" : String(activeCount);
      outreachTabBadge.hidden = activeCount <= 0;
    }

    function bindOutreachDragAndDrop() {
      var draggedId = "";
      outreachBoard.querySelectorAll("[data-outreach-card]").forEach(function (card) {
        card.addEventListener("dragstart", function (event) {
          draggedId = card.getAttribute("data-franchise-id") || "";
          card.classList.add("is-dragging");
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", draggedId);
          }
        });
        card.addEventListener("dragend", function () {
          card.classList.remove("is-dragging");
          outreachBoard.querySelectorAll(".is-drag-over").forEach(function (column) { column.classList.remove("is-drag-over"); });
        });
      });
      outreachBoard.querySelectorAll("[data-outreach-drop-status]").forEach(function (column) {
        column.addEventListener("dragover", function (event) {
          event.preventDefault();
          column.classList.add("is-drag-over");
          if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        });
        column.addEventListener("dragleave", function () {
          column.classList.remove("is-drag-over");
        });
        column.addEventListener("drop", function (event) {
          event.preventDefault();
          column.classList.remove("is-drag-over");
          var franchiseId = event.dataTransfer ? event.dataTransfer.getData("text/plain") : draggedId;
          var status = column.getAttribute("data-outreach-drop-status");
          if (franchiseId && status) updateOutreachStatus(franchiseId, status, column);
        });
      });
    }

    function normalizePipeline(pipeline) {
      var list = Array.isArray(pipeline) && pipeline.length ? pipeline : FALLBACK_OUTREACH_PIPELINE;
      return list.map(function (status) {
        return {
          value: normalizeOutreachStatus(status.value),
          label: status.label || status.value,
          short_label: status.short_label || status.label || status.value,
          description: status.description || "",
          icon: status.icon || "fas fa-circle",
          tone: status.tone || "neutral",
        };
      });
    }

    function normalizeOutreachStatus(value) {
      var text = String(value || "uncontacted").toLowerCase();
      return FALLBACK_OUTREACH_PIPELINE.some(function (status) { return status.value === text; }) ? text : "uncontacted";
    }

    function countRowsByStatus(rows, pipeline, fallbackCounts) {
      var counts = {};
      pipeline.forEach(function (status) { counts[status.value] = Number(fallbackCounts[status.value] || 0); });
      if (rows.length) pipeline.forEach(function (status) { counts[status.value] = 0; });
      rows.forEach(function (row) {
        var status = normalizeOutreachStatus(row.current_status);
        counts[status] = Number(counts[status] || 0) + 1;
      });
      return counts;
    }

    function renderOutreachActions(rows) {
      if (!outreachActions) return;
      var existingBadge = outreachActions.querySelector("[data-outreach-count]");
      outreachActions.innerHTML = "";
      if (existingBadge) outreachActions.appendChild(existingBadge);
      if (!rows.length) return;
      outreachActions.insertAdjacentHTML("beforeend", renderPillActionButton({
        label: "Simpan kontak",
        icon: "fas fa-address-book",
        tone: "primary",
        tooltip: "Simpan kontak outreach ke Google Contacts akun staff yang sedang login",
        attrs: {
          "data-save-google-contacts": "",
        },
      }));
      var button = outreachActions.querySelector("[data-save-google-contacts]");
      if (button) {
        button.addEventListener("click", function () {
          saveGoogleContacts(button, rows);
        });
      }
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
        await options.reloadDashboard();
      } catch (error) {
        link.disabled = false;
        link.classList.remove("is-busy");
        console.warn("Outreach log failed", error);
      }
    }

    async function updateOutreachStatus(franchiseId, status, control) {
      if (!franchiseId || !status) return;
      var previousValue = control && control.tagName === "SELECT" ? control.getAttribute("data-last-value") || "" : "";
      try {
        if (control && "disabled" in control) control.disabled = true;
        if (control && control.classList) control.classList.add("is-busy");
        await options.postDashboardAction({
          action: "update_outreach_status",
          franchise_id: franchiseId,
          status: status,
          notes: "",
        });
        options.setStatus("Status outreach diperbarui.", false);
        await options.reloadDashboard();
      } catch (error) {
        if (control && control.tagName === "SELECT" && previousValue) control.value = previousValue;
        options.setStatus(error.message || "Status outreach gagal diperbarui.", true);
      } finally {
        if (control && "disabled" in control) control.disabled = false;
        if (control && control.classList) control.classList.remove("is-busy");
      }
    }

    async function saveGoogleContacts(button, rows) {
      try {
        button.disabled = true;
        button.classList.add("is-busy");
        options.setStatus("Menyimpan kontak ke Google Contacts...", false);
        var result = await options.postDashboardAction({
          action: "save_outreach_google_contacts",
          franchise_ids: rows.slice(0, 200).map(function (row) { return row.id; }),
          limit: 200,
        });
        button.classList.remove("is-busy");
        button.classList.add("is-done");
        var skipped = Number(result.duplicate_skipped || 0);
        var message = result.message || ("Kontak tersimpan: " + Number(result.saved || 0).toLocaleString("id-ID") + " dari " + Number(result.requested || 0).toLocaleString("id-ID") + ".");
        if (skipped) message += " " + skipped.toLocaleString("id-ID") + " dilewati karena sudah ada.";
        options.setStatus(message, false);
      } catch (error) {
        button.disabled = false;
        button.classList.remove("is-busy");
        options.setStatus(formatGoogleContactsError(error), true);
      }
    }

    function formatGoogleContactsError(error) {
      var result = error && error.dashboardResult ? error.dashboardResult : {};
      var message = error && error.message ? error.message : "Kontak belum bisa disimpan ke Google.";
      var needsSetup = result.setup_required || result.error === "GOOGLE_CONTACTS_SCOPE_MISSING" || result.error === "GOOGLE_ACCOUNT_NOT_LINKED";
      if (!needsSetup) return escapeHtml(message);
      var href = result.documentation_url || GOOGLE_CONTACTS_SETUP_DOC;
      return escapeHtml(message) + ' <a class="dash-link" href="' + escapeAttr(href) + '">Lihat panduan setup</a>.';
    }

    return { render: render };
  }

  window.FranchiseDashboardOutreach = { createOutreach: createOutreach };
})(window);
