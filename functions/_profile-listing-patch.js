import { intOrNull, numberOrNull, textOrNull } from "./_profile-utils.js";

export function listingPatch(data) {
  const fields = [
    "brand_name",
    "category",
    "year_established",
    "city_origin",
    "brand_country",
    "outlet_type",
    "target_market",
    "location_requirement",
    "min_area_sqm",
    "min_staff_count",
    "setup_duration_days",
    "rent_cost_text",
    "fee_license_idr",
    "fee_capex_idr",
    "fee_construction_idr",
    "working_capital_idr",
    "additional_cost_notes",
    "total_investment_idr",
    "min_investment_idr",
    "max_investment_idr",
    "estimated_bep_months",
    "estimated_bep_min_months",
    "estimated_bep_max_months",
    "omzet_monthly_idr",
    "omzet_monthly_min_idr",
    "omzet_monthly_max_idr",
    "net_profit_percent",
    "net_profit_monthly_min_idr",
    "net_profit_monthly_max_idr",
    "royalty_percent",
    "royalty_basis",
    "short_desc",
    "full_desc",
    "support_system",
    "phone",
    "office_address",
    "outlets_location",
    "logo_url",
    "cover_url",
    "gallery_urls",
    "video_url",
    "proposal_url",
  ];
  const patch = {};
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      patch[field] = normalizePatchValue(field, data[field]);
    }
  });
  return patch;
}

export function buildUpdate(table, patch, idColumn) {
  const keys = Object.keys(patch);
  return {
    sql: `UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE ${idColumn} = ?`,
    values: keys.map((key) => patch[key]),
  };
}

function normalizePatchValue(field, value) {
  if (value === undefined || value === "") return null;
  if (
    field.endsWith("_idr") ||
    field === "year_established" ||
    field === "estimated_bep_months" ||
    field === "estimated_bep_min_months" ||
    field === "estimated_bep_max_months" ||
    field === "min_area_sqm" ||
    field === "min_staff_count" ||
    field === "setup_duration_days"
  ) return intOrNull(value);
  if (field === "net_profit_percent" || field === "royalty_percent") return numberOrNull(value);
  return textOrNull(value);
}
