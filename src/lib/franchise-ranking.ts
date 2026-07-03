import type { FranchiseStaticRow } from "./franchise-static";
import { normalizeBrandName, normalizeText, normalizeUrl } from "./franchise-text";

export function getRecommendedRows(rows: FranchiseStaticRow[]) {
  return [...rows].sort((a, b) => scoreRecommendation(b) - scoreRecommendation(a) || compareFranchises(a, b));
}

export function getPopularRows(rows: FranchiseStaticRow[]) {
  return [...rows].sort((a, b) => scorePopularity(b) - scorePopularity(a) || compareFranchises(a, b));
}

export function getAlphabeticalRows(rows: FranchiseStaticRow[]) {
  return [...rows].sort((a, b) => normalizeText(a.brand_name).localeCompare(normalizeText(b.brand_name), "id-ID"));
}

export function compareFranchises(a: FranchiseStaticRow, b: FranchiseStaticRow) {
  const diff = tierWeight(b) - tierWeight(a);
  if (diff) return diff;
  return normalizeBrandName(a.brand_name).localeCompare(normalizeBrandName(b.brand_name), "id-ID");
}

function tierWeight(row: FranchiseStaticRow) {
  const tier = normalizeText(row.verification_tier || row.status).toLowerCase();
  if (tier === "premium") return 4;
  if (tier === "verified") return 3;
  if (tier === "free") return 2;
  if (tier === "unclaimed") return 1;
  return 0;
}

export function scoreRecommendation(row: FranchiseStaticRow) {
  const tier = normalizeText(row.verification_tier || row.status).toLowerCase();
  const tierScore = tier === "premium" ? 500 : tier === "verified" ? 420 : tier === "free" ? 300 : 120;
  return tierScore + completenessScore(row);
}

export function scorePopularity(row: FranchiseStaticRow) {
  const knownBrandScore = normalizeUrl(row.logo_url || row.cover_url) ? 80 : 0;
  const investment = row.total_investment_idr || row.min_investment_idr || row.package_price_idr || 0;
  const accessibleInvestmentScore = investment > 0 && investment <= 150_000_000 ? 90 : investment > 0 && investment <= 500_000_000 ? 60 : 20;
  return scoreRecommendation(row) + knownBrandScore + accessibleInvestmentScore;
}

function completenessScore(row: FranchiseStaticRow) {
  let score = 0;
  if (normalizeUrl(row.logo_url)) score += 35;
  if (normalizeUrl(row.cover_url)) score += 25;
  if (normalizeText(row.short_desc || row.full_desc).length > 80) score += 35;
  if (row.total_investment_idr || row.min_investment_idr || row.package_price_idr) score += 35;
  if (normalizeText(row.website_url || row.instagram_url || row.whatsapp)) score += 20;
  return score;
}
