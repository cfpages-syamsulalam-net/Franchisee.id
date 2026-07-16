import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { siteRebuildStatements } from "../functions/_site-publish-queue.js";

type PreparedStatement = {
  sql: string;
  params: unknown[];
};

async function main() {
  const prepared: PreparedStatement[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          prepared.push({ sql, params });
          return { sql, params };
        },
      };
    },
  };

  const statements = siteRebuildStatements(db, {
    siteId: "site_franchisee_id",
    franchiseId: "franchise_1",
    reason: "review_approved",
    entityType: "pending_edit_suggestions",
    entityId: "suggestion_1",
    actorUserId: "user_1",
    source: "dashboard",
    metadata: { field_count: 2 },
  });

  assert.equal(statements.length, 3, "publish queue enqueue must update, insert-if-missing, then reconcile state");
  assert.match(prepared[0].sql, /UPDATE site_rebuild_requests/);
  assert.match(prepared[0].sql, /status IN \('pending', 'failed_retryable'\)/);
  assert.match(prepared[1].sql, /INSERT INTO site_rebuild_requests[\s\S]*WHERE NOT EXISTS/);
  assert.match(prepared[2].sql, /pending_count = \(SELECT COUNT\(\*\) FROM site_rebuild_requests/);
  assert.match(prepared[2].sql, /status IN \('pending', 'failed_retryable'\)/);

  const pollerSource = readFileSync("scripts/d1-static-publish-poller.mjs", "utf8");
  assert.match(pollerSource, /pending_count = \(/);
  assert.match(pollerSource, /queued_count = \(/);

  const outreachStatusSource = readFileSync("functions/_outreach-status.js", "utf8");
  assert.match(outreachStatusSource, /last_status_changed_at = CURRENT_TIMESTAMP/);
  assert.match(outreachStatusSource, /last_contacted_at = COALESCE\(excluded\.last_contacted_at, listing_outreach_statuses\.last_contacted_at\)/);

  const outreachQuerySource = readFileSync("functions/_dashboard-outreach-queries.js", "utf8");
  assert.match(outreachQuerySource, /stage_changed_at: row\.last_status_changed_at \|\| row\.updated_at \|\| ""/);
  assert.match(outreachQuerySource, /milestone_policy:/);

  const outreachClientSource = readFileSync("js/dashboard-outreach.js", "utf8");
  assert.match(outreachClientSource, /Stage saat ini sejak/);
  assert.match(outreachClientSource, /data-fr-tooltip/);

  const claimMatrix = readFileSync("docs/forms/CLAIM_TRANSITION_MATRIX.md", "utf8");
  assert.match(claimMatrix, /Listing already has owner when claim is approved/);
  assert.match(claimMatrix, /Publish queue coalescing after approval/);

  const fieldDictionary = readFileSync("docs/data/FRANCHISE_FIELD_DICTIONARY.md", "utf8");
  assert.match(fieldDictionary, /Biaya Lisensi \/ Kemitraan/);
  assert.match(fieldDictionary, /Do not infer from a single fee/);
  const fieldDictionarySource = readFileSync("src/lib/franchise-field-dictionary.js", "utf8");
  assert.match(fieldDictionarySource, /fee_license_idr/);
  assert.match(fieldDictionarySource, /franchiseFieldEvidenceKeywords/);

  const providerStrategy = readFileSync("docs/architecture/OCR_PROVIDER_STRATEGY.md", "utf8");
  assert.match(providerStrategy, /Provider Health Transitions/);
  assert.match(providerStrategy, /cooldown_until <= CURRENT_TIMESTAMP/);

  const formStateSource = readFileSync("js/form-01-state-helpers.js", "utf8");
  assert.match(formStateSource, /FRANCHISOR_DRAFT_SCHEMA_VERSION: 2/);
  assert.match(formStateSource, /draft\.claim_brand_id && currentClaimBrandId/);
  const autoSaveDocs = readFileSync("docs/forms/AUTO_SAVE.md", "utf8");
  assert.match(autoSaveDocs, /Multi-Tab And Stale Draft Policy/);

  const migrationRunbook = readFileSync("docs/architecture/R2_D1_MIGRATION_RUNBOOK.md", "utf8");
  assert.match(migrationRunbook, /New large payload writes must go to R2 first/);
  assert.match(migrationRunbook, /historical OCR text backfill completed on 2026-07-16/);

  console.log("State transition contract check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
