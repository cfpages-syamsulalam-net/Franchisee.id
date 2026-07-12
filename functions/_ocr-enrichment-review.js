import { SITE_ID } from "./_dashboard-schemas.js";
import { EDITABLE_LISTING_FIELD_DEFS, sanitizeListingChanges } from "./_shared-schemas.js";
import { auditStatement, assertAdmin, jsonResponse, randomId } from "./_dashboard-utils.js";
import { sanitizeProposalSourceText } from "./_proposal-knowledge.js";

const MAX_QUEUE_ROWS = 40;
const MAX_SOURCE_ROWS = 600;
const FIELD_DEFS = new Map(EDITABLE_LISTING_FIELD_DEFS.map((field) => [field.name, field]));
const EDITABLE_FIELDS = new Set(EDITABLE_LISTING_FIELD_DEFS.map((field) => field.name));

export async function getOcrEnrichmentQueue(db, options = {}) {
  const franchiseId = textOrNull(options.franchiseId);
  const rows = await db
    .prepare(
      `SELECT
        k.id,
        k.asset_id,
        k.franchise_id,
        k.structured_data,
        SUBSTR(COALESCE(k.source_text, ''), 1, 700) source_text_preview,
        k.updated_at,
        f.brand_name,
        f.slug,
        f.year_established,
        f.city_origin,
        f.brand_country,
        f.outlet_type,
        f.target_market,
        f.location_requirement,
        f.min_area_sqm,
        f.min_staff_count,
        f.setup_duration_days,
        f.rent_cost_text,
        f.contract_duration_months,
        f.fee_license_idr,
        f.fee_capex_idr,
        f.fee_construction_idr,
        f.working_capital_idr,
        f.additional_cost_notes,
        f.total_investment_idr,
        f.min_investment_idr,
        f.max_investment_idr,
        f.estimated_bep_months,
        f.estimated_bep_min_months,
        f.estimated_bep_max_months,
        f.omzet_monthly_idr,
        f.omzet_monthly_min_idr,
        f.omzet_monthly_max_idr,
        f.hpp_percent,
        f.net_profit_percent,
        f.net_profit_monthly_min_idr,
        f.net_profit_monthly_max_idr,
        f.royalty_percent,
        f.royalty_basis,
        f.royalty_period,
        f.support_system,
        f.office_address,
        f.outlets_location,
        COALESCE(a.display_order, 0) display_order,
        COALESCE(a.public_url, a.legacy_url) source_url,
        (
          SELECT COUNT(*)
          FROM listing_edit_suggestions s
          WHERE s.franchise_id = k.franchise_id
            AND s.site_id = ?
            AND s.status = 'pending'
            AND s.field_name = 'ocr_enrichment_bundle'
        ) pending_bundle_count,
        (
          SELECT COUNT(*)
          FROM listing_edit_suggestions s
          WHERE s.franchise_id = k.franchise_id
            AND s.site_id = ?
            AND s.status = 'pending'
            AND s.field_name = 'proposal_extraction'
        ) pending_page_suggestion_count
       FROM franchise_asset_knowledge k
       JOIN franchises f ON f.id = k.franchise_id
       LEFT JOIN franchise_assets a ON a.id = k.asset_id
       WHERE k.extraction_status = 'extracted'
         AND COALESCE(k.structured_data, '') NOT IN ('', '{}')
         AND (? IS NULL OR k.franchise_id = ?)
       ORDER BY k.updated_at DESC
       LIMIT ?`,
    )
    .bind(SITE_ID, SITE_ID, franchiseId, franchiseId, franchiseId ? MAX_SOURCE_ROWS : MAX_SOURCE_ROWS)
    .all();

  const grouped = new Map();
  for (const row of rows.results || []) {
    const structured = parseJsonObject(row.structured_data);
    const listing = row;
    for (const [field, rawValue] of Object.entries(structured)) {
      if (!EDITABLE_FIELDS.has(field) || hasValue(listing[field]) || !hasValue(rawValue)) continue;
      const normalized = normalizeCandidate(field, rawValue);
      if (!hasValue(normalized)) continue;
      const item = grouped.get(row.franchise_id) || emptyQueueItem(row);
      addFieldCandidate(item, field, normalized, row);
      grouped.set(row.franchise_id, item);
    }
  }

  const items = Array.from(grouped.values())
    .map(finalizeQueueItem)
    .filter((item) => Object.keys(item.suggested_value).length > 0)
    .sort((left, right) => {
      const fieldDiff = right.field_count - left.field_count;
      if (fieldDiff) return fieldDiff;
      const sourceDiff = right.source_count - left.source_count;
      if (sourceDiff) return sourceDiff;
      return String(right.updated_at || "").localeCompare(String(left.updated_at || ""));
    });

  return {
    total: items.length,
    items: items.slice(0, franchiseId ? 1 : MAX_QUEUE_ROWS),
    limit: franchiseId ? 1 : MAX_QUEUE_ROWS,
  };
}

export async function handleCreateOcrEnrichmentSuggestion(db, auth, data) {
  assertAdmin(auth);
  const franchiseId = textOrNull(data.franchise_id);
  if (!franchiseId) return jsonResponse({ success: false, error: "FRANCHISE_ID_REQUIRED", message: "Pilih franchise yang akan direview." }, { status: 400 });

  const queue = await getOcrEnrichmentQueue(db, { franchiseId });
  const item = queue.items[0];
  if (!item) {
    return jsonResponse({ success: false, error: "OCR_ENRICHMENT_EMPTY", message: "Belum ada kandidat OCR baru untuk listing ini." }, { status: 404 });
  }
  if (Number(item.pending_bundle_count || 0) > 0) {
    return jsonResponse({ success: false, error: "OCR_ENRICHMENT_PENDING", message: "Bundle review OCR untuk listing ini sudah pending di Review OCR." }, { status: 409 });
  }

  const suggestionId = `suggestion_${randomId()}`;
  const reason = buildReason(item);
  await db.batch([
    db
      .prepare(
        `INSERT INTO listing_edit_suggestions (
          id, franchise_id, site_id, suggested_by_user_id, status, field_name,
          old_value, suggested_value, reason
        ) VALUES (?, ?, ?, ?, 'pending', 'ocr_enrichment_bundle', ?, ?, ?)`,
      )
      .bind(
        suggestionId,
        item.franchise_id,
        SITE_ID,
        auth.id,
        JSON.stringify(oldValueWithEvidence(item)),
        JSON.stringify(item.suggested_value),
        reason,
      ),
    auditStatement(db, "dashboard.ocr_enrichment.bundle_create", "franchise", item.franchise_id, {
      suggestion_id: suggestionId,
      fields: Object.keys(item.suggested_value),
      source_count: item.source_count,
    }, auth.id),
  ]);

  return jsonResponse({
    success: true,
    suggestion_id: suggestionId,
    franchise_id: item.franchise_id,
    fields: Object.keys(item.suggested_value),
    message: "Bundle review OCR dibuat di Review OCR.",
  });
}

function emptyQueueItem(row) {
  return {
    franchise_id: row.franchise_id,
    brand_name: row.brand_name || "",
    slug: row.slug || "",
    public_url: row.slug ? `/peluang-usaha/${row.slug}` : "",
    pending_bundle_count: Number(row.pending_bundle_count || 0),
    pending_page_suggestion_count: Number(row.pending_page_suggestion_count || 0),
    updated_at: row.updated_at || null,
    field_candidates: {},
    field_sources: {},
  };
}

function addFieldCandidate(item, field, value, row) {
  const key = stableCandidateKey(value);
  const bucket = item.field_candidates[field] || {};
  const current = bucket[key] || {
    value,
    count: 0,
    first_updated_at: row.updated_at || "",
    sources: [],
  };
  current.count += 1;
  if (current.sources.length < 4) {
    current.sources.push({
      asset_id: row.asset_id,
      page_number: Number(row.display_order || 0) || null,
      source_url: row.source_url || "",
      excerpt: sourceExcerpt(row.source_text_preview, value),
    });
  }
  bucket[key] = current;
  item.field_candidates[field] = bucket;
  item.updated_at = maxTextDate(item.updated_at, row.updated_at);
}

function finalizeQueueItem(item) {
  const suggested = {};
  const oldValue = {};
  const sourceFields = {};
  let sourceCount = 0;

  for (const [field, choices] of Object.entries(item.field_candidates)) {
    const selected = Object.values(choices).sort((left, right) => {
      const countDiff = Number(right.count || 0) - Number(left.count || 0);
      if (countDiff) return countDiff;
      return String(right.first_updated_at || "").localeCompare(String(left.first_updated_at || ""));
    })[0];
    if (!selected) continue;
    suggested[field] = selected.value;
    oldValue[field] = null;
    sourceFields[field] = {
      label: fieldLabel(field),
      value: selected.value,
      source_count: Number(selected.count || 0),
      sources: selected.sources || [],
      conflict_count: Math.max(0, Object.keys(choices).length - 1),
    };
    sourceCount += Number(selected.count || 0);
  }

  return {
    franchise_id: item.franchise_id,
    brand_name: item.brand_name,
    slug: item.slug,
    public_url: item.public_url,
    pending_bundle_count: item.pending_bundle_count,
    pending_page_suggestion_count: item.pending_page_suggestion_count,
    old_value: oldValue,
    suggested_value: suggested,
    fields: Object.keys(suggested),
    field_labels: Object.keys(suggested).map(fieldLabel),
    field_count: Object.keys(suggested).length,
    source_count: sourceCount,
    sources_by_field: sourceFields,
    updated_at: item.updated_at,
  };
}

function normalizeCandidate(field, value) {
  try {
    const clean = sanitizeListingChanges({ [field]: value });
    return clean[field];
  } catch (_error) {
    return null;
  }
}

function buildReason(item) {
  const fieldList = item.field_labels.join(", ");
  const sourceSummary = Object.entries(item.sources_by_field || {})
    .slice(0, 5)
    .map(([, detail]) => {
      const source = (detail.sources || [])[0] || {};
      const page = source.page_number ? `halaman ${source.page_number}` : "halaman brosur";
      return `${detail.label}: ${page}`;
    })
    .join("; ");
  return [
    "Bundle kandidat OCR per franchise. Tinjau teks/gambar brosur sebelum menyetujui.",
    fieldList ? `Field: ${fieldList}.` : "",
    sourceSummary ? `Sumber: ${sourceSummary}.` : "",
  ].filter(Boolean).join(" ").slice(0, 1200);
}

function oldValueWithEvidence(item) {
  return {
    ...item.old_value,
    __ocr_evidence: item.sources_by_field || {},
  };
}

function sourceExcerpt(text, value) {
  const normalized = normalizeText(sanitizeProposalSourceText(text));
  if (!normalized) return "";
  const valueText = normalizeText(value);
  if (valueText && valueText.length >= 3) {
    const index = normalized.toLowerCase().indexOf(valueText.toLowerCase());
    if (index >= 0) {
      return normalized.slice(Math.max(0, index - 70), index + valueText.length + 100).trim();
    }
  }
  return normalized.slice(0, 220).trim();
}

function fieldLabel(field) {
  return FIELD_DEFS.get(field)?.label || field;
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function stableCandidateKey(value) {
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function hasValue(value) {
  return value !== null && value !== undefined && normalizeText(value) !== "";
}

function textOrNull(value) {
  const text = normalizeText(value);
  return text || null;
}

function maxTextDate(left, right) {
  if (!right) return left || null;
  if (!left) return right;
  return String(right).localeCompare(String(left)) > 0 ? right : left;
}
