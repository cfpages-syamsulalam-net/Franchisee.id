// /functions/get-franchises.js
import { z } from "zod";

const QuerySchema = z.object({
  tab: z
    .preprocess(
      (value) => (value ? String(value).toUpperCase() : "FRANCHISOR"),
      z.enum(["FRANCHISOR", "UNCLAIMED", "FRANCHISEE"])
    )
    .default("FRANCHISOR"),
  purpose: z.string().trim().max(50).optional().default(""),
  q: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(500).optional().default(500),
  offset: z.coerce.number().int().min(0).optional().default(0),
  source: z.enum(["d1", "sheets"]).optional(),
});

export async function onRequestGet({ request, env }) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = QuerySchema.safeParse({
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
    const useSheets = query.source === "sheets" || (!env.franchise_db && query.source !== "d1");
    const result = useSheets ? await getFranchisesFromSheets(env, query) : await getFranchisesFromD1(env, query);

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
  } catch (err) {
    return jsonResponse(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}

async function getFranchisesFromD1(env, query) {
  if (!env.franchise_db) {
    throw new Error("Data franchise belum tersedia. Silakan coba lagi nanti.");
  }

  const data =
    query.tab === "FRANCHISEE"
      ? await getFranchiseeProfilesFromD1(env.franchise_db, query)
      : await getFranchiseRowsFromD1(env.franchise_db, query);

  return {
    source: "d1",
    data: filterClaimSearchRows(data, query),
  };
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
      f.*,
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

async function getFranchiseeProfilesFromD1(db, query) {
  const where = [];
  const params = [];

  if (query.q) {
    where.push(
      "(LOWER(COALESCE(name, '')) LIKE LOWER(?) OR LOWER(COALESCE(email, '')) LIKE LOWER(?) OR LOWER(COALESCE(whatsapp, '')) LIKE LOWER(?))"
    );
    const like = `%${query.q}%`;
    params.push(like, like, like);
  }

  const sql = `
    SELECT *
    FROM franchisee_profiles
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const result = await db
    .prepare(sql)
    .bind(...params, query.limit, query.offset)
    .all();

  return (result.results || []).map(mapD1FranchiseeProfileRow);
}

function mapD1FranchiseRow(row) {
  const rawPayload = parseRawPayload(row.raw_payload);
  const minCapital = row.min_investment_idr || row.package_min_idr;
  const item = {
    ...rawPayload,
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
    min_capital: rawPayload.min_capital || formatIdr(minCapital),
    min_investment_idr: row.min_investment_idr,
    max_investment_idr: row.max_investment_idr,
    total_investment_idr: row.total_investment_idr,
    full_desc: row.full_desc,
    short_desc: row.short_desc,
    company_name: rawPayload.company_name || row.brand_name,
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

function mapD1FranchiseeProfileRow(row) {
  return {
    ...parseRawPayload(row.raw_payload),
    id: row.legacy_row_id || row.id,
    franchisee_profile_id: row.id,
    name: row.name,
    email: row.email,
    country_code: row.country_code,
    whatsapp: row.whatsapp,
    city: row.city_origin,
    city_origin: row.city_origin,
    interest_category: row.interest_category,
    budget_range: row.budget_range,
    location_plan: row.location_plan,
    message: row.message,
    timestamp: row.legacy_timestamp || row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getFranchisesFromSheets(env, query) {
  const tab = query.tab;

  const token = await getGoogleAuthToken(env.G_CLIENT_EMAIL, env.G_PRIVATE_KEY);
  const spreadsheetId = env.G_SHEET_ID;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tab}!A1:Z1000?valueRenderOption=UNFORMATTED_VALUE`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const errJson = await resp.json();
    throw new Error(`Gagal mengambil data dari Google Sheet: ${errJson.error.message}`);
  }

  const data = await resp.json();
  const rows = data.values;

  if (!rows || rows.length < 2) {
    return {
      source: "sheets",
      data: [],
    };
  }

  const headers = rows[0];
  const rawData = rows.slice(1);
  let franchises = rawData.map((row) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] !== undefined ? row[index] : null;
    });
    return addOptimizedMediaUrls(item);
  });

  if (query.q) {
    const needle = query.q.toLowerCase();
    franchises = franchises.filter((item) =>
      [item.brand_name, item.category, item.full_desc]
        .map((value) => normalizeText(value).toLowerCase())
        .some((value) => value.includes(needle))
    );
  }

  if (query.category) {
    franchises = franchises.filter((item) => normalizeText(item.category).toLowerCase() === query.category.toLowerCase());
  }

  return {
    source: "sheets",
    data: filterClaimSearchRows(franchises, query).slice(query.offset, query.offset + query.limit),
  };
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

function parseRawPayload(rawPayload) {
  if (!rawPayload) return {};
  try {
    const parsed = JSON.parse(rawPayload);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
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
async function getGoogleAuthToken(clientEmail, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));

  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "")
    .replace(/\\n/g, "");

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8", binaryDer.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(encodedHeader + "." + encodedClaim)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const jwt = `${encodedHeader}.${encodedClaim}.${encodedSignature}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}
