import { analyticsScore, loadProductEventCounts } from "./_analytics.js";
import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";
import { normalizeText, textOrNull } from "./_profile-utils.js";

export async function loadFranchiseeRecommendations(db, profile, ownedIds, limit = 6) {
  const result = await db
    .prepare(
      `SELECT f.id, f.brand_name, f.slug, f.category, f.city_origin, f.status, f.verification_tier,
              f.min_investment_idr, f.max_investment_idr, f.total_investment_idr,
              f.estimated_bep_months, f.short_desc, f.logo_url, f.cover_url,
              p.canonical_url, p.publication_status
       FROM franchises f
       INNER JOIN franchise_site_publications p
          ON p.franchise_id = f.id
         AND p.site_id = ?
         AND p.publication_status = 'published'
       ORDER BY f.updated_at DESC, f.brand_name ASC
       LIMIT 220`,
    )
    .bind(SITE_FRANCHISEE_ID)
    .all();

  const rows = result.results || [];
  const eventCounts = await loadProductEventCounts(db, rows.map((row) => row.id));
  return rows
    .filter((row) => !ownedIds.has(row.id))
    .map((row) => {
      const budget = budgetFit(row, profile.budget_range);
      const categoryMatch = matchesInterest(row.category, profile.interest_category);
      const reasons = recommendationReasons(row, profile, budget, categoryMatch);
      const rowEvents = eventCounts.get(row.id) || {};
      return {
        id: row.id,
        brand_name: row.brand_name,
        slug: row.slug,
        category: row.category,
        city_origin: row.city_origin,
        verification_tier: row.verification_tier,
        min_investment_idr: row.min_investment_idr,
        max_investment_idr: row.max_investment_idr,
        total_investment_idr: row.total_investment_idr,
        estimated_bep_months: row.estimated_bep_months,
        short_desc: row.short_desc,
        logo_url: row.logo_url,
        cover_url: row.cover_url,
        canonical_url: row.canonical_url || (row.slug ? `/peluang-usaha/${row.slug}` : ""),
        budget_fit: budget.fit,
        budget_label: budget.label,
        reasons,
        event_counts: rowEvents,
        score: recommendationScore(row, budget, categoryMatch, reasons, rowEvents),
      };
    })
    .sort((a, b) => b.score - a.score || String(a.brand_name || "").localeCompare(String(b.brand_name || "")))
    .slice(0, limit);
}

function recommendationScore(row, budget, categoryMatch, reasons, eventCounts = {}) {
  let score = 0;
  if (categoryMatch) score += 50;
  if (budget.fit === "fit") score += 35;
  if (budget.fit === "near") score += 18;
  if (budget.fit === "unknown") score += 6;
  if (row.verification_tier === "premium") score += 8;
  if (row.verification_tier === "verified") score += 6;
  if (Number(row.estimated_bep_months || 0) > 0 && Number(row.estimated_bep_months) <= 24) score += 5;
  score += Math.min(reasons.length, 3);
  score += Math.min(analyticsScore(eventCounts), 60);
  return score;
}

function recommendationReasons(row, profile, budget, categoryMatch) {
  const reasons = [];
  if (categoryMatch) reasons.push("Sesuai minat kategori");
  if (budget.fit === "fit") reasons.push("Cocok dengan budget Anda");
  if (budget.fit === "near") reasons.push("Dekat dengan budget Anda");
  if (profile.location_plan === "ready") reasons.push("Siap dibandingkan dengan lokasi Anda");
  if (Number(row.estimated_bep_months || 0) > 0) reasons.push(`Estimasi BEP ${row.estimated_bep_months} bulan`);
  if (!reasons.length) reasons.push("Peluang aktif di direktori");
  return reasons.slice(0, 3);
}

function matchesInterest(category, interest) {
  const text = normalizeForMatch(category);
  const aliases = {
    fb: ["fnb", "food", "makanan", "minuman", "restoran", "restaurant", "cafe", "kopi", "teh"],
    retail: ["retail", "minimarket", "toko", "mart", "sembako", "produk"],
    service: ["jasa", "layanan", "service", "laundry", "logistik", "otomotif", "travel"],
    edu: ["pendidikan", "kursus", "edukasi", "education", "training", "belajar", "sekolah"],
    beauty: ["kecantikan", "kesehatan", "beauty", "health", "salon", "spa", "aesthetic"],
  };
  const keys = aliases[normalizeForMatch(interest)] || [];
  return keys.some((key) => text.includes(key));
}

function budgetFit(row, budgetRange) {
  if (!textOrNull(budgetRange)) return { fit: "unknown", label: "Budget belum diisi" };
  const range = parseBudgetRange(budgetRange);
  const amount = Number(row.min_investment_idr || row.total_investment_idr || row.max_investment_idr || 0);
  if (!amount) return { fit: "unknown", label: "Budget belum tersedia" };
  if (!range.max && range.min) {
    return amount >= range.min ? { fit: "fit", label: "Sesuai budget" } : { fit: "fit", label: "Di bawah budget" };
  }
  if (range.max && amount <= range.max) return { fit: "fit", label: "Sesuai budget" };
  if (range.max && amount <= Math.round(range.max * 1.25)) return { fit: "near", label: "Sedikit di atas budget" };
  return { fit: "over", label: "Di atas budget" };
}

function parseBudgetRange(value) {
  const text = normalizeForMatch(value);
  if (text.includes("<50")) return { min: 0, max: 50000000 };
  if (text.includes("50-100")) return { min: 50000000, max: 100000000 };
  if (text.includes("100-500")) return { min: 100000000, max: 500000000 };
  if (text.includes(">500")) return { min: 500000000, max: null };
  return { min: 0, max: null };
}

function normalizeForMatch(value) {
  return normalizeText(value).toLowerCase().replace(/&/g, "and");
}
