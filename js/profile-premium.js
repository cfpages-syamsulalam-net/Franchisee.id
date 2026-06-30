(function (window) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RENEWAL_WINDOW_DAYS = 30;

  window.FranchiseProfilePremium = {
    renewalWindowDays: RENEWAL_WINDOW_DAYS,
    canRenew,
    currentSubscription,
    createProfileRenderer,
    daysUntil,
    formatDate,
    orderStatus,
  };

  function createProfileRenderer(state, helpers) {
    const attr = helpers.attr;
    const escapeHtml = helpers.escapeHtml;
    const formatFullRupiah = helpers.formatFullRupiah;
    const emptyInline = helpers.emptyInline;

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
        ${membership.unavailable ? `<div class="fr-profile-notice"><i class="fas fa-circle-info" aria-hidden="true"></i><div>Data membership belum tersedia. Muat ulang halaman atau coba lagi beberapa saat.</div></div>` : ""}
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
            <strong>${activeSub ? "Aktif" : order ? orderStatus(order.status) : "Free"}</strong>
          </div>
          ${premiumNotificationsBlock(membership.notifications || [])}
          ${premiumReadinessBlock(selected, membership.readiness || {})}
          ${activeSub ? activePremiumBlock(activeSub, order, selected) + (order ? premiumPaymentBlock(order) : "") : order ? premiumPaymentBlock(order) : premiumUpgradeBlock(selected, membership.plan)}
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
            ${Number(payment.discount_amount || order.discount_amount || 0) > 0 ? `<div><dt>Diskon</dt><dd>${formatFullRupiah(payment.discount_amount || order.discount_amount)}${payment.discount_reason || order.discount_reason ? ` - ${escapeHtml(payment.discount_reason || order.discount_reason)}` : ""}</dd></div>` : ""}
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

    function activePremiumBlock(subscription, order, listing) {
      const formattedEnd = formatDate(subscription.ends_at);
      const daysLeft = daysUntil(subscription.ends_at);
      const renewable = !order && canRenew(subscription);
      const expiryText = daysLeft !== null && daysLeft <= 30
        ? `Berlaku sampai ${formattedEnd}. Renewal sudah bisa dibuat.`
        : `Berlaku sampai ${formattedEnd}.`;
      return `
        <div class="fr-profile-notice is-success">
          <i class="fas fa-circle-check" aria-hidden="true"></i>
          <div>
            <strong>Premium aktif.</strong>
            <span>${escapeHtml(expiryText)}</span>
            ${order ? `<span>Tagihan renewal sudah dibuat. Selesaikan pembayaran di bawah ini agar masa aktif berlanjut.</span>` : ""}
            ${renewable ? `<div class="fr-profile-notice-actions"><button class="fr-profile-inline-cta" type="button" data-create-premium-order="${attr(listing?.id || subscription.franchise_id || "")}" ${state.premiumBusyId ? "disabled" : ""}><i class="fas ${state.premiumBusyId ? "fa-spinner fa-spin" : "fa-rotate-right"}" aria-hidden="true"></i> Buat tagihan renewal</button></div>` : ""}
          </div>
        </div>
      `;
    }

    function selectedListing() {
      const listings = state.data?.owned_franchises || [];
      return listings.find((item) => item.id === state.selectedFranchiseId) || listings[0] || null;
    }

    function premiumSubscriptionFor(franchiseId) {
      return currentSubscription(state.data?.premium_membership?.subscriptions || [], franchiseId);
    }

    function premiumOrderFor(franchiseId) {
      return (state.data?.premium_membership?.orders || []).find((item) => item.franchise_id === franchiseId && item.status !== "paid");
    }

    return { membershipPanel };
  }

  function currentSubscription(subscriptions, franchiseId) {
    const rows = (subscriptions || []).filter(function (item) {
      return item && item.franchise_id === franchiseId && item.status === "active";
    });
    const now = Date.now();
    const validRows = rows.filter(function (item) {
      const end = parseDate(item.ends_at);
      return end && end.getTime() > now;
    });
    const activeNow = validRows.filter(function (item) {
      const start = parseDate(item.starts_at);
      const end = parseDate(item.ends_at);
      return (!start || start.getTime() <= now) && end && end.getTime() > now;
    });
    if (activeNow.length) return activeNow.sort(sortByEndAsc)[0];
    return null;
  }

  function canRenew(subscription) {
    const days = daysUntil(subscription && subscription.ends_at);
    return days !== null && days >= 0 && days <= RENEWAL_WINDOW_DAYS;
  }

  function daysUntil(value) {
    const date = parseDate(value);
    if (!date) return null;
    return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
  }

  function formatDate(value) {
    const date = parseDate(value);
    if (!date) return value || "-";
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }

  function orderStatus(status) {
    return {
      pending_payment: "Menunggu transfer",
      confirmation_submitted: "Sedang dicek",
      paid: "Dibayar",
      rejected: "Ditolak",
      expired: "Kedaluwarsa",
      cancelled: "Dibatalkan",
    }[status] || status || "Pending";
  }

  function sortByEndAsc(left, right) {
    const leftTime = parseDate(left.ends_at)?.getTime() || 0;
    const rightTime = parseDate(right.ends_at)?.getTime() || 0;
    return leftTime - rightTime;
  }

  function parseDate(value) {
    if (!value) return null;
    const text = String(value);
    const normalized = text.includes("T") ? text : text.replace(" ", "T") + "Z";
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
})(window);
