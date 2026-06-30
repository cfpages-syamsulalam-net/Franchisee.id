(function (window) {
  function createRenderer(state, helpers) {
    const attr = helpers.attr;
    const emptyInline = helpers.emptyInline;
    const escapeHtml = helpers.escapeHtml;
    const leadStatusOptions = helpers.leadStatusOptions;
    const whatsappLink = helpers.whatsappLink;

    function leadsPanel() {
      const leads = state.data.franchisor_leads || [];
      return `
        <h2 class="fr-profile-section-title"><i class="fas fa-inbox" aria-hidden="true"></i> Lead Masuk</h2>
        <p class="fr-profile-copy">Pantau calon mitra yang meminta info dari listing Anda.</p>
        ${state.leadMessage ? `<p class="fr-profile-message is-${attr(state.leadMessage.type)}">${escapeHtml(state.leadMessage.text)}</p>` : ""}
        ${leads.length ? `<div class="fr-profile-lead-list">${leads.map((lead) => leadCard(lead)).join("")}</div>` : emptyInline("Belum ada lead masuk untuk listing Anda.")}
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

    return { leadsPanel };
  }

  window.FranchiseProfileLeads = { createRenderer };
})(window);
