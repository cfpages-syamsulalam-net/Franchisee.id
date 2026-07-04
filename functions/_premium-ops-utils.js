export function textOrNull(value) {
  const text = (value ?? "").toString().trim().replace(/\s+/g, " ");
  return text || null;
}

export function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

export async function safeAll(db, sql, bindings = []) {
  try {
    const statement = db.prepare(sql);
    const result = await (bindings.length ? statement.bind(...bindings).all() : statement.all());
    return result.results || [];
  } catch (_error) {
    return [];
  }
}

export function safeJson(value) {
  try {
    return JSON.stringify(value || {});
  } catch (_error) {
    return "{}";
  }
}

export function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}

export function formatDate(value) {
  const date = new Date(String(value || "").replace(" ", "T") + (String(value || "").includes("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return String(value || "-");
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function parseDateMillis(value) {
  const text = textOrNull(value);
  if (!text) return 0;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
