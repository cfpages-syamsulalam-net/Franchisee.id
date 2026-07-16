import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const authClientFiles = [
  "js/auth-clerk-debug.js",
  "js/auth-clerk-ui.js",
  "js/auth-clerk-core.js",
  "js/auth-clerk.js",
  "js/fetch-json.js",
];

const requiredFragments = [
  {
    file: "js/auth-clerk-core.js",
    fragment: 'const clerkStatus = getClerkRedirectParam("__clerk_status");',
    message: "OAuth callback handling must inspect Clerk's status parameter before calling the redirect handler.",
  },
  {
    file: "js/auth-clerk-core.js",
    fragment: "if (isExpiredClerkStatus(clerkStatus))",
    message: "Expired Clerk OAuth callbacks must be handled before Clerk's redirect handler runs.",
  },
  {
    file: "js/auth-clerk-core.js",
    fragment: "Sesi login Google sudah kedaluwarsa.",
    message: "Expired OAuth callbacks must show an actionable Indonesian retry message.",
  },
  {
    file: "js/auth-clerk-core.js",
    fragment: "function removeClerkRedirectParamsFromUrl(url)",
    message: "OAuth callback cleanup must remove stale Clerk parameters from both query strings and hashes.",
  },
  {
    file: "js/auth-clerk.js",
    fragment: "showMessage(root, clerkErrorMessage(error), \"error\");",
    message: "Auth session-state errors must use the shared Clerk error normalizer.",
  },
];

const failures = [];

for (const file of authClientFiles) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

for (const rule of requiredFragments) {
  const source = readFileSync(rule.file, "utf8");
  if (!source.includes(rule.fragment)) {
    failures.push(`${rule.file}: ${rule.message}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Auth client check passed for ${authClientFiles.length} files.`);
