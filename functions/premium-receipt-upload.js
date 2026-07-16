import { authErrorResponse, requireD1User } from "./_clerk-auth.js";
import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";
import { logOperationEvent } from "./_telemetry.js";

const MAX_RECEIPT_BYTES = 6 * 1024 * 1024;
const RECEIPT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

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
    const actor = await requireD1User(request, env, db);
    const bucket = getBucket(env);
    const publicBaseUrl = getPublicBaseUrl(env);
    const form = await request.formData();
    const orderId = normalizeText(form.get("order_id"));
    const file = form.get("receipt");

    if (!orderId) return jsonResponse({ success: false, message: "Pilih tagihan Premium terlebih dahulu." }, { status: 400 });
    if (!isUploadFile(file)) return jsonResponse({ success: false, message: "Unggah bukti transfer terlebih dahulu." }, { status: 400 });
    if (!RECEIPT_MIME_TYPES.includes(file.type)) {
      return jsonResponse({ success: false, message: "Bukti transfer harus JPG, PNG, WebP, atau PDF." }, { status: 400 });
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      return jsonResponse({ success: false, message: "Ukuran bukti transfer maksimal 6 MB." }, { status: 400 });
    }

    const order = await db
      .prepare(
        `SELECT o.id, o.franchise_id, f.brand_name, f.slug
         FROM premium_orders o
         JOIN franchises f ON f.id = o.franchise_id
         WHERE o.id = ?
           AND o.user_id = ?
           AND o.status IN ('pending_payment', 'confirmation_submitted')
         LIMIT 1`,
      )
      .bind(orderId, actor.id)
      .first();
    if (!order) return jsonResponse({ success: false, message: "Tagihan Premium tidak ditemukan." }, { status: 404 });

    const extension = extensionFor(file.name, file.type);
    const objectKey = `premium-receipts/${slugPart(order.slug || order.franchise_id)}/${order.id}/${Date.now()}-${randomId()}${extension}`;
    const publicUrl = joinUrl(publicBaseUrl, objectKey);

    await bucket.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: {
        franchise_id: order.franchise_id,
        order_id: order.id,
        uploaded_by_user_id: actor.id,
        asset_type: "premium_receipt",
      },
    });

    const assetId = `asset_${randomId()}`;
    await db.batch([
      db
        .prepare(
          `INSERT INTO franchise_assets (
             id, franchise_id, uploaded_by_user_id, asset_type, r2_bucket, r2_key,
             public_url, mime_type, file_size_bytes, status
           )
           VALUES (?, ?, ?, 'document', ?, ?, ?, ?, ?, 'active')`,
        )
        .bind(assetId, order.franchise_id, actor.id, "FRANCHISE_ASSETS", objectKey, publicUrl, file.type || null, file.size || null),
      auditStatement(db, "premium.receipt.upload", "franchise_assets", assetId, {
        franchise_id: order.franchise_id,
        order_id: order.id,
        brand_name: order.brand_name,
      }, actor.id),
    ]);

    return jsonResponse({
      success: true,
      asset: {
        id: assetId,
        franchise_id: order.franchise_id,
        order_id: order.id,
        public_url: publicUrl,
        mime_type: file.type || "",
        file_size_bytes: file.size || 0,
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    await logOperationEvent(env.franchise_db, {
      eventType: "api.premium_receipt_upload.failed",
      severity: "error",
      route: "/premium-receipt-upload",
      message: error.message,
    });
    return jsonResponse({ success: false, message: error.message || "Bukti transfer belum bisa diunggah." }, { status: 500 });
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
  if (mimeType === "application/pdf") return ".pdf";
  return "";
}

function joinUrl(baseUrl, key) {
  return `${baseUrl.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
}

function slugPart(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "listing";
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
      message: "Upload bukti transfer hanya bisa dilakukan dari halaman membership. Muat ulang halaman lalu coba lagi.",
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}
