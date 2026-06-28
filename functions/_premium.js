export const PREMIUM_PLAN_CODE = "premium_network_yearly";
export const PREMIUM_BASE_AMOUNT = 3000000;
export const PREMIUM_ORDER_WINDOW_HOURS = 24;
export const PREMIUM_NETWORK_SITE_IDS = [
  "site_franchisee_id",
  "site_franchise_id",
  "site_franchisor_id",
  "site_waralaba_id",
];
export const PREMIUM_NETWORK_SITE_DOMAINS = {
  site_franchisee_id: "franchisee.id",
  site_franchise_id: "franchise.id",
  site_franchisor_id: "franchisor.id",
  site_waralaba_id: "waralaba.id",
};
export const PREMIUM_PAYMENT = {
  bankName: "BCA",
  accountName: "Syamsul Alam",
  accountNumber: "0183579751",
  label: "Transfer BCA",
  instructions: "Transfer sesuai nominal yang muncul agar pembayaran mudah dicocokkan.",
};

export function premiumOrderId(randomId) {
  return `premium_order_${randomId()}`;
}

export function premiumConfirmationId(randomId) {
  return `premium_confirm_${randomId()}`;
}

export function premiumSubscriptionId(randomId) {
  return `premium_sub_${randomId()}`;
}

export function premiumPublicationId(franchiseId, siteId) {
  const safeFranchiseId = String(franchiseId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  const safeSiteId = String(siteId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  return `premium_publication_${safeFranchiseId}_${safeSiteId}`;
}

export function premiumCanonicalUrl(siteId, slug) {
  const domain = PREMIUM_NETWORK_SITE_DOMAINS[siteId] || PREMIUM_NETWORK_SITE_DOMAINS.site_franchisee_id;
  return `https://${domain}/peluang-usaha/${slug}/`;
}

export function normalizeSubmittedAmount(value) {
  const amount = Number(String(value || "").replace(/[^\d]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export async function nextPremiumUniqueCode(db) {
  const rows = await db
    .prepare(
      `SELECT unique_code
       FROM premium_orders
       WHERE status IN ('pending_payment', 'confirmation_submitted')
         AND expires_at > CURRENT_TIMESTAMP
       ORDER BY unique_code ASC`,
    )
    .all();
  const used = new Set((rows.results || []).map((row) => Number(row.unique_code || 0)).filter(Boolean));
  for (let code = 1; code <= 999; code += 1) {
    if (!used.has(code)) return code;
  }
  throw new Error("Kode pembayaran sedang penuh. Silakan coba lagi nanti.");
}

export function payableAmount(uniqueCode) {
  return PREMIUM_BASE_AMOUNT + Number(uniqueCode || 0);
}

export function formatUniqueCode(code) {
  return String(Number(code || 0)).padStart(3, "0");
}

export function paymentInstructions(order, method = null) {
  const selected = method || {};
  return {
    method_code: selected.code || "manual_bca",
    label: selected.label || PREMIUM_PAYMENT.label,
    bank_name: selected.provider || PREMIUM_PAYMENT.bankName,
    account_name: selected.account_name || PREMIUM_PAYMENT.accountName,
    account_number: selected.account_number || PREMIUM_PAYMENT.accountNumber,
    instructions: selected.instructions || PREMIUM_PAYMENT.instructions,
    base_amount: PREMIUM_BASE_AMOUNT,
    unique_code: formatUniqueCode(order.unique_code),
    payable_amount: Number(order.payable_amount || payableAmount(order.unique_code)),
    expires_at: order.expires_at,
  };
}
