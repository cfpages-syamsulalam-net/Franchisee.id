import { z } from "zod";
import { authErrorResponse, syncD1User } from "./_clerk-auth.js";

const SyncSchema = z
  .object({
    requested_role: z.enum(["franchisee", "franchisor"]).optional(),
  })
  .passthrough();

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
    if (!env.franchise_db) {
      return jsonResponse(
        {
          success: false,
          error: "D1_BINDING_MISSING",
          message: "Layanan akun belum siap. Silakan coba lagi nanti.",
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = SyncSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Role akun tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const user = await syncD1User(request, env, env.franchise_db, parsed.data.requested_role);
    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        email: user.primary_email,
        display_name: user.display_name,
        roles: user.roles.map((row) => row.role),
      },
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

function methodNotAllowedResponse() {
  return jsonResponse(
    {
      success: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Sesi akun hanya bisa disinkronkan dari tombol login. Muat ulang halaman lalu login kembali.",
    },
    { status: 405, headers: { Allow: "POST" } }
  );
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
