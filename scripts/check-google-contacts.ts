import assert from "node:assert/strict";
import { buildGoogleBatchCreatePayload, filterExistingGoogleContacts, googleContactHasPhone, googleContactsConnectionUrl, outreachRowToGoogleContact } from "../functions/_google-contacts.js";
import { completeGoogleContactsAuthorization, GOOGLE_CONTACTS_SCOPE } from "../functions/_google-contacts-oauth.js";

assert.equal(GOOGLE_CONTACTS_SCOPE, "https://www.googleapis.com/auth/contacts");
const contact = outreachRowToGoogleContact({ id: "fr_123", brand_name: "Contoh Franchise", category: "Makanan & Minuman", public_url: "/peluang-usaha/contoh-franchise", contacts: [{ international_digits: "6281234567890" }] });
assert.equal(contact?.name, "Contoh Franchise");
assert.equal(contact?.phone, "+6281234567890");
assert.equal(contact?.public_url, "https://franchisee.id/peluang-usaha/contoh-franchise");
const payload = buildGoogleBatchCreatePayload([contact!]);
assert.equal(payload.readMask, "names,phoneNumbers");
assert.equal(payload.contacts[0].contactPerson.names[0].unstructuredName, "Contoh Franchise");
assert.equal(payload.contacts[0].contactPerson.phoneNumbers[0].value, "+6281234567890");
assert.equal(payload.contacts[0].contactPerson.phoneNumbers[0].type, "mobile");
assert.equal(payload.contacts[0].contactPerson.organizations[0].name, "Franchisee.id");
assert.equal(payload.contacts[0].contactPerson.urls[0].value, "https://franchisee.id/peluang-usaha/contoh-franchise");
assert.equal(googleContactHasPhone({ phoneNumbers: [{ canonicalForm: "+62 812-3456-7890" }] }, "+6281234567890"), true);
assert.equal(googleContactHasPhone({ phoneNumbers: [{ value: "0812-3456-7890" }] }, "+6281234567890"), true);
assert.match(googleContactsConnectionUrl(), /people\/me\/connections\?/);
assert.match(googleContactsConnectionUrl("next"), /personFields=phoneNumbers.*pageSize=1000.*sources=READ_SOURCE_TYPE_CONTACT.*pageToken=next/);

import { encryptCredentialValue, decryptCredentialValue } from "../functions/_ocr-credential-crypto.js";

class MockDb {
  state: any;
  connection: any;
  roles: string[];
  active = true;
  writes: any[] = [];
  constructor(state: any, connection: any = null, roles = ["staff"]) {
    this.state = { ...state }; this.connection = connection; this.roles = roles;
  }
  prepare(sql: string) {
    const db = this;
    return { bind(...args: any[]) { return {
      sql, args,
      async first() {
        if (sql.includes("FROM staff_google_oauth_states") && sql.includes("consumed_at IS NULL")) return db.state.state === args[0] && !db.state.consumed_at ? { ...db.state, d1_user_id: db.state.user_id } : null;
        if (sql.startsWith("UPDATE staff_google_oauth_states")) {
          if (db.state.state !== args[0] || db.state.consumed_at || db.state.expires_at !== args[1] || db.state.expires_at <= args[2]) return null;
          db.state.consumed_at = "now"; return { ...db.state };
        }
        if (sql.includes("FROM staff_google_connections")) return db.connection;
        return null;
      },
      async all() { return sql.includes("FROM users u") ? { results: db.roles.map(role => ({ status: db.active ? "active" : "disabled", role })) } : { results: [] }; },
      async run() { if (sql.includes("UPDATE staff_google_oauth_states")) db.state.consumed_at = "now"; return { meta: { changes: 1 } }; },
    }; } };
  }
  async batch(statements: any[]) {
    for (const statement of statements) {
      if (statement.sql.includes("INSERT INTO staff_google_connections")) {
        this.writes.push(statement.args);
        this.connection = { google_sub: statement.args[3], refresh_token_encrypted: statement.args[6] };
      }
      await statement.run();
    }
    return { success: true };
  }
}

const state = () => ({ state: "gco_state", user_id: "user_1", expires_at: new Date(Date.now() + 60_000).toISOString(), return_path: "/dashboard/#outreach", consumed_at: null });
const env = { GOOGLE_CONTACTS_CLIENT_ID: "client", GOOGLE_CONTACTS_CLIENT_SECRET: "secret", GOOGLE_CONTACTS_TOKEN_KEY: "test-key" };
const request = (suffix = "&code=code") => new Request("https://franchisee.id/google-contacts-callback?state=gco_state" + suffix);
const aad = "staff_google_connections:user_1:refresh_token";

async function checkBulkDuplicateLookup() {
  const originalFetch = globalThis.fetch;
  const contacts = Array.from({ length: 200 }, (_, index) => ({
    franchise_id: `fr_${index}`,
    phone: `+62812${String(index).padStart(8, "0")}`,
  }));
  const urls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    urls.push(String(input));
    if (urls.length > 50) throw new Error("Too many subrequests in one contact save");
    const next = new URL(String(input)).searchParams.get("pageToken");
    const body = next
      ? { connections: [{ phoneNumbers: [{ value: "0812-0000-0001" }] }] }
      : { connections: [{ phoneNumbers: [{ canonicalForm: contacts[0].phone }] }], nextPageToken: "next" };
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  try {
    const result = await filterExistingGoogleContacts("token", contacts);
    if (!result.ok || !("contacts" in result) || !("duplicate_skipped" in result)) throw new Error("Expected successful Google Contacts lookup");
    assert.equal(result.ok, true);
    assert.equal(result.duplicate_skipped, 2);
    assert.equal(result.contacts.length, 198);
    assert.equal(urls.length, 2);
    assert.ok(urls.every((url) => url.includes("people/me/connections")));

    globalThis.fetch = (async () => new Response("not-json", { status: 200 })) as typeof fetch;
    const malformed = await filterExistingGoogleContacts("token", contacts);
    assert.equal(malformed.error, "GOOGLE_CONTACTS_INVALID_RESPONSE");

    let pages = 0;
    globalThis.fetch = (async () => {
      pages++;
      return new Response(JSON.stringify({ connections: [], nextPageToken: `page_${pages}` }), { status: 200 });
    }) as typeof fetch;
    const oversized = await filterExistingGoogleContacts("token", contacts);
    assert.equal(oversized.error, "GOOGLE_CONTACTS_LIST_TOO_LARGE");
    assert.equal(pages, 10);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function main() {
  await checkBulkDuplicateLookup();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let subject = "google-b";
  let refresh = "";
  const provider = async (input: RequestInfo | URL) => {
    calls++;
    return String(input).includes("oauth2.googleapis.com/token")
      ? new Response(JSON.stringify({ access_token: "access", refresh_token: refresh, scope: GOOGLE_CONTACTS_SCOPE, expires_in: 3600 }), { status: 200 })
      : new Response(JSON.stringify({ sub: subject, email: "fixture@example.test" }), { status: 200 });
  };
  globalThis.fetch = provider as typeof fetch;
  const saved = await encryptCredentialValue(env.GOOGLE_CONTACTS_TOKEN_KEY, "old-refresh-a", aad);
  const old = () => ({ id: "connection", google_sub: "google-a", refresh_token_encrypted: saved, revoked_at: null });
  const callback = (db: MockDb, suffix?: string) => completeGoogleContactsAuthorization(db as any, request(suffix), env);
  try {
    const switched = new MockDb(state(), old());
    assert.match((await callback(switched)).headers.get("Location")!, /google_contacts=failed/);
    assert.equal(switched.writes.length, 0, "account switch must not overwrite stored identity");
    assert.equal(switched.connection.google_sub, "google-a");
    assert.equal(switched.connection.refresh_token_encrypted, saved);

    subject = "google-a";
    const same = new MockDb(state(), old());
    assert.match((await callback(same)).headers.get("Location")!, /google_contacts=connected/);
    assert.equal(same.writes.length, 1);
    assert.equal(same.connection.google_sub, "google-a");
    assert.equal(await decryptCredentialValue(env.GOOGLE_CONTACTS_TOKEN_KEY, same.connection.refresh_token_encrypted, aad), "old-refresh-a");

    subject = "google-b"; refresh = "fresh-refresh-b";
    const rotated = new MockDb(state(), old());
    assert.match((await callback(rotated)).headers.get("Location")!, /google_contacts=connected/);
    assert.equal(rotated.connection.google_sub, "google-b");
    assert.equal(await decryptCredentialValue(env.GOOGLE_CONTACTS_TOKEN_KEY, rotated.connection.refresh_token_encrypted, aad), "fresh-refresh-b");

    subject = "google-a"; refresh = "";
    const revoked = new MockDb(state(), { ...old(), revoked_at: "2026-01-01" });
    assert.match((await callback(revoked)).headers.get("Location")!, /google_contacts=failed/);
    assert.equal(revoked.writes.length, 0);

    for (const [roles, active] of [[['franchisee'], true], [['staff'], false]] as [string[], boolean][]) {
      const denied = new MockDb(state(), null, roles); denied.active = active;
      const before = calls;
      assert.match((await callback(denied)).headers.get("Location")!, /google_contacts=forbidden/);
      assert.equal(calls, before, "no provider call after permission revocation");
      assert.equal(denied.writes.length, 0);
    }
    for (const expires_at of ["not-a-date", new Date(Date.now() - 1000).toISOString()]) {
      const before = calls;
      assert.match((await callback(new MockDb({ ...state(), expires_at }))).headers.get("Location")!, /google_contacts=expired/);
      assert.equal(calls, before);
    }
    const cancelled = new MockDb(state()); const beforeDenial = calls;
    assert.match((await callback(cancelled, "&error=access_denied")).headers.get("Location")!, /google_contacts=denied/);
    assert.equal(cancelled.state.consumed_at, "now"); assert.equal(calls, beforeDenial);

    subject = ""; refresh = "fresh";
    const missingSubject = new MockDb(state());
    assert.match((await callback(missingSubject)).headers.get("Location")!, /google_contacts=failed/);
    assert.equal(missingSubject.writes.length, 0);

    subject = "google-a";
    const concurrent = new MockDb(state()); const beforeConcurrent = calls;
    const responses = await Promise.all([callback(concurrent), callback(concurrent)]);
    assert.equal(responses.filter(r => r.headers.get("Location")!.includes("=connected")).length, 1);
    assert.equal(responses.filter(r => r.headers.get("Location")!.includes("=expired")).length, 1);
    assert.equal(concurrent.writes.length, 1); assert.equal(calls - beforeConcurrent, 2);
    const beforeReplay = calls;
    assert.match((await callback(concurrent)).headers.get("Location")!, /google_contacts=expired/);
    assert.equal(calls, beforeReplay);
    console.log("Google Contacts bulk lookup, payload, identity persistence, revocation and concurrent-state checks passed.");
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
