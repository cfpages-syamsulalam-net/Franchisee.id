import {
  PREMIUM_NETWORK_SITE_IDS,
  PREMIUM_NETWORK_SITE_DOMAINS,
  PREMIUM_PLAN_CODE,
  PREMIUM_BASE_AMOUNT,
  PREMIUM_PAYMENT,
  PREMIUM_EXPIRING_LOOKAHEAD_DAYS,
} from "./_premium.js";
import { SITE_FRANCHISEE_ID, siteRebuildStatements } from "./_site-publish-queue.js";

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

export const PREMIUM_REMINDER_TYPES = [
  { type: "renewal_1d", maxDays: 1, label: "1 hari" },
  { type: "renewal_7d", maxDays: 7, label: "7 hari" },
  { type: "renewal_14d", maxDays: 14, label: "14 hari" },
  { type: "renewal_30d", maxDays: 30, label: "30 hari" },
];

export const PREMIUM_SETTINGS_DEFAULTS = {
  grace_period_days: 3,
  grace_daily_email_enabled: 1,
  annual_report_enabled: 1,
  multi_brand_discount_enabled: 0,
  multi_brand_discount_percent: 0,
  multi_brand_min_owned_brands: 2,
  promo_enabled: 0,
  promo_discount_percent: 0,
  promo_label: "",
  promo_message: "",
  promo_bonus_text: "",
  promo_cta_label: "Lihat Premium",
  promo_cta_url: "/premium/",
  promo_starts_at: "",
  promo_ends_at: "",
};

const PREMIUM_NUMERIC_SETTINGS = new Set([
  "grace_period_days",
  "grace_daily_email_enabled",
  "annual_report_enabled",
  "multi_brand_discount_enabled",
  "multi_brand_discount_percent",
  "multi_brand_min_owned_brands",
  "promo_enabled",
  "promo_discount_percent",
]);

export async function loadActivePaymentMethod(db, code = "manual_bca") {
  try {
    const row = await db
      .prepare(
        `SELECT id, code, method_type, label, account_name, account_number, provider, instructions,
                sort_order, is_active, qris_image_url, qris_image_alt
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
        `SELECT id, code, method_type, label, account_name, account_number, provider, instructions,
                sort_order, is_active, updated_at, qris_image_url, qris_image_alt
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
    qris_image_url: null,
    qris_image_alt: null,
    sort_order: 10,
    is_active: 1,
  };
}

export async function loadPremiumSettings(db) {
  const settings = { ...PREMIUM_SETTINGS_DEFAULTS };
  try {
    const result = await db
      .prepare(
        `SELECT setting_key, value_number, value_text
         FROM premium_settings`,
      )
      .all();
    for (const row of result.results || []) {
      if (!(row.setting_key in settings)) continue;
      settings[row.setting_key] = PREMIUM_NUMERIC_SETTINGS.has(row.setting_key)
        ? Number(row.value_number !== null && row.value_number !== undefined ? row.value_number : settings[row.setting_key] || 0)
        : textOrNull(row.value_text) || settings[row.setting_key] || "";
    }
  } catch (_error) {
    return settings;
  }
  return normalizePremiumSettings(settings);
}

export async function updatePremiumSettings(db, data, actorUserId = null) {
  const settings = normalizePremiumSettings(data || {});
  const statements = Object.keys(PREMIUM_SETTINGS_DEFAULTS).map((key) => {
    const isNumeric = PREMIUM_NUMERIC_SETTINGS.has(key);
    return db
      .prepare(
        `INSERT INTO premium_settings (setting_key, value_number, value_text, updated_by_user_id)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(setting_key) DO UPDATE SET
           value_number = excluded.value_number,
           value_text = excluded.value_text,
           updated_by_user_id = excluded.updated_by_user_id,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(key, isNumeric ? Number(settings[key] || 0) : null, isNumeric ? null : textOrNull(settings[key]) || "", actorUserId);
  });
  await db.batch(statements);
  return settings;
}

export async function premiumOrderPricing(db, actor, listing) {
  const settings = await loadPremiumSettings(db);
  const enabled = Number(settings.multi_brand_discount_enabled || 0) === 1;
  const percent = clampNumber(settings.multi_brand_discount_percent, 0, 90);
  const minOwnedBrands = Math.max(2, Math.floor(Number(settings.multi_brand_min_owned_brands || 2)));
  if (!enabled || percent <= 0) {
    return {
      base_amount: PREMIUM_BASE_AMOUNT,
      discount_amount: 0,
      discount_reason: null,
      settings,
    };
  }

  const ownedCount = await countOwnedListings(db, actor, listing);
  const discountAmount = ownedCount >= minOwnedBrands
    ? Math.round((PREMIUM_BASE_AMOUNT * percent) / 100)
    : 0;
  return {
    base_amount: PREMIUM_BASE_AMOUNT,
    discount_amount: discountAmount,
    discount_reason: discountAmount ? `Diskon multi-brand ${percent}%` : null,
    settings,
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

export async function loadPremiumAnnualReports(db, limit = 8) {
  return safeAll(
    db,
    `SELECT
       r.id, r.subscription_id, r.franchise_id, r.user_id, r.period_start_at, r.period_end_at,
       r.listing_views, r.saves, r.inquiries, r.contact_clicks, r.leads, r.queued_email_id, r.created_at,
       f.brand_name,
       u.primary_email
     FROM premium_annual_reports r
     JOIN franchises f ON f.id = r.franchise_id
     LEFT JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC
     LIMIT ?`,
    [Math.max(1, Math.min(Number(limit || 8), 30))],
  );
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

export async function queuePremiumRenewalReminders(db) {
  const rows = await loadExpiringPremiumSubscriptions(db, PREMIUM_EXPIRING_LOOKAHEAD_DAYS);
  let queued = 0;
  for (const row of rows || []) {
    const reminder = reminderTypeForDays(Number(row.days_left || 0));
    if (!reminder || !textOrNull(row.primary_email)) continue;
    const exists = await db
      .prepare(
        `SELECT id
         FROM premium_subscription_reminders
         WHERE subscription_id = ? AND reminder_type = ?
         LIMIT 1`,
      )
      .bind(row.id, reminder.type)
      .first()
      .catch(() => null);
    if (exists) continue;

    const brandName = row.brand_name || "Listing Anda";
    const emailId = await queueNotificationEmail(db, {
      user_id: row.user_id,
      to_email: row.primary_email,
      category: "premium_renewal_reminder",
      subject: `Premium ${brandName} berakhir dalam ${reminder.label}`,
      body_text: [
        `Premium ${brandName} akan berakhir dalam ${reminder.label}.`,
        "Buka profil untuk memperpanjang masa aktif agar status Premium tetap berjalan.",
        "Profil: https://franchisee.id/profil/?tab=membership",
      ].join(" "),
      related_entity_type: "franchise_subscription",
      related_entity_id: row.id,
    });
    if (!emailId) continue;

    await Promise.all([
      db
        .prepare(
          `INSERT INTO premium_subscription_reminders (
             id, subscription_id, franchise_id, user_id, reminder_type, queued_email_id
           ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(`premium_reminder_${randomId()}`, row.id, row.franchise_id, row.user_id, reminder.type, emailId)
        .run()
        .catch(() => null),
      createPremiumNotification(db, {
        user_id: row.user_id,
        franchise_id: row.franchise_id,
        notification_type: "premium_expiring",
        title: "Premium segera berakhir",
        message: `Premium ${brandName} akan berakhir dalam ${reminder.label}.`,
        action_url: "/profil/?tab=membership",
      }),
    ]);
    queued += 1;
  }
  return queued;
}

export async function processPremiumLifecycle(db) {
  const settings = await loadPremiumSettings(db);
  const annualReportsQueued = Number(settings.annual_report_enabled || 0) === 1
    ? await queuePremiumAnnualReports(db)
    : 0;
  const graceEmailsQueued = Number(settings.grace_daily_email_enabled || 0) === 1
    ? await queuePremiumGraceEmails(db, settings)
    : 0;
  const expiredSubscriptions = await expirePremiumAfterGrace(db, settings);
  return {
    settings,
    annual_reports_queued: annualReportsQueued,
    grace_emails_queued: graceEmailsQueued,
    expired_subscriptions: expiredSubscriptions,
  };
}

export async function markExpiredPremiumSubscriptions(db) {
  const result = await processPremiumLifecycle(db);
  return result.expired_subscriptions || 0;
}

export async function queuePremiumAnnualReports(db) {
  const rows = await safeAll(
    db,
    `SELECT
       s.id, s.franchise_id, s.user_id, s.starts_at, s.ends_at,
       f.brand_name, f.slug,
       u.primary_email
     FROM franchise_subscriptions s
     JOIN franchises f ON f.id = s.franchise_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.ends_at <= CURRENT_TIMESTAMP
       AND COALESCE(u.primary_email, '') != ''
       AND NOT EXISTS (
         SELECT 1 FROM premium_annual_reports r
         WHERE r.subscription_id = s.id
       )
     ORDER BY s.ends_at ASC
     LIMIT 20`,
  );
  let queued = 0;
  for (const row of rows) {
    const metrics = await loadAnnualReportMetrics(db, row);
    const email = annualReportEmail(row, metrics);
    const emailId = await queueNotificationEmail(db, {
      user_id: row.user_id,
      to_email: row.primary_email,
      category: "premium_annual_report",
      subject: email.subject,
      body_text: email.text,
      body_html: email.html,
      related_entity_type: "franchise_subscription",
      related_entity_id: row.id,
    });
    await db
      .prepare(
        `INSERT OR IGNORE INTO premium_annual_reports (
           id, subscription_id, franchise_id, user_id, period_start_at, period_end_at,
           listing_views, saves, inquiries, contact_clicks, leads, queued_email_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        `premium_report_${randomId()}`,
        row.id,
        row.franchise_id,
        row.user_id,
        row.starts_at,
        row.ends_at,
        metrics.listing_view,
        metrics.save,
        metrics.inquiry,
        metrics.contact_click,
        metrics.leads,
        emailId,
      )
      .run()
      .catch(() => null);
    if (emailId) queued += 1;
  }
  return queued;
}

export async function queuePremiumGraceEmails(db, settings = null) {
  const currentSettings = settings || await loadPremiumSettings(db);
  const graceDays = clampNumber(currentSettings.grace_period_days, 0, 30);
  if (graceDays <= 0) return 0;
  const rows = await safeAll(
    db,
    `SELECT
       s.id, s.franchise_id, s.user_id, s.ends_at,
       f.brand_name, f.slug,
       u.primary_email,
       CAST(julianday('now') - julianday(s.ends_at) AS INTEGER) + 1 AS grace_day
     FROM franchise_subscriptions s
     JOIN franchises f ON f.id = s.franchise_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.status = 'active'
       AND s.ends_at <= CURRENT_TIMESTAMP
       AND s.ends_at > datetime('now', ?)
       AND COALESCE(u.primary_email, '') != ''
     ORDER BY s.ends_at ASC
     LIMIT 50`,
    [`-${graceDays} days`],
  );

  let queued = 0;
  for (const row of rows) {
    const graceDay = Math.max(1, Math.min(Number(row.grace_day || 1), graceDays));
    const exists = await db
      .prepare(
        `SELECT id
         FROM premium_grace_notifications
         WHERE subscription_id = ? AND grace_day = ?
         LIMIT 1`,
      )
      .bind(row.id, graceDay)
      .first()
      .catch(() => null);
    if (exists) continue;

    const remaining = Math.max(0, graceDays - graceDay + 1);
    const email = graceEmail(row, remaining, graceDays);
    const emailId = await queueNotificationEmail(db, {
      user_id: row.user_id,
      to_email: row.primary_email,
      category: "premium_grace_period",
      subject: email.subject,
      body_text: email.text,
      body_html: email.html,
      related_entity_type: "franchise_subscription",
      related_entity_id: row.id,
    });
    if (!emailId) continue;

    await Promise.all([
      db
        .prepare(
          `INSERT INTO premium_grace_notifications (
             id, subscription_id, franchise_id, user_id, grace_day, queued_email_id
           ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(`premium_grace_${randomId()}`, row.id, row.franchise_id, row.user_id, graceDay, emailId)
        .run()
        .catch(() => null),
      createPremiumNotification(db, {
        user_id: row.user_id,
        franchise_id: row.franchise_id,
        notification_type: "premium_expiring",
        title: "Premium masuk masa tenggang",
        message: `${row.brand_name || "Listing"} akan kembali menjadi Free dalam ${remaining} hari bila belum diperpanjang.`,
        action_url: "/profil/?tab=membership",
      }),
    ]);
    queued += 1;
  }
  return queued;
}

export async function expirePremiumAfterGrace(db, settings = null) {
  const currentSettings = settings || await loadPremiumSettings(db);
  const graceDays = clampNumber(currentSettings.grace_period_days, 0, 30);
  const rows = await safeAll(
    db,
    `SELECT
       s.id, s.franchise_id, s.user_id, s.ends_at,
       f.brand_name, f.slug
     FROM franchise_subscriptions s
     JOIN franchises f ON f.id = s.franchise_id
     WHERE s.status = 'active'
       AND s.ends_at <= datetime('now', ?)
     ORDER BY s.ends_at ASC
     LIMIT 50`,
    [`-${graceDays} days`],
  );

  let expired = 0;
  for (const row of rows) {
    const hasReplacement = await db
      .prepare(
        `SELECT id
         FROM franchise_subscriptions
         WHERE franchise_id = ?
           AND id != ?
           AND status = 'active'
           AND ends_at > CURRENT_TIMESTAMP
         LIMIT 1`,
      )
      .bind(row.franchise_id, row.id)
      .first()
      .catch(() => null);
    const statements = [
      db
        .prepare(
          `UPDATE franchise_subscriptions
           SET status = 'expired',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = 'active'`,
        )
        .bind(row.id),
      auditStatement(db, "premium.subscription.expire", "franchise_subscriptions", row.id, {
        franchise_id: row.franchise_id,
        brand_name: row.brand_name,
        grace_period_days: graceDays,
      }),
    ];

    if (!hasReplacement) {
      const networkSiteIds = PREMIUM_NETWORK_SITE_IDS.filter((siteId) => siteId !== SITE_FRANCHISEE_ID);
      const placeholders = networkSiteIds.map(() => "?").join(", ");
      statements.push(
        db
          .prepare(
            `UPDATE franchises
             SET verification_tier = CASE WHEN verification_tier = 'premium' THEN 'free' ELSE verification_tier END,
                 status = CASE WHEN status = 'premium' THEN 'free' ELSE status END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
          )
          .bind(row.franchise_id),
      );
      if (networkSiteIds.length) {
        statements.push(
          db
            .prepare(
              `UPDATE franchise_site_publications
               SET publication_status = 'hidden',
                   updated_at = CURRENT_TIMESTAMP
               WHERE franchise_id = ?
                 AND site_id IN (${placeholders})`,
            )
            .bind(row.franchise_id, ...networkSiteIds),
        );
      }
      statements.push(
        ...PREMIUM_NETWORK_SITE_IDS.flatMap((siteId) => siteRebuildStatements(db, {
          siteId,
          franchiseId: row.franchise_id,
          reason: "premium_grace_expired",
          entityType: "franchise_subscriptions",
          entityId: row.id,
          actorUserId: null,
          source: "premium_email_worker",
          metadata: { brand_name: row.brand_name, grace_period_days: graceDays },
        })),
      );
    }

    await db.batch(statements);
    expired += 1;
  }
  return expired;
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

export async function loadPublicPremiumPromo(db) {
  const settings = await loadPremiumSettings(db);
  if (Number(settings.promo_enabled || 0) !== 1) return { enabled: false };
  const now = Date.now();
  const startsAt = parseDateMillis(settings.promo_starts_at);
  const endsAt = parseDateMillis(settings.promo_ends_at);
  if (startsAt && now < startsAt) return { enabled: false };
  if (endsAt && now > endsAt) return { enabled: false };
  const discount = clampNumber(settings.promo_discount_percent, 0, 90);
  const bonus = textOrNull(settings.promo_bonus_text);
  const reason = textOrNull(settings.promo_label);
  const message = textOrNull(settings.promo_message)
    || [
      reason || "Promo Premium",
      discount ? `diskon ${discount}%` : "",
      bonus ? `bonus ${bonus}` : "",
    ].filter(Boolean).join(" - ");
  if (!message) return { enabled: false };
  return {
    enabled: true,
    label: reason || "Promo Premium",
    message,
    discount_percent: discount,
    bonus_text: bonus || "",
    cta_label: textOrNull(settings.promo_cta_label) || "Lihat Premium",
    cta_url: textOrNull(settings.promo_cta_url) || "/premium/",
    starts_at: textOrNull(settings.promo_starts_at) || "",
    ends_at: textOrNull(settings.promo_ends_at) || "",
  };
}

async function loadAnnualReportMetrics(db, row) {
  const metrics = {
    listing_view: 0,
    save: 0,
    inquiry: 0,
    contact_click: 0,
    leads: 0,
  };
  const eventRows = await safeAll(
    db,
    `SELECT event_type, COUNT(*) AS count
     FROM franchise_product_events
     WHERE franchise_id = ?
       AND created_at >= ?
       AND created_at <= ?
     GROUP BY event_type`,
    [row.franchise_id, row.starts_at, row.ends_at],
  );
  for (const item of eventRows) {
    if (item.event_type in metrics) metrics[item.event_type] = Number(item.count || 0);
  }
  const lead = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM franchise_leads
       WHERE franchise_id = ?
         AND created_at >= ?
         AND created_at <= ?`,
    )
    .bind(row.franchise_id, row.starts_at, row.ends_at)
    .first()
    .catch(() => null);
  metrics.leads = Number(lead?.count || 0);
  return metrics;
}

function annualReportEmail(row, metrics) {
  const brandName = row.brand_name || "Listing Anda";
  const subject = `Laporan tahunan Premium ${brandName}`;
  const lines = [
    `Laporan tahunan Premium ${brandName}.`,
    `Periode: ${formatDate(row.starts_at)} - ${formatDate(row.ends_at)}.`,
    `Dilihat: ${metrics.listing_view}. Disimpan: ${metrics.save}. Inquiry: ${metrics.inquiry}. Klik kontak: ${metrics.contact_click}. Leads: ${metrics.leads}.`,
    "Buka profil untuk memperpanjang atau melihat status membership: https://franchisee.id/profil/?tab=membership",
  ];
  const html = [
    `<p>Laporan tahunan Premium <strong>${escapeHtml(brandName)}</strong>.</p>`,
    `<p>Periode: ${escapeHtml(formatDate(row.starts_at))} - ${escapeHtml(formatDate(row.ends_at))}.</p>`,
    "<ul>",
    `<li>Dilihat: ${Number(metrics.listing_view || 0)}</li>`,
    `<li>Disimpan: ${Number(metrics.save || 0)}</li>`,
    `<li>Inquiry: ${Number(metrics.inquiry || 0)}</li>`,
    `<li>Klik kontak: ${Number(metrics.contact_click || 0)}</li>`,
    `<li>Leads: ${Number(metrics.leads || 0)}</li>`,
    "</ul>",
    '<p><a href="https://franchisee.id/profil/?tab=membership">Buka Membership</a></p>',
  ].join("");
  return { subject, text: lines.join(" "), html };
}

function graceEmail(row, remainingDays, graceDays) {
  const brandName = row.brand_name || "Listing Anda";
  const subject = `Premium ${brandName} masuk masa tenggang`;
  const remainingText = remainingDays > 0 ? `${remainingDays} hari` : "hari ini";
  const text = [
    `Premium ${brandName} sudah berakhir dan sedang berada dalam masa tenggang ${graceDays} hari.`,
    `Listing akan kembali menjadi Free dalam ${remainingText} bila belum diperpanjang.`,
    "Perpanjang dari profil: https://franchisee.id/profil/?tab=membership",
  ].join(" ");
  const html = [
    `<p>Premium <strong>${escapeHtml(brandName)}</strong> sudah berakhir dan sedang berada dalam masa tenggang ${Number(graceDays)} hari.</p>`,
    `<p>Listing akan kembali menjadi Free dalam <strong>${escapeHtml(remainingText)}</strong> bila belum diperpanjang.</p>`,
    '<p><a href="https://franchisee.id/profil/?tab=membership">Perpanjang Premium</a></p>',
  ].join("");
  return { subject, text, html };
}

async function countOwnedListings(db, actor, listing) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM franchises
       WHERE owner_user_id = ?
          OR (? IS NOT NULL AND franchisor_profile_id = ?)`,
    )
    .bind(actor.id, listing?.franchisor_profile_id || null, listing?.franchisor_profile_id || null)
    .first()
    .catch(() => null);
  return Number(row?.count || 0);
}

function normalizePremiumSettings(value) {
  const settings = { ...PREMIUM_SETTINGS_DEFAULTS, ...(value || {}) };
  return {
    grace_period_days: clampNumber(settings.grace_period_days, 0, 30),
    grace_daily_email_enabled: Number(settings.grace_daily_email_enabled) ? 1 : 0,
    annual_report_enabled: Number(settings.annual_report_enabled) ? 1 : 0,
    multi_brand_discount_enabled: Number(settings.multi_brand_discount_enabled) ? 1 : 0,
    multi_brand_discount_percent: clampNumber(settings.multi_brand_discount_percent, 0, 90),
    multi_brand_min_owned_brands: Math.max(2, Math.floor(Number(settings.multi_brand_min_owned_brands || 2))),
    promo_enabled: Number(settings.promo_enabled) ? 1 : 0,
    promo_discount_percent: clampNumber(settings.promo_discount_percent, 0, 90),
    promo_label: textOrNull(settings.promo_label) || "",
    promo_message: textOrNull(settings.promo_message) || "",
    promo_bonus_text: textOrNull(settings.promo_bonus_text) || "",
    promo_cta_label: textOrNull(settings.promo_cta_label) || "Lihat Premium",
    promo_cta_url: textOrNull(settings.promo_cta_url) || "/premium/",
    promo_starts_at: textOrNull(settings.promo_starts_at) || "",
    promo_ends_at: textOrNull(settings.promo_ends_at) || "",
  };
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

async function safeAll(db, sql, bindings = []) {
  try {
    const statement = db.prepare(sql);
    const result = await (bindings.length ? statement.bind(...bindings).all() : statement.all());
    return result.results || [];
  } catch (_error) {
    return [];
  }
}

function auditStatement(db, action, entityType, entityId, metadata = {}) {
  return db
    .prepare(
      `INSERT INTO audit_events (id, actor_user_id, source_site_id, action, entity_type, entity_id, metadata)
       VALUES (?, NULL, ?, ?, ?, ?, ?)`,
    )
    .bind(`audit_${randomId()}`, SITE_FRANCHISEE_ID, action, entityType, entityId || null, JSON.stringify(metadata || {}));
}

export function textOrNull(value) {
  const text = (value ?? "").toString().trim().replace(/\s+/g, " ");
  return text || null;
}

function reminderTypeForDays(daysLeft) {
  if (!Number.isFinite(daysLeft) || daysLeft < 0 || daysLeft > PREMIUM_EXPIRING_LOOKAHEAD_DAYS) return null;
  return PREMIUM_REMINDER_TYPES.find((reminder) => daysLeft <= reminder.maxDays) || null;
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

function formatDate(value) {
  const date = new Date(String(value || "").replace(" ", "T") + (String(value || "").includes("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return String(value || "-");
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function parseDateMillis(value) {
  const text = textOrNull(value);
  if (!text) return 0;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
