import type { FranchiseStaticRow } from "./franchise-static";
import {
  formatInternationalPhone as formatInternationalPhoneFromMetadata,
  internationalMobileRuleForDigits,
} from "./country-metadata";
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
      ? "Data kontak publik di bawah ini belum dikelola langsung oleh pemilik brand."
      : "Kontak publik belum tersedia."
    : hasPublicContact
      ? "Gunakan kontak resmi brand untuk informasi kemitraan lebih lanjut."
      : "Silakan hubungi tim acquisition untuk informasi lebih lanjut.";

  const contactRows = [
    row.pic_name ? `<li>PIC: ${escapeHtml(row.pic_name)}</li>` : "",
    row.email_contact ? `<li>Email: <a href="mailto:${escapeAttr(row.email_contact)}">${escapeHtml(row.email_contact)}</a></li>` : "",
    ...phoneContacts.map((contact) => generatePhoneContactRow(contact)),
    row.office_address ? generateOfficeAddressRow(row.office_address) : "",
  ].filter(Boolean);

  const contactList = contactRows.length ? `<ul>${contactRows.join("")}</ul>` : "";
  const linkList = links.length
    ? `<ul>${links.map((item) => `<li><a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a></li>`).join("")}</ul>`
    : "";
  return `<div class="franchise-contact-block"><p>${escapeHtml(lead)}</p>${contactList}${linkList}</div>`;
}

export function replaceLegacyFloatingContacts(html: string, row: FranchiseStaticRow) {
  const whatsapp = parsePhoneContacts(row.whatsapp || row.phone, "WhatsApp", "whatsapp").find((contact) => contact.whatsappHref);
  const phone = parsePhoneContacts(row.phone, "Telepon", "phone").find((contact) => contact.href !== whatsapp?.href);
  const contactName = normalizeText(row.pic_name) || normalizeText(row.brand_name);
  const buttons = [
    whatsapp
      ? `<a class="fr-brand-contact-float is-whatsapp" href="${escapeAttr(whatsapp.whatsappHref)}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp ${escapeAttr(contactName)}"><i class="fab fa-whatsapp" aria-hidden="true"></i><span>${escapeHtml(whatsapp.display)}${contactName ? ` (${escapeHtml(contactName)})` : ""}</span></a>`
      : "",
    phone
      ? `<a class="fr-brand-contact-float is-phone" href="${escapeAttr(phone.href)}" aria-label="Telepon ${escapeAttr(contactName)}"><i class="fas fa-phone" aria-hidden="true"></i><span>${escapeHtml(phone.display)}${contactName ? ` (${escapeHtml(contactName)})` : ""}</span></a>`
      : "",
  ].filter(Boolean);
  const replacement = buttons.length ? `<div class="fr-brand-contact-floats" aria-label="Kontak brand">${buttons.join("")}</div>` : "";

  return html
    .replace(/<div class="whatsapp-floating"[\s\S]*?<\/div>/, replacement)
    .replace(/<div class="tlp-floating"[\s\S]*?<\/div>/, "");
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
    const raw = matchPhoneCandidate(slice);
    if (!raw) continue;

    const parsed = normalizePhoneDigits(raw);
    if (!parsed) continue;

    const end = start + raw.length;
    const label = inferPhoneLabel(text, start, end, defaultLabel);
    const type = classifyPhone(parsed, label, source);
    contacts.push({
      label: label || defaultLabel,
      display: formatPhoneDisplay(parsed, type),
      href: toPhoneHref(parsed),
      whatsappHref: parsed.canUseWhatsApp ? `https://wa.me/${parsed.internationalDigits}` : "",
      type,
    });
  }

  return contacts;
}

function findPhoneStarts(text: string) {
  const starts: number[] = [];
  const startPattern = /(?:\(\s*)?(?:(?:\+?\s*62|0)(?=[\s().-]*[2-9])|\+?\s*886(?=[\s().-]*9)|\+?\s*852(?=[\s().-]*[569])|\+?\s*853(?=[\s().-]*6)|\+?\s*84(?=[\s().-]*[35789])|\+?\s*86(?=[\s().-]*1)|\+?\s*65(?=[\s().-]*[689])|\+?\s*60(?=[\s().-]*1)|\+?\s*673(?=[\s().-]*[78])|\+?\s*855(?=[\s().-]*[1-9])|\+?\s*670(?=[\s().-]*7)|\+?\s*856(?=[\s().-]*2[\s().-]*0)|\+?\s*95(?=[\s().-]*9)|\+?\s*63(?=[\s().-]*9)|\+?\s*66(?=[\s().-]*[689])|\+?\s*81(?=[\s().-]*[789][\s().-]*0)|\+?\s*82(?=[\s().-]*1[\s().-]*0)|\+?\s*91(?=[\s().-]*[6-9])|\+?\s*880(?=[\s().-]*1)|\+?\s*92(?=[\s().-]*3)|\+?\s*94(?=[\s().-]*7)|\+?\s*977(?=[\s().-]*9)|1(?=[\s().-]*5[\s().-]*0[\s().-]*0[\s().-]*\d))/g;
  let match: RegExpExecArray | null;

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

function isGroupedNonMobileStart(text: string, start: number) {
  return /^(?:\(\s*)?0[\s().-]*[2-79]/.test(text.slice(start));
}

function matchPhoneCandidate(value: string) {
  return (
    value.match(/^(?:\(\s*)?(?:\+?\s*62|0)\s*8(?:[\s().-]*\d){8,11}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*886\s*9(?:[\s().-]*\d){8}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*852\s*[569](?:[\s().-]*\d){7}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*853\s*6(?:[\s().-]*\d){7}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*84\s*[35789](?:[\s().-]*\d){8}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*86\s*1(?:[\s().-]*\d){10}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*65\s*[689](?:[\s().-]*\d){7}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*60\s*1(?:[\s().-]*\d){7,9}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*673\s*[78](?:[\s().-]*\d){6}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*855\s*[1-9](?:[\s().-]*\d){7,8}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*670\s*7(?:[\s().-]*\d){6,7}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*856\s*2[\s().-]*0(?:[\s().-]*\d){8}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*95\s*9(?:[\s().-]*\d){7,9}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*63\s*9(?:[\s().-]*\d){9}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*66\s*[689](?:[\s().-]*\d){8}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*81\s*[789][\s().-]*0(?:[\s().-]*\d){8}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*82\s*1[\s().-]*0(?:[\s().-]*\d){8}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*91\s*[6-9](?:[\s().-]*\d){9}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*880\s*1(?:[\s().-]*\d){9}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*92\s*3(?:[\s().-]*\d){9}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*94\s*7(?:[\s().-]*\d){8}/)?.[0] ||
    value.match(/^(?:\(\s*)?\+?\s*977\s*9[\s().-]*[78](?:[\s().-]*\d){8}/)?.[0] ||
    value.match(/^(?:\(\s*)?(?:\+?\s*62|0)\s*[2-9](?:[\s().-]*\d){6,11}/)?.[0] ||
    value.match(/^1(?:[\s().-]*\d){5,7}/)?.[0] ||
    ""
  );
}

function inferPhoneLabel(text: string, start: number, end: number, fallback: string) {
  const before = text.slice(Math.max(0, start - 48), start);
  const after = text.slice(end, Math.min(text.length, end + 32));
  const afterParen = after.match(/^\s*\(([^()]{2,24})\)/);
  if (afterParen?.[1] && /[a-z]/i.test(afterParen[1])) return titleCaseLabel(afterParen[1]);

  const beforeColon = before.match(/([A-Za-z][A-Za-z\s./-]{1,28})\s*[:：]\s*$/);
  if (beforeColon?.[1]) return titleCaseLabel(beforeColon[1]);

  const keyword = before.match(/\b(call center|marketing|whatsapp|wa|kantor|office|telp kantor|telepon kantor|telepon|telp|owner|admin|cp)\b\s*$/i);
  if (keyword?.[1]) return titleCaseLabel(keyword[1]);

  return fallback;
}

function classifyPhone(parsed: NormalizedPhoneDigits, label: string, source: "whatsapp" | "phone"): ParsedPhoneContact["type"] {
  const lower = label.toLowerCase();
  if ((source === "whatsapp" || /\b(wa|whatsapp)\b/.test(lower)) && parsed.canUseWhatsApp) return "whatsapp";
  if (parsed.kind === "mobile" || parsed.kind === "international_mobile") return "mobile";
  return "landline";
}

interface NormalizedPhoneDigits {
  countryCode: string;
  localDigits: string;
  internationalDigits: string;
  kind: "mobile" | "international_mobile" | "landline" | "call_center";
  canUseWhatsApp: boolean;
}

function normalizePhoneDigits(value: string): NormalizedPhoneDigits | null {
  const digits = value.replace(/\D/g, "");
  if (!hasUsefulDigitVariety(digits)) return null;

  if (digits.startsWith("0")) {
    if (!/^08/.test(digits)) {
      if (!isIndonesianLandline(digits)) return null;
      return {
        countryCode: "62",
        localDigits: digits,
        internationalDigits: `62${digits.slice(1)}`,
        kind: "landline",
        canUseWhatsApp: false,
      };
    }

    if (!/^08\d{8,11}$/.test(digits)) return null;
    return {
      countryCode: "62",
      localDigits: digits,
      internationalDigits: `62${digits.slice(1)}`,
      kind: "mobile",
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
      kind: "mobile",
      canUseWhatsApp: true,
    };
  }

  if (digits.startsWith("62")) {
    if (/^628\d{8,11}$/.test(digits)) {
      return {
        countryCode: "62",
        localDigits: `0${digits.slice(2)}`,
        internationalDigits: digits,
        kind: "mobile",
        canUseWhatsApp: true,
      };
    }

    const landlineLocal = `0${digits.slice(2)}`;
    if (!isIndonesianLandline(landlineLocal)) return null;
    return {
      countryCode: "62",
      localDigits: landlineLocal,
      internationalDigits: digits,
      kind: "landline",
      canUseWhatsApp: false,
    };
  }

  if (isIndonesianLandline(digits)) {
    return {
      countryCode: "62",
      localDigits: digits,
      internationalDigits: `62${digits.slice(1)}`,
      kind: "landline",
      canUseWhatsApp: false,
    };
  }

  const internationalRule = internationalMobileRuleForDigits(digits);
  if (internationalRule) return normalizeInternationalMobile(digits, internationalRule.countryCode, internationalRule.localDigits);

  if (/^1500\d{3,5}$/.test(digits)) {
    return {
      countryCode: "",
      localDigits: digits,
      internationalDigits: digits,
      kind: "call_center",
      canUseWhatsApp: false,
    };
  }

  return null;
}

function formatPhoneDisplay(parsed: NormalizedPhoneDigits, _type: ParsedPhoneContact["type"]) {
  if (parsed.kind === "international_mobile") {
    return formatInternationalPhone(parsed.countryCode, parsed.localDigits);
  }

  if (parsed.kind === "call_center") return groupDigits(parsed.localDigits, 4);
  if (parsed.kind === "landline") return formatIndonesianLandline(parsed.localDigits);
  return groupDigits(parsed.localDigits, 4);
}

function toPhoneHref(parsed: NormalizedPhoneDigits) {
  return parsed.kind === "call_center" ? `tel:${parsed.localDigits}` : `tel:+${parsed.internationalDigits}`;
}

function hasUsefulDigitVariety(digits: string) {
  return new Set(digits.split("")).size > 2;
}

function normalizeInternationalMobile(
  digits: string,
  countryCode: string,
  localDigits: string,
): NormalizedPhoneDigits | null {
  return {
    countryCode,
    localDigits,
    internationalDigits: digits,
    kind: "international_mobile",
    canUseWhatsApp: true,
  };
}

function formatInternationalPhone(countryCode: NormalizedPhoneDigits["countryCode"], localDigits: string) {
  return formatInternationalPhoneFromMetadata(countryCode, localDigits);
}

function isIndonesianLandline(digits: string) {
  return /^0[2-9]\d{7,11}$/.test(digits) && !/^08/.test(digits);
}

function formatIndonesianLandline(localDigits: string) {
  const areaLength = localDigits.startsWith("021") ? 3 : /^0[2-9]\d{2}/.test(localDigits) ? 4 : 3;
  const area = localDigits.slice(0, areaLength);
  const local = localDigits.slice(areaLength);
  return `(${area}) ${groupDigits(local, 4)}`;
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
    "call center": "Call Center",
    cp: "CP",
  };
  const key = normalized.toLowerCase();
  if (aliases[key]) return aliases[key];
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function generatePhoneContactRow(contact: ParsedPhoneContact) {
  const icon = contact.type === "whatsapp" ? "fab fa-whatsapp" : contact.type === "mobile" ? "fas fa-mobile-alt" : "fas fa-phone-alt";
  return `<li class="franchise-phone-contact franchise-phone-${escapeAttr(contact.type)}"><span><i class="${icon}" aria-hidden="true"></i>${escapeHtml(contact.label)}:</span> <a href="${escapeAttr(contact.href)}">${escapeHtml(contact.display)}</a></li>`;
}

function generateOfficeAddressRow(address: string) {
  return `<li class="franchise-office-address"><span><i class="fas fa-map-marker-alt" aria-hidden="true"></i>Alamat kantor:</span> ${escapeHtml(address)}</li>`;
}
