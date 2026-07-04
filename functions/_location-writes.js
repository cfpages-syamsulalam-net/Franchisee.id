const MANUAL_LOCATION_SOURCE_FIELD = "owner_profile";
const LOCATION_TYPES = new Set(["head_office", "outlet", "available_area", "origin"]);
const MAX_MANUAL_LOCATIONS = 24;

export function normalizeManualLocations(rows) {
  const seen = new Set();
  const output = [];
  for (const row of rows || []) {
    const city = textOrNull(row.city);
    if (!city) continue;
    const locationType = LOCATION_TYPES.has(row.location_type) ? row.location_type : "available_area";
    const slug = slugifyLocation(city);
    if (!slug) continue;
    const key = `${locationType}:${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({
      city,
      province: textOrNull(row.province),
      location_type: locationType,
      slug,
    });
  }
  return output.slice(0, MAX_MANUAL_LOCATIONS);
}

export function manualLocationWriteStatements(db, franchiseId, rows, sourceField = MANUAL_LOCATION_SOURCE_FIELD) {
  const locations = normalizeManualLocations(rows);
  const statements = [
    db.prepare("DELETE FROM franchise_locations WHERE franchise_id = ? AND source_field = ?").bind(franchiseId, sourceField),
  ];

  for (const location of locations) {
    const locationId = manualLocationId(location.slug);
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO locations (id, country_code, province, city, slug)
           VALUES (?, 'ID', ?, ?, ?)`,
        )
        .bind(locationId, location.province, location.city, location.slug),
      db
        .prepare(
          `INSERT INTO franchise_locations
             (id, franchise_id, location_id, location_text, location_type, source_field, confidence_score)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
        )
        .bind(manualLocationRelationId(franchiseId, location.location_type, location.slug, sourceField), franchiseId, locationId, location.city, location.location_type, sourceField),
    );
  }

  return { locations, statements };
}

export function manualLocationSummary(locations) {
  return locations.map((item) => ({ city: item.city, type: item.location_type }));
}

export function manualLocationId(slug) {
  return `location_${slug}`;
}

export function manualLocationRelationId(franchiseId, locationType, slug, sourceField = MANUAL_LOCATION_SOURCE_FIELD) {
  const safeFranchiseId = slugifyLocation(franchiseId).slice(0, 48) || "franchise";
  const safeSource = sourceField === MANUAL_LOCATION_SOURCE_FIELD ? "owner" : slugifyLocation(sourceField).slice(0, 32) || "manual";
  return `franchise_location_${safeSource}_${safeFranchiseId}_${locationType}_${slug}`.slice(0, 190);
}

export function slugifyLocation(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function textOrNull(value) {
  const normalized = (value ?? "").toString().trim().replace(/\s+/g, " ");
  return normalized || null;
}
