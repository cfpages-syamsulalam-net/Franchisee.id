import { credentialAad, decryptCredentialValue } from "./_ocr-credential-crypto.js";

const OCR_PROMPT = [
  "Extract every readable text from this franchise brochure page.",
  "Return plain text only. Preserve line breaks when useful.",
  "Do not summarize and do not add facts that are not visible.",
].join(" ");

const DEFAULTS = {
  ocr_space: {
    endpoint: "https://api.ocr.space/parse/image",
  },
  azure_vision: {
    apiVersion: "2024-02-01",
  },
  cloudflare_workers_ai: {
    model: "@cf/llava-hf/llava-1.5-7b-hf",
  },
  google_vision: {
    endpoint: "https://vision.googleapis.com/v1/images:annotate",
  },
  groq_vision: {
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
  },
  aws_textract: {
    service: "textract",
  },
  veryfi: {
    endpoint: "https://api.veryfi.com/api/v8/partner/documents",
  },
  mindee: {
    endpoint: "https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict",
  },
  pdf_co: {
    endpoint: "https://api.pdf.co/v1/pdf/convert/to/text",
  },
  api4ai: {
    endpoint: "https://ocr43.p.rapidapi.com/v1/results",
  },
};

export async function callOcrProvider(provider, image, env, options = {}) {
  const credentials = await decryptProviderCredentials(provider, env);
  const fetchImpl = options.fetchImpl || fetch;
  const key = provider.provider_key;

  if (key === "ocr_space") return callOcrSpace(provider, credentials, image, fetchImpl);
  if (key === "azure_vision") return callAzureVision(provider, credentials, image, fetchImpl);
  if (key === "cloudflare_workers_ai") return callCloudflareWorkersAi(provider, credentials, image, fetchImpl);
  if (key === "google_vision") return callGoogleVision(provider, credentials, image, fetchImpl);
  if (key === "groq_vision") return callGroqVision(provider, credentials, image, fetchImpl);
  if (key === "aws_textract") return callAwsTextract(provider, credentials, image, fetchImpl);
  if (key === "veryfi") return callVeryfi(provider, credentials, image, fetchImpl);
  if (key === "mindee") return callMindee(provider, credentials, image, fetchImpl);
  if (key === "pdf_co") return callPdfCo(provider, credentials, image, fetchImpl);
  if (key === "api4ai") return callApi4ai(provider, credentials, image, fetchImpl);

  throw adapterError("OCR_PROVIDER_UNSUPPORTED", `Provider OCR tidak didukung: ${key}`);
}

export function normalizeOcrText(value) {
  if (Array.isArray(value)) return normalizeOcrText(value.filter(Boolean).join("\n"));
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function decryptProviderCredentials(provider, env) {
  return {
    apiKey: await decryptCredentialValue(env.OCR_KEY, provider.api_key, credentialAad(provider.provider_key, "api_key")),
    apiSecret: await decryptCredentialValue(env.OCR_KEY, provider.api_secret, credentialAad(provider.provider_key, "api_secret")),
  };
}

async function callOcrSpace(provider, credentials, image, fetchImpl) {
  requireValue(credentials.apiKey, "OCR_SPACE_API_KEY_REQUIRED");
  const form = new FormData();
  form.set("apikey", credentials.apiKey);
  form.set("base64Image", dataUri(image));
  form.set("isOverlayRequired", "false");
  form.set("OCREngine", "2");
  form.set("scale", "true");
  form.set("language", "auto");

  const response = await fetchJson(fetchImpl, endpoint(provider, "ocr_space"), { method: "POST", body: form });
  if (response.json?.IsErroredOnProcessing) {
    throw adapterError("OCR_SPACE_ERROR", firstText(response.json.ErrorMessage || response.json.ErrorDetails) || "OCR.Space gagal memproses gambar.", response.status);
  }
  return providerResult("ocr_space", response.status, normalizeOcrText((response.json?.ParsedResults || []).map((item) => item.ParsedText)));
}

async function callAzureVision(provider, credentials, image, fetchImpl) {
  requireValue(credentials.apiKey, "AZURE_VISION_KEY_REQUIRED");
  const base = String(provider.endpoint_url || "").replace(/\/+$/, "");
  requireValue(base, "AZURE_VISION_ENDPOINT_REQUIRED");
  const url = `${base}/computervision/imageanalysis:analyze?features=read&api-version=${DEFAULTS.azure_vision.apiVersion}`;
  const response = await fetchJson(fetchImpl, url, {
    method: "POST",
    headers: {
      "Content-Type": image.mimeType || "application/octet-stream",
      "Ocp-Apim-Subscription-Key": credentials.apiKey,
    },
    body: image.bytes,
  });
  const lines = [];
  for (const block of response.json?.readResult?.blocks || []) {
    for (const line of block.lines || []) lines.push(line.text);
  }
  return providerResult("azure_vision", response.status, normalizeOcrText(lines));
}

async function callCloudflareWorkersAi(provider, credentials, image, fetchImpl) {
  requireValue(credentials.apiKey, "CLOUDFLARE_AI_TOKEN_REQUIRED");
  requireValue(provider.account_id, "CLOUDFLARE_ACCOUNT_ID_REQUIRED");
  const model = encodeURIComponent(provider.model || DEFAULTS.cloudflare_workers_ai.model);
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(provider.account_id)}/ai/run/${model}`;
  const response = await fetchJson(fetchImpl, url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${credentials.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: OCR_PROMPT,
      image: Array.from(new Uint8Array(image.bytes)),
    }),
  });
  const text = response.json?.result?.response || response.json?.result?.description || response.json?.response || "";
  return providerResult("cloudflare_workers_ai", response.status, normalizeOcrText(text));
}

async function callGoogleVision(provider, credentials, image, fetchImpl) {
  requireValue(credentials.apiKey, "GOOGLE_VISION_KEY_REQUIRED");
  const url = `${DEFAULTS.google_vision.endpoint}?key=${encodeURIComponent(credentials.apiKey)}`;
  const response = await fetchJson(fetchImpl, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{
        image: { content: image.base64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        imageContext: { languageHints: ["id", "en"] },
      }],
    }),
  });
  const first = response.json?.responses?.[0] || {};
  if (first.error) throw adapterError("GOOGLE_VISION_ERROR", first.error.message || "Google Vision gagal memproses gambar.", response.status);
  return providerResult("google_vision", response.status, normalizeOcrText(first.fullTextAnnotation?.text || first.textAnnotations?.[0]?.description || ""));
}

async function callGroqVision(provider, credentials, image, fetchImpl) {
  requireValue(credentials.apiKey, "GROQ_API_KEY_REQUIRED");
  const response = await fetchJson(fetchImpl, DEFAULTS.groq_vision.endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${credentials.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model || DEFAULTS.groq_vision.model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: OCR_PROMPT },
          { type: "image_url", image_url: { url: dataUri(image) } },
        ],
      }],
      temperature: 0,
      max_tokens: 4096,
    }),
  });
  return providerResult("groq_vision", response.status, normalizeOcrText(response.json?.choices?.[0]?.message?.content || ""));
}

async function callAwsTextract(provider, credentials, image, fetchImpl) {
  requireValue(credentials.apiKey, "AWS_ACCESS_KEY_ID_REQUIRED");
  requireValue(credentials.apiSecret, "AWS_SECRET_ACCESS_KEY_REQUIRED");
  requireValue(provider.region, "AWS_REGION_REQUIRED");
  const region = provider.region;
  const host = `textract.${region}.amazonaws.com`;
  const body = JSON.stringify({ Document: { Bytes: image.base64 } });
  const headers = await awsSigV4Headers({
    accessKeyId: credentials.apiKey,
    secretAccessKey: credentials.apiSecret,
    region,
    service: DEFAULTS.aws_textract.service,
    host,
    target: "Textract.DetectDocumentText",
    body,
  });
  const response = await fetchJson(fetchImpl, `https://${host}/`, {
    method: "POST",
    headers,
    body,
  });
  const lines = (response.json?.Blocks || []).filter((block) => block.BlockType === "LINE").map((block) => block.Text);
  return providerResult("aws_textract", response.status, normalizeOcrText(lines));
}

async function callVeryfi(provider, credentials, image, fetchImpl) {
  requireValue(credentials.apiKey, "VERYFI_API_KEY_REQUIRED");
  requireValue(credentials.apiSecret, "VERYFI_USERNAME_REQUIRED");
  requireValue(provider.account_id, "VERYFI_CLIENT_ID_REQUIRED");
  const response = await fetchJson(fetchImpl, endpoint(provider, "veryfi"), {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "CLIENT-ID": provider.account_id,
      "AUTHORIZATION": `apikey ${credentials.apiSecret}:${credentials.apiKey}`,
    },
    body: JSON.stringify({
      file_data: dataUri(image),
      file_name: filenameFromUrl(image.sourceUrl),
      auto_delete: true,
      max_pages_to_process: 1,
    }),
  });
  return providerResult("veryfi", response.status, normalizeOcrText(response.json?.ocr_text || response.json?.text || ""));
}

async function callMindee(provider, credentials, image, fetchImpl) {
  requireValue(credentials.apiKey, "MINDEE_API_KEY_REQUIRED");
  const form = new FormData();
  form.set("document", new Blob([image.bytes], { type: image.mimeType || "application/octet-stream" }), filenameFromUrl(image.sourceUrl));
  const response = await fetchJson(fetchImpl, endpoint(provider, "mindee"), {
    method: "POST",
    headers: { "Authorization": `Token ${credentials.apiKey}` },
    body: form,
  });
  return providerResult("mindee", response.status, normalizeOcrText(extractDeepText(response.json)));
}

async function callPdfCo(provider, credentials, image, fetchImpl) {
  requireValue(credentials.apiKey, "PDF_CO_API_KEY_REQUIRED");
  const response = await fetchJson(fetchImpl, endpoint(provider, "pdf_co"), {
    method: "POST",
    headers: {
      "x-api-key": credentials.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: image.sourceUrl,
      inline: true,
      async: false,
      ocr: true,
      lang: "ind+eng",
    }),
  });
  return providerResult("pdf_co", response.status, normalizeOcrText(response.json?.body || response.json?.text || response.json?.url || ""));
}

async function callApi4ai(provider, credentials, image, fetchImpl) {
  requireValue(credentials.apiKey, "API4AI_KEY_REQUIRED");
  const form = new FormData();
  form.set("image", new Blob([image.bytes], { type: image.mimeType || "application/octet-stream" }), filenameFromUrl(image.sourceUrl));
  const response = await fetchJson(fetchImpl, endpoint(provider, "api4ai"), {
    method: "POST",
    headers: {
      "X-RapidAPI-Key": credentials.apiKey,
      "X-RapidAPI-Host": hostname(endpoint(provider, "api4ai")),
    },
    body: form,
  });
  return providerResult("api4ai", response.status, normalizeOcrText(extractDeepText(response.json)));
}

async function fetchJson(fetchImpl, url, init) {
  const response = await fetchImpl(url, init);
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  const json = contentType.includes("json") && text ? JSON.parse(text) : parseMaybeJson(text);
  if (!response.ok) {
    throw adapterError("OCR_PROVIDER_HTTP_ERROR", providerErrorMessage(json, text) || `Provider OCR mengembalikan HTTP ${response.status}.`, response.status);
  }
  return { status: response.status, json, text };
}

function providerResult(providerKey, httpStatus, text) {
  const normalizedText = normalizeOcrText(text);
  return {
    providerKey,
    httpStatus,
    text: normalizedText,
    textLength: normalizedText.length,
  };
}

function endpoint(provider, key) {
  return provider.endpoint_url || DEFAULTS[key]?.endpoint;
}

function requireValue(value, code) {
  if (!String(value || "").trim()) throw adapterError(code, code);
}

function adapterError(code, message, httpStatus) {
  const error = new Error(message || code);
  error.code = code;
  error.httpStatus = httpStatus || null;
  return error;
}

function firstText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(" ");
  return String(value || "");
}

function providerErrorMessage(json, fallback) {
  if (!json || typeof json !== "object") return String(fallback || "").slice(0, 500);
  return firstText(json.message || json.error || json.errorMessage || json.ErrorMessage || json.ErrorDetails).slice(0, 500);
}

function parseMaybeJson(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch (_error) {
    return {};
  }
}

function dataUri(image) {
  return `data:${image.mimeType || "application/octet-stream"};base64,${image.base64}`;
}

function filenameFromUrl(value) {
  try {
    return decodeURIComponent(new URL(value).pathname.split("/").pop() || "proposal-page.jpg").replace(/[^\w.\-]+/g, "-");
  } catch (_error) {
    return "proposal-page.jpg";
  }
}

function hostname(value) {
  try {
    return new URL(value).hostname;
  } catch (_error) {
    return "ocr43.p.rapidapi.com";
  }
}

function extractDeepText(value) {
  const pieces = [];
  visit(value, pieces);
  return pieces.join("\n");
}

function visit(value, pieces) {
  if (!value || pieces.join("").length > 80_000) return;
  if (typeof value === "string") {
    if (value.length > 2 && /[A-Za-z0-9]/.test(value)) pieces.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => visit(item, pieces));
    return;
  }
  if (typeof value === "object") {
    for (const key of ["text", "ocr_text", "raw_text", "value", "description", "content"]) {
      if (typeof value[key] === "string") pieces.push(value[key]);
    }
    Object.values(value).forEach((item) => visit(item, pieces));
  }
}

async function awsSigV4Headers(input) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;
  const bodyHash = await sha256Hex(input.body);
  const canonicalHeaders = [
    `content-type:application/x-amz-json-1.1`,
    `host:${input.host}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${input.target}`,
  ].join("\n") + "\n";
  const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = await awsSigningKey(input.secretAccessKey, dateStamp, input.region, input.service);
  const signature = await hmacHex(signingKey, stringToSign);
  return {
    "Content-Type": "application/x-amz-json-1.1",
    "X-Amz-Date": amzDate,
    "X-Amz-Target": input.target,
    "Authorization": `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

async function awsSigningKey(secretAccessKey, dateStamp, region, service) {
  const kDate = await hmacBytes(textEncoder().encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmacBytes(kDate, region);
  const kService = await hmacBytes(kRegion, service);
  return hmacBytes(kService, "aws4_request");
}

async function hmacBytes(keyBytes, message) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, textEncoder().encode(message)));
}

async function hmacHex(keyBytes, message) {
  return hex(await hmacBytes(keyBytes, message));
}

async function sha256Hex(value) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", textEncoder().encode(value))));
}

function hex(bytes) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function textEncoder() {
  return new TextEncoder();
}
