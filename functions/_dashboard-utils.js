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
  return parsePhoneContacts(value, "WhatsApp").filter((contact) => contact.can_use_whatsapp);
}

export function parsePhoneContacts(value, defaultLabel = "Telepon") {
  const text = normalizeText(value);
  if (!text) return [];

  const contacts = [];
  const starts = findPhoneStarts(text);

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const nextStart = starts[index + 1] ?? text.length;
    const raw = matchPhoneCandidate(text.slice(start, nextStart));
    if (!raw) continue;

    const parsed = normalizePhoneDigits(raw);
    if (!parsed) continue;

    contacts.push({
      label: inferLabel(text, start, defaultLabel),
      display: formatPhoneDisplay(parsed),
      local_digits: parsed.localDigits,
      international_digits: parsed.internationalDigits,
      url: parsed.canUseWhatsApp ? `https://wa.me/${parsed.internationalDigits}` : parsed.telUrl,
      type: parsed.type,
      can_use_whatsapp: parsed.canUseWhatsApp,
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

function inferLabel(text, start, fallback) {
  const before = text.slice(Math.max(0, start - 40), start).toLowerCase();
  if (before.includes("call center")) return "Call Center";
  if (before.includes("marketing")) return "Marketing";
  if (before.includes("wa") || before.includes("whatsapp")) return "WhatsApp";
  if (before.includes("kantor") || before.includes("office")) return "Kantor";
  if (before.includes("telp") || before.includes("telepon")) return "Telepon";
  return fallback;
}

function findPhoneStarts(text) {
  const starts = [];
  const startPattern = /(?:\(\s*)?(?:(?:\+?\s*62|0)(?=[\s().-]*[2-9])|\+?\s*886(?=[\s().-]*9)|1(?=[\s().-]*5[\s().-]*0[\s().-]*0[\s().-]*\d))/g;
  let match;

  while ((match = startPattern.exec(text))) {
    const previous = text[match.index - 1] || "";
    const beforePrevious = text[match.index - 2] || "";
    if (/\d/.test(previous)) continue;
    if (/[-.]/.test(previous) && /\d/.test(beforePrevious)) continue;
    if (/\s/.test(previous) && /\d/.test(beforePrevious) && isGroupedNonMobileStart(text, match.index)) continue;
    starts.push(match.index);
  }

  return starts;
}

function isGroupedNonMobileStart(text, start) {
  return /^(?:\(\s*)?0[\s().-]*[2-79]/.test(text.slice(start));
}

function matchPhoneCandidate(value) {
  return (
    value.match(/^(?:\(\s*)?(?:\+?\s*62|0)\s*8(?:[\s().-]*\d){8,11}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*886\s*9(?:[\s().-]*\d){8}/)?.[0] ||
    value.match(/^(?:\(\s*)?(?:\+?\s*62|0)\s*[2-9](?:[\s().-]*\d){6,11}/)?.[0] ||
    value.match(/^1(?:[\s().-]*\d){5,7}/)?.[0] ||
    ""
  );
}

function normalizePhoneDigits(value) {
  const digits = value.replace(/\D/g, "");
  if (!hasUsefulDigitVariety(digits)) return null;

  if (digits.startsWith("0")) {
    if (!/^08/.test(digits)) {
      if (!isIndonesianLandline(digits)) return null;
      return {
        countryCode: "62",
        localDigits: digits,
        internationalDigits: `62${digits.slice(1)}`,
        telUrl: `tel:+62${digits.slice(1)}`,
        type: "landline",
        canUseWhatsApp: false,
      };
    }

    if (!/^08\d{8,11}$/.test(digits)) return null;
    return {
      countryCode: "62",
      localDigits: digits,
      internationalDigits: `62${digits.slice(1)}`,
      telUrl: `tel:+62${digits.slice(1)}`,
      type: "mobile",
      canUseWhatsApp: true,
    };
  }

  if (digits.startsWith("620")) {
    const normalized = `62${digits.slice(3)}`;
    if (!/^628\d{8,11}$/.test(normalized)) return null;
    return {
      countryCode: "62",
      localDigits: `0${normalized.slice(2)}`,
      internationalDigits: normalized,
      telUrl: `tel:+${normalized}`,
      type: "mobile",
      canUseWhatsApp: true,
    };
  }

  if (digits.startsWith("62")) {
    if (/^628\d{8,11}$/.test(digits)) {
      return {
        countryCode: "62",
        localDigits: `0${digits.slice(2)}`,
        internationalDigits: digits,
        telUrl: `tel:+${digits}`,
        type: "mobile",
        canUseWhatsApp: true,
      };
    }

    const landlineLocal = `0${digits.slice(2)}`;
    if (!isIndonesianLandline(landlineLocal)) return null;
    return {
      countryCode: "62",
      localDigits: landlineLocal,
      internationalDigits: digits,
      telUrl: `tel:+${digits}`,
      type: "landline",
      canUseWhatsApp: false,
    };
  }

  if (isIndonesianLandline(digits)) {
    return {
      countryCode: "62",
      localDigits: digits,
      internationalDigits: `62${digits.slice(1)}`,
      telUrl: `tel:+62${digits.slice(1)}`,
      type: "landline",
      canUseWhatsApp: false,
    };
  }

  if (digits.startsWith("886")) {
    if (!/^8869\d{8}$/.test(digits)) return null;
    return {
      countryCode: "886",
      localDigits: digits,
      internationalDigits: digits,
      telUrl: `tel:+${digits}`,
      type: "mobile",
      canUseWhatsApp: true,
    };
  }

  if (/^1500\d{3,5}$/.test(digits)) {
    return {
      countryCode: "",
      localDigits: digits,
      internationalDigits: digits,
      telUrl: `tel:${digits}`,
      type: "call_center",
      canUseWhatsApp: false,
    };
  }

  return null;
}

function formatPhoneDisplay(parsed) {
  if (parsed.countryCode === "886") {
    const local = parsed.internationalDigits.slice(3);
    return `+886 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }

  if (parsed.type === "call_center") return groupDigits(parsed.localDigits, 4);
  if (parsed.type === "landline") return formatIndonesianLandline(parsed.localDigits);
  return groupDigits(parsed.localDigits, 4);
}

function hasUsefulDigitVariety(digits) {
  return new Set(digits.split("")).size > 2;
}

function isIndonesianLandline(digits) {
  return /^0[2-9]\d{7,11}$/.test(digits) && !/^08/.test(digits);
}

function formatIndonesianLandline(localDigits) {
  const areaLength = localDigits.startsWith("021")
    ? 3
    : /^0[2-9]\d{2}/.test(localDigits)
      ? 4
      : 3;
  const area = localDigits.slice(0, areaLength);
  const local = localDigits.slice(areaLength);
  return `(${area}) ${groupDigits(local, 4)}`;
}

function groupDigits(value, size) {
  const groups = [];
  for (let index = 0; index < value.length; index += size) groups.push(value.slice(index, index + size));
  return groups.join(" ");
}
