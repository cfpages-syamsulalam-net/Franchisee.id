export const OUTREACH_PIPELINE_STATUSES = [
  {
    value: "uncontacted",
    label: "Uncontacted",
    short_label: "Uncontacted",
    description: "Belum ada kontak yang dicatat.",
    next_action: "Simpan kontak",
    next_action_detail: "Simpan nama dan nomor ke Google Contacts agar nama brand muncul saat staff mengirim WhatsApp.",
    sla_days: 1,
    icon: "fas fa-inbox",
    tone: "neutral",
  },
  {
    value: "saved_contact",
    label: "Saved Contact",
    short_label: "Saved",
    description: "Nama dan nomor sudah disimpan ke kontak staff.",
    next_action: "Kirim WhatsApp",
    next_action_detail: "Buka WhatsApp, kirim pesan klaim listing, lalu catat terkirim di dashboard.",
    sla_days: 0,
    icon: "fas fa-address-book",
    tone: "info",
  },
  {
    value: "contacted",
    label: "Contacted",
    short_label: "Contacted",
    description: "Pesan pertama sudah dikirim.",
    next_action: "Follow-up balasan",
    next_action_detail: "Tunggu balasan. Jika lewat 3 hari kerja, kirim follow-up singkat.",
    sla_days: 3,
    icon: "fas fa-paper-plane",
    tone: "info",
  },
  {
    value: "responded",
    label: "Responded",
    short_label: "Responded",
    description: "Franchisor sudah membalas.",
    next_action: "Kualifikasi brand",
    next_action_detail: "Pastikan kontak benar, pengambil keputusan jelas, dan minat klaim/Premium terkonfirmasi.",
    sla_days: 2,
    icon: "fas fa-reply",
    tone: "good",
  },
  {
    value: "qualified",
    label: "Qualified",
    short_label: "Qualified",
    description: "Kontak valid dan punya peluang lanjut.",
    next_action: "Dorong klaim",
    next_action_detail: "Kirim link klaim dan bantu brand memahami manfaat klaim gratis sebelum pitch Premium.",
    sla_days: 3,
    icon: "fas fa-filter",
    tone: "good",
  },
  {
    value: "claim_started",
    label: "Claim Started",
    short_label: "Claim",
    description: "Proses klaim listing sudah dimulai.",
    next_action: "Bantu klaim",
    next_action_detail: "Pantau bukti klaim, bantu admin menyelesaikan mismatch, dan follow-up jika dokumen kurang.",
    sla_days: 2,
    icon: "fas fa-flag",
    tone: "warning",
  },
  {
    value: "claimed",
    label: "Claimed",
    short_label: "Claimed",
    description: "Listing sudah diklaim atau punya owner.",
    next_action: "Tawarkan Premium",
    next_action_detail: "Gunakan readiness, listing quality, dan sinyal lead untuk menawarkan subscription.",
    sla_days: 7,
    icon: "fas fa-store",
    tone: "good",
  },
  {
    value: "subscribed",
    label: "Subscribed",
    short_label: "Subscribed",
    description: "Brand sedang punya subscription aktif.",
    next_action: "Monitor renewal",
    next_action_detail: "Pastikan listing Premium tetap lengkap dan renewal disiapkan sebelum masa aktif berakhir.",
    sla_days: null,
    icon: "fas fa-crown",
    tone: "premium",
  },
  {
    value: "renewal_risk",
    label: "Renewal Risk",
    short_label: "Risk",
    description: "Subscription perlu follow-up renewal.",
    next_action: "Pulihkan renewal",
    next_action_detail: "Hubungi owner, cek kendala, dan arahkan ke renewal. Jika tetap hilang, pindahkan ke Burned dengan alasan.",
    sla_days: 7,
    icon: "fas fa-hourglass-half",
    tone: "warning",
  },
  {
    value: "burned",
    label: "Burned",
    short_label: "Burned",
    description: "Tidak lanjut, tidak respons, atau tidak renew.",
    next_action: "Tutup dengan alasan",
    next_action_detail: "Pastikan alasan burned tercatat agar tidak terus difollow-up tanpa konteks.",
    sla_days: null,
    icon: "fas fa-ban",
    tone: "bad",
  },
];

export const OUTREACH_PIPELINE_STATUS_VALUES = OUTREACH_PIPELINE_STATUSES.map((status) => status.value);

export const OUTREACH_BURNED_REASONS = [
  { value: "no_response", label: "Tidak respons" },
  { value: "invalid_contact", label: "Kontak tidak valid" },
  { value: "not_interested", label: "Tidak berminat" },
  { value: "not_owner", label: "Bukan owner/decision maker" },
  { value: "duplicate_or_closed", label: "Duplikat / brand tutup" },
  { value: "subscription_churn", label: "Tidak renew subscription" },
  { value: "other", label: "Lainnya" },
];

export const OUTREACH_BURNED_REASON_VALUES = OUTREACH_BURNED_REASONS.map((reason) => reason.value);

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
