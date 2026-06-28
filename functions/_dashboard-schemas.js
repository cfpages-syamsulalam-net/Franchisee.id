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

export const DashboardActionSchema = z.discriminatedUnion("action", [
  OutreachEventSchema,
  SuggestEditSchema,
  ReviewEditSuggestionSchema,
  ReviewClaimSchema,
  RefreshQualityChecksSchema,
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
