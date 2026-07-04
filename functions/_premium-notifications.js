import { randomId, safeJson, textOrNull } from "./_premium-ops-utils.js";

export const PREMIUM_EVENT_TYPES = new Set([
  "premium_page_view",
  "premium_cta_click",
  "premium_order_created",
  "premium_confirmation_submitted",
  "premium_payment_approved",
  "premium_payment_rejected",
  "premium_activated",
  "promo_ribbon_view",
  "promo_ribbon_click",
]);

export const PREMIUM_NOTIFICATION_TYPES = new Set([
  "payment_submitted",
  "payment_approved",
  "payment_rejected",
  "premium_activated",
  "premium_expiring",
]);

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
           id, user_id, to_email, subject, body_text, body_html, category,
           related_entity_type, related_entity_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        email.user_id || email.userId || null,
        toEmail,
        textOrNull(email.subject) || "Info Franchisee.id",
        textOrNull(email.body_text || email.bodyText) || "",
        textOrNull(email.body_html || email.bodyHtml) || null,
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

export async function loadNotificationEmailQueueRows(db, limit = 20) {
  try {
    const result = await db
      .prepare(
        `SELECT
           id, user_id, to_email, subject, category, status, related_entity_type, related_entity_id,
           body_html, provider, provider_message_id, attempt_count, next_attempt_at, last_error,
           sent_at, created_at, updated_at
         FROM notification_email_queue
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(Math.max(1, Math.min(Number(limit || 20), 50)))
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
