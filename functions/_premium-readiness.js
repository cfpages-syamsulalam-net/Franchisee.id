import {
  PREMIUM_BASE_AMOUNT,
  PREMIUM_NETWORK_SITE_DOMAINS,
  PREMIUM_PLAN_CODE,
} from "./_premium.js";
import { textOrNull } from "./_premium-ops-utils.js";

export function premiumReadinessForListing(listing) {
  const checks = [
    { key: "logo", label: "Logo brand", ready: Boolean(textOrNull(listing?.logo_url)) },
    { key: "cover", label: "Gambar cover", ready: Boolean(textOrNull(listing?.cover_url)) },
    { key: "description", label: "Deskripsi brand", ready: Boolean(textOrNull(listing?.full_desc) || textOrNull(listing?.short_desc)) },
    { key: "contact", label: "Kontak aktif", ready: Boolean(textOrNull(listing?.phone) || textOrNull(listing?.whatsapp) || textOrNull(listing?.email_contact)) },
    { key: "investment", label: "Info investasi", ready: Boolean(Number(listing?.total_investment_idr || 0) || Number(listing?.min_investment_idr || 0)) },
    { key: "proposal", label: "Proposal PDF", ready: Boolean(textOrNull(listing?.proposal_url)) },
  ];
  const readyCount = checks.filter((check) => check.ready).length;
  return {
    plan_code: PREMIUM_PLAN_CODE,
    yearly_price: PREMIUM_BASE_AMOUNT,
    score: readyCount,
    total: checks.length,
    is_ready: readyCount >= 5 && checks.find((check) => check.key === "contact")?.ready,
    missing: checks.filter((check) => !check.ready).map((check) => check.label),
    checks,
    network_sites: Object.values(PREMIUM_NETWORK_SITE_DOMAINS),
  };
}
