import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";

export function getDb(env) {
  if (!env.franchise_db) {
    throw new Error("Layanan profil belum siap. Silakan coba lagi nanti.");
  }
  return env.franchise_db;
}

export function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export function validationError(error) {
  return jsonResponse(
    {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Data profil belum valid.",
      issues: error.issues,
    },
    { status: 400 },
  );
}

export function isMissingSavedTableError(error) {
  return /franchise_saved_opportunities|no such table/i.test(error?.message || "");
}

export function auditStatement(db, action, entityType, entityId, metadata = {}, actorUserId = null) {
  return db
    .prepare(
      `INSERT INTO audit_events (id, actor_user_id, source_site_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      `audit_${randomId()}`,
      actorUserId,
      SITE_FRANCHISEE_ID,
      action,
      entityType,
      entityId,
      JSON.stringify(metadata),
    );
}

export function normalizeWhatsapp(value) {
  const text = textOrNull(value);
  if (!text) return null;
  return text.replace(/[^\d+]/g, "");
}

export function textOrNull(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

export function normalizeText(value) {
  return (value ?? "").toString().trim().replace(/\s+/g, " ");
}

export function intOrNull(value) {
  const clean = String(value ?? "").replace(/[^\d-]/g, "");
  if (!clean) return null;
  const parsed = Number.parseInt(clean, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}

export function splitDisplayName(displayName) {
  const parts = normalizeText(displayName).split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || displayName,
    lastName: parts.join(" ") || undefined,
  };
}

export function getPrimaryEmail(clerkUser) {
  const primaryId = clerkUser?.primaryEmailAddressId;
  const primary = (clerkUser?.emailAddresses || []).find((email) => email.id === primaryId) || clerkUser?.emailAddresses?.[0];
  return primary?.emailAddress || "";
}
