import assert from "node:assert/strict";

// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import * as authSync from "../functions/auth-sync.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import * as dashboardData from "../functions/dashboard-data.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import * as formSubmit from "../functions/form-submit.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import * as googleContactsStart from "../functions/google-contacts-start.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import * as paymentMethodUpload from "../functions/payment-method-upload.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import * as premiumEmailWorker from "../functions/premium-email-worker.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import * as premiumReceiptUpload from "../functions/premium-receipt-upload.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import * as profileData from "../functions/profile-data.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import * as profileUpload from "../functions/profile-upload.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import * as proposalDownload from "../functions/proposal-download.js";

type Handler = (context?: any) => Promise<Response> | Response;

const checks: Array<{ route: string; handler: Handler; request?: Request; allow: string }> = [
  {
    route: "/auth-sync",
    handler: authSync.onRequest,
    request: new Request("https://franchisee.id/auth-sync", { method: "GET" }),
    allow: "POST",
  },
  { route: "/dashboard-data", handler: dashboardData.onRequestPut, allow: "GET, POST" },
  { route: "/form-submit", handler: formSubmit.onRequestGet, allow: "POST" },
  { route: "/google-contacts-start", handler: googleContactsStart.onRequestGet, allow: "POST" },
  { route: "/payment-method-upload", handler: paymentMethodUpload.onRequestGet, allow: "POST" },
  { route: "/premium-email-worker", handler: premiumEmailWorker.onRequestGet, allow: "" },
  { route: "/premium-receipt-upload", handler: premiumReceiptUpload.onRequestGet, allow: "POST" },
  { route: "/profile-data", handler: profileData.onRequestPut, allow: "GET, POST" },
  { route: "/profile-upload", handler: profileUpload.onRequestGet, allow: "POST" },
  { route: "/proposal-download", handler: proposalDownload.onRequestGet, allow: "" },
];

async function main() {
  for (const check of checks) {
    assert.equal(typeof check.handler, "function", `${check.route} must export a method handler`);
    const response = await check.handler({
      request: check.request || new Request(`https://franchisee.id${check.route}`, { method: "GET" }),
      env: {},
    });
    assert.equal(response.status, 405, `${check.route} should return HTTP 405 for unsupported method`);
    assert.match(response.headers.get("content-type") || "", /application\/json/i, `${check.route} 405 must be JSON`);
    if (check.allow) {
      assert.equal(response.headers.get("allow"), check.allow, `${check.route} must advertise allowed methods`);
    }
    const text = await response.text();
    assert.ok(text.trim().length > 2, `${check.route} 405 must not have an empty body`);
    const payload = JSON.parse(text);
    assert.equal(payload.success, false, `${check.route} 405 payload must be unsuccessful`);
    assert.ok(payload.error || payload.message, `${check.route} 405 payload must explain the failure`);
  }

  console.log(`Pages Functions method check passed for ${checks.length} routes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
