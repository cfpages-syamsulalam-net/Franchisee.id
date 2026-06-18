export const SITE_FRANCHISEE_ID = "site_franchisee_id";

export function siteRebuildStatements(db, options) {
  const siteId = normalize(options.siteId) || SITE_FRANCHISEE_ID;
  const reason = normalize(options.reason) || "public_page_change";
  const metadata = {
    ...(options.metadata || {}),
    source: options.source || "app",
  };

  return [
    db
      .prepare(
        `INSERT INTO site_rebuild_requests (
          id, site_id, franchise_id, reason, entity_type, entity_id,
          requested_by_user_id, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `rebuild_${randomId()}`,
        siteId,
        normalize(options.franchiseId) || null,
        reason,
        normalize(options.entityType) || null,
        normalize(options.entityId) || normalize(options.franchiseId) || null,
        normalize(options.actorUserId) || null,
        JSON.stringify(metadata)
      ),
    db
      .prepare(
        `INSERT INTO site_publish_state (
          site_id, dirty_since, last_change_at, pending_count, updated_at
        ) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(site_id) DO UPDATE SET
          dirty_since = COALESCE(site_publish_state.dirty_since, excluded.dirty_since),
          last_change_at = CURRENT_TIMESTAMP,
          pending_count = site_publish_state.pending_count + 1,
          updated_at = CURRENT_TIMESTAMP`
      )
      .bind(siteId),
  ];
}

function normalize(value) {
  return (value || "").toString().trim();
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}
