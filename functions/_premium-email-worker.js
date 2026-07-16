import {
  processPremiumLifecycle,
  queuePremiumRenewalReminders,
  textOrNull,
} from "./_premium-ops.js";

const DEFAULT_BATCH_LIMIT = 20;
const MAX_ATTEMPTS = 5;
const EMAIL_LOCK_STALE_MINUTES = 15;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function processPremiumEmailWorker(env, options = {}) {
  const db = env.franchise_db;
  if (!db) throw new Error("D1 binding `franchise_db` belum tersedia.");

  const lifecycle = await processPremiumLifecycle(db);
  const renewalRemindersQueued = await queuePremiumRenewalReminders(db);
  const deliveryConfigured = Boolean(textOrNull(env.RESEND_API_KEY));
  const summary = {
    delivery_configured: deliveryConfigured,
    expired_subscriptions: lifecycle.expired_subscriptions || 0,
    grace_emails_queued: lifecycle.grace_emails_queued || 0,
    annual_reports_queued: lifecycle.annual_reports_queued || 0,
    renewal_reminders_queued: renewalRemindersQueued,
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  if (!deliveryConfigured) {
    summary.skipped = await countDueEmails(db);
    return summary;
  }

  const rows = await loadDueEmails(db, options.limit || DEFAULT_BATCH_LIMIT);
  for (const row of rows) {
    summary.attempted += 1;
    const attempt = Number(row.attempt_count || 0) + 1;
    try {
      const result = await sendWithResend(env, row);
      await markEmailSent(db, row.id, attempt, result.id || null);
      summary.sent += 1;
    } catch (error) {
      await markEmailFailed(db, row.id, attempt, error.message || "Email belum bisa dikirim.");
      summary.failed += 1;
    }
  }

  return summary;
}

export async function loadDueEmails(db, limit) {
  const result = await db
    .prepare(
      `SELECT id, to_email, subject, body_text, body_html, category, attempt_count
       FROM notification_email_queue
       WHERE status IN ('pending', 'failed')
         AND COALESCE(attempt_count, 0) < ?
         AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
         AND (locked_at IS NULL OR locked_at <= datetime('now', ?))
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .bind(MAX_ATTEMPTS, `-${EMAIL_LOCK_STALE_MINUTES} minutes`, Math.max(1, Math.min(Number(limit || DEFAULT_BATCH_LIMIT), 50)))
    .all();
  const candidates = result.results || [];
  const claimed = [];
  for (const row of candidates) {
    const update = await db
      .prepare(
        `UPDATE notification_email_queue
         SET locked_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND status IN ('pending', 'failed')
           AND COALESCE(attempt_count, 0) < ?
           AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
           AND (locked_at IS NULL OR locked_at <= datetime('now', ?))`,
      )
      .bind(row.id, MAX_ATTEMPTS, `-${EMAIL_LOCK_STALE_MINUTES} minutes`)
      .run();
    if (Number(update?.meta?.changes || 0) > 0) claimed.push(row);
  }
  return claimed;
}

async function countDueEmails(db) {
  try {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM notification_email_queue
         WHERE status IN ('pending', 'failed')
           AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
           AND (locked_at IS NULL OR locked_at <= datetime('now', ?))`,
      )
      .bind(`-${EMAIL_LOCK_STALE_MINUTES} minutes`)
      .first();
    return Number(row?.count || 0);
  } catch (_error) {
    return 0;
  }
}

async function sendWithResend(env, row) {
  const from = textOrNull(env.PREMIUM_EMAIL_FROM) || "Franchisee.id <premium@franchisee.id>";
  const replyTo = textOrNull(env.PREMIUM_EMAIL_REPLY_TO);
  const payload = {
    from,
    to: [row.to_email],
    subject: row.subject,
    text: row.body_text,
  };
  if (textOrNull(row.body_html)) payload.html = row.body_html;
  if (replyTo) payload.reply_to = replyTo;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(textOrNull(data.message || data.error) || `Resend error ${response.status}`);
  }
  return data || {};
}

async function markEmailSent(db, id, attempt, providerMessageId) {
  await db
    .prepare(
      `UPDATE notification_email_queue
       SET status = 'sent',
           provider = 'resend',
           provider_message_id = ?,
           attempt_count = ?,
           next_attempt_at = NULL,
           locked_at = NULL,
           last_error = NULL,
           sent_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(providerMessageId, attempt, id)
    .run();
}

async function markEmailFailed(db, id, attempt, message) {
  const delayMinutes = Math.min(15 * Math.max(1, attempt), 360);
  const nextAttempt = attempt >= MAX_ATTEMPTS ? null : `+${delayMinutes} minutes`;
  await db
    .prepare(
      `UPDATE notification_email_queue
       SET status = 'failed',
           provider = 'resend',
           attempt_count = ?,
           next_attempt_at = CASE WHEN ? IS NULL THEN NULL ELSE datetime('now', ?) END,
           locked_at = NULL,
           last_error = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(attempt, nextAttempt, nextAttempt, String(message || "").slice(0, 500), id)
    .run();
}
