import assert from "node:assert/strict";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { DashboardActionSchema } from "../functions/_dashboard-schemas.js";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { getOcrProviderConfigs } from "../functions/_ocr-provider-config.js";

const secretKey = "ocr-secret-key-value";
const secretSecondary = "ocr-secret-secondary-value";
const row = {
  provider_key: "ocr_space",
  display_name: "OCR.Space",
  provider_type: "ocr",
  has_api_key: 1,
  has_api_secret: 1,
  account_id: "",
  endpoint_url: "https://api.ocr.space/parse/image",
  region: "",
  model: "",
  priority: 10,
  is_enabled: 1,
  free_quota_limit: 500,
  free_quota_period: "daily",
  quota_unit: "requests",
  quota_used: 0,
  health_status: "ready",
};

const db = {
  prepare(sql: string) {
    assert.match(sql, /AS has_api_key/i);
    assert.ok(!/\n\s*api_key\s*,/i.test(sql), "Dashboard read query must not select the stored API key value");
    return {
      async all() {
        return { results: [row] };
      },
    };
  },
};

async function main() {
  const payload = await getOcrProviderConfigs(db, { roles: [{ role: "admin" }] });
  assert.equal(payload.providers.length, 1);
  assert.equal(payload.providers[0].has_api_key, true);
  assert.equal(payload.providers[0].has_api_secret, true);
  assert.equal("api_key" in payload.providers[0], false);
  assert.equal("api_secret" in payload.providers[0], false);
  assert.ok(!JSON.stringify(payload).includes(secretKey));
  assert.ok(!JSON.stringify(payload).includes(secretSecondary));

  const parsed = DashboardActionSchema.safeParse({
    action: "update_ocr_provider_config",
    provider_key: "ocr_space",
    api_key: secretKey,
    api_secret: secretSecondary,
    endpoint_url: "https://api.ocr.space/parse/image",
    priority: 10,
    is_enabled: true,
    free_quota_limit: 500,
    free_quota_period: "daily",
    quota_unit: "requests",
  });
  assert.equal(parsed.success, true);

  console.log("OCR provider configuration check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
