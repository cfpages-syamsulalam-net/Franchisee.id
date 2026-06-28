import { SITE_ID } from "./_dashboard-schemas.js";
import { buildNormalizedContacts, hasInvalidContactUrl } from "./_contact-normalization.js";
import { auditStatement, isLikelyAllCapsDescription, normalizeText, randomId } from "./_dashboard-utils.js";

const QUALITY_SCAN_LIMIT = 1000;

export async function refreshDashboardQualityChecks(db, auth) {
  const rows = await db
    .prepare(
      `SELECT
        f.id,
        p.slug,
        f.brand_name,
        f.category,
        f.phone,
        f.office_address,
        f.short_desc,
        f.full_desc,
        f.logo_url,
        f.cover_url,
        f.updated_at,
        fp.email_contact,
        fp.whatsapp,
        fp.website_url,
        fp.instagram_url,
        fp.facebook_url,
        fp.tiktok_url,
        fp.youtube_url,
        fp.linkedin_url
       FROM franchise_site_publications p
       JOIN franchises f ON f.id = p.franchise_id
       LEFT JOIN franchisor_profiles fp ON fp.id = f.franchisor_profile_id
       WHERE p.site_id = ? AND p.publication_status = 'published'
       ORDER BY f.updated_at DESC
       LIMIT ${QUALITY_SCAN_LIMIT}`,
    )
    .bind(SITE_ID)
    .all();

  const statements = [];
  let contactCount = 0;
  let openCheckCount = 0;
  let resolvedCheckCount = 0;

  for (const row of rows.results || []) {
    const contacts = buildNormalizedContacts(row);
    contacts.forEach((contact) => {
      contactCount += 1;
      statements.push(upsertContactStatement(db, row.id, contact));
    });

    const checks = computeQualityChecks(row, contacts);
    openCheckCount += checks.length;
    checks.forEach((check) => {
      statements.push(upsertQualityCheckStatement(db, row.id, check));
    });

    statements.push(resolveMissingChecksStatement(db, row.id, checks.map((check) => check.check_type)));
    resolvedCheckCount += 1;
  }

  statements.push(
    auditStatement(db, "dashboard.quality.refresh", "franchise_quality_checks", null, {
      scanned: (rows.results || []).length,
      contacts: contactCount,
      open_checks: openCheckCount,
    }, auth.id),
  );

  await runInBatches(db, statements, 40);

  return {
    scanned: (rows.results || []).length,
    contacts: contactCount,
    open_checks: openCheckCount,
    resolved_listings_checked: resolvedCheckCount,
  };
}

export function computeQualityChecks(row, contacts = buildNormalizedContacts(row)) {
  const checks = [];
  const description = normalizeText(row.full_desc || row.short_desc || "");

  if (!normalizeText(row.logo_url) && !normalizeText(row.cover_url)) {
    checks.push(check("missing_image", "warning", "Tambahkan logo atau gambar utama agar listing lebih mudah dikenali."));
  }

  if (!contacts.some((contact) => ["phone", "whatsapp", "email", "website", "address"].includes(contact.contact_type))) {
    checks.push(check("missing_contact", "critical", "Tambahkan kontak atau alamat yang bisa dipakai calon mitra."));
  }

  if (!description) {
    checks.push(check("missing_description", "warning", "Tambahkan deskripsi singkat agar calon mitra paham peluang ini."));
  }

  if (!normalizeText(row.category)) {
    checks.push(check("missing_category", "warning", "Pilih kategori agar listing muncul di filter yang tepat."));
  }

  if (isLikelyAllCapsDescription(description)) {
    checks.push(check("likely_all_caps", "info", "Rapikan deskripsi yang terlalu banyak huruf kapital."));
  }

  if (normalizeText(row.phone) && !contacts.some((contact) => ["phone", "whatsapp"].includes(contact.contact_type))) {
    checks.push(check("suspicious_contact", "warning", "Periksa nomor kontak karena formatnya belum bisa dikenali."));
  }

  if (isStale(row.updated_at)) {
    checks.push(check("stale_listing", "info", "Periksa ulang listing ini karena sudah lama tidak diperbarui."));
  }

  if (hasInvalidContactUrl(row)) {
    checks.push(check("invalid_url", "warning", "Periksa tautan website atau media sosial yang belum valid."));
  }

  return checks;
}

function check(checkType, severity, message, details = {}) {
  return {
    check_type: checkType,
    severity,
    message,
    details_json: JSON.stringify(details),
  };
}

function isStale(value) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return false;
  const days = (Date.now() - timestamp) / 86400000;
  return days > 365;
}

function upsertContactStatement(db, franchiseId, contact) {
  return db
    .prepare(
      `INSERT INTO franchise_contacts (
        id, franchise_id, source_site_id, contact_type, label, value, normalized_value,
        url, source_field, confidence, status, is_primary
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
       ON CONFLICT(franchise_id, source_site_id, contact_type, normalized_value)
       DO UPDATE SET
         label = excluded.label,
         value = excluded.value,
         url = excluded.url,
         source_field = excluded.source_field,
         confidence = excluded.confidence,
         status = 'active',
         is_primary = excluded.is_primary,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      `contact_${randomId()}`,
      franchiseId,
      SITE_ID,
      contact.contact_type,
      contact.label,
      contact.value,
      contact.normalized_value,
      contact.url || null,
      contact.source_field,
      contact.confidence,
      contact.is_primary ? 1 : 0,
    );
}

function upsertQualityCheckStatement(db, franchiseId, check) {
  return db
    .prepare(
      `INSERT INTO franchise_quality_checks (
        id, franchise_id, site_id, check_type, severity, status, message, details_json
       ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?)
       ON CONFLICT(franchise_id, site_id, check_type)
       DO UPDATE SET
         severity = excluded.severity,
         status = CASE WHEN franchise_quality_checks.status = 'ignored' THEN 'ignored' ELSE 'open' END,
         message = excluded.message,
         details_json = excluded.details_json,
         last_seen_at = CURRENT_TIMESTAMP,
         resolved_at = NULL,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(`quality_${randomId()}`, franchiseId, SITE_ID, check.check_type, check.severity, check.message, check.details_json || null);
}

function resolveMissingChecksStatement(db, franchiseId, activeTypes) {
  if (!activeTypes.length) {
    return db
      .prepare(
        `UPDATE franchise_quality_checks
         SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE franchise_id = ? AND site_id = ? AND status = 'open'`,
      )
      .bind(franchiseId, SITE_ID);
  }

  return db
    .prepare(
      `UPDATE franchise_quality_checks
       SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE franchise_id = ? AND site_id = ? AND status = 'open'
         AND check_type NOT IN (${activeTypes.map(() => "?").join(", ")})`,
    )
    .bind(franchiseId, SITE_ID, ...activeTypes);
}

async function runInBatches(db, statements, size) {
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size));
  }
}
