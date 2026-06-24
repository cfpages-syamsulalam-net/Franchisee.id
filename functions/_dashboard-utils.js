import { AuthError } from "./_clerk-auth.js";
import { SITE_ID } from "./_dashboard-schemas.js";

export function auditStatement(db, action, entityType, entityId, metadata, actorUserId) {
  return db
    .prepare(
      `INSERT INTO audit_events (id, actor_user_id, source_site_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(`audit_${randomId()}`, actorUserId || null, SITE_ID, action, entityType, entityId || null, JSON.stringify(metadata || {}));
}

export function assertAdmin(auth) {
  if (!isAdmin(auth)) throw new AuthError("Aksi ini hanya boleh dilakukan admin.", 403, "ADMIN_REQUIRED");
}

export function isAdmin(auth) {
  return (auth.roles || []).some((role) => role.role === "admin");
}

export function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch (_error) {
    return fallback;
  }
}

export function parseWhatsAppContacts(value) {
  const text = normalizeText(value);
  if (!text) return [];

  const contacts = [];
  const matches = text.matchAll(/(?:\(\s*)?(?:\+?62|0)(?:[\s().-]*\d){7,15}/g);
  for (const match of matches) {
    const digits = match[0].replace(/\D/g, "");
    const normalized = normalizeIndonesianDigits(digits);
    if (!/^08\d{7,12}$/.test(normalized)) continue;
    contacts.push({
      label: inferLabel(text, match.index || 0),
      display: groupDigits(normalized, 4),
      local_digits: normalized,
      international_digits: `62${normalized.slice(1)}`,
    });
  }

  return contacts.filter((contact, index, items) => items.findIndex((item) => item.international_digits === contact.international_digits) === index);
}

export function buildWhatsAppUrl(internationalDigits, row) {
  const listingUrl = `https://franchisee.id/peluang-usaha/${row.slug}`;
  const claimUrl = `https://franchisee.id/daftar?claim=${row.slug}`;
  const message = [
    `Halo, kami menemukan listing ${row.brand_name} (${row.category || "franchise"}) di Franchisee.id: ${listingUrl}.`,
    "Status listing ini belum diklaim, jadi informasi franchise, kontak, dan alamatnya belum dikelola langsung oleh pemilik brand.",
    `Mohon tim/pemilik ${row.brand_name} klaim listing ini agar data publiknya bisa diperbarui resmi: ${claimUrl}`,
  ].join(" ");
  return `https://wa.me/${internationalDigits}?text=${encodeURIComponent(message)}`;
}

export function normalizeNumberObject(row) {
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key, typeof value === "number" ? value : Number(value || 0)]));
}

export function normalizeGroupedCounts(rows, keyName) {
  return rows.reduce((acc, row) => {
    acc[row[keyName] || "unknown"] = Number(row.count || 0);
    return acc;
  }, {});
}

export function normalizeText(value) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}

export function isLikelyAllCapsDescription(value) {
  const text = normalizeText(value);
  if (text.length < 24) return false;
  const letters = text.match(/[A-Za-z]/g) || [];
  if (letters.length < 16) return false;
  const uppercase = letters.filter((letter) => letter === letter.toUpperCase() && letter !== letter.toLowerCase()).length;
  return uppercase / letters.length >= 0.82 && /[A-Z]{5,}/.test(text);
}

export function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

function inferLabel(text, start) {
  const before = text.slice(Math.max(0, start - 40), start).toLowerCase();
  if (before.includes("marketing")) return "Marketing";
  if (before.includes("wa") || before.includes("whatsapp")) return "WhatsApp";
  if (before.includes("kantor") || before.includes("office")) return "Kantor";
  return "WhatsApp";
}

function normalizeIndonesianDigits(digits) {
  if (digits.startsWith("620")) return `0${digits.slice(3)}`;
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

function groupDigits(value, size) {
  const groups = [];
  for (let index = 0; index < value.length; index += size) groups.push(value.slice(index, index + size));
  return groups.join(" ");
}
