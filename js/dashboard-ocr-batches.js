(function () {
  function createRenderer(deps) {
    deps = deps || {};
    var utils = deps.utils;
    if (!utils) throw new Error("Dashboard OCR batch renderer membutuhkan utils.");

    function renderBatches(payload) {
      payload = payload || {};
      var batches = payload.batches || [];
      return batches.length ? batches.map(function (batch) {
        var progress = Number(batch.assigned_count || 0)
          ? Math.round((Number(batch.processed_count || 0) / Number(batch.assigned_count || 1)) * 100)
          : 0;
        var meta = [
          Number(batch.processed_count || 0).toLocaleString("id-ID") + "/" + Number(batch.assigned_count || 0).toLocaleString("id-ID") + " diproses",
          "Sukses " + Number(batch.succeeded_count || 0).toLocaleString("id-ID"),
          "Perlu cek " + Number(batch.needs_review_count || 0).toLocaleString("id-ID"),
          "Tanpa teks " + Number(batch.skipped_count || 0).toLocaleString("id-ID"),
          "Gagal " + Number(batch.failed_count || 0).toLocaleString("id-ID"),
          batch.scheduler_provider_key ? "Scheduler " + batch.scheduler_provider_key : "Manual"
        ];
        var done = ["completed", "cancelled"].indexOf(batch.status) !== -1;
        var retryDisabled = (deps.getActiveProviderCount ? deps.getActiveProviderCount() : 0) === 0;
        var countdown = schedulerCountdown(batch);
        var batchStatus = batchStatusDisplay(batch, countdown);
        var description = batchDescription(batch, countdown);
        var retryButton = !done
          ? '<button type="button" class="dash-ocr-row-action" data-ocr-retry-batch="' + utils.escapeAttr(batch.id || "") + '" data-fr-tooltip="' + utils.escapeAttr(retryDisabled ? "Aktifkan provider OCR yang siap dipakai sebelum retry batch." : "Coba jadwalkan ulang batch ini lewat scheduler aktif. Jika error token muncul lagi, ganti QSTASH_TOKEN di Pengaturan.") + '"' + (retryDisabled ? " disabled" : "") + '><i class="fas fa-redo-alt" aria-hidden="true"></i><span>Retry</span></button>'
          : "";
        var refreshButton = '<button type="button" class="dash-ocr-row-action" data-ocr-refresh-batches data-fr-tooltip="Muat ulang status batch OCR dari server."><i class="fas fa-sync-alt" aria-hidden="true"></i><span>Refresh</span></button>';
        return '<li class="dash-ocr-batch-item is-' + utils.escapeAttr(batch.status || "queued") + '"' + countdownAttrs(countdown) + '>' +
          '<div class="dash-ocr-batch-head"><strong><i class="fas fa-layer-group" aria-hidden="true"></i> Batch ' + utils.escapeHtml(batch.id || "-") + '</strong>' + renderBatchStatus(batchStatus) + '</div>' +
          '<div class="dash-ocr-progress"><span style="width:' + Math.max(0, Math.min(progress, 100)) + '%"></span></div>' +
          '<span>' + utils.escapeHtml(meta.join(" · ")) + '</span>' +
          '<small data-ocr-batch-description>' + utils.escapeHtml(description) + '</small>' +
          '<div class="dash-ocr-batch-actions">' + retryButton + refreshButton + '</div>' +
          '</li>';
      }).join("") : '<li><span>Belum ada batch OCR background. Klik Jalankan OCR setelah provider OCR dan scheduler siap.</span></li>';
    }

    function updateCountdownLabels(root) {
      if (!root) return 0;
      var now = Date.now();
      var activeCount = 0;
      root.querySelectorAll("[data-ocr-batch-countdown-until]").forEach(function (item) {
        var until = Number(item.getAttribute("data-ocr-batch-countdown-until") || 0);
        var status = item.querySelector("[data-ocr-batch-status]");
        var description = item.querySelector("[data-ocr-batch-description]");
        if (!until) return;
        var remaining = Math.max(0, Math.ceil((until - now) / 1000));
        var display = countdownStatusDisplay(remaining);
        if (status) {
          status.className = "dash-ocr-job-state is-" + display.kind;
          status.innerHTML = '<i class="fas ' + display.icon + '" aria-hidden="true"></i>' + utils.escapeHtml(display.label);
        }
        if (description) description.textContent = countdownDescription(remaining);
        if (remaining > 0) {
          activeCount += 1;
          item.setAttribute("data-ocr-batch-waiting", "true");
        } else {
          item.setAttribute("data-ocr-batch-waiting", "done");
        }
      });
      return activeCount;
    }

    function renderBatchStatus(item) {
      return '<span class="dash-ocr-job-state is-' + utils.escapeAttr(item.kind) + '" data-ocr-batch-status>' +
        '<i class="fas ' + utils.escapeAttr(item.icon) + '" aria-hidden="true"></i>' + utils.escapeHtml(item.label) + '</span>';
    }

    function batchStatusDisplay(batch, countdown) {
      if (countdown) return countdownStatusDisplay(countdown.remaining_seconds);
      if (batch.status === "completed") return { icon: "fa-check-circle", kind: "success", label: "Selesai" };
      if (batch.status === "failed") return { icon: "fa-times-circle", kind: "failed", label: "Gagal" };
      if (batch.status === "cancelled") return { icon: "fa-ban", kind: "failed", label: "Batal" };
      if (batch.status === "paused_rate_limit") return { icon: "fa-hourglass-half", kind: "review", label: "Jeda rate limit" };
      if (batch.status === "paused_quota") return { icon: "fa-pause-circle", kind: "review", label: "Jeda kuota" };
      if (batch.status === "running" || batch.status === "queued") return { icon: "fa-spinner fa-spin", kind: "running", label: "Memproses" };
      return { icon: "fa-circle", kind: "unknown", label: batch.status || "Status" };
    }

    function countdownStatusDisplay(seconds) {
      seconds = Math.max(0, Number(seconds || 0));
      return seconds > 0
        ? { icon: "fa-hourglass-half", kind: "pending", label: "Menunggu " + seconds.toLocaleString("id-ID") + "s" }
        : { icon: "fa-spinner fa-spin", kind: "running", label: "Memproses" };
    }

    function batchDescription(batch, countdown) {
      if (countdown) return countdownDescription(countdown.remaining_seconds);
      if (batch.status === "running" || batch.status === "queued") {
        return "Batch OCR berjalan di background. Sistem sedang memproses chunk atau menunggu jadwal scheduler berikutnya.";
      }
      return batch.last_message || "Status batch OCR diperbarui dari server.";
    }

    function countdownDescription(seconds) {
      seconds = Math.max(0, Number(seconds || 0));
      return seconds > 0
        ? "Batch OCR berjalan di background. Menunggu " + seconds.toLocaleString("id-ID") + " detik sebelum scheduler memicu chunk berikutnya."
        : "Scheduler sedang memproses chunk OCR berikutnya. Mohon tunggu; status akan diperbarui otomatis.";
    }

    function schedulerCountdown(batch) {
      if (!batch || ["queued", "running"].indexOf(batch.status) === -1) return null;
      var structuredDueAt = parseSqlTimestampMs(batch.scheduler_trigger_due_at);
      if (structuredDueAt) {
        return {
          until_ms: structuredDueAt,
          remaining_seconds: Math.max(0, Math.ceil((structuredDueAt - Date.now()) / 1000)),
          source: "structured"
        };
      }
      var delaySeconds = parseSchedulerDelaySeconds(batch.last_message || "");
      if (!delaySeconds) return null;
      var base = parseSqlTimestampMs(batch.updated_at || batch.created_at || batch.started_at);
      if (!base) return null;
      var until = base + (delaySeconds * 1000);
      var remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      return { until_ms: until, remaining_seconds: remaining, source: "message" };
    }

    function countdownAttrs(countdown) {
      if (!countdown) return "";
      return ' data-ocr-batch-countdown-until="' + utils.escapeAttr(String(countdown.until_ms)) + '" data-ocr-batch-waiting="true"';
    }

    function parseSchedulerDelaySeconds(message) {
      var match = String(message || "").match(/\((\d+)\s*([smh])\)/i);
      if (!match) return 0;
      var value = Number(match[1] || 0);
      var unit = String(match[2] || "s").toLowerCase();
      if (!value) return 0;
      if (unit === "h") return value * 60 * 60;
      if (unit === "m") return value * 60;
      return value;
    }

    function parseSqlTimestampMs(value) {
      if (!value) return 0;
      var text = String(value).trim();
      if (!text) return 0;
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
        text = text.replace(" ", "T") + "Z";
      }
      var parsed = Date.parse(text);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return {
      renderBatches: renderBatches,
      updateCountdownLabels: updateCountdownLabels
    };
  }

  window.FranchiseDashboardOcrBatches = { createRenderer: createRenderer };
})();
