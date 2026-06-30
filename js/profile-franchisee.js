(function (window) {
  function createRenderer(state, helpers) {
    var attr = helpers.attr;
    var emptyInline = helpers.emptyInline;
    var emptyState = helpers.emptyState;
    var escapeHtml = helpers.escapeHtml;
    var field = helpers.field;
    var formatRupiah = helpers.formatRupiah;
    var readonlyIdentity = helpers.readonlyIdentity;
    var statusLabel = helpers.statusLabel;
    var textarea = helpers.textarea;
    var hasAskedInfo = helpers.hasAskedInfo;
    var isOpportunitySaved = helpers.isOpportunitySaved;

    function franchiseePanel() {
      var profile = state.data.franchisee_profile;
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
      var profile = state.data.franchisee_profile;
      if (!profile) return emptyState("fa-heart", "Peluang belum bisa dipersonalisasi", "/daftar/?role=franchisee&continue=1");
      var recommendations = state.data.franchisee_recommendations || [];
      var inquiries = state.data.inquiry_history || [];
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
            ${recommendations.length ? recommendations.map(function (item) { return opportunityCard(item); }).join("") : emptyInline("Belum ada rekomendasi yang cocok. Perbarui minat dan budget Anda.")}
          </section>
          <section class="fr-profile-value-section">
            <div class="fr-profile-section-head">
              <h3><i class="fas fa-bookmark" aria-hidden="true"></i> Tersimpan</h3>
            </div>
            ${state.savedOpportunities.length ? state.savedOpportunities.map(function (item) { return opportunityCard(item, { compact: true }); }).join("") : emptyInline("Belum ada peluang tersimpan. Simpan rekomendasi untuk dibandingkan nanti.")}
          </section>
        </div>
        <section class="fr-profile-value-section is-full">
          <div class="fr-profile-section-head">
            <h3><i class="fas fa-clock-rotate-left" aria-hidden="true"></i> Riwayat Minat</h3>
          </div>
          ${inquiries.length ? `<div class="fr-profile-list">${inquiries.map(function (lead) {
            return `
              <div class="fr-profile-list-item">
                <strong>${escapeHtml(lead.brand_name || lead.franchise_id)}</strong>
                <div class="fr-profile-muted">${escapeHtml(statusLabel(lead.status))} · ${escapeHtml(lead.created_at || "")}</div>
                ${lead.message ? `<p class="fr-profile-list-copy">${escapeHtml(lead.message)}</p>` : ""}
              </div>
            `;
          }).join("")}</div>` : emptyInline("Belum ada permintaan info yang dikirim.")}
        </section>
      `;
    }

    function opportunityCard(item, options) {
      options = options || {};
      var saved = isOpportunitySaved(item.id);
      var asked = hasAskedInfo(item.id);
      return `
        <article class="fr-profile-opportunity ${options.compact ? "is-compact" : ""}">
          <div>
            <div class="fr-profile-opportunity-title">
              <strong>${escapeHtml(item.brand_name || "Peluang franchise")}</strong>
              <span class="fr-profile-fit is-${attr(item.budget_fit || "unknown")}">${escapeHtml(item.budget_label || "Budget belum tersedia")}</span>
            </div>
            <div class="fr-profile-muted">${escapeHtml(item.category || "Kategori belum tersedia")} ${item.min_investment_idr ? "· " + escapeHtml(formatRupiah(item.min_investment_idr)) : ""}</div>
            ${item.short_desc && !options.compact ? `<p class="fr-profile-list-copy">${escapeHtml(item.short_desc)}</p>` : ""}
            ${item.reasons?.length && !options.compact ? `<div class="fr-profile-chip-row">${item.reasons.map(function (reason) { return `<span>${escapeHtml(reason)}</span>`; }).join("")}</div>` : ""}
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

    return { franchiseePanel: franchiseePanel, opportunitiesPanel: opportunitiesPanel };
  }

  window.FranchiseProfileFranchisee = { createRenderer: createRenderer };
})(window);
