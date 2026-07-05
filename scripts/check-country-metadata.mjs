import assert from "node:assert/strict";
import fs from "node:fs";

const source = JSON.parse(fs.readFileSync("data/country-metadata.json", "utf8"));
const publicCopy = JSON.parse(fs.readFileSync("json/country-metadata.json", "utf8"));
const functionsAdapter = fs.readFileSync("functions/_country-metadata.js", "utf8");
const staticAdapter = fs.readFileSync("src/lib/country-metadata.ts", "utf8");

assert.deepEqual(publicCopy, source, "json/country-metadata.json must match data/country-metadata.json");

for (const country of source) {
  assert.equal(typeof country.name, "string", `${country.name}: name`);
  assert.match(country.dialCode, /^\+\d+$/, `${country.name}: dialCode`);
  assert.match(country.iso2, /^[A-Z]{2}$/, `${country.name}: iso2`);
  assert.equal(typeof country.flag, "string", `${country.name}: flag`);
  assert.equal(country.whatsappDigits.length, 2, `${country.name}: whatsappDigits`);
  assert.ok(country.whatsappDigits[0] <= country.whatsappDigits[1], `${country.name}: whatsapp digit range`);
  assert.doesNotThrow(() => new RegExp(`^${country.internationalMobilePattern}$`), `${country.name}: mobile regex`);
  assert.ok(functionsAdapter.includes(`name: "${country.name}"`), `${country.name}: missing from Functions adapter`);
  assert.ok(functionsAdapter.includes(`dialCode: "${country.dialCode}"`), `${country.name}: dial code missing from Functions adapter`);
  assert.ok(staticAdapter.includes(`name: "${country.name}"`), `${country.name}: missing from static adapter`);
  assert.ok(staticAdapter.includes(`dialCode: "${country.dialCode}"`), `${country.name}: dial code missing from static adapter`);
}

console.log(`Country metadata checks passed (${source.length} countries).`);
