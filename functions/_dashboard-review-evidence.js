import { EDITABLE_LISTING_FIELD_DEFS } from "./_shared-schemas.js";
import { parseJson } from "./_dashboard-utils.js";
import { sourceEvidence } from "./_proposal-evidence.js";

const FIELD_LABELS = new Map(EDITABLE_LISTING_FIELD_DEFS.map((field) => [field.name, field.label || field.name]));

export async function attachDocumentSuggestionEvidence(db, rows) {
  const needsEvidence = rows.filter((row) => isDocumentSuggestion(row) && !hasCompleteOcrEvidence(row.old_value, row.suggested_value));
  if (!needsEvidence.length) return rows;

  const franchiseIds = [...new Set(needsEvidence.map((row) => row.franchise_id).filter(Boolean))];
  if (!franchiseIds.length) return rows;

  const placeholders = franchiseIds.map(() => "?").join(", ");
  const knowledge = await db
    .prepare(
      `SELECT
        k.franchise_id,
        k.asset_id,
        k.structured_data,
        COALESCE(k.source_text_preview, SUBSTR(COALESCE(k.source_text, ''), 1, 700)) source_text_preview,
        COALESCE(a.display_order, 0) display_order,
        COALESCE(a.public_url, a.legacy_url) source_url
       FROM franchise_asset_knowledge k
       LEFT JOIN franchise_assets a ON a.id = k.asset_id
       WHERE k.franchise_id IN (${placeholders})
         AND k.extraction_status = 'extracted'
         AND COALESCE(k.structured_data, '') NOT IN ('', '{}')
       ORDER BY k.franchise_id, COALESCE(a.display_order, 0), k.updated_at DESC`,
    )
    .bind(...franchiseIds)
    .all();

  const byFranchise = new Map();
  for (const row of knowledge.results || []) {
    const bucket = byFranchise.get(row.franchise_id) || [];
    bucket.push(row);
    byFranchise.set(row.franchise_id, bucket);
  }

  return rows.map((row) => {
    if (!isDocumentSuggestion(row) || hasCompleteOcrEvidence(row.old_value, row.suggested_value)) return row;
    const evidence = buildSuggestionEvidence(row, byFranchise.get(row.franchise_id) || []);
    if (!Object.keys(evidence).length) return row;
    return {
      ...row,
      old_value: {
        ...(row.old_value || {}),
        __ocr_evidence: evidence,
      },
    };
  });
}

function buildSuggestionEvidence(suggestion, knowledgeRows) {
  const evidence = {};
  for (const [field, value] of Object.entries(suggestion.suggested_value || {})) {
    const matching = knowledgeRows.filter((row) => {
      const structured = parseJson(row.structured_data, {});
      return Object.prototype.hasOwnProperty.call(structured, field) && sameCandidateValue(structured[field], value);
    });
    const fallback = matching.length ? matching : knowledgeRows.filter((row) => {
      const structured = parseJson(row.structured_data, {});
      return Object.prototype.hasOwnProperty.call(structured, field);
    });
    const sources = fallback.slice(0, 4).map((row) => ({
      asset_id: row.asset_id,
      page_number: Number(row.display_order || 0) || null,
      source_url: row.source_url || "",
      ...sourceEvidence(field, row.source_text_preview, value),
    })).filter((source) => source.excerpt || source.source_url);
    if (!sources.length) continue;
    evidence[field] = {
      label: FIELD_LABELS.get(field) || field,
      value,
      source_count: fallback.length,
      sources,
      conflict_count: 0,
    };
  }
  return evidence;
}

function isDocumentSuggestion(row) {
  return row && (row.field_name === "ocr_enrichment_bundle" || row.field_name === "proposal_extraction");
}

function hasCompleteOcrEvidence(oldValue, suggestedValue) {
  if (!oldValue || typeof oldValue !== "object" || !oldValue.__ocr_evidence || typeof oldValue.__ocr_evidence !== "object") return false;
  return Object.keys(suggestedValue || {}).every((field) => {
    const detail = oldValue.__ocr_evidence[field];
    const sources = detail && Array.isArray(detail.sources) ? detail.sources : [];
    return sources.some((source) => source && source.excerpt && source.basis);
  });
}

function sameCandidateValue(left, right) {
  return stableCandidateKey(left) === stableCandidateKey(right);
}

function stableCandidateKey(value) {
  return typeof value === "object"
    ? JSON.stringify(value)
    : normalizeText(value).toLowerCase();
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
