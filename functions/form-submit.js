// /functions/form-submit.js
import { authErrorResponse, requireD1User } from "./_clerk-auth.js";
import {
  BaseSubmissionSchema,
  FranchiseeSubmissionSchema,
  FranchisorSubmissionSchema,
} from "./_shared-schemas.js";
import { handleFranchiseeSubmit } from "./_form-submit-franchisee.js";
import { handleFranchisorSubmit } from "./_form-submit-franchisor.js";
import { handleClearTestData, handleCreateUnclaimed } from "./_form-submit-test-actions.js";
import { jsonResponse, validationError } from "./_form-submit-utils.js";
import { logOperationEvent } from "./_telemetry.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.franchise_db) {
      return jsonResponse(
        {
          success: false,
          error: "D1_BINDING_MISSING",
          message: "Layanan formulir belum siap. Silakan coba lagi nanti.",
        },
        { status: 503 }
      );
    }

    const rawData = await request.json();
    const baseParsed = BaseSubmissionSchema.safeParse(rawData);
    if (!baseParsed.success) return validationError(baseParsed.error);

    if (baseParsed.data.test_action === "create_unclaimed") {
      const actor = await requireD1User(request, env, env.franchise_db, { requiredRole: "staff" });
      return await handleCreateUnclaimed(env.franchise_db, rawData, actor);
    }

    if (baseParsed.data.test_action === "clear_test_data") {
      const actor = await requireD1User(request, env, env.franchise_db, { requiredRole: "staff" });
      return await handleClearTestData(env.franchise_db, actor);
    }

    const formType = rawData.form_type || "FRANCHISEE";
    if (formType === "FRANCHISEE") {
      const parsed = FranchiseeSubmissionSchema.safeParse(rawData);
      if (!parsed.success) return validationError(parsed.error);
      const actor = await requireD1User(request, env, env.franchise_db, { requiredRole: "franchisee" });
      return await handleFranchiseeSubmit(env.franchise_db, parsed.data, actor);
    }

    if (formType === "FRANCHISOR" || formType === "claim") {
      const parsed = FranchisorSubmissionSchema.safeParse(rawData);
      if (!parsed.success) return validationError(parsed.error);
      const actor = await requireD1User(request, env, env.franchise_db, { requiredRole: "franchisor" });
      return await handleFranchisorSubmit(env.franchise_db, parsed.data, formType === "claim", actor);
    }

    return jsonResponse(
      {
        success: false,
        error: "INVALID_FORM_TYPE",
        message: "Tipe form tidak dikenali.",
      },
      { status: 400 }
    );
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    await logOperationEvent(env.franchise_db, {
      eventType: "api.form_submit.failed",
      severity: "error",
      route: "/form-submit",
      message: err.message,
    });

    return jsonResponse(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
