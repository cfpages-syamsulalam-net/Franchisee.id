(function () {
  var utils = window.FranchiseDashboardUtils;
  if (!utils) throw new Error("Dashboard utilities belum tersedia.");

  function createOperations(options) {
    options = options || {};

    function isAdmin() {
      return Boolean(options.isAdmin && options.isAdmin());
    }

    function render(data) {
      data = data || {};
      renderFunnel(data.funnel || {});
      renderPaymentMethod(data.payment_methods || []);
      renderSettings(data.settings || {});
      renderNotifications(data.notifications || []);
      renderExpiring(data.expiring_subscriptions || []);
      renderAnnualReports(data.annual_reports || []);
      renderEmailQueue(data.email_queue_rows || [], data.email_queue || []);
    }

    function renderFunnel(funnel) {
      if (!options.premiumFunnel) return;
      var rows = [
        ["Halaman dilihat", funnel.premium_page_view || 0],
        ["CTA diklik", funnel.premium_cta_click || 0],
        ["Tagihan dibuat", funnel.premium_order_created || 0],
        ["Konfirmasi masuk", funnel.premium_confirmation_submitted || 0],
        ["Premium aktif", funnel.premium_activated || 0]
      ];
      options.premiumFunnel.innerHTML = rows.map(function (row) {
        return '<li><strong>' + utils.escapeHtml(row[0]) + '</strong><span>' + utils.escapeHtml(row[1]) + '</span></li>';
      }).join("");
    }

    function renderPaymentMethod(methods) {
      var method = methods.find(function (item) { return item.code === "manual_bca"; }) || methods[0];
      if (!options.paymentMethodForm || !method) return;
      utils.setFormValue(options.paymentMethodForm, "method_type", method.method_type || "bank_transfer");
      utils.setFormValue(options.paymentMethodForm, "label", method.label || "");
      utils.setFormValue(options.paymentMethodForm, "provider", method.provider || "");
      utils.setFormValue(options.paymentMethodForm, "account_name", method.account_name || "");
      utils.setFormValue(options.paymentMethodForm, "account_number", method.account_number || "");
      utils.setFormValue(options.paymentMethodForm, "instructions", method.instructions || "");
      utils.setFormValue(options.paymentMethodForm, "qris_image_url", method.qris_image_url || "");
      utils.setFormValue(options.paymentMethodForm, "qris_image_alt", method.qris_image_alt || "");
      renderQrisPreview(method.qris_image_url || "", method.qris_image_alt || "");
    }

    function renderQrisPreview(url, label) {
      var preview = options.paymentMethodForm && options.paymentMethodForm.querySelector("[data-qris-preview]");
      if (!preview) return;
      preview.hidden = !url;
      preview.innerHTML = url
        ? '<span>QRIS saat ini</span><img src="' + utils.escapeAttr(url) + '" alt="' + utils.escapeAttr(label || "QRIS pembayaran Premium") + '" loading="lazy"><a class="dash-link" href="' + utils.escapeAttr(url) + '" target="_blank" rel="noopener">Buka gambar</a>'
        : "";
    }

    function renderSettings(settings) {
      if (!options.premiumSettingsForm) return;
      utils.setFormValue(options.premiumSettingsForm, "grace_period_days", settings.grace_period_days == null ? 3 : settings.grace_period_days);
      utils.setFormValue(options.premiumSettingsForm, "grace_daily_email_enabled", Number(settings.grace_daily_email_enabled == null ? 1 : settings.grace_daily_email_enabled));
      utils.setFormValue(options.premiumSettingsForm, "annual_report_enabled", Number(settings.annual_report_enabled == null ? 1 : settings.annual_report_enabled));
      utils.setFormValue(options.premiumSettingsForm, "multi_brand_discount_enabled", Number(settings.multi_brand_discount_enabled || 0));
      utils.setFormValue(options.premiumSettingsForm, "multi_brand_discount_percent", settings.multi_brand_discount_percent || 0);
      utils.setFormValue(options.premiumSettingsForm, "multi_brand_min_owned_brands", settings.multi_brand_min_owned_brands || 2);
      utils.setFormValue(options.premiumSettingsForm, "promo_enabled", Number(settings.promo_enabled || 0));
      utils.setFormValue(options.premiumSettingsForm, "promo_discount_percent", settings.promo_discount_percent || 0);
      utils.setFormValue(options.premiumSettingsForm, "promo_label", settings.promo_label || "");
      utils.setFormValue(options.premiumSettingsForm, "promo_message", settings.promo_message || "");
      utils.setFormValue(options.premiumSettingsForm, "promo_bonus_text", settings.promo_bonus_text || "");
      utils.setFormValue(options.premiumSettingsForm, "promo_cta_label", settings.promo_cta_label || "Lihat Premium");
      utils.setFormValue(options.premiumSettingsForm, "promo_cta_url", settings.promo_cta_url || "/premium/");
      utils.setFormValue(options.premiumSettingsForm, "promo_starts_at", toDateTimeLocal(settings.promo_starts_at));
      utils.setFormValue(options.premiumSettingsForm, "promo_ends_at", toDateTimeLocal(settings.promo_ends_at));
      utils.setFormValue(options.premiumSettingsForm, "promo_max_views_per_user", settings.promo_max_views_per_user == null ? 1 : settings.promo_max_views_per_user);
    }

    function renderNotifications(notifications) {
      if (!options.premiumNotifications) return;
      options.premiumNotifications.innerHTML = notifications.length ? notifications.slice(0, 6).map(function (item) {
        return '<li><strong>' + utils.escapeHtml(item.title || "Info Premium") + '</strong><span>' + utils.escapeHtml((item.brand_name ? item.brand_name + " - " : "") + (item.message || "")) + '</span></li>';
      }).join("") : '<li><span>Belum ada info Premium terbaru.</span></li>';
    }

    function renderExpiring(expiring) {
      if (!options.premiumExpiring) return;
      options.premiumExpiring.innerHTML = expiring.length ? expiring.slice(0, 6).map(function (item) {
        var days = Number(item.days_left || 0);
        return '<li><strong>' + utils.escapeHtml(item.brand_name || item.franchise_id || "Listing") + '</strong><span>' +
          utils.escapeHtml((days > 0 ? days + " hari lagi" : "Segera berakhir") + (item.primary_email ? " - " + item.primary_email : "")) +
          '</span></li>';
      }).join("") : '<li><span>Tidak ada Premium yang segera berakhir.</span></li>';
    }

    function renderAnnualReports(reports) {
      if (!options.premiumReports) return;
      options.premiumReports.innerHTML = reports.length ? reports.slice(0, 6).map(function (item) {
        return '<li><strong>' + utils.escapeHtml(item.brand_name || item.franchise_id || "Listing") + '</strong><span>' +
          utils.escapeHtml("view " + (item.listing_views || 0) + " / save " + (item.saves || 0) + " / inquiry " + (item.inquiries || 0) + " / lead " + (item.leads || 0)) +
          '</span></li>';
      }).join("") : '<li><span>Belum ada laporan tahunan Premium.</span></li>';
    }

    function renderEmailQueue(queueRows, queueSummary) {
      if (!options.premiumEmailQueue) return;
      options.premiumEmailQueue.innerHTML = queueRows.length ? queueRows.slice(0, 8).map(function (item) {
        var status = item.status || "pending";
        var actions = isAdmin() ? utils.renderActionToolbar([
          status === "failed" || status === "cancelled" ? utils.renderActionButton({
            label: "Kirim ulang email",
            icon: "fas fa-redo",
            tone: "success",
            attrs: {
              "data-email-action": "retry",
              "data-email-id": item.id
            }
          }) : "",
          status === "pending" || status === "failed" ? utils.renderActionButton({
            label: "Batalkan email",
            icon: "fas fa-ban",
            tone: "danger",
            attrs: {
              "data-email-action": "cancel",
              "data-email-id": item.id
            }
          }) : ""
        ], "Aksi email") : "";
        return '<li><strong>' + utils.escapeHtml(status + " - " + (item.category || "email")) + '</strong>' +
          '<span>' + utils.escapeHtml((item.subject || "Email") + " untuk " + (item.to_email || "-")) + '</span>' +
          (item.last_error ? '<span class="dash-muted">' + utils.escapeHtml(item.last_error) + '</span>' : '') +
          actions +
          '</li>';
      }).join("") : queueSummary.length ? queueSummary.slice(0, 6).map(function (item) {
        return '<li><strong>' + utils.escapeHtml((item.status || "pending") + " - " + (item.category || "email")) + '</strong><span>' +
          utils.escapeHtml((item.count || 0) + " email") +
          '</span></li>';
      }).join("") : '<li><span>Belum ada antrean email 30 hari terakhir.</span></li>';
      options.premiumEmailQueue.querySelectorAll("[data-email-action]").forEach(function (button) {
        button.addEventListener("click", function () {
          manageNotificationEmail(button);
        });
      });
    }

    async function manageNotificationEmail(button) {
      try {
        button.disabled = true;
        await options.postDashboardAction({
          action: "manage_notification_email",
          email_id: button.getAttribute("data-email-id"),
          email_action: button.getAttribute("data-email-action")
        });
        options.setStatus(button.getAttribute("data-email-action") === "retry" ? "Email masuk antrean kirim ulang." : "Email dibatalkan.", false);
        await options.reloadDashboard();
      } catch (error) {
        button.disabled = false;
        options.setStatus(error.message || "Aksi email belum bisa diproses.", true);
      }
    }

    async function submitPaymentMethod(event) {
      event.preventDefault();
      if (!options.paymentMethodForm || !isAdmin()) {
        options.setStatus("Hanya admin yang bisa mengubah metode pembayaran.", true);
        return;
      }
      var button = options.paymentMethodForm.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      try {
        var form = new FormData(options.paymentMethodForm);
        var qrisUrl = String(form.get("qris_image_url") || "");
        var qrisFile = form.get("qris_image");
        if (qrisFile && qrisFile.name) {
          options.setStatus("Mengunggah QRIS...", false);
          qrisUrl = await uploadQrisImage(form, qrisFile);
        }
        await options.postDashboardAction({
          action: "update_payment_method",
          code: String(form.get("code") || "manual_bca"),
          method_type: String(form.get("method_type") || "bank_transfer"),
          label: String(form.get("label") || ""),
          provider: String(form.get("provider") || ""),
          account_name: String(form.get("account_name") || ""),
          account_number: String(form.get("account_number") || ""),
          instructions: String(form.get("instructions") || ""),
          qris_image_url: qrisUrl,
          qris_image_alt: String(form.get("qris_image_alt") || ""),
          is_active: true
        });
        options.setStatus("Metode pembayaran tersimpan.", false);
        await options.reloadDashboard();
      } catch (error) {
        options.setStatus(error.message || "Metode pembayaran belum bisa disimpan.", true);
      } finally {
        if (button) button.disabled = false;
      }
    }

    async function uploadQrisImage(form, file) {
      if (!window.FranchiseAuth || typeof window.FranchiseAuth.getAuthHeaders !== "function") {
        throw new Error("Sesi admin belum siap untuk upload QRIS.");
      }
      var uploadForm = new FormData();
      uploadForm.set("code", String(form.get("code") || "manual_bca"));
      uploadForm.set("qris_image", file);
      var headers = await window.FranchiseAuth.getAuthHeaders();
      var response = await fetch("/payment-method-upload", {
        method: "POST",
        headers: headers,
        body: uploadForm
      });
      var result = await window.FranchiseFetch.readJson(response, "Gambar QRIS belum bisa diunggah.").catch(function () { return {}; });
      if (!response.ok || !result.success) throw new Error(result.message || "QRIS belum bisa diunggah.");
      return result.qris_image_url || "";
    }

    async function submitPremiumSettings(event) {
      event.preventDefault();
      if (!options.premiumSettingsForm || !isAdmin()) {
        options.setStatus("Hanya admin yang bisa mengubah pengaturan Premium.", true);
        return;
      }
      var button = options.premiumSettingsForm.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      try {
        var form = new FormData(options.premiumSettingsForm);
        await options.postDashboardAction({
          action: "update_premium_settings",
          grace_period_days: Number(form.get("grace_period_days") || 3),
          grace_daily_email_enabled: String(form.get("grace_daily_email_enabled") || "1") === "1",
          annual_report_enabled: String(form.get("annual_report_enabled") || "1") === "1",
          multi_brand_discount_enabled: String(form.get("multi_brand_discount_enabled") || "0") === "1",
          multi_brand_discount_percent: Number(form.get("multi_brand_discount_percent") || 0),
          multi_brand_min_owned_brands: Number(form.get("multi_brand_min_owned_brands") || 2),
          promo_enabled: String(form.get("promo_enabled") || "0") === "1",
          promo_discount_percent: Number(form.get("promo_discount_percent") || 0),
          promo_label: String(form.get("promo_label") || ""),
          promo_message: String(form.get("promo_message") || ""),
          promo_bonus_text: String(form.get("promo_bonus_text") || ""),
          promo_cta_label: String(form.get("promo_cta_label") || "Lihat Premium"),
          promo_cta_url: String(form.get("promo_cta_url") || "/premium/"),
          promo_starts_at: normalizeDateTimeLocal(form.get("promo_starts_at")),
          promo_ends_at: normalizeDateTimeLocal(form.get("promo_ends_at")),
          promo_max_views_per_user: Number(form.get("promo_max_views_per_user") || 1)
        });
        options.setStatus("Pengaturan Premium tersimpan.", false);
        await options.reloadDashboard();
      } catch (error) {
        options.setStatus(error.message || "Pengaturan Premium belum bisa disimpan.", true);
      } finally {
        if (button) button.disabled = false;
      }
    }

    return {
      render: render,
      submitPaymentMethod: submitPaymentMethod,
      submitPremiumSettings: submitPremiumSettings
    };
  }

  function toDateTimeLocal(value) {
    if (!value) return "";
    var text = String(value);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return text.slice(0, 16);
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) return text.replace(" ", "T").slice(0, 16);
    var date = new Date(text);
    if (Number.isNaN(date.getTime())) return "";
    var offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function normalizeDateTimeLocal(value) {
    var text = String(value || "");
    return text ? text : "";
  }

  window.FranchiseDashboardPremium = {
    createOperations: createOperations
  };
}());
