export const DEFAULT_COUNTRY_NAME = "Indonesia";

export const COUNTRY_METADATA = [
  { name: "Indonesia", iso2: "ID", flag: "🇮🇩", dialCode: "+62", aliases: ["id", "indonesia", "republic of indonesia"], whatsappDigits: [9, 13], internationalMobilePattern: "8\\d{8,11}", displayGroups: [4] },
  { name: "Malaysia", iso2: "MY", flag: "🇲🇾", dialCode: "+60", aliases: ["my", "malaysia"], whatsappDigits: [8, 10], internationalMobilePattern: "1\\d{7,9}", displayGroups: [2, 4] },
  { name: "Singapore", iso2: "SG", flag: "🇸🇬", dialCode: "+65", aliases: ["sg", "singapore", "singapura"], whatsappDigits: [8, 8], internationalMobilePattern: "[689]\\d{7}", displayGroups: [4, 4] },
  { name: "Brunei", iso2: "BN", flag: "🇧🇳", dialCode: "+673", aliases: ["bn", "brunei"], whatsappDigits: [7, 7], internationalMobilePattern: "[78]\\d{6}", displayGroups: [4] },
  { name: "Cambodia", iso2: "KH", flag: "🇰🇭", dialCode: "+855", aliases: ["kh", "cambodia", "kamboja"], whatsappDigits: [8, 9], internationalMobilePattern: "[1-9]\\d{7,8}", displayGroups: [4] },
  { name: "Timor-Leste", iso2: "TL", flag: "🇹🇱", dialCode: "+670", aliases: ["tl", "timor leste", "timor-leste"], whatsappDigits: [7, 8], internationalMobilePattern: "7\\d{6,7}", displayGroups: [4] },
  { name: "Laos", iso2: "LA", flag: "🇱🇦", dialCode: "+856", aliases: ["la", "laos"], whatsappDigits: [10, 10], internationalMobilePattern: "20\\d{8}", displayGroups: [4] },
  { name: "Myanmar", iso2: "MM", flag: "🇲🇲", dialCode: "+95", aliases: ["mm", "myanmar"], whatsappDigits: [8, 10], internationalMobilePattern: "9\\d{7,9}", displayGroups: [4] },
  { name: "Philippines", iso2: "PH", flag: "🇵🇭", dialCode: "+63", aliases: ["ph", "philippines", "filipina"], whatsappDigits: [10, 10], internationalMobilePattern: "9\\d{9}", displayGroups: [4] },
  { name: "Thailand", iso2: "TH", flag: "🇹🇭", dialCode: "+66", aliases: ["th", "thailand"], whatsappDigits: [9, 9], internationalMobilePattern: "[689]\\d{8}", displayGroups: [4] },
  { name: "Vietnam", iso2: "VN", flag: "🇻🇳", dialCode: "+84", aliases: ["vn", "vietnam"], whatsappDigits: [9, 10], internationalMobilePattern: "[35789]\\d{8}", displayGroups: [3, 3] },
  { name: "China", iso2: "CN", flag: "🇨🇳", dialCode: "+86", aliases: ["cn", "china"], whatsappDigits: [11, 11], internationalMobilePattern: "1\\d{10}", displayGroups: [3, 4] },
  { name: "Hong Kong", iso2: "HK", flag: "🇭🇰", dialCode: "+852", aliases: ["hk", "hong kong", "hongkong"], whatsappDigits: [8, 8], internationalMobilePattern: "[569]\\d{7}", displayGroups: [4, 4] },
  { name: "Macau", iso2: "MO", flag: "🇲🇴", dialCode: "+853", aliases: ["mo", "macau", "makau"], whatsappDigits: [8, 8], internationalMobilePattern: "6\\d{7}", displayGroups: [4, 4] },
  { name: "Taiwan", iso2: "TW", flag: "🇹🇼", dialCode: "+886", aliases: ["tw", "taiwan"], whatsappDigits: [9, 9], internationalMobilePattern: "9\\d{8}", displayGroups: [3, 3] },
  { name: "Japan", iso2: "JP", flag: "🇯🇵", dialCode: "+81", aliases: ["jp", "japan", "jepang"], whatsappDigits: [10, 10], internationalMobilePattern: "[789]0\\d{8}", displayGroups: [4] },
  { name: "South Korea", iso2: "KR", flag: "🇰🇷", dialCode: "+82", aliases: ["kr", "korea", "south korea", "korea selatan"], whatsappDigits: [10, 10], internationalMobilePattern: "10\\d{8}", displayGroups: [4] },
  { name: "India", iso2: "IN", flag: "🇮🇳", dialCode: "+91", aliases: ["in", "india"], whatsappDigits: [10, 10], internationalMobilePattern: "[6-9]\\d{9}", displayGroups: [4] },
  { name: "Bangladesh", iso2: "BD", flag: "🇧🇩", dialCode: "+880", aliases: ["bd", "bangladesh"], whatsappDigits: [10, 10], internationalMobilePattern: "1\\d{9}", displayGroups: [4] },
  { name: "Pakistan", iso2: "PK", flag: "🇵🇰", dialCode: "+92", aliases: ["pk", "pakistan"], whatsappDigits: [10, 10], internationalMobilePattern: "3\\d{9}", displayGroups: [4] },
  { name: "Sri Lanka", iso2: "LK", flag: "🇱🇰", dialCode: "+94", aliases: ["lk", "sri lanka"], whatsappDigits: [9, 9], internationalMobilePattern: "7\\d{8}", displayGroups: [4] },
  { name: "Nepal", iso2: "NP", flag: "🇳🇵", dialCode: "+977", aliases: ["np", "nepal"], whatsappDigits: [10, 10], internationalMobilePattern: "9[78]\\d{8}", displayGroups: [4] },
  { name: "United States", iso2: "US", flag: "🇺🇸", dialCode: "+1", aliases: ["us", "usa", "united states", "amerika serikat"], whatsappDigits: [10, 10], internationalMobilePattern: "[2-9]\\d{9}", displayGroups: [3, 3] },
  { name: "Australia", iso2: "AU", flag: "🇦🇺", dialCode: "+61", aliases: ["au", "australia"], whatsappDigits: [9, 9], internationalMobilePattern: "4\\d{8}", displayGroups: [4] },
];

export const COUNTRY_CODE_OPTIONS = COUNTRY_METADATA.map((country) => ({
  code: country.dialCode,
  label: `${country.flag} ${country.iso2} ${country.dialCode}`,
}));

export const COUNTRY_SELECT_OPTIONS = COUNTRY_METADATA.map((country) => ({
  value: country.name,
  label: `${country.flag} ${country.name}`,
}));

const COUNTRY_BY_DIAL_CODE = new Map(COUNTRY_METADATA.map((country) => [country.dialCode, country]));
const COUNTRY_BY_ALIAS = new Map(
  COUNTRY_METADATA.flatMap((country) => [
    [normalizeCountryKey(country.name), country],
    [country.iso2.toLowerCase(), country],
    ...country.aliases.map((alias) => [normalizeCountryKey(alias), country]),
  ]),
);

export function normalizeDialCode(value) {
  const digits = (value || "").toString().replace(/\D/g, "");
  return `+${digits || "62"}`;
}

export function countryNameFromDialCode(value) {
  return COUNTRY_BY_DIAL_CODE.get(normalizeDialCode(value))?.name || null;
}

export function normalizeCountryName(value) {
  const raw = (value || "").toString().replace(/\s+/g, " ").trim();
  if (!raw) return "";
  return COUNTRY_BY_ALIAS.get(normalizeCountryKey(raw))?.name || raw;
}

export function countryDisplay(value) {
  const country = COUNTRY_BY_ALIAS.get(normalizeCountryKey(value)) || COUNTRY_METADATA.find((item) => item.name === value);
  const name = country?.name || normalizeCountryName(value);
  return country?.flag ? `${country.flag} ${name}` : name;
}

export function whatsappDigitRangeForDialCode(value) {
  const country = COUNTRY_BY_DIAL_CODE.get(normalizeDialCode(value));
  return country?.whatsappDigits || [8, 13];
}

export function internationalMobileRuleForDigits(digits) {
  for (const country of COUNTRY_METADATA_SORTED_BY_DIAL_LENGTH) {
    const dialDigits = country.dialCode.replace(/\D/g, "");
    if (dialDigits === "62" || !digits.startsWith(dialDigits)) continue;
    const localDigits = digits.slice(dialDigits.length);
    if (!new RegExp(`^${country.internationalMobilePattern}$`).test(localDigits)) continue;
    return { countryCode: dialDigits, localDigits, country };
  }
  return null;
}

export function formatInternationalPhone(countryCode, localDigits) {
  const country = COUNTRY_METADATA.find((item) => item.dialCode.replace(/\D/g, "") === countryCode);
  if (!country) return `+${countryCode} ${groupDigits(localDigits, 4)}`;
  return `+${countryCode} ${formatLocalByGroups(localDigits, country.displayGroups)}`;
}

function normalizeCountryKey(value) {
  return (value || "").toString().toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
}

const COUNTRY_METADATA_SORTED_BY_DIAL_LENGTH = [...COUNTRY_METADATA].sort(
  (a, b) => b.dialCode.replace(/\D/g, "").length - a.dialCode.replace(/\D/g, "").length,
);

function formatLocalByGroups(value, groups) {
  const chunks = [];
  let offset = 0;
  for (const size of groups || []) {
    if (offset >= value.length) break;
    chunks.push(value.slice(offset, offset + size));
    offset += size;
  }
  if (offset < value.length) chunks.push(groupDigits(value.slice(offset), 4));
  return chunks.filter(Boolean).join(" ");
}

function groupDigits(value, size) {
  const groups = [];
  for (let index = 0; index < value.length; index += size) groups.push(value.slice(index, index + size));
  return groups.join(" ");
}
