import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { onRequestGet } from "../functions/get-franchises.js";
import { D1FranchiseRowSchema } from "../src/lib/shared-schemas";

const request = (query: string) => new Request(`https://franchisee.id/get-franchises?${query}`);

async function run() {
  let databaseTouched = false;
  let networkTouched = false;
  const guardedEnv = {
    franchise_db: {
      prepare() {
        databaseTouched = true;
        throw new Error("database must not be queried");
      },
    },
    G_CLIENT_EMAIL: "unused",
    G_PRIVATE_KEY: "unused",
    G_SHEET_ID: "unused",
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    networkTouched = true;
    throw new Error("network must not be called");
  };

  try {
    for (const source of ["d1", "sheets"]) {
      const response = await onRequestGet({
        request: request(`tab=FRANCHISEE&source=${source}`),
        env: guardedEnv,
      });
      assert.equal(response.status, 403, `anonymous ${source} FRANCHISEE export must be denied`);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal((await response.json()).error, "PUBLIC_FRANCHISEE_EXPORT_UNAVAILABLE");
    }
    assert.equal(databaseTouched, false, "denied FRANCHISEE requests must not touch D1");
    assert.equal(networkTouched, false, "denied FRANCHISEE requests must not touch Sheets");
    const sheetsResponse = await onRequestGet({
      request: request("tab=FRANCHISOR&source=sheets"), env: guardedEnv,
    });
    assert.equal(sheetsResponse.status, 403);
    assert.equal(sheetsResponse.headers.get("cache-control"), "no-store");
    assert.equal((await sheetsResponse.json()).error, "PUBLIC_SHEETS_EXPORT_UNAVAILABLE");
    assert.equal(databaseTouched, false);
    assert.equal(networkTouched, false);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const rows = [{
    id: "public-1",
    legacy_row_id: "legacy-1",
    slug: "kopi-maju",
    brand_name: "Kopi Maju",
    category: "Makanan & Minuman",
    source_sheet: "UNCLAIMED",
    status: "unclaimed",
    raw_payload: JSON.stringify({ nib_number: "SECRET_NIB", haki_number: "SECRET_HAKI", pic_name: "SECRET_PIC" }),
    secret_column: "SECRET_COLUMN",
  }];
  const publicDb = {
    prepare(sql: string) {
      assert(!sql.includes("f.*"), "SQL must select explicit public columns");
      assert(!sql.includes("raw_payload"), "private payload must not be selected");
      return {
        bind() {
          return { all: async () => ({ results: rows }) };
        },
      };
    },
  };
  const publicResponse = await onRequestGet({
    request: request("tab=UNCLAIMED&purpose=claim-search&source=d1&q=kopi"),
    env: { franchise_db: publicDb },
  });
  assert.equal(publicResponse.status, 200);
  const publicBody = await publicResponse.json();
  assert.equal(publicBody.success, true);
  assert.equal(publicBody.data[0].brand_name, "Kopi Maju");
  assert.equal(publicBody.data[0].source_sheet, "UNCLAIMED");

  const snapshotRow = D1FranchiseRowSchema.parse({
    id: "public-1", slug: "kopi-maju", brand_name: "Kopi Maju", raw_payload: "SECRET_NIB",
  });
  assert(!("raw_payload" in snapshotRow), "static listing schema must strip private payload");
  const snapshot = JSON.parse(readFileSync("json/d1-franchise-static-data.json", "utf8")) as Array<Record<string, unknown>>;
  assert(snapshot.every((row) => !["raw_payload", "nib_number", "haki_number"].some((field) => field in row)),
    "checked-in static listing snapshot must exclude private payload and legal identifiers");
  const publicJson = JSON.stringify(publicBody.data);
  for (const secret of ["SECRET_NIB", "SECRET_HAKI", "SECRET_PIC", "SECRET_COLUMN", "raw_payload", "nib_number", "haki_number", "pic_name"]) {
    assert(!publicJson.includes(secret), `public response exposed ${secret}`);
  }
  assert.equal(publicBody.data[0].id, "legacy-1");
  assert.equal(publicBody.data[0].franchise_id, "public-1");
  const unavailable = await onRequestGet({ request: request("tab=FRANCHISOR&source=d1"), env: {} });
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error, "PUBLIC_DATA_UNAVAILABLE");

  console.log("Public franchise privacy checks passed: FRANCHISEE/Sheets exports denied; UNCLAIMED claim search excludes private fields.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
