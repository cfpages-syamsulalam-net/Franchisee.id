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
      var imageLink = job.source_url ? deps.renderJobActionLink(job.source_url, "fa-image", "Gambar", "Buka gambar halaman brosur yang dikirim ke OCR.", true) : "";
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
      return '<article class="dash-ocr-job-item is-' + utils.escapeAttr(job.status || "unknown") + '">' +
        '<div class="dash-ocr-job-main">' +
        '<div class="dash-ocr-job-head"><strong>' + utils.escapeHtml(page) + '</strong>' + deps.renderJobStatus(job.status) + '</div>' +
        '<div class="dash-ocr-job-meta">' +
        '<span><i class="fas fa-plug" aria-hidden="true"></i>' + utils.escapeHtml(provider) + '</span>' +
        '<span><i class="fas fa-redo-alt" aria-hidden="true"></i>' + Number(job.attempt_count || 0).toLocaleString("id-ID") + 'x</span>' +
        '</div>' +
        (job.error_message ? '<div class="dash-ocr-job-error' + (job.status === "no_text" ? ' is-resolved' : '') + '"><i class="fas ' + (job.status === "no_text" ? 'fa-info-circle' : 'fa-times-circle') + '" aria-hidden="true"></i><span>' + utils.escapeHtml(job.error_message) + '</span></div>' : '') +
        '</div>' +
        '<div class="dash-ocr-job-actions">' + imageLink + resultLink + retryButton + noTextButton + '</div>' +
        '</article>';
    }

    return {
      renderJobFilterButton: renderJobFilterButton,
      buildJobFilterPayload: buildJobFilterPayload,
      renderJobFilterHeading: renderJobFilterHeading,
      renderJobPagination: renderJobPagination,
      groupJobsByFranchise: groupJobsByFranchise,
      renderJobGroup: renderJobGroup
    };
  }

  window.FranchiseDashboardOcrJobs = { createRenderer: createRenderer };
})();
