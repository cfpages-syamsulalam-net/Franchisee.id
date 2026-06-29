import {
  PREMIUM_NETWORK_SITE_DOMAINS,
  PREMIUM_PLAN_CODE,
  PREMIUM_BASE_AMOUNT,
  PREMIUM_PAYMENT,
  PREMIUM_EXPIRING_LOOKAHEAD_DAYS,
} from "./_premium.js";

export const PREMIUM_EVENT_TYPES = new Set([
  "premium_page_view",
  "premium_cta_click",
  "premium_order_created",
  "premium_confirmation_submitted",
  "premium_payment_approved",
  "premium_payment_rejected",
  "premium_activated",
]);

export const PREMIUM_NOTIFICATION_TYPES = new Set([
  "payment_submitted",
  "payment_approved",
  "payment_rejected",
  "premium_activated",
  "premium_expiring",
]);

export async function loadActivePaymentMethod(db, code = "manual_bca") {
  try {
    const row = await db
      .prepare(
        `SELECT id, code, method_type, label, account_name, account_number, provider, instructions, sort_order, is_active
         FROM payment_methods
         WHERE code = ? AND is_active = 1
         LIMIT 1`,
      )
      .bind(code)
      .first();
    return row || fallbackPaymentMethod();
  } catch (_error) {
    return fallbackPaymentMethod();
  }
}

export async function loadPaymentMethods(db) {
  try {
    const result = await db
      .prepare(
        `SELECT id, code, method_type, label, account_name, account_number, provider, instructions, sort_order, is_active, updated_at
         FROM payment_methods
         ORDER BY is_active DESC, sort_order ASC, label ASC`,
      )
      .all();
    return result.results || [];
  } catch (_error) {
    return [fallbackPaymentMethod()];
  }
}

export function fallbackPaymentMethod() {
  return {
    id: "payment_method_manual_bca",
    code: "manual_bca",
    method_type: "bank_transfer",
    label: PREMIUM_PAYMENT.label,
    account_name: PREMIUM_PAYMENT.accountName,
    account_number: PREMIUM_PAYMENT.accountNumber,
    provider: PREMIUM_PAYMENT.bankName,
    instructions: PREMIUM_PAYMENT.instructions,
    sort_order: 10,
    is_active: 1,
  };
}

export async function recordPremiumEvent(db, event, context = {}) {
  if (!db || !PREMIUM_EVENT_TYPES.has(event?.event_type)) return null;
  try {
    const id = `premium_event_${randomId()}`;
    await db
      .prepare(
        `INSERT INTO premium_funnel_events (
           id, user_id, franchise_id, order_id, event_type, surface, channel, metadata
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        event.user_id || context.userId || null,
        event.franchise_id || null,
        event.order_id || null,
        event.event_type,
        textOrNull(event.surface) || null,
        textOrNull(event.channel) || null,
        safeJson(event.metadata || {}),
      )
      .run();
    return id;
  } catch (_error) {
    return null;
  }
}

export async function loadPremiumFunnelSummary(db) {
  try {
    const result = await db
      .prepare(
        `SELECT event_type, COUNT(*) AS count
         FROM premium_funnel_events
         WHERE created_at >= datetime('now', '-90 days')
         GROUP BY event_type`,
      )
      .all();
    const counts = {};
    for (const row of result.results || []) counts[row.event_type] = Number(row.count || 0);
    return counts;
  } catch (_error) {
    return {};
  }
}

export async function createPremiumNotification(db, notification) {
  if (!db || !notification?.user_id || !PREMIUM_NOTIFICATION_TYPES.has(notification.notification_type)) return null;
  try {
    const id = `premium_note_${randomId()}`;
    await db
      .prepare(
        `INSERT INTO premium_notifications (
           id, user_id, franchise_id, order_id, notification_type, title, message, action_url
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        notification.user_id,
        notification.franchise_id || null,
        notification.order_id || null,
        notification.notification_type,
        textOrNull(notification.title) || "Info Premium",
        textOrNull(notification.message) || "",
        textOrNull(notification.action_url) || null,
      )
      .run();
    return id;
  } catch (_error) {
    return null;
  }
}

export async function notifyAdmins(db, notification) {
  try {
    const result = await db
      .prepare(
        `SELECT DISTINCT u.id
         FROM users u
         JOIN user_roles r ON r.user_id = u.id
         WHERE r.role = 'admin' AND COALESCE(u.status, 'active') = 'active'
         LIMIT 20`,
      )
      .all();
    await Promise.all((result.results || []).map((row) => createPremiumNotification(db, { ...notification, user_id: row.id })));
  } catch (_error) {
    return null;
  }
  return true;
}

export async function queueNotificationEmail(db, email) {
  const toEmail = textOrNull(email?.to_email || email?.toEmail);
  if (!db || !toEmail) return null;
  try {
    const id = `email_${randomId()}`;
    await db
      .prepare(
        `INSERT INTO notification_email_queue (
           id, user_id, to_email, subject, body_text, category,
           related_entity_type, related_entity_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        email.user_id || email.userId || null,
        toEmail,
        textOrNull(email.subject) || "Info Franchisee.id",
        textOrNull(email.body_text || email.bodyText) || "",
        textOrNull(email.category) || "general",
        textOrNull(email.related_entity_type || email.relatedEntityType) || null,
        textOrNull(email.related_entity_id || email.relatedEntityId) || null,
      )
      .run();
    return id;
  } catch (_error) {
    return null;
  }
}

export async function queueAdminPremiumEmails(db, email) {
  try {
    const result = await db
      .prepare(
        `SELECT DISTINCT u.id, u.primary_email
         FROM users u
         JOIN user_roles r ON r.user_id = u.id
         WHERE r.role = 'admin'
           AND COALESCE(u.status, 'active') = 'active'
           AND COALESCE(u.primary_email, '') != ''
         LIMIT 20`,
      )
      .all();
    await Promise.all((result.results || []).map((row) => queueNotificationEmail(db, {
      ...email,
      user_id: row.id,
      to_email: row.primary_email,
    })));
  } catch (_error) {
    return null;
  }
  return true;
}

export async function loadNotificationEmailQueueSummary(db) {
  try {
    const result = await db
      .prepare(
        `SELECT status, category, COUNT(*) AS count, MAX(created_at) AS latest_at
         FROM notification_email_queue
         WHERE created_at >= datetime('now', '-30 days')
         GROUP BY status, category
         ORDER BY latest_at DESC
         LIMIT 20`,
      )
      .all();
    return result.results || [];
  } catch (_error) {
    return [];
  }
}

export async function loadExpiringPremiumSubscriptions(db, days = PREMIUM_EXPIRING_LOOKAHEAD_DAYS) {
  try {
    const result = await db
      .prepare(
        `SELECT
           s.id, s.franchise_id, s.user_id, s.plan_code, s.status, s.starts_at, s.ends_at, s.renewal_status,
           f.brand_name, f.slug,
           u.primary_email, u.display_name,
           ROUND(julianday(s.ends_at) - julianday('now')) AS days_left
         FROM franchise_subscriptions s
         JOIN franchises f ON f.id = s.franchise_id
         LEFT JOIN users u ON u.id = s.user_id
         WHERE s.status = 'active'
           AND s.ends_at > CURRENT_TIMESTAMP
           AND s.ends_at <= datetime('now', ?)
         ORDER BY s.ends_at ASC
         LIMIT 40`,
      )
      .bind(`+${Number(days || PREMIUM_EXPIRING_LOOKAHEAD_DAYS)} days`)
      .all();
    return result.results || [];
  } catch (_error) {
    return [];
  }
}

export async function loadPremiumNotifications(db, userId) {
  if (!userId) return [];
  try {
    const result = await db
      .prepare(
        `SELECT id, franchise_id, order_id, notification_type, title, message, action_url, read_at, created_at
         FROM premium_notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 12`,
      )
      .bind(userId)
      .all();
    return result.results || [];
  } catch (_error) {
    return [];
  }
}

export async function loadAdminPremiumNotifications(db) {
  try {
    const result = await db
      .prepare(
        `SELECT n.id, n.franchise_id, n.order_id, n.notification_type, n.title, n.message, n.action_url, n.created_at,
                f.brand_name
         FROM premium_notifications n
         LEFT JOIN franchises f ON f.id = n.franchise_id
         ORDER BY n.created_at DESC
         LIMIT 20`,
      )
      .all();
    return result.results || [];
  } catch (_error) {
    return [];
  }
}

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

export function textOrNull(value) {
  const text = (value ?? "").toString().trim().replace(/\s+/g, " ");
  return text || null;
}

function safeJson(value) {
  try {
    return JSON.stringify(value || {});
  } catch (_error) {
    return "{}";
  }
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}
