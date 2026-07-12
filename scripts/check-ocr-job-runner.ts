import assert from "node:assert/strict";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { DashboardActionSchema } from "../functions/_dashboard-schemas.js";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { getOcrJobState } from "../functions/_ocr-job-runner.js";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { getOcrWorkerUsage } from "../functions/_ocr-quota-policy.js";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { normalizeOcrText } from "../functions/_ocr-provider-adapters.js";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { getOcrEnrichmentQueue } from "../functions/_ocr-enrichment-review.js";

async function main() {
  const enqueue = DashboardActionSchema.safeParse({
    action: "enqueue_ocr_jobs",
    limit: 25,
    priority: 100,
    force: false,
  });
  assert.equal(enqueue.success, true);

  const run = DashboardActionSchema.safeParse({
    action: "run_ocr_jobs",
    max_jobs: 2,
    lease_id: "ocrrun_1234567890abcdef",
  });
  assert.equal(run.success, true);

  const batchRun = DashboardActionSchema.safeParse({
    action: "run_ocr_jobs",
    max_jobs: 5,
    batch_id: "ocrbatch_1234567890abcdef",
  });
  assert.equal(batchRun.success, true);

  const acquireLease = DashboardActionSchema.safeParse({
    action: "acquire_ocr_run_lease",
    source: "dashboard_continuous",
  });
  assert.equal(acquireLease.success, true);

  const heartbeatLease = DashboardActionSchema.safeParse({
    action: "heartbeat_ocr_run_lease",
    lease_id: "ocrrun_1234567890abcdef",
  });
  assert.equal(heartbeatLease.success, true);

  const releaseLease = DashboardActionSchema.safeParse({
    action: "release_ocr_run_lease",
    lease_id: "ocrrun_1234567890abcdef",
  });
  assert.equal(releaseLease.success, true);

  const dryRun = DashboardActionSchema.safeParse({
    action: "run_ocr_dry_run",
  });
  assert.equal(dryRun.success, true);

  const markNoText = DashboardActionSchema.safeParse({
    action: "mark_ocr_job_no_text",
    job_id: "ocrjob_example",
    notes: "Admin sudah cek gambar: tidak ada teks cukup.",
  });
  assert.equal(markNoText.success, true);

  const noTextSearch = DashboardActionSchema.safeParse({
    action: "search_ocr_jobs",
    status: "no_text",
    limit: 120,
  });
  assert.equal(noTextSearch.success, true);

  const enrichmentBundle = DashboardActionSchema.safeParse({
    action: "create_ocr_enrichment_suggestion",
    franchise_id: "franchise_example",
  });
  assert.equal(enrichmentBundle.success, true);

  const tooWideRun = DashboardActionSchema.safeParse({
    action: "run_ocr_jobs",
    max_jobs: 50,
  });
  assert.equal(tooWideRun.success, false, "OCR batch size must stay bounded");

  const migrationMissingDb = {
    prepare() {
      return {
        all() {
          throw new Error("D1_ERROR: no such table: ocr_jobs");
        },
        first() {
          throw new Error("D1_ERROR: no such table: ocr_jobs");
        },
      };
    },
  };
  const state = await getOcrJobState(migrationMissingDb, { roles: [{ role: "admin" }] });
  assert.equal(state.migration_required, true);
  assert.equal(state.admin_only, false);

  const usageDb = {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async all() {
          if (/FROM ocr_provider_configs/i.test(sql)) {
            return {
              results: [
                { provider_key: "ocr_space", display_name: "OCR.Space", free_quota_limit: 500, free_quota_period: "daily", quota_unit: "requests", quota_used: 125, quota_reset_at: "2099-01-01T00:00:00.000Z", health_status: "ready" },
                { provider_key: "google_vision", display_name: "Google Cloud Vision", free_quota_limit: 1000, free_quota_period: "monthly", quota_unit: "units", quota_used: 100, quota_reset_at: "2099-01-01T00:00:00.000Z", health_status: "ready" },
                { provider_key: "pdf_co", display_name: "PDF.co", free_quota_limit: null, free_quota_period: "account_specific", quota_unit: "credits", quota_used: 0, quota_reset_at: null, health_status: "ready" },
              ],
            };
          }
          return { results: [] };
        },
        async first() {
          if (/FROM ocr_provider_usage_events/i.test(sql)) return { used: 20 };
          return null;
        },
      };
    },
  };
  const usage = await getOcrWorkerUsage(usageDb, {});
  assert.equal(usage.cap, 1500, "combined cap should sum active providers with known limits");
  assert.equal(usage.used, 225, "combined used should sum provider quota counters");
  assert.equal(usage.remaining, 1275, "combined remaining should sum known provider remaining quota");
  assert.equal(usage.known_provider_count, 2);
  assert.equal(usage.unknown_provider_count, 1);

  const enrichmentDb = {
    prepare() {
      return {
        bind() {
          return this;
        },
        async all() {
          return {
            results: [
              {
                id: "knowledge_1",
                asset_id: "asset_1",
                franchise_id: "franchise_1",
                structured_data: JSON.stringify({ min_area_sqm: 15, royalty_percent: 0, support_system: "Training dan SOP", outlet_type: "RUKO, booth" }),
                source_text_preview: "Luas minimal 15 m2. Royalty 0%. Training dan SOP. Tipe outlet RUKO, booth.",
                updated_at: "2026-07-12T00:00:00Z",
                brand_name: "Sample Brand",
                slug: "sample-brand",
                min_area_sqm: null,
                royalty_percent: null,
                support_system: "",
                display_order: 2,
                source_url: "https://assets.franchisee.id/sample/page-2.jpg",
                pending_bundle_count: 0,
                pending_page_suggestion_count: 1,
              },
            ],
          };
        },
      };
    },
  };
  const enrichment = await getOcrEnrichmentQueue(enrichmentDb);
  assert.equal(enrichment.total, 1);
  assert.equal(enrichment.items[0].field_count, 4);
  assert.equal(enrichment.items[0].suggested_value.min_area_sqm, 15);
  assert.equal(enrichment.items[0].suggested_value.outlet_type, "Ruko, Booth");
  assert.equal(enrichment.items[0].sources_by_field.min_area_sqm.sources[0].asset_id, "asset_1");

  assert.equal(normalizeOcrText("A  \r\n\r\n\r\n B\t\tC"), "A\n\n B C");

  console.log("OCR job runner contract check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
