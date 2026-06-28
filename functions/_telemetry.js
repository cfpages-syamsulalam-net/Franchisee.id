import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";

export async function logOperationEvent(db, input) {
  if (!db) return;
  try {
    await db
      .prepare(
        `INSERT INTO operation_events (
          id, source_site_id, event_type, severity, route, message, entity_type, entity_id, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `operation_${randomId()}`,
        input.siteId || SITE_FRANCHISEE_ID,
        normalize(input.eventType) || "operation.event",
        ["info", "warning", "error", "critical"].includes(input.severity) ? input.severity : "info",
        normalize(input.route),
        normalize(input.message).slice(0, 1000) || null,
        normalize(input.entityType) || null,
        normalize(input.entityId) || null,
        JSON.stringify(input.metadata || {}),
      )
      .run();
  } catch (error) {
    if (/operation_events|no such table/i.test(error?.message || "")) return;
    throw error;
  }
}

function normalize(value) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}
