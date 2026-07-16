import { authErrorResponse, requireD1User } from "./_clerk-auth.js";
import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";
import { logOperationEvent } from "./_telemetry.js";

const MAX_QRIS_BYTES = 3 * 1024 * 1024;
const QRIS_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function onRequestGet() {
  return methodNotAllowedResponse();
}

export async function onRequestPut() {
  return methodNotAllowedResponse();
}

export async function onRequestPatch() {
  return methodNotAllowedResponse();
}

export async function onRequestDelete() {
  return methodNotAllowedResponse();
}

export async function onRequestPost({ request, env }) {
  try {
    const db = getDb(env);
    const actor = await requireD1User(request, env, db, { requiredRole: "admin" });
    const bucket = getBucket(env);
    const publicBaseUrl = getPublicBaseUrl(env);
    const form = await request.formData();
    const code = slugPart(normalizeText(form.get("code")) || "manual_bca");
    const file = form.get("qris_image");

    if (!isUploadFile(file)) return jsonResponse({ success: false, message: "Pilih gambar QRIS terlebih dahulu." }, { status: 400 });
    if (!QRIS_MIME_TYPES.includes(file.type)) {
      return jsonResponse({ success: false, message: "Gambar QRIS harus JPG, PNG, atau WebP." }, { status: 400 });
    }
    if (file.size > MAX_QRIS_BYTES) {
      return jsonResponse({ success: false, message: "Ukuran gambar QRIS maksimal 3 MB." }, { status: 400 });
    }

    const extension = extensionFor(file.name, file.type);
    const objectKey = `payment-methods/${code}/qris-${Date.now()}-${randomId()}${extension}`;
    const publicUrl = joinUrl(publicBaseUrl, objectKey);

    await bucket.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: {
        payment_method_code: code,
        uploaded_by_user_id: actor.id,
        asset_type: "payment_qris",
      },
    });

    await auditStatement(db, "dashboard.payment_method.qris_upload", "payment_methods", code, {
      public_url: publicUrl,
      file_size_bytes: file.size || null,
      mime_type: file.type || null,
    }, actor.id).run();

    return jsonResponse({
      success: true,
      qris_image_url: publicUrl,
      mime_type: file.type || "",
      file_size_bytes: file.size || 0,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    await logOperationEvent(env.franchise_db, {
      eventType: "api.payment_method_upload.failed",
      severity: "error",
      route: "/payment-method-upload",
      message: error.message,
    });
    return jsonResponse({ success: false, message: error.message || "Gambar QRIS belum bisa diunggah." }, { status: 500 });
  }
}

function getDb(env) {
  if (!env.franchise_db) throw new Error("Upload belum siap. Silakan coba lagi nanti.");
  return env.franchise_db;
}

function getBucket(env) {
  if (!env.FRANCHISE_ASSETS) throw new Error("Upload belum siap. Silakan coba lagi nanti.");
  return env.FRANCHISE_ASSETS;
}

function getPublicBaseUrl(env) {
  const value = normalizeText(env.FRANCHISE_ASSETS_PUBLIC_BASE_URL || env.R2_PUBLIC_BASE_URL);
  if (!value) throw new Error("Upload belum siap. Silakan coba lagi nanti.");
  return value;
}

function isUploadFile(value) {
  return value && typeof value === "object" && typeof value.name === "string" && typeof value.stream === "function";
}

function extensionFor(name, mimeType) {
  const match = String(name || "").toLowerCase().match(/\.[a-z0-9]{2,8}$/);
  if (match) return match[0];
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return "";
}

function joinUrl(baseUrl, key) {
  return `${baseUrl.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
}

function slugPart(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "manual_bca";
}

function normalizeText(value) {
  return (value ?? "").toString().trim().replace(/\s+/g, " ");
}

function auditStatement(db, action, entityType, entityId, metadata = {}, actorUserId = null) {
  return db
    .prepare(
      `INSERT INTO audit_events (id, actor_user_id, source_site_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(`audit_${randomId()}`, actorUserId, SITE_FRANCHISEE_ID, action, entityType, entityId, JSON.stringify(metadata));
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function methodNotAllowedResponse() {
  return jsonResponse(
    {
      success: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Upload QRIS hanya bisa dilakukan dari dashboard. Muat ulang halaman lalu coba lagi.",
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}
