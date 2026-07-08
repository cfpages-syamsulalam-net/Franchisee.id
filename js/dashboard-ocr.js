(function () {
  var utils = window.FranchiseDashboardUtils;
  if (!utils) throw new Error("Dashboard utilities belum tersedia.");

  var metadataPayload = window.FranchiseOcrProviderMetadata || {};
  var PROVIDER_FIELDS = metadataPayload.providers || {};
  var FIELD_NAMES = metadataPayload.field_names || ["api_key", "api_secret", "account_id", "endpoint_url", "region", "model", "clear_api_key", "clear_api_secret"];
  var schedulerHelpers = window.FranchiseDashboardOcrSchedulers || {};

  function createOperations(options) {
    options = options || {};
    var state = {
      providers: [],
      schedulers: [],
      adminOnly: true,
      schedulerAdminOnly: true,
      activeProviderCount: 0,
      activeSchedulerCount: 0,
      filling: false,
      fillingScheduler: false,
      autosaveTimer: null,
      schedulerAutosaveTimer: null,
      saving: false,
      savingScheduler: false,
      lastJobsPayload: null,
      resultPageByFranchise: {},
      resultSearchActive: false,
      resultSearchResults: [],
      resultSearchMeta: null,
      resultSearchLoading: false,
      pollTimer: null,
      polling: false
    };

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
        setFormDisabled(true);
        setJobButtonsDisabled(true);
        setInlineStatus("Hanya admin yang dapat melihat dan mengubah konfigurasi OCR.");
        renderProviderMeta(null);
        renderCredentialSummary(null);
        return;
      }
      setFormDisabled(false);
      setJobButtonsDisabled(Boolean(jobsPayload.migration_required) || state.activeProviderCount === 0);
      var selectedKey = options.providerSelect && options.providerSelect.value;
      var selected = findProvider(selectedKey) || state.providers[0] || null;
      if (selected && options.providerSelect) options.providerSelect.value = selected.provider_key;
      fillForm(selected);
      if (state.schedulerAdminOnly || schedulerPayload.migration_required) {
        setSchedulerFormDisabled(true);
        setSchedulerStatus(schedulerPayload.migration_required ? "Migration scheduler OCR belum siap." : "Hanya admin yang dapat mengubah scheduler OCR.");
      } else {
        setSchedulerFormDisabled(false);
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
      options.setStatus("Memuat ulang status batch OCR...", false);
      await options.reloadDashboard();
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
      if (payload.migration_required) {
        options.providerList.innerHTML = '<li><strong>Konfigurasi belum siap</strong><span>Jalankan migration OCR terlebih dahulu.</span></li>';
        return;
      }
      if (state.adminOnly) {
        options.providerList.innerHTML = '<li><strong>Akses admin</strong><span>Login sebagai admin untuk mengelola credential OCR.</span></li>';
        return;
      }
      options.providerList.innerHTML = state.providers.length ? state.providers.map(function (provider) {
        var configured = provider.has_api_key ? "Key tersimpan" : "Belum ada key";
        var quota = provider.free_quota_limit
          ? Number(provider.free_quota_limit).toLocaleString("id-ID") + " " + utils.escapeHtml(provider.quota_unit || "request") + " / " + quotaPeriodLabel(provider.free_quota_period)
          : "Limit mengikuti akun provider";
        var rowClass = provider.is_enabled ? "" : ' class="is-muted"';
        var providerError = renderProviderError(provider);
        return '<li' + rowClass + '><div class="dash-ocr-provider-row"><div><strong>#' + Number(provider.priority || 100) + ' · ' + utils.escapeHtml(provider.display_name) + '</strong><span>' +
          utils.escapeHtml(configured + " · " + (provider.is_enabled ? "Aktif" : "Nonaktif") + " · " + provider.health_status) +
          '<br>' + quota + '</span></div>' + renderProviderToggle(provider) + '</div>' + providerError + '</li>';
      }).join("") : '<li><span>Belum ada provider OCR.</span></li>';
    }

    function renderProviderToggle(provider) {
      var canEnable = Boolean(provider.has_api_key);
      var disabled = !provider.is_enabled && !canEnable;
      var label = provider.is_enabled ? "Nonaktifkan" : "Aktifkan";
      var icon = provider.is_enabled ? "fa-check" : "fa-power-off";
      var tooltip = provider.is_enabled
        ? "Nonaktifkan provider OCR ini. Credential tetap tersimpan."
        : (canEnable ? "Aktifkan provider OCR ini untuk dipakai oleh dry run dan batch." : "Isi credential provider dulu sebelum mengaktifkan.");
      return '<button type="button" class="dash-icon-button dash-ocr-provider-toggle' + (provider.is_enabled ? ' is-active' : '') + '" data-ocr-toggle-provider="' + utils.escapeAttr(provider.provider_key) + '" data-fr-tooltip="' + utils.escapeAttr(tooltip) + '"' + (disabled ? " disabled" : "") + '>' +
        '<i class="fas ' + icon + '" aria-hidden="true"></i><span>' + label + '</span></button>';
    }

    function renderProviderError(provider) {
      if (!provider || !provider.last_error) return "";
      return '<div class="dash-ocr-provider-error">' +
        '<div><strong>Error terakhir provider</strong><code>' + utils.escapeHtml(provider.last_error) + '</code></div>' +
        '<button type="button" class="dash-icon-button dash-ocr-copy-error" data-ocr-copy-provider-error="' + utils.escapeAttr(provider.provider_key) + '" data-fr-tooltip="Copy detail error provider untuk troubleshooting">' +
        '<i class="fas fa-copy" aria-hidden="true"></i><span>Copy error</span></button>' +
        '</div>';
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
          var statusParts = [
            "Belum antre: " + Number(payload.enqueue_candidates || 0).toLocaleString("id-ID"),
            "Pending: " + Number(counts.pending || 0).toLocaleString("id-ID"),
            "Running: " + Number(counts.running || 0).toLocaleString("id-ID"),
            "Sukses: " + Number(counts.succeeded || 0).toLocaleString("id-ID"),
            "Perlu cek: " + Number(counts.needs_review || 0).toLocaleString("id-ID"),
            "Gagal: " + Number(counts.failed || 0).toLocaleString("id-ID")
          ];
          if (state.activeProviderCount === 0) statusParts.push("Provider aktif: 0 — aktifkan provider OCR dulu.");
          if (state.activeSchedulerCount === 0) statusParts.push("Scheduler aktif: 0 — batch 100 perlu dijalankan manual per chunk.");
          options.jobStatus.textContent = statusParts.join(" · ");
        }
      }
      if (!options.jobRows) return;
      if (payload.migration_required) {
        options.jobRows.innerHTML = '<li><strong>Queue belum aktif</strong><span>Migration OCR job queue perlu dijalankan sebelum batch OCR dipakai.</span></li>';
        return;
      }
      var recent = payload.recent || [];
      options.jobRows.innerHTML = recent.length ? recent.map(function (job) {
        var brand = job.brand_name || job.franchise_id || "Listing";
        var page = job.page_number ? "Hal. " + Number(job.page_number).toLocaleString("id-ID") : "Hal. proposal";
        var provider = job.provider_key || "belum ada provider";
        var link = job.slug ? renderJobActionLink("/peluang-usaha/" + job.slug, "fa-external-link-alt", "Listing", "Buka listing publik", true) : "";
        var imageLink = job.source_url ? renderJobActionLink(job.source_url, "fa-image", "Gambar", "Buka gambar halaman brosur yang dikirim ke OCR.", true) : "";
        var resultLink = job.status === "succeeded"
          ? renderJobResultAction(job.asset_id)
          : "";
        var canRetry = job.status === "failed" || job.status === "needs_review";
        var retryButton = canRetry
          ? renderJobActionButton("data-ocr-retry-job", job.id, "fa-play", "OCR", state.activeProviderCount ? "Coba OCR ulang sekarang untuk job ini." : "Aktifkan provider OCR dulu sebelum menjalankan ulang job ini.", state.activeProviderCount === 0)
          : "";
        var noTextButton = job.status === "failed"
          ? renderJobActionButton("data-ocr-mark-no-text", job.id, "fa-ban", "Tanpa teks", "Tandai halaman ini sebagai gambar tanpa teks cukup setelah admin membuka dan mengecek gambarnya.", false)
          : "";
        return '<li class="dash-ocr-job-item is-' + utils.escapeAttr(job.status || "unknown") + '">' +
          '<div class="dash-ocr-job-main">' +
          '<div class="dash-ocr-job-head"><strong>' + utils.escapeHtml(brand) + '</strong>' + renderJobStatus(job.status) + '</div>' +
          '<div class="dash-ocr-job-meta">' +
          '<span><i class="fas fa-file-image" aria-hidden="true"></i>' + utils.escapeHtml(page) + '</span>' +
          '<span><i class="fas fa-plug" aria-hidden="true"></i>' + utils.escapeHtml(provider) + '</span>' +
          '<span><i class="fas fa-redo-alt" aria-hidden="true"></i>' + Number(job.attempt_count || 0).toLocaleString("id-ID") + 'x</span>' +
          '</div>' +
          (job.error_message ? '<div class="dash-ocr-job-error"><i class="fas fa-times-circle" aria-hidden="true"></i><span>' + utils.escapeHtml(job.error_message) + '</span></div>' : '') +
          '</div>' +
          '<div class="dash-ocr-job-actions">' + imageLink + link + resultLink + retryButton + noTextButton + '</div>' +
          '</li>';
      }).join("") : '<li><span>Belum ada job OCR. Antrekan proposal gambar terlebih dahulu.</span></li>';
    }

    function renderBatches(payload) {
      if (!options.batchRows) return;
      payload = payload || {};
      var batches = payload.batches || [];
      options.batchRows.innerHTML = batches.length ? batches.map(function (batch) {
        var progress = Number(batch.assigned_count || 0)
          ? Math.round((Number(batch.processed_count || 0) / Number(batch.assigned_count || 1)) * 100)
          : 0;
        var meta = [
          Number(batch.processed_count || 0).toLocaleString("id-ID") + "/" + Number(batch.assigned_count || 0).toLocaleString("id-ID") + " diproses",
          "Sukses " + Number(batch.succeeded_count || 0).toLocaleString("id-ID"),
          "Perlu cek " + Number(batch.needs_review_count || 0).toLocaleString("id-ID"),
          "Gagal " + Number(batch.failed_count || 0).toLocaleString("id-ID"),
          batch.scheduler_provider_key ? "Scheduler " + batch.scheduler_provider_key : "Manual"
        ];
        var done = ["completed", "cancelled"].indexOf(batch.status) !== -1;
        var retryButton = !done
          ? '<button type="button" class="dash-ocr-row-action" data-ocr-retry-batch="' + utils.escapeAttr(batch.id || "") + '" data-fr-tooltip="Coba jadwalkan ulang batch ini lewat scheduler aktif. Jika error token muncul lagi, ganti QSTASH_TOKEN di Pengaturan."><i class="fas fa-redo-alt" aria-hidden="true"></i><span>Retry</span></button>'
          : "";
        var refreshButton = '<button type="button" class="dash-ocr-row-action" data-ocr-refresh-batches data-fr-tooltip="Muat ulang status batch OCR dari server."><i class="fas fa-sync-alt" aria-hidden="true"></i><span>Refresh</span></button>';
        return '<li class="dash-ocr-batch-item is-' + utils.escapeAttr(batch.status || "queued") + '">' +
          '<div class="dash-ocr-batch-head"><strong><i class="fas fa-layer-group" aria-hidden="true"></i> Batch ' + utils.escapeHtml(batch.id || "-") + '</strong>' + renderJobStatus(batch.status) + '</div>' +
          '<div class="dash-ocr-progress"><span style="width:' + Math.max(0, Math.min(progress, 100)) + '%"></span></div>' +
          '<span>' + utils.escapeHtml(meta.join(" · ")) + '</span>' +
          (batch.last_message ? '<small>' + utils.escapeHtml(batch.last_message) + '</small>' : '') +
          '<div class="dash-ocr-batch-actions">' + retryButton + refreshButton + '</div>' +
          '</li>';
      }).join("") : '<li><span>Belum ada batch OCR besar. Klik Jalankan 100 setelah provider OCR dan scheduler siap.</span></li>';
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
      var groups = groupResultsByFranchise(results);
      options.resultRows.innerHTML = groups.length
        ? groups.map(renderResultGroup).join("")
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
      var groups = groupResultsByFranchise(sourceResults);
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
        groups = groupResultsByFranchise((state.lastJobsPayload && state.lastJobsPayload.results) || []);
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

    function groupResultsByFranchise(results) {
      var map = {};
      (results || []).forEach(function (item) {
        var key = resultGroupKey(item);
        if (!map[key]) {
          map[key] = {
            key: key,
            brandName: item.brand_name || item.franchise_id || "Listing",
            franchiseId: item.franchise_id || "",
            slug: item.slug || "",
            items: []
          };
        }
        if (!map[key].slug && item.slug) map[key].slug = item.slug;
        map[key].items.push(item);
      });
      return Object.keys(map).map(function (key) {
        map[key].items.sort(function (a, b) {
          return Number(a.page_number || 0) - Number(b.page_number || 0) || String(a.updated_at || "").localeCompare(String(b.updated_at || ""));
        });
        return map[key];
      });
    }

    function renderResultGroup(group) {
      var activeIndex = clampResultPage(group.key, group.items.length);
      var item = group.items[activeIndex] || group.items[0] || {};
      var extracted = group.items.filter(function (row) { return row.extraction_status === "extracted"; }).length;
      var needsCheck = group.items.filter(function (row) { return row.extraction_status !== "extracted"; }).length;
      var listingLink = group.slug
        ? '<a class="dash-ocr-row-action" href="/peluang-usaha/' + utils.escapeAttr(group.slug) + '" target="_blank" rel="noopener" data-fr-tooltip="Buka listing publik franchise ini."><i class="fas fa-external-link-alt" aria-hidden="true"></i><span>Listing</span></a>'
        : "";
      return '<li class="dash-ocr-result-card" data-ocr-result-group="' + utils.escapeAttr(group.key) + '">' +
        '<div class="dash-ocr-result-card-head">' +
          '<div><strong><i class="fas fa-store" aria-hidden="true"></i> ' + utils.escapeHtml(group.brandName) + '</strong>' +
          '<span>' + utils.escapeHtml(group.items.length.toLocaleString("id-ID") + " halaman · " + extracted.toLocaleString("id-ID") + " berhasil" + (needsCheck ? " · " + needsCheck.toLocaleString("id-ID") + " perlu cek" : "")) + '</span></div>' +
          '<div class="dash-ocr-result-actions">' + listingLink + '</div>' +
        '</div>' +
        renderResultPager(group, activeIndex) +
        renderResultPageBody(group, item, activeIndex) +
        '</li>';
    }

    function renderResultPager(group, activeIndex) {
      if (group.items.length <= 1) {
        return '<div class="dash-ocr-result-pager is-single"><span><i class="fas fa-file-alt" aria-hidden="true"></i> ' + utils.escapeHtml(resultPageTitle(group.items[0] || {}, 0)) + '</span></div>';
      }
      var buttons = group.items.map(function (item, index) {
        var active = index === activeIndex;
        var label = item.page_number ? Number(item.page_number).toLocaleString("id-ID") : String(index + 1);
        return '<button type="button" class="dash-ocr-page-button' + (active ? ' is-active' : '') + '" data-ocr-result-page="' + utils.escapeAttr(group.key) + '" data-ocr-result-page-index="' + index + '" data-fr-tooltip="' + utils.escapeAttr("Baca hasil OCR " + resultPageTitle(item, index)) + '">' +
          '<i class="fas ' + resultStatusIcon(item.extraction_status) + '" aria-hidden="true"></i><span>' + utils.escapeHtml(label) + '</span></button>';
      }).join("");
      return '<div class="dash-ocr-result-pager">' +
        '<button type="button" class="dash-ocr-page-nav" data-ocr-result-prev="' + utils.escapeAttr(group.key) + '"' + (activeIndex <= 0 ? " disabled" : "") + ' data-fr-tooltip="Halaman sebelumnya"><i class="fas fa-chevron-left" aria-hidden="true"></i><span>Prev</span></button>' +
        '<div class="dash-ocr-page-strip" aria-label="Halaman hasil OCR">' + buttons + '</div>' +
        '<button type="button" class="dash-ocr-page-nav" data-ocr-result-next="' + utils.escapeAttr(group.key) + '"' + (activeIndex >= group.items.length - 1 ? " disabled" : "") + ' data-fr-tooltip="Halaman berikutnya"><span>Next</span><i class="fas fa-chevron-right" aria-hidden="true"></i></button>' +
        '</div>';
    }

    function renderResultPageBody(group, item, activeIndex) {
      var page = resultPageTitle(item, activeIndex);
      var fields = (item.candidate_fields || []).length
        ? item.candidate_fields.map(fieldLabel).join(", ")
        : "Belum ada kandidat field baru dari teks ini.";
      var assetLink = item.source_url
        ? '<a href="' + utils.escapeAttr(item.source_url) + '" target="_blank" rel="noopener" data-fr-tooltip="Buka gambar brosur yang dikirim ke OCR."><i class="fas fa-image" aria-hidden="true"></i><span>Gambar</span></a>'
        : "";
      var reviewLink = '<a href="#review" data-ocr-open-review data-fr-tooltip="Buka tab Review untuk meninjau kandidat data."><i class="fas fa-clipboard-check" aria-hidden="true"></i><span>Review</span></a>';
      return '<div class="dash-ocr-result-item dash-ocr-result-page-body is-' + utils.escapeAttr(extractionStatusClass(item.extraction_status)) + '" data-ocr-result-asset-id="' + utils.escapeAttr(item.asset_id || "") + '">' +
        '<div class="dash-ocr-result-meta">' +
          '<span><i class="fas fa-file-alt" aria-hidden="true"></i> ' + utils.escapeHtml(page) + '</span>' +
          '<span><i class="fas ' + resultStatusIcon(item.extraction_status) + '" aria-hidden="true"></i> ' + utils.escapeHtml(statusLabel(item.extraction_status)) + '</span>' +
          '<span><i class="fas fa-robot" aria-hidden="true"></i> ' + utils.escapeHtml(item.extraction_method || "ocr") + '</span>' +
          '<span><i class="fas fa-align-left" aria-hidden="true"></i> ' + utils.escapeHtml(Number(item.text_length || 0).toLocaleString("id-ID") + " karakter") + '</span>' +
        '</div>' +
        '<span class="dash-ocr-result-fields"><i class="fas fa-tags" aria-hidden="true"></i> ' + utils.escapeHtml(fields) + '</span>' +
        '<p class="dash-ocr-result-text">' + utils.escapeHtml(item.source_text_preview || "Tidak ada preview teks.") + '</p>' +
        '<div class="dash-ocr-result-actions">' + assetLink + reviewLink + '</div>' +
        '</div>';
    }

    function resultGroupKey(item) {
      return item.franchise_id || item.slug || item.brand_name || "unknown";
    }

    function resultPageTitle(item, fallbackIndex) {
      return item && item.page_number ? "Halaman " + Number(item.page_number).toLocaleString("id-ID") : "Halaman " + (Number(fallbackIndex || 0) + 1).toLocaleString("id-ID");
    }

    function setResultGroupPage(groupKey, pageIndex) {
      state.resultPageByFranchise[groupKey] = Math.max(0, Number(pageIndex || 0));
      renderResults(state.lastJobsPayload || {});
      refreshTooltips();
    }

    function moveResultGroupPage(groupKey, delta) {
      var groups = groupResultsByFranchise((state.lastJobsPayload && state.lastJobsPayload.results) || []);
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

    function resultStatusIcon(status) {
      return status === "extracted" ? "fa-check-circle" : status === "failed" ? "fa-times-circle" : "fa-exclamation-circle";
    }

    function extractionStatusClass(status) {
      return status === "extracted" ? "extracted" : status === "failed" ? "failed" : "review";
    }

    function renderSelect() {
      if (!options.providerSelect) return;
      var current = options.providerSelect.value;
      options.providerSelect.innerHTML = '<option value="">Pilih provider...</option>' + state.providers.map(function (provider) {
        return '<option value="' + utils.escapeAttr(provider.provider_key) + '">' + utils.escapeHtml(provider.display_name) + '</option>';
      }).join("");
      if (state.providers.some(function (provider) { return provider.provider_key === current; })) options.providerSelect.value = current;
    }

    function fillForm(provider) {
      if (!options.form || !provider) return;
      state.filling = true;
      setValue("provider_key", provider.provider_key);
      setValue("api_key", "");
      setValue("api_secret", "");
      setValue("account_id", provider.account_id || "");
      setValue("endpoint_url", provider.endpoint_url || "");
      setValue("region", provider.region || "");
      setValue("model", provider.model || "");
      setValue("priority", provider.priority || 100);
      setChecked("clear_api_key", false);
      setChecked("clear_api_secret", false);
      options.form.classList.toggle("is-provider-disabled", Boolean(provider.has_api_key && !provider.is_enabled));
      renderProviderFields(provider);
      renderProviderMeta(provider);
      renderCredentialSummary(provider);
      setInlineStatus(credentialStatusText(provider));
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
        setFormDisabled(true);
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
        setFormDisabled(false);
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
        setSchedulerFormDisabled(true);
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
        setSchedulerFormDisabled(false);
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
        await options.reloadDashboard();
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
        await options.reloadDashboard();
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
        await options.reloadDashboard();
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
        await options.reloadDashboard();
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
        await options.reloadDashboard();
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
        await options.reloadDashboard();
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
        var reset = Number(result.reset_failed_jobs || 0);
        var message = (reset ? reset.toLocaleString("id-ID") + " job gagal dikembalikan ke antrean. " : "") +
          (result.scheduler && result.scheduler.message ? result.scheduler.message : "Batch dijadwalkan ulang.");
        options.setStatus(message, !(result.scheduler && result.scheduler.triggered));
        await options.reloadDashboard();
      }, options.setStatus);
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
        return provider && provider.is_enabled && provider.has_api_key && provider.health_status !== "cooldown" && (!cooldownUntil || cooldownUntil <= now);
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
      if (!options.schedulerSelect) return;
      var current = options.schedulerSelect.value;
      options.schedulerSelect.innerHTML = '<option value="">Pilih scheduler...</option>' + state.schedulers.map(function (provider) {
        return '<option value="' + utils.escapeAttr(provider.provider_key) + '">' + utils.escapeHtml(provider.display_name) + '</option>';
      }).join("");
      if (state.schedulers.some(function (provider) { return provider.provider_key === current; })) options.schedulerSelect.value = current;
    }

    function fillSchedulerForm(provider) {
      if (!options.schedulerForm || !provider) return;
      state.fillingScheduler = true;
      var meta = typeof schedulerHelpers.providerMeta === "function"
        ? schedulerHelpers.providerMeta(provider.provider_key)
        : { fields: ["api_key", "request_url", "clear_api_key"], token_label: "API key / token", help: "Token provider scheduler." };
      setSchedulerValue("provider_key", provider.provider_key);
      setSchedulerValue("api_key", "");
      setSchedulerValue("api_secret", "");
      setSchedulerValue("request_url", provider.request_url || "https://franchisee.id/ocr-worker");
      setSchedulerValue("schedule_cron", provider.schedule_cron || "");
      setSchedulerChecked("clear_api_key", false);
      ["api_key", "api_secret", "request_url", "schedule_cron", "clear_api_key"].forEach(function (name) {
        var row = options.schedulerForm.querySelector('[data-ocr-scheduler-field="' + name + '"]');
        if (row) row.hidden = (meta.fields || []).indexOf(name) === -1 || (name === "clear_api_key" && !provider.has_api_key);
      });
      var label = options.schedulerForm.querySelector('[data-ocr-scheduler-label="api_key"]');
      if (label) label.textContent = meta.token_label || "API key / token";
      var help = options.schedulerForm.querySelector('[data-ocr-scheduler-help="api_key"]');
      if (help) help.textContent = meta.help || "Token provider scheduler.";
      renderSchedulerCredentialBadge("api_key", provider.has_api_key);
      var summary = options.schedulerForm.querySelector("[data-ocr-scheduler-summary]");
      if (summary) {
        summary.innerHTML = '<strong>' + utils.escapeHtml(provider.display_name) + '</strong><br><span>' +
          utils.escapeHtml((provider.has_api_key ? "Token sudah tersimpan." : "Token belum tersimpan.") + " Status: " + (provider.is_enabled ? "aktif" : "nonaktif") + ". " + (provider.last_error ? "Error: " + provider.last_error : "")) +
          '</span>';
      }
      setSchedulerStatus(provider.has_api_key ? "Token scheduler sudah tersimpan. Mengisi token baru akan mengganti nilai lama." : "Isi token scheduler agar batch 100 bisa berjalan otomatis.");
      state.fillingScheduler = false;
    }

    function renderSchedulerCredentialBadge(name, hasValue) {
      var badge = options.schedulerForm && options.schedulerForm.querySelector('[data-ocr-scheduler-key-state="' + name + '"]');
      if (!badge) return;
      badge.className = "dash-credential-badge" + (hasValue ? " is-set" : " is-empty");
      badge.innerHTML = hasValue
        ? '<i class="fas fa-check" aria-hidden="true"></i><span>Tersimpan</span>'
        : '<span>Belum ada</span>';
    }

    function setSchedulerValue(name, value) {
      var input = options.schedulerForm && options.schedulerForm.elements.namedItem(name);
      if (input) input.value = value == null ? "" : String(value);
    }

    function setSchedulerChecked(name, checked) {
      var input = options.schedulerForm && options.schedulerForm.elements.namedItem(name);
      if (input) input.checked = Boolean(checked);
    }

    function setSchedulerFormDisabled(disabled) {
      if (!options.schedulerForm) return;
      Array.from(options.schedulerForm.elements).forEach(function (input) { input.disabled = Boolean(disabled); });
    }

    function providerConfig(provider) {
      return PROVIDER_FIELDS[provider && provider.provider_key] || { fields: ["api_key"], labels: {}, help: {} };
    }

    function renderProviderFields(provider) {
      if (!options.form || !provider) return;
      var config = providerConfig(provider);
      var active = config.fields || [];
      FIELD_NAMES.forEach(function (name) {
        var row = options.form.querySelector('[data-ocr-field="' + name + '"]');
        if (!row) return;
        var visible = active.indexOf(name) !== -1;
        if (name === "clear_api_key") visible = active.indexOf("api_key") !== -1 && Boolean(provider.has_api_key);
        if (name === "clear_api_secret") visible = active.indexOf("api_secret") !== -1 && Boolean(provider.has_api_secret);
        row.hidden = !visible;
      });
      Object.keys(config.labels || {}).forEach(function (name) {
        var label = options.form.querySelector('[data-ocr-label="' + name + '"]');
        if (label) label.textContent = config.labels[name];
      });
      Object.keys(config.help || {}).forEach(function (name) {
        var help = options.form.querySelector('[data-ocr-help="' + name + '"]');
        if (help) help.textContent = config.help[name];
      });
      renderCredentialBadge("api_key", provider.has_api_key);
      renderCredentialBadge("api_secret", provider.has_api_secret);
    }

    function renderCredentialBadge(name, hasValue) {
      var badge = options.form && options.form.querySelector('[data-ocr-key-state="' + name + '"]');
      if (!badge) return;
      badge.className = "dash-credential-badge" + (hasValue ? " is-set" : " is-empty");
      badge.innerHTML = hasValue
        ? '<i class="fas fa-check" aria-hidden="true"></i><span>Tersimpan</span>'
        : '<span>Belum ada</span>';
    }

    function renderProviderMeta(provider) {
      var target = options.form && options.form.querySelector("[data-ocr-provider-meta]");
      if (!target) return;
      if (!provider) {
        target.textContent = "Pilih provider untuk melihat kebutuhan credential dan limit gratisnya.";
        return;
      }
      var parts = [
        ["Limit gratis", quotaLabel(provider)],
        ["Dipakai", Number(provider.quota_used || 0).toLocaleString("id-ID") + " " + utils.escapeHtml(provider.quota_unit || "request")],
        ["Reset", provider.quota_reset_at ? formatDate(provider.quota_reset_at) : "Mengikuti provider"],
        ["Rate limit lokal", rateLimitLabel(provider)],
        ["Cooldown", provider.cooldown_until ? formatDateTime(provider.cooldown_until) : "Tidak aktif"],
        ["Trial", provider.trial_ends_at ? "Berakhir " + formatDate(provider.trial_ends_at) : "Tidak ada tanggal di sistem"],
        ["Endpoint", provider.endpoint_url || "Default provider"],
      ];
      target.innerHTML = parts.map(function (item) {
        return '<span><strong>' + utils.escapeHtml(item[0]) + '</strong>' + utils.escapeHtml(item[1]) + '</span>';
      }).join("");
    }

    function renderCredentialSummary(provider) {
      var target = options.form && options.form.querySelector("[data-ocr-credential-summary]");
      if (!target) return;
      if (!provider) {
        target.textContent = "Belum ada provider dipilih.";
        return;
      }
      var config = providerConfig(provider);
      var fields = (config.fields || []).map(function (name) {
        return config.labels && config.labels[name] ? config.labels[name] : fieldFallbackLabel(name);
      });
      target.innerHTML = '<strong>Field yang dibutuhkan:</strong> ' + utils.escapeHtml(fields.join(", ")) +
        '<br><span>' + utils.escapeHtml(credentialStatusText(provider)) + ' Mengisi credential baru akan mengganti nilai lama setelah disimpan.</span>';
    }

    function credentialStatusText(provider) {
      if (!provider) return "Pilih provider untuk melihat status credential.";
      var parts = [];
      parts.push(provider.has_api_key ? "API key/token sudah tersimpan." : "API key/token belum tersimpan.");
      if ((providerConfig(provider).fields || []).indexOf("api_secret") !== -1) {
        parts.push(provider.has_api_secret ? "Secret sudah tersimpan." : "Secret belum tersimpan.");
      }
      return parts.join(" ");
    }

    function setValue(name, value) {
      var input = options.form && options.form.elements.namedItem(name);
      if (input) input.value = value == null ? "" : String(value);
    }

    function setChecked(name, checked) {
      var input = options.form && options.form.elements.namedItem(name);
      if (input) input.checked = Boolean(checked);
    }

    function setFormDisabled(disabled) {
      if (!options.form) return;
      Array.from(options.form.elements).forEach(function (input) { input.disabled = Boolean(disabled); });
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

  function quotaPeriodLabel(value) {
    return {
      daily: "hari",
      monthly: "bulan",
      trial: "trial",
      compute_daily: "hari (compute)",
      account_specific: "akun"
    }[value] || value || "akun";
  }

  function quotaLabel(provider) {
    if (!provider || !provider.free_quota_limit) return "Cek di akun provider";
    return Number(provider.free_quota_limit).toLocaleString("id-ID") + " " + (provider.quota_unit || "request") + " / " + quotaPeriodLabel(provider.free_quota_period);
  }

  function formatDate(value) {
    return String(value || "").slice(0, 10) || "-";
  }

  function formatDateTime(value) {
    return String(value || "").replace("T", " ").slice(0, 16) || "-";
  }

  function rateLimitLabel(provider) {
    var max = Number(provider && provider.rate_limit_max_requests || 0);
    var windowSeconds = Number(provider && provider.rate_limit_window_seconds || 0);
    if (!max || !windowSeconds) return "Belum diatur";
    return max.toLocaleString("id-ID") + " request / " + windowSeconds.toLocaleString("id-ID") + " detik";
  }

  function fieldFallbackLabel(name) {
    return {
      api_key: "API key / token",
      api_secret: "API secret",
      account_id: "Account / project / client ID",
      endpoint_url: "Endpoint HTTPS",
      region: "Region",
      model: "Model / operasi"
    }[name] || name;
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
      pending: "Menunggu"
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
