function normalizeText(value: unknown) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}

function escapeHtml(value: unknown) {
  return normalizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: unknown) {
  return escapeHtml(value);
}

export function generateCssPlaceholder(label: string, className: string) {
  return `<div class="${escapeAttr(className)}" aria-label="${escapeAttr(label)}"><span>${escapeHtml(initials(label))}</span><small>Logo belum tersedia</small></div>`;
}

function initials(label: string) {
  const words = normalizeText(label).split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] || "F";
  const second = words.find((word) => word.length > 2 && word !== words[0])?.[0] || words[1]?.[0] || "I";
  return `${first}${second}`.toUpperCase();
}

export { injectDirectoryAssets } from "./franchise-directory-assets";
export { injectDetailAssets } from "./franchise-detail-assets";
