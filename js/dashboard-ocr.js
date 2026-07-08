(function () {
  var utils = window.FranchiseDashboardUtils;
  if (!utils) throw new Error("Dashboard utilities belum tersedia.");

  var metadataPayload = window.FranchiseOcrProviderMetadata || {};
  var PROVIDER_FIELDS = metadataPayload.providers || {};
  var FIELD_NAMES = metadataPayload.field_names || ["api_key", "api_secret", "account_id", "endpoint_url", "region", "model", "clear_api_key", "clear_api_secret"];
  var SCHEDULER_META = {
    upstash_qstash: {
      fields: ["api_key", "request_url", "clear_api_key"],
      token_label: "QSTASH_TOKEN",
      help: "Upstash QStash otomatis menjadwalkan panggilan berikutnya sampai batch selesai."
    },
    cron_job_org: {
      fields: ["api_key", "request_url", "schedule_cron", "clear_api_key"],
      token_label: "cron-job.org API key",
      help: "Gunakan untuk mengelola trigger eksternal yang memanggil worker secara berkala."
    },
    inngest: {
      fields: ["api_key", "request_url", "clear_api_key"],
      token_label: "Inngest signing/API key",
      help: "Opsi workflow eksternal; saat ini dipakai sebagai konfigurasi trigger manual."
    },
    trigger_dev: {
      fields: ["api_key", "request_url", "clear_api_key"],
      token_label: "Trigger.dev access token",
      help: "Opsi workflow eksternal; saat ini dipakai sebagai konfigurasi trigger manual."
    }
  };

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
      savingScheduler: false
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
      if (options.resultRows) options.resultRows.addEventListener("click", handleResultClick);
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
      renderList(payload);
      renderJobs(jobsPayload);
      renderResults(jobsPayload);
      renderBatches(jobsPayload);
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
    }

    function handleResultClick(event) {
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
        return '<li class="dash-ocr-batch-item is-' + utils.escapeAttr(batch.status || "queued") + '">' +
          '<div class="dash-ocr-batch-head"><strong><i class="fas fa-layer-group" aria-hidden="true"></i> Batch ' + utils.escapeHtml(batch.id || "-") + '</strong>' + renderJobStatus(batch.status) + '</div>' +
          '<div class="dash-ocr-progress"><span style="width:' + Math.max(0, Math.min(progress, 100)) + '%"></span></div>' +
          '<span>' + utils.escapeHtml(meta.join(" · ")) + '</span>' +
          (batch.last_message ? '<small>' + utils.escapeHtml(batch.last_message) + '</small>' : '') +
          '</li>';
      }).join("") : '<li><span>Belum ada batch OCR besar. Klik Jalankan 100 setelah provider OCR dan scheduler siap.</span></li>';
    }

    function renderJobStatus(status) {
      var map = {
        succeeded: ["fa-check-circle", "success", "Sukses"],
        failed: ["fa-times-circle", "failed", "Gagal"],
        needs_review: ["fa-eye", "review", "Perlu cek"],
        pending: ["fa-clock", "pending", "Pending"],
        running: ["fa-spinner fa-spin", "running", "Running"]
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
      options.resultRows.innerHTML = results.length ? results.map(function (item) {
        var page = item.page_number ? "Halaman " + Number(item.page_number).toLocaleString("id-ID") : "Halaman proposal";
        var fields = (item.candidate_fields || []).length
          ? "Kandidat data: " + item.candidate_fields.map(fieldLabel).join(", ")
          : "Belum ada kandidat field baru dari teks ini.";
        var listingLink = item.slug
          ? '<a href="/peluang-usaha/' + utils.escapeAttr(item.slug) + '" target="_blank" rel="noopener"><i class="fas fa-external-link-alt" aria-hidden="true"></i><span>Lihat listing</span></a>'
          : "";
        var assetLink = item.source_url
          ? '<a href="' + utils.escapeAttr(item.source_url) + '" target="_blank" rel="noopener"><i class="fas fa-image" aria-hidden="true"></i><span>Buka halaman brosur</span></a>'
          : "";
        var reviewLink = '<a href="#review" data-ocr-open-review><i class="fas fa-clipboard-check" aria-hidden="true"></i><span>Buka Review</span></a>';
        return '<li class="dash-ocr-result-item" data-ocr-result-asset-id="' + utils.escapeAttr(item.asset_id || "") + '">' +
          '<strong>' + utils.escapeHtml(item.brand_name || item.franchise_id || "Listing") + '</strong>' +
          '<span>' + utils.escapeHtml([page, statusLabel(item.extraction_status), item.extraction_method || "ocr", Number(item.text_length || 0).toLocaleString("id-ID") + " karakter"].join(" · ")) + '</span>' +
          '<span>' + utils.escapeHtml(fields) + '</span>' +
          '<p>' + utils.escapeHtml(item.source_text_preview || "Tidak ada preview teks.") + '</p>' +
          '<div class="dash-ocr-result-actions">' + listingLink + assetLink + reviewLink + '</div>' +
          '</li>';
      }).join("") : '<li><strong>Belum ada hasil OCR</strong><span>Jalankan Dry run atau batch untuk menghasilkan teks. Setelah sukses, hasilnya muncul di sini.</span></li>';
    }

    function focusResultRow(assetId) {
      if (!assetId || !options.resultRows) {
        options.setStatus("Buka subtab Hasil OCR untuk melihat teks yang berhasil diekstrak.", false);
        return;
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
      await buttonAction(options.runButton, "Menjadwalkan...", async function () {
        var scheduler = state.schedulers.find(function (item) { return item.is_enabled && item.has_api_key; });
        var result = await options.postDashboardAction({
          action: "start_ocr_batch_run",
          target_count: 100,
          scheduler_provider_key: scheduler ? scheduler.provider_key : "upstash_qstash"
        });
        var schedulerMessage = result.scheduler && result.scheduler.message ? " " + result.scheduler.message : "";
        options.setStatus("Batch OCR dibuat: " + Number(result.assigned_count || 0).toLocaleString("id-ID") + " job masuk batch." + schedulerMessage, false);
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

    function findProvider(key) {
      return state.providers.find(function (provider) { return provider.provider_key === key; }) || null;
    }

    function findScheduler(key) {
      return state.schedulers.find(function (provider) { return provider.provider_key === key; }) || null;
    }

    function countActiveProviders(providers) {
      return (providers || []).filter(function (provider) {
        return provider && provider.is_enabled && provider.has_api_key;
      }).length;
    }

    function countActiveSchedulers(providers) {
      return (providers || []).filter(function (provider) {
        return provider && provider.is_enabled && provider.has_api_key;
      }).length;
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
      var meta = SCHEDULER_META[provider.provider_key] || SCHEDULER_META.upstash_qstash;
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
