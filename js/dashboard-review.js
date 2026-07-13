(function () {
  var utils = window.FranchiseDashboardUtils;
  if (!utils) throw new Error("Dashboard utilities belum tersedia.");

  function createOperations(options) {
    options = options || {};

    function isAdmin() {
      return Boolean(options.isAdmin && options.isAdmin());
    }

    function dashboardState() {
      return options.getDashboardState ? options.getDashboardState() : null;
    }

    function bind() {
      if (options.editForm) {
        options.editForm.addEventListener("submit", submitEditSuggestion);
      }
      if (options.addEditFieldButton) {
        options.addEditFieldButton.addEventListener("click", function () {
          addEditFieldRow("phone", "");
        });
      }
      if (options.listingSelect) {
        options.listingSelect.addEventListener("change", refreshFieldOldValues);
      }
      if (options.locationListingSelect) {
        options.locationListingSelect.addEventListener("change", renderSelectedLocationRows);
      }
      if (options.locationForm) {
        options.locationForm.addEventListener("submit", submitLocationUpdate);
      }
      if (options.refreshQualityButton) {
        options.refreshQualityButton.addEventListener("click", refreshQualityChecks);
      }
    }

    function render(data) {
      data = data || {};
      renderRoleCopy();
      renderQuality(data.data_quality || []);
      renderClaims(data.pending_claims || []);
      renderListingOptions(data.editable_listings || []);
      ensureEditFieldRows();
      renderEditSuggestions(data.edit_suggestions || { summary: {}, pending: [] });
    }

    function renderRoleCopy() {
      if (options.editPanelTitle) options.editPanelTitle.textContent = isAdmin() ? "Edit Listing Langsung" : "Listing Edit Suggestions";
      if (options.editPanelCopy) {
        options.editPanelCopy.textContent = isAdmin()
          ? "Admin bisa memperbaiki data listing dan menerapkannya langsung."
          : "Staff menyiapkan perubahan; admin menyetujui sebelum tampil.";
      }
      if (options.editHelp) {
        options.editHelp.textContent = isAdmin()
          ? "Perubahan admin langsung tersimpan dan masuk antrean publish."
          : "Perubahan staff masuk review admin sebelum tampil.";
      }
      if (options.editSubmitButton) {
        var label = isAdmin() ? "Terapkan edit langsung" : "Kirim saran edit";
        options.editSubmitButton.setAttribute("aria-label", label);
        options.editSubmitButton.setAttribute("data-fr-tooltip", label);
        options.editSubmitButton.innerHTML = '<i class="' + (isAdmin() ? "fas fa-save" : "fas fa-paper-plane") + '" aria-hidden="true"></i>';
      }
      if (options.locationSubmit) {
        options.locationSubmit.disabled = !isAdmin();
        options.locationSubmit.setAttribute("aria-label", isAdmin() ? "Simpan area listing" : "Login admin dibutuhkan");
        options.locationSubmit.setAttribute("data-fr-tooltip", isAdmin() ? "Simpan area listing" : "Login admin dibutuhkan");
      }
      if (options.locationHelp) {
        options.locationHelp.textContent = isAdmin()
          ? "Gunakan format: kota | jenis | provinsi. Jenis: area, outlet, kantor, asal."
          : "Staff bisa melihat area listing. Login admin dibutuhkan untuk menyimpan perubahan.";
      }
    }

    function renderQuality(rows) {
      if (!options.qualityRows) return;
      if (!rows.length) {
        options.qualityRows.innerHTML = '<tr><td colspan="4" class="dash-empty">Tidak ada warning prioritas.</td></tr>';
        return;
      }
      options.qualityRows.innerHTML = rows.map(function (row) {
        var quickEditLabel = isAdmin() ? "Edit langsung" : "Buat saran edit";
        return '<tr>' +
          '<td><a href="' + utils.escapeAttr(row.public_url) + '" target="_blank" rel="noopener">' + utils.escapeHtml(row.brand_name) + '</a></td>' +
          '<td>' + utils.escapeHtml(row.category || "-") + '</td>' +
          '<td>' + row.warnings.map(function (warning) { return '<span class="dash-badge">' + utils.escapeHtml(warning) + '</span>'; }).join(" ") + '</td>' +
          '<td>' + utils.renderActionToolbar([
            utils.renderActionButton({
              label: quickEditLabel,
              icon: isAdmin() ? "fas fa-pen-to-square" : "fas fa-pen",
              attrs: {
                "data-quick-edit": "",
                "data-franchise-id": row.id,
                "data-brand": row.brand_name,
                "data-warnings": row.warnings.join(",")
              }
            })
          ], "Aksi data quality") + '</td>' +
        '</tr>';
      }).join("");

      options.qualityRows.querySelectorAll("[data-quick-edit]").forEach(function (button) {
        button.addEventListener("click", function () {
          seedEditSuggestion(button);
        });
      });
    }

    function renderClaims(rows) {
      if (!options.claimRows) return;
      if (!rows.length) {
        options.claimRows.innerHTML = '<li><strong>Tidak ada claim pending</strong><span>Queue claim kosong.</span></li>';
        return;
      }
      options.claimRows.innerHTML = rows.map(function (row) {
        var actions = isAdmin()
          ? utils.renderActionToolbar([
            utils.renderActionButton({
              label: "Setujui claim",
              icon: "fas fa-check",
              tone: "success",
              attrs: {
                "data-review-claim": "",
                "data-claim-id": row.id,
                "data-decision": "approve"
              }
            }),
            utils.renderActionButton({
              label: "Tolak claim",
              icon: "fas fa-times",
              tone: "danger",
              attrs: {
                "data-review-claim": "",
                "data-claim-id": row.id,
                "data-decision": "reject"
              }
            })
          ], "Review claim")
          : '<span>Login admin dibutuhkan untuk approve/reject.</span>';
        return '<li><strong>' + utils.escapeHtml(row.brand_name) + '</strong><span>' + utils.escapeHtml(row.claimant_email || row.claimant_name || "Tanpa claimant") + ' - ' + utils.escapeHtml(row.created_at) + '</span>' + actions + '</li>';
      }).join("");

      options.claimRows.querySelectorAll("[data-review-claim]").forEach(function (button) {
        button.addEventListener("click", function () {
          reviewClaim(button);
        });
      });
    }

    function renderListingOptions(rows) {
      if (!options.listingSelect) return;
      var html = '<option value="">Pilih listing...</option>' + rows.map(function (row) {
        return '<option value="' + utils.escapeAttr(row.id) + '">' + utils.escapeHtml(row.brand_name + " - " + (row.category || "Tanpa kategori")) + '</option>';
      }).join("");
      options.listingSelect.innerHTML = html;
      if (options.locationListingSelect) {
        var current = options.locationListingSelect.value;
        options.locationListingSelect.innerHTML = html;
        if (current && rows.some(function (row) { return row.id === current; })) options.locationListingSelect.value = current;
        renderSelectedLocationRows();
      }
    }

    function renderEditSuggestions(data) {
      var allPending = data.pending || [];
      var pending = allPending.filter(function (row) { return !isDocumentSuggestion(row); });
      var ocrPending = allPending.filter(isDocumentSuggestion);
      var summary = data.summary || {};
      if (options.editCount) options.editCount.textContent = pending.length.toLocaleString("id-ID") + " pending";
      if (options.ocrReviewCount) options.ocrReviewCount.textContent = ocrPending.length.toLocaleString("id-ID") + " pending";
      renderSuggestionRows(options.editRows, pending, "Tidak ada edit suggestion pending.");
      renderSuggestionRows(options.ocrReviewRows, ocrPending, "Tidak ada review OCR pending.");
      if (summary.pending !== allPending.length && options.editCount) {
        options.editCount.setAttribute("data-fr-tooltip", Number(summary.pending || allPending.length || 0).toLocaleString("id-ID") + " total review pending.");
      }
    }

    function renderSuggestionRows(target, pending, emptyCopy) {
      if (!target) return;
      if (!pending.length) {
        target.innerHTML = '<tr><td colspan="4" class="dash-empty">' + utils.escapeHtml(emptyCopy) + '</td></tr>';
        return;
      }

      target.innerHTML = pending.map(function (row) {
        var actions = isAdmin()
          ? utils.renderActionToolbar([
            utils.renderActionButton({
              label: "Setujui field terpilih",
              icon: "fas fa-check",
              tone: "success",
              attrs: {
                "data-review-edit": "",
                "data-suggestion-id": row.id,
                "data-decision": "approve"
              }
            }),
            utils.renderActionButton({
              label: "Tolak semua field",
              icon: "fas fa-times",
              tone: "danger",
              attrs: {
                "data-review-edit": "",
                "data-suggestion-id": row.id,
                "data-decision": "reject"
              }
            })
          ], "Review edit")
          : '<span class="dash-muted">Menunggu admin.</span>';
        return '<tr data-suggestion-row="' + utils.escapeAttr(row.id) + '">' +
          '<td class="dash-review-brand"><a href="' + utils.escapeAttr(row.public_url || "#") + '" target="_blank" rel="noopener">' + utils.escapeHtml(row.brand_name) + '</a>' + renderSuggestionActor(row) + renderSuggestionType(row) + '</td>' +
          '<td class="dash-review-diff-cell">' + renderFieldDiff(row, row.old_value || {}, row.suggested_value || {}) + '</td>' +
          '<td class="dash-review-reason">' + utils.escapeHtml(row.reason || "-") + '</td>' +
          '<td>' + actions + '</td>' +
        '</tr>';
      }).join("");

      target.querySelectorAll("[data-review-edit]").forEach(function (button) {
        button.addEventListener("click", function () {
          reviewEditSuggestion(button);
        });
      });
    }

    function renderSuggestionType(row) {
      if (row.field_name === "ocr_enrichment_bundle") return '<span class="dash-review-source"><i class="fas fa-file-alt" aria-hidden="true"></i> OCR bundle</span>';
      if (row.field_name === "proposal_extraction") return '<span class="dash-review-source"><i class="fas fa-file-alt" aria-hidden="true"></i> Proposal</span>';
      return '<span class="dash-review-source is-manual"><i class="fas fa-pen" aria-hidden="true"></i> Manual</span>';
    }

    function renderSuggestionActor(row) {
      if (isDocumentSuggestion(row)) {
        var source = row.field_name === "ocr_enrichment_bundle" ? "OCR terstruktur" : "Ekstraksi proposal";
        return '<span class="dash-muted">Sumber: ' + utils.escapeHtml(source) + '</span>';
      }
      return '<span class="dash-muted">Diusulkan: ' + utils.escapeHtml(row.suggested_by_name || row.suggested_by_email || "staff") + '</span>';
    }

    function isDocumentSuggestion(row) {
      return row && (row.field_name === "ocr_enrichment_bundle" || row.field_name === "proposal_extraction");
    }

    function seedEditSuggestion(button) {
      var franchiseId = button.getAttribute("data-franchise-id") || "";
      var warnings = (button.getAttribute("data-warnings") || "").split(",");
      if (options.listingSelect) options.listingSelect.value = franchiseId;
      if (options.editReason) options.editReason.value = "Data quality: " + warnings.filter(Boolean).join(", ");
      renderSeededEditFields(warnings);
      openReviewTabForEdit();
      window.setTimeout(function () {
        if (options.editFieldList) {
          var firstInput = options.editFieldList.querySelector("[data-edit-value]");
          if (firstInput) firstInput.focus();
        }
      }, 0);
      if (options.setStatus) {
        options.setStatus(isAdmin() ? "Form edit langsung sudah disiapkan di tab Review." : "Form saran edit sudah disiapkan di tab Review.", false);
      }
    }

    function openReviewTabForEdit() {
      var reviewTab = document.querySelector('[data-dashboard-tab="review"]');
      if (reviewTab && reviewTab.getAttribute("aria-selected") !== "true") reviewTab.click();
      if (options.editForm && typeof options.editForm.scrollIntoView === "function") {
        options.editForm.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function renderSeededEditFields(warnings) {
      var fields = [];
      if (warnings.indexOf("missing_contact") >= 0 || warnings.indexOf("suspicious_contact") >= 0) fields.push("phone");
      if (warnings.indexOf("missing_category") >= 0) fields.push("category");
      if (warnings.indexOf("missing_description") >= 0 || warnings.indexOf("likely_all_caps") >= 0) fields.push("short_desc");
      if (warnings.indexOf("missing_image") >= 0) fields.push("logo_url");
      if (warnings.indexOf("invalid_url") >= 0) fields.push("logo_url");
      if (!fields.length) fields.push("short_desc");
      clearEditFieldRows();
      fields.forEach(function (field) {
        addEditFieldRow(field, "");
      });
    }

    function ensureEditFieldRows() {
      if (!options.editFieldList) return;
      if (!options.editFieldList.children.length) addEditFieldRow("phone", "");
    }

    function clearEditFieldRows() {
      if (options.editFieldList) options.editFieldList.innerHTML = "";
    }

    function addEditFieldRow(fieldName, value) {
      if (!options.editFieldList) return;
      var fields = getEditableFields();
      var selected = fields.some(function (field) { return field.name === fieldName; }) ? fieldName : fields[0].name;
      var row = document.createElement("div");
      row.className = "dash-field-row";
      row.innerHTML = '<div class="dash-field-main">' +
        '<label>Field<select data-edit-field name="field_name">' + renderFieldOptions(selected) + '</select></label>' +
        '<label>Nilai baru<span data-edit-value-wrap></span><span class="dash-field-old" data-edit-old></span></label>' +
        '</div>' +
        '<button class="dash-icon-button dash-field-remove" type="button" data-remove-edit-field aria-label="Hapus field" data-fr-tooltip="Hapus field"><i class="fas fa-trash-alt" aria-hidden="true"></i></button>';
      options.editFieldList.appendChild(row);
      bindEditFieldRow(row, value);
    }

    function bindEditFieldRow(row, value) {
      var fieldSelect = row.querySelector("[data-edit-field]");
      var removeButton = row.querySelector("[data-remove-edit-field]");
      fieldSelect.addEventListener("change", function () {
        renderValueInput(row, "");
        refreshFieldOldValue(row);
      });
      removeButton.addEventListener("click", function () {
        if (options.editFieldList.children.length <= 1) {
          renderValueInput(row, "");
          return;
        }
        row.remove();
      });
      renderValueInput(row, value);
      refreshFieldOldValue(row);
      if (window.FranchiseTooltip && typeof window.FranchiseTooltip.refresh === "function") {
        window.FranchiseTooltip.refresh();
      }
    }

    function renderValueInput(row, value) {
      var fieldName = row.querySelector("[data-edit-field]").value;
      var field = getFieldDef(fieldName);
      var wrap = row.querySelector("[data-edit-value-wrap]");
      if (!wrap) return;

      if (field.type === "select") {
        wrap.innerHTML = '<select data-edit-value name="field_value">' + (field.options || []).map(function (option) {
          return '<option value="' + utils.escapeAttr(option) + '">' + utils.escapeHtml(option) + '</option>';
        }).join("") + '</select>';
      } else if (field.type === "textarea") {
        wrap.innerHTML = '<textarea data-edit-value name="field_value"></textarea>';
      } else {
        var inputType = field.type === "integer" || field.type === "number" ? "number" : field.type === "url" ? "url" : "text";
        var step = field.type === "number" ? ' step="0.01"' : "";
        wrap.innerHTML = '<input data-edit-value name="field_value" type="' + inputType + '"' + step + '>';
      }

      var input = wrap.querySelector("[data-edit-value]");
      if (input) input.value = value == null ? "" : value;
    }

    function refreshFieldOldValues() {
      if (!options.editFieldList) return;
      Array.from(options.editFieldList.querySelectorAll(".dash-field-row")).forEach(refreshFieldOldValue);
    }

    function refreshFieldOldValue(row) {
      var fieldName = row.querySelector("[data-edit-field]").value;
      var oldEl = row.querySelector("[data-edit-old]");
      var listing = selectedListing();
      if (!oldEl) return;
      oldEl.textContent = "Saat ini: " + formatFieldValue(fieldName, listing ? listing[fieldName] : "", getFieldDef(fieldName));
    }

    function collectEditChanges() {
      if (!options.listingSelect || !options.listingSelect.value) throw new Error("Pilih listing terlebih dahulu.");
      if (!options.editFieldList) throw new Error("Tambahkan minimal satu field.");
      var changes = {};
      Array.from(options.editFieldList.querySelectorAll(".dash-field-row")).forEach(function (row) {
        var fieldName = row.querySelector("[data-edit-field]").value;
        var input = row.querySelector("[data-edit-value]");
        var value = input ? input.value : "";
        if (!String(value).trim()) return;
        changes[fieldName] = value;
      });
      if (!Object.keys(changes).length) throw new Error("Isi nilai baru minimal pada satu field.");
      return changes;
    }

    function renderFieldOptions(selected) {
      return getEditableFields().map(function (field) {
        return '<option value="' + utils.escapeAttr(field.name) + '"' + (field.name === selected ? " selected" : "") + '>' + utils.escapeHtml(field.label || field.name) + '</option>';
      }).join("");
    }

    function getEditableFields() {
      var state = dashboardState();
      return state && state.editable_fields && state.editable_fields.length
        ? state.editable_fields
        : [
          { name: "phone", label: "Telepon/WhatsApp", type: "text" },
          { name: "brand_country", label: "Asal brand", type: "text" },
          { name: "target_market", label: "Target pasar", type: "text" },
          { name: "office_address", label: "Alamat kantor", type: "textarea" },
          { name: "category", label: "Kategori", type: "text" },
          { name: "short_desc", label: "Deskripsi singkat", type: "textarea" },
          { name: "logo_url", label: "URL logo", type: "url" }
        ];
    }

    function getFieldDef(fieldName) {
      return getEditableFields().filter(function (field) { return field.name === fieldName; })[0] || getEditableFields()[0];
    }

    function selectedListing() {
      var state = dashboardState();
      if (!state || !options.listingSelect) return null;
      return (state.editable_listings || []).filter(function (listing) {
        return listing.id === options.listingSelect.value;
      })[0] || null;
    }

    function selectedLocationListing() {
      var state = dashboardState();
      if (!state || !options.locationListingSelect) return null;
      return (state.editable_listings || []).filter(function (listing) {
        return listing.id === options.locationListingSelect.value;
      })[0] || null;
    }

    function renderSelectedLocationRows() {
      if (!options.locationText || !options.locationCurrent) return;
      var listing = selectedLocationListing();
      if (!listing) {
        options.locationText.value = "";
        options.locationCurrent.textContent = "Belum ada listing dipilih.";
        return;
      }
      var locations = listing.structured_locations || [];
      var rows = locations.some(function (item) { return item.source_field === "owner_profile"; })
        ? locations.filter(function (item) { return item.source_field === "owner_profile"; })
        : locations;
      options.locationText.value = rows.map(function (item) {
        return [item.city || item.location_text || "", locationTypeInputLabel(item.location_type), item.province || ""].filter(Boolean).join(" | ");
      }).join("\n");
      options.locationCurrent.textContent = rows.length
        ? rows.length + " area terhubung" + (listing.location_override_active ? " (diatur manual)." : " dari data awal.")
        : "Belum ada area untuk listing ini.";
    }

    function renderFieldDiff(row, oldValue, suggestedValue) {
      var fields = Object.keys(suggestedValue || {});
      if (!fields.length) return '<span class="dash-muted">Tidak ada field.</span>';
      var evidenceByField = extractOcrEvidence(oldValue);
      return '<div class="dash-field-diff">' + fields.map(function (fieldName) {
        var field = getFieldDef(fieldName);
        var fieldChoice = isAdmin()
          ? '<label class="dash-review-field-choice"><input type="checkbox" data-review-field-select data-suggestion-id="' + utils.escapeAttr(row.id) + '" value="' + utils.escapeAttr(fieldName) + '" checked><span>Approve field ini</span></label>'
          : "";
        return '<div class="dash-field-diff-row">' +
          '<div class="dash-field-diff-head"><strong><i class="fas fa-tag" aria-hidden="true"></i>' + utils.escapeHtml(field.label || fieldName) + '</strong>' + fieldChoice + '</div>' +
          '<div class="dash-field-diff-values">' +
            '<span class="dash-diff-value is-old"><i class="fas fa-minus" aria-hidden="true"></i><b>Semula</b><em>' + utils.escapeHtml(formatFieldValue(fieldName, oldValue[fieldName], field)) + '</em></span>' +
            '<span class="dash-diff-arrow"><i class="fas fa-arrow-right" aria-hidden="true"></i></span>' +
            '<span class="dash-diff-value is-new"><i class="fas fa-plus" aria-hidden="true"></i><b>Usulan</b><em>' + utils.escapeHtml(formatFieldValue(fieldName, suggestedValue[fieldName], field)) + '</em></span>' +
          '</div>' +
          renderOcrEvidence(fieldName, field, evidenceByField[fieldName]) +
        '</div>';
      }).join("") + '</div>';
    }

    function extractOcrEvidence(oldValue) {
      if (!oldValue || typeof oldValue !== "object") return {};
      var evidence = oldValue.__ocr_evidence;
      return evidence && typeof evidence === "object" && !Array.isArray(evidence) ? evidence : {};
    }

    function renderOcrEvidence(fieldName, field, evidence) {
      if (!evidence || typeof evidence !== "object") return "";
      var sources = Array.isArray(evidence.sources) ? evidence.sources : [];
      var source = sources.filter(function (item) { return item && (item.excerpt || item.source_url); })[0] || null;
      if (!source) return "";
      var excerpt = source.excerpt ? utils.escapeHtml(source.excerpt) : "Excerpt OCR belum tersedia untuk field ini.";
      var page = source.page_number ? "Hal. " + Number(source.page_number).toLocaleString("id-ID") : "Halaman brosur";
      var count = Number(evidence.source_count || sources.length || 0);
      var conflicts = Number(evidence.conflict_count || 0);
      var summary = count > 1 ? count.toLocaleString("id-ID") + " sumber cocok" : "1 sumber";
      if (conflicts > 0) summary += ", " + conflicts.toLocaleString("id-ID") + " variasi lain";
      var image = source.source_url
        ? '<a class="dash-pill-action dash-review-evidence-image" href="' + utils.escapeAttr(source.source_url) + '" target="_blank" rel="noopener" data-ocr-image-preview-url="' + utils.escapeAttr(source.source_url) + '" data-ocr-image-preview-alt="' + utils.escapeAttr((field.label || fieldName) + " - " + page) + '" aria-label="' + utils.escapeAttr("Preview gambar dasar OCR untuk " + (field.label || fieldName) + ". Klik untuk membuka gambar di tab baru.") + '">' +
          '<i class="fas fa-image" aria-hidden="true"></i><span>Bukti dokumen</span></a>'
        : "";
      return '<div class="dash-review-evidence">' +
        '<span class="dash-review-evidence-text"><i class="fas fa-quote-left" aria-hidden="true"></i><b>Dasar dokumen</b><em>' + excerpt + '</em></span>' +
        '<span class="dash-review-evidence-meta"><i class="fas fa-file-alt" aria-hidden="true"></i>' + utils.escapeHtml(page + " - " + summary) + '</span>' +
        image +
      '</div>';
    }

    function formatFieldValue(fieldName, value, field) {
      if (value === null || value === undefined || value === "") return "-";
      if (typeof value === "object") return JSON.stringify(value);
      if (isMoneyField(fieldName)) return formatMoneyValue(value);
      if (isPercentField(fieldName)) return formatNumberValue(value) + "%";
      if (field && (field.type === "integer" || field.type === "number")) return formatNumberValue(value);
      return normalizeDisplayCase(fieldName, value);
    }

    function isMoneyField(fieldName) {
      return /_idr$/.test(fieldName || "");
    }

    function isPercentField(fieldName) {
      return /_percent$/.test(fieldName || "");
    }

    function formatMoneyValue(value) {
      var number = Number(value);
      if (!Number.isFinite(number)) return String(value);
      return "Rp " + Math.round(number).toLocaleString("id-ID");
    }

    function formatNumberValue(value) {
      var number = Number(value);
      if (!Number.isFinite(number)) return String(value);
      return number.toLocaleString("id-ID", { maximumFractionDigits: 2 });
    }

    function normalizeDisplayCase(fieldName, value) {
      var text = String(value);
      if (!shouldNormalizeCase(fieldName)) return text;
      return text.split(/([,;/|]+)/).map(function (part) {
        if (/^[,;/|]+$/.test(part)) return part;
        return titleCaseText(part);
      }).join("").replace(/\s+([,;/|])/g, "$1").replace(/([,;/|])\s*/g, "$1 ");
    }

    function shouldNormalizeCase(fieldName) {
      return [
        "category",
        "subcategory",
        "label",
        "city_origin",
        "brand_country",
        "outlet_type",
        "target_market",
        "royalty_period"
      ].indexOf(fieldName) >= 0;
    }

    function titleCaseText(value) {
      return String(value).toLowerCase().replace(/\b([a-zà-ÿ])/g, function (match) {
        return match.toUpperCase();
      }).replace(/\b(sop|hpp|roi|bep|nib)\b/gi, function (match) {
        return match.toUpperCase();
      }).trim();
    }

    async function refreshQualityChecks() {
      try {
        options.refreshQualityButton.disabled = true;
        options.refreshQualityButton.classList.add("is-busy");
        var result = await options.postDashboardAction({ action: "refresh_quality_checks" });
        options.setStatus("Quality checks diperbarui: " + Number(result.result && result.result.scanned || 0).toLocaleString("id-ID") + " listing dicek.", false);
        await options.reloadDashboard();
      } catch (error) {
        options.setStatus(error.message, true);
      } finally {
        options.refreshQualityButton.disabled = false;
        options.refreshQualityButton.classList.remove("is-busy");
      }
    }

    async function submitEditSuggestion(event) {
      event.preventDefault();
      try {
        var changes = collectEditChanges();
        var result = await options.postDashboardAction({
          action: "suggest_edit",
          franchise_id: options.listingSelect.value,
          changes: changes,
          reason: options.editReason.value || ""
        });
        options.setStatus(result.applied ? "Edit langsung diterapkan dan publish queue sudah ditandai dirty." : "Edit suggestion dikirim untuk admin review.", false);
        clearEditFieldRows();
        ensureEditFieldRows();
        await options.reloadDashboard();
      } catch (error) {
        options.setStatus(error.message, true);
      }
    }

    async function submitLocationUpdate(event) {
      event.preventDefault();
      if (!isAdmin()) {
        options.setStatus("Login admin dibutuhkan untuk menyimpan area listing.", true);
        return;
      }
      if (!options.locationListingSelect || !options.locationListingSelect.value) {
        options.setStatus("Pilih listing terlebih dahulu.", true);
        return;
      }
      try {
        if (options.locationSubmit) options.locationSubmit.disabled = true;
        await options.postDashboardAction({
          action: "update_listing_locations",
          franchise_id: options.locationListingSelect.value,
          locations: parseLocationRows(options.locationText ? options.locationText.value : "")
        });
        options.setStatus("Area listing tersimpan dan publish queue sudah ditandai dirty.", false);
        await options.reloadDashboard();
      } catch (error) {
        options.setStatus(error.message, true);
      } finally {
        if (options.locationSubmit) options.locationSubmit.disabled = !isAdmin();
      }
    }

    async function reviewEditSuggestion(button) {
      try {
        button.disabled = true;
        var decision = button.getAttribute("data-decision");
        var payload = {
          action: "review_edit_suggestion",
          suggestion_id: button.getAttribute("data-suggestion-id"),
          decision: decision,
          notes: ""
        };
        if (decision === "approve") {
          payload.approved_fields = collectSelectedReviewFields(button);
        }
        await options.postDashboardAction({
          action: payload.action,
          suggestion_id: payload.suggestion_id,
          decision: payload.decision,
          approved_fields: payload.approved_fields,
          notes: payload.notes
        });
        await options.reloadDashboard();
      } catch (error) {
        button.disabled = false;
        options.setStatus(error.message, true);
      }
    }

    function collectSelectedReviewFields(button) {
      var suggestionId = button.getAttribute("data-suggestion-id") || "";
      var row = button.closest("[data-suggestion-row]");
      var boxes = row ? Array.from(row.querySelectorAll("[data-review-field-select]")).filter(function (box) {
        return box.getAttribute("data-suggestion-id") === suggestionId;
      }) : [];
      if (!boxes.length) return undefined;
      var selected = boxes.filter(function (box) { return box.checked; }).map(function (box) { return box.value; });
      if (!selected.length) throw new Error("Pilih minimal satu field untuk disetujui.");
      return selected;
    }

    async function reviewClaim(button) {
      try {
        button.disabled = true;
        await options.postDashboardAction({
          action: "review_claim",
          claim_id: button.getAttribute("data-claim-id"),
          decision: button.getAttribute("data-decision"),
          notes: ""
        });
        await options.reloadDashboard();
      } catch (error) {
        button.disabled = false;
        options.setStatus(error.message, true);
      }
    }

    function parseLocationRows(value) {
      return String(value || "")
        .split(/\r?\n/)
        .map(function (line) { return line.trim(); })
        .filter(Boolean)
        .slice(0, 24)
        .map(function (line) {
          var parts = line.split("|").map(function (part) { return part.trim(); });
          return {
            city: parts[0] || "",
            location_type: parseLocationType(parts[1]),
            province: parts[2] || ""
          };
        })
        .filter(function (row) { return row.city.length >= 2; });
    }

    function parseLocationType(value) {
      var normalized = String(value || "").trim().toLowerCase();
      if (["kantor", "head office", "headoffice", "office", "pusat"].indexOf(normalized) >= 0) return "head_office";
      if (["outlet", "gerai", "cabang"].indexOf(normalized) >= 0) return "outlet";
      if (["asal", "origin", "kota asal"].indexOf(normalized) >= 0) return "origin";
      return "available_area";
    }

    function locationTypeInputLabel(type) {
      return {
        head_office: "kantor",
        outlet: "outlet",
        origin: "asal",
        available_area: "area"
      }[type] || "area";
    }

    return {
      bind: bind,
      render: render
    };
  }

  window.FranchiseDashboardReview = {
    createOperations: createOperations
  };
}());
