import assert from "node:assert/strict";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { DashboardActionSchema } from "../functions/_dashboard-schemas.js";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { getOcrJobState } from "../functions/_ocr-job-runner.js";
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
  });
  assert.equal(run.success, true);

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

  assert.equal(normalizeOcrText("A  \r\n\r\n\r\n B\t\tC"), "A\n\n B C");

  console.log("OCR job runner contract check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
