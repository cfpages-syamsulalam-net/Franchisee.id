(function (window, document) {
  const Auth = window.FranchiseAuth;
  const root = document.querySelector("[data-profile-root]");
  if (!root || !Auth) return;

  const state = {
    data: null,
    activeTab: "summary",
    selectedFranchiseId: "",
    accountEditing: false,
    confirmRole: "",
    roleBusy: false,
    roleError: "",
    savedOpportunities: [],
    opportunityBusyId: "",
    opportunityMessage: null,
  };

  const TAB_DEFS = [
    ["summary", "fa-gauge-high", "Ringkasan"],
    ["account", "fa-user-gear", "Akun"],
    ["franchisee", "fa-user-tie", "Franchisee"],
    ["opportunities", "fa-heart", "Peluang Saya"],
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
    state.savedOpportunities = loadSavedOpportunities(payload.user?.id);
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
        return;
      }

      const openRoleAdd = event.target.closest("[data-open-role-add]");
      if (openRoleAdd) {
        state.confirmRole = openRoleAdd.getAttribute("data-open-role-add") || "";
        state.roleError = "";
        render();
        return;
      }

      const closeRoleAdd = event.target.closest("[data-close-role-add]");
      if (closeRoleAdd) {
        state.confirmRole = "";
        state.roleError = "";
        render();
        return;
      }

      const confirmRoleAdd = event.target.closest("[data-confirm-role-add]");
      if (confirmRoleAdd) {
        await submitPublicRoleAdd(confirmRoleAdd.getAttribute("data-confirm-role-add"));
        return;
      }

      const saveOpportunity = event.target.closest("[data-save-opportunity]");
      if (saveOpportunity) {
        toggleSavedOpportunity(saveOpportunity.getAttribute("data-save-opportunity"));
        render();
        return;
      }

      const createInquiry = event.target.closest("[data-create-inquiry]");
      if (createInquiry) {
        await submitFranchiseInquiry(createInquiry.getAttribute("data-create-inquiry"));
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
    ensureAllowedActiveTab();
    root.innerHTML = `
      <div class="fr-profile-hero">
        <div>
          <p class="fr-profile-kicker">Profil Akun</p>
          <h1 class="fr-profile-title">${escapeHtml(data.user.display_name || "Akun")}</h1>
      <p class="fr-profile-subtitle">Kelola akun, minat kemitraan, data brand, dan listing dari satu tempat.</p>
        </div>
        <div class="fr-profile-badges">${roleBadges(data.user.roles)}</div>
      </div>
      <div class="fr-profile-layout">
        <aside class="fr-profile-tabs" aria-label="Menu profil">${renderTabs()}</aside>
        <section class="fr-profile-panel">${renderActivePanel()}</section>
      </div>
      ${state.confirmRole ? roleConfirmModal(state.confirmRole) : ""}
    `;
  }

  function renderTabs() {
    return visibleTabs().map(([id, icon, label]) => `
      <button class="fr-profile-tab ${state.activeTab === id ? "is-active" : ""}" type="button" data-profile-tab="${id}">
        <i class="fas ${icon}" aria-hidden="true"></i>
        <span>${label}</span>
      </button>
    `).join("");
  }

  function renderActivePanel() {
    if (state.activeTab === "account") return accountPanel();
    if (state.activeTab === "franchisee") return franchiseePanel();
    if (state.activeTab === "opportunities") return opportunitiesPanel();
    if (state.activeTab === "franchisor") return franchisorPanel();
    if (state.activeTab === "listing") return listingPanel();
    if (state.activeTab === "claims") return claimsPanel();
    return summaryPanel();
  }

  function summaryPanel() {
    const data = state.data;
    const showFranchisee = canSeeFranchisee();
    const showFranchisor = canSeeFranchisor();
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-gauge-high" aria-hidden="true"></i> Ringkasan</h2>
      <p class="fr-profile-copy">Status data utama akun Anda di Franchisee.id.</p>
      <div class="fr-profile-summary">
        ${showFranchisee ? `<div class="fr-profile-stat"><strong>${data.completion.franchisee ? "Lengkap" : "Belum"}</strong><span>Minat usaha</span></div>` : ""}
        ${showFranchisee ? `<div class="fr-profile-stat"><strong>${state.savedOpportunities.length}</strong><span>Peluang tersimpan</span></div>` : ""}
        ${showFranchisor ? `<div class="fr-profile-stat"><strong>${data.completion.franchisor ? "Lengkap" : "Belum"}</strong><span>Data brand</span></div>` : ""}
        ${showFranchisor ? `<div class="fr-profile-stat"><strong>${data.owned_franchises.length}</strong><span>Listing dimiliki</span></div>` : ""}
      </div>
      ${data.user.is_staff_access ? `<p><a class="fr-profile-secondary" href="/dashboard/"><i class="fas fa-table-columns" aria-hidden="true"></i> Buka Dashboard</a></p>` : ""}
      ${(showFranchisee && !data.completion.franchisee) || (showFranchisor && !data.completion.franchisor) ? `
        <div class="fr-profile-notice">
          <i class="fas fa-circle-info" aria-hidden="true"></i>
          <div>
            <strong>Ada data yang belum lengkap.</strong>
            <div class="fr-profile-notice-actions">
              ${showFranchisee && !data.completion.franchisee ? `<a class="fr-profile-inline-cta" href="/daftar/?role=franchisee&continue=1"><i class="fas fa-user-tie" aria-hidden="true"></i> Lengkapi minat usaha</a>` : ""}
              ${showFranchisor && !data.completion.franchisor ? `<a class="fr-profile-inline-cta" href="/daftar/?role=franchisor&continue=1"><i class="fas fa-store" aria-hidden="true"></i> Lengkapi data brand</a>` : ""}
            </div>
          </div>
        </div>
      ` : ""}
      ${roleAddOnPanel()}
    `;
  }

  function accountPanel() {
    const user = state.data.user;
    const readonly = state.accountEditing ? "" : "readonly";
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-user-gear" aria-hidden="true"></i> Akun</h2>
      <p class="fr-profile-copy">Nama dan email digunakan sebagai identitas akun Anda.</p>
      <form data-profile-form="account">
        <div class="fr-profile-grid">
          <div class="fr-profile-field">
            <label for="profile-display-name"><i class="fas fa-id-card" aria-hidden="true"></i> Nama</label>
            <div class="fr-profile-inline">
              <input id="profile-display-name" name="display_name" value="${attr(user.display_name)}" ${readonly} required>
              ${state.accountEditing ? "" : `<button class="fr-profile-icon-button" type="button" data-account-edit aria-label="Edit nama dan email" data-fr-tooltip="Edit nama dan email"><i class="fas fa-pen" aria-hidden="true"></i></button>`}
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
    if (!profile) return emptyState("fa-user-tie", "Minat usaha belum lengkap", "/daftar/?role=franchisee&continue=1");
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-user-tie" aria-hidden="true"></i> Minat Usaha</h2>
      <p class="fr-profile-copy">Nama dan email mengikuti akun Anda. Minat dan preferensi bisa diperbarui di sini.</p>
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
          <button class="fr-profile-button" type="submit"><i class="fas fa-floppy-disk" aria-hidden="true"></i> Simpan Minat</button>
        </div>
      </form>
    `;
  }

  function opportunitiesPanel() {
    const profile = state.data.franchisee_profile;
    if (!profile) return emptyState("fa-heart", "Peluang belum bisa dipersonalisasi", "/daftar/?role=franchisee&continue=1");
    const recommendations = state.data.franchisee_recommendations || [];
    const inquiries = state.data.inquiry_history || [];
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-heart" aria-hidden="true"></i> Peluang Saya</h2>
      <p class="fr-profile-copy">Rekomendasi dan riwayat minat berdasarkan kategori, budget, dan data kontak Anda.</p>
      ${state.opportunityMessage ? `<p class="fr-profile-message is-${attr(state.opportunityMessage.type)}">${escapeHtml(state.opportunityMessage.text)}</p>` : ""}
      <div class="fr-profile-value-grid">
        <section class="fr-profile-value-section">
          <div class="fr-profile-section-head">
            <h3><i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i> Rekomendasi</h3>
            <a href="/peluang-usaha/" class="fr-profile-text-link">Lihat semua</a>
          </div>
          ${recommendations.length ? recommendations.map((item) => opportunityCard(item)).join("") : emptyInline("Belum ada rekomendasi yang cocok. Perbarui minat dan budget Anda.")}
        </section>
        <section class="fr-profile-value-section">
          <div class="fr-profile-section-head">
            <h3><i class="fas fa-bookmark" aria-hidden="true"></i> Tersimpan</h3>
          </div>
          ${state.savedOpportunities.length ? state.savedOpportunities.map((item) => opportunityCard(item, { compact: true })).join("") : emptyInline("Belum ada peluang tersimpan. Simpan rekomendasi untuk dibandingkan nanti.")}
        </section>
      </div>
      <section class="fr-profile-value-section is-full">
        <div class="fr-profile-section-head">
          <h3><i class="fas fa-clock-rotate-left" aria-hidden="true"></i> Riwayat Minat</h3>
        </div>
        ${inquiries.length ? `<div class="fr-profile-list">${inquiries.map((lead) => `
          <div class="fr-profile-list-item">
            <strong>${escapeHtml(lead.brand_name || lead.franchise_id)}</strong>
            <div class="fr-profile-muted">${escapeHtml(statusLabel(lead.status))} · ${escapeHtml(lead.created_at || "")}</div>
            ${lead.message ? `<p class="fr-profile-list-copy">${escapeHtml(lead.message)}</p>` : ""}
          </div>
        `).join("")}</div>` : emptyInline("Belum ada permintaan info yang dikirim.")}
      </section>
    `;
  }

  function franchisorPanel() {
    const profile = state.data.franchisor_profile;
    if (!profile) return emptyState("fa-store", "Data brand belum lengkap", "/daftar/?role=franchisor&continue=1");
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-store" aria-hidden="true"></i> Data Brand</h2>
      <p class="fr-profile-copy">Nama kontak dan email mengikuti akun Anda. Data perusahaan dan kanal resmi bisa diperbarui.</p>
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
          <button class="fr-profile-button" type="submit"><i class="fas fa-floppy-disk" aria-hidden="true"></i> Simpan Brand</button>
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
      <p class="fr-profile-copy">Perubahan listing akan disimpan dan tampil setelah halaman diperbarui. Untuk menjaga kualitas data, satu listing bisa diedit setiap ${selected.edit_interval_hours || 6} jam.</p>
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
      <p class="fr-profile-copy">Lengkapi form singkat agar bagian ini siap digunakan.</p>
      <p><a class="fr-profile-button" href="${attr(href)}"><i class="fas fa-arrow-right" aria-hidden="true"></i> Lengkapi Sekarang</a></p>
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

  async function submitPublicRoleAdd(role) {
    if (!["franchisee", "franchisor"].includes(role) || state.roleBusy) return;
    state.roleBusy = true;
    state.roleError = "";
    render();
    try {
      const headers = await Auth.getAuthHeaders();
      const response = await fetch("/profile-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "add_public_role", role }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || "Akses belum bisa ditambahkan.");
      window.location.href = `/daftar/?role=${encodeURIComponent(role)}&continue=1`;
    } catch (error) {
      state.roleBusy = false;
      state.roleError = error.message || "Akses belum bisa ditambahkan.";
      render();
    }
  }

  async function submitFranchiseInquiry(franchiseId) {
    if (!franchiseId || state.opportunityBusyId) return;
    state.opportunityBusyId = franchiseId;
    state.opportunityMessage = null;
    render();
    try {
      const item = opportunityById(franchiseId);
      const headers = await Auth.getAuthHeaders();
      const response = await fetch("/profile-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "create_franchise_inquiry",
          franchise_id: franchiseId,
          message: item?.brand_name ? `Saya tertarik dengan ${item.brand_name}.` : "",
        }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || "Permintaan info belum terkirim.");
      state.opportunityMessage = { type: "success", text: payload.already_sent ? "Anda sudah pernah meminta info untuk brand ini." : "Permintaan info terkirim." };
      state.opportunityBusyId = "";
      await loadProfile();
    } catch (error) {
      state.opportunityBusyId = "";
      state.opportunityMessage = { type: "error", text: error.message || "Permintaan info belum terkirim." };
      render();
    } finally {
      state.opportunityBusyId = "";
    }
  }

  function opportunityCard(item, options = {}) {
    const saved = isOpportunitySaved(item.id);
    const asked = hasAskedInfo(item.id);
    return `
      <article class="fr-profile-opportunity ${options.compact ? "is-compact" : ""}">
        <div>
          <div class="fr-profile-opportunity-title">
            <strong>${escapeHtml(item.brand_name || "Peluang franchise")}</strong>
            <span class="fr-profile-fit is-${attr(item.budget_fit || "unknown")}">${escapeHtml(item.budget_label || "Budget belum tersedia")}</span>
          </div>
          <div class="fr-profile-muted">${escapeHtml(item.category || "Kategori belum tersedia")} ${item.min_investment_idr ? "· " + escapeHtml(formatRupiah(item.min_investment_idr)) : ""}</div>
          ${item.short_desc && !options.compact ? `<p class="fr-profile-list-copy">${escapeHtml(item.short_desc)}</p>` : ""}
          ${item.reasons?.length && !options.compact ? `<div class="fr-profile-chip-row">${item.reasons.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}</div>` : ""}
        </div>
        <div class="fr-profile-opportunity-actions">
          <button class="fr-profile-secondary" type="button" data-save-opportunity="${attr(item.id)}">
            <i class="fas fa-bookmark" aria-hidden="true"></i> ${saved ? "Tersimpan" : "Simpan"}
          </button>
          <button class="fr-profile-button" type="button" data-create-inquiry="${attr(item.id)}" ${asked || state.opportunityBusyId === item.id ? "disabled" : ""}>
            <i class="fas ${state.opportunityBusyId === item.id ? "fa-spinner fa-spin" : "fa-paper-plane"}" aria-hidden="true"></i> ${asked ? "Info diminta" : "Minta info"}
          </button>
          ${item.canonical_url || item.slug ? `<a class="fr-profile-text-link" href="${attr(item.canonical_url || "/peluang-usaha/" + item.slug)}">Detail</a>` : ""}
        </div>
      </article>
    `;
  }

  function emptyInline(text) {
    return `<div class="fr-profile-empty-inline"><i class="fas fa-circle-info" aria-hidden="true"></i><span>${escapeHtml(text)}</span></div>`;
  }

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

  function visibleTabs() {
    return TAB_DEFS.filter(([id]) => {
      if (id === "franchisee" || id === "opportunities") return canSeeFranchisee();
      if (id === "franchisor" || id === "listing" || id === "claims") return canSeeFranchisor();
      return true;
    });
  }

  function ensureAllowedActiveTab() {
    const allowed = visibleTabs().some(([id]) => id === state.activeTab);
    if (!allowed) state.activeTab = "summary";
  }

  function canSeeFranchisee() {
    return isStaffAccess() || hasRole("franchisee");
  }

  function canSeeFranchisor() {
    return isStaffAccess() || hasRole("franchisor");
  }

  function isStaffAccess() {
    return Boolean(state.data?.user?.is_staff_access);
  }

  function hasRole(role) {
    return (state.data?.user?.roles || []).includes(role);
  }

  function savedStorageKey(userId) {
    return `franchise_profile_saved_opportunities:${userId || "anonymous"}`;
  }

  function loadSavedOpportunities(userId) {
    try {
      const raw = window.localStorage.getItem(savedStorageKey(userId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => item?.id).slice(0, 24) : [];
    } catch (_error) {
      return [];
    }
  }

  function persistSavedOpportunities() {
    try {
      window.localStorage.setItem(savedStorageKey(state.data?.user?.id), JSON.stringify(state.savedOpportunities.slice(0, 24)));
    } catch (_error) {
      // Browser storage can be unavailable in private modes; saving is a convenience feature.
    }
  }

  function toggleSavedOpportunity(franchiseId) {
    if (!franchiseId) return;
    if (isOpportunitySaved(franchiseId)) {
      state.savedOpportunities = state.savedOpportunities.filter((item) => item.id !== franchiseId);
    } else {
      const item = opportunityById(franchiseId);
      if (item) state.savedOpportunities = [item, ...state.savedOpportunities].slice(0, 24);
    }
    persistSavedOpportunities();
  }

  function isOpportunitySaved(franchiseId) {
    return state.savedOpportunities.some((item) => item.id === franchiseId);
  }

  function opportunityById(franchiseId) {
    return [...(state.data?.franchisee_recommendations || []), ...state.savedOpportunities].find((item) => item.id === franchiseId);
  }

  function hasAskedInfo(franchiseId) {
    return (state.data?.inquiry_history || []).some((lead) => lead.franchise_id === franchiseId);
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

  function formatRupiah(value) {
    const amount = Number(value || 0);
    if (!amount) return "";
    if (amount >= 1000000000) return "Rp " + (amount / 1000000000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " M";
    if (amount >= 1000000) return "Rp " + (amount / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " jt";
    return "Rp " + amount.toLocaleString("id-ID");
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
