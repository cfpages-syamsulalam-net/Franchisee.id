import { SITE_FRANCHISEE_ID, siteRebuildStatements } from "./_site-publish-queue.js";
import {
  auditStatement,
  cleanPayload,
  duplicateResponse,
  findClaimSource,
  franchiseBindValues,
  hasDuplicateFranchisor,
  jakartaTimestamp,
  jsonResponse,
  legacySourceStatement,
  lowerOrNull,
  moneyOrNull,
  normalizeHakiStatus,
  normalizeText,
  normalizeWhatsapp,
  randomId,
  shortPublicId,
  textOrNull,
  uniqueSlug,
} from "./_form-submit-utils.js";

export async function handleFranchisorSubmit(db, data, isClaim, actor) {
  const duplicate = await hasDuplicateFranchisor(db, data.email_contact, data.whatsapp);
  if (duplicate) return duplicateResponse();

  const publicId = shortPublicId();
  const profileId = `franchisor_profile_${randomId()}`;
  const payload = cleanPayload(data);
  const claimSource = isClaim ? await findClaimSource(db, data) : null;
  const franchiseId = claimSource?.id || `franchise_${randomId()}`;
  const slug = claimSource?.slug || (await uniqueSlug(db, data.brand_name, publicId));
  const investment = moneyOrNull(data.total_investment_value) || moneyOrNull(data.min_capital) || moneyOrNull(data.pkg_price_1);
  const now = jakartaTimestamp();

  const statements = [
    db
      .prepare(
        `INSERT INTO franchisor_profiles (
          id, user_id, source_site_id, company_name, pic_name, email_contact, country_code,
          whatsapp, website_url, instagram_url, facebook_url, tiktok_url, youtube_url, linkedin_url,
          nib_number, haki_status, haki_number,
          legacy_row_id, legacy_timestamp, raw_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        profileId,
        actor.id,
        "site_franchisee_id",
        textOrNull(data.company_name),
        textOrNull(data.pic_name),
        lowerOrNull(data.email_contact),
        textOrNull(data.country_code),
        normalizeWhatsapp(data.whatsapp),
        textOrNull(data.website_url),
        textOrNull(data.instagram_url),
        textOrNull(data.facebook_url),
        textOrNull(data.tiktok_url),
        textOrNull(data.youtube_url),
        textOrNull(data.linkedin_url),
        textOrNull(data.nib_number),
        normalizeHakiStatus(data.haki_status),
        textOrNull(data.haki_number),
        publicId,
        now,
        JSON.stringify(payload)
      ),
  ];

  if (claimSource) {
    statements.push(
      db
        .prepare(
        `UPDATE franchises
          SET owner_user_id = ?,
              franchisor_profile_id = ?,
              source_site_id = ?,
              brand_name = ?,
              category = ?,
              status = 'free',
              verification_tier = 'free',
              source_type = 'claim',
              source_sheet = 'FRANCHISOR',
              legacy_row_id = ?,
              legacy_timestamp = ?,
              year_established = ?,
              city_origin = ?,
              brand_country = ?,
              outlet_type = ?,
              target_market = ?,
              location_requirement = ?,
              min_area_sqm = ?,
              min_staff_count = ?,
              setup_duration_days = ?,
              rent_cost_text = ?,
              fee_license_idr = ?,
              fee_capex_idr = ?,
              fee_construction_idr = ?,
              working_capital_idr = ?,
              additional_cost_notes = ?,
              total_investment_idr = ?,
              min_investment_idr = ?,
              estimated_bep_months = ?,
              estimated_bep_min_months = ?,
              estimated_bep_max_months = ?,
              omzet_monthly_idr = ?,
              omzet_monthly_min_idr = ?,
              omzet_monthly_max_idr = ?,
              net_profit_percent = ?,
              net_profit_monthly_min_idr = ?,
              net_profit_monthly_max_idr = ?,
              royalty_percent = ?,
              royalty_basis = ?,
              short_desc = ?,
              full_desc = ?,
              support_system = ?,
              phone = ?,
              logo_url = ?,
              cover_url = ?,
              gallery_urls = ?,
              video_url = ?,
              proposal_url = ?,
              raw_payload = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`
        )
        .bind(actor.id, ...franchiseBindValues(data, profileId, publicId, now, investment), franchiseId)
    );
  } else {
    statements.push(
      db
        .prepare(
          `INSERT INTO franchises (
            id, owner_user_id, franchisor_profile_id, source_site_id, brand_name, slug, category,
            status, verification_tier, source_type, source_sheet, legacy_row_id,
            legacy_timestamp, year_established, city_origin, brand_country, outlet_type,
            target_market, location_requirement, min_area_sqm, min_staff_count, setup_duration_days,
            rent_cost_text, fee_license_idr, fee_capex_idr, fee_construction_idr,
            working_capital_idr, additional_cost_notes, total_investment_idr, min_investment_idr,
            estimated_bep_months, estimated_bep_min_months, estimated_bep_max_months,
            omzet_monthly_idr, omzet_monthly_min_idr, omzet_monthly_max_idr,
            net_profit_percent, net_profit_monthly_min_idr, net_profit_monthly_max_idr,
            royalty_percent, royalty_basis,
            short_desc, full_desc, support_system, phone, logo_url, cover_url,
            gallery_urls, video_url, proposal_url, raw_payload
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'free', 'free', 'franchisor_form', 'FRANCHISOR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(franchiseId, actor.id, profileId, "site_franchisee_id", normalizeText(data.brand_name), slug, textOrNull(data.category), ...franchiseBindValues(data, profileId, publicId, now, investment).slice(4))
    );

    statements.push(
      db
        .prepare(
          `INSERT INTO franchise_site_publications (
            id, franchise_id, site_id, slug, canonical_url, publication_status, is_primary, first_published_at, last_synced_at
          ) VALUES (?, ?, ?, ?, ?, 'published', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .bind(
          `publication_${randomId()}`,
          franchiseId,
          "site_franchisee_id",
          slug,
          `https://franchisee.id/peluang-usaha/${slug}`
        )
    );
  }

  const packagePrice = moneyOrNull(data.pkg_price_1) || investment;
  if (packagePrice) {
    statements.push(
      db
        .prepare(
          `INSERT INTO franchise_packages (
            id, franchise_id, package_name, package_label, price_idr, min_capital_idr, description, display_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
        )
        .bind(
          `package_${randomId()}`,
          franchiseId,
          textOrNull(data.pkg_name_1) || "Paket Standard",
          textOrNull(data.pkg_name_1) || "Paket Standard",
          packagePrice,
          packagePrice,
          textOrNull(data.pkg_desc_1)
        )
    );
  }

  if (isClaim) {
    statements.push(
      db
        .prepare(
          `INSERT INTO franchise_claims (
            id, franchise_id, claimant_user_id, franchisor_profile_id, source_site_id, unclaimed_legacy_row_id,
            status, evidence_text, reviewed_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, CURRENT_TIMESTAMP)`
        )
        .bind(`claim_${randomId()}`, franchiseId, actor.id, profileId, "site_franchisee_id", textOrNull(data.unclaimed_id), `Claim submitted from /daftar for ${normalizeText(data.brand_name)}`)
    );
  }

  statements.push(
    legacySourceStatement(db, "FRANCHISOR", publicId, data.brand_name, "franchises", franchiseId, payload),
    auditStatement(db, isClaim ? "franchise.claim_submit" : "franchise.submit", "franchises", franchiseId, {
      source: "form-submit",
      profile_id: profileId,
    }, actor.id)
  );
  statements.push(
    ...siteRebuildStatements(db, {
      siteId: SITE_FRANCHISEE_ID,
      franchiseId,
      reason: isClaim ? "franchise_claim_published" : "franchise_listing_submitted",
      entityType: "franchises",
      entityId: franchiseId,
      actorUserId: actor.id,
      source: "form-submit",
      metadata: {
        slug,
        brand_name: normalizeText(data.brand_name),
        claim: isClaim,
      },
    })
  );

  await db.batch(statements);

  return jsonResponse({
    success: true,
    id: publicId,
    franchise_id: franchiseId,
    profile_id: profileId,
  });
}
