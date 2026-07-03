(function (window) {
  function createRenderer(state, helpers) {
    const attr = helpers.attr;
    const emptyInline = helpers.emptyInline;
    const escapeHtml = helpers.escapeHtml;

    function analyticsPanel() {
      const analytics = state.data.owner_analytics || {};
      const listings = analytics.listings || [];
      const summary = analytics.summary || {};
      return `
        <h2 class="fr-profile-section-title"><i class="fas fa-chart-line" aria-hidden="true"></i> Analytics Listing</h2>
        <p class="fr-profile-copy">Lihat performa listing dan aksi calon mitra yang masuk dari Franchisee.id.</p>
        ${summaryCards(summary)}
        ${listings.length ? `<div class="fr-profile-analytics-list">${listings.map((item) => listingAnalyticsCard(item)).join("")}</div>` : emptyInline("Belum ada listing yang bisa dianalisis.")}
      `;
    }

    function summaryCards(summary) {
      const last30 = summary.last_30d || {};
      return `
        <div class="fr-profile-summary fr-profile-analytics-summary">
          ${metricCard("Dilihat", last30.listing_view, "fa-eye")}
          ${metricCard("Disimpan", last30.save, "fa-bookmark")}
          ${metricCard("Minta info", last30.inquiry, "fa-paper-plane")}
          ${metricCard("Klik kontak", last30.contact_click, "fa-address-book")}
          ${metricCard("Konversi", formatRate(summary.conversion_rate_30d), "fa-percent")}
        </div>
        <p class="fr-profile-muted">Ringkasan 30 hari terakhir.</p>
      `;
    }

    function listingAnalyticsCard(item) {
      const last30 = item.last_30d || {};
      const total = item.total || {};
      return `
        <article class="fr-profile-analytics-card">
          <div class="fr-profile-analytics-card-head">
            <div>
              <h3>${escapeHtml(item.brand_name || "Listing")}</h3>
              <p>${escapeHtml(statusLabel(item))}</p>
            </div>
            ${item.slug ? `<a class="fr-profile-text-link" href="/peluang-usaha/${attr(item.slug)}"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Lihat listing</a>` : ""}
          </div>
          <div class="fr-profile-analytics-grid">
            ${smallMetric("Dilihat", last30.listing_view, total.listing_view)}
            ${smallMetric("Disimpan", last30.save, total.save)}
            ${smallMetric("Minta info", last30.inquiry, total.inquiry)}
            ${smallMetric("Klik kontak", last30.contact_click, total.contact_click)}
            ${smallMetric("Konversi", formatRate(item.conversion_rate_30d), "")}
          </div>
        </article>
      `;
    }

    function metricCard(label, value, icon) {
      return `<div class="fr-profile-stat"><strong><i class="fas ${icon}" aria-hidden="true"></i> ${escapeHtml(value ?? 0)}</strong><span>${escapeHtml(label)}</span></div>`;
    }

    function smallMetric(label, recent, total) {
      const totalText = total === "" || total == null ? "" : `<small>Total ${escapeHtml(total || 0)}</small>`;
      return `<div class="fr-profile-analytics-metric"><strong>${escapeHtml(recent || 0)}</strong><span>${escapeHtml(label)}</span>${totalText}</div>`;
    }

    function formatRate(value) {
      const number = Number(value || 0);
      return number ? number.toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "%" : "0%";
    }

    function statusLabel(item) {
      if (item.verification_tier === "premium") return "Premium";
      if (item.verification_tier === "verified") return "Terverifikasi";
      return item.status || "Listing";
    }

    return { analyticsPanel };
  }

  window.FranchiseProfileAnalytics = { createRenderer };
})(window);
