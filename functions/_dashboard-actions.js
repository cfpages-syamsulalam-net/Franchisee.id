import { AuthError } from "./_clerk-auth.js";
import {
  PREMIUM_NETWORK_SITE_IDS,
  PREMIUM_PLAN_CODE,
  premiumCanonicalUrl,
  premiumPublicationId,
  premiumSubscriptionId,
} from "./_premium.js";
import { SITE_ID, EDIT_FIELD_NAME, sanitizeChanges, updateListingStatement } from "./_dashboard-schemas.js";
import { getListingSnapshot, hasAutoApproval } from "./_dashboard-queries.js";
import { auditStatement, assertAdmin, isAdmin, jsonResponse, parseJson, randomId } from "./_dashboard-utils.js";
import { refreshDashboardQualityChecks } from "./_quality-checks.js";
import { siteRebuildStatements } from "./_site-publish-queue.js";
import { createPremiumNotification, queueNotificationEmail, recordPremiumEvent } from "./_premium-ops.js";

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

export async function handleUpdatePublication(db, auth, data) {
  assertAdmin(auth);
  const publication = await db
    .prepare(
      `SELECT p.*, f.brand_name
       FROM franchise_site_publications p
       JOIN franchises f ON f.id = p.franchise_id
       WHERE p.franchise_id = ? AND p.site_id = ?
       LIMIT 1`
    )
    .bind(data.franchise_id, data.site_id)
    .first();

  if (!publication) return jsonResponse({ success: false, error: "PUBLICATION_NOT_FOUND" }, { status: 404 });

  const statements = [
    db
      .prepare(
        `UPDATE franchise_site_publications
         SET publication_status = ?,
             first_published_at = CASE WHEN ? = 'published' AND first_published_at IS NULL THEN CURRENT_TIMESTAMP ELSE first_published_at END,
             updated_at = CURRENT_TIMESTAMP
         WHERE franchise_id = ? AND site_id = ?`
      )
      .bind(data.publication_status, data.publication_status, data.franchise_id, data.site_id),
    auditStatement(db, "dashboard.publication.update", "franchise_site_publications", publication.id, {
      franchise_id: data.franchise_id,
      site_id: data.site_id,
      from: publication.publication_status,
      to: data.publication_status,
    }, auth.id),
  ];

  statements.push(
    ...siteRebuildStatements(db, {
      siteId: data.site_id,
      franchiseId: data.franchise_id,
      reason: "dashboard_publication_update",
      entityType: "franchise_site_publications",
      entityId: publication.id,
      actorUserId: auth.id,
      source: "dashboard",
      metadata: { from: publication.publication_status, to: data.publication_status, brand_name: publication.brand_name },
    }),
  );

  await db.batch(statements);
  return jsonResponse({ success: true, publication_status: data.publication_status });
}

export async function handleUpdatePaymentMethod(db, auth, data) {
  assertAdmin(auth);
  const code = data.code || "manual_bca";
  await db.batch([
    db
      .prepare(
        `INSERT INTO payment_methods (
          id, code, method_type, label, account_name, account_number, provider, instructions, sort_order, is_active
        ) VALUES (?, ?, 'bank_transfer', ?, ?, ?, ?, ?, 10, ?)
        ON CONFLICT(code) DO UPDATE SET
          label = excluded.label,
          account_name = excluded.account_name,
          account_number = excluded.account_number,
          provider = excluded.provider,
          instructions = excluded.instructions,
          is_active = excluded.is_active,
          updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        `payment_method_${code.replace(/[^a-zA-Z0-9_-]/g, "") || "manual_bca"}`,
        code,
        data.label,
        data.account_name,
        data.account_number,
        data.provider,
        data.instructions || "",
        data.is_active ? 1 : 0,
      ),
    auditStatement(db, "dashboard.payment_method.update", "payment_methods", code, {
      label: data.label,
      provider: data.provider,
      is_active: data.is_active,
    }, auth.id),
  ]);
  return jsonResponse({ success: true, payment_method_code: code });
}

export async function handleReviewPremiumPayment(db, auth, data) {
  assertAdmin(auth);
  const confirmation = await db
    .prepare(
      `SELECT c.*, o.payable_amount, o.status AS order_status, o.plan_code, f.brand_name, f.slug,
              u.primary_email AS user_email
       FROM premium_payment_confirmations c
       JOIN premium_orders o ON o.id = c.order_id
       JOIN franchises f ON f.id = c.franchise_id
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.id = ?
       LIMIT 1`,
    )
    .bind(data.confirmation_id)
    .first();

  if (!confirmation) return jsonResponse({ success: false, error: "PREMIUM_CONFIRMATION_NOT_FOUND" }, { status: 404 });
  if (confirmation.review_status !== "pending") {
    return jsonResponse({ success: false, error: "PREMIUM_CONFIRMATION_ALREADY_REVIEWED", status: confirmation.review_status }, { status: 409 });
  }

  const approved = data.decision === "approve";
  const status = approved ? "approved" : "rejected";
  const orderStatus = approved ? "paid" : "rejected";
  const statements = [
    db
      .prepare(
        `UPDATE premium_payment_confirmations
         SET review_status = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP,
             review_notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(status, auth.id, data.notes, data.confirmation_id),
    db
      .prepare(
        `UPDATE premium_orders
         SET status = ?, paid_at = CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(orderStatus, orderStatus, confirmation.order_id),
    auditStatement(db, approved ? "premium.payment.approve" : "premium.payment.reject", "premium_payment_confirmations", data.confirmation_id, {
      order_id: confirmation.order_id,
      franchise_id: confirmation.franchise_id,
      submitted_amount: confirmation.submitted_amount,
      expected_amount: confirmation.payable_amount,
      notes: data.notes,
    }, auth.id),
  ];

  if (approved) {
    const currentSubscription = await db
      .prepare(
        `SELECT id, ends_at
         FROM franchise_subscriptions
         WHERE franchise_id = ? AND status = 'active' AND ends_at > CURRENT_TIMESTAMP
         ORDER BY ends_at DESC
         LIMIT 1`,
      )
      .bind(confirmation.franchise_id)
      .first();
    const renewalStartsAt = currentSubscription?.ends_at || null;
    const subscriptionId = premiumSubscriptionId(randomId);
    const premiumSitePlaceholders = PREMIUM_NETWORK_SITE_IDS.map(() => "?").join(", ");
    statements.push(
      db
        .prepare(
          `INSERT INTO franchise_subscriptions (
            id, franchise_id, user_id, plan_code, status, starts_at, ends_at, renewal_status, source_order_id
          ) VALUES (
            ?, ?, ?, ?, 'active',
            COALESCE(?, CURRENT_TIMESTAMP),
            CASE WHEN ? IS NOT NULL THEN datetime(?, '+1 year') ELSE datetime('now', '+1 year') END,
            'none',
            ?
          )`,
        )
        .bind(
          subscriptionId,
          confirmation.franchise_id,
          confirmation.user_id,
          confirmation.plan_code || PREMIUM_PLAN_CODE,
          renewalStartsAt,
          renewalStartsAt,
          renewalStartsAt,
          confirmation.order_id,
        ),
      ...PREMIUM_NETWORK_SITE_IDS.map((siteId) =>
        db
          .prepare(
            `INSERT OR IGNORE INTO franchise_site_publications (
              id, franchise_id, site_id, slug, canonical_url, publication_status,
              is_primary, first_published_at, last_synced_at
            ) VALUES (?, ?, ?, ?, ?, 'published', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          )
          .bind(
            premiumPublicationId(confirmation.franchise_id, siteId),
            confirmation.franchise_id,
            siteId,
            confirmation.slug,
            premiumCanonicalUrl(siteId, confirmation.slug),
            siteId === SITE_ID ? 1 : 0,
          ),
      ),
      db
        .prepare(
          `UPDATE franchises
           SET verification_tier = 'premium',
               status = CASE WHEN status = 'unclaimed' THEN 'free' ELSE status END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        )
        .bind(confirmation.franchise_id),
      db
        .prepare(
          `UPDATE franchise_site_publications
           SET publication_status = 'published',
               first_published_at = CASE WHEN first_published_at IS NULL THEN CURRENT_TIMESTAMP ELSE first_published_at END,
               updated_at = CURRENT_TIMESTAMP
           WHERE franchise_id = ? AND site_id IN (${premiumSitePlaceholders})`,
        )
        .bind(confirmation.franchise_id, ...PREMIUM_NETWORK_SITE_IDS),
      auditStatement(db, "premium.subscription.activate", "franchise_subscriptions", subscriptionId, {
        order_id: confirmation.order_id,
        franchise_id: confirmation.franchise_id,
        brand_name: confirmation.brand_name,
        network_sites: PREMIUM_NETWORK_SITE_IDS,
        renewal_for_subscription_id: currentSubscription?.id || null,
      }, auth.id),
      ...PREMIUM_NETWORK_SITE_IDS.flatMap((siteId) => siteRebuildStatements(db, {
        siteId,
        franchiseId: confirmation.franchise_id,
        reason: "premium_payment_approved",
        entityType: "premium_payment_confirmations",
        entityId: data.confirmation_id,
        actorUserId: auth.id,
        source: "dashboard",
        metadata: { order_id: confirmation.order_id, brand_name: confirmation.brand_name },
      })),
    );
    if (currentSubscription) {
      statements.push(
        db
          .prepare(
            `UPDATE franchise_subscriptions
             SET renewal_status = 'renewed', updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
          )
          .bind(currentSubscription.id),
      );
    }
  }

  await db.batch(statements);
  await Promise.all([
    recordPremiumEvent(db, {
      event_type: approved ? "premium_payment_approved" : "premium_payment_rejected",
      user_id: confirmation.user_id,
      franchise_id: confirmation.franchise_id,
      order_id: confirmation.order_id,
      surface: "dashboard",
      metadata: { brand_name: confirmation.brand_name },
    }),
    approved ? recordPremiumEvent(db, {
      event_type: "premium_activated",
      user_id: confirmation.user_id,
      franchise_id: confirmation.franchise_id,
      order_id: confirmation.order_id,
      surface: "dashboard",
      metadata: { brand_name: confirmation.brand_name },
    }) : null,
    createPremiumNotification(db, {
      user_id: confirmation.user_id,
      franchise_id: confirmation.franchise_id,
      order_id: confirmation.order_id,
      notification_type: approved ? "payment_approved" : "payment_rejected",
      title: approved ? "Pembayaran Premium disetujui" : "Pembayaran Premium perlu diperiksa",
      message: approved
        ? "Premium sudah aktif untuk listing Anda."
        : "Konfirmasi pembayaran belum bisa disetujui. Periksa catatan dan kirim ulang bila perlu.",
      action_url: "/profil/?tab=membership",
    }),
    approved ? createPremiumNotification(db, {
      user_id: confirmation.user_id,
      franchise_id: confirmation.franchise_id,
      order_id: confirmation.order_id,
      notification_type: "premium_activated",
      title: "Premium aktif",
      message: "Listing Anda sudah mendapat status Premium.",
      action_url: "/profil/?tab=membership",
    }) : null,
    queueNotificationEmail(db, {
      user_id: confirmation.user_id,
      to_email: confirmation.user_email,
      category: approved ? "premium_payment_approved" : "premium_payment_rejected",
      subject: approved ? "Premium Anda sudah aktif" : "Konfirmasi pembayaran Premium perlu diperiksa",
      body_text: approved
        ? `${confirmation.brand_name || "Listing"} sudah aktif Premium. Buka profil untuk melihat masa aktif dan status distribusi.`
        : `${confirmation.brand_name || "Listing"} belum bisa disetujui. Buka profil untuk melihat status dan kirim ulang konfirmasi bila perlu.`,
      related_entity_type: "premium_order",
      related_entity_id: confirmation.order_id,
    }),
  ]);
  return jsonResponse({ success: true, status });
}

export { AuthError };
