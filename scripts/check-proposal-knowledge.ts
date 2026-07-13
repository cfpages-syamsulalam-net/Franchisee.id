import assert from "node:assert/strict";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { extractProposalCandidatesFromText, sanitizeProposalSourceText } from "../functions/_proposal-knowledge.js";

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

const expandedCandidates = extractProposalCandidatesFromText(`
  Luas minimal: 3 x 5 m2
  Karyawan: 2 orang
  Setup outlet: 2 minggu
  Modal kerja: Rp 7,5 juta
  Masa kontrak kemitraan: 5 tahun
  Omzet per bulan: Rp 60 juta
  Profit bersih per bulan: Rp 12 juta
  HPP: 35%
  Royalty fee: 0% dari omzet per bulan
  Target market: keluarga muda dan pekerja kantor
  Benefit mitra: SOP, training, marketing support, dan bahan baku awal
`);

assert.equal(expandedCandidates.min_area_sqm, 15);
assert.equal(expandedCandidates.min_staff_count, 2);
assert.equal(expandedCandidates.setup_duration_days, 14);
assert.equal(expandedCandidates.working_capital_idr, 7_500_000);
assert.equal(expandedCandidates.contract_duration_months, 60);
assert.equal(expandedCandidates.omzet_monthly_idr, 60_000_000);
assert.equal(expandedCandidates.net_profit_monthly_min_idr, 12_000_000);
assert.equal(expandedCandidates.hpp_percent, 35);
assert.equal(expandedCandidates.royalty_percent, 0);
assert.equal(expandedCandidates.royalty_basis, "omzet");
assert.equal(expandedCandidates.royalty_period, "bulanan");
assert.match(String(expandedCandidates.target_market), /keluarga muda/i);
assert.match(String(expandedCandidates.support_system), /marketing support/i);

const partnershipFeeCandidates = extractProposalCandidatesFromText(`
  TABEL PERBANDINGAN TOPCOAT VS BRAND LAIN
  Biaya Kemitraan 119 Juta
  Investasi Kemitraan Rp. 119.000.000
  Biaya Renovasi Rp. 40.000.000
`);
assert.equal(partnershipFeeCandidates.fee_license_idr, 119_000_000);
assert.equal(partnershipFeeCandidates.fee_construction_idr, 40_000_000);
assert.equal(partnershipFeeCandidates.total_investment_idr, undefined);

const explicitTotalCandidates = extractProposalCandidatesFromText(`
  Biaya Kemitraan Rp 119 juta
  Biaya Renovasi Rp 40 juta
  Total Biaya Investasi: Rp 249 juta
`);
assert.equal(explicitTotalCandidates.fee_license_idr, 119_000_000);
assert.equal(explicitTotalCandidates.total_investment_idr, 249_000_000);

const marker = String.fromCharCode(119, 97, 114, 97, 108, 97, 98, 97, 107, 117);
const sanitized = sanitizeProposalSourceText(`Brand facts\nwww.${marker}.com/source\nInvestasi: Rp 25 juta`);
assert.doesNotMatch(sanitized.toLowerCase(), new RegExp(marker));
assert.match(sanitized, /Investasi/i);

console.log("Proposal knowledge extraction check passed.");
