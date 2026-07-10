import { z } from "zod";

export const SOURCE_SHEET_VALUES = ["FRANCHISOR", "FRANCHISEE", "UNCLAIMED"] as const;
export const LISTING_STATUS_VALUES = ["unclaimed", "draft", "pending_review", "free", "verified", "premium", "suspended", "archived"] as const;
export const LISTING_TIER_VALUES = ["unclaimed", "free", "verified", "premium"] as const;
export const ROYALTY_BASIS_VALUES = ["omzet", "profit", "fixed", "none"] as const;
export const HAKI_STATUS_VALUES = ["registered", "process", "none"] as const;
export const PUBLICATION_STATUS_VALUES = ["draft", "published", "hidden", "redirected"] as const;

export const nullableString = z.string().nullish().transform((value) => value ?? null);
export const nullableNumber = z.number().nullish().transform((value) => value ?? null);

export const ImportFranchisorRowSchema = z.object({
  brand_name: z.string().trim().min(1),
}).catchall(z.string());

export const ImportFranchiseeRowSchema = z.object({
  name: z.string().trim().min(1),
}).catchall(z.string());

export const ImportUnclaimedRowSchema = z.object({
  brand_name: z.string().trim().min(1),
}).catchall(z.string());

export const D1FranchiseRowSchema = z.object({
  id: z.string().min(1),
  brand_name: z.string().min(1),
  slug: z.string().min(1),
  category: nullableString,
  subcategory: nullableString,
  label: nullableString,
  status: nullableString,
  verification_tier: nullableString,
  source_sheet: nullableString,
  year_established: nullableNumber,
  city_origin: nullableString,
  brand_country: nullableString,
  outlet_type: nullableString,
  target_market: nullableString,
  location_requirement: nullableString,
  min_area_sqm: nullableNumber,
  min_staff_count: nullableNumber,
  setup_duration_days: nullableNumber,
  rent_cost_text: nullableString,
  contract_duration_months: nullableNumber,
  fee_license_idr: nullableNumber,
  fee_capex_idr: nullableNumber,
  fee_construction_idr: nullableNumber,
  working_capital_idr: nullableNumber,
  additional_cost_notes: nullableString,
  total_investment_idr: nullableNumber,
  min_investment_idr: nullableNumber,
  max_investment_idr: nullableNumber,
  estimated_bep_months: nullableNumber,
  estimated_bep_min_months: nullableNumber,
  estimated_bep_max_months: nullableNumber,
  omzet_monthly_idr: nullableNumber,
  omzet_monthly_min_idr: nullableNumber,
  omzet_monthly_max_idr: nullableNumber,
  hpp_percent: nullableNumber,
  net_profit_percent: nullableNumber,
  net_profit_monthly_min_idr: nullableNumber,
  net_profit_monthly_max_idr: nullableNumber,
  royalty_percent: nullableNumber,
  royalty_basis: nullableString,
  royalty_period: nullableString,
  short_desc: nullableString,
  full_desc: nullableString,
  support_system: nullableString,
  phone: nullableString,
  office_address: nullableString,
  outlets_location: nullableString,
  structured_locations: nullableString,
  logo_url: nullableString,
  cover_url: nullableString,
  gallery_urls: nullableString,
  video_url: nullableString,
  proposal_url: nullableString,
  raw_payload: nullableString,
  company_name: nullableString,
  pic_name: nullableString,
  email_contact: nullableString,
  whatsapp: nullableString,
  website_url: nullableString,
  instagram_url: nullableString,
  facebook_url: nullableString,
  tiktok_url: nullableString,
  youtube_url: nullableString,
  linkedin_url: nullableString,
  package_name: nullableString,
  package_price_idr: nullableNumber,
  package_min_capital_idr: nullableNumber,
  package_max_capital_idr: nullableNumber,
  canonical_url: nullableString,
  publication_status: nullableString,
  is_primary: nullableNumber,
  first_published_at: nullableString,
  updated_at: nullableString,
});

export type D1FranchiseRow = z.infer<typeof D1FranchiseRowSchema>;

export function normalizeText(value: unknown) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}

export function normalizeListingStatusValue(value: unknown) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "verified") return "verified";
  if (normalized === "premium") return "premium";
  if (normalized === "suspended") return "suspended";
  if (normalized === "archived") return "archived";
  if (normalized === "unclaimed") return "unclaimed";
  if (normalized === "draft") return "draft";
  if (normalized === "pending_review") return "pending_review";
  return "free";
}

export function normalizeVerificationTierValue(status: unknown, isVerified?: unknown) {
  const normalizedStatus = normalizeText(status).toLowerCase();
  const verified = normalizeText(isVerified).toLowerCase();
  if (normalizedStatus === "premium") return "premium";
  if (normalizedStatus === "verified" || verified === "true") return "verified";
  if (normalizedStatus === "unclaimed") return "unclaimed";
  return "free";
}

export function normalizeRoyaltyBasisValue(value: unknown) {
  const normalized = normalizeText(value).toLowerCase();
  return ROYALTY_BASIS_VALUES.includes(normalized as (typeof ROYALTY_BASIS_VALUES)[number]) ? normalized : null;
}

export function normalizeHakiStatusValue(value: unknown) {
  const normalized = normalizeText(value).toLowerCase();
  return HAKI_STATUS_VALUES.includes(normalized as (typeof HAKI_STATUS_VALUES)[number]) ? normalized : null;
}
