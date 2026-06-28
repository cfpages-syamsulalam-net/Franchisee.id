import { AuthError } from "./_clerk-auth.js";
import { SITE_ID, EDIT_FIELD_NAME, sanitizeChanges, updateListingStatement } from "./_dashboard-schemas.js";
import { getListingSnapshot, hasAutoApproval } from "./_dashboard-queries.js";
import { auditStatement, assertAdmin, isAdmin, jsonResponse, parseJson, randomId } from "./_dashboard-utils.js";
import { refreshDashboardQualityChecks } from "./_quality-checks.js";
import { siteRebuildStatements } from "./_site-publish-queue.js";

export async function handleLogOutreach(db, auth, data) {
  const eventId = `outreach_${randomId()}`;
  await db
    .prepare(
      `INSERT INTO listing_outreach_events (
        id, franchise_id, site_id, staff_user_id, channel, contact_label, contact_value,
        message_template_key, message_text, outcome, notes
      ) VALUES (?, ?, ?, ?, 'whatsapp', ?, ?, 'unclaimed_claim_notice_v1', ?, ?, ?)`,
    )
    .bind(
      eventId,
      data.franchise_id,
      SITE_ID,
      auth.id,
      data.contact_label,
      data.contact_value,
      data.message_text,
      data.outcome,
      data.notes,
    )
    .run();

  await db
    .prepare(
      `INSERT INTO audit_events (id, actor_user_id, source_site_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, 'dashboard.outreach.log', 'franchise', ?, ?)`,
    )
    .bind(`audit_${randomId()}`, auth.id, SITE_ID, data.franchise_id, JSON.stringify({ outcome: data.outcome, contact: data.contact_value }))
    .run();

  return jsonResponse({ success: true, event_id: eventId });
}

export async function handleSuggestEdit(db, auth, data) {
  const changes = sanitizeChanges(data.changes);
  const listing = await getListingSnapshot(db, data.franchise_id);
  if (!listing) return jsonResponse({ success: false, error: "LISTING_NOT_FOUND" }, { status: 404 });

  const oldValues = {};
  Object.keys(changes).forEach((field) => {
    oldValues[field] = listing[field] ?? null;
  });

  const admin = isAdmin(auth);
  const autoApproved = admin || (await hasAutoApproval(db, auth.id));
  const status = admin ? "approved" : autoApproved ? "auto_approved" : "pending";
  const suggestionId = `suggestion_${randomId()}`;
  const statements = [
    db
      .prepare(
        `INSERT INTO listing_edit_suggestions (
          id, franchise_id, site_id, suggested_by_user_id, status, field_name,
          old_value, suggested_value, reason, reviewed_by_user_id, reviewed_at, review_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        suggestionId,
        data.franchise_id,
        SITE_ID,
        auth.id,
        status,
        EDIT_FIELD_NAME,
        JSON.stringify(oldValues),
        JSON.stringify(changes),
        data.reason,
        autoApproved ? auth.id : null,
        autoApproved ? new Date().toISOString() : null,
        autoApproved ? "Applied from dashboard edit form." : null,
      ),
    auditStatement(db, "dashboard.edit.suggest", "franchise", data.franchise_id, {
      suggestion_id: suggestionId,
      status,
      fields: Object.keys(changes),
    }, auth.id),
  ];

  if (autoApproved) {
    statements.push(
      updateListingStatement(db, data.franchise_id, changes),
      auditStatement(db, "dashboard.edit.apply", "franchise", data.franchise_id, {
        suggestion_id: suggestionId,
        fields: Object.keys(changes),
        auto_approved: !admin,
      }, auth.id),
      ...siteRebuildStatements(db, {
        siteId: SITE_ID,
        franchiseId: data.franchise_id,
        reason: "dashboard_listing_edit",
        entityType: "listing_edit_suggestions",
        entityId: suggestionId,
        actorUserId: auth.id,
        source: "dashboard",
        metadata: { fields: Object.keys(changes), status },
      }),
    );
  }

  await db.batch(statements);
  return jsonResponse({ success: true, suggestion_id: suggestionId, status, applied: autoApproved });
}

export async function handleReviewEditSuggestion(db, auth, data) {
  assertAdmin(auth);
  const suggestion = await db
    .prepare(
      `SELECT les.*, f.brand_name
       FROM listing_edit_suggestions les
       JOIN franchises f ON f.id = les.franchise_id
       WHERE les.id = ? AND les.site_id = ?
       LIMIT 1`
    )
    .bind(data.suggestion_id, SITE_ID)
    .first();

  if (!suggestion) return jsonResponse({ success: false, error: "SUGGESTION_NOT_FOUND" }, { status: 404 });
  if (suggestion.status !== "pending") {
    return jsonResponse({ success: false, error: "SUGGESTION_ALREADY_REVIEWED", status: suggestion.status }, { status: 409 });
  }

  const approved = data.decision === "approve";
  const status = approved ? "approved" : "rejected";
  const statements = [
    db
      .prepare(
        `UPDATE listing_edit_suggestions
         SET status = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP, review_notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(status, auth.id, data.notes, data.suggestion_id),
    auditStatement(db, approved ? "dashboard.edit.approve" : "dashboard.edit.reject", "listing_edit_suggestions", data.suggestion_id, {
      franchise_id: suggestion.franchise_id,
      notes: data.notes,
    }, auth.id),
  ];

  if (approved) {
    const changes = sanitizeChanges(parseJson(suggestion.suggested_value, {}));
    statements.push(
      updateListingStatement(db, suggestion.franchise_id, changes),
      auditStatement(db, "dashboard.edit.apply", "franchise", suggestion.franchise_id, {
        suggestion_id: data.suggestion_id,
        fields: Object.keys(changes),
      }, auth.id),
      ...siteRebuildStatements(db, {
        siteId: SITE_ID,
        franchiseId: suggestion.franchise_id,
        reason: "dashboard_listing_edit_approved",
        entityType: "listing_edit_suggestions",
        entityId: data.suggestion_id,
        actorUserId: auth.id,
        source: "dashboard",
        metadata: { fields: Object.keys(changes) },
      }),
    );
  }

  await db.batch(statements);
  return jsonResponse({ success: true, status });
}

export async function handleReviewClaim(db, auth, data) {
  assertAdmin(auth);
  const claim = await db
    .prepare(
      `SELECT fc.*, f.brand_name, f.status AS franchise_status, f.verification_tier
       FROM franchise_claims fc
       JOIN franchises f ON f.id = fc.franchise_id
       WHERE fc.id = ? AND fc.source_site_id = ?
       LIMIT 1`
    )
    .bind(data.claim_id, SITE_ID)
    .first();

  if (!claim) return jsonResponse({ success: false, error: "CLAIM_NOT_FOUND" }, { status: 404 });
  if (claim.status !== "pending") {
    return jsonResponse({ success: false, error: "CLAIM_ALREADY_REVIEWED", status: claim.status }, { status: 409 });
  }

  const approved = data.decision === "approve";
  const status = approved ? "approved" : "rejected";
  const statements = [
    db
      .prepare(
        `UPDATE franchise_claims
         SET status = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP, review_notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(status, auth.id, data.notes, data.claim_id),
    auditStatement(db, approved ? "dashboard.claim.approve" : "dashboard.claim.reject", "franchise_claims", data.claim_id, {
      franchise_id: claim.franchise_id,
      claimant_user_id: claim.claimant_user_id,
      notes: data.notes,
    }, auth.id),
  ];

  if (approved) {
    statements.push(
      db
        .prepare(
          `UPDATE franchises
           SET owner_user_id = COALESCE(?, owner_user_id),
               franchisor_profile_id = COALESCE(?, franchisor_profile_id),
               status = CASE WHEN status = 'unclaimed' THEN 'free' ELSE status END,
               verification_tier = CASE WHEN verification_tier = 'unclaimed' THEN 'free' ELSE verification_tier END,
               source_sheet = 'FRANCHISOR',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
        .bind(claim.claimant_user_id, claim.franchisor_profile_id, claim.franchise_id),
      auditStatement(db, "dashboard.claim.apply_owner", "franchise", claim.franchise_id, {
        claim_id: data.claim_id,
        claimant_user_id: claim.claimant_user_id,
      }, auth.id),
      ...siteRebuildStatements(db, {
        siteId: SITE_ID,
        franchiseId: claim.franchise_id,
        reason: "dashboard_claim_approved",
        entityType: "franchise_claims",
        entityId: data.claim_id,
        actorUserId: auth.id,
        source: "dashboard",
        metadata: { claimant_user_id: claim.claimant_user_id },
      }),
    );
  }

  await db.batch(statements);
  return jsonResponse({ success: true, status });
}

export async function handleRefreshQualityChecks(db, auth) {
  const result = await refreshDashboardQualityChecks(db, auth);
  return jsonResponse({ success: true, result });
}

export { AuthError };
