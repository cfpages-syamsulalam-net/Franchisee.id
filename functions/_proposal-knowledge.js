import { extractText, getDocumentProxy } from "unpdf";

const MAX_STORED_TEXT_CHARS = 60_000;

export async function extractProposalKnowledge(arrayBuffer, listing) {
  const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
  const result = await extractText(pdf, { mergePages: true });
  const sourceText = normalizeExtractedText(result.text).slice(0, MAX_STORED_TEXT_CHARS);

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
        input.result.sourceText || null,
        JSON.stringify(input.result.candidates || {}),
        input.result.pageCount || null,
        input.result.errorMessage || null,
      ),
  ];

  const fields = Object.keys(input.result.candidates || {});
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
          JSON.stringify(input.result.candidates),
          "Kandidat fakta diekstrak otomatis dari proposal. Tinjau terhadap dokumen sebelum menyetujui.",
        ),
    );
  }

  return statements;
}

export function extractProposalCandidatesFromText(text) {
  const candidates = {};
  const outlet = text.match(/\b(?:tipe|jenis|konsep|format)\s+(?:usaha|outlet|gerai)\s*[:\-]?\s*([^\n.]{3,100})/i)
    || text.match(/\b(gerobak|booth|kios|kiosk|ruko|restoran|dine[ -]?in|cloud kitchen|food truck|counter)\b/i);
  if (outlet) candidates.outlet_type = cleanCandidate(outlet[1] || outlet[0], 120);

  const location = text.match(/\b(?:luas|ukuran|area)\s+(?:minimal|min(?:imum)?|outlet|lokasi|tempat)?\s*[:\-]?\s*([^\n.]{1,100}?\b\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?m(?:2|²)\b[^\n.]*)/i)
    || text.match(/\b(?:lokasi|tempat)\s+(?:yang\s+)?(?:dibutuhkan|disarankan|ideal)\s*[:\-]?\s*([^\n.]{3,180})/i);
  if (location) candidates.location_requirement = cleanCandidate(location[1], 240);

  addMoneyCandidate(candidates, "total_investment_idr", text, /\b(?:total|paket|nilai)\s+investasi\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i);
  addMoneyCandidate(candidates, "fee_license_idr", text, /\b(?:franchise|lisensi|kemitraan)\s+fee\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|miliar|milyar|m)?/i);

  const bep = text.match(/\b(?:bep|balik\s+modal)\s*[:\-]?\s*(?:sekitar|estimasi|±)?\s*(\d{1,3})\s*(bulan|tahun)/i);
  if (bep) candidates.estimated_bep_months = Number(bep[1]) * (/tahun/i.test(bep[2]) ? 12 : 1);

  const royalty = text.match(/\broyalt(?:y|i)(?:\s+fee)?\s*[:\-]?\s*(\d{1,2}(?:[.,]\d+)?)\s*%/i);
  if (royalty) candidates.royalty_percent = parseDecimal(royalty[1]);

  const profit = text.match(/\b(?:net|laba|profit|keuntungan)\s+(?:bersih|margin)?\s*[:\-]?\s*(\d{1,2}(?:[.,]\d+)?)\s*%/i);
  if (profit) candidates.net_profit_percent = parseDecimal(profit[1]);

  const support = text.match(/\b(?:support|dukungan|fasilitas)\s+(?:franchisor|kemitraan|mitra)?\s*[:\-]\s*([^\n]{8,300})/i);
  if (support) candidates.support_system = cleanCandidate(support[1], 300);

  return Object.fromEntries(Object.entries(candidates).filter(([, value]) => value !== null && value !== ""));
}

function onlyMissingCandidates(candidates, listing) {
  return Object.fromEntries(Object.entries(candidates).filter(([field]) => !hasValue(listing?.[field])));
}

function addMoneyCandidate(target, field, text, pattern) {
  const match = text.match(pattern);
  if (!match) return;
  const amount = parseMoney(match[1], match[2]);
  if (amount >= 100_000) target[field] = amount;
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

function normalizeExtractedText(value) {
  const source = Array.isArray(value) ? value.join("\n") : String(value || "");
  return source.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function cleanCandidate(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").replace(/^[\s:;,-]+|[\s:;,-]+$/g, "").slice(0, maxLength).trim();
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
