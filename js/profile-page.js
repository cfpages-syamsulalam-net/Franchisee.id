(function (window, document) {
  const Auth = window.FranchiseAuth;
  const root = document.querySelector("[data-profile-root]");
  if (!root || !Auth) return;

  const state = {
    data: null,
    activeTab: "summary",
    selectedFranchiseId: "",
    accountEditing: false,
  };

  const TAB_DEFS = [
    ["summary", "fa-gauge-high", "Ringkasan"],
    ["account", "fa-user-gear", "Akun"],
    ["franchisee", "fa-user-tie", "Franchisee"],
    ["franchisor", "fa-store", "Franchisor"],
    ["listing", "fa-pen-to-square", "Listing"],
    ["claims", "fa-certificate", "Klaim"],
  ];

  init();

  async function init() {
    try {
      const clerk = await Auth.init();
      if (!clerk?.session) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = "/login/?next=" + next;
        return;
      }
      await loadProfile();
      bindRootEvents();
    } catch (error) {
      root.innerHTML = errorBox(error.message || "Profil gagal dimuat.");
    }
  }

  async function loadProfile() {
    const headers = await Auth.getAuthHeaders();
    const response = await fetch("/profile-data", { headers });
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.message || "Profil gagal dimuat.");
    state.data = payload;
    if (!state.selectedFranchiseId && payload.owned_franchises?.length) {
      state.selectedFranchiseId = payload.owned_franchises[0].id;
    }
    render();
  }

  function bindRootEvents() {
    root.addEventListener("click", async function (event) {
      const tab = event.target.closest("[data-profile-tab]");
      if (tab) {
        state.activeTab = tab.getAttribute("data-profile-tab");
        render();
        return;
      }

      const accountEdit = event.target.closest("[data-account-edit]");
      if (accountEdit) {
        state.accountEditing = true;
        render();
        return;
      }

      const accountCancel = event.target.closest("[data-account-cancel]");
      if (accountCancel) {
        state.accountEditing = false;
        render();
      }
    });

    root.addEventListener("change", function (event) {
      if (event.target.matches("[data-franchise-select]")) {
        state.selectedFranchiseId = event.target.value;
        render();
      }
    });

    root.addEventListener("submit", async function (event) {
      const form = event.target.closest("[data-profile-form]");
      if (!form) return;
      event.preventDefault();
      await submitProfileForm(form);
    });
  }

  function render() {
    const data = state.data;
    root.innerHTML = `
      <div class="fr-profile-hero">
        <div>
          <p class="fr-profile-kicker">Profil Akun</p>
          <h1 class="fr-profile-title">${escapeHtml(data.user.display_name || "Akun")}</h1>
          <p class="fr-profile-subtitle">Kelola akun, data franchisee, data franchisor, dan listing brand dari satu tempat.</p>
        </div>
        <div class="fr-profile-badges">${roleBadges(data.user.roles)}</div>
      </div>
      <div class="fr-profile-layout">
        <aside class="fr-profile-tabs" aria-label="Menu profil">${renderTabs()}</aside>
        <section class="fr-profile-panel">${renderActivePanel()}</section>
      </div>
    `;
  }

  function renderTabs() {
    return TAB_DEFS.map(([id, icon, label]) => `
      <button class="fr-profile-tab ${state.activeTab === id ? "is-active" : ""}" type="button" data-profile-tab="${id}">
        <i class="fas ${icon}" aria-hidden="true"></i>
        <span>${label}</span>
      </button>
    `).join("");
  }

  function renderActivePanel() {
    if (state.activeTab === "account") return accountPanel();
    if (state.activeTab === "franchisee") return franchiseePanel();
    if (state.activeTab === "franchisor") return franchisorPanel();
    if (state.activeTab === "listing") return listingPanel();
    if (state.activeTab === "claims") return claimsPanel();
    return summaryPanel();
  }

  function summaryPanel() {
    const data = state.data;
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-gauge-high" aria-hidden="true"></i> Ringkasan</h2>
      <p class="fr-profile-copy">Status data utama akun Anda di Franchisee.id.</p>
      <div class="fr-profile-summary">
        <div class="fr-profile-stat"><strong>${data.completion.franchisee ? "Lengkap" : "Belum"}</strong><span>Profil franchisee</span></div>
        <div class="fr-profile-stat"><strong>${data.completion.franchisor ? "Lengkap" : "Belum"}</strong><span>Profil franchisor</span></div>
        <div class="fr-profile-stat"><strong>${data.owned_franchises.length}</strong><span>Listing dimiliki</span></div>
      </div>
      ${data.user.is_staff_access ? `<p><a class="fr-profile-secondary" href="/dashboard/"><i class="fas fa-table-columns" aria-hidden="true"></i> Buka Dashboard</a></p>` : ""}
      ${!data.completion.franchisee || !data.completion.franchisor ? `
        <div class="fr-profile-notice">
          <i class="fas fa-circle-info" aria-hidden="true"></i>
          <div>Data awal tetap dilengkapi lewat halaman daftar. Setelah lengkap, halaman daftar akan mengarahkan kembali ke profil ini.</div>
        </div>
      ` : ""}
    `;
  }

  function accountPanel() {
    const user = state.data.user;
    const readonly = state.accountEditing ? "" : "readonly";
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-user-gear" aria-hidden="true"></i> Akun</h2>
      <p class="fr-profile-copy">Nama dan email berasal dari identitas Clerk dan disinkronkan ke D1.</p>
      <form data-profile-form="account">
        <div class="fr-profile-grid">
          <div class="fr-profile-field">
            <label for="profile-display-name"><i class="fas fa-id-card" aria-hidden="true"></i> Nama</label>
            <div class="fr-profile-inline">
              <input id="profile-display-name" name="display_name" value="${attr(user.display_name)}" ${readonly} required>
              ${state.accountEditing ? "" : `<button class="fr-profile-icon-button" type="button" data-account-edit title="Edit nama dan email"><i class="fas fa-pen" aria-hidden="true"></i></button>`}
            </div>
          </div>
          <div class="fr-profile-field">
            <label for="profile-email"><i class="fas fa-envelope" aria-hidden="true"></i> Email</label>
            <input id="profile-email" name="email" type="email" value="${attr(user.email)}" ${readonly} required>
          </div>
        </div>
        <p class="fr-profile-message" data-profile-message></p>
        ${state.accountEditing ? `
          <div class="fr-profile-actions">
            <button class="fr-profile-button" type="submit"><i class="fas fa-floppy-disk" aria-hidden="true"></i> Simpan Akun</button>
            <button class="fr-profile-secondary" type="button" data-account-cancel><i class="fas fa-xmark" aria-hidden="true"></i> Batal</button>
          </div>
        ` : ""}
      </form>
    `;
  }

  function franchiseePanel() {
    const profile = state.data.franchisee_profile;
    if (!profile) return emptyState("fa-user-tie", "Profil franchisee belum lengkap", "/daftar/?role=franchisee&continue=1");
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-user-tie" aria-hidden="true"></i> Data Franchisee</h2>
      <p class="fr-profile-copy">Nama dan email dikunci dari data akun. Field minat dapat diperbarui di sini.</p>
      <form data-profile-form="franchisee">
        <div class="fr-profile-grid">
          ${readonlyIdentity("Nama", "name", profile.name)}
          ${readonlyIdentity("Email", "email", profile.email)}
          ${field("Kode Negara", "country_code", profile.country_code, "fa-globe")}
          ${field("WhatsApp", "whatsapp", profile.whatsapp, "fa-whatsapp")}
          ${field("Kota Domisili", "city_origin", profile.city_origin, "fa-location-dot")}
          ${field("Minat Kategori", "interest_category", profile.interest_category, "fa-tags")}
          ${field("Budget Investasi", "budget_range", profile.budget_range, "fa-wallet")}
          ${field("Rencana Lokasi", "location_plan", profile.location_plan, "fa-map-location-dot")}
          ${textarea("Pesan Tambahan", "message", profile.message, "fa-message")}
        </div>
        <p class="fr-profile-message" data-profile-message></p>
        <div class="fr-profile-actions">
          <button class="fr-profile-button" type="submit"><i class="fas fa-floppy-disk" aria-hidden="true"></i> Simpan Franchisee</button>
        </div>
      </form>
    `;
  }

  function franchisorPanel() {
    const profile = state.data.franchisor_profile;
    if (!profile) return emptyState("fa-store", "Profil franchisor belum lengkap", "/daftar/?role=franchisor&continue=1");
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-store" aria-hidden="true"></i> Data Franchisor</h2>
      <p class="fr-profile-copy">PIC dan email kontak mengikuti identitas akun. Data perusahaan dan kanal resmi dapat diperbarui.</p>
      <form data-profile-form="franchisor">
        <div class="fr-profile-grid">
          ${readonlyIdentity("PIC", "pic_name", profile.pic_name)}
          ${readonlyIdentity("Email Kontak", "email_contact", profile.email_contact)}
          ${field("Nama Perusahaan", "company_name", profile.company_name, "fa-building")}
          ${field("Kode Negara", "country_code", profile.country_code, "fa-globe")}
          ${field("WhatsApp", "whatsapp", profile.whatsapp, "fa-whatsapp")}
          ${field("Website", "website_url", profile.website_url, "fa-link")}
          ${field("Instagram", "instagram_url", profile.instagram_url, "fa-instagram")}
          ${field("Facebook", "facebook_url", profile.facebook_url, "fa-facebook")}
          ${field("TikTok", "tiktok_url", profile.tiktok_url, "fa-music")}
          ${field("YouTube", "youtube_url", profile.youtube_url, "fa-youtube")}
          ${field("LinkedIn", "linkedin_url", profile.linkedin_url, "fa-linkedin")}
          ${field("NIB", "nib_number", profile.nib_number, "fa-file-signature")}
          ${field("Status HAKI", "haki_status", profile.haki_status, "fa-shield-halved")}
          ${field("Nomor HAKI", "haki_number", profile.haki_number, "fa-hashtag")}
        </div>
        <p class="fr-profile-message" data-profile-message></p>
        <div class="fr-profile-actions">
          <button class="fr-profile-button" type="submit"><i class="fas fa-floppy-disk" aria-hidden="true"></i> Simpan Franchisor</button>
        </div>
      </form>
    `;
  }

  function listingPanel() {
    const listings = state.data.owned_franchises || [];
    if (!listings.length) return emptyState("fa-pen-to-square", "Belum ada listing milik akun ini", "/daftar/?role=franchisor&continue=1");
    const selected = listings.find((item) => item.id === state.selectedFranchiseId) || listings[0];
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-pen-to-square" aria-hidden="true"></i> Listing Brand</h2>
      <p class="fr-profile-copy">Edit owner diterapkan langsung ke D1, lalu masuk publish queue. Satu listing hanya bisa diedit sekali setiap ${selected.edit_interval_hours || 6} jam.</p>
      <div class="fr-profile-select-row">
        <i class="fas fa-list" aria-hidden="true"></i>
        <select data-franchise-select>${listings.map((item) => `<option value="${attr(item.id)}" ${item.id === selected.id ? "selected" : ""}>${escapeHtml(item.brand_name || item.slug || item.id)}</option>`).join("")}</select>
      </div>
      ${selected.edit_locked ? `<div class="fr-profile-notice"><i class="fas fa-clock" aria-hidden="true"></i><div>Listing ini baru diedit pada ${escapeHtml(selected.last_owner_edit_at || "beberapa waktu lalu")}. Tunggu sebelum menyimpan perubahan berikutnya.</div></div>` : ""}
      <form data-profile-form="listing">
        <input type="hidden" name="franchise_id" value="${attr(selected.id)}">
        <div class="fr-profile-grid">
          ${field("Nama Brand", "brand_name", selected.brand_name, "fa-store")}
          ${field("Kategori", "category", selected.category, "fa-tags")}
          ${field("Tahun Berdiri", "year_established", selected.year_established, "fa-calendar")}
          ${field("Kota Asal", "city_origin", selected.city_origin, "fa-location-dot")}
          ${field("Min Investasi", "min_investment_idr", selected.min_investment_idr, "fa-wallet")}
          ${field("Total Investasi", "total_investment_idr", selected.total_investment_idr, "fa-coins")}
          ${field("WhatsApp/Telepon", "phone", selected.phone, "fa-phone")}
          ${field("Alamat Kantor", "office_address", selected.office_address, "fa-building")}
          ${textarea("Deskripsi Singkat", "short_desc", selected.short_desc, "fa-align-left")}
          ${textarea("Deskripsi Lengkap", "full_desc", selected.full_desc, "fa-file-lines")}
          ${textarea("Support System", "support_system", selected.support_system, "fa-handshake-angle")}
          ${field("Logo URL", "logo_url", selected.logo_url, "fa-image")}
          ${field("Cover URL", "cover_url", selected.cover_url, "fa-panorama")}
          ${field("Proposal URL", "proposal_url", selected.proposal_url, "fa-file-pdf")}
        </div>
        <p class="fr-profile-message" data-profile-message></p>
        <div class="fr-profile-actions">
          <button class="fr-profile-button" type="submit" ${selected.edit_locked ? "disabled" : ""}><i class="fas fa-floppy-disk" aria-hidden="true"></i> Simpan Listing</button>
          ${selected.slug ? `<a class="fr-profile-secondary" href="/peluang-usaha/${encodeURIComponent(selected.slug)}"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Lihat Halaman</a>` : ""}
        </div>
      </form>
    `;
  }

  function claimsPanel() {
    const claims = state.data.claims || [];
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-certificate" aria-hidden="true"></i> Klaim Brand</h2>
      <p class="fr-profile-copy">Riwayat klaim brand yang pernah diajukan akun ini.</p>
      ${claims.length ? `<div class="fr-profile-list">${claims.map((claim) => `
        <div class="fr-profile-list-item">
          <strong>${escapeHtml(claim.brand_name || claim.franchise_id)}</strong>
          <div class="fr-profile-muted">${escapeHtml(claim.status || "pending")} · ${escapeHtml(claim.created_at || "")}</div>
        </div>
      `).join("")}</div>` : `<div class="fr-profile-notice"><i class="fas fa-circle-info" aria-hidden="true"></i><div>Belum ada klaim brand.</div></div>`}
    `;
  }

  function emptyState(icon, text, href) {
    return `
      <h2 class="fr-profile-section-title"><i class="fas ${icon}" aria-hidden="true"></i> ${escapeHtml(text)}</h2>
      <p class="fr-profile-copy">Gunakan alur daftar untuk mengisi data awal, lalu kembali ke profil untuk perubahan berikutnya.</p>
      <p><a class="fr-profile-button" href="${attr(href)}"><i class="fas fa-arrow-right" aria-hidden="true"></i> Lengkapi Data</a></p>
    `;
  }

  async function submitProfileForm(form) {
    const type = form.getAttribute("data-profile-form");
    const message = form.querySelector("[data-profile-message]");
    setMessage(message, "Menyimpan...", "");
    setBusy(form, true);
    try {
      const body = Object.fromEntries(new FormData(form).entries());
      body.action = {
        account: "update_account",
        franchisee: "update_franchisee_profile",
        franchisor: "update_franchisor_profile",
        listing: "update_listing",
      }[type];
      const headers = await Auth.getAuthHeaders();
      const response = await fetch("/profile-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || "Data gagal disimpan.");
      setMessage(message, "Tersimpan.", "success");
      state.accountEditing = false;
      await loadProfile();
    } catch (error) {
      setMessage(message, error.message || "Data gagal disimpan.", "error");
    } finally {
      setBusy(form, false);
    }
  }

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

  function setBusy(form, busy) {
    form.querySelectorAll("button, input, textarea, select").forEach((field) => {
      if (field.hasAttribute("readonly")) return;
      field.disabled = busy;
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
})(window, document);
