import assert from "node:assert/strict";
import fs from "node:fs";

const countrySource = fs
  .readFileSync("functions/_country-metadata.js", "utf8")
  .replace(/export /g, "")
  .replace("function formatInternationalPhone(", "function formatInternationalPhoneFromMetadata(");

const helperSource = fs
  .readFileSync("functions/_dashboard-utils.js", "utf8")
  .replace(/^import[\s\S]*?;\n/gm, "")
  .replace(/export /g, "");

const { parsePhoneContacts, parseWhatsAppContacts } = new Function(
  `${countrySource};
   ${helperSource};
   return { parsePhoneContacts, parseWhatsAppContacts };`,
)();

const cases = [
  {
    name: "Taiwan mobile",
    input: "886972940831",
    phones: ["886972940831"],
    whatsapp: ["886972940831"],
  },
  {
    name: "China mobile",
    input: "+86 138 0013 8000",
    phones: ["8613800138000"],
    whatsapp: ["8613800138000"],
  },
  {
    name: "Malaysia mobile",
    input: "+60 12 345 6789",
    phones: ["60123456789"],
    whatsapp: ["60123456789"],
  },
  {
    name: "Singapore mobile",
    input: "+65 9123 4567",
    phones: ["6591234567"],
    whatsapp: ["6591234567"],
  },
  {
    name: "Hong Kong mobile",
    input: "+852 5123 4567",
    phones: ["85251234567"],
    whatsapp: ["85251234567"],
  },
  {
    name: "Vietnam mobile",
    input: "+84 91 234 5678",
    phones: ["84912345678"],
    whatsapp: ["84912345678"],
  },
  {
    name: "Brunei mobile",
    input: "+673 712 3456",
    phones: ["6737123456"],
    whatsapp: ["6737123456"],
  },
  {
    name: "Cambodia mobile",
    input: "+855 12 345 678",
    phones: ["85512345678"],
    whatsapp: ["85512345678"],
  },
  {
    name: "Timor-Leste mobile",
    input: "+670 7721 2345",
    phones: ["67077212345"],
    whatsapp: ["67077212345"],
  },
  {
    name: "Laos mobile",
    input: "+856 20 5555 1234",
    phones: ["8562055551234"],
    whatsapp: ["8562055551234"],
  },
  {
    name: "Myanmar mobile",
    input: "+95 9 123 456 789",
    phones: ["959123456789"],
    whatsapp: ["959123456789"],
  },
  {
    name: "Philippines mobile",
    input: "+63 912 345 6789",
    phones: ["639123456789"],
    whatsapp: ["639123456789"],
  },
  {
    name: "Thailand mobile",
    input: "+66 81 234 5678",
    phones: ["66812345678"],
    whatsapp: ["66812345678"],
  },
  {
    name: "Macau mobile",
    input: "+853 6123 4567",
    phones: ["85361234567"],
    whatsapp: ["85361234567"],
  },
  {
    name: "Japan mobile",
    input: "+81 90 1234 5678",
    phones: ["819012345678"],
    whatsapp: ["819012345678"],
  },
  {
    name: "South Korea mobile",
    input: "+82 10 1234 5678",
    phones: ["821012345678"],
    whatsapp: ["821012345678"],
  },
  {
    name: "India mobile",
    input: "+91 98765 43210",
    phones: ["919876543210"],
    whatsapp: ["919876543210"],
  },
  {
    name: "Bangladesh mobile",
    input: "+880 17 1234 5678",
    phones: ["8801712345678"],
    whatsapp: ["8801712345678"],
  },
  {
    name: "Pakistan mobile",
    input: "+92 301 2345678",
    phones: ["923012345678"],
    whatsapp: ["923012345678"],
  },
  {
    name: "Sri Lanka mobile",
    input: "+94 71 234 5678",
    phones: ["94712345678"],
    whatsapp: ["94712345678"],
  },
  {
    name: "Nepal mobile",
    input: "+977 98 1234 5678",
    phones: ["9779812345678"],
    whatsapp: ["9779812345678"],
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
