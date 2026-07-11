import assert from "node:assert/strict";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { DashboardActionSchema } from "../functions/_dashboard-schemas.js";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { getOcrJobState } from "../functions/_ocr-job-runner.js";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { getOcrWorkerUsage } from "../functions/_ocr-quota-policy.js";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { normalizeOcrText } from "../functions/_ocr-provider-adapters.js";

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

  assert.equal(normalizeOcrText("A  \r\n\r\n\r\n B\t\tC"), "A\n\n B C");

  console.log("OCR job runner contract check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
