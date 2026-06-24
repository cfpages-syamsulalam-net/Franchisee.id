import { z } from "zod";
import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";

export const SITE_ID = SITE_FRANCHISEE_ID;
export const EDIT_FIELD_NAME = "json_diff";

const EDITABLE_LISTING_FIELDS = new Set([
  "brand_name",
  "category",
  "subcategory",
  "label",
  "status",
  "verification_tier",
  "year_established",
  "city_origin",
  "outlet_type",
  "location_requirement",
  "rent_cost_text",
  "contract_duration_months",
  "fee_license_idr",
  "fee_capex_idr",
  "fee_construction_idr",
  "total_investment_idr",
  "min_investment_idr",
  "max_investment_idr",
  "estimated_bep_months",
  "omzet_monthly_idr",
  "hpp_percent",
  "net_profit_percent",
  "royalty_percent",
  "royalty_basis",
  "royalty_period",
  "short_desc",
  "full_desc",
  "support_system",
  "phone",
  "office_address",
  "outlets_location",
  "logo_url",
  "cover_url",
  "gallery_urls",
  "video_url",
  "proposal_url",
]);

const INTEGER_FIELDS = new Set([
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
]);

const REAL_FIELDS = new Set(["hpp_percent", "net_profit_percent", "royalty_percent"]);
const STATUS_VALUES = new Set(["unclaimed", "draft", "pending_review", "free", "verified", "premium", "suspended", "archived"]);
const TIER_VALUES = new Set(["unclaimed", "free", "verified", "premium"]);
const ROYALTY_BASIS_VALUES = new Set(["omzet", "profit", "fixed", "none"]);

const OutreachEventSchema = z.object({
  action: z.literal("log_outreach"),
  franchise_id: z.string().trim().min(1),
  contact_label: z.string().trim().max(80).optional().default("WhatsApp"),
  contact_value: z.string().trim().max(120).optional().default(""),
  message_text: z.string().trim().max(1200).optional().default(""),
  outcome: z
    .enum(["queued", "contacted", "replied", "claim_started", "claimed", "invalid_contact", "no_response", "note"])
    .optional()
    .default("contacted"),
  notes: z.string().trim().max(1000).optional().default(""),
});

const SuggestEditSchema = z.object({
  action: z.literal("suggest_edit"),
  franchise_id: z.string().trim().min(1),
  changes: z.record(z.unknown()),
  reason: z.string().trim().max(1200).optional().default(""),
});

const ReviewEditSuggestionSchema = z.object({
  action: z.literal("review_edit_suggestion"),
  suggestion_id: z.string().trim().min(1),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(1200).optional().default(""),
});

const ReviewClaimSchema = z.object({
  action: z.literal("review_claim"),
  claim_id: z.string().trim().min(1),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(1200).optional().default(""),
});

export const DashboardActionSchema = z.discriminatedUnion("action", [
  OutreachEventSchema,
  SuggestEditSchema,
  ReviewEditSuggestionSchema,
  ReviewClaimSchema,
]);

export function sanitizeChanges(changes) {
  const clean = {};
  for (const [field, value] of Object.entries(changes || {})) {
    if (!EDITABLE_LISTING_FIELDS.has(field)) {
      throw new Error(`Field cannot be edited from dashboard: ${field}`);
    }

    clean[field] = normalizeFieldValue(field, value);
  }

  if (!Object.keys(clean).length) {
    throw new Error("At least one valid field change is required.");
  }

  return clean;
}

export function updateListingStatement(db, franchiseId, changes) {
  const fields = Object.keys(changes);
  return db
    .prepare(
      `UPDATE franchises
       SET ${fields.map((field) => `${field} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(...fields.map((field) => changes[field]), franchiseId);
}

function normalizeFieldValue(field, value) {
  if (value === undefined) return null;
  if (value === null) return null;

  if (INTEGER_FIELDS.has(field)) {
    if (value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${field} must be a number.`);
    return Math.round(number);
  }

  if (REAL_FIELDS.has(field)) {
    if (value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${field} must be a number.`);
    return number;
  }

  const text = normalizeText(value);
  if (!text) return null;
  if (field === "status" && !STATUS_VALUES.has(text)) throw new Error("Invalid listing status.");
  if (field === "verification_tier" && !TIER_VALUES.has(text)) throw new Error("Invalid verification tier.");
  if (field === "royalty_basis" && !ROYALTY_BASIS_VALUES.has(text)) throw new Error("Invalid royalty basis.");
  return text.slice(0, field.endsWith("_desc") || field === "support_system" ? 12000 : 2000);
}

function normalizeText(value) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}
