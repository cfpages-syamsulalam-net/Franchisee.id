import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = [
  "js/dashboard-ocr-state.js",
  "js/dashboard-ocr-providers.js",
  "js/dashboard-ocr-jobs.js",
  "js/dashboard-ocr-batches.js",
  "js/dashboard-ocr-results.js",
  "js/dashboard-ocr-worker.js",
  "js/dashboard-ocr.js",
];

for (const file of files) {
  const syntax = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (syntax.status !== 0) {
    process.stderr.write(syntax.stderr || syntax.stdout || `dashboard OCR client syntax check failed for ${file}`);
    process.exit(syntax.status || 1);
  }
}

const assertionSources = files.concat([
  "src/pages/dashboard/index.astro",
  "css/dashboard-ocr-settings.css",
  "css/dashboard-ocr-execution.css",
  "css/dashboard-ocr-results.css",
]);
const source = assertionSources.map((file) => readFileSync(file, "utf8")).join("\n");
const requiredFragments = [
  "FranchiseDashboardOcrState",
  "FranchiseDashboardOcrProviders",
  "FranchiseDashboardOcrJobs",
  "FranchiseDashboardOcrBatches",
  "FranchiseDashboardOcrResults",
  "FranchiseDashboardOcrWorker",
  "data-ocr-toggle-provider",
  "toggle_ocr_provider_enabled",
  "data-ocr-retry-job",
  "retry_ocr_job",
  "mark_ocr_job_no_text",
  "data-ocr-copy-job-error",
  "dash-ocr-job-message",
  "Pesan job OCR sudah disalin",
  "retry_failed_ocr_jobs",
  "retryFailedButton",
  "activeProviderCount === 0",
  "Aktifkan provider OCR dulu",
  "data-ocr-mark-no-text",
  "canMarkNoText",
  "Hover untuk lihat gambar cepat",
  "data-ocr-image-preview-url",
  "data-ocr-image-preview-alt",
  "bindImagePreview(options.resultRows)",
  "bindImagePreview",
  "dash-ocr-image-preview",
  "getPreviewViewportBounds",
  "--dash-ocr-preview-max-height",
  "dashboard-ocr-settings.css",
  "dashboard-ocr-execution.css",
  "dashboard-ocr-results.css",
  "Perlu cek",
  "renderJobStatus",
  "renderJobActionLink",
  "renderJobResultAction",
  "asset_id",
  "data-ocr-result-franchise-limit",
  "data-ocr-result-group-page",
  "getVisibleResultGroups",
  "OCR ulang selesai",
  "data-ocr-job-filter",
  "data-ocr-job-limit",
  "search_ocr_jobs",
  "data-ocr-job-page",
  "groupJobsByFranchise",
  "jobPageSize: 120",
  "acquire_ocr_run_lease",
  "release_ocr_run_lease",
  "continuousRunLeaseId",
  "lease_id",
  "start_ocr_batch_run",
  "Proses tetap berjalan walau tab/browser tidak aktif",
  "handleForegroundRefresh",
  "primeBatchChunk",
  "firstResumableSchedulerBatch",
  "dash-ocr-worker-usage",
  "worker_usage",
  "workerResetCountdownLabel",
  "data-ocr-worker-countdown",
];

for (const fragment of requiredFragments) {
  if (!source.includes(fragment)) {
    throw new Error(`Missing expected OCR dashboard client fragment: ${fragment}`);
  }
}

console.log("Dashboard OCR client check passed.");
