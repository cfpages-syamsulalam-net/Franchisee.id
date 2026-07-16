(function (window) {
  function createGoogleContacts(options) {
    options = options || {};
    var utils = window.FranchiseDashboardUtils;
    var escapeHtml = utils.escapeHtml;
    var escapeAttr = utils.escapeAttr;
    var notice = options.notice;
    var GOOGLE_CONTACTS_SETUP_DOC = "/dashboard/#google-contacts-setup";

    async function connect(button) {
      try {
        button.disabled = true;
        button.classList.add("is-busy");
        hideNotice();
        options.setStatus("Membuka izin Google Contacts...", false);
        var headers = await window.FranchiseAuth.getAuthHeaders();
        var response = await fetch("/google-contacts-start?return=" + encodeURIComponent("/dashboard/#outreach"), {
          method: "POST",
          headers: headers,
        });
        var result = await window.FranchiseFetch.readJson(response, "Koneksi Google Contacts gagal dimulai.");
        if (!response.ok || !result.success || !result.authorization_url) {
          var connectError = new Error(result.message || result.error || "Koneksi Google Contacts gagal dimulai.");
          connectError.dashboardResult = result;
          throw connectError;
        }
        window.location.href = result.authorization_url;
      } catch (error) {
        button.disabled = false;
        button.classList.remove("is-busy");
        var formatted = formatError(error);
        options.setStatus(formatted.message, true);
        if (formatted.showNotice) showNotice(formatted);
      }
    }

    function renderConnectedPill(connection) {
      var tooltip = "Google Contacts terhubung untuk akun staff ini";
      if (connection.connected_at) tooltip += ". Terhubung " + connection.connected_at;
      return '<span class="dash-outreach-connected" data-fr-tooltip="' + escapeAttr(tooltip) + '"><i class="fab fa-google" aria-hidden="true"></i><span>' + escapeHtml(connection.google_email || "Google terhubung") + '</span></span>';
    }

    function renderHealthPill(connection) {
      var health = connection.token_health || (connection.needs_reconnect ? "reconnect_recommended" : "ok");
      var icon = health === "ok" ? "fas fa-check-circle" : health === "error" ? "fas fa-exclamation-triangle" : "fas fa-sync-alt";
      var label = health === "ok" ? "OK" : health === "error" ? "Cek koneksi" : "Reconnect";
      var tooltip = connection.last_error
        ? "Koneksi Google Contacts terakhir gagal: " + connection.last_error
        : health === "ok"
          ? "Token Google Contacts siap dipakai. Akses akan direfresh otomatis jika Google memberi refresh token."
          : "Koneksi Google Contacts sebaiknya dihubungkan ulang sebelum token kedaluwarsa.";
      if (connection.updated_at) tooltip += " Update terakhir " + connection.updated_at + ".";
      return '<span class="dash-outreach-google-health is-' + escapeAttr(health) + '" data-fr-tooltip="' + escapeAttr(tooltip) + '"><i class="' + escapeAttr(icon) + '" aria-hidden="true"></i><span>' + escapeHtml(label) + '</span></span>';
    }

    async function disconnect(button) {
      try {
        button.disabled = true;
        button.classList.add("is-busy");
        hideNotice();
        options.setStatus("Memutus koneksi Google Contacts...", false);
        await options.postDashboardAction({ action: "disconnect_google_contacts" });
        options.setStatus("Koneksi Google Contacts diputus. Staff bisa menghubungkan akun Google lain dari Outreach.", false);
        if (typeof options.reloadDashboard === "function") await options.reloadDashboard();
      } catch (error) {
        button.disabled = false;
        button.classList.remove("is-busy");
        options.setStatus(error.message || "Koneksi Google Contacts gagal diputus.", true);
      }
    }

    function formatError(error) {
      var result = error && error.dashboardResult ? error.dashboardResult : {};
      var message = error && error.message ? error.message : "Kontak belum bisa disimpan ke Google.";
      var needsSetup = result.setup_required || result.connect_required || result.reauth_required || result.error === "GOOGLE_CONTACTS_SCOPE_MISSING" || result.error === "GOOGLE_ACCOUNT_NOT_LINKED";
      if (!needsSetup) return { message: escapeHtml(message), showNotice: false };
      var href = result.documentation_url || GOOGLE_CONTACTS_SETUP_DOC;
      var isConnectRequired = result.connect_required || result.error === "GOOGLE_CONTACTS_NOT_CONNECTED" || result.error === "GOOGLE_CONTACTS_RECONNECT_REQUIRED";
      var actionMessage = isConnectRequired
        ? "Google Contacts perlu dihubungkan dari dashboard staff sebelum kontak bisa disimpan."
        : "Izin Google Contacts belum tersedia untuk koneksi staff ini. Hubungkan Google Contacts ulang dari dashboard, kemudian coba simpan kontak lagi.";
      var statusMessage = escapeHtml(actionMessage) + ' <a class="dash-link" href="' + escapeAttr(href) + '">Lihat panduan setup</a>.';
      return {
        message: statusMessage,
        showNotice: true,
        detail: message,
        documentationUrl: href,
        connectRequired: isConnectRequired,
      };
    }

    function showNotice(details) {
      if (!notice) return;
      notice.hidden = false;
      notice.innerHTML =
        '<div class="dash-outreach-alert-icon"><i class="fab fa-google" aria-hidden="true"></i></div>' +
        '<div class="dash-outreach-alert-body">' +
          '<strong>' + (details.connectRequired ? 'Hubungkan Google Contacts' : 'Izin Google Contacts perlu dihubungkan ulang') + '</strong>' +
          '<p>' + (details.connectRequired ? 'Kontak outreach hanya disimpan setelah akun staff menghubungkan Google Contacts dari dashboard. Login umum tetap memakai scope dasar tanpa akses kontak.' : 'Koneksi Google Contacts staff perlu diperbarui agar token membawa izin kontak terbaru.') + '</p>' +
          (details.detail ? '<p class="dash-outreach-alert-detail">' + escapeHtml(details.detail) + '</p>' : "") +
        '</div>' +
        '<div class="dash-outreach-alert-actions">' +
          '<button class="dash-pill-action primary" type="button" data-google-contacts-connect data-fr-tooltip="Hubungkan Google Contacts">' +
            '<i class="fab fa-google" aria-hidden="true"></i><span>Hubungkan Google Contacts</span>' +
          '</button>' +
          '<a class="dash-pill-action" href="' + escapeAttr(details.documentationUrl || GOOGLE_CONTACTS_SETUP_DOC) + '" data-fr-tooltip="Buka panduan Google Contacts">' +
            '<i class="fas fa-book-open" aria-hidden="true"></i><span>Panduan</span>' +
          '</a>' +
        '</div>';
      var connectButton = notice.querySelector("[data-google-contacts-connect]");
      if (connectButton) connectButton.addEventListener("click", function () { connect(connectButton); });
      if (window.FranchiseTooltip && typeof window.FranchiseTooltip.refresh === "function") {
        window.FranchiseTooltip.refresh();
      }
    }

    function hideNotice() {
      if (!notice) return;
      notice.hidden = true;
      notice.innerHTML = "";
    }

    return {
      connect: connect,
      disconnect: disconnect,
      formatError: formatError,
      hideNotice: hideNotice,
      renderConnectedPill: renderConnectedPill,
      renderHealthPill: renderHealthPill,
      showNotice: showNotice,
    };
  }

  window.FranchiseDashboardGoogleContacts = { create: createGoogleContacts };
})(window);
