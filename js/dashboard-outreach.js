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
    var lastRows = [];
    var lastSummary = {};
    var lastPipeline = [];
    var currentUser = {};
    var currentFilter = "today";
    var BURNED_REASONS = [
      { value: "", label: "Pilih alasan..." },
      { value: "no_response", label: "Tidak respons" },
      { value: "invalid_contact", label: "Kontak tidak valid" },
      { value: "not_interested", label: "Tidak berminat" },
      { value: "not_owner", label: "Bukan owner/decision maker" },
      { value: "duplicate_or_closed", label: "Duplikat / brand tutup" },
      { value: "subscription_churn", label: "Tidak renew subscription" },
      { value: "other", label: "Lainnya" },
    ];
    var FALLBACK_OUTREACH_PIPELINE = [
      { value: "uncontacted", label: "Uncontacted", short_label: "Uncontacted", description: "Belum ada kontak yang dicatat.", next_action: "Simpan kontak", next_action_detail: "Simpan nama dan nomor ke Google Contacts.", icon: "fas fa-inbox", tone: "neutral" },
      { value: "saved_contact", label: "Saved Contact", short_label: "Saved", description: "Nama dan nomor sudah disimpan ke kontak staff.", next_action: "Kirim WhatsApp", next_action_detail: "Kirim pesan klaim listing lalu catat terkirim.", icon: "fas fa-address-book", tone: "info" },
      { value: "contacted", label: "Contacted", short_label: "Contacted", description: "Pesan pertama sudah dikirim.", next_action: "Follow-up balasan", next_action_detail: "Follow-up jika belum ada balasan.", icon: "fas fa-paper-plane", tone: "info" },
      { value: "responded", label: "Responded", short_label: "Responded", description: "Franchisor sudah membalas.", next_action: "Kualifikasi brand", next_action_detail: "Pastikan owner, decision maker, dan minat lanjut.", icon: "fas fa-reply", tone: "good" },
      { value: "qualified", label: "Qualified", short_label: "Qualified", description: "Kontak valid dan punya peluang lanjut.", next_action: "Dorong klaim", next_action_detail: "Kirim link klaim dan bantu brand melanjutkan.", icon: "fas fa-filter", tone: "good" },
      { value: "claim_started", label: "Claim Started", short_label: "Claim", description: "Proses klaim listing sudah dimulai.", next_action: "Bantu klaim", next_action_detail: "Pantau bukti dan bantu admin menyelesaikan review.", icon: "fas fa-flag", tone: "warning" },
      { value: "claimed", label: "Claimed", short_label: "Claimed", description: "Listing sudah diklaim atau punya owner.", next_action: "Tawarkan Premium", next_action_detail: "Pitch Premium/subscription saat listing siap.", icon: "fas fa-store", tone: "good" },
      { value: "subscribed", label: "Subscribed", short_label: "Subscribed", description: "Brand sedang punya subscription aktif.", next_action: "Monitor renewal", next_action_detail: "Jaga listing lengkap dan siapkan renewal.", icon: "fas fa-crown", tone: "premium" },
      { value: "renewal_risk", label: "Renewal Risk", short_label: "Risk", description: "Subscription perlu follow-up renewal.", next_action: "Pulihkan renewal", next_action_detail: "Hubungi owner untuk renewal atau catat alasan burned.", icon: "fas fa-hourglass-half", tone: "warning" },
      { value: "burned", label: "Burned", short_label: "Burned", description: "Tidak lanjut, tidak respons, atau tidak renew.", next_action: "Tutup dengan alasan", next_action_detail: "Pastikan alasan burned tercatat.", icon: "fas fa-ban", tone: "bad" },
    ];

    function render(rows, summary, pipelineMetadata, user) {
      rows = rows || [];
      summary = summary || {};
      lastRows = rows;
      lastSummary = summary;
      currentUser = user || {};
      var contactReady = Number(summary.contact_ready || 0);
      var publishedUnclaimed = Number(summary.published_unclaimed || 0);
      var queueLimit = Number(summary.queue_limit || 0);
      var pipeline = normalizePipeline(pipelineMetadata || window.FranchiseOutreachPipeline || []);
      lastPipeline = pipeline;
      var filteredRows = filterRows(rows);
      var counts = countRowsByStatus(rows, pipeline, summary.by_pipeline_status || {});
      var badge = filteredRows.length + " / " + rows.length + " listing";
      if (contactReady || publishedUnclaimed) {
        badge = filteredRows.length + " tampil dari " + contactReady + " kontak siap";
        if (publishedUnclaimed > contactReady) badge += " / " + publishedUnclaimed + " unclaimed published";
        if (queueLimit && contactReady > rows.length) badge += " (limit " + queueLimit + ")";
      }
      outreachCount.textContent = badge;
      renderOutreachTabBadge(counts);
      renderOutreachSummary(pipeline, counts, summary.conversion_metrics || {});
      renderOutreachActions(rows);
      if (!filteredRows.length) {
        outreachBoard.innerHTML = '<div class="dash-empty">Tidak ada listing dengan nomor WhatsApp/mobile untuk sales outreach.</div>';
        return;
      }
      outreachBoard.innerHTML = pipeline.map(function (status) {
        var stageRows = filteredRows.filter(function (row) { return normalizeOutreachStatus(row.current_status) === status.value; });
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
          toggleBurnedReason(select);
          updateOutreachStatus(select.getAttribute("data-franchise-id"), select.value, select);
        });
      });
      outreachBoard.querySelectorAll("[data-outreach-status-select]").forEach(toggleBurnedReason);
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
      var overdue = row.is_overdue ? '<span class="dash-outreach-overdue"><i class="fas fa-exclamation-triangle" aria-hidden="true"></i> ' + escapeHtml(row.overdue_label || "Overdue") + '</span>' : "";
      var assigned = row.assigned_staff_user_id ? '<span><i class="fas fa-user-check" aria-hidden="true"></i> Staff assigned</span>' : '<span><i class="fas fa-user-plus" aria-hidden="true"></i> Belum assigned</span>';
      return '<article class="dash-outreach-card is-' + escapeAttr(meta.tone || "neutral") + '" draggable="true" data-outreach-card data-franchise-id="' + escapeAttr(row.id) + '">' +
        '<div class="dash-outreach-card-head">' +
          '<div>' +
            '<a href="' + escapeAttr(row.public_url) + '" target="_blank" rel="noopener">' + escapeHtml(row.brand_name) + '</a>' +
            '<span>' + escapeHtml(row.category || "Tanpa kategori") + '</span>' +
          '</div>' +
          renderOutreachStatusBadge(meta) +
        '</div>' +
        '<div class="dash-outreach-contact">' + (contact ? '<i class="fab fa-whatsapp" aria-hidden="true"></i><span>' + escapeHtml(contact.label + ": " + contact.display) + '</span>' : '<span class="dash-badge bad">Tidak ada WA</span>') + '</div>' +
        '<div class="dash-outreach-next-action">' +
          '<strong><i class="' + escapeAttr(meta.icon || "fas fa-arrow-right") + '" aria-hidden="true"></i> ' + escapeHtml(row.sales_next_action || meta.next_action || "Langkah berikutnya") + '</strong>' +
          '<span>' + escapeHtml(row.sales_next_action_detail || meta.next_action_detail || "") + '</span>' +
        '</div>' +
        '<div class="dash-outreach-reason">' +
          '<strong>Kenapa muncul di sini</strong>' +
          '<span>' + escapeHtml(row.sales_reason || meta.description || "") + '</span>' +
        '</div>' +
        '<div class="dash-outreach-meta">' +
          '<span><i class="fas fa-clock" aria-hidden="true"></i> ' + escapeHtml(row.last_outreach_at ? "Terakhir " + row.last_outreach_at : "Belum pernah dikontak") + '</span>' +
          (row.next_follow_up_at ? '<span><i class="fas fa-calendar-day" aria-hidden="true"></i> Follow-up ' + escapeHtml(row.next_follow_up_at) + '</span>' : "") +
          overdue +
          assigned +
          subscription +
        '</div>' +
        '<label class="dash-outreach-status-control">' +
          '<span>Status</span>' +
          '<select data-outreach-status-select data-last-value="' + escapeAttr(status) + '" data-franchise-id="' + escapeAttr(row.id) + '">' + renderOutreachStatusOptions(pipeline, status) + '</select>' +
        '</label>' +
        '<label class="dash-outreach-note">' +
          '<span>Catatan / alasan move</span>' +
          '<textarea data-outreach-note data-franchise-id="' + escapeAttr(row.id) + '" rows="2" maxlength="1000" placeholder="Tulis konteks singkat agar staff lain paham next step.">' + escapeHtml(row.outreach_notes || "") + '</textarea>' +
        '</label>' +
        '<label class="dash-outreach-burned-reason" data-burned-reason-wrap>' +
          '<span>Alasan burned</span>' +
          '<select data-outreach-burned-reason data-franchise-id="' + escapeAttr(row.id) + '">' + renderBurnedReasonOptions(row.burned_reason || "") + '</select>' +
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

    function renderBurnedReasonOptions(selected) {
      return BURNED_REASONS.map(function (reason) {
        return '<option value="' + escapeAttr(reason.value) + '"' + (reason.value === selected ? " selected" : "") + '>' + escapeHtml(reason.label) + '</option>';
      }).join("");
    }

    function renderOutreachSummary(pipeline, counts, metrics) {
      if (!outreachStageSummary) return;
      var metricItems = [
        ["Response", metrics.response_rate],
        ["Claim", metrics.response_to_claim_rate],
        ["Sub", metrics.claim_to_subscription_rate],
        ["Recovery", metrics.renewal_recovery_rate],
      ].map(function (item) {
        return '<span class="dash-outreach-summary-pill is-metric"><i class="fas fa-chart-line" aria-hidden="true"></i><strong>' + escapeHtml(item[0]) + '</strong><span>' + escapeHtml(Number(item[1] || 0).toLocaleString("id-ID") + "%") + '</span></span>';
      }).join("");
      outreachStageSummary.innerHTML = metricItems + pipeline.map(function (status) {
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

    function filterRows(rows) {
      var userId = currentUser && currentUser.id ? currentUser.id : "";
      return (rows || []).filter(function (row) {
        var status = normalizeOutreachStatus(row.current_status);
        if (currentFilter === "all") return true;
        if (currentFilter === "mine") return userId && row.assigned_staff_user_id === userId;
        if (currentFilter === "unassigned") return !row.assigned_staff_user_id;
        if (currentFilter === "overdue") return Boolean(row.is_overdue);
        if (currentFilter === "today") return Boolean(row.is_overdue) || ["uncontacted", "saved_contact", "responded", "qualified", "claim_started", "renewal_risk"].includes(status);
        return !["subscribed", "burned"].includes(status);
      });
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
          next_action: status.next_action || "",
          next_action_detail: status.next_action_detail || "",
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
      outreachActions.insertAdjacentHTML("beforeend",
        '<label class="dash-outreach-filter"><i class="fas fa-filter" aria-hidden="true"></i><span>Filter</span>' +
        '<select data-outreach-filter>' +
          '<option value="today"' + (currentFilter === "today" ? " selected" : "") + '>Hari ini</option>' +
          '<option value="actionable"' + (currentFilter === "actionable" ? " selected" : "") + '>Perlu aksi</option>' +
          '<option value="overdue"' + (currentFilter === "overdue" ? " selected" : "") + '>Overdue</option>' +
          '<option value="mine"' + (currentFilter === "mine" ? " selected" : "") + '>Milik saya</option>' +
          '<option value="unassigned"' + (currentFilter === "unassigned" ? " selected" : "") + '>Belum assigned</option>' +
          '<option value="all"' + (currentFilter === "all" ? " selected" : "") + '>Semua</option>' +
        '</select></label>');
      var filter = outreachActions.querySelector("[data-outreach-filter]");
      if (filter) {
        filter.addEventListener("change", function () {
          currentFilter = filter.value || "today";
          render(lastRows, lastSummary, lastPipeline, currentUser);
        });
      }
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
      var context = collectStatusContext(franchiseId, status);
      try {
        if (control && "disabled" in control) control.disabled = true;
        if (control && control.classList) control.classList.add("is-busy");
        await options.postDashboardAction({
          action: "update_outreach_status",
          franchise_id: franchiseId,
          status: status,
          notes: context.notes,
          burned_reason: context.burnedReason,
          next_follow_up_at: context.nextFollowUpAt,
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

    function collectStatusContext(franchiseId, status) {
      var card = outreachBoard.querySelector('[data-outreach-card][data-franchise-id="' + cssEscape(franchiseId) + '"]');
      var notes = card && card.querySelector("[data-outreach-note]") ? card.querySelector("[data-outreach-note]").value.trim() : "";
      var burnedReason = card && card.querySelector("[data-outreach-burned-reason]") ? card.querySelector("[data-outreach-burned-reason]").value : "";
      if (status === "burned" && !burnedReason) burnedReason = "no_response";
      return {
        notes: notes,
        burnedReason: burnedReason,
        nextFollowUpAt: "",
      };
    }

    function toggleBurnedReason(select) {
      var franchiseId = select.getAttribute("data-franchise-id") || "";
      var card = outreachBoard.querySelector('[data-outreach-card][data-franchise-id="' + cssEscape(franchiseId) + '"]');
      var wrap = card && card.querySelector("[data-burned-reason-wrap]");
      if (!wrap) return;
      wrap.hidden = select.value !== "burned";
    }

    function cssEscape(value) {
      if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
      return String(value || "").replace(/["\\]/g, "\\$&");
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
