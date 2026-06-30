(function (window, document) {
  const Auth = window.FranchiseAuth;
  const PremiumClient = window.FranchiseProfilePremium || {};
  const OpportunityClient = window.FranchiseProfileOpportunities || {};
  const AccountClient = window.FranchiseProfileAccount || {};
  const RoleClient = window.FranchiseProfileRoles || {};
  const LeadsClient = window.FranchiseProfileLeads || {};
  const ProfileUi = window.FranchiseProfileUi || {};
  const {
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
  } = ProfileUi;
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
  const {
    clearSavedOpportunities,
    hasAskedInfo,
    isOpportunitySaved,
    loadSavedOpportunities,
    mergeSavedOpportunities,
    opportunityById,
    persistSavedOpportunities,
  } = OpportunityClient.create ? OpportunityClient.create(state) : {};
  const PremiumRenderer = PremiumClient.createProfileRenderer
    ? PremiumClient.createProfileRenderer(state, { attr, escapeHtml, formatFullRupiah, emptyInline })
    : {};
  const AccountRenderer = AccountClient.createRenderer
    ? AccountClient.createRenderer(state, { Auth, attr, escapeHtml, hasGoogleAccount, passwordHelperText })
    : {};
  const accountPanel = AccountRenderer.accountPanel || function () {
    return errorBox("Pengaturan akun belum bisa ditampilkan. Muat ulang halaman.");
  };
  const membershipPanel = PremiumRenderer.membershipPanel || function () {
    return errorBox("Membership Premium belum bisa ditampilkan. Muat ulang halaman.");
  };
  const RoleRenderer = RoleClient.createRenderer
    ? RoleClient.createRenderer(state, { attr, escapeHtml, hasRole, isStaffAccess })
    : {};
  const roleAddOnPanel = RoleRenderer.roleAddOnPanel || function () {
    return "";
  };
  const roleConfirmModal = RoleRenderer.roleConfirmModal || function () {
    return "";
  };
  const LeadsRenderer = LeadsClient.createRenderer
    ? LeadsClient.createRenderer(state, { attr, emptyInline, escapeHtml, leadStatusOptions, whatsappLink })
    : {};
  const leadsPanel = LeadsRenderer.leadsPanel || function () {
    return errorBox("Lead belum bisa ditampilkan. Muat ulang halaman.");
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
    return new URLSearchParams(window.location.search || "").get("tab") || "summary";
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

  function visibleTabs() {
    return TAB_DEFS.filter(([id]) => {
      if (id === "franchisee" || id === "opportunities") return canSeeFranchisee();
      if (id === "franchisor" || id === "listing" || id === "leads" || id === "membership" || id === "claims") return canSeeFranchisor();
      return true;
    });
  }

  function ensureAllowedActiveTab() {
    if (!visibleTabs().some(([id]) => id === state.activeTab)) state.activeTab = "summary";
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
      clearSavedOpportunities(userId);
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

})(window, document);
