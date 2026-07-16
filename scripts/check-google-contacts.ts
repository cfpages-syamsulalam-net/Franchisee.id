import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { buildGoogleBatchCreatePayload, googleContactHasPhone, googleContactSearchUrl, outreachRowToGoogleContact } from "../functions/_google-contacts.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { GOOGLE_CONTACTS_SCOPE } from "../functions/_google-contacts-oauth.js";

assert.equal(GOOGLE_CONTACTS_SCOPE, "https://www.googleapis.com/auth/contacts");

const contact = outreachRowToGoogleContact({
  id: "fr_123",
  brand_name: "Contoh Franchise",
  category: "Makanan & Minuman",
  public_url: "/peluang-usaha/contoh-franchise",
  contacts: [{ international_digits: "6281234567890" }],
});

assert.equal(contact?.name, "Contoh Franchise");
assert.equal(contact?.phone, "+6281234567890");
assert.equal(contact?.public_url, "https://franchisee.id/peluang-usaha/contoh-franchise");

const payload = buildGoogleBatchCreatePayload([contact!]);
assert.equal(payload.readMask, "names,phoneNumbers");
assert.equal(payload.contacts.length, 1);
assert.equal(payload.contacts[0].contactPerson.names[0].unstructuredName, "Contoh Franchise");
assert.equal(payload.contacts[0].contactPerson.phoneNumbers[0].value, "+6281234567890");
assert.equal(payload.contacts[0].contactPerson.phoneNumbers[0].type, "mobile");
assert.equal(payload.contacts[0].contactPerson.organizations[0].name, "Franchisee.id");
assert.equal(payload.contacts[0].contactPerson.urls[0].value, "https://franchisee.id/peluang-usaha/contoh-franchise");
assert.equal(googleContactHasPhone({ phoneNumbers: [{ canonicalForm: "+62 812-3456-7890" }] }, "+6281234567890"), true);
assert.equal(googleContactHasPhone({ phoneNumbers: [{ value: "0812-3456-7890" }] }, "+6281234567890"), true);
assert.match(googleContactSearchUrl("+6281234567890"), /people:searchContacts\?/);
assert.match(googleContactSearchUrl("+6281234567890"), /readMask=names%2CphoneNumbers/);

const oauthSource = readFileSync("functions/_google-contacts-oauth.js", "utf8");
assert.match(oauthSource, /cleanupGoogleContactsOAuthStates\(db, auth\.id\)/);
assert.match(oauthSource, /consumeGoogleContactsOAuthState\(db, state, "denied"\)/);
assert.match(oauthSource, /consumeGoogleContactsOAuthState\(db, state, "expired", row\)/);
assert.match(oauthSource, /DELETE FROM staff_google_oauth_states/);
assert.match(oauthSource, /dashboard\.google_contacts\.oauth_\$\{reason\}/);

console.log("Google Contacts outreach check passed.");
