import assert from "node:assert/strict";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { onRequestGet } from "../functions/get-franchises.js";

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
    raw_payload: JSON.stringify({ phone: "+62 812 0000 0000" }),
  }];
  const publicDb = {
    prepare() {
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

  console.log("Public franchise privacy checks passed: FRANCHISEE is denied before D1/Sheets; UNCLAIMED claim search remains public.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
