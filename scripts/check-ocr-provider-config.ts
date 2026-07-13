import assert from "node:assert/strict";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { DashboardActionSchema } from "../functions/_dashboard-schemas.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { getOcrProviderConfigs, handleUpdateOcrProviderConfig } from "../functions/_ocr-provider-config.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { credentialAad, credentialLooksEncrypted, decryptCredentialValue, encryptCredentialValue } from "../functions/_ocr-credential-crypto.js";
// @ts-ignore Shared browser/Functions metadata is a JavaScript module.
import { OCR_PROVIDER_METADATA, getOcrProviderRequirementError } from "../src/lib/ocr-provider-metadata.js";

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

const updateBinds: unknown[][] = [];
const updateDb = {
  prepare(sql: string) {
    return {
      bind(...values: unknown[]) {
        if (/UPDATE ocr_provider_configs/i.test(sql)) updateBinds.push(values);
        return {
          async first() {
            return {
              provider_key: "ocr_space",
              display_name: "OCR.Space",
              provider_type: "ocr",
              api_key: "",
              api_secret: "",
              account_id: "",
              endpoint_url: "https://api.ocr.space/parse/image",
              region: "",
              model: "",
              priority: 10,
              is_enabled: 0,
              free_quota_limit: 500,
              free_quota_period: "daily",
              quota_unit: "requests",
              quota_used: 12,
              quota_reset_at: "2026-07-08",
              trial_ends_at: "",
              health_status: "unconfigured",
            };
          },
        };
      },
    };
  },
  async batch(statements: unknown[]) {
    assert.equal(statements.length, 2);
    return [];
  },
};

async function main() {
  const providerKeys = Object.keys(OCR_PROVIDER_METADATA);
  assert.deepEqual(providerKeys.sort(), [
    "api4ai",
    "aws_textract",
    "azure_vision",
    "cloudflare_workers_ai",
    "google_vision",
    "groq_vision",
    "mindee",
    "ocr_space",
    "pdf_co",
    "veryfi",
  ]);
  assert.deepEqual(OCR_PROVIDER_METADATA.aws_textract.fields, ["api_key", "api_secret", "region"]);
  assert.deepEqual(OCR_PROVIDER_METADATA.azure_vision.fields, ["api_key", "endpoint_url"]);
  assert.equal(
    getOcrProviderRequirementError("cloudflare_workers_ai", { apiKeyPresent: true }),
    "Masukkan Cloudflare account ID sebelum mengaktifkan provider ini.",
  );
  assert.equal(
    getOcrProviderRequirementError("aws_textract", { apiKeyPresent: true, apiSecretPresent: true }),
    "Masukkan region sebelum mengaktifkan provider ini.",
  );

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

  const parsedWithoutQuota = DashboardActionSchema.safeParse({
    action: "update_ocr_provider_config",
    provider_key: "ocr_space",
    api_key: secretKey,
    priority: 10,
    is_enabled: false,
  });
  assert.equal(parsedWithoutQuota.success, true);
  await handleUpdateOcrProviderConfig(
    updateDb,
    { id: "user_admin", roles: [{ role: "admin" }] },
    parsedWithoutQuota.success ? parsedWithoutQuota.data : parsed.data,
    { OCR_KEY: "root-key-outside-d1" },
  );
  assert.equal(updateBinds.length, 1);
  assert.equal(updateBinds[0][8], 500, "Update must preserve seeded free quota limit");
  assert.equal(updateBinds[0][9], "daily", "Update must preserve seeded free quota period");
  assert.equal(updateBinds[0][10], "requests", "Update must preserve seeded quota unit");

  const encrypted = await encryptCredentialValue("root-key-outside-d1", secretKey, credentialAad("ocr_space", "api_key"));
  assert.equal(credentialLooksEncrypted(encrypted), true);
  assert.ok(!encrypted.includes(secretKey), "Encrypted credential envelope must not contain plaintext");
  assert.equal(await decryptCredentialValue("root-key-outside-d1", encrypted, credentialAad("ocr_space", "api_key")), secretKey);

  console.log("OCR provider configuration check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
