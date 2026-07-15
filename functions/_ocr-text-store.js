const TEXT_BUCKET_BINDING = "FRANCHISE_ASSETS";
const TEXT_BUCKET_LABEL = "FRANCHISE_ASSETS";
const TEXT_PREVIEW_CHARS = 1200;
const TEXT_OBJECT_PREFIX = "ocr-text";

export function ocrTextPreview(text, maxChars = TEXT_PREVIEW_CHARS) {
  return String(text || "").slice(0, maxChars);
}

export async function storeOcrTextObject(env, input = {}) {
  const text = String(input.text || "");
  const preview = ocrTextPreview(text);
  const length = text.length;
  if (!text) {
    return {
      bucket: null,
      key: null,
      preview: "",
      length: 0,
      legacyText: "",
      storedInR2: false,
    };
  }

  const bucket = env?.[TEXT_BUCKET_BINDING];
  if (!bucket || typeof bucket.put !== "function") {
    return {
      bucket: null,
      key: null,
      preview,
      length,
      legacyText: text,
      storedInR2: false,
    };
  }

  const key = input.key || buildOcrTextKey(input);
  await bucket.put(key, text, {
    httpMetadata: {
      contentType: "text/plain; charset=utf-8",
      cacheControl: "private, max-age=31536000",
    },
    customMetadata: compactMetadata({
      franchise_id: input.franchiseId,
      asset_id: input.assetId,
      content_hash: input.contentHash,
      kind: input.kind || "ocr",
      extraction_method: input.method,
    }),
  });

  return {
    bucket: TEXT_BUCKET_LABEL,
    key,
    preview,
    length,
    legacyText: "",
    storedInR2: true,
  };
}

export async function readOcrTextObject(env, row = {}, fallbackField = "source_text") {
  const key = row.source_text_r2_key || row.text_r2_key || row.r2_key || "";
  const bucketBinding = row.source_text_r2_bucket || row.text_r2_bucket || row.r2_bucket || TEXT_BUCKET_LABEL;
  const bucket = bucketBinding === TEXT_BUCKET_LABEL ? env?.[TEXT_BUCKET_BINDING] : null;
  if (key && bucket && typeof bucket.get === "function") {
    const object = await bucket.get(key);
    if (object) return object.text();
  }
  return String(row[fallbackField] || row.source_text_preview || row.text_preview || "");
}

export function buildOcrTextKey(input = {}) {
  const franchise = slugPart(input.franchiseId || "unknown-franchise");
  const asset = slugPart(input.assetId || input.contentHash || randomId());
  const kind = slugPart(input.kind || "ocr");
  const suffix = input.contentHash ? slugPart(input.contentHash).slice(0, 32) : randomId();
  return `franchises/${franchise}/${TEXT_OBJECT_PREFIX}/${asset}-${kind}-${suffix}.txt`;
}

function compactMetadata(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null && value !== undefined && String(value) !== ""));
}

function slugPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "item";
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}
