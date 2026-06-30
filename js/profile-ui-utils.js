(function (window) {
  function field(label, name, value, icon) {
    return `
      <div class="fr-profile-field">
        <label><i class="fas ${icon}" aria-hidden="true"></i> ${escapeHtml(label)}</label>
        <input name="${attr(name)}" value="${attr(value)}">
      </div>
    `;
  }

  function textarea(label, name, value, icon) {
    return `
      <div class="fr-profile-field is-wide">
        <label><i class="fas ${icon}" aria-hidden="true"></i> ${escapeHtml(label)}</label>
        <textarea name="${attr(name)}">${escapeHtml(value || "")}</textarea>
      </div>
    `;
  }

  function readonlyIdentity(label, name, value) {
    return `
      <div class="fr-profile-field">
        <label><i class="fas fa-lock" aria-hidden="true"></i> ${escapeHtml(label)}</label>
        <input name="${attr(name)}" value="${attr(value)}" readonly>
        <span class="identity-lock-note">Ubah lewat tab Akun.</span>
      </div>
    `;
  }

  function roleBadges(roles) {
    const roleList = roles?.length ? roles : ["akun"];
    return roleList.map((role) => `<span class="fr-profile-badge"><i class="fas fa-id-badge" aria-hidden="true"></i>${escapeHtml(role)}</span>`).join("");
  }

  function emptyState(icon, text, href) {
    return `
      <h2 class="fr-profile-section-title"><i class="fas ${icon}" aria-hidden="true"></i> ${escapeHtml(text)}</h2>
      <p class="fr-profile-copy">Lengkapi form singkat agar bagian ini siap digunakan.</p>
      <p><a class="fr-profile-button" href="${attr(href)}"><i class="fas fa-arrow-right" aria-hidden="true"></i> Lengkapi Sekarang</a></p>
    `;
  }

  function emptyInline(text) {
    return `<div class="fr-profile-empty-inline"><i class="fas fa-circle-info" aria-hidden="true"></i><span>${escapeHtml(text)}</span></div>`;
  }

  function leadStatusOptions(current) {
    const options = [
      ["new", "Baru"],
      ["sent", "Terkirim"],
      ["viewed", "Dilihat"],
      ["contacted", "Sudah dihubungi"],
      ["qualified", "Cocok"],
      ["closed", "Selesai"],
      ["archived", "Arsip"],
    ];
    return options.map(([value, label]) => `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`).join("");
  }

  function whatsappLink(countryCode, number) {
    const code = String(countryCode || "62").replace(/[^\d]/g, "") || "62";
    let clean = String(number || "").replace(/[^\d]/g, "");
    if (clean.startsWith("0")) clean = code + clean.slice(1);
    if (!clean.startsWith(code)) clean = code + clean;
    return `https://wa.me/${clean}`;
  }

  function statusLabel(status) {
    return {
      new: "Baru dikirim",
      sent: "Terkirim",
      viewed: "Dilihat",
      contacted: "Sudah dihubungi",
      qualified: "Cocok",
      closed: "Selesai",
      spam: "Spam",
      archived: "Diarsipkan",
    }[status] || status || "Baru dikirim";
  }

  function hasGoogleAccount(clerkUser) {
    const accounts = Array.isArray(clerkUser?.externalAccounts) ? clerkUser.externalAccounts : [];
    return accounts.some((account) => {
      const text = [account.provider, account.strategy, account.providerName, account.identificationId].filter(Boolean).join(" ");
      return /google/i.test(text);
    });
  }

  function passwordHelperText(passwordEnabled, googleLinked) {
    if (passwordEnabled && googleLinked) return "Google sudah terhubung. Anda juga bisa masuk dengan email dan password.";
    if (passwordEnabled) return "Password sudah aktif. Klik edit untuk mengganti password.";
    if (googleLinked) return "Anda menggunakan Google untuk masuk. Ingin tambahkan password? Klik tombol tambah di samping.";
    return "Tambahkan password agar akun bisa masuk dengan email dan password.";
  }

  function readableClerkError(error) {
    const clerkMessage = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message;
    return clerkMessage || error?.message || "";
  }

  function formatRupiah(value) {
    const amount = Number(value || 0);
    if (!amount) return "";
    if (amount >= 1000000000) return "Rp " + (amount / 1000000000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " M";
    if (amount >= 1000000) return "Rp " + (amount / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " jt";
    return "Rp " + amount.toLocaleString("id-ID");
  }

  function formatFullRupiah(value) {
    const amount = Number(value || 0);
    if (!amount) return "Rp 0";
    return "Rp " + amount.toLocaleString("id-ID");
  }

  function setBusy(form, busy) {
    form.querySelectorAll("button, input, textarea, select").forEach((fieldNode) => {
      if (fieldNode.type === "hidden") return;
      if (fieldNode.hasAttribute("readonly")) return;
      fieldNode.disabled = busy;
    });
  }

  function setMessage(node, text, type) {
    if (!node) return;
    node.textContent = text;
    node.className = "fr-profile-message" + (type ? " is-" + type : "");
  }

  function errorBox(message) {
    return `<div class="fr-profile-error"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i><span>${escapeHtml(message)}</span></div>`;
  }

  function attr(value) {
    return escapeHtml(value == null ? "" : value);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[char];
    });
  }

  window.FranchiseProfileUi = {
    attr,
    emptyInline,
    emptyState,
    errorBox,
    escapeHtml,
    field,
    formatFullRupiah,
    formatRupiah,
    hasGoogleAccount,
    leadStatusOptions,
    passwordHelperText,
    readableClerkError,
    readonlyIdentity,
    roleBadges,
    setBusy,
    setMessage,
    statusLabel,
    textarea,
    whatsappLink,
  };
})(window);
