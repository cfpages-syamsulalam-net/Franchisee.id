const ENCRYPTION_PREFIX = "enc:v1";
const NONCE_BYTES = 12;

export function credentialLooksEncrypted(value) {
  return typeof value === "string" && value.startsWith(`${ENCRYPTION_PREFIX}:`);
}

export function hasStoredCredential(value) {
  return Boolean((value ?? "").toString().trim());
}

export async function prepareStoredCredential({ currentValue, newValue, clear, rootSecret, aad }) {
  if (clear) return null;

  const normalizedNew = textOrNull(newValue);
  if (normalizedNew) {
    return encryptCredentialValue(rootSecret, normalizedNew, aad);
  }

  const normalizedCurrent = textOrNull(currentValue);
  if (!normalizedCurrent) return null;
  if (credentialLooksEncrypted(normalizedCurrent)) return normalizedCurrent;
  if (!rootSecret) {
    throw new Error("OCR_KEY_REQUIRED_FOR_PLAINTEXT_CREDENTIAL");
  }
  return encryptCredentialValue(rootSecret, normalizedCurrent, aad);
}

export async function encryptCredentialValue(rootSecret, value, aad = "") {
  const secret = textOrNull(rootSecret);
  if (!secret) throw new Error("OCR_KEY_REQUIRED");
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  const key = await deriveKey(secret);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: nonce,
      additionalData: textEncoder().encode(aad),
    },
    key,
    textEncoder().encode(String(value)),
  );
  return `${ENCRYPTION_PREFIX}:${base64UrlEncode(nonce)}:${base64UrlEncode(new Uint8Array(encrypted))}`;
}

export async function decryptCredentialValue(rootSecret, encryptedValue, aad = "") {
  const secret = textOrNull(rootSecret);
  if (!secret) throw new Error("OCR_KEY_REQUIRED");
  const value = textOrNull(encryptedValue);
  if (!value) return "";
  if (!credentialLooksEncrypted(value)) return value;

  const [, , nonceText, cipherText] = value.split(":");
  if (!nonceText || !cipherText) throw new Error("OCR_CREDENTIAL_ENVELOPE_INVALID");
  const key = await deriveKey(secret);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64UrlDecode(nonceText),
      additionalData: textEncoder().encode(aad),
    },
    key,
    base64UrlDecode(cipherText),
  );
  return textDecoder().decode(decrypted);
}

export function credentialAad(providerKey, fieldName) {
  return `ocr_provider_configs:${providerKey}:${fieldName}`;
}

function textOrNull(value) {
  const normalized = (value ?? "").toString().trim();
  return normalized || null;
}

async function deriveKey(rootSecret) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder().encode(rootSecret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function textEncoder() {
  return new TextEncoder();
}

function textDecoder() {
  return new TextDecoder();
}
