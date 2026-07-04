import {
  auditStatement,
  cleanPayload,
  duplicateResponse,
  hasDuplicateFranchisee,
  jakartaTimestamp,
  jsonResponse,
  legacySourceStatement,
  lowerOrNull,
  normalizeText,
  normalizeWhatsapp,
  randomId,
  shortPublicId,
  textOrNull,
} from "./_form-submit-utils.js";

export async function handleFranchiseeSubmit(db, data, actor) {
  const duplicate = await hasDuplicateFranchisee(db, data.email, data.whatsapp);
  if (duplicate) return duplicateResponse();

  const publicId = shortPublicId();
  const profileId = `franchisee_profile_${randomId()}`;
  const payload = cleanPayload(data);

  await db.batch([
    db
      .prepare(
        `INSERT INTO franchisee_profiles (
          id, user_id, source_site_id, name, email, country_code, whatsapp, city_origin,
          interest_category, budget_range, location_plan, message, legacy_row_id,
          legacy_timestamp, raw_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        profileId,
        actor.id,
        "site_franchisee_id",
        normalizeText(data.name),
        lowerOrNull(data.email),
        textOrNull(data.country_code),
        normalizeWhatsapp(data.whatsapp),
        textOrNull(data.city_origin),
        textOrNull(data.interest_category),
        textOrNull(data.budget_range),
        textOrNull(data.location_plan),
        textOrNull(data.message),
        publicId,
        jakartaTimestamp(),
        JSON.stringify(payload)
      ),
    legacySourceStatement(db, "FRANCHISEE", publicId, data.email || data.whatsapp || data.name, "franchisee_profiles", profileId, payload),
    auditStatement(db, "franchisee.submit", "franchisee_profiles", profileId, { source: "form-submit" }, actor.id),
  ]);

  return jsonResponse({
    success: true,
    id: publicId,
    profile_id: profileId,
  });
}
