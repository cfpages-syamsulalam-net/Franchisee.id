import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const profileClientFiles = [
  "js/profile-page.js",
  "js/profile-premium.js",
  "js/profile-franchisee.js",
  "js/profile-franchisor.js",
];

const forbiddenPatterns = [
  {
    pattern: /\bselectedFranchise\s*\(/,
    message: "Use selectedListing() in profile client code; selectedFranchise() is not defined.",
  },
];

const failures = [];

for (const file of profileClientFiles) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });

  const source = readFileSync(file, "utf8");
  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(source)) {
      failures.push(`${file}: ${rule.message}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Profile client check passed for ${profileClientFiles.length} files.`);
