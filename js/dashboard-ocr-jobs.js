(function () {
  function createRenderer(deps) {
    deps = deps || {};
    var utils = deps.utils;
    if (!utils) throw new Error("Dashboard OCR job renderer membutuhkan utils.");

    function renderJobFilterButton(status, icon, label, count) {
      var currentStatus = deps.getJobFilterStatus ? deps.getJobFilterStatus() : "";
      var active = currentStatus === status || (!currentStatus && status === "all");
      return '<button type="button" class="dash-ocr-job-filter' + (active ? ' is-active' : '') + '" data-ocr-job-filter="' + utils.escapeAttr(status) + '" data-fr-tooltip="Tampilkan job OCR: ' + utils.escapeAttr(label) + '">' +
        '<i class="fas ' + icon + '" aria-hidden="true"></i><span>' + utils.escapeHtml(label) + '</span><strong>' + Number(count || 0).toLocaleString("id-ID") + '</strong></button>';
    }

    function buildJobFilterPayload(basePayload) {
      return Object.assign({}, basePayload || {}, {
        recent: deps.getJobFilterResults ? deps.getJobFilterResults() : [],
        job_filter: deps.getJobFilterMeta ? deps.getJobFilterMeta() : null
      });
    }

    function renderJobFilterHeading(payload) {
      var status = deps.getJobFilterStatus ? deps.getJobFilterStatus() : "";
      if (!status) return "";
      var meta = payload.job_filter || (deps.getJobFilterMeta ? deps.getJobFilterMeta() : {}) || {};
      var total = Number(meta.total || 0);
      var offset = Number(meta.offset || 0);
      var shown = (payload.recent || []).length;
      var from = shown ? offset + 1 : 0;
      var to = offset + shown;
      var loading = deps.getJobFilterLoading && deps.getJobFilterLoading() ? ' <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>' : "";
      return '<li class="dash-ocr-job-filter-heading"><strong><i class="fas fa-filter" aria-hidden="true"></i> ' + utils.escapeHtml(deps.statusLabel(status)) + loading + '</strong>' +
        '<span>' + from.toLocaleString("id-ID") + '-' + to.toLocaleString("id-ID") + ' dari ' + total.toLocaleString("id-ID") + ' job</span></li>';
    }

    function renderJobPagination(payload) {
      var status = deps.getJobFilterStatus ? deps.getJobFilterStatus() : "";
      if (!status || !payload.job_filter) return "";
      var meta = payload.job_filter;
      var limit = Number(meta.limit || 120);
      var offset = Number(meta.offset || 0);
      var total = Number(meta.total || 0);
      if (total <= limit) return "";
      var prevOffset = Math.max(0, offset - limit);
      var nextOffset = offset + limit;
      var page = Math.floor(offset / limit) + 1;
      var pages = Math.max(1, Math.ceil(total / limit));
      return '<li class="dash-ocr-job-pagination">' +
        '<button type="button" class="dash-ocr-row-action" data-ocr-job-page="' + prevOffset + '"' + (offset <= 0 ? " disabled" : "") + ' data-fr-tooltip="Halaman job sebelumnya"><i class="fas fa-chevron-left" aria-hidden="true"></i><span>Sebelumnya</span></button>' +
        '<span>Hal. ' + page.toLocaleString("id-ID") + ' / ' + pages.toLocaleString("id-ID") + '</span>' +
        '<button type="button" class="dash-ocr-row-action" data-ocr-job-page="' + nextOffset + '"' + (nextOffset >= total ? " disabled" : "") + ' data-fr-tooltip="Halaman job berikutnya"><i class="fas fa-chevron-right" aria-hidden="true"></i><span>Berikutnya</span></button>' +
        '</li>';
    }

    function groupJobsByFranchise(jobs) {
      var map = {};
      (jobs || []).forEach(function (job) {
        var key = job.franchise_id || job.brand_name || "unknown";
        if (!map[key]) {
          map[key] = {
            key: key,
            brand_name: job.brand_name || job.franchise_id || "Listing",
            slug: job.slug || "",
            jobs: []
          };
        }
        map[key].jobs.push(job);
      });
      return Object.keys(map).map(function (key) { return map[key]; });
    }

    function renderJobGroup(group) {
      var listingLink = group.slug ? deps.renderJobActionLink("/peluang-usaha/" + group.slug, "fa-external-link-alt", "Listing", "Buka listing publik", true) : "";
      return '<li class="dash-ocr-job-group">' +
        '<div class="dash-ocr-job-group-head"><strong><i class="fas fa-store" aria-hidden="true"></i>' + utils.escapeHtml(group.brand_name) + '</strong><span>' + Number(group.jobs.length || 0).toLocaleString("id-ID") + ' item</span>' + listingLink + '</div>' +
        '<div class="dash-ocr-job-group-grid">' + group.jobs.map(renderJobItem).join("") + '</div>' +
        '</li>';
    }

    function renderJobItem(job) {
      var page = job.page_number ? "Hal. " + Number(job.page_number).toLocaleString("id-ID") : "Hal. proposal";
      var provider = job.provider_key || (job.status === "unqueued" ? "belum antre" : job.status === "no_text" ? "sudah dicek admin" : "belum ada provider");
      var imageLink = job.source_url ? renderImagePreviewLink(job) : "";
      var resultLink = job.status === "succeeded"
        ? deps.renderJobResultAction(job.asset_id)
        : "";
      var activeProviderCount = deps.getActiveProviderCount ? deps.getActiveProviderCount() : 0;
      var canRetry = job.id && (job.status === "failed" || job.status === "needs_review");
      var retryButton = canRetry
        ? deps.renderJobActionButton("data-ocr-retry-job", job.id, "fa-play", "OCR", activeProviderCount ? "Coba OCR ulang sekarang untuk job ini." : "Aktifkan provider OCR dulu sebelum menjalankan ulang job ini.", activeProviderCount === 0)
        : "";
      var canMarkNoText = job.id && (job.status === "failed" || job.status === "needs_review");
      var noTextButton = canMarkNoText
        ? deps.renderJobActionButton("data-ocr-mark-no-text", job.id, "fa-check-circle", "Tanpa teks", "Konfirmasi halaman ini memang tidak punya teks yang cukup. Status akan selesai sebagai Tanpa teks.", false)
        : "";
      var messageIcon = renderJobMessageIcon(job);
      return '<article class="dash-ocr-job-item is-' + utils.escapeAttr(job.status || "unknown") + '">' +
        '<div class="dash-ocr-job-main">' +
        '<div class="dash-ocr-job-head"><strong>' + utils.escapeHtml(page) + '</strong>' + deps.renderJobStatus(job.status) + messageIcon + '</div>' +
        '<div class="dash-ocr-job-meta">' +
        '<span><i class="fas fa-plug" aria-hidden="true"></i>' + utils.escapeHtml(provider) + '</span>' +
        '<span><i class="fas fa-redo-alt" aria-hidden="true"></i>' + Number(job.attempt_count || 0).toLocaleString("id-ID") + 'x</span>' +
        '</div>' +
        '</div>' +
        '<div class="dash-ocr-job-actions">' + imageLink + resultLink + retryButton + noTextButton + '</div>' +
        '</article>';
    }

    function renderJobMessageIcon(job) {
      if (!job || !job.error_message) return "";
      var status = job.status || "";
      var icon = status === "no_text" ? "fa-info-circle" : status === "needs_review" ? "fa-exclamation-triangle" : "fa-times-circle";
      var tone = status === "no_text" ? " is-resolved" : status === "needs_review" ? " is-warning" : " is-error";
      var label = status === "no_text" ? "Catatan" : status === "needs_review" ? "Perlu cek" : "Error";
      var message = String(job.error_message || "");
      var tooltip = label + ": " + message + " Klik ikon untuk copy pesan.";
      return '<button type="button" class="dash-ocr-job-message' + tone + '" data-ocr-copy-job-error="' + utils.escapeAttr(message) + '" data-fr-tooltip="' + utils.escapeAttr(tooltip) + '" aria-label="' + utils.escapeAttr(label + " job OCR. Klik untuk copy pesan.") + '">' +
        '<i class="fas ' + icon + '" aria-hidden="true"></i><span>' + utils.escapeHtml(label) + '</span></button>';
    }

    function renderImagePreviewLink(job) {
      var label = job.page_number ? "Hal. " + Number(job.page_number).toLocaleString("id-ID") : "halaman proposal";
      var alt = (job.brand_name || "Proposal") + " - " + label;
      return '<a class="dash-ocr-row-action dash-ocr-image-action" href="' + utils.escapeAttr(job.source_url) + '" target="_blank" rel="noopener" data-ocr-image-preview-url="' + utils.escapeAttr(job.source_url) + '" data-ocr-image-preview-alt="' + utils.escapeAttr(alt) + '" aria-label="' + utils.escapeAttr("Lihat preview gambar " + alt + ". Klik untuk membuka gambar di tab baru.") + '">' +
        '<i class="fas fa-image" aria-hidden="true"></i><span>Gambar</span></a>';
    }

    function bindImagePreview(root) {
      if (!root || root.__dashOcrImagePreviewBound) return;
      root.__dashOcrImagePreviewBound = true;
      var state = {
        trigger: null,
        url: "",
        timer: 0,
        frame: 0,
        preview: null,
        image: null,
        status: null,
        lastClientX: 0,
        lastClientY: 0
      };

      root.addEventListener("pointerover", function (event) {
        var trigger = previewTrigger(event.target);
        if (!trigger) return;
        schedulePreview(state, trigger);
      });
      root.addEventListener("pointerout", function (event) {
        var trigger = previewTrigger(event.target);
        if (!trigger) return;
        if (event.relatedTarget && trigger.contains(event.relatedTarget)) return;
        hidePreview(state);
      });
      root.addEventListener("focusin", function (event) {
        var trigger = previewTrigger(event.target);
        if (trigger) schedulePreview(state, trigger);
      });
      root.addEventListener("focusout", function (event) {
        var trigger = previewTrigger(event.target);
        if (!trigger) return;
        if (event.relatedTarget && trigger.contains(event.relatedTarget)) return;
        hidePreview(state);
      });
      root.addEventListener("pointermove", function (event) {
        if (!state.trigger) return;
        state.lastClientX = event.clientX;
        state.lastClientY = event.clientY;
        if (state.frame) return;
        state.frame = window.requestAnimationFrame(function () {
          state.frame = 0;
          positionPreview(state, state.lastClientX, state.lastClientY);
        });
      });
      window.addEventListener("scroll", function () { hidePreview(state); }, { passive: true });
      window.addEventListener("resize", function () { hidePreview(state); });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) hidePreview(state);
      });
      root.__dashOcrImagePreviewHide = function () { hidePreview(state); };
    }

    function hideBoundImagePreview(root) {
      if (root && typeof root.__dashOcrImagePreviewHide === "function") root.__dashOcrImagePreviewHide();
    }

    function previewTrigger(target) {
      return target && target.closest ? target.closest("[data-ocr-image-preview-url]") : null;
    }

    function schedulePreview(state, trigger) {
      if (state.trigger === trigger) return;
      clearPreviewTimer(state);
      state.trigger = trigger;
      state.timer = window.setTimeout(function () {
        showPreview(state, trigger);
      }, 180);
    }

    function showPreview(state, trigger) {
      if (state.trigger !== trigger) return;
      ensurePreview(state);
      var url = trigger.getAttribute("data-ocr-image-preview-url") || "";
      var alt = trigger.getAttribute("data-ocr-image-preview-alt") || "Preview gambar proposal";
      if (!url) return;
      state.preview.hidden = false;
      state.preview.classList.remove("is-loaded", "is-error");
      state.status.textContent = "Memuat preview...";
      state.image.alt = alt;
      if (state.url !== url) {
        state.url = url;
        state.image.removeAttribute("src");
        state.image.src = url;
      } else if (state.image.complete && state.image.naturalWidth > 0) {
        markPreviewLoaded(state);
      }
      var rect = trigger.getBoundingClientRect();
      state.lastClientX = rect.left + rect.width / 2;
      state.lastClientY = rect.top + rect.height / 2;
      positionPreview(state, state.lastClientX, state.lastClientY);
    }

    function ensurePreview(state) {
      if (state.preview) return;
      var preview = document.createElement("div");
      preview.className = "dash-ocr-image-preview";
      preview.hidden = true;
      preview.setAttribute("role", "status");
      preview.setAttribute("aria-live", "polite");
      preview.innerHTML = '<div class="dash-ocr-image-preview-frame"><img alt="" decoding="async"><span>Memuat preview...</span></div>';
      document.body.appendChild(preview);
      state.preview = preview;
      state.image = preview.querySelector("img");
      state.status = preview.querySelector("span");
      state.image.addEventListener("load", function () { markPreviewLoaded(state); });
      state.image.addEventListener("error", function () {
        state.preview.classList.add("is-error");
        state.status.textContent = "Preview gagal dimuat. Klik Gambar untuk membuka.";
      });
    }

    function markPreviewLoaded(state) {
      state.preview.classList.add("is-loaded");
      state.status.textContent = "Preview gambar proposal. Klik Gambar untuk membuka tab baru.";
      if (state.lastClientX || state.lastClientY) {
        window.requestAnimationFrame(function () {
          positionPreview(state, state.lastClientX, state.lastClientY);
        });
      }
    }

    function positionPreview(state, clientX, clientY) {
      if (!state.preview || state.preview.hidden) return;
      var bounds = getPreviewViewportBounds();
      var availableWidth = Math.max(180, bounds.right - bounds.left);
      var availableHeight = Math.max(160, bounds.bottom - bounds.top);
      var width = Math.min(380, Math.max(240, Math.floor(availableWidth * 0.34)), availableWidth);
      var gap = 14;
      state.preview.style.width = width + "px";
      state.preview.style.setProperty("--dash-ocr-preview-max-height", Math.max(120, Math.min(420, availableHeight - 24)) + "px");
      var rect = state.preview.getBoundingClientRect();
      var height = Math.min(rect.height || 320, availableHeight);
      var spaceRight = bounds.right - clientX - gap;
      var spaceLeft = clientX - bounds.left - gap;
      var left = spaceRight >= width || spaceRight >= spaceLeft
        ? clientX + gap
        : clientX - width - gap;
      var top = clientY - height / 2;
      if (left + width > bounds.right) left = bounds.right - width;
      if (left < bounds.left) left = bounds.left;
      if (top + height > bounds.bottom) top = bounds.bottom - height;
      if (top < bounds.top) top = bounds.top;
      state.preview.style.left = left + "px";
      state.preview.style.top = top + "px";
    }

    function getPreviewViewportBounds() {
      var margin = 12;
      var visualViewport = window.visualViewport;
      if (visualViewport && typeof visualViewport.width === "number" && typeof visualViewport.height === "number") {
        return {
          left: visualViewport.offsetLeft + margin,
          top: visualViewport.offsetTop + margin,
          right: visualViewport.offsetLeft + visualViewport.width - margin,
          bottom: visualViewport.offsetTop + visualViewport.height - margin
        };
      }
      return {
        left: margin,
        top: margin,
        right: window.innerWidth - margin,
        bottom: window.innerHeight - margin
      };
    }

    function hidePreview(state) {
      clearPreviewTimer(state);
      state.trigger = null;
      if (state.frame) {
        window.cancelAnimationFrame(state.frame);
        state.frame = 0;
      }
      if (state.preview) state.preview.hidden = true;
    }

    function clearPreviewTimer(state) {
      if (!state.timer) return;
      window.clearTimeout(state.timer);
      state.timer = 0;
    }

    return {
      renderJobFilterButton: renderJobFilterButton,
      buildJobFilterPayload: buildJobFilterPayload,
      renderJobFilterHeading: renderJobFilterHeading,
      renderJobPagination: renderJobPagination,
      groupJobsByFranchise: groupJobsByFranchise,
      renderJobGroup: renderJobGroup,
      bindImagePreview: bindImagePreview,
      hideImagePreview: hideBoundImagePreview
    };
  }

  window.FranchiseDashboardOcrJobs = { createRenderer: createRenderer };
})();
