import { parseWhatsAppContacts, normalizeText } from "./_dashboard-utils.js";

const CONTACT_LABELS = {
  phone: "Telepon",
  whatsapp: "WhatsApp",
  email: "Email",
  website: "Website",
  address: "Alamat",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

const SOCIAL_FIELDS = [
  ["instagram", "instagram_url"],
  ["facebook", "facebook_url"],
  ["tiktok", "tiktok_url"],
  ["youtube", "youtube_url"],
  ["linkedin", "linkedin_url"],
];

export function buildNormalizedContacts(row) {
  const contacts = [];
  addPhoneContacts(contacts, row.phone, "phone", "phone");
  addPhoneContacts(contacts, row.whatsapp, "whatsapp", "whatsapp");
  addEmailContact(contacts, row.email_contact, "email_contact");
  addUrlContact(contacts, "website", row.website_url, "website_url");
  addAddressContact(contacts, row.office_address, "office_address");

  SOCIAL_FIELDS.forEach(([type, field]) => {
    addUrlContact(contacts, type, row[field], field);
  });

  return dedupeContacts(contacts);
}

export function hasInvalidContactUrl(row) {
  return ["website_url", "instagram_url", "facebook_url", "tiktok_url", "youtube_url", "linkedin_url"].some((field) => {
    const value = normalizeText(row[field]);
    return value && !normalizeExternalUrl(value, field);
  });
}

export function normalizeExternalUrl(value, field = "") {
  const text = normalizeText(value);
  if (!text) return "";

  if (field === "instagram_url" && text.startsWith("@")) {
    return `https://www.instagram.com/${encodeURIComponent(text.slice(1))}`;
  }

  const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch (_error) {
    return "";
  }
}

function addPhoneContacts(contacts, value, type, sourceField) {
  const parsed = parseWhatsAppContacts(value);
  parsed.forEach((contact, index) => {
    contacts.push({
      contact_type: type,
      label: contact.label || CONTACT_LABELS[type],
      value: contact.display,
      normalized_value: contact.international_digits,
      url: `https://wa.me/${contact.international_digits}`,
      source_field: sourceField,
      confidence: "high",
      is_primary: index === 0 ? 1 : 0,
    });
  });
}

function addEmailContact(contacts, value, sourceField) {
  const email = normalizeText(value).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  contacts.push({
    contact_type: "email",
    label: CONTACT_LABELS.email,
    value: email,
    normalized_value: email,
    url: `mailto:${email}`,
    source_field: sourceField,
    confidence: "high",
    is_primary: 0,
  });
}

function addUrlContact(contacts, type, value, sourceField) {
  const url = normalizeExternalUrl(value, sourceField);
  if (!url) return;
  contacts.push({
    contact_type: type,
    label: CONTACT_LABELS[type] || type,
    value: normalizeText(value),
    normalized_value: url.toLowerCase(),
    url,
    source_field: sourceField,
    confidence: "high",
    is_primary: type === "website" ? 1 : 0,
  });
}

function addAddressContact(contacts, value, sourceField) {
  const text = normalizeText(value);
  if (!text) return;
  contacts.push({
    contact_type: "address",
    label: CONTACT_LABELS.address,
    value: text,
    normalized_value: text.toLowerCase(),
    url: "",
    source_field: sourceField,
    confidence: "medium",
    is_primary: 1,
  });
}

function dedupeContacts(contacts) {
  const seen = new Set();
  return contacts.filter((contact) => {
    const key = [contact.contact_type, contact.normalized_value].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
