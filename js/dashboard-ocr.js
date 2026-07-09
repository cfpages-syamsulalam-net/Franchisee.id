(function () {
  var utils = window.FranchiseDashboardUtils;
  if (!utils) throw new Error("Dashboard utilities belum tersedia.");

  var metadataPayload = window.FranchiseOcrProviderMetadata || {};
  var PROVIDER_FIELDS = metadataPayload.providers || {};
  var FIELD_NAMES = metadataPayload.field_names || ["api_key", "api_secret", "account_id", "endpoint_url", "region", "model", "clear_api_key", "clear_api_secret"];
  var schedulerHelpers = window.FranchiseDashboardOcrSchedulers || {};
  var stateFactory = window.FranchiseDashboardOcrState || {};
  var providerRendererFactory = window.FranchiseDashboardOcrProviders || {};
  var jobRendererFactory = window.FranchiseDashboardOcrJobs || {};
  var batchRendererFactory = window.FranchiseDashboardOcrBatches || {};
  var resultRendererFactory = window.FranchiseDashboardOcrResults || {};

  function createOperations(options) {
    options = options || {};
    var state = stateFactory.createInitialState();
    var jobRenderers = typeof jobRendererFactory.createRenderer === "function" ? jobRendererFactory.createRenderer({
      utils: utils,
      getJobFilterStatus: function () { return state.jobFilterStatus; },
      getJobFilterResults: function () { return state.jobFilterResults; },
      getJobFilterMeta: function () { return state.jobFilterMeta; },
      getJobFilterLoading: function () { return state.jobFilterLoading; },
      getActiveProviderCount: function () { return state.activeProviderCount; },
      statusLabel: statusLabel,
      renderJobStatus: renderJobStatus,
      renderJobActionLink: renderJobActionLink,
      renderJobResultAction: renderJobResultAction,
      renderJobActionButton: renderJobActionButton
    }) : null;
    var batchRenderers = typeof batchRendererFactory.createRenderer === "function" ? batchRendererFactory.createRenderer({
      utils: utils,
      getActiveProviderCount: function () { return state.activeProviderCount; },
      renderJobStatus: renderJobStatus
    }) : null;
    var resultRenderers = typeof resultRendererFactory.createRenderer === "function" ? resultRendererFactory.createRenderer({
      utils: utils,
      statusLabel: statusLabel,
      fieldLabel: fieldLabel,
      clampResultPage: clampResultPage
    }) : null;
    var providerRenderers = typeof providerRendererFactory.createRenderer === "function" ? providerRendererFactory.createRenderer({
      utils: utils,
      providerFields: PROVIDER_FIELDS,
      fieldNames: FIELD_NAMES,
      schedulerHelpers: schedulerHelpers
    }) : null;

    function bind() {
      (options.subtabs || []).forEach(function (tab) {
        tab.addEventListener("click", function () {
          activateSubtab(tab.getAttribute("data-ocr-subtab"));
        });
      });
      if (options.providerSelect) {
        options.providerSelect.addEventListener("change", function () {
          fillForm(findProvider(options.providerSelect.value));
        });
      }
      if (options.schedulerSelect) {
        options.schedulerSelect.addEventListener("change", function () {
          fillSchedulerForm(findScheduler(options.schedulerSelect.value));
        });
      }
      if (options.form) options.form.addEventListener("submit", submit);
      if (options.form) options.form.addEventListener("input", handleFormChange);
      if (options.form) options.form.addEventListener("change", handleFormChange);
      if (options.schedulerForm) options.schedulerForm.addEventListener("submit", submitScheduler);
      if (options.schedulerForm) options.schedulerForm.addEventListener("input", handleSchedulerFormChange);
      if (options.schedulerForm) options.schedulerForm.addEventListener("change", handleSchedulerFormChange);
      if (options.providerList) options.providerList.addEventListener("click", handleProviderListClick);
      if (options.jobStatus) options.jobStatus.addEventListener("click", handleJobStatusClick);
      if (options.jobRows) options.jobRows.addEventListener("click", handleJobRowsClick);
      if (options.batchRows) options.batchRows.addEventListener("click", handleBatchRowsClick);
      if (options.resultRows) options.resultRows.addEventListener("click", handleResultClick);
      if (options.resultFilterForm) options.resultFilterForm.addEventListener("submit", submitResultSearch);
      if (options.resultResetButton) options.resultResetButton.addEventListener("click", resetResultSearch);
      if (options.resultLoadMoreButton) options.resultLoadMoreButton.addEventListener("click", loadMoreResultSearch);
      if (options.dryRunButton) options.dryRunButton.addEventListener("click", runDryRun);
      if (options.enqueueButton) options.enqueueButton.addEventListener("click", enqueueJobs);
      if (options.runButton) options.runButton.addEventListener("click", runJobs);
      if (options.retryFailedButton) options.retryFailedButton.addEventListener("click", retryFailedJobs);
    }

    function render(payload, jobsPayload, schedulerPayload) {
      payload = payload || {};
      jobsPayload = jobsPayload || {};
      schedulerPayload = schedulerPayload || {};
      state.providers = payload.providers || [];
      state.schedulers = schedulerPayload.providers || [];
      state.adminOnly = Boolean(payload.admin_only);
      state.schedulerAdminOnly = Boolean(schedulerPayload.admin_only);
      state.activeProviderCount = countActiveProviders(state.providers);
      state.activeSchedulerCount = countActiveSchedulers(state.schedulers);
      state.lastJobsPayload = jobsPayload;
      var resultsPayload = state.resultSearchActive ? buildSearchResultsPayload(jobsPayload) : jobsPayload;
      renderList(payload);
      renderJobs(jobsPayload);
      renderResults(resultsPayload);
      renderResultSearchStatus(resultsPayload);
      renderBatches(jobsPayload);
      syncBatchPolling(jobsPayload);
      renderSelect();
      renderSchedulerSelect();
      if (state.adminOnly) {
        providerRenderers.setProviderFormDisabled(options.form, true);
        setJobButtonsDisabled(true);
        setInlineStatus("Hanya admin yang dapat melihat dan mengubah konfigurasi OCR.");
        return;
      }
      providerRenderers.setProviderFormDisabled(options.form, false);
      setJobButtonsDisabled(Boolean(jobsPayload.migration_required) || state.activeProviderCount === 0);
      var selectedKey = options.providerSelect && options.providerSelect.value;
      var selected = findProvider(selectedKey) || state.providers[0] || null;
      if (selected && options.providerSelect) options.providerSelect.value = selected.provider_key;
      fillForm(selected);
      if (state.schedulerAdminOnly || schedulerPayload.migration_required) {
        providerRenderers.setSchedulerFormDisabled(options.schedulerForm, true);
        setSchedulerStatus(schedulerPayload.migration_required ? "Migration scheduler OCR belum siap." : "Hanya admin yang dapat mengubah scheduler OCR.");
      } else {
        providerRenderers.setSchedulerFormDisabled(options.schedulerForm, false);
        var selectedSchedulerKey = options.schedulerSelect && options.schedulerSelect.value;
        var selectedScheduler = findScheduler(selectedSchedulerKey) || state.schedulers[0] || null;
        if (selectedScheduler && options.schedulerSelect) options.schedulerSelect.value = selectedScheduler.provider_key;
        fillSchedulerForm(selectedScheduler);
      }
    }

    function activateSubtab(name) {
      name = name || "settings";
      (options.subtabs || []).forEach(function (tab) {
        var active = tab.getAttribute("data-ocr-subtab") === name;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });
      (options.subpanels || []).forEach(function (panel) {
        var active = panel.getAttribute("data-ocr-subpanel") === name;
        panel.hidden = !active;
        panel.classList.toggle("is-active", active);
      });
      syncBatchPolling(state.lastJobsPayload || {});
    }

    function handleResultClick(event) {
      var pageButton = event.target && event.target.closest && event.target.closest("[data-ocr-result-page]");
      if (pageButton) {
        event.preventDefault();
        setResultGroupPage(pageButton.getAttribute("data-ocr-result-page"), Number(pageButton.getAttribute("data-ocr-result-page-index") || 0));
        return;
      }
      var prevButton = event.target && event.target.closest && event.target.closest("[data-ocr-result-prev]");
      if (prevButton) {
        event.preventDefault();
        moveResultGroupPage(prevButton.getAttribute("data-ocr-result-prev"), -1);
        return;
      }
      var nextButton = event.target && event.target.closest && event.target.closest("[data-ocr-result-next]");
      if (nextButton) {
        event.preventDefault();
        moveResultGroupPage(nextButton.getAttribute("data-ocr-result-next"), 1);
        return;
      }
      var resultLink = event.target && event.target.closest && event.target.closest("[data-ocr-open-result]");
      if (resultLink) {
        event.preventDefault();
        activateSubtab("results");
        focusResultRow(resultLink.getAttribute("data-ocr-open-result"));
        return;
      }
      var link = event.target && event.target.closest && event.target.closest("[data-ocr-open-review]");
      if (!link) return;
      event.preventDefault();
      var reviewTab = document.querySelector('[data-dashboard-tab="review"]');
      if (reviewTab) reviewTab.click();
      options.setStatus("Buka tab Review untuk meninjau kandidat data dari hasil OCR sebelum disetujui ke listing.", false);
    }

    async function submitResultSearch(event) {
      event.preventDefault();
      await searchOcrResults(false);
    }

    async function loadMoreResultSearch() {
      if (!state.resultSearchActive) return;
      await searchOcrResults(true);
    }

    async function resetResultSearch() {
      state.resultSearchActive = false;
      state.resultSearchResults = [];
      state.resultSearchMeta = null;
      state.resultPageByFranchise = {};
      if (options.resultFilterForm) options.resultFilterForm.reset();
      renderResults(state.lastJobsPayload || {});
      renderResultSearchStatus(state.lastJobsPayload || {});
      refreshTooltips();
      options.setStatus("Hasil OCR kembali ke daftar terbaru.", false);
    }

    async function searchOcrResults(append) {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa mencari histori OCR lengkap.", true);
        return;
      }
      if (state.resultSearchLoading) return;
      state.resultSearchLoading = true;
      setResultSearchBusy(true, append ? "Memuat..." : "Mencari...");
      try {
        var filters = readResultSearchFilters();
        var offset = append && state.resultSearchMeta ? Number(state.resultSearchMeta.offset || 0) + state.resultSearchResults.length : 0;
        var result = await options.postDashboardAction({
          action: "search_ocr_results",
          query: filters.query,
          status: filters.status,
          limit: filters.limit,
          offset: offset
        });
        state.resultSearchActive = true;
        state.resultSearchResults = append ? mergeResultRows(state.resultSearchResults, result.results || []) : (result.results || []);
        state.resultSearchMeta = {
          total: Number(result.total || 0),
          limit: Number(result.limit || filters.limit),
          offset: 0,
          has_more: Boolean(result.has_more),
          filters: result.filters || filters
        };
        state.resultPageByFranchise = append ? state.resultPageByFranchise : {};
        var payload = buildSearchResultsPayload(state.lastJobsPayload || {});
        renderResults(payload);
        renderResultSearchStatus(payload);
        refreshTooltips();
        options.setStatus("Hasil OCR difilter dari server: " + state.resultSearchResults.length.toLocaleString("id-ID") + " dari " + Number(result.total || 0).toLocaleString("id-ID") + " hasil.", false);
      } catch (error) {
        options.setStatus(error.message || "Pencarian hasil OCR gagal.", true);
      } finally {
        state.resultSearchLoading = false;
        setResultSearchBusy(false);
      }
    }

    async function searchOcrJobs(status, offset) {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa melihat daftar job OCR lengkap.", true);
        return;
      }
      if (state.jobFilterLoading) return;
      state.jobFilterLoading = true;
      state.jobFilterStatus = status || "all";
      renderJobs(state.lastJobsPayload || {});
      try {
        var limit = state.jobFilterMeta ? Number(state.jobFilterMeta.limit || 80) : 80;
        var result = await options.postDashboardAction({
          action: "search_ocr_jobs",
          status: state.jobFilterStatus,
          limit: limit,
          offset: Math.max(0, Number(offset || 0))
        });
        state.jobFilterResults = result.jobs || [];
        state.jobFilterMeta = {
          total: Number(result.total || 0),
          limit: Number(result.limit || limit),
          offset: Number(result.offset || 0),
          has_more: Boolean(result.has_more),
          filters: result.filters || { status: state.jobFilterStatus }
        };
        renderJobs(state.lastJobsPayload || {});
        refreshTooltips();
        options.setStatus("Daftar job OCR difilter: " + statusLabel(state.jobFilterStatus) + " · " + state.jobFilterResults.length.toLocaleString("id-ID") + " tampil.", false);
      } catch (error) {
        options.setStatus(error.message || "Filter job OCR gagal.", true);
      } finally {
        state.jobFilterLoading = false;
        renderJobs(state.lastJobsPayload || {});
      }
    }

    async function handleProviderListClick(event) {
      var toggleButton = event.target && event.target.closest && event.target.closest("[data-ocr-toggle-provider]");
      if (toggleButton) {
        event.preventDefault();
        await toggleProvider(toggleButton.getAttribute("data-ocr-toggle-provider"));
        return;
      }
      var button = event.target && event.target.closest && event.target.closest("[data-ocr-copy-provider-error]");
      if (!button) return;
      event.preventDefault();
      var provider = findProvider(button.getAttribute("data-ocr-copy-provider-error"));
      if (!provider) return;
      var text = buildProviderErrorText(provider);
      try {
        await copyText(text);
        options.setStatus("Error OCR provider sudah disalin. Paste ke chat kalau perlu troubleshooting.", false);
      } catch (error) {
        options.setStatus("Browser belum mengizinkan copy otomatis. Seleksi teks error provider lalu copy manual.", true);
      }
    }

    async function handleJobRowsClick(event) {
      var pageButton = event.target && event.target.closest && event.target.closest("[data-ocr-job-page]");
      if (pageButton) {
        event.preventDefault();
        await searchOcrJobs(state.jobFilterStatus || "all", Number(pageButton.getAttribute("data-ocr-job-page") || 0));
        return;
      }
      var retryButton = event.target && event.target.closest && event.target.closest("[data-ocr-retry-job]");
      if (retryButton) {
        event.preventDefault();
        await retryJob(retryButton.getAttribute("data-ocr-retry-job"), retryButton);
        return;
      }
      var noTextButton = event.target && event.target.closest && event.target.closest("[data-ocr-mark-no-text]");
      if (noTextButton) {
        event.preventDefault();
        await markJobNoText(noTextButton.getAttribute("data-ocr-mark-no-text"), noTextButton);
        return;
      }
      var resultLink = event.target && event.target.closest && event.target.closest("[data-ocr-open-result]");
      if (!resultLink) return;
      event.preventDefault();
      activateSubtab("results");
      focusResultRow(resultLink.getAttribute("data-ocr-open-result"));
    }

    async function handleJobStatusClick(event) {
      var button = event.target && event.target.closest && event.target.closest("[data-ocr-job-filter]");
      if (!button) return;
      event.preventDefault();
      await searchOcrJobs(button.getAttribute("data-ocr-job-filter") || "all", 0);
    }

    async function handleBatchRowsClick(event) {
      var retryButton = event.target && event.target.closest && event.target.closest("[data-ocr-retry-batch]");
      if (retryButton) {
        event.preventDefault();
        await retryBatch(retryButton.getAttribute("data-ocr-retry-batch"), retryButton);
        return;
      }
      var refreshButton = event.target && event.target.closest && event.target.closest("[data-ocr-refresh-batches]");
      if (!refreshButton) return;
      event.preventDefault();
      await buttonAction(refreshButton, "Refresh...", async function () {
        options.setStatus("Memuat ulang status batch OCR...", false);
        await options.reloadDashboard();
        var now = new Date();
        options.setStatus("Status batch OCR sudah di-refresh pada " + now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + ". Jika angka belum berubah, worker/scheduler memang belum mengirim update baru.", false);
      }, options.setStatus);
    }

    async function toggleProvider(providerKey) {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa mengubah provider OCR.", true);
        return;
      }
      var provider = findProvider(providerKey);
      if (!provider) return;
      var nextEnabled = !provider.is_enabled;
      await options.postDashboardAction({
        action: "toggle_ocr_provider_enabled",
        provider_key: provider.provider_key,
        is_enabled: nextEnabled
      });
      options.setStatus((nextEnabled ? "Provider OCR diaktifkan: " : "Provider OCR dinonaktifkan: ") + provider.display_name + ".", false);
      await options.reloadDashboard();
    }

    function renderList(payload) {
      if (!options.providerList) return;
      options.providerList.innerHTML = providerRenderers.renderProviderList(payload, state.providers, state.adminOnly);
    }

    function renderJobs(payload) {
      payload = payload || {};
      if (options.jobStatus) {
        if (payload.admin_only) {
          options.jobStatus.textContent = "Hanya admin yang dapat mengelola job OCR.";
        } else if (payload.migration_required) {
          options.jobStatus.textContent = "Queue OCR belum siap. Jalankan migration OCR terlebih dahulu.";
        } else {
          var counts = payload.counts || {};
          var statusButtons = [
            jobRenderers.renderJobFilterButton("unqueued", "fa-plus-circle", "Belum antre", payload.enqueue_candidates || 0),
            jobRenderers.renderJobFilterButton("pending", "fa-clock", "Pending", counts.pending || 0),
            jobRenderers.renderJobFilterButton("running", "fa-spinner", "Running", counts.running || 0),
            jobRenderers.renderJobFilterButton("succeeded", "fa-check-circle", "Sukses", counts.succeeded || 0),
            jobRenderers.renderJobFilterButton("needs_review", "fa-eye", "Perlu cek", counts.needs_review || 0),
            jobRenderers.renderJobFilterButton("failed", "fa-times-circle", "Gagal", counts.failed || 0)
          ];
          var notices = [];
          if (state.activeProviderCount === 0) notices.push("Provider aktif: 0 — aktifkan provider OCR dulu.");
          if (state.activeSchedulerCount === 0) notices.push("Scheduler aktif: 0 — batch 100 perlu dijalankan manual per chunk.");
          options.jobStatus.innerHTML = '<div class="dash-ocr-job-filterbar">' + statusButtons.join("") + '</div>' +
            (notices.length ? '<small>' + utils.escapeHtml(notices.join(" · ")) + '</small>' : "");
        }
      }
      if (!options.jobRows) return;
      if (payload.migration_required) {
        options.jobRows.innerHTML = '<li><strong>Queue belum aktif</strong><span>Migration OCR job queue perlu dijalankan sebelum batch OCR dipakai.</span></li>';
        return;
      }
      var jobPayload = state.jobFilterStatus ? jobRenderers.buildJobFilterPayload(payload) : payload;
      var jobs = jobPayload.recent || [];
      var groups = jobRenderers.groupJobsByFranchise(jobs);
      var heading = jobRenderers.renderJobFilterHeading(jobPayload);
      var pagination = jobRenderers.renderJobPagination(jobPayload);
      options.jobRows.innerHTML = heading + (groups.length
        ? groups.map(jobRenderers.renderJobGroup).join("")
        : '<li><span>' + utils.escapeHtml(state.jobFilterStatus ? "Tidak ada job untuk filter ini." : "Belum ada job OCR. Antrekan proposal gambar terlebih dahulu.") + '</span></li>') + pagination;
    }

    function renderBatches(payload) {
      if (!options.batchRows) return;
      payload = payload || {};
      options.batchRows.innerHTML = batchRenderers.renderBatches(payload);
      syncBatchCountdowns();
    }

    function syncBatchPolling(payload) {
      window.clearTimeout(state.pollTimer);
      state.pollTimer = null;
      if (!hasActiveBatch(payload) || !isOcrPanelVisible() || typeof options.reloadDashboard !== "function") return;
      state.pollTimer = window.setTimeout(async function () {
        if (state.polling) return;
        state.polling = true;
        try {
          await options.reloadDashboard();
        } catch (_error) {
          options.setStatus("Auto-refresh status batch OCR gagal. Pakai tombol Refresh kalau perlu cek manual.", true);
        } finally {
          state.polling = false;
        }
      }, 7000);
    }

    function syncBatchCountdowns() {
      window.clearInterval(state.countdownTimer);
      state.countdownTimer = null;
      updateBatchCountdownLabels();
      if (options.batchRows && options.batchRows.querySelector("[data-ocr-batch-countdown-until]")) {
        state.countdownTimer = window.setInterval(updateBatchCountdownLabels, 1000);
      }
    }

    function updateBatchCountdownLabels() {
      if (!options.batchRows) return;
      var activeCount = batchRenderers.updateCountdownLabels(options.batchRows);
      if (!activeCount && state.countdownTimer) {
        window.clearInterval(state.countdownTimer);
        state.countdownTimer = null;
      }
    }

    function hasActiveBatch(payload) {
      return ((payload && payload.batches) || []).some(function (batch) {
        return ["queued", "running"].indexOf(batch.status) !== -1;
      });
    }

    function isOcrPanelVisible() {
      var panel = document.querySelector('[data-dashboard-panel="ocr"]');
      if (!panel) return true;
      return !panel.hidden && panel.offsetParent !== null;
    }

    function renderJobStatus(status) {
      var map = {
        succeeded: ["fa-check-circle", "success", "Sukses"],
        failed: ["fa-times-circle", "failed", "Gagal"],
        needs_review: ["fa-eye", "review", "Perlu cek"],
        queued: ["fa-clock", "pending", "Queued"],
        pending: ["fa-clock", "pending", "Pending"],
        running: ["fa-spinner fa-spin", "running", "Running"],
        unqueued: ["fa-plus-circle", "pending", "Belum antre"],
        paused_rate_limit: ["fa-hourglass-half", "review", "Jeda rate limit"],
        paused_quota: ["fa-pause-circle", "review", "Jeda kuota"],
        completed: ["fa-check-circle", "success", "Selesai"],
        cancelled: ["fa-ban", "failed", "Batal"]
      };
      var item = map[status] || ["fa-circle", "unknown", status || "Status"];
      return '<span class="dash-ocr-job-state is-' + utils.escapeAttr(item[1]) + '"><i class="fas ' + item[0] + '" aria-hidden="true"></i>' + utils.escapeHtml(item[2]) + '</span>';
    }

    function renderJobActionLink(href, icon, label, tooltip, newTab) {
      return '<a class="dash-ocr-row-action" href="' + utils.escapeAttr(href) + '"' + (newTab ? ' target="_blank" rel="noopener"' : '') + ' data-fr-tooltip="' + utils.escapeAttr(tooltip) + '">' +
        '<i class="fas ' + icon + '" aria-hidden="true"></i><span>' + utils.escapeHtml(label) + '</span></a>';
    }

    function renderJobResultAction(assetId) {
      return '<a class="dash-ocr-row-action" href="#ocr-results" data-ocr-open-result="' + utils.escapeAttr(assetId) + '" data-fr-tooltip="Buka teks OCR yang berhasil diekstrak.">' +
        '<i class="fas fa-clipboard-check" aria-hidden="true"></i><span>Hasil</span></a>';
    }

    function renderJobActionButton(actionAttr, jobId, icon, label, tooltip, disabled) {
      return '<button type="button" class="dash-ocr-row-action" ' + actionAttr + '="' + utils.escapeAttr(jobId) + '" data-fr-tooltip="' + utils.escapeAttr(tooltip) + '"' + (disabled ? " disabled" : "") + '>' +
        '<i class="fas ' + icon + '" aria-hidden="true"></i><span>' + utils.escapeHtml(label) + '</span></button>';
    }

    function renderResults(payload) {
      if (!options.resultRows) return;
      payload = payload || {};
      if (payload.migration_required) {
        options.resultRows.innerHTML = '<li><strong>Hasil belum siap</strong><span>Migration OCR job queue perlu dijalankan sebelum hasil OCR bisa dibaca.</span></li>';
        return;
      }
      var results = payload.results || [];
      var groups = resultRenderers.groupResultsByFranchise(results);
      options.resultRows.innerHTML = groups.length
        ? groups.map(resultRenderers.renderResultGroup).join("")
        : '<li><strong>Belum ada hasil OCR</strong><span>Jalankan Dry run atau batch untuk menghasilkan teks. Setelah sukses, hasilnya muncul di sini.</span></li>';
    }

    function buildSearchResultsPayload(basePayload) {
      return Object.assign({}, basePayload || {}, {
        results: state.resultSearchResults || [],
        search: state.resultSearchMeta || null,
        migration_required: false
      });
    }

    function renderResultSearchStatus(payload) {
      if (!options.resultFilterStatus) return;
      payload = payload || {};
      if (state.resultSearchActive && state.resultSearchMeta) {
        var total = Number(state.resultSearchMeta.total || 0);
        var shown = (state.resultSearchResults || []).length;
        var filters = state.resultSearchMeta.filters || {};
        var parts = [
          "Menampilkan " + shown.toLocaleString("id-ID") + " dari " + total.toLocaleString("id-ID") + " hasil OCR",
          filters.query ? "cari: " + filters.query : "",
          filters.status && filters.status !== "all" ? "status: " + statusLabel(filters.status) : ""
        ].filter(Boolean);
        options.resultFilterStatus.innerHTML = '<i class="fas fa-filter" aria-hidden="true"></i> ' + utils.escapeHtml(parts.join(" · "));
      } else {
        var count = ((payload && payload.results) || []).length;
        options.resultFilterStatus.innerHTML = '<i class="fas fa-clock" aria-hidden="true"></i> ' + utils.escapeHtml("Menampilkan " + count.toLocaleString("id-ID") + " hasil OCR terbaru.");
      }
      if (options.resultLoadMoreButton) {
        options.resultLoadMoreButton.hidden = !(state.resultSearchActive && state.resultSearchMeta && state.resultSearchMeta.has_more);
      }
    }

    function readResultSearchFilters() {
      var form = options.resultFilterForm;
      var data = form ? new FormData(form) : new FormData();
      return {
        query: String(data.get("query") || "").trim(),
        status: String(data.get("status") || "all"),
        limit: Math.min(Math.max(Number(data.get("limit") || 40), 1), 100)
      };
    }

    function mergeResultRows(current, incoming) {
      var seen = {};
      var merged = [];
      (current || []).concat(incoming || []).forEach(function (item) {
        var key = item.asset_id || item.id || JSON.stringify(item);
        if (seen[key]) return;
        seen[key] = true;
        merged.push(item);
      });
      return merged;
    }

    function setResultSearchBusy(busy, label) {
      if (options.resultFilterForm) {
        Array.from(options.resultFilterForm.elements).forEach(function (input) {
          input.disabled = Boolean(busy);
        });
      }
      if (options.resultLoadMoreButton) options.resultLoadMoreButton.disabled = Boolean(busy);
      if (options.resultFilterStatus && busy) {
        options.resultFilterStatus.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> ' + utils.escapeHtml(label || "Memuat hasil OCR...");
      }
    }

    function focusResultRow(assetId) {
      if (!assetId || !options.resultRows) {
        options.setStatus("Buka subtab Hasil OCR untuk melihat teks yang berhasil diekstrak.", false);
        return;
      }
      var sourceResults = state.resultSearchActive ? state.resultSearchResults : ((state.lastJobsPayload && state.lastJobsPayload.results) || []);
      var groups = resultRenderers.groupResultsByFranchise(sourceResults);
      var found = groups.some(function (group) {
        var index = group.items.findIndex(function (item) { return item.asset_id === assetId; });
        if (index === -1) return false;
        state.resultPageByFranchise[group.key] = index;
        renderResults(state.resultSearchActive ? buildSearchResultsPayload(state.lastJobsPayload || {}) : (state.lastJobsPayload || {}));
        refreshTooltips();
        return true;
      });
      if (!found && state.resultSearchActive) {
        state.resultSearchActive = false;
        state.resultSearchResults = [];
        state.resultSearchMeta = null;
        renderResults(state.lastJobsPayload || {});
        renderResultSearchStatus(state.lastJobsPayload || {});
        groups = resultRenderers.groupResultsByFranchise((state.lastJobsPayload && state.lastJobsPayload.results) || []);
        groups.some(function (group) {
          var index = group.items.findIndex(function (item) { return item.asset_id === assetId; });
          if (index === -1) return false;
          state.resultPageByFranchise[group.key] = index;
          renderResults(state.lastJobsPayload || {});
          refreshTooltips();
          return true;
        });
      }
      var row = options.resultRows.querySelector('[data-ocr-result-asset-id="' + cssEscape(assetId) + '"]');
      if (!row) {
        options.setStatus("Subtab Hasil OCR dibuka. Jika hasil belum terlihat, muat ulang dashboard setelah job selesai tersimpan.", false);
        return;
      }
      options.resultRows.querySelectorAll(".is-highlighted").forEach(function (item) {
        item.classList.remove("is-highlighted");
      });
      row.classList.add("is-highlighted");
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(function () {
        row.classList.remove("is-highlighted");
      }, 2600);
      options.setStatus("Ini teks OCR yang berhasil diekstrak dari halaman brosur tersebut.", false);
    }

    function setResultGroupPage(groupKey, pageIndex) {
      state.resultPageByFranchise[groupKey] = Math.max(0, Number(pageIndex || 0));
      renderResults(state.lastJobsPayload || {});
      refreshTooltips();
    }

    function moveResultGroupPage(groupKey, delta) {
      var groups = resultRenderers.groupResultsByFranchise((state.lastJobsPayload && state.lastJobsPayload.results) || []);
      var group = groups.find(function (item) { return item.key === groupKey; });
      if (!group) return;
      setResultGroupPage(groupKey, clampResultPage(groupKey, group.items.length) + Number(delta || 0));
    }

    function clampResultPage(groupKey, total) {
      var max = Math.max(0, Number(total || 0) - 1);
      var current = Math.max(0, Number(state.resultPageByFranchise[groupKey] || 0));
      if (current > max) current = max;
      state.resultPageByFranchise[groupKey] = current;
      return current;
    }

    function renderSelect() {
      providerRenderers.renderProviderSelect(options.providerSelect, state.providers);
    }

    function fillForm(provider) {
      if (!options.form || !provider) return;
      state.filling = true;
      providerRenderers.fillProviderForm(options.form, provider, setInlineStatus);
      state.filling = false;
    }

    async function submit(event) {
      event.preventDefault();
      await saveConfig("Konfigurasi OCR tersimpan.");
    }

    function handleFormChange(event) {
      if (state.filling || state.adminOnly || !options.form) return;
      var target = event.target;
      if (!target || target.name === "provider_key") return;
      scheduleAutosave();
    }

    function scheduleAutosave() {
      window.clearTimeout(state.autosaveTimer);
      setInlineStatus("Perubahan akan disimpan otomatis...");
      state.autosaveTimer = window.setTimeout(function () {
        saveConfig("Perubahan OCR tersimpan otomatis.").catch(function (error) {
          options.setStatus(error.message || "Konfigurasi OCR belum bisa disimpan.", true);
        });
      }, 900);
    }

    async function saveConfig(successMessage) {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa mengubah konfigurasi OCR.", true);
        return;
      }
      if (state.saving) return;
      state.saving = true;
      try {
        var form = new FormData(options.form);
        var provider = findProvider(String(form.get("provider_key") || ""));
        var hasNewCredential = Boolean(String(form.get("api_key") || "").trim() || String(form.get("api_secret") || "").trim());
        var clearsCredential = form.get("clear_api_key") === "on" || form.get("clear_api_secret") === "on";
        var nextEnabled = clearsCredential ? false : (hasNewCredential ? true : Boolean(provider && provider.is_enabled));
        providerRenderers.setProviderFormDisabled(options.form, true);
        await options.postDashboardAction({
          action: "update_ocr_provider_config",
          provider_key: String(form.get("provider_key") || ""),
          api_key: String(form.get("api_key") || ""),
          api_secret: String(form.get("api_secret") || ""),
          clear_api_key: form.get("clear_api_key") === "on",
          clear_api_secret: form.get("clear_api_secret") === "on",
          account_id: String(form.get("account_id") || ""),
          endpoint_url: String(form.get("endpoint_url") || ""),
          region: String(form.get("region") || ""),
          model: String(form.get("model") || ""),
          priority: Number(form.get("priority") || 100),
          is_enabled: nextEnabled
        });
        setInlineStatus(successMessage || "Konfigurasi OCR tersimpan otomatis.");
        options.setStatus(successMessage || "Konfigurasi OCR tersimpan otomatis.", false);
        await options.reloadDashboard();
      } catch (error) {
        options.setStatus(error.message || "Konfigurasi OCR belum bisa disimpan.", true);
        throw error;
      } finally {
        state.saving = false;
        providerRenderers.setProviderFormDisabled(options.form, false);
      }
    }

    async function submitScheduler(event) {
      event.preventDefault();
      await saveSchedulerConfig("Konfigurasi scheduler OCR tersimpan.");
    }

    function handleSchedulerFormChange(event) {
      if (state.fillingScheduler || state.schedulerAdminOnly || !options.schedulerForm) return;
      var target = event.target;
      if (!target || target.name === "provider_key") return;
      scheduleSchedulerAutosave();
    }

    function scheduleSchedulerAutosave() {
      window.clearTimeout(state.schedulerAutosaveTimer);
      setSchedulerStatus("Perubahan scheduler akan disimpan otomatis...");
      state.schedulerAutosaveTimer = window.setTimeout(function () {
        saveSchedulerConfig("Perubahan scheduler OCR tersimpan otomatis.").catch(function (error) {
          options.setStatus(error.message || "Scheduler OCR belum bisa disimpan.", true);
        });
      }, 900);
    }

    async function saveSchedulerConfig(successMessage) {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa mengubah scheduler OCR.", true);
        return;
      }
      if (state.savingScheduler) return;
      state.savingScheduler = true;
      try {
        var form = new FormData(options.schedulerForm);
        var scheduler = findScheduler(String(form.get("provider_key") || ""));
        var hasNewCredential = Boolean(String(form.get("api_key") || "").trim() || String(form.get("api_secret") || "").trim());
        var clearsCredential = form.get("clear_api_key") === "on" || form.get("clear_api_secret") === "on";
        var nextEnabled = clearsCredential ? false : (hasNewCredential ? true : Boolean(scheduler && scheduler.is_enabled));
        providerRenderers.setSchedulerFormDisabled(options.schedulerForm, true);
        await options.postDashboardAction({
          action: "update_ocr_scheduler_config",
          provider_key: String(form.get("provider_key") || ""),
          api_key: String(form.get("api_key") || ""),
          api_secret: String(form.get("api_secret") || ""),
          clear_api_key: form.get("clear_api_key") === "on",
          clear_api_secret: form.get("clear_api_secret") === "on",
          endpoint_url: "",
          schedule_cron: String(form.get("schedule_cron") || ""),
          request_url: String(form.get("request_url") || ""),
          request_body: "",
          is_enabled: nextEnabled
        });
        setSchedulerStatus(successMessage || "Scheduler OCR tersimpan otomatis.");
        options.setStatus(successMessage || "Scheduler OCR tersimpan otomatis.", false);
        await options.reloadDashboard();
      } catch (error) {
        options.setStatus(error.message || "Scheduler OCR belum bisa disimpan.", true);
        throw error;
      } finally {
        state.savingScheduler = false;
        providerRenderers.setSchedulerFormDisabled(options.schedulerForm, false);
      }
    }

    async function enqueueJobs() {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa mengantrekan OCR.", true);
        return;
      }
      await buttonAction(options.enqueueButton, "Mengantrekan...", async function () {
        var result = await options.postDashboardAction({ action: "enqueue_ocr_jobs", limit: 100 });
        options.setStatus("OCR proposal diantrekan: " + Number(result.enqueued || 0).toLocaleString("id-ID") + " aset.", false);
        await refreshAfterJobMutation();
      }, options.setStatus);
    }

    async function runDryRun() {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa menjalankan dry-run OCR.", true);
        return;
      }
      await buttonAction(options.dryRunButton, "Dry-run...", async function () {
        var result = await options.postDashboardAction({ action: "run_ocr_dry_run" });
        options.setStatus("Dry-run OCR selesai: " + Number(result.processed_count || 0).toLocaleString("id-ID") + " job diproses.", false);
        await refreshAfterJobMutation();
      }, options.setStatus);
    }

    async function runJobs() {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa menjalankan OCR.", true);
        return;
      }
      await buttonAction(options.runButton, "Cek scheduler...", async function () {
        var scheduler = firstActiveScheduler();
        var result = await options.postDashboardAction({
          action: "start_ocr_batch_run",
          target_count: 100,
          scheduler_provider_key: scheduler ? scheduler.provider_key : "upstash_qstash"
        });
        var schedulerMessage = result.scheduler && result.scheduler.message ? " " + result.scheduler.message : "";
        options.setStatus("Preflight scheduler berhasil. Batch OCR dibuat: " + Number(result.assigned_count || 0).toLocaleString("id-ID") + " job masuk batch." + schedulerMessage, false);
        await refreshAfterJobMutation();
      }, options.setStatus);
    }

    async function retryJob(jobId, button) {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa retry OCR.", true);
        return;
      }
      await buttonAction(button, "OCR...", async function () {
        var result = await options.postDashboardAction({ action: "retry_ocr_job", job_id: jobId });
        options.setStatus("OCR ulang selesai: " + Number(result.processed_count || 0).toLocaleString("id-ID") + " job diproses. Jika tetap tanpa teks, status akan menjadi Perlu cek.", false);
        await refreshAfterJobMutation();
      }, options.setStatus);
    }

    async function markJobNoText(jobId, button) {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa menandai job OCR tanpa teks.", true);
        return;
      }
      await buttonAction(button, "Menandai...", async function () {
        await options.postDashboardAction({
          action: "mark_ocr_job_no_text",
          job_id: jobId,
          notes: "Admin sudah cek gambar: halaman brosur tidak memiliki teks yang cukup untuk OCR."
        });
        options.setStatus("Job OCR ditandai Perlu cek: gambar tidak memiliki teks yang cukup, bukan error provider.", false);
        await refreshAfterJobMutation();
      }, options.setStatus);
    }

    async function retryFailedJobs() {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa retry OCR.", true);
        return;
      }
      await buttonAction(options.retryFailedButton, "Antre ulang...", async function () {
        var result = await options.postDashboardAction({ action: "retry_failed_ocr_jobs", limit: 100 });
        options.setStatus("Job OCR gagal dikembalikan ke antrean: " + Number(result.retried || 0).toLocaleString("id-ID") + " job. Klik Jalankan batch untuk memprosesnya.", false);
        await refreshAfterJobMutation();
      }, options.setStatus);
    }

    async function retryBatch(batchId, button) {
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa retry batch OCR.", true);
        return;
      }
      await buttonAction(button, "Retry...", async function () {
        var scheduler = firstActiveScheduler();
        var result = await options.postDashboardAction({
          action: "retry_ocr_batch_run",
          batch_id: batchId,
          scheduler_provider_key: scheduler ? scheduler.provider_key : "upstash_qstash"
        });
        var reset = Number(result.reset_retryable_jobs || result.reset_failed_jobs || 0);
        var message = (reset ? reset.toLocaleString("id-ID") + " job gagal/berjalan dikembalikan ke antrean. " : "") +
          (result.scheduler && result.scheduler.message ? result.scheduler.message : "Batch dijadwalkan ulang.");
        options.setStatus(message, !(result.scheduler && result.scheduler.triggered));
        await refreshAfterJobMutation();
      }, options.setStatus);
    }

    async function refreshAfterJobMutation() {
      await options.reloadDashboard();
      if (state.jobFilterStatus) {
        var offset = state.jobFilterMeta ? Number(state.jobFilterMeta.offset || 0) : 0;
        await searchOcrJobs(state.jobFilterStatus, offset);
      }
    }

    function findProvider(key) {
      return state.providers.find(function (provider) { return provider.provider_key === key; }) || null;
    }

    function findScheduler(key) {
      return state.schedulers.find(function (provider) { return provider.provider_key === key; }) || null;
    }

    function countActiveProviders(providers) {
      var now = Date.now();
      return (providers || []).filter(function (provider) {
        var cooldownUntil = provider && provider.cooldown_until ? Date.parse(provider.cooldown_until) : 0;
        var cooldownActive = provider && provider.health_status === "cooldown" && cooldownUntil && cooldownUntil > now;
        return provider && provider.is_enabled && provider.has_api_key && !cooldownActive;
      }).length;
    }

    function countActiveSchedulers(providers) {
      return typeof schedulerHelpers.countActive === "function"
        ? schedulerHelpers.countActive(providers)
        : (providers || []).filter(function (provider) { return provider && provider.is_enabled && provider.has_api_key; }).length;
    }

    function firstActiveScheduler() {
      return typeof schedulerHelpers.firstActive === "function"
        ? schedulerHelpers.firstActive(state.schedulers)
        : (state.schedulers || []).find(function (provider) { return provider && provider.is_enabled && provider.has_api_key; }) || null;
    }

    function renderSchedulerSelect() {
      providerRenderers.renderSchedulerSelect(options.schedulerSelect, state.schedulers);
    }

    function fillSchedulerForm(provider) {
      if (!options.schedulerForm || !provider) return;
      state.fillingScheduler = true;
      providerRenderers.fillSchedulerForm(options.schedulerForm, provider, setSchedulerStatus);
      state.fillingScheduler = false;
    }

    function setJobButtonsDisabled(disabled) {
      if (options.dryRunButton) options.dryRunButton.disabled = Boolean(disabled);
      if (options.enqueueButton) options.enqueueButton.disabled = Boolean(disabled);
      if (options.runButton) options.runButton.disabled = Boolean(disabled);
      if (options.retryFailedButton) options.retryFailedButton.disabled = Boolean(disabled);
    }

    function setInlineStatus(message) {
      if (options.status) options.status.textContent = message || "";
    }

    function setSchedulerStatus(message) {
      if (options.schedulerStatus) options.schedulerStatus.textContent = message || "";
    }

    return { bind: bind, render: render };
  }

  function fieldLabel(name) {
    return {
      outlet_type: "Tipe outlet",
      location_requirement: "Kebutuhan lokasi",
      total_investment_idr: "Total investasi",
      fee_license_idr: "Franchise fee",
      estimated_bep_months: "Estimasi BEP",
      royalty_percent: "Royalti",
      net_profit_percent: "Estimasi laba bersih",
      support_system: "Dukungan franchisor"
    }[name] || name;
  }

  function statusLabel(value) {
    return {
      extracted: "Berhasil dibaca",
      needs_ocr: "Perlu OCR",
      failed: "Gagal",
      unqueued: "Belum antre",
      pending: "Pending",
      running: "Running",
      succeeded: "Sukses",
      needs_review: "Perlu cek",
      all: "Semua job"
    }[value] || value || "Status tidak diketahui";
  }

  function buildProviderErrorText(provider) {
    return [
      "OCR provider error",
      "Provider: " + (provider.display_name || "-") + " (" + (provider.provider_key || "-") + ")",
      "Status: " + (provider.health_status || "-"),
      "Aktif: " + (provider.is_enabled ? "ya" : "tidak"),
      "Credential: " + (provider.has_api_key ? "api key tersimpan" : "api key belum ada"),
      "Terakhir dicek: " + (provider.last_checked_at || "-"),
      "Error: " + (provider.last_error || "-")
    ].join("\n");
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
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

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value || "").replace(/["\\]/g, "\\$&");
  }

  function refreshTooltips() {
    if (window.FranchiseTooltip && typeof window.FranchiseTooltip.refresh === "function") {
      window.FranchiseTooltip.refresh();
    }
  }

  async function buttonAction(button, workingLabel, callback, setStatus) {
    var original = button ? button.innerHTML : "";
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>' + utils.escapeHtml(workingLabel) + '</span>';
    }
    try {
      await callback();
    } catch (error) {
      if (setStatus) setStatus(error.message || "Aksi OCR gagal.", true);
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  }

  window.FranchiseDashboardOcr = { createOperations: createOperations };
}());
