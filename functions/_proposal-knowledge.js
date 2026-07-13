import { extractText, getDocumentProxy } from "unpdf";

const MAX_STORED_TEXT_CHARS = 60_000;
const SOURCE_NOISE_MARKERS = [String.fromCharCode(119, 97, 114, 97, 108, 97, 98, 97, 107, 117)];

export async function extractProposalKnowledge(arrayBuffer, listing) {
  const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
  const result = await extractText(pdf, { mergePages: true });
  const sourceText = sanitizeProposalSourceText(result.text).slice(0, MAX_STORED_TEXT_CHARS);

  if (sourceText.length < 80) {
    return {
      status: "needs_ocr",
      method: "unpdf_text_v1",
      sourceText,
      pageCount: Number(result.totalPages || 0),
      candidates: {},
    };
  }

  const candidates = onlyMissingCandidates(extractProposalCandidatesFromText(sourceText), listing);
  return {
    status: "extracted",
    method: "unpdf_text_v1",
    sourceText,
    pageCount: Number(result.totalPages || 0),
    candidates,
  };
}

export function proposalKnowledgeStatements(db, input) {
  const knowledgeId = `knowledge_${randomId()}`;
  const sourceText = sanitizeProposalSourceText(input.result.sourceText || "").slice(0, MAX_STORED_TEXT_CHARS);
  const candidates = input.result.candidates || extractProposalCandidatesFromText(sourceText);
  const statements = [
    db
      .prepare(
        `INSERT INTO franchise_asset_knowledge (
           id, asset_id, franchise_id, extraction_method, extraction_status,
           source_text, structured_data, page_count, error_message
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(asset_id) DO UPDATE SET
           extraction_method = excluded.extraction_method,
           extraction_status = excluded.extraction_status,
           source_text = excluded.source_text,
           structured_data = excluded.structured_data,
           page_count = excluded.page_count,
           error_message = excluded.error_message,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        knowledgeId,
        input.assetId,
        input.listing.id,
        input.result.method,
        input.result.status,
        sourceText || null,
        JSON.stringify(candidates),
        input.result.pageCount || null,
        input.result.errorMessage || null,
      ),
  ];

  const fields = Object.keys(candidates);
  if (fields.length && input.actorUserId) {
    statements.push(
      db
        .prepare(
          `INSERT INTO listing_edit_suggestions (
             id, franchise_id, site_id, suggested_by_user_id, status, field_name,
             old_value, suggested_value, reason
           ) VALUES (?, ?, ?, ?, 'pending', 'proposal_extraction', ?, ?, ?)`,
        )
        .bind(
          `suggestion_${randomId()}`,
          input.listing.id,
          input.siteId,
          input.actorUserId,
          JSON.stringify(pickValues(input.listing, fields)),
          JSON.stringify(candidates),
          "Kandidat fakta diekstrak otomatis dari proposal. Tinjau terhadap dokumen sebelum menyetujui.",
        ),
    );
  }

  return statements;
}

export function extractProposalCandidatesFromText(text) {
  const normalizedText = sanitizeProposalSourceText(text);
  const candidates = {};
  const outlet = normalizedText.match(/\b(?:tipe|jenis|konsep|format)\s+(?:usaha|outlet|gerai)\s*[:\-]?\s*([^\n.]{3,100})/i)
    || normalizedText.match(/\b(gerobak|booth|kios|kiosk|ruko|restoran|dine[ -]?in|cloud kitchen|food truck|counter|barbershop|studio|center)\b/i);
  if (outlet) candidates.outlet_type = cleanCandidate(outlet[1] || outlet[0], 120);

  const location = normalizedText.match(/\b(?:luas|ukuran|area)\s+(?:minimal|min(?:imum)?|outlet|lokasi|tempat)?\s*[:\-]?\s*([^\n.]{1,100}?\b\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?m(?:2|²|eter)?\b[^\n.]*)/i)
    || normalizedText.match(/\b(?:lokasi|tempat|bangunan|ruangan)\s+(?:yang\s+)?(?:dibutuhkan|disarankan|ideal|strategis|ramai)\s*[:\-]?\s*([^\n.]{3,180})/i);
  if (location) candidates.location_requirement = cleanCandidate(location[1], 240);

  const areaSqm = extractAreaSqm(normalizedText);
  if (areaSqm) candidates.min_area_sqm = areaSqm;

  const staff = normalizedText.match(/\b(?:minimal|min(?:imum)?|kebutuhan|jumlah)?\s*(?:staff|staf|karyawan|crew|pegawai|terapis|barber)\s*[:\-]?\s*(\d{1,2})\s*(?:orang|staff|staf|karyawan|crew|pegawai)?/i);
  if (staff) candidates.min_staff_count = Number(staff[1]);

  const setup = normalizedText.match(/\b(?:setup|set\s*up|persiapan|opening|grand\s+opening|pembukaan)\s*(?:outlet|gerai|toko|cabang)?\s*[:\-]?\s*(?:sekitar|estimasi|maks(?:imal)?|selama)?\s*(\d{1,3})\s*(hari|minggu|bulan)/i);
  if (setup) candidates.setup_duration_days = durationToDays(setup[1], setup[2]);

  addMoneyRangeCandidate(candidates, "min_investment_idr", "max_investment_idr", normalizedText, [
    /\b(?:total\s+)?(?:investasi|modal\s+(?:usaha|awal)?|paket\s+(?:usaha|investasi)?)\s*[:\-]?\s*(?:mulai\s+dari|start(?:ing)?\s+from)?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?\s*(?:-|–|s\/d|sd|sampai|hingga|to)\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
  ]);
  addMoneyCandidate(candidates, "total_investment_idr", normalizedText, [
    /\b(?:total\s+(?:biaya\s+)?investasi|(?:perkiraan\s+)?biaya\s+investasi\s+total|nilai\s+investasi)\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
  ]);
  addMoneyCandidate(candidates, "fee_license_idr", normalizedText, [
    /\b(?:franchise|lisensi|license|kemitraan)\s+fee\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
    /\b(?:biaya|fee)\s+(?:franchise|lisensi|license|kemitraan)\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
    /\b(?:investasi|paket|modal)\s+kemitraan\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
    /\b(?:joining|initial)\s+fee\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
  ]);
  addMoneyCandidate(candidates, "fee_capex_idr", normalizedText, [
    /\b(?:biaya|modal)\s+(?:peralatan|equipment|alat|perlengkapan)\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
  ]);
  addMoneyCandidate(candidates, "fee_construction_idr", normalizedText, [
    /\b(?:biaya|modal)\s+(?:renovasi|interior|konstruksi|fit\s*out)\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
  ]);
  addMoneyCandidate(candidates, "working_capital_idr", normalizedText, [
    /\b(?:modal\s+kerja|working\s+capital|stok\s+awal|bahan\s+baku\s+awal)\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
  ]);

  const contract = normalizedText.match(/\b(?:durasi|masa|jangka\s+waktu|periode)\s+(?:kontrak|kerja\s*sama|kemitraan|lisensi)(?:\s+(?:kontrak|kerja\s*sama|kemitraan|lisensi))?\s*[:\-]?\s*(\d{1,2})\s*(bulan|tahun)/i)
    || normalizedText.match(/\b(\d{1,2})\s*(bulan|tahun)\s+(?:kontrak|kerja\s*sama|kemitraan|lisensi)\b/i);
  if (contract) candidates.contract_duration_months = durationToMonths(contract[1], contract[2]);

  const bepRange = normalizedText.match(/\b(?:bep|balik\s+modal|roi)\s*[:\-]?\s*(?:sekitar|estimasi|±)?\s*(\d{1,3})\s*(?:-|–|s\/d|sd|sampai|hingga)\s*(\d{1,3})\s*(bulan|tahun)/i);
  if (bepRange) {
    candidates.estimated_bep_min_months = Number(bepRange[1]) * (/tahun/i.test(bepRange[3]) ? 12 : 1);
    candidates.estimated_bep_max_months = Number(bepRange[2]) * (/tahun/i.test(bepRange[3]) ? 12 : 1);
  }
  const bep = normalizedText.match(/\b(?:bep|balik\s+modal|roi)\s*[:\-]?\s*(?:sekitar|estimasi|±)?\s*(\d{1,3})\s*(bulan|tahun)/i);
  if (bep) candidates.estimated_bep_months = Number(bep[1]) * (/tahun/i.test(bep[2]) ? 12 : 1);

  addMoneyRangeCandidate(candidates, "omzet_monthly_min_idr", "omzet_monthly_max_idr", normalizedText, [
    /\b(?:omzet|revenue|pendapatan|penjualan)\s*(?:per|\/)?\s*(?:bulan|month|bln)?\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?\s*(?:-|–|s\/d|sd|sampai|hingga)\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
  ]);
  addMoneyCandidate(candidates, "omzet_monthly_idr", normalizedText, [
    /\b(?:omzet|revenue|pendapatan|penjualan)\s*(?:per|\/)?\s*(?:bulan|month|bln)\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
    /\b(?:omzet|revenue|pendapatan|penjualan)\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?\s*(?:per|\/)\s*(?:bulan|month|bln)/i,
  ]);
  addMoneyRangeCandidate(candidates, "net_profit_monthly_min_idr", "net_profit_monthly_max_idr", normalizedText, [
    /\b(?:laba|profit|keuntungan)\s+(?:bersih\s+)?(?:per|\/)?\s*(?:bulan|month|bln)?\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?\s*(?:-|–|s\/d|sd|sampai|hingga)\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
  ]);
  addMoneyCandidate(candidates, "net_profit_monthly_min_idr", normalizedText, [
    /\b(?:laba|profit|keuntungan)\s+(?:bersih\s+)?(?:per|\/)?\s*(?:bulan|month|bln)\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i,
    /\b(?:laba|profit|keuntungan)\s+(?:bersih\s+)?[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?\s*(?:per|\/)\s*(?:bulan|month|bln)/i,
  ]);

  const hpp = normalizedText.match(/\b(?:hpp|food\s+cost|material\s+cost|biaya\s+bahan)\s*[:\-]?\s*(\d{1,2}(?:[.,]\d+)?)\s*%/i);
  if (hpp) candidates.hpp_percent = parseDecimal(hpp[1]);

  if (/\b(?:tanpa|bebas|gratis|free)\s+royalt(?:y|i)\b/i.test(normalizedText)) {
    candidates.royalty_percent = 0;
    candidates.royalty_basis = "none";
  }
  const royalty = normalizedText.match(/\broyalt(?:y|i)(?:\s+fee)?\s*[:\-]?\s*(\d{1,2}(?:[.,]\d+)?)\s*%/i);
  if (royalty) candidates.royalty_percent = parseDecimal(royalty[1]);
  if (/\broyalt(?:y|i)[^\n.]{0,40}\b(?:omzet|pendapatan|penjualan)\b/i.test(normalizedText)) candidates.royalty_basis = "omzet";
  if (/\broyalt(?:y|i)[^\n.]{0,40}\b(?:profit|laba|keuntungan)\b/i.test(normalizedText)) candidates.royalty_basis = "profit";
  if (/\broyalt(?:y|i)[^\n.]{0,60}\b(?:per|\/)\s*(?:bulan|month|bln)\b/i.test(normalizedText)) candidates.royalty_period = "bulanan";

  const profit = normalizedText.match(/\b(?:net\s+profit|laba\s+bersih|profit\s+bersih|keuntungan\s+bersih|margin\s+bersih)\s*[:\-]?\s*(\d{1,2}(?:[.,]\d+)?)\s*%/i);
  if (profit) candidates.net_profit_percent = parseDecimal(profit[1]);

  const targetMarket = normalizedText.match(/\b(?:target\s+(?:market|pasar|konsumen)|segmen\s+(?:pasar|konsumen)|pangsa\s+pasar)\s*[:\-]\s*([^\n.]{3,160})/i);
  if (targetMarket) candidates.target_market = cleanCandidate(targetMarket[1], 180);

  const support = normalizedText.match(/\b(?:support|dukungan|fasilitas|benefit|keuntungan\s+mitra)\s+(?:franchisor|kemitraan|mitra|yang\s+didapat)?\s*[:\-]\s*([^\n]{8,500})/i)
    || normalizedText.match(/\b(?:training|pelatihan|sop|pendampingan|marketing\s+support|bahan\s+baku|grand\s+opening)[^\n]{0,300}/i);
  if (support) candidates.support_system = cleanCandidate(support[1] || support[0], 300);

  return Object.fromEntries(Object.entries(candidates).filter(([, value]) => value !== null && value !== ""));
}

function onlyMissingCandidates(candidates, listing) {
  return Object.fromEntries(Object.entries(candidates).filter(([field]) => !hasValue(listing?.[field])));
}

function addMoneyCandidate(target, field, text, patterns) {
  const patternList = Array.isArray(patterns) ? patterns : [patterns];
  const match = patternList.map((pattern) => text.match(pattern)).find(Boolean);
  if (!match) return;
  const amount = parseMoney(match[1], match[2]);
  if (amount >= 100_000) target[field] = amount;
}

function addMoneyRangeCandidate(target, minField, maxField, text, patterns) {
  const match = patterns.map((pattern) => text.match(pattern)).find(Boolean);
  if (!match) return;
  const firstUnit = match[2] || match[4];
  const secondUnit = match[4] || match[2];
  const minAmount = parseMoney(match[1], firstUnit);
  const maxAmount = parseMoney(match[3], secondUnit);
  if (minAmount >= 100_000 && maxAmount >= minAmount) {
    target[minField] = minAmount;
    target[maxField] = maxAmount;
  }
}

function parseMoney(raw, unit) {
  const normalized = String(raw).replace(/\s/g, "");
  const decimalValue = /^[\d]{1,3}(?:[.,]\d{1,2})?$/.test(normalized) && unit
    ? Number(normalized.replace(",", "."))
    : Number(normalized.replace(/[.,]/g, ""));
  const normalizedUnit = String(unit || "").toLowerCase();
  if (["juta", "jt"].includes(normalizedUnit)) return Math.round(decimalValue * 1_000_000);
  if (["miliar", "milyar", "m"].includes(normalizedUnit)) return Math.round(decimalValue * 1_000_000_000);
  return Math.round(decimalValue);
}

function parseDecimal(value) {
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function sanitizeProposalSourceText(value) {
  const source = normalizeExtractedText(value);
  if (!source) return "";
  const blocked = SOURCE_NOISE_MARKERS.map((marker) => marker.toLowerCase());
  const cleanedLines = source
    .split(/\n+/)
    .map((line) => stripNoiseUrls(line))
    .filter((line) => {
      const lower = line.toLowerCase();
      return !blocked.some((marker) => lower.includes(marker));
    });
  return normalizeExtractedText(cleanedLines.join("\n"));
}

function normalizeExtractedText(value) {
  const source = Array.isArray(value) ? value.join("\n") : String(value || "");
  return source.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function stripNoiseUrls(line) {
  return SOURCE_NOISE_MARKERS.reduce((current, marker) => {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return current.replace(new RegExp(`\\b(?:https?:\\/\\/)?(?:www\\.)?${escaped}\\S*`, "gi"), "");
  }, line);
}

function cleanCandidate(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").replace(/^[\s:;,-]+|[\s:;,-]+$/g, "").slice(0, maxLength).trim();
}

function extractAreaSqm(text) {
  const dimension = text.match(/\b(?:luas|ukuran|area)?[^\n.]{0,40}\b(\d{1,3}(?:[.,]\d+)?)\s*x\s*(\d{1,3}(?:[.,]\d+)?)\s*m(?:2|²|eter)?\b/i);
  if (dimension) {
    const width = parseDecimal(dimension[1]);
    const length = parseDecimal(dimension[2]);
    const area = width && length ? Math.round(width * length) : 0;
    return area > 0 && area < 10_000 ? area : null;
  }
  const direct = text.match(/\b(?:luas|ukuran|area)\s+(?:minimal|min(?:imum)?|outlet|lokasi|tempat|ruangan)?\s*[:\-]?\s*(\d{1,4}(?:[.,]\d+)?)\s*m(?:2|²)\b/i);
  if (direct) {
    const area = Math.round(parseDecimal(direct[1]) || 0);
    return area > 0 && area < 10_000 ? area : null;
  }
  return null;
}

function durationToMonths(value, unit) {
  const number = Number(value);
  return Number.isFinite(number) ? number * (/tahun/i.test(unit) ? 12 : 1) : null;
}

function durationToDays(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (/bulan/i.test(unit)) return number * 30;
  if (/minggu/i.test(unit)) return number * 7;
  return number;
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function pickValues(source, fields) {
  return Object.fromEntries(fields.map((field) => [field, source?.[field] ?? null]));
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}
