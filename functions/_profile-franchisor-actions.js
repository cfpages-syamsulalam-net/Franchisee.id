import { buildUpdate, listingPatch } from "./_profile-listing-patch.js";
import { auditStatement, jsonResponse, normalizeWhatsapp, textOrNull } from "./_profile-utils.js";
import { manualLocationSummary, manualLocationWriteStatements } from "./_location-writes.js";
import { SITE_FRANCHISEE_ID, siteRebuildStatements } from "./_site-publish-queue.js";

export const OWNER_LISTING_EDIT_INTERVAL_HOURS = 6;

export async function updateFranchisorProfile(db, actor, data) {
  const existing = await db
    .prepare("SELECT id FROM franchisor_profiles WHERE user_id = ? LIMIT 1")
    .bind(actor.id)
    .first();
  if (!existing) {
    return jsonResponse({ success: false, message: "Silakan lengkapi form data brand terlebih dahulu." }, { status: 404 });
  }

  await db.batch([
    db
      .prepare(
        `UPDATE franchisor_profiles
            SET company_name = ?, country_code = ?, whatsapp = ?, website_url = ?, instagram_url = ?,
                facebook_url = ?, tiktok_url = ?, youtube_url = ?, linkedin_url = ?,
                nib_number = ?, haki_status = ?, haki_number = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?`,
      )
      .bind(
        textOrNull(data.company_name),
        textOrNull(data.country_code),
        normalizeWhatsapp(data.whatsapp),
        textOrNull(data.website_url),
        textOrNull(data.instagram_url),
        textOrNull(data.facebook_url),
        textOrNull(data.tiktok_url),
        textOrNull(data.youtube_url),
        textOrNull(data.linkedin_url),
        textOrNull(data.nib_number),
        textOrNull(data.haki_status),
        textOrNull(data.haki_number),
        actor.id,
      ),
    auditStatement(db, "profile.franchisor.update", "franchisor_profiles", existing.id, { source: "profile" }, actor.id),
  ]);

  return jsonResponse({ success: true, profile: await loadFranchisorProfile(db, actor.id) });
}

export async function updateOwnedListing(db, actor, data) {
  const franchisorProfile = await loadFranchisorProfile(db, actor.id);
  const listing = await db
    .prepare(
      `SELECT id, owner_user_id, franchisor_profile_id, brand_name, slug
       FROM franchises
       WHERE id = ?
         AND (owner_user_id = ? OR (? IS NOT NULL AND franchisor_profile_id = ?))
       LIMIT 1`,
    )
    .bind(data.franchise_id, actor.id, franchisorProfile?.id || null, franchisorProfile?.id || null)
    .first();

  if (!listing) {
    return jsonResponse({ success: false, message: "Listing tidak ditemukan atau bukan milik akun ini." }, { status: 404 });
  }

  const rate = await db
    .prepare(
      `SELECT MAX(created_at) AS last_edit_at, COUNT(*) AS edits
       FROM audit_events
       WHERE actor_user_id = ?
         AND action = 'profile.listing.update'
         AND entity_type = 'franchises'
         AND entity_id = ?
         AND created_at >= datetime('now', ?)`,
    )
    .bind(actor.id, listing.id, `-${OWNER_LISTING_EDIT_INTERVAL_HOURS} hours`)
    .first();

  if (Number(rate?.edits || 0) > 0) {
    return jsonResponse(
      {
        success: false,
        error: "LISTING_EDIT_RATE_LIMITED",
        message: `Listing hanya bisa diedit sekali setiap ${OWNER_LISTING_EDIT_INTERVAL_HOURS} jam. Silakan coba lagi nanti.`,
        last_owner_edit_at: rate.last_edit_at,
        edit_interval_hours: OWNER_LISTING_EDIT_INTERVAL_HOURS,
      },
      { status: 429 },
    );
  }

  const patch = listingPatch(data);
  if (!Object.keys(patch).length) {
    return jsonResponse({ success: false, message: "Tidak ada field listing yang berubah." }, { status: 400 });
  }

  const update = buildUpdate("franchises", patch, "id");
  const statements = [
    db.prepare(update.sql).bind(...update.values, listing.id),
    auditStatement(db, "profile.listing.update", "franchises", listing.id, { source: "profile", fields: Object.keys(patch) }, actor.id),
    ...siteRebuildStatements(db, {
      siteId: SITE_FRANCHISEE_ID,
      franchiseId: listing.id,
      reason: "owner_listing_update",
      entityType: "franchises",
      entityId: listing.id,
      actorUserId: actor.id,
      source: "profile",
      metadata: {
        slug: listing.slug,
        brand_name: patch.brand_name || listing.brand_name,
        fields: Object.keys(patch),
      },
    }),
  ];

  await db.batch(statements);

  return jsonResponse({
    success: true,
    franchise: await loadOwnedListing(db, actor, listing.id, franchisorProfile?.id || null),
    edit_interval_hours: OWNER_LISTING_EDIT_INTERVAL_HOURS,
  });
}

export async function updateListingLocations(db, actor, data) {
  const franchisorProfile = await loadFranchisorProfile(db, actor.id);
  const listing = await loadOwnedListing(db, actor, data.franchise_id, franchisorProfile?.id || null);
  if (!listing) {
    return jsonResponse({ success: false, message: "Listing tidak ditemukan atau bukan milik akun ini." }, { status: 404 });
  }

  const { locations, statements } = manualLocationWriteStatements(db, listing.id, data.locations || []);

  statements.push(
    auditStatement(
      db,
      "profile.listing.locations.update",
      "franchise_locations",
      listing.id,
      { source: "profile", count: locations.length, locations: manualLocationSummary(locations) },
      actor.id,
    ),
    ...siteRebuildStatements(db, {
      siteId: SITE_FRANCHISEE_ID,
      franchiseId: listing.id,
      reason: "owner_listing_locations_update",
      entityType: "franchise_locations",
      entityId: listing.id,
      actorUserId: actor.id,
      source: "profile",
      metadata: {
        slug: listing.slug,
        brand_name: listing.brand_name,
        count: locations.length,
      },
    }),
  );

  await db.batch(statements);
  const locationMap = await loadOwnedStructuredLocations(db, [listing.id]);

  return jsonResponse({
    success: true,
    structured_locations: locationMap.get(listing.id) || [],
  });
}

export async function updateFranchiseLeadStatus(db, actor, data) {
  const lead = await db
    .prepare(
      `SELECT fl.id, fl.franchise_id, f.owner_user_id, f.franchisor_profile_id
       FROM franchise_leads fl
       INNER JOIN franchises f ON f.id = fl.franchise_id
       LEFT JOIN franchisor_profiles fp ON fp.id = f.franchisor_profile_id
       WHERE fl.id = ?
         AND (f.owner_user_id = ? OR fp.user_id = ?)
       LIMIT 1`,
    )
    .bind(data.lead_id, actor.id, actor.id)
    .first();

  if (!lead) {
    return jsonResponse({ success: false, message: "Lead tidak ditemukan atau bukan milik akun ini." }, { status: 404 });
  }

  await db.batch([
    db
      .prepare("UPDATE franchise_leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(data.status, lead.id),
    auditStatement(db, "profile.franchisor.lead_status", "franchise_leads", lead.id, { status: data.status, franchise_id: lead.franchise_id }, actor.id),
  ]);

  const franchisorProfile = await loadFranchisorProfile(db, actor.id);
  return jsonResponse({
    success: true,
    franchisor_leads: await loadFranchisorLeadInbox(db, actor.id, franchisorProfile?.id || null),
  });
}

export async function loadOwnedStructuredLocations(db, franchiseIds) {
  const ids = Array.from(new Set((franchiseIds || []).filter(Boolean)));
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  try {
    const result = await db
      .prepare(
        `SELECT
          fl.id,
          fl.franchise_id,
          fl.location_text,
          fl.location_type,
          fl.source_field,
          fl.confidence_score,
          l.city,
          l.slug,
          l.province
         FROM franchise_locations fl
         LEFT JOIN locations l ON l.id = fl.location_id
         WHERE fl.franchise_id IN (${placeholders})
           AND COALESCE(l.city, fl.location_text) IS NOT NULL
         ORDER BY
           CASE fl.source_field WHEN 'owner_profile' THEN 0 ELSE 1 END,
           CASE fl.location_type WHEN 'head_office' THEN 0 WHEN 'origin' THEN 1 WHEN 'outlet' THEN 2 ELSE 3 END,
           COALESCE(l.city, fl.location_text) ASC`,
      )
      .bind(...ids)
      .all();
    const byFranchise = new Map();
    for (const row of result.results || []) {
      const rows = byFranchise.get(row.franchise_id) || [];
      rows.push({
        ...row,
        city: row.city || row.location_text || "",
        source_label: row.source_field === "owner_profile" ? "Diatur pemilik" : "Data awal",
      });
      byFranchise.set(row.franchise_id, rows);
    }
    return byFranchise;
  } catch (_error) {
    return new Map();
  }
}

export async function loadOwnedPublicationDistribution(db, franchiseIds) {
  const ids = Array.from(new Set((franchiseIds || []).filter(Boolean)));
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  try {
    const result = await db
      .prepare(
        `SELECT
          p.franchise_id,
          p.site_id,
          p.slug,
          p.canonical_url,
          p.publication_status,
          p.is_primary,
          p.updated_at,
          ns.domain,
          ns.name,
          ns.site_type
         FROM franchise_site_publications p
         LEFT JOIN network_sites ns ON ns.id = p.site_id
         WHERE p.franchise_id IN (${placeholders})
         ORDER BY p.is_primary DESC, ns.domain ASC`,
      )
      .bind(...ids)
      .all();
    const byFranchise = new Map();
    for (const row of result.results || []) {
      const rows = byFranchise.get(row.franchise_id) || [];
      rows.push(row);
      byFranchise.set(row.franchise_id, rows);
    }
    return byFranchise;
  } catch (_error) {
    return new Map();
  }
}

export async function loadFranchisorLeadInbox(db, userId, franchisorProfileId) {
  const result = await db
    .prepare(
      `SELECT fl.id, fl.franchise_id, fl.franchisee_user_id, fl.name, fl.email, fl.country_code,
              fl.whatsapp, fl.city_origin, fl.budget_range, fl.message, fl.status,
              fl.created_at, fl.updated_at,
              f.brand_name, f.slug,
              p.canonical_url
       FROM franchise_leads fl
       INNER JOIN franchises f ON f.id = fl.franchise_id
       LEFT JOIN franchise_site_publications p
         ON p.franchise_id = f.id
        AND p.site_id = ?
       WHERE f.owner_user_id = ?
          OR (? IS NOT NULL AND f.franchisor_profile_id = ?)
       ORDER BY fl.created_at DESC
       LIMIT 80`,
    )
    .bind(SITE_FRANCHISEE_ID, userId, franchisorProfileId || null, franchisorProfileId || null)
    .all();

  return result.results || [];
}

export async function loadFranchisorProfile(db, userId) {
  return await db
    .prepare(
      `SELECT id, user_id, company_name, pic_name, email_contact, country_code, whatsapp,
              website_url, instagram_url, facebook_url, tiktok_url, youtube_url, linkedin_url,
              nib_number, haki_status, haki_number, created_at, updated_at
       FROM franchisor_profiles
       WHERE user_id = ?
       LIMIT 1`,
    )
    .bind(userId)
    .first();
}

export async function loadOwnedListing(db, actor, franchiseId, franchisorProfileId) {
  return await db
    .prepare(
      `SELECT f.*, p.publication_status, p.canonical_url, p.last_synced_at
       FROM franchises f
       LEFT JOIN franchise_site_publications p
         ON p.franchise_id = f.id
        AND p.site_id = ?
       WHERE f.id = ?
         AND (f.owner_user_id = ? OR (? IS NOT NULL AND f.franchisor_profile_id = ?))
       LIMIT 1`,
    )
    .bind(SITE_FRANCHISEE_ID, franchiseId, actor.id, franchisorProfileId || null, franchisorProfileId || null)
    .first();
}
