(function (window, document) {
  const Auth = window.FranchiseAuth;
  const root = document.querySelector("[data-profile-root]");
  if (!root || !Auth) return;

  const state = {
    data: null,
    activeTab: initialProfileTab(),
    selectedFranchiseId: "",
    accountEditingField: "",
    accountMessage: null,
    clerk: null,
    confirmRole: "",
    roleBusy: false,
    roleError: "",
    savedOpportunities: [],
    savedBusyId: "",
    opportunityBusyId: "",
    opportunityMessage: null,
    uploadBusyKey: "",
    uploadMessage: null,
    leadBusyId: "",
    leadMessage: null,
    premiumBusyId: "",
    premiumMessage: null,
  };

  const TAB_DEFS = [
    ["summary", "fa-gauge-high", "Ringkasan"],
    ["account", "fa-user-gear", "Akun"],
    ["franchisee", "fa-user-tie", "Franchisee"],
    ["opportunities", "fa-heart", "Peluang Saya"],
    ["franchisor", "fa-store", "Franchisor"],
    ["listing", "fa-pen-to-square", "Listing"],
    ["leads", "fa-inbox", "Leads"],
    ["membership", "fa-crown", "Membership"],
    ["claims", "fa-certificate", "Klaim"],
  ];

  init();

  function initialProfileTab() {
    const params = new URLSearchParams(window.location.search || "");
    return params.get("tab") || "summary";
  }

  async function init() {
    try {
      const clerk = await Auth.init();
      state.clerk = clerk;
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
    const localSaved = loadSavedOpportunities(payload.user?.id);
    state.savedOpportunities = mergeSavedOpportunities(payload.saved_opportunities || [], localSaved);
    render();
    syncLocalSavedOpportunities(payload.user?.id, localSaved);
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
        state.accountEditingField = accountEdit.getAttribute("data-account-edit") || "";
        state.accountMessage = null;
        render();
        return;
      }

      const accountCancel = event.target.closest("[data-account-cancel]");
      if (accountCancel) {
        state.accountEditingField = "";
        state.accountMessage = null;
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
        await toggleSavedOpportunity(saveOpportunity.getAttribute("data-save-opportunity"));
        return;
      }

      const createInquiry = event.target.closest("[data-create-inquiry]");
      if (createInquiry) {
        await submitFranchiseInquiry(createInquiry.getAttribute("data-create-inquiry"));
        return;
      }

      const createPremium = event.target.closest("[data-create-premium-order]");
      if (createPremium) {
        await createPremiumOrder(createPremium.getAttribute("data-create-premium-order"));
      }
    });

    root.addEventListener("change", function (event) {
      if (event.target.matches("[data-media-upload]")) {
        uploadListingMedia(event.target);
        return;
      }

      if (event.target.matches("[data-lead-status]")) {
        updateLeadStatus(event.target);
        return;
      }

      if (event.target.matches("[data-franchise-select]")) {
        state.selectedFranchiseId = event.target.value;
        state.uploadMessage = null;
        render();
      }
    });

    root.addEventListener("submit", async function (event) {
      const passwordForm = event.target.closest("[data-password-form]");
      if (passwordForm) {
        event.preventDefault();
        await submitPasswordForm(passwordForm);
        return;
      }

      const premiumForm = event.target.closest("[data-premium-confirm-form]");
      if (premiumForm) {
        event.preventDefault();
        await submitPremiumConfirmation(premiumForm);
        return;
      }

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
    if (state.activeTab === "leads") return leadsPanel();
    if (state.activeTab === "membership") return membershipPanel();
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
        ${showFranchisor ? `<div class="fr-profile-stat"><strong>${data.franchisor_leads?.length || 0}</strong><span>Lead masuk</span></div>` : ""}
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
    const clerkUser = state.clerk?.user || Auth.clerk?.user || {};
    const passwordEnabled = Boolean(clerkUser.passwordEnabled);
    const googleLinked = hasGoogleAccount(clerkUser);
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-user-gear" aria-hidden="true"></i> Akun</h2>
      <p class="fr-profile-copy">Kelola nama, email, dan cara masuk akun Anda.</p>
      ${state.accountMessage ? `<p class="fr-profile-message is-${attr(state.accountMessage.type)}">${escapeHtml(state.accountMessage.text)}</p>` : ""}
      <div class="fr-profile-account-list">
        ${accountFieldForm({
          field: "display_name",
          icon: "fa-id-card",
          label: "Nama",
          value: user.display_name,
          type: "text",
          otherName: "email",
          otherValue: user.email,
          buttonLabel: "Edit nama",
        })}
        ${accountFieldForm({
          field: "email",
          icon: "fa-envelope",
          label: "Email",
          value: user.email,
          type: "email",
          otherName: "display_name",
          otherValue: user.display_name,
          buttonLabel: "Edit email",
        })}
        <section class="fr-profile-account-row">
          <div class="fr-profile-account-main">
            <label for="profile-password-view"><i class="fas fa-lock" aria-hidden="true"></i> Password</label>
            <div class="fr-profile-inline">
              <input id="profile-password-view" type="password" value="${passwordEnabled ? "********" : ""}" readonly placeholder="${passwordEnabled ? "" : "Belum ditambahkan"}">
              ${state.accountEditingField === "password" ? "" : `<button class="fr-profile-icon-button" type="button" data-account-edit="password" aria-label="${passwordEnabled ? "Edit password" : "Tambah password"}" data-fr-tooltip="${passwordEnabled ? "Edit password" : "Tambah password"}"><i class="fas ${passwordEnabled ? "fa-pen" : "fa-plus"}" aria-hidden="true"></i></button>`}
            </div>
            <p class="fr-profile-field-note">${escapeHtml(passwordHelperText(passwordEnabled, googleLinked))}</p>
          </div>
          ${state.accountEditingField === "password" ? passwordEditForm(passwordEnabled) : ""}
        </section>
      </div>
    `;
  }

  function accountFieldForm(config) {
    const editing = state.accountEditingField === config.field;
    return `
      <form class="fr-profile-account-row" data-profile-form="account">
        <input type="hidden" name="${attr(config.otherName)}" value="${attr(config.otherValue)}">
        <div class="fr-profile-account-main">
          <label for="profile-${attr(config.field)}"><i class="fas ${attr(config.icon)}" aria-hidden="true"></i> ${escapeHtml(config.label)}</label>
          <div class="fr-profile-inline">
            <input id="profile-${attr(config.field)}" name="${attr(config.field)}" type="${attr(config.type)}" value="${attr(config.value)}" ${editing ? "" : "readonly"} required>
            ${editing ? "" : `<button class="fr-profile-icon-button" type="button" data-account-edit="${attr(config.field)}" aria-label="${attr(config.buttonLabel)}" data-fr-tooltip="${attr(config.buttonLabel)}"><i class="fas fa-pen" aria-hidden="true"></i></button>`}
          </div>
          <p class="fr-profile-message" data-profile-message></p>
        </div>
        ${editing ? `
          <div class="fr-profile-account-actions">
            <button class="fr-profile-button" type="submit"><i class="fas fa-floppy-disk" aria-hidden="true"></i> Simpan</button>
            <button class="fr-profile-secondary" type="button" data-account-cancel><i class="fas fa-xmark" aria-hidden="true"></i> Batal</button>
          </div>
        ` : ""}
      </form>
    `;
  }

  function passwordEditForm(passwordEnabled) {
    return `
      <form class="fr-profile-password-form" data-password-form>
        ${passwordEnabled ? `
          <div class="fr-profile-field">
            <label for="profile-current-password"><i class="fas fa-key" aria-hidden="true"></i> Password saat ini</label>
            <input id="profile-current-password" name="current_password" type="password" autocomplete="current-password" required>
          </div>
        ` : ""}
        <div class="fr-profile-password-grid">
          <div class="fr-profile-field">
            <label for="profile-new-password"><i class="fas fa-lock" aria-hidden="true"></i> Password baru</label>
            <input id="profile-new-password" name="new_password" type="password" autocomplete="new-password" minlength="8" required>
          </div>
          <div class="fr-profile-field">
            <label for="profile-confirm-password"><i class="fas fa-check" aria-hidden="true"></i> Ulangi password baru</label>
            <input id="profile-confirm-password" name="confirm_password" type="password" autocomplete="new-password" minlength="8" required>
          </div>
        </div>
        <label class="fr-profile-checkbox">
          <input type="checkbox" name="sign_out_other_sessions">
          <span>Keluar dari perangkat lain setelah password diganti.</span>
        </label>
        <p class="fr-profile-message" data-profile-message></p>
        <div class="fr-profile-account-actions">
          <button class="fr-profile-button" type="submit"><i class="fas fa-floppy-disk" aria-hidden="true"></i> ${passwordEnabled ? "Ganti Password" : "Tambah Password"}</button>
          <button class="fr-profile-secondary" type="button" data-account-cancel><i class="fas fa-xmark" aria-hidden="true"></i> Batal</button>
        </div>
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
      ${state.uploadMessage ? `<p class="fr-profile-message is-${attr(state.uploadMessage.type)}">${escapeHtml(state.uploadMessage.text)}</p>` : ""}
      <div class="fr-profile-select-row">
        <i class="fas fa-list" aria-hidden="true"></i>
        <select data-franchise-select>${listings.map((item) => `<option value="${attr(item.id)}" ${item.id === selected.id ? "selected" : ""}>${escapeHtml(item.brand_name || item.slug || item.id)}</option>`).join("")}</select>
      </div>
      ${publicationDistribution(selected)}
      <div class="fr-profile-media-grid">
        ${mediaUploadControl("Logo", "logo", selected.logo_url, "fa-image")}
        ${mediaUploadControl("Cover", "cover", selected.cover_url, "fa-panorama")}
        ${mediaUploadControl("Proposal", "proposal", selected.proposal_url, "fa-file-pdf")}
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
          <input type="hidden" name="logo_url" value="${attr(selected.logo_url)}">
          <input type="hidden" name="cover_url" value="${attr(selected.cover_url)}">
          <input type="hidden" name="proposal_url" value="${attr(selected.proposal_url)}">
        </div>
        <p class="fr-profile-message" data-profile-message></p>
        <div class="fr-profile-actions">
          <button class="fr-profile-button" type="submit" ${selected.edit_locked ? "disabled" : ""}><i class="fas fa-floppy-disk" aria-hidden="true"></i> Simpan Listing</button>
          ${selected.slug ? `<a class="fr-profile-secondary" href="/peluang-usaha/${encodeURIComponent(selected.slug)}"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Lihat Halaman</a>` : ""}
        </div>
      </form>
    `;
  }

  function publicationDistribution(listing) {
    const rows = listing.publication_distribution || [];
    if (!rows.length) return "";
    return `
      <section class="fr-profile-distribution">
        <div class="fr-profile-section-head">
          <h3><i class="fas fa-network-wired" aria-hidden="true"></i> Distribusi Listing</h3>
        </div>
        <div class="fr-profile-chip-row">
          ${rows.map((row) => {
            const status = row.publication_status || "draft";
            const url = row.canonical_url || (row.slug ? `https://${row.domain || "franchisee.id"}/peluang-usaha/${row.slug}` : "");
            return `<span class="fr-profile-distribution-chip is-${attr(status)}"><i class="fas ${status === "published" ? "fa-eye" : "fa-eye-slash"}" aria-hidden="true"></i> ${escapeHtml(row.domain || row.name || row.site_id)} · ${escapeHtml(status)}${url ? ` <a href="${attr(url)}" target="_blank" rel="noopener">Lihat</a>` : ""}</span>`;
          }).join("")}
        </div>
      </section>
    `;
  }

  function mediaUploadControl(label, assetType, value, icon) {
    const key = `${state.selectedFranchiseId}:${assetType}`;
    const isBusy = state.uploadBusyKey === key;
    const accept = assetType === "proposal" ? "application/pdf" : "image/jpeg,image/png,image/webp";
    return `
      <section class="fr-profile-media-item">
        <div class="fr-profile-media-icon"><i class="fas ${icon}" aria-hidden="true"></i></div>
        <div class="fr-profile-media-body">
          <strong>${escapeHtml(label)}</strong>
          <span>${value ? "Sudah tersedia" : "Belum ada file"}</span>
          ${value ? `<a class="fr-profile-text-link" href="${attr(value)}" target="_blank" rel="noopener">Lihat file</a>` : ""}
        </div>
        <label class="fr-profile-upload-button ${isBusy ? "is-busy" : ""}">
          <input type="file" data-media-upload="${attr(assetType)}" accept="${attr(accept)}" ${isBusy ? "disabled" : ""}>
          <i class="fas ${isBusy ? "fa-spinner fa-spin" : "fa-upload"}" aria-hidden="true"></i>
          <span>${isBusy ? "Mengunggah" : "Unggah"}</span>
        </label>
      </section>
    `;
  }

  function leadsPanel() {
    const leads = state.data.franchisor_leads || [];
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-inbox" aria-hidden="true"></i> Lead Masuk</h2>
      <p class="fr-profile-copy">Pantau calon mitra yang meminta info dari listing Anda.</p>
      ${state.leadMessage ? `<p class="fr-profile-message is-${attr(state.leadMessage.type)}">${escapeHtml(state.leadMessage.text)}</p>` : ""}
      ${leads.length ? `<div class="fr-profile-lead-list">${leads.map((lead) => leadCard(lead)).join("")}</div>` : emptyInline("Belum ada lead masuk untuk listing Anda.")}
    `;
  }

  function membershipPanel() {
    const listings = state.data.owned_franchises || [];
    const selected = selectedListing();
    const membership = state.data.premium_membership || { plan: {}, orders: [], subscriptions: [] };
    const activeSub = selected ? premiumSubscriptionFor(selected.id) : null;
    const order = selected ? premiumOrderFor(selected.id) : null;
    return `
      <h2 class="fr-profile-section-title"><i class="fas fa-crown" aria-hidden="true"></i> Membership Premium</h2>
      <p class="fr-profile-copy">Aktifkan Premium Network agar listing brand tampil lebih lengkap di jaringan Franchisee.id.</p>
      ${state.premiumMessage ? `<p class="fr-profile-message is-${attr(state.premiumMessage.type)}">${escapeHtml(state.premiumMessage.text)}</p>` : ""}
      ${membership.unavailable ? `<div class="fr-profile-notice"><i class="fas fa-circle-info" aria-hidden="true"></i><div>Data membership belum tersedia. Coba lagi setelah pembaruan sistem selesai.</div></div>` : ""}
      ${listings.length ? `
        <label class="fr-profile-field fr-profile-field-compact">
          <span>Pilih listing</span>
          <select data-franchise-select>
            ${listings.map((item) => `<option value="${attr(item.id)}" ${item.id === state.selectedFranchiseId ? "selected" : ""}>${escapeHtml(item.brand_name || item.id)}</option>`).join("")}
          </select>
        </label>
        <div class="fr-profile-membership-card">
          <div>
            <span class="fr-profile-kicker">Premium Network</span>
            <h3>${escapeHtml(selected?.brand_name || "Listing")}</h3>
            <p>${escapeHtml((membership.plan?.network_sites || []).join(", "))}</p>
          </div>
          <strong>${activeSub ? "Aktif" : order ? premiumOrderStatus(order.status) : "Free"}</strong>
        </div>
        ${premiumNotificationsBlock(membership.notifications || [])}
        ${premiumReadinessBlock(selected, membership.readiness || {})}
        ${activeSub ? activePremiumBlock(activeSub) : order ? premiumPaymentBlock(order) : premiumUpgradeBlock(selected, membership.plan)}
      ` : emptyInline("Belum ada listing yang bisa di-upgrade. Lengkapi data brand atau klaim listing terlebih dahulu.")}
    `;
  }

  function premiumNotificationsBlock(notifications) {
    if (!notifications.length) return "";
    return `
      <div class="fr-profile-premium-notifications">
        ${notifications.slice(0, 3).map((item) => `
          <div class="fr-profile-notice ${item.notification_type === "payment_approved" || item.notification_type === "premium_activated" ? "is-success" : ""}">
            <i class="fas ${item.notification_type === "payment_rejected" ? "fa-triangle-exclamation" : "fa-bell"}" aria-hidden="true"></i>
            <div>
              <strong>${escapeHtml(item.title || "Info Premium")}</strong>
              <span>${escapeHtml(item.message || "")}</span>
              ${item.action_url ? `<a class="fr-profile-text-link" href="${attr(item.action_url)}">Lihat detail</a>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function premiumReadinessBlock(listing, readinessMap) {
    if (!listing) return "";
    const readiness = readinessMap[listing.id];
    if (!readiness) return "";
    return `
      <div class="fr-profile-readiness">
        <div class="fr-profile-readiness-head">
          <div>
            <span class="fr-profile-kicker">Kesiapan listing</span>
            <strong>${readiness.score || 0}/${readiness.total || 0} lengkap</strong>
          </div>
          <a class="fr-profile-text-link" href="/profil/?tab=listing">Lengkapi listing</a>
        </div>
        <div class="fr-profile-check-grid">
          ${(readiness.checks || []).map((check) => `
            <span class="${check.ready ? "is-ready" : "is-missing"}"><i class="fas ${check.ready ? "fa-check" : "fa-circle-exclamation"}" aria-hidden="true"></i>${escapeHtml(check.label)}</span>
          `).join("")}
        </div>
        ${readiness.is_ready ? "" : `<p class="fr-profile-muted">Premium bisa dibayar sekarang, tetapi tampilan terbaik membutuhkan data yang lengkap.</p>`}
      </div>
    `;
  }

  function premiumUpgradeBlock(listing, plan) {
    return `
      <div class="fr-profile-premium-grid">
        <div class="fr-profile-premium-benefits">
          <h3>Yang didapat</h3>
          <ul>
            <li><i class="fas fa-network-wired" aria-hidden="true"></i> Distribusi ke jaringan Franchisee.id</li>
            <li><i class="fas fa-certificate" aria-hidden="true"></i> Badge Premium dan prioritas tampilan</li>
            <li><i class="fas fa-inbox" aria-hidden="true"></i> Lead masuk dan analytics dasar</li>
            <li><i class="fas fa-file-arrow-up" aria-hidden="true"></i> Media dan proposal brand lebih rapi</li>
          </ul>
        </div>
        <div class="fr-profile-premium-price">
          <span>Per tahun</span>
          <strong>${formatFullRupiah(plan?.yearly_price || 3000000)}</strong>
          <button class="fr-profile-button" type="button" data-create-premium-order="${attr(listing?.id || "")}" ${state.premiumBusyId ? "disabled" : ""}>
            <i class="fas ${state.premiumBusyId ? "fa-spinner fa-spin" : "fa-arrow-right"}" aria-hidden="true"></i>
            Buat tagihan
          </button>
        </div>
      </div>
    `;
  }

  function premiumPaymentBlock(order) {
    const payment = order.payment || {};
    const pendingConfirmation = order.confirmation_status === "pending" || order.status === "confirmation_submitted";
    return `
      <div class="fr-profile-payment-box">
        <h3>Instruksi pembayaran</h3>
        <dl>
          <div><dt>Bank</dt><dd>${escapeHtml(payment.bank_name || "BCA")}</dd></div>
          <div><dt>Atas nama</dt><dd>${escapeHtml(payment.account_name || "Syamsul Alam")}</dd></div>
          <div><dt>No. rekening</dt><dd>${escapeHtml(payment.account_number || "0183579751")}</dd></div>
          <div><dt>Nominal</dt><dd>${formatFullRupiah(payment.payable_amount || order.payable_amount)}</dd></div>
          <div><dt>Kode unik</dt><dd>${escapeHtml(payment.unique_code || order.unique_code || "-")}</dd></div>
        </dl>
        <p class="fr-profile-muted">Transfer sesuai nominal agar pembayaran lebih mudah dicocokkan.</p>
        ${order.proof_url ? `<p class="fr-profile-muted"><a class="fr-profile-text-link" href="${attr(order.proof_url)}" target="_blank" rel="noopener">Bukti transfer sudah diunggah</a></p>` : ""}
      </div>
      ${pendingConfirmation ? `<div class="fr-profile-notice"><i class="fas fa-clock" aria-hidden="true"></i><div>Konfirmasi sudah masuk dan sedang dicek.</div></div>` : premiumConfirmationForm(order)}
    `;
  }

  function premiumConfirmationForm(order) {
    return `
      <form class="fr-profile-form" data-premium-confirm-form>
        <input type="hidden" name="order_id" value="${attr(order.id)}">
        <div class="fr-profile-grid">
          <label class="fr-profile-field">
            <span>Nama pengirim</span>
            <input name="payer_name" type="text" placeholder="Nama di rekening pengirim">
          </label>
          <label class="fr-profile-field">
            <span>Bank pengirim</span>
            <input name="payer_bank" type="text" placeholder="Contoh: BCA">
          </label>
          <label class="fr-profile-field">
            <span>Nominal transfer</span>
            <input name="submitted_amount" type="text" inputmode="numeric" value="${attr(order.payable_amount || "")}" required>
          </label>
          <label class="fr-profile-field">
            <span>Waktu transfer</span>
            <input name="submitted_paid_at" type="text" placeholder="Contoh: 28 Juni 2026, 20:15">
          </label>
          <label class="fr-profile-field is-wide">
            <span>Catatan</span>
            <textarea name="notes" rows="3" placeholder="Tambahkan catatan bila perlu"></textarea>
          </label>
          <label class="fr-profile-field is-wide">
            <span>Bukti transfer</span>
            <input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf">
          </label>
        </div>
        <p data-profile-message></p>
        <button class="fr-profile-button" type="submit" ${state.premiumBusyId ? "disabled" : ""}>
          <i class="fas ${state.premiumBusyId ? "fa-spinner fa-spin" : "fa-paper-plane"}" aria-hidden="true"></i>
          Saya sudah transfer
        </button>
      </form>
    `;
  }

  function activePremiumBlock(subscription) {
    return `
      <div class="fr-profile-notice is-success">
        <i class="fas fa-circle-check" aria-hidden="true"></i>
        <div>
          <strong>Premium aktif.</strong>
          <span>Berlaku sampai ${escapeHtml(subscription.ends_at || "-")}.</span>
        </div>
      </div>
    `;
  }

  function leadCard(lead) {
    const busy = state.leadBusyId === lead.id;
    return `
      <article class="fr-profile-lead-card">
        <div class="fr-profile-lead-main">
          <div class="fr-profile-lead-title">
            <strong>${escapeHtml(lead.name || "Calon mitra")}</strong>
            <span>${escapeHtml(lead.brand_name || "Listing")}</span>
          </div>
          <div class="fr-profile-muted">${escapeHtml(lead.city_origin || "Kota belum diisi")} ${lead.budget_range ? "· " + escapeHtml(lead.budget_range) : ""} · ${escapeHtml(lead.created_at || "")}</div>
          ${lead.message ? `<p class="fr-profile-list-copy">${escapeHtml(lead.message)}</p>` : ""}
          <div class="fr-profile-chip-row">
            ${lead.email ? `<a href="mailto:${attr(lead.email)}"><i class="fas fa-envelope" aria-hidden="true"></i> Email</a>` : ""}
            ${lead.whatsapp ? `<a href="${attr(whatsappLink(lead.country_code, lead.whatsapp))}" target="_blank" rel="noopener"><i class="fab fa-whatsapp" aria-hidden="true"></i> WhatsApp</a>` : ""}
            ${lead.canonical_url || lead.slug ? `<a href="${attr(lead.canonical_url || "/peluang-usaha/" + lead.slug)}"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Listing</a>` : ""}
          </div>
        </div>
        <label class="fr-profile-lead-status">
          <span>Status</span>
          <select data-lead-status="${attr(lead.id)}" ${busy ? "disabled" : ""}>
            ${leadStatusOptions(lead.status)}
          </select>
        </label>
      </article>
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
    const body = Object.fromEntries(new FormData(form).entries());
    setMessage(message, "Menyimpan...", "");
    setBusy(form, true);
    try {
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
      state.accountEditingField = "";
      if (type === "account") state.accountMessage = { type: "success", text: "Akun tersimpan." };
      await loadProfile();
    } catch (error) {
      setMessage(message, error.message || "Data gagal disimpan.", "error");
    } finally {
      setBusy(form, false);
    }
  }

  async function submitPasswordForm(form) {
    const message = form.querySelector("[data-profile-message]");
    const formData = new FormData(form);
    const newPassword = String(formData.get("new_password") || "");
    const confirmPassword = String(formData.get("confirm_password") || "");
    const currentPassword = String(formData.get("current_password") || "");

    if (newPassword.length < 8) {
      setMessage(message, "Password minimal 8 karakter.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage(message, "Ulangi password baru dengan nilai yang sama.", "error");
      return;
    }

    setMessage(message, "Menyimpan password...", "");
    setBusy(form, true);
    try {
      const clerk = await Auth.ensureSignedIn();
      state.clerk = clerk;
      const user = clerk.user;
      if (!user || typeof user.updatePassword !== "function") {
        throw new Error("Pengaturan password belum tersedia. Silakan coba lagi nanti.");
      }
      const hadPassword = Boolean(user.passwordEnabled);
      const params = {
        newPassword,
        signOutOfOtherSessions: formData.get("sign_out_other_sessions") === "on",
      };
      if (user.passwordEnabled && currentPassword) {
        params.currentPassword = currentPassword;
      }
      await user.updatePassword(params);
      if (typeof user.reload === "function") await user.reload();
      state.accountEditingField = "";
      state.accountMessage = { type: "success", text: hadPassword ? "Password tersimpan." : "Password ditambahkan." };
      render();
    } catch (error) {
      setMessage(message, readableClerkError(error) || "Password belum bisa disimpan.", "error");
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
    state.savedBusyId = franchiseId;
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
          <button class="fr-profile-secondary" type="button" data-save-opportunity="${attr(item.id)}" ${state.savedBusyId === item.id ? "disabled" : ""}>
            <i class="fas ${state.savedBusyId === item.id ? "fa-spinner fa-spin" : "fa-bookmark"}" aria-hidden="true"></i> ${state.savedBusyId === item.id ? "Menyimpan" : saved ? "Tersimpan" : "Simpan"}
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
      if (id === "franchisor" || id === "listing" || id === "leads" || id === "membership" || id === "claims") return canSeeFranchisor();
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

  function mergeSavedOpportunities(serverItems, localItems) {
    const seen = new Set();
    return [...serverItems, ...localItems].filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 24);
  }

  async function syncLocalSavedOpportunities(userId, localItems) {
    if (!userId || !localItems.length || state.syncingLocalSaved) return;
    const serverIds = new Set((state.data?.saved_opportunities || []).map((item) => item.id));
    const missing = localItems.filter((item) => item?.id && !serverIds.has(item.id)).slice(0, 8);
    if (!missing.length) return;
    state.syncingLocalSaved = true;
    try {
      for (const item of missing) {
        const headers = await Auth.getAuthHeaders();
        await fetch("/profile-data", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ action: "save_franchise_opportunity", franchise_id: item.id }),
        });
      }
      window.localStorage.removeItem(savedStorageKey(userId));
    } catch (_error) {
      // Keep local saves as a fallback when server-side saving is not ready.
    } finally {
      state.syncingLocalSaved = false;
    }
  }

  async function toggleSavedOpportunity(franchiseId) {
    if (!franchiseId) return;
    const wasSaved = isOpportunitySaved(franchiseId);
    const item = opportunityById(franchiseId);
    state.opportunityBusyId = franchiseId;
    state.opportunityMessage = null;
    if (wasSaved) {
      state.savedOpportunities = state.savedOpportunities.filter((saved) => saved.id !== franchiseId);
    } else if (item) {
      state.savedOpportunities = [item, ...state.savedOpportunities].slice(0, 24);
    }
    persistSavedOpportunities();
    render();

    try {
      const headers = await Auth.getAuthHeaders();
      const response = await fetch("/profile-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: wasSaved ? "remove_franchise_opportunity" : "save_franchise_opportunity",
          franchise_id: franchiseId,
        }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || "Peluang belum bisa disimpan.");
      state.savedOpportunities = payload.saved_opportunities || state.savedOpportunities;
      state.data.saved_opportunities = state.savedOpportunities;
      persistSavedOpportunities();
    } catch (error) {
      if (wasSaved && item) {
        state.savedOpportunities = [item, ...state.savedOpportunities].slice(0, 24);
      } else {
        state.savedOpportunities = state.savedOpportunities.filter((saved) => saved.id !== franchiseId);
      }
      persistSavedOpportunities();
      state.opportunityMessage = { type: "error", text: error.message || "Peluang belum bisa disimpan." };
    } finally {
      state.savedBusyId = "";
      render();
    }
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

  function selectedListing() {
    const listings = state.data?.owned_franchises || [];
    return listings.find((item) => item.id === state.selectedFranchiseId) || listings[0] || null;
  }

  async function uploadListingMedia(input) {
    const assetType = input.getAttribute("data-media-upload") || "";
    const file = input.files?.[0];
    const listing = (state.data?.owned_franchises || []).find((item) => item.id === state.selectedFranchiseId);
    if (!file || !listing) return;
    const key = `${listing.id}:${assetType}`;
    state.uploadBusyKey = key;
    state.uploadMessage = null;
    render();

    try {
      const headers = await Auth.getAuthHeaders();
      const body = new FormData();
      body.append("franchise_id", listing.id);
      body.append("asset_type", assetType);
      body.append("file", file);
      const response = await fetch("/profile-upload", {
        method: "POST",
        headers,
        body,
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || "File belum bisa diunggah.");
      const asset = payload.asset || {};
      if (asset.field && asset.public_url) {
        listing[asset.field] = asset.public_url;
      }
      state.uploadMessage = { type: "success", text: "File berhasil diunggah." };
    } catch (error) {
      state.uploadMessage = { type: "error", text: error.message || "File belum bisa diunggah." };
    } finally {
      state.uploadBusyKey = "";
      render();
    }
  }

  async function updateLeadStatus(select) {
    const leadId = select.getAttribute("data-lead-status") || "";
    const status = select.value;
    if (!leadId || !status) return;
    state.leadBusyId = leadId;
    state.leadMessage = null;
    render();
    try {
      const headers = await Auth.getAuthHeaders();
      const response = await fetch("/profile-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "update_franchise_lead_status", lead_id: leadId, status }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || "Status lead belum bisa disimpan.");
      state.data.franchisor_leads = payload.franchisor_leads || state.data.franchisor_leads || [];
      state.leadMessage = { type: "success", text: "Status lead tersimpan." };
    } catch (error) {
      state.leadMessage = { type: "error", text: error.message || "Status lead belum bisa disimpan." };
    } finally {
      state.leadBusyId = "";
      render();
    }
  }

  async function createPremiumOrder(franchiseId) {
    if (!franchiseId || state.premiumBusyId) return;
    state.premiumBusyId = franchiseId;
    state.premiumMessage = null;
    render();
    try {
      const headers = await Auth.getAuthHeaders();
      const response = await fetch("/profile-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "create_premium_order", franchise_id: franchiseId }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || "Tagihan Premium belum bisa dibuat.");
      const membership = state.data.premium_membership || { orders: [], subscriptions: [] };
      membership.orders = [payload.order].concat((membership.orders || []).filter((order) => order.id !== payload.order.id));
      state.data.premium_membership = membership;
      state.premiumMessage = { type: "success", text: payload.reused ? "Tagihan Premium aktif sudah tersedia." : "Tagihan Premium dibuat." };
    } catch (error) {
      state.premiumMessage = { type: "error", text: error.message || "Tagihan Premium belum bisa dibuat." };
    } finally {
      state.premiumBusyId = "";
      render();
    }
  }

  async function submitPremiumConfirmation(form) {
    const message = form.querySelector("[data-profile-message]");
    const formData = new FormData(form);
    const receipt = formData.get("receipt");
    const body = Object.fromEntries(formData.entries());
    delete body.receipt;
    setMessage(message, "Mengirim konfirmasi...", "");
    setBusy(form, true);
    state.premiumBusyId = String(body.order_id || "");
    try {
      body.action = "confirm_premium_payment";
      const headers = await Auth.getAuthHeaders();
      if (receipt && receipt.name) {
        setMessage(message, "Mengunggah bukti transfer...", "");
        const upload = new FormData();
        upload.append("order_id", body.order_id || "");
        upload.append("receipt", receipt);
        const uploadResponse = await fetch("/premium-receipt-upload", {
          method: "POST",
          headers,
          body: upload,
        });
        const uploadPayload = await uploadResponse.json();
        if (!uploadPayload.success) throw new Error(uploadPayload.message || "Bukti transfer belum bisa diunggah.");
        body.proof_asset_id = uploadPayload.asset && uploadPayload.asset.id;
      }
      setMessage(message, "Mengirim konfirmasi...", "");
      const response = await fetch("/profile-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.message || "Konfirmasi belum bisa dikirim.");
      if (payload.premium_membership) state.data.premium_membership = payload.premium_membership;
      state.premiumMessage = { type: "success", text: payload.message || "Konfirmasi pembayaran sudah dikirim." };
      await loadProfile();
    } catch (error) {
      setMessage(message, error.message || "Konfirmasi belum bisa dikirim.", "error");
    } finally {
      state.premiumBusyId = "";
      setBusy(form, false);
      render();
    }
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

  function premiumSubscriptionFor(franchiseId) {
    return (state.data?.premium_membership?.subscriptions || []).find((item) => item.franchise_id === franchiseId && item.status === "active");
  }

  function premiumOrderFor(franchiseId) {
    return (state.data?.premium_membership?.orders || []).find((item) => item.franchise_id === franchiseId && item.status !== "paid");
  }

  function premiumOrderStatus(status) {
    return {
      pending_payment: "Menunggu transfer",
      confirmation_submitted: "Sedang dicek",
      paid: "Dibayar",
      rejected: "Ditolak",
      expired: "Kadaluarsa",
      cancelled: "Dibatalkan",
    }[status] || status || "Pending";
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
    form.querySelectorAll("button, input, textarea, select").forEach((field) => {
      if (field.type === "hidden") return;
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
