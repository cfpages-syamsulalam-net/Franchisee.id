import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

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
    fragment: "if (targetUrl.origin !== window.location.origin)",
    message: "OAuth callbacks must not navigate to a cross origin target.",
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

function checkAuthNextTargets() {
  const storage = new Map();
  const authWindow = {
    location: {
      href: "https://example.test/login",
      origin: "https://example.test",
      pathname: "/login",
      search: "?next=%2F%2Fevil.test",
      hash: "",
    },
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    history: {},
    FranchiseAuthDebug: { create: () => new Proxy({}, { get: () => () => ({}) }) },
    FranchiseFetch: { readJson() {} },
  };
  runInNewContext(readFileSync("js/auth-clerk-core.js", "utf8"), {
    window: authWindow,
    document: {},
    URL,
    URLSearchParams,
    console,
    fetch() {},
  });
  const auth = authWindow.FranchiseAuthCore.create({});
  const root = (next, variant = "member") => ({
    getAttribute(name) {
      return name === "data-auth-next" ? next : name === "data-auth-variant" ? variant : null;
    },
  });
  assert.equal(auth.nextUrl(root(null)), "/profil/");
  assert.equal(auth.nextUrl(root("//evil.test/path")), "/profil/");
  assert.equal(auth.nextUrl(root("/\\\\evil.test/path")), "/profil/");
  auth.setPendingNext("//evil.test/path");
  assert.equal(auth.getPendingNext(), "");
  auth.setPendingNext("/dashboard");
  assert.equal(auth.getPendingNext(), "/dashboard");
  authWindow.location.search = "?next=%2Fdashboard%3Ftab%3Dusers";
  assert.equal(auth.nextUrl(root(null)), "/dashboard?tab=users");
}

checkAuthNextTargets();

const failures = [];
const webhookBody = readFileSync("functions/_clerk-auth.js", "utf8")
  .split("export async function syncWebhookUserToD1(")[1]?.split("\n}")[0];
if (!webhookBody || webhookBody.includes("syncClerkMetadataFromD1(")) {
  failures.push("Inbound Clerk webhook must not write metadata back and recursively emit user.updated.");
}

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
