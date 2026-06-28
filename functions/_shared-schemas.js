import { z } from "zod";

export const DASHBOARD_DECISIONS = ["approve", "reject"];
export const PUBLIC_ROLES = ["franchisee", "franchisor"];
export const INTERNAL_ROLES = ["admin", "staff"];
export const USER_ROLES = [...PUBLIC_ROLES, ...INTERNAL_ROLES];
export const SOURCE_SHEET_VALUES = ["FRANCHISOR", "FRANCHISEE", "UNCLAIMED"];
export const FORM_TYPE_VALUES = ["FRANCHISEE", "FRANCHISOR", "claim"];
export const TEST_ACTION_VALUES = ["create_unclaimed", "clear_test_data"];

export const LISTING_STATUS_VALUES = ["unclaimed", "draft", "pending_review", "free", "verified", "premium", "suspended", "archived"];
export const LISTING_TIER_VALUES = ["unclaimed", "free", "verified", "premium"];
export const ROYALTY_BASIS_VALUES = ["omzet", "profit", "fixed", "none"];
export const HAKI_STATUS_VALUES = ["registered", "process", "none"];

export const CONTACT_TYPES = ["phone", "whatsapp", "email", "website", "address", "instagram", "facebook", "tiktok", "youtube", "linkedin"];
export const CONTACT_CONFIDENCE_VALUES = ["high", "medium", "low"];
export const CONTACT_STATUS_VALUES = ["active", "invalid", "archived"];

export const QUALITY_CHECK_TYPES = [
  "missing_image",
  "missing_contact",
  "missing_description",
  "missing_category",
  "likely_all_caps",
  "suspicious_contact",
  "stale_listing",
  "invalid_url",
];
export const QUALITY_CHECK_STATUS_VALUES = ["open", "resolved", "ignored"];
export const QUALITY_CHECK_SEVERITY_VALUES = ["info", "warning", "critical"];

export const INTEGER_LISTING_FIELDS = [
  "year_established",
  "contract_duration_months",
  "fee_license_idr",
  "fee_capex_idr",
  "fee_construction_idr",
  "total_investment_idr",
  "min_investment_idr",
  "max_investment_idr",
  "estimated_bep_months",
  "omzet_monthly_idr",
];

export const REAL_LISTING_FIELDS = ["hpp_percent", "net_profit_percent", "royalty_percent"];

export const EDITABLE_LISTING_FIELD_DEFS = [
  { name: "brand_name", label: "Nama brand", type: "text" },
  { name: "category", label: "Kategori", type: "text" },
  { name: "subcategory", label: "Subkategori", type: "text" },
  { name: "label", label: "Label", type: "text" },
  { name: "status", label: "Status listing", type: "select", options: LISTING_STATUS_VALUES },
  { name: "verification_tier", label: "Level verifikasi", type: "select", options: LISTING_TIER_VALUES },
  { name: "year_established", label: "Tahun berdiri", type: "integer" },
  { name: "city_origin", label: "Kota asal", type: "text" },
  { name: "outlet_type", label: "Tipe outlet", type: "text" },
  { name: "location_requirement", label: "Kriteria lokasi", type: "textarea" },
  { name: "rent_cost_text", label: "Biaya sewa", type: "text" },
  { name: "contract_duration_months", label: "Durasi kontrak (bulan)", type: "integer" },
  { name: "fee_license_idr", label: "Biaya lisensi", type: "integer" },
  { name: "fee_capex_idr", label: "Modal peralatan", type: "integer" },
  { name: "fee_construction_idr", label: "Biaya renovasi", type: "integer" },
  { name: "total_investment_idr", label: "Total investasi", type: "integer" },
  { name: "min_investment_idr", label: "Investasi minimum", type: "integer" },
  { name: "max_investment_idr", label: "Investasi maksimum", type: "integer" },
  { name: "estimated_bep_months", label: "Estimasi balik modal (bulan)", type: "integer" },
  { name: "omzet_monthly_idr", label: "Omzet bulanan", type: "integer" },
  { name: "hpp_percent", label: "HPP (%)", type: "number" },
  { name: "net_profit_percent", label: "Laba bersih (%)", type: "number" },
  { name: "royalty_percent", label: "Royalti (%)", type: "number" },
  { name: "royalty_basis", label: "Dasar royalti", type: "select", options: ROYALTY_BASIS_VALUES },
  { name: "royalty_period", label: "Periode royalti", type: "text" },
  { name: "short_desc", label: "Deskripsi singkat", type: "textarea" },
  { name: "full_desc", label: "Deskripsi lengkap", type: "textarea" },
  { name: "support_system", label: "Dukungan mitra", type: "textarea" },
  { name: "phone", label: "Telepon/WhatsApp", type: "text" },
  { name: "office_address", label: "Alamat kantor", type: "textarea" },
  { name: "outlets_location", label: "Lokasi outlet", type: "textarea" },
  { name: "logo_url", label: "URL logo", type: "url" },
  { name: "cover_url", label: "URL cover", type: "url" },
  { name: "gallery_urls", label: "URL galeri", type: "textarea" },
  { name: "video_url", label: "URL video", type: "url" },
  { name: "proposal_url", label: "URL proposal", type: "url" },
];

export const EditableListingFieldSchema = z.enum(EDITABLE_LISTING_FIELD_DEFS.map((field) => field.name));
export const DashboardDecisionSchema = z.enum(DASHBOARD_DECISIONS);
export const PublicRoleSchema = z.enum(PUBLIC_ROLES);
export const UserRoleSchema = z.enum(USER_ROLES);
export const SourceSheetSchema = z.enum(SOURCE_SHEET_VALUES);
export const FormTypeSchema = z.enum(FORM_TYPE_VALUES);
export const TestActionSchema = z.enum(TEST_ACTION_VALUES);
export const ContactTypeSchema = z.enum(CONTACT_TYPES);
export const ContactConfidenceSchema = z.enum(CONTACT_CONFIDENCE_VALUES);
export const ContactStatusSchema = z.enum(CONTACT_STATUS_VALUES);
export const QualityCheckTypeSchema = z.enum(QUALITY_CHECK_TYPES);
export const QualityCheckStatusSchema = z.enum(QUALITY_CHECK_STATUS_VALUES);
export const QualityCheckSeveritySchema = z.enum(QUALITY_CHECK_SEVERITY_VALUES);

export const BaseSubmissionSchema = z
  .object({
    form_type: FormTypeSchema.optional(),
    test_action: TestActionSchema.optional(),
    is_test_data: z.string().optional(),
  })
  .passthrough();

export const FranchiseeSubmissionSchema = BaseSubmissionSchema.extend({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  country_code: z.string().trim().optional(),
  whatsapp: z.string().trim().min(8),
  city_origin: z.string().trim().optional(),
  interest_category: z.string().trim().optional(),
  budget_range: z.string().trim().optional(),
  location_plan: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

export const FranchisorSubmissionSchema = BaseSubmissionSchema.extend({
  brand_name: z.string().trim().min(2),
  company_name: z.string().trim().optional(),
  category: z.string().trim().optional(),
  pic_name: z.string().trim().optional(),
  email_contact: z.string().trim().email(),
  country_code: z.string().trim().optional(),
  whatsapp: z.string().trim().min(8),
  website_url: z.string().trim().optional(),
  instagram_url: z.string().trim().optional(),
  facebook_url: z.string().trim().optional(),
  tiktok_url: z.string().trim().optional(),
  youtube_url: z.string().trim().optional(),
  linkedin_url: z.string().trim().optional(),
  unclaimed_id: z.string().trim().optional(),
}).passthrough();

export const CreateUnclaimedSubmissionSchema = BaseSubmissionSchema.extend({
  brand_name: z.string().trim().min(2),
  category: z.string().trim().optional(),
  min_capital: z.string().trim().optional(),
  city: z.string().trim().optional(),
});

export const GetFranchisesQuerySchema = z.object({
  tab: z
    .preprocess(
      (value) => (value ? String(value).toUpperCase() : "FRANCHISOR"),
      SourceSheetSchema,
    )
    .default("FRANCHISOR"),
  purpose: z.string().trim().max(50).optional().default(""),
  q: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(500).optional().default(500),
  offset: z.coerce.number().int().min(0).optional().default(0),
  source: z.enum(["d1", "sheets"]).optional(),
});

const editableFields = new Set(EDITABLE_LISTING_FIELD_DEFS.map((field) => field.name));
const integerFields = new Set(INTEGER_LISTING_FIELDS);
const realFields = new Set(REAL_LISTING_FIELDS);
const statusValues = new Set(LISTING_STATUS_VALUES);
const tierValues = new Set(LISTING_TIER_VALUES);
const royaltyBasisValues = new Set(ROYALTY_BASIS_VALUES);

export function sanitizeListingChanges(changes) {
  const clean = {};
  for (const [field, value] of Object.entries(changes || {})) {
    if (!editableFields.has(field)) {
      throw new Error(`Field cannot be edited from dashboard: ${field}`);
    }

    clean[field] = normalizeListingFieldValue(field, value);
  }

  if (!Object.keys(clean).length) {
    throw new Error("At least one valid field change is required.");
  }

  return clean;
}

export function normalizeListingFieldValue(field, value) {
  if (value === undefined || value === null) return null;

  if (integerFields.has(field)) {
    if (value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${field} must be a number.`);
    return Math.round(number);
  }

  if (realFields.has(field)) {
    if (value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${field} must be a number.`);
    return number;
  }

  const text = normalizeText(value);
  if (!text) return null;
  if (field === "status" && !statusValues.has(text)) throw new Error("Invalid listing status.");
  if (field === "verification_tier" && !tierValues.has(text)) throw new Error("Invalid verification tier.");
  if (field === "royalty_basis" && !royaltyBasisValues.has(text)) throw new Error("Invalid royalty basis.");
  return text.slice(0, field.endsWith("_desc") || field === "support_system" ? 12000 : 2000);
}

export function normalizeListingStatusValue(value) {
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

export function normalizeVerificationTierValue(status, isVerified) {
  const normalizedStatus = normalizeText(status).toLowerCase();
  const verified = normalizeText(isVerified).toLowerCase();
  if (normalizedStatus === "premium") return "premium";
  if (normalizedStatus === "verified" || verified === "true") return "verified";
  if (normalizedStatus === "unclaimed") return "unclaimed";
  return "free";
}

export function normalizeRoyaltyBasisValue(value) {
  const normalized = normalizeText(value).toLowerCase();
  return royaltyBasisValues.has(normalized) ? normalized : null;
}

export function normalizeHakiStatusValue(value) {
  const normalized = normalizeText(value).toLowerCase();
  return HAKI_STATUS_VALUES.includes(normalized) ? normalized : null;
}

export function normalizeText(value) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}
