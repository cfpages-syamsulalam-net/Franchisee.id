(function () {
  function createRenderer(deps) {
    deps = deps || {};
    var utils = deps.utils;
    if (!utils) throw new Error("Dashboard OCR worker renderer membutuhkan utils.");

    function renderWorkerUsage(usage) {
      if (!usage) return "";
      var cap = Number(usage.cap || 0);
      var used = Number(usage.used || 0);
      var remaining = Number(usage.remaining || 0);
      var status = usage.status || (remaining <= 0 ? "exhausted" : "available");
      var icon = status === "no_provider" ? "fa-plug" : status === "exhausted" ? "fa-pause-circle" : status === "near_limit" ? "fa-exclamation-triangle" : "fa-layer-group";
      var label = status === "no_provider"
        ? "Belum ada provider aktif"
        : status === "account_specific"
          ? "Limit mengikuti akun provider"
          : status === "exhausted"
            ? "Kuota gabungan habis"
            : status === "near_limit"
              ? "Kuota gabungan hampir habis"
              : "Kuota gabungan tersedia";
      var reset = usage.reset_at ? formatResetTime(usage.reset_at) : "reset UTC berikutnya";
      var resetMs = usage.reset_at ? Date.parse(usage.reset_at) : 0;
      var tooltip = "Kapasitas dihitung dari sisa kuota masing-masing provider OCR aktif. Provider yang sudah habis tidak akan diberi job. OCR_WORKER_DAILY_CAP hanya dipakai sebagai safety cap tambahan jika secret/env itu di-set.";
      var quotaText = usage.has_only_unknown_quota_providers
        ? "Provider aktif tidak punya angka quota publik stabil; sistem tetap memakai guard individual provider."
        : 'Terpakai ' + used.toLocaleString("id-ID") + '/' + cap.toLocaleString("id-ID") + ' · Sisa ' + remaining.toLocaleString("id-ID");
      var providerText = Number(usage.known_provider_count || 0).toLocaleString("id-ID") + " provider berlimit jelas";
      if (Number(usage.unknown_provider_count || 0)) providerText += " · " + Number(usage.unknown_provider_count || 0).toLocaleString("id-ID") + " provider account-specific";
      if (usage.safety_cap) providerText += " · Safety cap " + Number(usage.safety_cap || 0).toLocaleString("id-ID");
      return '<div class="dash-ocr-worker-usage is-' + utils.escapeAttr(status) + '"' + (resetMs ? ' data-ocr-worker-reset-at="' + utils.escapeAttr(String(resetMs)) + '"' : '') + ' data-fr-tooltip="' + utils.escapeAttr(tooltip) + '">' +
        '<span><i class="fas ' + icon + '" aria-hidden="true"></i><strong>' + utils.escapeHtml(label) + '</strong></span>' +
        '<span>' + quotaText + ' · Reset ' + utils.escapeHtml(reset) + '</span>' +
        '<span>' + utils.escapeHtml(providerText) + '</span>' +
        '<small data-ocr-worker-countdown>' + utils.escapeHtml(workerResetCountdownLabel(resetMs)) + '</small>' +
        '</div>';
    }

    function updateWorkerUsageCountdown(root) {
      if (!root) return 0;
      var activeCount = 0;
      root.querySelectorAll("[data-ocr-worker-reset-at]").forEach(function (item) {
        var resetAt = Number(item.getAttribute("data-ocr-worker-reset-at") || 0);
        var target = item.querySelector("[data-ocr-worker-countdown]");
        if (!resetAt || !target) return;
        target.textContent = workerResetCountdownLabel(resetAt);
        if (resetAt > Date.now()) activeCount += 1;
      });
      return activeCount;
    }

    function formatResetTime(value) {
      var date = new Date(value);
      if (!Number.isFinite(date.getTime())) return "UTC berikutnya";
      return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
    }

    function workerResetCountdownLabel(resetAtMs) {
      resetAtMs = Number(resetAtMs || 0);
      if (!resetAtMs) return "";
      var remaining = Math.max(0, Math.floor((resetAtMs - Date.now()) / 1000));
      if (!remaining) return "Kuota worker sudah reset; refresh dashboard untuk memuat angka terbaru.";
      return "Silakan tunggu " + formatDurationId(remaining) + " lagi";
    }

    function formatDurationId(totalSeconds) {
      var seconds = Math.max(0, Number(totalSeconds || 0));
      var hours = Math.floor(seconds / 3600);
      var minutes = Math.floor((seconds % 3600) / 60);
      var secs = seconds % 60;
      var parts = [];
      if (hours) parts.push(hours.toLocaleString("id-ID") + " jam");
      if (minutes || hours) parts.push(minutes.toLocaleString("id-ID") + " menit");
      parts.push(secs.toLocaleString("id-ID") + " detik");
      return parts.join(" ");
    }

    return {
      renderWorkerUsage: renderWorkerUsage,
      updateWorkerUsageCountdown: updateWorkerUsageCountdown
    };
  }

  window.FranchiseDashboardOcrWorker = { createRenderer: createRenderer };
})();
