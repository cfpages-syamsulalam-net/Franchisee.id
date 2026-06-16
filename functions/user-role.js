import { z } from "zod";
import {
  assignD1Role,
  authErrorResponse,
  getD1UserByClerkId,
  getD1UserById,
  removeD1Role,
  requireD1User,
  syncClerkMetadataForD1User,
} from "./_clerk-auth.js";

const RoleMutationSchema = z
  .object({
    user_id: z.string().trim().min(1).optional(),
    clerk_user_id: z.string().trim().min(1).optional(),
    role: z.enum(["franchisee", "franchisor", "admin", "staff"]),
    action: z.enum(["assign", "remove"]).default("assign"),
  })
  .refine((data) => data.user_id || data.clerk_user_id, {
    message: "user_id atau clerk_user_id wajib diisi.",
    path: ["user_id"],
  });

export async function onRequestPost({ request, env }) {
  try {
    if (!env.franchise_db) {
      return jsonResponse({ success: false, error: "D1_BINDING_MISSING" }, { status: 503 });
    }

    const actor = await requireD1User(request, env, env.franchise_db, { requiredRole: "admin" });
    const body = await request.json().catch(() => ({}));
    const parsed = RoleMutationSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Payload role tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const target = parsed.data.user_id
      ? await getD1UserById(env.franchise_db, parsed.data.user_id)
      : await getD1UserByClerkId(env.franchise_db, parsed.data.clerk_user_id);

    if (!target) {
      return jsonResponse(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message: "User D1 tidak ditemukan. Pastikan user sudah pernah login atau tersinkron dari webhook Clerk.",
        },
        { status: 404 }
      );
    }

    if (parsed.data.action === "assign") {
      await assignD1Role(env.franchise_db, target.id, parsed.data.role, actor.id);
    } else {
      await removeD1Role(env.franchise_db, target.id, parsed.data.role);
    }

    const synced = await syncClerkMetadataForD1User(env, env.franchise_db, target);
    return jsonResponse({
      success: true,
      user: {
        id: synced.id,
        clerk_user_id: synced.clerk_user_id,
        roles: synced.roles.map((row) => row.role),
      },
      clerk_metadata_synced: true,
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
