import assert from "node:assert/strict";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { extractProposalCandidatesFromText } from "../functions/_proposal-knowledge.js";

const candidates = extractProposalCandidatesFromText(`
  Konsep outlet: Booth dan gerobak modern
  Luas minimal: 3 x 4 m2 dekat area ramai
  Total investasi: Rp 85 juta
  Franchise fee: Rp 10 juta
  Estimasi BEP: 12 bulan
  Royalty fee: 5%
  Laba bersih: 22,5%
  Dukungan mitra: training, SOP, bahan baku, dan pendampingan pembukaan
`);

assert.equal(candidates.outlet_type, "Booth dan gerobak modern");
assert.match(String(candidates.location_requirement), /3 x 4 m2/i);
assert.equal(candidates.total_investment_idr, 85_000_000);
assert.equal(candidates.fee_license_idr, 10_000_000);
assert.equal(candidates.estimated_bep_months, 12);
assert.equal(candidates.royalty_percent, 5);
assert.equal(candidates.net_profit_percent, 22.5);
assert.match(String(candidates.support_system), /training/i);

console.log("Proposal knowledge extraction check passed.");
