(function (window) {
  function createOutreach(options) {
    var utils = window.FranchiseDashboardUtils;
    var escapeHtml = utils.escapeHtml;
    var escapeAttr = utils.escapeAttr;
    var renderActionToolbar = utils.renderActionToolbar;
    var renderActionButton = utils.renderActionButton;
    var renderActionLink = utils.renderActionLink;
    var renderPillActionButton = utils.renderPillActionButton;
    var outreachWorklist = options.outreachWorklist;
    var outreachBoard = options.outreachBoard;
    var outreachStageSummary = options.outreachStageSummary;
    var outreachCount = options.outreachCount;
    var outreachTabBadge = options.outreachTabBadge;
    var outreachActions = options.outreachActions;
    var googleContactsNotice = options.googleContactsNotice;
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
        if (publishedUnclaimed > contactReady) badge += " / " + publishedUnclaimed + " listing eligible";
        if (queueLimit && contactReady > rows.length) badge += " (limit " + queueLimit + ")";
      }
      outreachCount.textContent = badge;
      renderOutreachTabBadge(counts);
      renderOutreachSummary(pipeline, counts, summary.conversion_metrics || {});
      renderOutreachActions(filteredRows);
      if (!filteredRows.length) {
        if (outreachWorklist) outreachWorklist.innerHTML = '<div class="dash-empty">Tidak ada listing dengan nomor WhatsApp/mobile untuk sales outreach.</div>';
        if (outreachBoard) outreachBoard.innerHTML = '<div class="dash-empty">Tidak ada listing dengan nomor WhatsApp/mobile untuk pipeline sales.</div>';
        return;
      }
      renderOutreachWorklist(filteredRows, pipeline);
      renderPipelineBoard(filteredRows, pipeline);
    }

    function renderOutreachWorklist(rows, pipeline) {
      if (!outreachWorklist) return;
      outreachWorklist.innerHTML = rows.map(function (row) {
        return renderOutreachCard(row, pipeline, "worklist");
      }).join("");
      bindOutreachInteractions(outreachWorklist);
    }

    function renderPipelineBoard(filteredRows, pipeline) {
      if (!outreachBoard) return;
      outreachBoard.innerHTML = pipeline.map(function (status) {
        var stageRows = filteredRows.filter(function (row) { return normalizeOutreachStatus(row.current_status) === status.value; });
        return '<section class="dash-outreach-column" data-outreach-drop-status="' + escapeAttr(status.value) + '" aria-label="' + escapeAttr(status.label) + '">' +
          '<div class="dash-outreach-column-head">' +
            '<div><i class="' + escapeAttr(status.icon || "fas fa-circle") + '" aria-hidden="true"></i><strong>' + escapeHtml(status.label) + '</strong>' + renderInfoIcon(status.label, status.description || "", "fas fa-info-circle") + '</div>' +
            '<span class="dash-outreach-count">' + escapeHtml(stageRows.length) + '</span>' +
          '</div>' +
          '<div class="dash-outreach-card-list">' +
            (stageRows.length ? stageRows.map(function (row) { return renderOutreachCard(row, pipeline, "board"); }).join("") : '<div class="dash-outreach-empty">Kosong</div>') +
          '</div>' +
        '</section>';
      }).join("");

      bindOutreachInteractions(outreachBoard);
      bindOutreachDragAndDrop();
    }

    function bindOutreachInteractions(root) {
      if (!root) return;
      root.querySelectorAll("[data-log-outreach]").forEach(function (link) {
        link.addEventListener("click", function () {
          logOutreach(link);
        });
      });
      root.querySelectorAll("[data-outreach-status-select]").forEach(function (select) {
        select.addEventListener("change", function () {
          toggleBurnedReason(select);
          updateOutreachStatus(select.getAttribute("data-franchise-id"), select.value, select);
        });
      });
      root.querySelectorAll("[data-outreach-status-select]").forEach(toggleBurnedReason);
    }

    function renderOutreachCard(row, pipeline, mode) {
      var contact = row.contacts && row.contacts[0];
      var waUrl = row.primary_whatsapp_url || "";
      var message = waUrl.indexOf("text=") >= 0 ? decodeURIComponent(waUrl.split("text=")[1] || "") : "";
      var status = normalizeOutreachStatus(row.current_status);
      var meta = pipeline.find(function (item) { return item.value === status; }) || pipeline[0];
      var isBoard = mode === "board";
      var nextAction = row.sales_next_action || meta.next_action || "Langkah berikutnya";
      var nextDetail = row.sales_next_action_detail || meta.next_action_detail || "";
      var reason = row.sales_reason || meta.description || "";
      return '<article class="dash-outreach-card ' + (isBoard ? 'is-board-card' : 'is-worklist-card') + ' is-' + escapeAttr(meta.tone || "neutral") + '"' + (isBoard ? ' draggable="true"' : '') + ' data-outreach-card data-franchise-id="' + escapeAttr(row.id) + '">' +
        '<div class="dash-outreach-card-head">' +
          '<div>' +
            '<a href="' + escapeAttr(row.public_url) + '" target="_blank" rel="noopener">' + escapeHtml(row.brand_name) + '</a>' +
            '<span class="dash-outreach-category">' + escapeHtml(row.category || "Tanpa kategori") + '</span>' +
          '</div>' +
          renderOutreachStatusBadge(meta) +
        '</div>' +
        '<div class="dash-outreach-compact-line">' +
          '<span class="dash-outreach-next-badge" data-fr-tooltip="' + escapeAttr(nextDetail || nextAction) + '"><i class="' + escapeAttr(meta.icon || "fas fa-arrow-right") + '" aria-hidden="true"></i><span>' + escapeHtml(nextAction) + '</span></span>' +
          renderInfoIcon("Kenapa muncul", reason, "fas fa-info-circle") +
        '</div>' +
        renderOutreachMetaChips(row, contact) +
        '<div class="dash-outreach-controls">' +
          '<select class="dash-outreach-status-select" data-outreach-status-select data-last-value="' + escapeAttr(status) + '" data-franchise-id="' + escapeAttr(row.id) + '" aria-label="Status outreach ' + escapeAttr(row.brand_name || "") + '">' + renderOutreachStatusOptions(pipeline, status) + '</select>' +
          (!isBoard ? '<input class="dash-outreach-note-input" data-outreach-note data-franchise-id="' + escapeAttr(row.id) + '" maxlength="1000" placeholder="Catatan singkat" aria-label="Catatan outreach ' + escapeAttr(row.brand_name || "") + '" value="' + escapeAttr(row.outreach_notes || "") + '">' : "") +
        '</div>' +
        '<label class="dash-outreach-burned-reason" data-burned-reason-wrap hidden>' +
          '<span>Burned</span>' +
          '<select data-outreach-burned-reason data-franchise-id="' + escapeAttr(row.id) + '" aria-label="Alasan burned ' + escapeAttr(row.brand_name || "") + '">' + renderBurnedReasonOptions(row.burned_reason || "") + '</select>' +
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
      return '<span class="dash-outreach-status-badge is-' + escapeAttr(status.tone || "neutral") + '" data-fr-tooltip="' + escapeAttr(status.description || status.label || status.value) + '">' +
        '<i class="' + escapeAttr(status.icon || "fas fa-circle") + '" aria-hidden="true"></i>' +
        '<span>' + escapeHtml(status.short_label || status.label || status.value) + '</span>' +
      '</span>';
    }

    function renderOutreachMetaChips(row, contact) {
      var chips = [];
      if (contact) chips.push(renderMetaChip("fab fa-whatsapp", contact.display, contact.label + ": " + contact.display, "good"));
      else chips.push(renderMetaChip("fas fa-phone-slash", "No WA", "Tidak ada nomor WhatsApp/mobile", "bad"));
      chips.push(renderMetaChip("fas fa-clock", row.last_outreach_at ? "Last" : "New", row.last_outreach_at ? "Outreach terakhir " + row.last_outreach_at : "Belum pernah dikontak", ""));
      if (row.next_follow_up_at) chips.push(renderMetaChip("fas fa-calendar-day", "FU", "Follow-up " + row.next_follow_up_at, row.is_overdue ? "bad" : ""));
      if (row.is_overdue) chips.push(renderMetaChip("fas fa-exclamation-triangle", "Due", row.overdue_label || "Overdue", "bad"));
      chips.push(renderMetaChip(row.assigned_staff_user_id ? "fas fa-user-check" : "fas fa-user-plus", row.assigned_staff_user_id ? "Staff" : "Open", row.assigned_staff_user_id ? "Sudah assigned ke staff" : "Belum assigned", ""));
      if (row.publication_status) chips.push(renderMetaChip("fas fa-network-wired", row.publication_status, "Publikasi " + row.publication_status, ""));
      if (row.active_subscription_ends_at) chips.push(renderMetaChip("fas fa-crown", "Sub", "Subscription aktif sampai " + row.active_subscription_ends_at, "premium"));
      else if (row.latest_subscription_ends_at) chips.push(renderMetaChip("fas fa-hourglass-end", "Risk", "Subscription terakhir " + row.latest_subscription_ends_at, "warning"));
      return '<div class="dash-outreach-meta">' + chips.join("") + '</div>';
    }

    function renderMetaChip(icon, text, tooltip, tone) {
      return '<span class="dash-outreach-chip ' + (tone ? 'is-' + escapeAttr(tone) : '') + '" data-fr-tooltip="' + escapeAttr(tooltip || text) + '"><i class="' + escapeAttr(icon || "fas fa-circle") + '" aria-hidden="true"></i><span>' + escapeHtml(text || "") + '</span></span>';
    }

    function renderInfoIcon(label, tooltip, icon) {
      if (!tooltip) return "";
      return '<span class="dash-outreach-info" role="img" aria-label="' + escapeAttr(label) + '" data-fr-tooltip="' + escapeAttr(tooltip) + '"><i class="' + escapeAttr(icon || "fas fa-info-circle") + '" aria-hidden="true"></i></span>';
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
      if (!outreachBoard) return;
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
        '<label class="dash-outreach-filter" data-fr-tooltip="Filter daftar outreach"><i class="fas fa-filter" aria-hidden="true"></i><span>Filter daftar outreach</span>' +
        '<select data-outreach-filter aria-label="Filter daftar outreach">' +
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
      var card = findOutreachCard(franchiseId);
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
      var card = select.closest("[data-outreach-card]") || findOutreachCard(franchiseId);
      var wrap = card && card.querySelector("[data-burned-reason-wrap]");
      if (!wrap) return;
      wrap.hidden = select.value !== "burned";
    }

    function findOutreachCard(franchiseId) {
      var selector = '[data-outreach-card][data-franchise-id="' + cssEscape(franchiseId) + '"]';
      return (outreachWorklist && outreachWorklist.querySelector(selector)) || (outreachBoard && outreachBoard.querySelector(selector));
    }

    function cssEscape(value) {
      if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
      return String(value || "").replace(/["\\]/g, "\\$&");
    }

    async function saveGoogleContacts(button, rows) {
      try {
        button.disabled = true;
        button.classList.add("is-busy");
        hideGoogleContactsNotice();
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
        hideGoogleContactsNotice();
      } catch (error) {
        button.disabled = false;
        button.classList.remove("is-busy");
        var formatted = formatGoogleContactsError(error);
        options.setStatus(formatted.message, true);
        if (formatted.showNotice) showGoogleContactsNotice(formatted);
      }
    }

    function formatGoogleContactsError(error) {
      var result = error && error.dashboardResult ? error.dashboardResult : {};
      var message = error && error.message ? error.message : "Kontak belum bisa disimpan ke Google.";
      var needsSetup = result.setup_required || result.reauth_required || result.error === "GOOGLE_CONTACTS_SCOPE_MISSING" || result.error === "GOOGLE_ACCOUNT_NOT_LINKED";
      if (!needsSetup) return { message: escapeHtml(message), showNotice: false };
      var href = result.documentation_url || GOOGLE_CONTACTS_SETUP_DOC;
      var reauthMessage = "Izin Google Contacts sudah disiapkan, tetapi sesi Google staff yang sedang aktif belum membawa izin baru. Logout dari dashboard lalu login ulang dengan Google, kemudian coba simpan kontak lagi.";
      var statusMessage = escapeHtml(reauthMessage) + ' <a class="dash-link" href="' + escapeAttr(href) + '">Lihat panduan setup</a>.';
      return {
        message: statusMessage,
        showNotice: true,
        detail: message,
        documentationUrl: href,
      };
    }

    function showGoogleContactsNotice(details) {
      if (!googleContactsNotice) return;
      googleContactsNotice.hidden = false;
      googleContactsNotice.innerHTML =
        '<div class="dash-outreach-alert-icon"><i class="fab fa-google" aria-hidden="true"></i></div>' +
        '<div class="dash-outreach-alert-body">' +
          '<strong>Izin Google Contacts perlu login ulang</strong>' +
          '<p>Scope Google Contacts sudah diperbarui, tetapi sesi Google staff saat ini masih memakai izin lama. Logout dulu, lalu login ulang dengan Google dan pilih akun staff yang sama.</p>' +
          (details.detail ? '<p class="dash-outreach-alert-detail">' + escapeHtml(details.detail) + '</p>' : "") +
        '</div>' +
        '<div class="dash-outreach-alert-actions">' +
          '<button class="dash-pill-action primary" type="button" data-google-contacts-reauth data-fr-tooltip="Logout lalu login ulang dengan Google">' +
            '<i class="fas fa-sign-out-alt" aria-hidden="true"></i><span>Logout & login Google ulang</span>' +
          '</button>' +
          '<a class="dash-pill-action" href="' + escapeAttr(details.documentationUrl || GOOGLE_CONTACTS_SETUP_DOC) + '" data-fr-tooltip="Buka panduan Google Contacts">' +
            '<i class="fas fa-book-open" aria-hidden="true"></i><span>Panduan</span>' +
          '</a>' +
        '</div>';
      var reauthButton = googleContactsNotice.querySelector("[data-google-contacts-reauth]");
      if (reauthButton) reauthButton.addEventListener("click", reauthGoogleContacts);
      if (window.FranchiseTooltip && typeof window.FranchiseTooltip.refresh === "function") {
        window.FranchiseTooltip.refresh();
      }
    }

    function hideGoogleContactsNotice() {
      if (!googleContactsNotice) return;
      googleContactsNotice.hidden = true;
      googleContactsNotice.innerHTML = "";
    }

    async function reauthGoogleContacts() {
      try {
        options.setStatus("Logout dari sesi lama. Setelah itu login ulang dengan Google.", false);
        var clerk = window.FranchiseAuth && window.FranchiseAuth.clerk;
        if (!clerk && window.FranchiseAuth && typeof window.FranchiseAuth.init === "function") {
          clerk = await window.FranchiseAuth.init();
        }
        if (clerk && typeof clerk.signOut === "function") {
          await clerk.signOut();
        }
      } catch (error) {
        options.setStatus("Logout otomatis gagal. Klik tombol login Google lagi setelah halaman dimuat ulang.", true);
      } finally {
        window.location.href = "/dashboard/";
      }
    }

    return { render: render };
  }

  window.FranchiseDashboardOutreach = { createOutreach: createOutreach };
})(window);
