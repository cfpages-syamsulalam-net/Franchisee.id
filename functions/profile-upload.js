import { authErrorResponse, requireD1User } from "./_clerk-auth.js";
import { SITE_FRANCHISEE_ID, siteRebuildStatements } from "./_site-publish-queue.js";
import { logOperationEvent } from "./_telemetry.js";

const ASSET_TYPES = {
  logo: {
    column: "logo_url",
    directory: "logos",
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  cover: {
    column: "cover_url",
    directory: "covers",
    maxBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  proposal: {
    column: "proposal_url",
    directory: "proposals",
    maxBytes: 15 * 1024 * 1024,
    mimeTypes: ["application/pdf"],
  },
};

export async function onRequestPost({ request, env }) {
  try {
    const db = getDb(env);
    const actor = await requireD1User(request, env, db);
    const bucket = getBucket(env);
    const publicBaseUrl = getPublicBaseUrl(env);
    const form = await request.formData();
    const franchiseId = normalizeText(form.get("franchise_id"));
    const assetType = normalizeText(form.get("asset_type"));
    const file = form.get("file");
    const config = ASSET_TYPES[assetType];

    if (!config) return jsonResponse({ success: false, message: "Jenis file belum didukung." }, { status: 400 });
    if (!franchiseId) return jsonResponse({ success: false, message: "Pilih listing terlebih dahulu." }, { status: 400 });
    if (!isUploadFile(file)) return jsonResponse({ success: false, message: "Pilih file yang ingin diunggah." }, { status: 400 });
    if (!config.mimeTypes.includes(file.type)) {
      return jsonResponse({ success: false, message: supportedTypeMessage(assetType) }, { status: 400 });
    }
    if (file.size > config.maxBytes) {
      return jsonResponse({ success: false, message: `Ukuran file maksimal ${formatMb(config.maxBytes)} MB.` }, { status: 400 });
    }

    const listing = await loadOwnedListing(db, actor, franchiseId);
    if (!listing) {
      return jsonResponse({ success: false, message: "Listing tidak ditemukan atau bukan milik akun ini." }, { status: 404 });
    }

    const extension = extensionFor(file.name, file.type);
    const objectKey = `franchises/${slugPart(listing.slug || listing.id)}/${config.directory}/${Date.now()}-${randomId()}${extension}`;
    const publicUrl = joinUrl(publicBaseUrl, objectKey);

    await bucket.put(objectKey, file.stream(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
      },
      customMetadata: {
        franchise_id: listing.id,
        uploaded_by_user_id: actor.id,
        asset_type: assetType,
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
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
        )
        .bind(assetId, listing.id, actor.id, assetType, "FRANCHISE_ASSETS", objectKey, publicUrl, file.type || null, file.size || null),
      db
        .prepare(`UPDATE franchises SET ${config.column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(publicUrl, listing.id),
      auditStatement(db, "profile.listing.media_upload", "franchise_assets", assetId, {
        franchise_id: listing.id,
        asset_type: assetType,
        field: config.column,
      }, actor.id),
      ...siteRebuildStatements(db, {
        siteId: SITE_FRANCHISEE_ID,
        franchiseId: listing.id,
        reason: "owner_media_upload",
        entityType: "franchise_assets",
        entityId: assetId,
        actorUserId: actor.id,
        source: "profile",
        metadata: {
          slug: listing.slug,
          brand_name: listing.brand_name,
          asset_type: assetType,
          field: config.column,
        },
      }),
    ]);

    return jsonResponse({
      success: true,
      asset: {
        id: assetId,
        franchise_id: listing.id,
        asset_type: assetType,
        field: config.column,
        public_url: publicUrl,
        mime_type: file.type || "",
        file_size_bytes: file.size || 0,
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    await logOperationEvent(env.franchise_db, {
      eventType: "api.profile_upload.failed",
      severity: "error",
      route: "/profile-upload",
      message: error.message,
    });
    return jsonResponse({ success: false, message: error.message || "File belum bisa diunggah." }, { status: 500 });
  }
}

async function loadOwnedListing(db, actor, franchiseId) {
  const franchisorProfile = await db
    .prepare("SELECT id FROM franchisor_profiles WHERE user_id = ? LIMIT 1")
    .bind(actor.id)
    .first();

  return await db
    .prepare(
      `SELECT id, owner_user_id, franchisor_profile_id, brand_name, slug
       FROM franchises
       WHERE id = ?
         AND (owner_user_id = ? OR (? IS NOT NULL AND franchisor_profile_id = ?))
       LIMIT 1`
    )
    .bind(franchiseId, actor.id, franchisorProfile?.id || null, franchisorProfile?.id || null)
    .first();
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

function supportedTypeMessage(assetType) {
  if (assetType === "proposal") return "Proposal harus berupa file PDF.";
  return "Gambar harus berupa JPG, PNG, atau WebP.";
}

function formatMb(bytes) {
  return Math.round(bytes / 1024 / 1024);
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
       VALUES (?, ?, ?, ?, ?, ?, ?)`
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
