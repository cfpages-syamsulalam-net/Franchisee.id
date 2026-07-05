import assert from "node:assert/strict";
import fs from "node:fs";

const helperSource = fs
  .readFileSync("functions/_dashboard-utils.js", "utf8")
  .replace(/^import[^\n]+\n/gm, "")
  .replace(/export /g, "");

const { parsePhoneContacts, parseWhatsAppContacts } = new Function(
  `${helperSource}; return { parsePhoneContacts, parseWhatsAppContacts };`,
)();

const cases = [
  {
    name: "Taiwan mobile",
    input: "886972940831",
    phones: ["886972940831"],
    whatsapp: ["886972940831"],
  },
  {
    name: "two Indonesian mobile numbers",
    input: "0851-8455-0162 0812-8441-5836",
    phones: ["6285184550162", "6281284415836"],
    whatsapp: ["6285184550162", "6281284415836"],
  },
  {
    name: "space-grouped mobile pair",
    input: "0813 2386 0556 0812 8420 3032",
    phones: ["6281323860556", "6281284203032"],
    whatsapp: ["6281323860556", "6281284203032"],
  },
  {
    name: "hyphenated mobile pair with zero-prefixed middle groups",
    input: "0878-0937-1485 0878-0837-1485",
    phones: ["6287809371485", "6287808371485"],
    whatsapp: ["6287809371485", "6287808371485"],
  },
  {
    name: "landline",
    input: "(021) 2927 8888",
    phones: ["622129278888"],
    whatsapp: [],
  },
  {
    name: "call center",
    input: "Call Center : 1500 612",
    phones: ["1500612"],
    whatsapp: [],
  },
];

for (const item of cases) {
  assert.deepEqual(
    parsePhoneContacts(item.input).map((contact) => contact.international_digits),
    item.phones,
    `${item.name}: phone contacts`,
  );
  assert.deepEqual(
    parseWhatsAppContacts(item.input).map((contact) => contact.international_digits),
    item.whatsapp,
    `${item.name}: WhatsApp contacts`,
  );
}

console.log(`Contact parser checks passed (${cases.length} cases).`);
