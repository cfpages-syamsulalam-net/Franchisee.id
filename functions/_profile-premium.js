import { z } from "zod";
import {
  PREMIUM_BASE_AMOUNT,
  PREMIUM_ORDER_WINDOW_HOURS,
  PREMIUM_PLAN_CODE,
  PREMIUM_RENEWAL_WINDOW_DAYS,
  nextPremiumUniqueCode,
  normalizeSubmittedAmount,
  payableAmount,
  paymentInstructions,
  premiumConfirmationId,
  premiumOrderId,
} from "./_premium.js";
import {
  createPremiumNotification,
  loadActivePaymentMethod,
  loadPremiumNotifications,
  notifyAdmins,
  premiumOrderPricing,
  premiumReadinessForListing,
  queueAdminPremiumEmails,
  queueNotificationEmail,
  recordPremiumEvent,
  textOrNull,
} from "./_premium-ops.js";
import { auditStatement, jsonResponse, randomId } from "./_dashboard-utils.js";

const PREMIUM_MEMBERSHIP_QUERY_CHUNK_SIZE = 80;

export const CreatePremiumOrderSchema = z.object({
  action: z.literal("create_premium_order"),
  franchise_id: z.string().trim().min(3).max(120),
});

export const ConfirmPremiumPaymentSchema = z.object({
  action: z.literal("confirm_premium_payment"),
  order_id: z.string().trim().min(3).max(160),
  payer_name: optionalText(160),
  payer_bank: optionalText(80),
  submitted_amount: z.union([z.string(), z.number()]),
  submitted_paid_at: optionalText(80),
  notes: optionalText(1200),
  proof_asset_id: optionalText(180),
});

export async function createPremiumOrder(db, actor, data) {
  const listing = await loadOwnedListingForPremium(db, actor, data.franchise_id);
  if (!listing) {
    return jsonResponse({ success: false, message: "Listing tidak ditemukan atau belum terhubung dengan akun Anda." }, { status: 404 });
  }

  const active = await db
    .prepare(
      `SELECT id, status, ends_at
       FROM franchise_subscriptions
       WHERE franchise_id = ? AND status = 'active' AND ends_at > CURRENT_TIMESTAMP
       ORDER BY ends_at DESC
       LIMIT 1`,
    )
    .bind(listing.id)
    .first();
  if (active && !isRenewableSubscription(active)) {
    return jsonResponse({
      success: false,
      message: `Premium masih aktif sampai ${active.ends_at}. Renewal bisa dibuat mendekati masa berakhir.`,
      active_subscription: active,
    }, { status: 409 });
  }

  const existing = await db
    .prepare(
      `SELECT o.*, f.brand_name
       FROM premium_orders o
       JOIN franchises f ON f.id = o.franchise_id
       WHERE o.user_id = ?
         AND o.franchise_id = ?
         AND o.status IN ('pending_payment', 'confirmation_submitted')
         AND o.expires_at > CURRENT_TIMESTAMP
       ORDER BY o.created_at DESC
       LIMIT 1`,
    )
    .bind(actor.id, listing.id)
    .first();
  if (existing) {
    return jsonResponse({ success: true, order: await serializePremiumOrder(db, existing), reused: true });
  }

  const code = await nextPremiumUniqueCode(db);
  const pricing = await premiumOrderPricing(db, actor, listing);
  const amount = payableAmount(code, pricing.base_amount, pricing.discount_amount);
  const orderId = premiumOrderId(randomId);
  await db.batch([
    db
      .prepare(
        `INSERT INTO premium_orders (
          id, user_id, franchise_id, plan_code, base_amount, unique_code, payable_amount,
          currency, status, payment_method, payment_provider, expires_at, discount_amount, discount_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'IDR', 'pending_payment', 'bank_transfer', 'manual_bca', datetime('now', ?), ?, ?)`,
      )
      .bind(
        orderId,
        actor.id,
        listing.id,
        PREMIUM_PLAN_CODE,
        pricing.base_amount,
        code,
        amount,
        `+${PREMIUM_ORDER_WINDOW_HOURS} hours`,
        pricing.discount_amount,
        pricing.discount_reason,
      ),
    auditStatement(db, "premium.order.create", "premium_orders", orderId, {
      franchise_id: listing.id,
      brand_name: listing.brand_name,
      payable_amount: amount,
      discount_amount: pricing.discount_amount,
      discount_reason: pricing.discount_reason,
      renewal_for_subscription_id: active?.id || null,
    }, actor.id),
  ]);

  await recordPremiumEvent(db, {
    event_type: "premium_order_created",
    user_id: actor.id,
    franchise_id: listing.id,
    order_id: orderId,
    surface: "profile",
    metadata: { brand_name: listing.brand_name },
  });

  const order = await db
    .prepare(
      `SELECT o.*, f.brand_name
       FROM premium_orders o
       JOIN franchises f ON f.id = o.franchise_id
       WHERE o.id = ?
       LIMIT 1`,
    )
    .bind(orderId)
    .first();
  return jsonResponse({ success: true, order: await serializePremiumOrder(db, order), reused: false });
}

export async function confirmPremiumPayment(db, actor, data) {
  const amount = normalizeSubmittedAmount(data.submitted_amount);
  if (!amount) return jsonResponse({ success: false, message: "Isi nominal transfer yang sudah dibayar." }, { status: 400 });

  const order = await db
    .prepare(
      `SELECT o.*, f.brand_name
       FROM premium_orders o
       JOIN franchises f ON f.id = o.franchise_id
       WHERE o.id = ? AND o.user_id = ?
       LIMIT 1`,
    )
    .bind(data.order_id, actor.id)
    .first();
  if (!order) return jsonResponse({ success: false, message: "Order Premium tidak ditemukan." }, { status: 404 });
  if (!["pending_payment", "confirmation_submitted"].includes(order.status)) {
    return jsonResponse({ success: false, message: "Order ini sudah selesai atau tidak aktif." }, { status: 409 });
  }

  const proofAssetId = textOrNull(data.proof_asset_id);
  if (proofAssetId) {
    const asset = await loadOwnedReceiptAsset(db, actor, order, proofAssetId);
    if (!asset) return jsonResponse({ success: false, message: "Bukti pembayaran tidak ditemukan untuk akun ini." }, { status: 400 });
  }

  const existing = await db
    .prepare(
      `SELECT id
       FROM premium_payment_confirmations
       WHERE order_id = ? AND review_status = 'pending'
       LIMIT 1`,
    )
    .bind(order.id)
    .first();
  if (existing) {
    return jsonResponse({ success: false, message: "Konfirmasi pembayaran sudah masuk dan sedang dicek." }, { status: 409 });
  }

  const confirmationId = premiumConfirmationId(randomId);
  await db.batch([
    db
      .prepare(
        `INSERT INTO premium_payment_confirmations (
          id, order_id, user_id, franchise_id, payer_name, payer_bank,
          submitted_amount, submitted_paid_at, proof_asset_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        confirmationId,
        order.id,
        actor.id,
        order.franchise_id,
        textOrNull(data.payer_name),
        textOrNull(data.payer_bank),
        amount,
        textOrNull(data.submitted_paid_at),
        proofAssetId,
        textOrNull(data.notes),
      ),
    db
      .prepare("UPDATE premium_orders SET status = 'confirmation_submitted', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(order.id),
    auditStatement(db, "premium.payment.confirm", "premium_orders", order.id, {
      confirmation_id: confirmationId,
      franchise_id: order.franchise_id,
      submitted_amount: amount,
      expected_amount: order.payable_amount,
      has_proof: Boolean(proofAssetId),
    }, actor.id),
  ]);

  await Promise.all([
    recordPremiumEvent(db, {
      event_type: "premium_confirmation_submitted",
      user_id: actor.id,
      franchise_id: order.franchise_id,
      order_id: order.id,
      surface: "profile",
      metadata: { has_proof: Boolean(proofAssetId) },
    }),
    createPremiumNotification(db, {
      user_id: actor.id,
      franchise_id: order.franchise_id,
      order_id: order.id,
      notification_type: "payment_submitted",
      title: "Konfirmasi pembayaran diterima",
      message: "Pembayaran Premium Anda sudah masuk antrean pengecekan.",
      action_url: "/profil/?tab=membership",
    }),
    queueNotificationEmail(db, {
      user_id: actor.id,
      to_email: actor.primary_email,
      category: "premium_payment",
      subject: "Konfirmasi pembayaran Premium diterima",
      body_text: `${order.brand_name || "Listing"}: pembayaran Premium sudah masuk antrean pengecekan. Buka profil untuk melihat status terbaru.`,
      related_entity_type: "premium_order",
      related_entity_id: order.id,
    }),
    notifyAdmins(db, {
      franchise_id: order.franchise_id,
      order_id: order.id,
      notification_type: "payment_submitted",
      title: "Konfirmasi Premium baru",
      message: `${order.brand_name || "Listing"} mengirim konfirmasi pembayaran Premium.`,
      action_url: "/dashboard/#operations",
    }),
    queueAdminPremiumEmails(db, {
      category: "premium_payment",
      subject: "Konfirmasi Premium baru",
      body_text: `${order.brand_name || "Listing"} mengirim konfirmasi pembayaran Premium. Buka dashboard untuk mengecek pembayaran.`,
      related_entity_type: "premium_order",
      related_entity_id: order.id,
    }),
  ]);

  return jsonResponse({
    success: true,
    message: "Konfirmasi pembayaran sudah masuk. Tim kami akan mengecek pembayaran Anda.",
    premium_membership: await loadPremiumMembershipData(db, actor.id, [order.franchise_id]),
  });
}

export async function loadPremiumMembershipData(db, userId, franchiseIds) {
  const ids = Array.from(new Set((franchiseIds || []).filter(Boolean)));
  const paymentMethod = await loadActivePaymentMethod(db);
  const plan = {
    code: PREMIUM_PLAN_CODE,
    yearly_price: PREMIUM_BASE_AMOUNT,
    network_sites: ["franchisee.id", "franchise.id", "franchisor.id", "waralaba.id"],
    payment_method: paymentMethod,
  };
  if (!ids.length) return { plan, orders: [], subscriptions: [], notifications: await loadPremiumNotifications(db, userId) };

  try {
    const orderRows = [];
    const subscriptionRows = [];
    const readinessRows = [];
    const notificationsPromise = loadPremiumNotifications(db, userId);

    for (const chunk of chunkList(ids, PREMIUM_MEMBERSHIP_QUERY_CHUNK_SIZE)) {
      const placeholders = chunk.map(() => "?").join(",");
      const [ordersResult, subsResult, readinessResult] = await Promise.all([
        db
          .prepare(
            `SELECT o.*, f.brand_name,
                    c.id AS confirmation_id,
                    c.review_status AS confirmation_status,
                    c.submitted_amount,
                    c.proof_asset_id,
                    c.created_at AS confirmation_created_at,
                    a.public_url AS proof_url
             FROM premium_orders o
             JOIN franchises f ON f.id = o.franchise_id
             LEFT JOIN premium_payment_confirmations c
               ON c.order_id = o.id
              AND c.review_status = 'pending'
             LEFT JOIN franchise_assets a ON a.id = c.proof_asset_id
             WHERE o.user_id = ?
               AND o.franchise_id IN (${placeholders})
               AND o.status IN ('pending_payment', 'confirmation_submitted', 'paid')
             ORDER BY o.created_at DESC
             LIMIT 20`,
          )
          .bind(userId, ...chunk)
          .all(),
        db
          .prepare(
            `SELECT s.*, f.brand_name
             FROM franchise_subscriptions s
             JOIN franchises f ON f.id = s.franchise_id
             WHERE s.user_id = ?
               AND s.franchise_id IN (${placeholders})
             ORDER BY s.ends_at DESC
             LIMIT 20`,
          )
          .bind(userId, ...chunk)
          .all(),
        db
          .prepare(
            `SELECT f.id, f.logo_url, f.cover_url, f.short_desc, f.full_desc, f.phone,
                    f.total_investment_idr, f.min_investment_idr, f.proposal_url,
                    fp.whatsapp, fp.email_contact
             FROM franchises f
             LEFT JOIN franchisor_profiles fp ON fp.id = f.franchisor_profile_id
             WHERE f.id IN (${placeholders})`,
          )
          .bind(...chunk)
          .all(),
      ]);
      orderRows.push(...(ordersResult.results || []));
      subscriptionRows.push(...(subsResult.results || []));
      readinessRows.push(...(readinessResult.results || []));
    }

    const notifications = await notificationsPromise;
    orderRows.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
    subscriptionRows.sort((left, right) => String(right.ends_at || "").localeCompare(String(left.ends_at || "")));

    const readiness = {};
    for (const row of readinessRows) readiness[row.id] = premiumReadinessForListing(row);

    return {
      plan,
      orders: await Promise.all(orderRows.slice(0, 20).map((order) => serializePremiumOrder(db, order, paymentMethod))),
      subscriptions: subscriptionRows.slice(0, 20),
      readiness,
      notifications,
    };
  } catch (_error) {
    return { plan, orders: [], subscriptions: [], notifications: [], unavailable: true };
  }
}

function chunkList(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function loadOwnedListingForPremium(db, actor, franchiseId) {
  const franchisorProfile = await loadFranchisorProfile(db, actor.id);
  return await db
    .prepare(
      `SELECT id, brand_name, owner_user_id, franchisor_profile_id
       FROM franchises
       WHERE id = ?
         AND (owner_user_id = ? OR (? IS NOT NULL AND franchisor_profile_id = ?))
       LIMIT 1`,
    )
    .bind(franchiseId, actor.id, franchisorProfile?.id || null, franchisorProfile?.id || null)
    .first();
}

async function loadFranchisorProfile(db, userId) {
  return await db.prepare("SELECT id FROM franchisor_profiles WHERE user_id = ? LIMIT 1").bind(userId).first();
}

async function loadOwnedReceiptAsset(db, actor, order, assetId) {
  return await db
    .prepare(
      `SELECT id
       FROM franchise_assets
       WHERE id = ?
         AND uploaded_by_user_id = ?
         AND franchise_id = ?
         AND status = 'active'
       LIMIT 1`,
    )
    .bind(assetId, actor.id, order.franchise_id)
    .first();
}

async function serializePremiumOrder(db, order, method = null) {
  if (!order) return null;
  return {
    ...order,
    payment: paymentInstructions(order, method || await loadActivePaymentMethod(db, order.payment_provider || "manual_bca")),
  };
}

function optionalText(max) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => textOrNull(value));
}

function isRenewableSubscription(subscription) {
  const text = String(subscription?.ends_at || "");
  const endsAt = new Date(text.includes("T") ? text : text.replace(" ", "T") + "Z");
  if (Number.isNaN(endsAt.getTime())) return false;
  const msLeft = endsAt.getTime() - Date.now();
  const daysLeft = msLeft / (24 * 60 * 60 * 1000);
  return daysLeft <= PREMIUM_RENEWAL_WINDOW_DAYS;
}
