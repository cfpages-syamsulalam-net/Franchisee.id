(function (window) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RENEWAL_WINDOW_DAYS = 30;

  window.FranchiseProfilePremium = {
    renewalWindowDays: RENEWAL_WINDOW_DAYS,
    canRenew,
    currentSubscription,
    daysUntil,
    formatDate,
    orderStatus,
  };

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
