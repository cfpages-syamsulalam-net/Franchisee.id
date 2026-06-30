(function (window) {
  function createRenderer(state, helpers) {
    var attr = helpers.attr;
    var emptyState = helpers.emptyState;
    var escapeHtml = helpers.escapeHtml;
    var field = helpers.field;
    var readonlyIdentity = helpers.readonlyIdentity;
    var textarea = helpers.textarea;

    function franchisorPanel() {
      var profile = state.data.franchisor_profile;
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
      var listings = state.data.owned_franchises || [];
      if (!listings.length) return emptyState("fa-pen-to-square", "Belum ada listing milik akun ini", "/daftar/?role=franchisor&continue=1");
      var selected = listings.find(function (item) { return item.id === state.selectedFranchiseId; }) || listings[0];
      return `
        <h2 class="fr-profile-section-title"><i class="fas fa-pen-to-square" aria-hidden="true"></i> Listing Brand</h2>
        <p class="fr-profile-copy">Perubahan listing akan disimpan dan tampil setelah halaman diperbarui. Untuk menjaga kualitas data, satu listing bisa diedit setiap ${selected.edit_interval_hours || 6} jam.</p>
        ${state.uploadMessage ? `<p class="fr-profile-message is-${attr(state.uploadMessage.type)}">${escapeHtml(state.uploadMessage.text)}</p>` : ""}
        <div class="fr-profile-select-row">
          <i class="fas fa-list" aria-hidden="true"></i>
          <select data-franchise-select>${listings.map(function (item) { return `<option value="${attr(item.id)}" ${item.id === selected.id ? "selected" : ""}>${escapeHtml(item.brand_name || item.slug || item.id)}</option>`; }).join("")}</select>
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

    function claimsPanel() {
      var claims = state.data.claims || [];
      return `
        <h2 class="fr-profile-section-title"><i class="fas fa-certificate" aria-hidden="true"></i> Klaim Brand</h2>
        <p class="fr-profile-copy">Riwayat klaim brand yang pernah diajukan akun ini.</p>
        ${claims.length ? `<div class="fr-profile-list">${claims.map(function (claim) {
          return `
            <div class="fr-profile-list-item">
              <strong>${escapeHtml(claim.brand_name || claim.franchise_id)}</strong>
              <div class="fr-profile-muted">${escapeHtml(claim.status || "pending")} · ${escapeHtml(claim.created_at || "")}</div>
            </div>
          `;
        }).join("")}</div>` : `<div class="fr-profile-notice"><i class="fas fa-circle-info" aria-hidden="true"></i><div>Belum ada klaim brand.</div></div>`}
      `;
    }

    function publicationDistribution(listing) {
      var rows = listing.publication_distribution || [];
      if (!rows.length) return "";
      return `
        <section class="fr-profile-distribution">
          <div class="fr-profile-section-head">
            <h3><i class="fas fa-network-wired" aria-hidden="true"></i> Distribusi Listing</h3>
          </div>
          <div class="fr-profile-chip-row">
            ${rows.map(function (row) {
              var status = row.publication_status || "draft";
              var url = row.canonical_url || (row.slug ? `https://${row.domain || "franchisee.id"}/peluang-usaha/${row.slug}` : "");
              return `<span class="fr-profile-distribution-chip is-${attr(status)}"><i class="fas ${status === "published" ? "fa-eye" : "fa-eye-slash"}" aria-hidden="true"></i> ${escapeHtml(row.domain || row.name || row.site_id)} · ${escapeHtml(status)}${url ? ` <a href="${attr(url)}" target="_blank" rel="noopener">Lihat</a>` : ""}</span>`;
            }).join("")}
          </div>
        </section>
      `;
    }

    function mediaUploadControl(label, assetType, value, icon) {
      var key = state.selectedFranchiseId + ":" + assetType;
      var isBusy = state.uploadBusyKey === key;
      var accept = assetType === "proposal" ? "application/pdf" : "image/jpeg,image/png,image/webp";
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

    return { franchisorPanel: franchisorPanel, listingPanel: listingPanel, claimsPanel: claimsPanel };
  }

  window.FranchiseProfileFranchisor = { createRenderer: createRenderer };
})(window);
