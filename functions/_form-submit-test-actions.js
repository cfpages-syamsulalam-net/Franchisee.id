import { CreateUnclaimedSubmissionSchema } from "./_shared-schemas.js";
import { SITE_FRANCHISEE_ID, siteRebuildStatements } from "./_site-publish-queue.js";
import {
  auditStatement,
  cleanPayload,
  jakartaTimestamp,
  jsonResponse,
  legacySourceStatement,
  moneyOrNull,
  normalizeText,
  randomId,
  shortPublicId,
  textOrNull,
  uniqueSlug,
  validationError,
} from "./_form-submit-utils.js";

export async function handleCreateUnclaimed(db, data, actor) {
  const parsed = CreateUnclaimedSubmissionSchema.safeParse(data);
  if (!parsed.success) return validationError(parsed.error);

  const publicId = `TEST_${shortPublicId()}`;
  const franchiseId = `franchise_${randomId()}`;
  const slug = await uniqueSlug(db, parsed.data.brand_name, publicId);
  const payload = cleanPayload({ ...parsed.data, is_test_data: "TRUE" });

  await db.batch([
    db
      .prepare(
        `INSERT INTO franchises (
          id, source_site_id, brand_name, slug, category, status, verification_tier,
          source_type, source_sheet, legacy_row_id, legacy_timestamp, city_origin,
          min_investment_idr, raw_payload
        ) VALUES (?, ?, ?, ?, ?, 'unclaimed', 'unclaimed', 'manual', 'UNCLAIMED', ?, ?, ?, ?, ?)`
      )
      .bind(
        franchiseId,
        "site_franchisee_id",
        normalizeText(parsed.data.brand_name),
        slug,
        textOrNull(parsed.data.category),
        publicId,
        jakartaTimestamp(),
        textOrNull(parsed.data.city),
        moneyOrNull(parsed.data.min_capital),
        JSON.stringify(payload)
      ),
    db
      .prepare(
        `INSERT INTO franchise_site_publications (
          id, franchise_id, site_id, slug, canonical_url, publication_status, is_primary, first_published_at, last_synced_at
        ) VALUES (?, ?, ?, ?, ?, 'published', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(`publication_${randomId()}`, franchiseId, "site_franchisee_id", slug, `https://franchisee.id/peluang-usaha/${slug}/`),
    legacySourceStatement(db, "UNCLAIMED", publicId, parsed.data.brand_name, "franchises", franchiseId, payload),
    auditStatement(db, "franchise.test_create_unclaimed", "franchises", franchiseId, { source: "form-submit" }, actor.id),
    ...siteRebuildStatements(db, {
      siteId: SITE_FRANCHISEE_ID,
      franchiseId,
      reason: "test_unclaimed_created",
      entityType: "franchises",
      entityId: franchiseId,
      actorUserId: actor.id,
      source: "form-submit",
      metadata: {
        slug,
        brand_name: normalizeText(parsed.data.brand_name),
      },
    }),
  ]);

  return jsonResponse({
    success: true,
    id: publicId,
    franchise_id: franchiseId,
    message: "Test data berhasil dibuat.",
  });
}

export async function handleClearTestData(db, actor) {
  const testRows = await db
    .prepare("SELECT id FROM franchises WHERE legacy_row_id LIKE 'TEST_%' OR raw_payload LIKE '%\"is_test_data\":\"TRUE\"%'")
    .all();
  const ids = (testRows.results || []).map((row) => row.id);

  if (!ids.length) {
    return jsonResponse({
      success: true,
      deleted: 0,
      message: "Cleared 0 test records",
    });
  }

  const statements = ids.flatMap((id) => [
    db.prepare("DELETE FROM franchise_site_publications WHERE franchise_id = ?").bind(id),
    db.prepare("DELETE FROM franchise_packages WHERE franchise_id = ?").bind(id),
    db.prepare("DELETE FROM franchise_claims WHERE franchise_id = ?").bind(id),
    db.prepare("DELETE FROM franchises WHERE id = ?").bind(id),
  ]);
  statements.push(
    ...siteRebuildStatements(db, {
      siteId: SITE_FRANCHISEE_ID,
      reason: "test_data_cleared",
      entityType: "franchises",
      actorUserId: actor.id,
      source: "form-submit",
      metadata: {
        deleted: ids.length,
        franchise_ids: ids,
      },
    })
  );

  await db.batch(statements);
  await auditStatement(db, "franchise.test_clear_data", "franchises", null, { source: "form-submit", deleted: ids.length }, actor.id).run();

  return jsonResponse({
    success: true,
    deleted: ids.length,
    message: `Cleared ${ids.length} test records`,
  });
}
