(function (window) {
  function createRenderer(state, helpers) {
    const attr = helpers.attr;
    const escapeHtml = helpers.escapeHtml;
    const hasRole = helpers.hasRole;
    const isStaffAccess = helpers.isStaffAccess;

    function roleAddOnPanel() {
      if (isStaffAccess()) return "";
      const actions = [];
      if (!hasRole("franchisor")) {
        actions.push({
          role: "franchisor",
          icon: "fa-store",
          title: "Punya brand franchise?",
          text: "Tambahkan akses untuk mengisi data brand, membuat listing, atau mengajukan klaim.",
          label: "Tambahkan brand franchise",
        });
      }
      if (!hasRole("franchisee")) {
        actions.push({
          role: "franchisee",
          icon: "fa-user-tie",
          title: "Ingin cari peluang juga?",
          text: "Tambahkan minat usaha agar rekomendasi dan informasi peluang lebih sesuai.",
          label: "Tambahkan minat usaha",
        });
      }
      if (!actions.length) return "";
      return `
        <div class="fr-profile-role-add">
          ${actions.map((action) => `
            <div class="fr-profile-role-card">
              <div>
                <h3><i class="fas ${action.icon}" aria-hidden="true"></i> ${escapeHtml(action.title)}</h3>
                <p>${escapeHtml(action.text)}</p>
              </div>
              <button class="fr-profile-secondary" type="button" data-open-role-add="${attr(action.role)}">
                <i class="fas fa-plus" aria-hidden="true"></i> ${escapeHtml(action.label)}
              </button>
            </div>
          `).join("")}
        </div>
      `;
    }

    function roleConfirmModal(role) {
      const copy = role === "franchisor"
        ? {
            icon: "fa-store",
            title: "Tambahkan akses brand?",
            text: "Akun ini tetap bisa dipakai untuk mencari peluang. Kami akan menambahkan akses untuk mengisi data brand dan listing.",
            button: "Lanjut isi data brand",
          }
        : {
            icon: "fa-user-tie",
            title: "Tambahkan minat usaha?",
            text: "Akun ini tetap bisa dipakai untuk mengelola brand. Kami akan menambahkan akses untuk menyimpan minat dan preferensi peluang.",
            button: "Lanjut isi minat usaha",
          };
      return `
        <div class="fr-profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-role-title">
          <div class="fr-profile-modal-card">
            <button class="fr-profile-modal-close" type="button" data-close-role-add aria-label="Tutup"><i class="fas fa-xmark" aria-hidden="true"></i></button>
            <div class="fr-profile-modal-icon"><i class="fas ${copy.icon}" aria-hidden="true"></i></div>
            <h2 id="profile-role-title">${escapeHtml(copy.title)}</h2>
            <p>${escapeHtml(copy.text)}</p>
            ${state.roleError ? `<p class="fr-profile-message is-error">${escapeHtml(state.roleError)}</p>` : ""}
            <div class="fr-profile-actions">
              <button class="fr-profile-button" type="button" data-confirm-role-add="${attr(role)}" ${state.roleBusy ? "disabled" : ""}>
                <i class="fas ${state.roleBusy ? "fa-spinner fa-spin" : "fa-arrow-right"}" aria-hidden="true"></i> ${state.roleBusy ? "Menyiapkan..." : escapeHtml(copy.button)}
              </button>
              <button class="fr-profile-secondary" type="button" data-close-role-add ${state.roleBusy ? "disabled" : ""}>
                <i class="fas fa-xmark" aria-hidden="true"></i> Batal
              </button>
            </div>
          </div>
        </div>
      `;
    }

    return { roleAddOnPanel, roleConfirmModal };
  }

  window.FranchiseProfileRoles = { createRenderer };
})(window);
