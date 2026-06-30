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
    }

    function renderQuality(rows) {
      if (!options.qualityRows) return;
      if (!rows.length) {
        options.qualityRows.innerHTML = '<tr><td colspan="4" class="dash-empty">Tidak ada warning prioritas.</td></tr>';
        return;
      }
      options.qualityRows.innerHTML = rows.map(function (row) {
        return '<tr>' +
          '<td><a href="' + utils.escapeAttr(row.public_url) + '" target="_blank" rel="noopener">' + utils.escapeHtml(row.brand_name) + '</a></td>' +
          '<td>' + utils.escapeHtml(row.category || "-") + '</td>' +
          '<td>' + row.warnings.map(function (warning) { return '<span class="dash-badge">' + utils.escapeHtml(warning) + '</span>'; }).join(" ") + '</td>' +
          '<td>' + utils.renderActionToolbar([
            utils.renderActionButton({
              label: "Buat saran edit",
              icon: "fas fa-pen",
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
      options.listingSelect.innerHTML = '<option value="">Pilih listing...</option>' + rows.map(function (row) {
        return '<option value="' + utils.escapeAttr(row.id) + '">' + utils.escapeHtml(row.brand_name + " - " + (row.category || "Tanpa kategori")) + '</option>';
      }).join("");
    }

    function renderEditSuggestions(data) {
      var pending = data.pending || [];
      var summary = data.summary || {};
      if (options.editCount) options.editCount.textContent = (summary.pending || 0) + " pending";
      if (!options.editRows) return;
      if (!pending.length) {
        options.editRows.innerHTML = '<tr><td colspan="4" class="dash-empty">Tidak ada edit suggestion pending.</td></tr>';
        return;
      }

      options.editRows.innerHTML = pending.map(function (row) {
        var actions = isAdmin()
          ? utils.renderActionToolbar([
            utils.renderActionButton({
              label: "Setujui edit",
              icon: "fas fa-check",
              tone: "success",
              attrs: {
                "data-review-edit": "",
                "data-suggestion-id": row.id,
                "data-decision": "approve"
              }
            }),
            utils.renderActionButton({
              label: "Tolak edit",
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
        return '<tr>' +
          '<td><a href="' + utils.escapeAttr(row.public_url || "#") + '" target="_blank" rel="noopener">' + utils.escapeHtml(row.brand_name) + '</a><br><span class="dash-muted">' + utils.escapeHtml(row.suggested_by_email || row.suggested_by_name || "staff") + '</span></td>' +
          '<td>' + renderFieldDiff(row.old_value || {}, row.suggested_value || {}) + '</td>' +
          '<td>' + utils.escapeHtml(row.reason || "-") + '</td>' +
          '<td>' + actions + '</td>' +
        '</tr>';
      }).join("");

      options.editRows.querySelectorAll("[data-review-edit]").forEach(function (button) {
        button.addEventListener("click", function () {
          reviewEditSuggestion(button);
        });
      });
    }

    function seedEditSuggestion(button) {
      var franchiseId = button.getAttribute("data-franchise-id") || "";
      var warnings = (button.getAttribute("data-warnings") || "").split(",");
      if (options.listingSelect) options.listingSelect.value = franchiseId;
      if (options.editReason) options.editReason.value = "Data quality: " + warnings.filter(Boolean).join(", ");
      renderSeededEditFields(warnings);
      if (options.editFieldList) {
        var firstInput = options.editFieldList.querySelector("[data-edit-value]");
        if (firstInput) firstInput.focus();
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
        '<label>Field<select data-edit-field>' + renderFieldOptions(selected) + '</select></label>' +
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
        wrap.innerHTML = '<select data-edit-value>' + (field.options || []).map(function (option) {
          return '<option value="' + utils.escapeAttr(option) + '">' + utils.escapeHtml(option) + '</option>';
        }).join("") + '</select>';
      } else if (field.type === "textarea") {
        wrap.innerHTML = '<textarea data-edit-value></textarea>';
      } else {
        var inputType = field.type === "integer" || field.type === "number" ? "number" : field.type === "url" ? "url" : "text";
        var step = field.type === "number" ? ' step="0.01"' : "";
        wrap.innerHTML = '<input data-edit-value type="' + inputType + '"' + step + '>';
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
      oldEl.textContent = "Saat ini: " + formatFieldValue(listing ? listing[fieldName] : "");
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

    function renderFieldDiff(oldValue, suggestedValue) {
      var fields = Object.keys(suggestedValue || {});
      if (!fields.length) return '<span class="dash-muted">Tidak ada field.</span>';
      return '<div class="dash-field-diff">' + fields.map(function (fieldName) {
        var field = getFieldDef(fieldName);
        return '<div class="dash-field-diff-row">' +
          '<strong>' + utils.escapeHtml(field.label || fieldName) + '</strong>' +
          '<span><b>Semula:</b> ' + utils.escapeHtml(formatFieldValue(oldValue[fieldName])) + '<br><b>Usulan:</b> ' + utils.escapeHtml(formatFieldValue(suggestedValue[fieldName])) + '</span>' +
        '</div>';
      }).join("") + '</div>';
    }

    function formatFieldValue(value) {
      if (value === null || value === undefined || value === "") return "-";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
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

    async function reviewEditSuggestion(button) {
      try {
        button.disabled = true;
        await options.postDashboardAction({
          action: "review_edit_suggestion",
          suggestion_id: button.getAttribute("data-suggestion-id"),
          decision: button.getAttribute("data-decision"),
          notes: ""
        });
        await options.reloadDashboard();
      } catch (error) {
        button.disabled = false;
        options.setStatus(error.message, true);
      }
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

    return {
      bind: bind,
      render: render
    };
  }

  window.FranchiseDashboardReview = {
    createOperations: createOperations
  };
}());
