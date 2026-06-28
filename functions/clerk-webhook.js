import { verifyWebhook } from "@clerk/backend/webhooks";
import { markD1UserDeleted, syncWebhookUserToD1 } from "./_clerk-auth.js";
import { logOperationEvent } from "./_telemetry.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.franchise_db) {
      return jsonResponse({ success: false, error: "D1_BINDING_MISSING" }, { status: 503 });
    }

    if (!env.CLERK_WEBHOOK_SIGNING_SECRET) {
      return jsonResponse({ success: false, error: "CLERK_WEBHOOK_SECRET_MISSING" }, { status: 503 });
    }

    const event = await verifyWebhook(request, {
      signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
    });

    if (event.type === "user.created" || event.type === "user.updated") {
      const user = await syncWebhookUserToD1(env, env.franchise_db, event.data);
      await logOperationEvent(env.franchise_db, {
        eventType: "clerk.webhook.success",
        severity: "info",
        route: "/clerk-webhook",
        entityType: "users",
        entityId: user.id,
        metadata: { type: event.type },
      });
      return jsonResponse({
        success: true,
        type: event.type,
        user_id: user.id,
        roles: user.roles.map((row) => row.role),
      });
    }

    if (event.type === "user.deleted") {
      if (event.data?.id) {
        await markD1UserDeleted(env.franchise_db, event.data.id);
      }
      await logOperationEvent(env.franchise_db, {
        eventType: "clerk.webhook.success",
        severity: "info",
        route: "/clerk-webhook",
        entityType: "clerk_user",
        entityId: event.data?.id || "",
        metadata: { type: event.type },
      });
      return jsonResponse({ success: true, type: event.type });
    }

    return jsonResponse({ success: true, ignored: true, type: event.type });
  } catch (error) {
    await logOperationEvent(env.franchise_db, {
      eventType: "clerk.webhook.failed",
      severity: "error",
      route: "/clerk-webhook",
      message: error.message,
    });
    return jsonResponse(
      {
        success: false,
        error: "WEBHOOK_VERIFICATION_OR_SYNC_FAILED",
        message: error.message,
      },
      { status: 400 }
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
