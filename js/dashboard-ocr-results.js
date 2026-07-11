(function () {
  function createRenderer(deps) {
    deps = deps || {};
    var utils = deps.utils;
    if (!utils) throw new Error("Dashboard OCR result renderer membutuhkan utils.");

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
      var activeIndex = deps.clampResultPage(group.key, group.items.length);
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

    function renderEnrichmentQueue(queue) {
      var items = queue && queue.items ? queue.items : [];
      if (!items.length) return "";
      return '<li class="dash-ocr-enrichment-queue">' +
        '<div class="dash-ocr-enrichment-head">' +
          '<div><strong><i class="fas fa-layer-group" aria-hidden="true"></i> Kandidat Review OCR</strong>' +
          '<span>' + utils.escapeHtml(items.length.toLocaleString("id-ID") + " franchise punya kandidat field yang bisa digabung sebelum masuk Review.") + '</span></div>' +
        '</div>' +
        '<div class="dash-ocr-enrichment-list">' + items.map(renderEnrichmentItem).join("") + '</div>' +
        '</li>';
    }

    function renderEnrichmentItem(item) {
      var fields = (item.field_labels || item.fields || []).slice(0, 8).join(", ");
      var sourceCopy = Number(item.source_count || 0).toLocaleString("id-ID") + " sumber OCR";
      var pendingBundle = Number(item.pending_bundle_count || 0) > 0;
      var pendingPage = Number(item.pending_page_suggestion_count || 0) > 0;
      var sourceAssetId = firstSourceAssetId(item);
      var action = pendingBundle
        ? '<span class="dash-ocr-enrichment-state"><i class="fas fa-clock" aria-hidden="true"></i> Sudah pending</span>'
        : utils.renderPillActionButton({
          label: "Buat Review",
          icon: "fas fa-clipboard-list",
          tooltip: "Buat satu bundle review dari kandidat OCR franchise ini.",
          attrs: { "data-ocr-create-enrichment": item.franchise_id || "" }
        });
      var listing = item.public_url
        ? utils.renderPillActionLink({
          label: "Listing",
          icon: "fas fa-external-link-alt",
          href: item.public_url,
          tooltip: "Buka listing publik franchise ini."
        })
        : "";
      var sourceLink = sourceAssetId
        ? utils.renderPillActionLink({
          label: "Sumber",
          icon: "fas fa-file-alt",
          href: "#ocr-result-" + sourceAssetId,
          newTab: false,
          tooltip: "Buka salah satu halaman OCR sumber kandidat ini.",
          attrs: { "data-ocr-open-result": sourceAssetId }
        })
        : "";
      return '<article class="dash-ocr-enrichment-item">' +
        '<div class="dash-ocr-enrichment-copy">' +
          '<strong>' + utils.escapeHtml(item.brand_name || item.franchise_id || "Listing") + '</strong>' +
          '<span><i class="fas fa-tags" aria-hidden="true"></i> ' + utils.escapeHtml(fields || "Kandidat belum terbaca") + '</span>' +
          '<span><i class="fas fa-file-alt" aria-hidden="true"></i> ' + utils.escapeHtml(sourceCopy + (pendingPage ? " · ada review halaman lama" : "")) + '</span>' +
        '</div>' +
        '<div class="dash-ocr-enrichment-actions">' + sourceLink + listing + action + '</div>' +
        '</article>';
    }

    function firstSourceAssetId(item) {
      var sourceFields = item.sources_by_field || {};
      var fieldNames = Object.keys(sourceFields);
      for (var i = 0; i < fieldNames.length; i += 1) {
        var sources = sourceFields[fieldNames[i]] && sourceFields[fieldNames[i]].sources;
        if (sources && sources[0] && sources[0].asset_id) return sources[0].asset_id;
      }
      return "";
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
        ? item.candidate_fields.map(deps.fieldLabel).join(", ")
        : "Belum ada kandidat field baru dari teks ini.";
      var previewAlt = group.brandName + " · " + page;
      var assetLink = item.source_url
        ? '<a class="dash-ocr-row-action dash-ocr-image-action" href="' + utils.escapeAttr(item.source_url) + '" target="_blank" rel="noopener" data-ocr-image-preview-url="' + utils.escapeAttr(item.source_url) + '" data-ocr-image-preview-alt="' + utils.escapeAttr(previewAlt) + '" aria-label="' + utils.escapeAttr("Lihat preview gambar " + previewAlt + ". Klik untuk membuka gambar di tab baru.") + '"><i class="fas fa-image" aria-hidden="true"></i><span>Gambar</span></a>'
        : "";
      var reviewLink = '<a href="#review" data-ocr-open-review data-fr-tooltip="Buka tab Review untuk meninjau kandidat data."><i class="fas fa-clipboard-check" aria-hidden="true"></i><span>Review</span></a>';
      return '<div id="ocr-result-' + utils.escapeAttr(item.asset_id || "") + '" class="dash-ocr-result-item dash-ocr-result-page-body is-' + utils.escapeAttr(extractionStatusClass(item.extraction_status)) + '" data-ocr-result-asset-id="' + utils.escapeAttr(item.asset_id || "") + '">' +
        '<div class="dash-ocr-result-meta">' +
          '<span><i class="fas fa-file-alt" aria-hidden="true"></i> ' + utils.escapeHtml(page) + '</span>' +
          '<span><i class="fas ' + resultStatusIcon(item.extraction_status) + '" aria-hidden="true"></i> ' + utils.escapeHtml(deps.statusLabel(item.extraction_status)) + '</span>' +
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

    function resultStatusIcon(status) {
      return status === "extracted" ? "fa-check-circle" : status === "failed" ? "fa-times-circle" : "fa-exclamation-circle";
    }

    function extractionStatusClass(status) {
      return status === "extracted" ? "extracted" : status === "failed" ? "failed" : "review";
    }

    return {
      groupResultsByFranchise: groupResultsByFranchise,
      renderResultGroup: renderResultGroup,
      renderEnrichmentQueue: renderEnrichmentQueue
    };
  }

  window.FranchiseDashboardOcrResults = { createRenderer: createRenderer };
})();
