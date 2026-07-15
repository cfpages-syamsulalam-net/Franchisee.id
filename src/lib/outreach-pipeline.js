export const OUTREACH_PIPELINE_STATUSES = [
  {
    value: "uncontacted",
    label: "Uncontacted",
    short_label: "Uncontacted",
    description: "Belum ada kontak yang dicatat.",
    icon: "fas fa-inbox",
    tone: "neutral",
  },
  {
    value: "saved_contact",
    label: "Saved Contact",
    short_label: "Saved",
    description: "Nama dan nomor sudah disimpan ke kontak staff.",
    icon: "fas fa-address-book",
    tone: "info",
  },
  {
    value: "contacted",
    label: "Contacted",
    short_label: "Contacted",
    description: "Pesan pertama sudah dikirim.",
    icon: "fas fa-paper-plane",
    tone: "info",
  },
  {
    value: "responded",
    label: "Responded",
    short_label: "Responded",
    description: "Franchisor sudah membalas.",
    icon: "fas fa-reply",
    tone: "good",
  },
  {
    value: "qualified",
    label: "Qualified",
    short_label: "Qualified",
    description: "Kontak valid dan punya peluang lanjut.",
    icon: "fas fa-filter",
    tone: "good",
  },
  {
    value: "claim_started",
    label: "Claim Started",
    short_label: "Claim",
    description: "Proses klaim listing sudah dimulai.",
    icon: "fas fa-flag",
    tone: "warning",
  },
  {
    value: "claimed",
    label: "Claimed",
    short_label: "Claimed",
    description: "Listing sudah diklaim atau punya owner.",
    icon: "fas fa-store",
    tone: "good",
  },
  {
    value: "subscribed",
    label: "Subscribed",
    short_label: "Subscribed",
    description: "Brand sedang punya subscription aktif.",
    icon: "fas fa-crown",
    tone: "premium",
  },
  {
    value: "renewal_risk",
    label: "Renewal Risk",
    short_label: "Risk",
    description: "Subscription perlu follow-up renewal.",
    icon: "fas fa-hourglass-half",
    tone: "warning",
  },
  {
    value: "burned",
    label: "Burned",
    short_label: "Burned",
    description: "Tidak lanjut, tidak respons, atau tidak renew.",
    icon: "fas fa-ban",
    tone: "bad",
  },
];

export const OUTREACH_PIPELINE_STATUS_VALUES = OUTREACH_PIPELINE_STATUSES.map((status) => status.value);

export const OUTREACH_EVENT_TO_PIPELINE_STATUS = {
  queued: "uncontacted",
  contacted: "contacted",
  replied: "responded",
  claim_started: "claim_started",
  claimed: "claimed",
  invalid_contact: "burned",
  no_response: "burned",
  note: "contacted",
};

export function normalizeOutreachPipelineStatus(value, fallback = "uncontacted") {
  const normalized = String(value || "").trim().toLowerCase();
  return OUTREACH_PIPELINE_STATUS_VALUES.includes(normalized) ? normalized : fallback;
}

export function outreachPipelineStatusMeta(value) {
  const status = normalizeOutreachPipelineStatus(value);
  return OUTREACH_PIPELINE_STATUSES.find((item) => item.value === status) || OUTREACH_PIPELINE_STATUSES[0];
}
