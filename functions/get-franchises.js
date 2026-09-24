// /functions/get-franchises.js
import { GetFranchisesQuerySchema } from "./_shared-schemas.js";

export async function onRequestGet({ request, env }) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = GetFranchisesQuerySchema.safeParse({
      tab: searchParams.get("tab") || undefined,
      purpose: searchParams.get("purpose") || undefined,
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      source: searchParams.get("source") || undefined,
    });

    if (!parsedQuery.success) {
      return jsonResponse(
        {
          success: false,
          error: "INVALID_QUERY",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 }
      );
    }

    const query = parsedQuery.data;
    if (query.tab === "FRANCHISEE") {
      return jsonResponse(
        {
          success: false,
          error: "PUBLIC_FRANCHISEE_EXPORT_UNAVAILABLE",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    if (query.source === "sheets") {
      return jsonResponse(
        { success: false, error: "PUBLIC_SHEETS_EXPORT_UNAVAILABLE" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const result = await getFranchisesFromD1(env, query);

    return jsonResponse(
      {
        success: true,
        data: result.data,
        meta: {
          tab: query.tab,
          total: result.data.length,
          source: result.source,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch {
    return jsonResponse(
      { success: false, error: "PUBLIC_DATA_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

async function getFranchisesFromD1(env, query) {
  if (!env.franchise_db) throw new Error("D1 unavailable");
  const data = await getFranchiseRowsFromD1(env.franchise_db, query);
  return { source: "d1", data: filterClaimSearchRows(data, query) };
}

async function getFranchiseRowsFromD1(db, query) {
  const where = [
    "p.site_id = ?",
    "p.publication_status = 'published'",
    "f.source_sheet = ?",
  ];
  const params = ["site_franchisee_id", query.tab];

  if (query.category) {
    where.push("LOWER(COALESCE(f.category, '')) = LOWER(?)");
    params.push(query.category);
  }

  if (query.q) {
    where.push(
      "(LOWER(f.brand_name) LIKE LOWER(?) OR LOWER(COALESCE(f.category, '')) LIKE LOWER(?) OR LOWER(COALESCE(f.full_desc, '')) LIKE LOWER(?))"
    );
    const like = `%${query.q}%`;
    params.push(like, like, like);
  }

  const sql = `
    SELECT
      f.id, f.legacy_row_id, f.slug, f.brand_name, f.category,
        f.subcategory, f.label, f.source_sheet, f.status, f.verification_tier,
        f.min_investment_idr, f.max_investment_idr, f.total_investment_idr,
        f.short_desc, f.full_desc, f.phone, f.office_address, f.logo_url,
        f.cover_url, f.gallery_urls, f.video_url, f.proposal_url, f.source_type,
        f.legacy_timestamp, f.created_at, f.updated_at,
      p.slug AS site_slug,
      p.canonical_url,
      p.publication_status,
      (
        SELECT MIN(COALESCE(fp.min_capital_idr, fp.price_idr))
        FROM franchise_packages fp
        WHERE fp.franchise_id = f.id
          AND fp.is_active = 1
          AND COALESCE(fp.min_capital_idr, fp.price_idr) IS NOT NULL
      ) AS package_min_idr
    FROM franchise_site_publications p
    JOIN franchises f ON f.id = p.franchise_id
    WHERE ${where.join(" AND ")}
    ORDER BY
      CASE f.verification_tier
        WHEN 'premium' THEN 0
        WHEN 'verified' THEN 1
        WHEN 'free' THEN 2
        ELSE 3
      END,
      LOWER(f.brand_name)
    LIMIT ? OFFSET ?
  `;

  const result = await db
    .prepare(sql)
    .bind(...params, query.limit, query.offset)
    .all();

  return (result.results || []).map(mapD1FranchiseRow);
}

function mapD1FranchiseRow(row) {
  const minCapital = row.min_investment_idr || row.package_min_idr;
  const item = {
    id: row.legacy_row_id || row.id,
    franchise_id: row.id,
    slug: row.site_slug || row.slug,
    brand_name: row.brand_name,
    category: row.category,
    subcategory: row.subcategory,
    label: row.label,
    status: row.source_sheet === "UNCLAIMED" ? "UNCLAIMED" : (row.status || "").toString().toUpperCase(),
    verification_tier: row.verification_tier,
    is_verified: row.verification_tier === "verified" || row.verification_tier === "premium" ? "TRUE" : "FALSE",
    min_capital: formatIdr(minCapital),
    min_investment_idr: row.min_investment_idr,
    max_investment_idr: row.max_investment_idr,
    total_investment_idr: row.total_investment_idr,
    full_desc: row.full_desc,
    short_desc: row.short_desc,
    company_name: row.brand_name,
    phone: row.phone,
    office_address: row.office_address,
    logo_url: row.logo_url,
    cover_url: row.cover_url,
    gallery_urls: row.gallery_urls,
    video_url: row.video_url,
    proposal_url: row.proposal_url,
    canonical_url: row.canonical_url,
    source_sheet: row.source_sheet,
    source_type: row.source_type,
    publication_status: row.publication_status,
    timestamp: row.legacy_timestamp || row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  return addOptimizedMediaUrls(item);
}

function addOptimizedMediaUrls(item) {
  if (item.logo_url && item.logo_url.includes("cloudinary.com")) {
    item.logo_url_optimized = item.logo_url.replace("/upload/", "/upload/e_bgremoval,c_pad,w_300,h_300,f_auto,q_auto/");
  } else {
    item.logo_url_optimized = item.logo_url;
  }

  if (item.cover_url && item.cover_url.includes("cloudinary.com")) {
    item.cover_url_optimized = item.cover_url.replace("/upload/", "/upload/c_fill,w_800,h_450,f_auto,q_auto/");
  } else {
    item.cover_url_optimized = item.cover_url;
  }

  return item;
}

function filterClaimSearchRows(franchises, query) {
  if (query.tab !== "UNCLAIMED" || query.purpose !== "claim-search") {
    return franchises;
  }

  const seen = new Set();
  return franchises
    .filter(isLikelyClaimBrandRow)
    .map((item) => ({
      ...item,
      brand_name: normalizeText(item.brand_name),
      category: normalizeText(item.category),
      min_capital: normalizeText(item.min_capital),
    }))
    .filter((item) => {
      const key = item.brand_name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const normalizeText = (value) => (value || "").toString().replace(/\s+/g, " ").trim();
const isUrlLike = (text) => /^(https?:\/\/|www\.)/i.test(normalizeText(text));
const isPhoneLike = (text) => {
  const raw = normalizeText(text);
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 16 && (digits.length / Math.max(raw.length, 1)) > 0.6;
};
const isLegalEntityLike = (text) => /^(pt|cv|ud|pd|yayasan|koperasi|perum|tbk)\b\.?/i.test(normalizeText(text));
const isContactLabelLike = (text) => {
  const raw = normalizeText(text).toLowerCase();
  if (!raw) return false;
  return /\b(call|telp|telepon|whatsapp|wa|marketing|owner|admin|contact|cp|ibu|bpk)\b/.test(raw);
};
const isAddressLike = (text) => {
  const raw = normalizeText(text).toLowerCase();
  if (!raw) return false;
  const hasAddressToken = /\b(jl|jalan|rt|rw|kel|kec|kab|kota|blok|no|nomor|ruko|komplek|km|desa|kav|kavling)\b/.test(raw);
  if (!hasAddressToken) return false;
  const hasDigits = /\d/.test(raw);
  const words = raw.split(/\s+/).filter(Boolean).length;
  return hasDigits || words >= 4;
};
const isLikelyClaimBrandRow = (item) => {
  const brandName = normalizeText(item.brand_name);
  if (!brandName || brandName.length < 2) return false;
  if (!/[a-z]/i.test(brandName)) return false;
  if (isUrlLike(brandName) || isPhoneLike(brandName)) return false;
  if (isLegalEntityLike(brandName) || isContactLabelLike(brandName) || isAddressLike(brandName)) return false;
  const hasEvidence =
    normalizeText(item.source_ignore) ||
    normalizeText(item.full_desc) ||
    normalizeText(item.company_name) ||
    normalizeText(item.phone) ||
    normalizeText(item.label);
  return Boolean(hasEvidence);
};

function formatIdr(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

// --- HELPER AUTH (Sama persis dengan form-submit.js) ---
