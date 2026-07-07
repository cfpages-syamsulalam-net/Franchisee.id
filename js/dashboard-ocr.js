(function () {
  var utils = window.FranchiseDashboardUtils;
  if (!utils) throw new Error("Dashboard utilities belum tersedia.");

  var metadataPayload = window.FranchiseOcrProviderMetadata || {};
  var PROVIDER_FIELDS = metadataPayload.providers || {};
  var FIELD_NAMES = metadataPayload.field_names || ["api_key", "api_secret", "account_id", "endpoint_url", "region", "model", "clear_api_key", "clear_api_secret"];

  function createOperations(options) {
    options = options || {};
    var state = { providers: [], adminOnly: true };

    function bind() {
      if (options.providerSelect) {
        options.providerSelect.addEventListener("change", function () {
          fillForm(findProvider(options.providerSelect.value));
        });
      }
      if (options.form) options.form.addEventListener("submit", submit);
    }

    function render(payload) {
      payload = payload || {};
      state.providers = payload.providers || [];
      state.adminOnly = Boolean(payload.admin_only);
      renderList(payload);
      renderSelect();
      if (state.adminOnly) {
        setFormDisabled(true);
        setInlineStatus("Hanya admin yang dapat melihat dan mengubah konfigurasi OCR.");
        renderProviderMeta(null);
        renderCredentialSummary(null);
        return;
      }
      setFormDisabled(false);
      var selectedKey = options.providerSelect && options.providerSelect.value;
      var selected = findProvider(selectedKey) || state.providers[0] || null;
      if (selected && options.providerSelect) options.providerSelect.value = selected.provider_key;
      fillForm(selected);
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
        return '<li><strong>#' + Number(provider.priority || 100) + ' · ' + utils.escapeHtml(provider.display_name) + '</strong><span>' +
          utils.escapeHtml(configured + " · " + (provider.is_enabled ? "Aktif" : "Nonaktif") + " · " + provider.health_status) +
          '<br>' + quota + '</span></li>';
      }).join("") : '<li><span>Belum ada provider OCR.</span></li>';
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
      setValue("provider_key", provider.provider_key);
      setValue("api_key", "");
      setValue("api_secret", "");
      setValue("account_id", provider.account_id || "");
      setValue("endpoint_url", provider.endpoint_url || "");
      setValue("region", provider.region || "");
      setValue("model", provider.model || "");
      setValue("priority", provider.priority || 100);
      setValue("is_enabled", provider.is_enabled ? "1" : "0");
      setChecked("clear_api_key", false);
      setChecked("clear_api_secret", false);
      renderProviderFields(provider);
      renderProviderMeta(provider);
      renderCredentialSummary(provider);
      setInlineStatus(credentialStatusText(provider));
    }

    async function submit(event) {
      event.preventDefault();
      if (!options.isAdmin || !options.isAdmin()) {
        options.setStatus("Hanya admin yang bisa mengubah konfigurasi OCR.", true);
        return;
      }
      var button = options.form.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      try {
        var form = new FormData(options.form);
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
          is_enabled: String(form.get("is_enabled") || "0") === "1"
        });
        options.setStatus("Konfigurasi OCR tersimpan tanpa menampilkan ulang credential.", false);
        await options.reloadDashboard();
      } catch (error) {
        options.setStatus(error.message || "Konfigurasi OCR belum bisa disimpan.", true);
      } finally {
        if (button) button.disabled = false;
      }
    }

    function findProvider(key) {
      return state.providers.find(function (provider) { return provider.provider_key === key; }) || null;
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

    function setInlineStatus(message) {
      if (options.status) options.status.textContent = message || "";
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

  window.FranchiseDashboardOcr = { createOperations: createOperations };
}());
