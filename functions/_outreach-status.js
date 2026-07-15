import { SITE_ID } from "./_dashboard-schemas.js";
import { randomId } from "./_dashboard-utils.js";
import { normalizeOutreachPipelineStatus } from "../src/lib/outreach-pipeline.js";

export function outreachStatusStatement(db, { franchiseId, status, staffUserId, notes = "" }) {
  const normalizedStatus = normalizeOutreachPipelineStatus(status);
  const now = new Date().toISOString();
  const contactedAt = ["contacted", "responded", "qualified", "claim_started", "claimed", "subscribed", "renewal_risk"].includes(normalizedStatus) ? now : null;
  const responseAt = ["responded", "qualified", "claim_started", "claimed", "subscribed"].includes(normalizedStatus) ? now : null;
  const claimedAt = ["claim_started", "claimed", "subscribed"].includes(normalizedStatus) ? now : null;
  const subscribedAt = normalizedStatus === "subscribed" ? now : null;
  return db
    .prepare(
      `INSERT INTO listing_outreach_statuses (
        id, franchise_id, site_id, status, assigned_staff_user_id, notes,
        last_contacted_at, last_response_at, last_claimed_at, last_subscribed_at,
        last_status_changed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(franchise_id, site_id) DO UPDATE SET
        status = excluded.status,
        assigned_staff_user_id = COALESCE(excluded.assigned_staff_user_id, listing_outreach_statuses.assigned_staff_user_id),
        notes = CASE WHEN excluded.notes IS NOT NULL AND excluded.notes != '' THEN excluded.notes ELSE listing_outreach_statuses.notes END,
        last_contacted_at = COALESCE(excluded.last_contacted_at, listing_outreach_statuses.last_contacted_at),
        last_response_at = COALESCE(excluded.last_response_at, listing_outreach_statuses.last_response_at),
        last_claimed_at = COALESCE(excluded.last_claimed_at, listing_outreach_statuses.last_claimed_at),
        last_subscribed_at = COALESCE(excluded.last_subscribed_at, listing_outreach_statuses.last_subscribed_at),
        last_status_changed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      `outreach_status_${randomId()}`,
      franchiseId,
      SITE_ID,
      normalizedStatus,
      staffUserId || null,
      notes || "",
      contactedAt,
      responseAt,
      claimedAt,
      subscribedAt,
    );
}

export function outreachEventOutcomeForStatus(status) {
  return {
    uncontacted: "queued",
    saved_contact: "queued",
    contacted: "contacted",
    responded: "replied",
    qualified: "replied",
    claim_started: "claim_started",
    claimed: "claimed",
    subscribed: "claimed",
    renewal_risk: "no_response",
    burned: "no_response",
  }[status] || "note";
}
