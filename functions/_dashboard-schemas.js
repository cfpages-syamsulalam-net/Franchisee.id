import { z } from "zod";
import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";
import {
  DashboardDecisionSchema,
  EDITABLE_LISTING_FIELD_DEFS,
  sanitizeListingChanges,
} from "./_shared-schemas.js";

export const SITE_ID = SITE_FRANCHISEE_ID;
export const EDIT_FIELD_NAME = "json_diff";
export { EDITABLE_LISTING_FIELD_DEFS };

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
  decision: DashboardDecisionSchema,
  notes: z.string().trim().max(1200).optional().default(""),
});

const ReviewClaimSchema = z.object({
  action: z.literal("review_claim"),
  claim_id: z.string().trim().min(1),
  decision: DashboardDecisionSchema,
  notes: z.string().trim().max(1200).optional().default(""),
});

const RefreshQualityChecksSchema = z.object({
  action: z.literal("refresh_quality_checks"),
});

const UpdatePublicationSchema = z.object({
  action: z.literal("update_publication"),
  franchise_id: z.string().trim().min(1),
  site_id: z.string().trim().min(1),
  publication_status: z.enum(["draft", "published", "hidden", "archived"]),
});

const ListingLocationSchema = z.object({
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().max(100).optional().or(z.literal("")).default(""),
  location_type: z.enum(["head_office", "outlet", "available_area", "origin"]).default("available_area"),
});

const UpdateListingLocationsSchema = z.object({
  action: z.literal("update_listing_locations"),
  franchise_id: z.string().trim().min(1),
  locations: z.array(ListingLocationSchema).max(24).default([]),
});

const ReviewPremiumPaymentSchema = z.object({
  action: z.literal("review_premium_payment"),
  confirmation_id: z.string().trim().min(1),
  decision: DashboardDecisionSchema,
  notes: z.string().trim().max(1200).optional().default(""),
});

const UpdatePaymentMethodSchema = z.object({
  action: z.literal("update_payment_method"),
  code: z.string().trim().min(2).max(80).default("manual_bca"),
  method_type: z.enum(["bank_transfer", "qris", "ewallet", "gateway", "other"]).optional().default("bank_transfer"),
  label: z.string().trim().min(2).max(120),
  provider: z.string().trim().min(2).max(80),
  account_name: z.string().trim().min(2).max(160),
  account_number: z.string().trim().min(2).max(80),
  instructions: z.string().trim().max(600).optional().default(""),
  qris_image_url: z.string().trim().url().max(500).optional().or(z.literal("")).default(""),
  qris_image_alt: z.string().trim().max(160).optional().default(""),
  is_active: z.boolean().optional().default(true),
});

const ManageNotificationEmailSchema = z.object({
  action: z.literal("manage_notification_email"),
  email_id: z.string().trim().min(1),
  email_action: z.enum(["retry", "cancel"]),
});

const UpdatePremiumSettingsSchema = z.object({
  action: z.literal("update_premium_settings"),
  grace_period_days: z.coerce.number().min(0).max(30).default(3),
  grace_daily_email_enabled: z.boolean().optional().default(true),
  annual_report_enabled: z.boolean().optional().default(true),
  multi_brand_discount_enabled: z.boolean().optional().default(false),
  multi_brand_discount_percent: z.coerce.number().min(0).max(90).default(0),
  multi_brand_min_owned_brands: z.coerce.number().int().min(2).max(50).default(2),
  promo_enabled: z.boolean().optional().default(false),
  promo_discount_percent: z.coerce.number().min(0).max(90).default(0),
  promo_label: z.string().trim().max(120).optional().default(""),
  promo_message: z.string().trim().max(220).optional().default(""),
  promo_bonus_text: z.string().trim().max(220).optional().default(""),
  promo_cta_label: z.string().trim().max(80).optional().default("Lihat Premium"),
  promo_cta_url: z.string().trim().max(220).optional().default("/premium/"),
  promo_starts_at: z.string().trim().max(40).optional().default(""),
  promo_ends_at: z.string().trim().max(40).optional().default(""),
});

export const DashboardActionSchema = z.discriminatedUnion("action", [
  OutreachEventSchema,
  SuggestEditSchema,
  ReviewEditSuggestionSchema,
  ReviewClaimSchema,
  RefreshQualityChecksSchema,
  UpdatePublicationSchema,
  UpdateListingLocationsSchema,
  ReviewPremiumPaymentSchema,
  UpdatePaymentMethodSchema,
  ManageNotificationEmailSchema,
  UpdatePremiumSettingsSchema,
]);

export function sanitizeChanges(changes) {
  return sanitizeListingChanges(changes);
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
