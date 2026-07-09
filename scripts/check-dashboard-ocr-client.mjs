import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = [
  "js/dashboard-ocr-state.js",
  "js/dashboard-ocr-providers.js",
  "js/dashboard-ocr-jobs.js",
  "js/dashboard-ocr-batches.js",
  "js/dashboard-ocr-results.js",
  "js/dashboard-ocr.js",
];

for (const file of files) {
  const syntax = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (syntax.status !== 0) {
    process.stderr.write(syntax.stderr || syntax.stdout || `dashboard OCR client syntax check failed for ${file}`);
    process.exit(syntax.status || 1);
  }
}

const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
const requiredFragments = [
  "FranchiseDashboardOcrState",
  "FranchiseDashboardOcrProviders",
  "FranchiseDashboardOcrJobs",
  "FranchiseDashboardOcrBatches",
  "FranchiseDashboardOcrResults",
  "data-ocr-toggle-provider",
  "toggle_ocr_provider_enabled",
  "data-ocr-retry-job",
  "retry_ocr_job",
  "mark_ocr_job_no_text",
  "retry_failed_ocr_jobs",
  "retryFailedButton",
  "activeProviderCount === 0",
  "Aktifkan provider OCR dulu",
  "data-ocr-mark-no-text",
  "Buka gambar halaman brosur",
  "Perlu cek",
  "renderJobStatus",
  "renderJobActionLink",
  "renderJobResultAction",
  "OCR ulang selesai",
  "data-ocr-job-filter",
  "search_ocr_jobs",
  "data-ocr-job-page",
  "groupJobsByFranchise",
];

for (const fragment of requiredFragments) {
  if (!source.includes(fragment)) {
    throw new Error(`Missing expected OCR dashboard client fragment: ${fragment}`);
  }
}

console.log("Dashboard OCR client check passed.");
