(function () {
  function createRenderer(deps) {
    deps = deps || {};
    var utils = deps.utils;
    if (!utils) throw new Error("Dashboard OCR provider renderer membutuhkan utils.");
    var providerFields = deps.providerFields || {};
    var fieldNames = deps.fieldNames || [];
    var schedulerHelpers = deps.schedulerHelpers || {};

    function renderProviderList(payload, providers, adminOnly) {
      payload = payload || {};
      if (payload.migration_required) {
        return '<li><strong>Konfigurasi belum siap</strong><span>Jalankan migration OCR terlebih dahulu.</span></li>';
      }
      if (adminOnly) {
        return '<li><strong>Akses admin</strong><span>Login sebagai admin untuk mengelola credential OCR.</span></li>';
      }
      return providers.length ? providers.map(function (provider) {
        var configured = provider.has_api_key ? "Key tersimpan" : "Belum ada key";
        var quota = provider.free_quota_limit
          ? Number(provider.free_quota_limit).toLocaleString("id-ID") + " " + utils.escapeHtml(provider.quota_unit || "request") + " / " + quotaPeriodLabel(provider.free_quota_period)
          : "Limit mengikuti akun provider";
        var remaining = provider.free_quota_limit
          ? "Sisa " + Math.max(0, Number(provider.free_quota_limit || 0) - Number(provider.quota_used || 0)).toLocaleString("id-ID") + " " + utils.escapeHtml(provider.quota_unit || "request")
          : "Sisa kuota dicek di akun provider";
        var rowClass = provider.is_enabled ? "" : ' class="is-muted"';
        var providerError = renderProviderError(provider);
        return '<li' + rowClass + '><div class="dash-ocr-provider-row"><div><strong>#' + Number(provider.priority || 100) + ' · ' + utils.escapeHtml(provider.display_name) + '</strong><span>' +
          utils.escapeHtml(configured + " · " + (provider.is_enabled ? "Aktif" : "Nonaktif") + " · " + providerHealthLabel(provider)) +
          '<br>' + quota + ' · ' + remaining + '</span></div>' + renderProviderToggle(provider) + '</div>' + providerError + '</li>';
      }).join("") : '<li><span>Belum ada provider OCR.</span></li>';
    }

    function renderProviderSelect(select, providers) {
      if (!select) return;
      var current = select.value;
      select.innerHTML = '<option value="">Pilih provider...</option>' + providers.map(function (provider) {
        return '<option value="' + utils.escapeAttr(provider.provider_key) + '">' + utils.escapeHtml(provider.display_name) + '</option>';
      }).join("");
      if (providers.some(function (provider) { return provider.provider_key === current; })) select.value = current;
    }

    function fillProviderForm(form, provider, setStatus) {
      if (!form || !provider) return;
      setValue(form, "provider_key", provider.provider_key);
      setValue(form, "api_key", "");
      setValue(form, "api_secret", "");
      setValue(form, "account_id", provider.account_id || "");
      setValue(form, "endpoint_url", provider.endpoint_url || "");
      setValue(form, "region", provider.region || "");
      setValue(form, "model", provider.model || "");
      setValue(form, "priority", provider.priority || 100);
      setChecked(form, "clear_api_key", false);
      setChecked(form, "clear_api_secret", false);
      form.classList.toggle("is-provider-disabled", Boolean(provider.has_api_key && !provider.is_enabled));
      renderProviderFields(form, provider);
      renderProviderMeta(form, provider);
      renderCredentialSummary(form, provider);
      if (typeof setStatus === "function") setStatus(credentialStatusText(provider));
    }

    function setProviderFormDisabled(form, disabled) {
      if (!form) return;
      Array.from(form.elements).forEach(function (input) { input.disabled = Boolean(disabled); });
    }

    function renderSchedulerSelect(select, schedulers) {
      if (!select) return;
      var current = select.value;
      select.innerHTML = '<option value="">Pilih scheduler...</option>' + schedulers.map(function (provider) {
        return '<option value="' + utils.escapeAttr(provider.provider_key) + '">' + utils.escapeHtml(provider.display_name) + '</option>';
      }).join("");
      if (schedulers.some(function (provider) { return provider.provider_key === current; })) select.value = current;
    }

    function fillSchedulerForm(form, provider, setStatus) {
      if (!form || !provider) return;
      var meta = typeof schedulerHelpers.providerMeta === "function"
        ? schedulerHelpers.providerMeta(provider.provider_key)
        : { fields: ["api_key", "request_url", "clear_api_key"], token_label: "API key / token", help: "Token provider scheduler." };
      setValue(form, "provider_key", provider.provider_key);
      setValue(form, "api_key", "");
      setValue(form, "api_secret", "");
      setValue(form, "request_url", provider.request_url || "https://franchisee.id/ocr-worker");
      setValue(form, "schedule_cron", provider.schedule_cron || "");
      setChecked(form, "clear_api_key", false);
      ["api_key", "api_secret", "request_url", "schedule_cron", "clear_api_key"].forEach(function (name) {
        var row = form.querySelector('[data-ocr-scheduler-field="' + name + '"]');
        if (row) row.hidden = (meta.fields || []).indexOf(name) === -1 || (name === "clear_api_key" && !provider.has_api_key);
      });
      setText(form, "api_key", meta.token_label || "API key / token", "data-ocr-scheduler-label");
      setText(form, "api_secret", meta.secret_label || "API secret", "data-ocr-scheduler-label");
      var help = form.querySelector('[data-ocr-scheduler-help="api_key"]');
      if (help) help.textContent = meta.help || "Token provider scheduler.";
      renderSchedulerCredentialBadge(form, "api_key", provider.has_api_key);
      renderSchedulerCredentialBadge(form, "api_secret", provider.has_api_secret);
      var summary = form.querySelector("[data-ocr-scheduler-summary]");
      if (summary) {
        summary.innerHTML = '<strong>' + utils.escapeHtml(provider.display_name) + '</strong><br><span>' +
          utils.escapeHtml((provider.has_api_key ? "Token sudah tersimpan." : "Token belum tersimpan.") + " Status: " + (provider.is_enabled ? "aktif" : "nonaktif") + ". " + (provider.last_error ? "Error: " + provider.last_error : "")) +
          '</span>';
      }
      if (typeof setStatus === "function") setStatus(provider.has_api_key ? "Token scheduler sudah tersimpan. Mengisi token baru akan mengganti nilai lama." : "Isi token scheduler agar batch 100 bisa berjalan otomatis.");
    }

    function setSchedulerFormDisabled(form, disabled) {
      if (!form) return;
      Array.from(form.elements).forEach(function (input) { input.disabled = Boolean(disabled); });
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

    function providerHealthLabel(provider) {
      if (!provider) return "-";
      var status = provider.health_status || "-";
      if (status === "cooldown") {
        var cooldownUntil = provider.cooldown_until ? Date.parse(provider.cooldown_until) : 0;
        return cooldownUntil && cooldownUntil <= Date.now() ? "Cooldown selesai" : "Cooldown";
      }
      return status;
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

    function providerConfig(provider) {
      return providerFields[provider && provider.provider_key] || { fields: ["api_key"], labels: {}, help: {} };
    }

    function renderProviderFields(form, provider) {
      var config = providerConfig(provider);
      var active = config.fields || ["api_key"];
      fieldNames.forEach(function (name) {
        var row = form.querySelector('[data-ocr-field="' + name + '"]');
        if (!row) return;
        var visible = active.indexOf(name) !== -1;
        if (name === "clear_api_key") visible = active.indexOf("api_key") !== -1 && Boolean(provider.has_api_key);
        if (name === "clear_api_secret") visible = active.indexOf("api_secret") !== -1 && Boolean(provider.has_api_secret);
        row.hidden = !visible;
      });
      Object.keys(config.labels || {}).forEach(function (name) {
        setText(form, name, config.labels[name], "data-ocr-label");
      });
      Object.keys(config.help || {}).forEach(function (name) {
        setText(form, name, config.help[name], "data-ocr-help");
      });
      renderCredentialBadge(form, "api_key", provider.has_api_key);
      renderCredentialBadge(form, "api_secret", provider.has_api_secret);
    }

    function renderCredentialBadge(form, name, hasValue) {
      var badge = form.querySelector('[data-ocr-key-state="' + name + '"]');
      if (!badge) return;
      badge.className = "dash-credential-badge" + (hasValue ? " is-set" : " is-empty");
      badge.innerHTML = hasValue
        ? '<i class="fas fa-check" aria-hidden="true"></i><span>Tersimpan</span>'
        : '<span>Belum ada</span>';
    }

    function renderProviderMeta(form, provider) {
      var target = form.querySelector("[data-ocr-provider-meta]");
      if (!target) return;
      if (!provider) {
        target.textContent = "Pilih provider untuk melihat kebutuhan credential dan limit gratisnya.";
        return;
      }
      var rows = [
        ["Limit resmi", provider.limit_details?.summary || quotaLabel(provider)],
        ["Limit gratis", quotaLabel(provider)],
        ["Dipakai", Number(provider.quota_used || 0).toLocaleString("id-ID") + " " + utils.escapeHtml(provider.quota_unit || "request")],
        ["Sisa", quotaRemainingLabel(provider)],
        ["Reset", provider.quota_reset_at ? formatDate(provider.quota_reset_at) : "Mengikuti provider"],
        ["Rate limit lokal", rateLimitLabel(provider)],
        ["Batas file", provider.limit_details?.file_limit || "Mengikuti provider"],
        ["Cooldown", provider.cooldown_until ? formatDateTime(provider.cooldown_until) : "Tidak aktif"],
        ["Trial", provider.trial_ends_at ? "Berakhir " + formatDate(provider.trial_ends_at) : "Tidak ada tanggal di sistem"],
        ["Endpoint", provider.endpoint_url || "Default provider"],
      ];
      var source = provider.limit_details && provider.limit_details.source_url
        ? '<a href="' + utils.escapeAttr(provider.limit_details.source_url) + '" target="_blank" rel="noopener">' + utils.escapeHtml(provider.limit_details.source_label || "Sumber limit") + '</a>'
        : "";
      target.innerHTML = rows.map(function (row) {
        return '<span><strong>' + utils.escapeHtml(row[0]) + '</strong>' + utils.escapeHtml(row[1]) + '</span>';
      }).join("") + (source ? '<span><strong>Sumber</strong>' + source + '</span>' : "") +
        (provider.limit_details?.note ? '<span><strong>Catatan</strong>' + utils.escapeHtml(provider.limit_details.note) + '</span>' : "");
    }

    function renderCredentialSummary(form, provider) {
      var target = form.querySelector("[data-ocr-credential-summary]");
      if (!target) return;
      if (!provider) {
        target.textContent = "Belum ada provider dipilih.";
        return;
      }
      var config = providerConfig(provider);
      var required = (config.activation_requirements || []).map(fieldFallbackLabel).join(", ") || "API key";
      target.innerHTML = '<strong>' + utils.escapeHtml(provider.display_name) + '</strong><br><span>' +
        utils.escapeHtml("Field yang perlu diisi untuk aktif: " + required + ".") +
        '</span><br><span>' + utils.escapeHtml(credentialStatusText(provider) + ' Mengisi credential baru akan mengganti nilai lama setelah disimpan.') + '</span>';
    }

    function renderSchedulerCredentialBadge(form, name, hasValue) {
      var badge = form.querySelector('[data-ocr-scheduler-key-state="' + name + '"]');
      if (!badge) return;
      badge.className = "dash-credential-badge" + (hasValue ? " is-set" : " is-empty");
      badge.innerHTML = hasValue
        ? '<i class="fas fa-check" aria-hidden="true"></i><span>Tersimpan</span>'
        : '<span>Belum ada</span>';
    }

    function setText(form, name, value, attr) {
      var target = form.querySelector("[" + attr + '="' + name + '"]');
      if (target) target.textContent = value;
    }

    function setValue(form, name, value) {
      var input = form.elements.namedItem(name);
      if (input) input.value = value == null ? "" : value;
    }

    function setChecked(form, name, checked) {
      var input = form.elements.namedItem(name);
      if (input) input.checked = Boolean(checked);
    }

    return {
      renderProviderList: renderProviderList,
      renderProviderSelect: renderProviderSelect,
      fillProviderForm: fillProviderForm,
      setProviderFormDisabled: setProviderFormDisabled,
      renderSchedulerSelect: renderSchedulerSelect,
      fillSchedulerForm: fillSchedulerForm,
      setSchedulerFormDisabled: setSchedulerFormDisabled,
      credentialStatusText: credentialStatusText
    };
  }

  function quotaPeriodLabel(value) {
    return {
      daily: "hari",
      monthly: "bulan",
      trial: "trial",
      compute_daily: "hari komputasi",
      account_specific: "akun"
    }[value] || "akun";
  }

  function quotaLabel(provider) {
    if (!provider || !provider.free_quota_limit) return "Cek di akun provider";
    return Number(provider.free_quota_limit).toLocaleString("id-ID") + " " + (provider.quota_unit || "request") + " / " + quotaPeriodLabel(provider.free_quota_period);
  }

  function quotaRemainingLabel(provider) {
    if (!provider || !provider.free_quota_limit) return "Tidak dihitung lokal; cek dashboard provider";
    return Math.max(0, Number(provider.free_quota_limit || 0) - Number(provider.quota_used || 0)).toLocaleString("id-ID") + " " + (provider.quota_unit || "request");
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function rateLimitLabel(provider) {
    var max = Number(provider && provider.rate_limit_max_requests || 0);
    var windowSeconds = Number(provider && provider.rate_limit_window_seconds || 0);
    if (!max || !windowSeconds) return "Tidak dibatasi lokal";
    return max.toLocaleString("id-ID") + " request / " + windowSeconds.toLocaleString("id-ID") + " detik";
  }

  function fieldFallbackLabel(name) {
    return {
      api_key: "API key",
      api_secret: "API secret",
      account_id: "Account/client ID",
      endpoint_url: "Endpoint",
      region: "Region",
      model: "Model / operasi"
    }[name] || name;
  }

  window.FranchiseDashboardOcrProviders = { createRenderer: createRenderer };
})();
