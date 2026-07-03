import type { FranchiseStaticRow } from "./franchise-static";
import { escapeAttr, escapeHtml, normalizeExternalUrl, normalizeText } from "./franchise-text";

interface ParsedPhoneContact {
  label: string;
  display: string;
  href: string;
  whatsappHref: string;
  type: "whatsapp" | "mobile" | "landline";
}

export function generateContactBlock(row: FranchiseStaticRow, isUnclaimed = false) {
  const links = [
    ["Website", row.website_url],
    ["Instagram", row.instagram_url],
    ["Facebook", row.facebook_url],
    ["TikTok", row.tiktok_url],
    ["YouTube", row.youtube_url],
    ["LinkedIn", row.linkedin_url],
  ]
    .map(([label, url]) => ({ label, url: normalizeExternalUrl(url) }))
    .filter((item) => item.url);

  const phoneContacts = [
    ...parsePhoneContacts(row.whatsapp, "WhatsApp", "whatsapp"),
    ...parsePhoneContacts(row.phone, "Telepon", "phone"),
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index);

  const hasPublicContact =
    phoneContacts.length > 0 || normalizeText(row.email_contact) || normalizeText(row.office_address) || links.length > 0;

  const lead = isUnclaimed
    ? hasPublicContact
      ? "Data kontak publik di bawah ini belum diklaim pemilik brand. Klaim listing untuk memperbarui atau mengoreksi data."
      : "Kontak publik belum tersedia. Pemilik brand dapat klaim listing untuk melengkapi data resmi."
    : hasPublicContact
      ? "Gunakan kontak resmi brand untuk informasi kemitraan lebih lanjut."
      : "Silakan hubungi tim acquisition untuk informasi lebih lanjut.";

  const contactRows = [
    row.pic_name ? `<li>PIC: ${escapeHtml(row.pic_name)}</li>` : "",
    row.email_contact ? `<li>Email: <a href="mailto:${escapeAttr(row.email_contact)}">${escapeHtml(row.email_contact)}</a></li>` : "",
    ...phoneContacts.map((contact) => generatePhoneContactRow(contact, row, isUnclaimed)),
    row.office_address ? generateOfficeAddressRow(row.office_address) : "",
  ].filter(Boolean);

  const contactList = contactRows.length ? `<ul>${contactRows.join("")}</ul>` : "";
  const linkList = links.length
    ? `<ul>${links.map((item) => `<li><a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a></li>`).join("")}</ul>`
    : "";
  const claimNote = isUnclaimed
    ? `<p class="franchise-contact-note"><strong>Pemilik brand?</strong> <a href="/daftar?claim=${escapeAttr(row.slug)}">Klaim listing ini</a> untuk mengelola nomor, alamat, dan informasi resmi.</p>`
    : "";

  return `<div class="franchise-contact-block"><p>${escapeHtml(lead)}</p>${contactList}${linkList}${claimNote}</div>`;
}

function parsePhoneContacts(value: unknown, defaultLabel: string, source: "whatsapp" | "phone"): ParsedPhoneContact[] {
  const text = normalizeText(value);
  if (!text) return [];

  const contacts: ParsedPhoneContact[] = [];
  const starts = findPhoneStarts(text);

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const nextStart = starts[index + 1] ?? text.length;
    const slice = text.slice(start, nextStart);
    const raw = slice.match(/^(?:\(\s*)?(?:\+?62|0)(?:[\s().-]*\d){5,15}/)?.[0];
    if (!raw) continue;

    const digits = raw.replace(/\D/g, "");
    const normalized = normalizeIndonesianDigits(digits);
    if (!isUsablePhoneNumber(normalized)) continue;

    const end = start + raw.length;
    const label = inferPhoneLabel(text, start, end, defaultLabel);
    const type = classifyPhone(normalized, label, source);
    contacts.push({
      label: label || defaultLabel,
      display: formatIndonesianPhone(normalized, type),
      href: `tel:+${toInternationalDigits(normalized)}`,
      whatsappHref: normalized.startsWith("08") ? `https://wa.me/${toInternationalDigits(normalized)}` : "",
      type,
    });
  }

  return contacts;
}

function findPhoneStarts(text: string) {
  const starts: number[] = [];
  const startPattern = /(?:\(\s*)?(?:\+?62|0)(?=[\s().-]*\d)/g;
  let match: RegExpExecArray | null;

  while ((match = startPattern.exec(text))) {
    const previous = text[match.index - 1] || "";
    if (/\d/.test(previous)) continue;
    starts.push(match.index);
  }

  return starts;
}

function inferPhoneLabel(text: string, start: number, end: number, fallback: string) {
  const before = text.slice(Math.max(0, start - 48), start);
  const after = text.slice(end, Math.min(text.length, end + 32));
  const afterParen = after.match(/^\s*\(([^()]{2,24})\)/);
  if (afterParen?.[1] && /[a-z]/i.test(afterParen[1])) return titleCaseLabel(afterParen[1]);

  const beforeColon = before.match(/([A-Za-z][A-Za-z\s./-]{1,28})\s*[:：]\s*$/);
  if (beforeColon?.[1]) return titleCaseLabel(beforeColon[1]);

  const keyword = before.match(/\b(marketing|whatsapp|wa|kantor|office|telp kantor|telepon kantor|telepon|telp|owner|admin|cp)\b\s*$/i);
  if (keyword?.[1]) return titleCaseLabel(keyword[1]);

  return fallback;
}

function classifyPhone(normalized: string, label: string, source: "whatsapp" | "phone"): ParsedPhoneContact["type"] {
  const lower = label.toLowerCase();
  if ((source === "whatsapp" || /\b(wa|whatsapp)\b/.test(lower)) && normalized.startsWith("08")) return "whatsapp";
  if (normalized.startsWith("08")) return "mobile";
  return "landline";
}

function normalizeIndonesianDigits(digits: string) {
  if (digits.startsWith("620")) return `0${digits.slice(3)}`;
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

function isUsablePhoneNumber(digits: string) {
  if (!/^0\d{7,13}$/.test(digits)) return false;
  return new Set(digits.split("")).size > 2;
}

function toInternationalDigits(normalized: string) {
  return normalized.startsWith("0") ? `62${normalized.slice(1)}` : normalized;
}

function formatIndonesianPhone(normalized: string, type: ParsedPhoneContact["type"]) {
  if (type === "landline") {
    const areaLength = normalized.startsWith("021") ? 3 : normalized.startsWith("02") || normalized.startsWith("03") || normalized.startsWith("04") ? 4 : 3;
    const area = normalized.slice(0, areaLength);
    const local = normalized.slice(areaLength);
    return `(${area}) ${groupDigits(local, 4)}`;
  }
  return groupDigits(normalized, 4);
}

function groupDigits(value: string, size: number) {
  const groups: string[] = [];
  for (let index = 0; index < value.length; index += size) groups.push(value.slice(index, index + size));
  return groups.join(" ");
}

function titleCaseLabel(label: string) {
  const normalized = normalizeText(label).replace(/[./-]+/g, " ");
  const aliases: Record<string, string> = {
    wa: "WhatsApp",
    whatsapp: "WhatsApp",
    telp: "Telepon",
    telepon: "Telepon",
    kantor: "Kantor",
    office: "Kantor",
    "telp kantor": "Telepon Kantor",
    "telepon kantor": "Telepon Kantor",
    cp: "CP",
  };
  const key = normalized.toLowerCase();
  if (aliases[key]) return aliases[key];
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function generatePhoneContactRow(contact: ParsedPhoneContact, row: FranchiseStaticRow, isUnclaimed: boolean) {
  const icon = contact.type === "whatsapp" ? "fab fa-whatsapp" : contact.type === "mobile" ? "fas fa-mobile-alt" : "fas fa-phone-alt";
  const claimMessageHref = isUnclaimed && contact.whatsappHref ? generateWhatsAppClaimHref(contact.whatsappHref, row) : "";
  const claimMessageLink = claimMessageHref
    ? ` <a class="franchise-whatsapp-claim-link" href="${escapeAttr(claimMessageHref)}" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp" aria-hidden="true"></i> Kirim info klaim</a>`
    : "";
  return `<li class="franchise-phone-contact franchise-phone-${escapeAttr(contact.type)}"><span><i class="${icon}" aria-hidden="true"></i>${escapeHtml(contact.label)}:</span> <a href="${escapeAttr(contact.href)}">${escapeHtml(contact.display)}</a>${claimMessageLink}</li>`;
}

function generateOfficeAddressRow(address: string) {
  return `<li class="franchise-office-address"><span><i class="fas fa-map-marker-alt" aria-hidden="true"></i>Alamat kantor:</span> ${escapeHtml(address)}</li>`;
}

function generateWhatsAppClaimHref(baseHref: string, row: FranchiseStaticRow) {
  const brandName = normalizeText(row.brand_name);
  const category = normalizeText(row.category) || "franchise";
  const listingUrl = `https://franchisee.id/peluang-usaha/${row.slug}`;
  const claimUrl = `https://franchisee.id/daftar?claim=${row.slug}`;
  const message = [
    `Halo, saya menemukan listing ${brandName} (${category}) di Franchisee.id: ${listingUrl}.`,
    `Status listing ini belum diklaim, jadi data franchise, kontak, dan alamatnya belum dikelola langsung oleh pemilik brand.`,
    `Mohon tim/pemilik ${brandName} klaim listing ini agar informasi publiknya bisa diperbarui resmi: ${claimUrl}`,
  ].join(" ");
  return `${baseHref}?text=${encodeURIComponent(message)}`;
}
