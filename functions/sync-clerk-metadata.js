import { z } from "zod";
import {
  authErrorResponse,
  getAllD1Users,
  getD1UserByClerkId,
  getD1UserById,
  requireD1User,
  syncClerkMetadataForD1User,
} from "./_clerk-auth.js";

const SyncSchema = z
  .object({
    user_id: z.string().trim().min(1).optional(),
    clerk_user_id: z.string().trim().min(1).optional(),
    all: z.boolean().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .refine((data) => data.user_id || data.clerk_user_id || data.all, {
    message: "Pilih user_id, clerk_user_id, atau all=true.",
    path: ["user_id"],
  });

export async function onRequestPost({ request, env }) {
  try {
    if (!env.franchise_db) {
      return jsonResponse({ success: false, error: "D1_BINDING_MISSING" }, { status: 503 });
    }

    await requireD1User(request, env, env.franchise_db, { requiredRole: "admin" });
    const body = await request.json().catch(() => ({}));
    const parsed = SyncSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Payload sync tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const users = parsed.data.all
      ? await getAllD1Users(env.franchise_db, parsed.data.limit || 500)
      : [
          parsed.data.user_id
            ? await getD1UserById(env.franchise_db, parsed.data.user_id)
            : await getD1UserByClerkId(env.franchise_db, parsed.data.clerk_user_id),
        ].filter(Boolean);

    if (!users.length) {
      return jsonResponse({ success: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const synced = [];
    for (const user of users) {
      const result = await syncClerkMetadataForD1User(env, env.franchise_db, user);
      synced.push({
        id: result.id,
        clerk_user_id: result.clerk_user_id,
        roles: result.roles.map((row) => row.role),
      });
    }

    return jsonResponse({
      success: true,
      synced_count: synced.length,
      users: synced,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    return jsonResponse(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}
