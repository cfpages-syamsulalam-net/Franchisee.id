import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const file = "js/dashboard-ocr.js";
const syntax = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
if (syntax.status !== 0) {
  process.stderr.write(syntax.stderr || syntax.stdout || "dashboard OCR client syntax check failed");
  process.exit(syntax.status || 1);
}

const source = readFileSync(file, "utf8");
const requiredFragments = [
  "data-ocr-toggle-provider",
  "toggle_ocr_provider_enabled",
  "data-ocr-retry-job",
  "retry_ocr_job",
  "retry_failed_ocr_jobs",
  "retryFailedButton",
  "activeProviderCount === 0",
  "Aktifkan provider OCR dulu",
];

for (const fragment of requiredFragments) {
  if (!source.includes(fragment)) {
    throw new Error(`Missing expected OCR dashboard client fragment: ${fragment}`);
  }
}

console.log("Dashboard OCR client check passed.");
