import { AuthError } from "./_clerk-auth.js";
import { auditStatement, jsonResponse, randomId } from "./_dashboard-utils.js";
import { decryptCredentialValue, encryptCredentialValue } from "./_ocr-credential-crypto.js";

export const GOOGLE_CONTACTS_SCOPE = "https://www.googleapis.com/auth/contacts";
export const GOOGLE_CONTACTS_SETUP_DOC = "/dashboard/#google-contacts-setup";

const PROVIDER = "google_contacts";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const STATE_TTL_SECONDS = 10 * 60;

export async function createGoogleContactsAuthorization(db, auth, request, env) {
  const config = googleContactsOAuthConfig(env, request);
  const state = `gco_${randomId()}${randomId()}`;
  const expiresAt = new Date(Date.now() + STATE_TTL_SECONDS * 1000).toISOString();
  const returnPath = safeReturnPath(new URL(request.url).searchParams.get("return") || "/dashboard/#outreach");

  await cleanupGoogleContactsOAuthStates(db, auth.id);

  await db
    .prepare(
      `INSERT INTO staff_google_oauth_states (state, user_id, clerk_user_id, return_path, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(state, auth.id, auth.clerk_user_id, returnPath, expiresAt)
    .run();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: ["openid", "email", "profile", GOOGLE_CONTACTS_SCOPE].join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });

  return {
    authorization_url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
    expires_at: expiresAt,
  };
}

export async function completeGoogleContactsAuthorization(db, request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  const error = url.searchParams.get("error") || "";

  if (error) {
    if (state) await consumeGoogleContactsOAuthState(db, state, "denied");
    return redirectToDashboard("/dashboard/?google_contacts=denied#outreach");
  }
  if (!state || !code) return redirectToDashboard("/dashboard/?google_contacts=invalid#outreach");

  const row = await db
    .prepare(
      `SELECT s.*, u.id AS d1_user_id
       FROM staff_google_oauth_states s
       JOIN users u ON u.id = s.user_id
       WHERE s.state = ? AND s.consumed_at IS NULL
       LIMIT 1`,
    )
    .bind(state)
    .first();

  if (!row) {
    return redirectToDashboard("/dashboard/?google_contacts=expired#outreach");
  }

  if (Date.parse(row.expires_at || "") < Date.now()) {
    await consumeGoogleContactsOAuthState(db, state, "expired", row);
    return redirectToDashboard("/dashboard/?google_contacts=expired#outreach");
  }

  const config = googleContactsOAuthConfig(env, request);
  try {
    const token = await exchangeAuthorizationCode(config, code);
    const scopes = normalizeScopes(token.scope);
    if (!scopes.includes(GOOGLE_CONTACTS_SCOPE)) {
      throw new Error("GOOGLE_CONTACTS_SCOPE_NOT_GRANTED");
    }

    const userinfo = await fetchGoogleUserinfo(token.access_token);
    const current = await getRawGoogleContactsConnection(db, row.user_id);
    const encryptedAccess = await encryptGoogleContactsToken(env, token.access_token, row.user_id, "access_token");
    const refreshToken = token.refresh_token || "";
    const encryptedRefresh = refreshToken
      ? await encryptGoogleContactsToken(env, refreshToken, row.user_id, "refresh_token")
      : current?.refresh_token_encrypted || null;
    const expiresAt = token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null;

    await db.batch([
      db
        .prepare(
          `INSERT INTO staff_google_connections (
             id, user_id, provider, google_sub, google_email, access_token_encrypted,
             refresh_token_encrypted, granted_scopes, token_type, expires_at,
             connected_at, updated_at, revoked_at, last_error
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL)
           ON CONFLICT(user_id, provider) DO UPDATE SET
             google_sub = excluded.google_sub,
             google_email = excluded.google_email,
             access_token_encrypted = excluded.access_token_encrypted,
             refresh_token_encrypted = excluded.refresh_token_encrypted,
             granted_scopes = excluded.granted_scopes,
             token_type = excluded.token_type,
             expires_at = excluded.expires_at,
             updated_at = CURRENT_TIMESTAMP,
             revoked_at = NULL,
             last_error = NULL`,
        )
        .bind(
          current?.id || `google_contacts_${randomId()}`,
          row.user_id,
          PROVIDER,
          userinfo.sub || "",
          userinfo.email || "",
          encryptedAccess,
          encryptedRefresh,
          JSON.stringify(scopes),
          token.token_type || "Bearer",
          expiresAt,
        ),
      db.prepare("UPDATE staff_google_oauth_states SET consumed_at = CURRENT_TIMESTAMP WHERE state = ?").bind(state),
      auditStatement(db, "dashboard.google_contacts.connect", "user", row.user_id, {
        google_email: userinfo.email || "",
        scopes,
      }, row.user_id),
    ]);

    return redirectToReturnPath(row.return_path || "/dashboard/#outreach", "connected");
  } catch (connectError) {
    await db.batch([
      db.prepare("UPDATE staff_google_oauth_states SET consumed_at = CURRENT_TIMESTAMP WHERE state = ?").bind(state),
      auditStatement(db, "dashboard.google_contacts.connect_failed", "user", row.user_id, {
        message: connectError?.message || String(connectError),
      }, row.user_id),
    ]);
    return redirectToDashboard("/dashboard/?google_contacts=failed#outreach");
  }
}

export async function getStaffGoogleContactsState(db, auth, env = {}) {
  try {
    const connection = await getRawGoogleContactsConnection(db, auth.id);
    if (!connection || connection.revoked_at) {
      return {
        connected: false,
        connect_url: "/google-contacts-start",
        documentation_url: GOOGLE_CONTACTS_SETUP_DOC,
        migration_required: false,
        last_error: connection?.last_error || "",
        revoked_at: connection?.revoked_at || "",
      };
    }
    const lastError = connection.last_error || "";
    const expiresSoonWithoutRefresh = !connection.refresh_token_encrypted && tokenExpiresSoon(connection.expires_at, 24 * 60 * 60 * 1000);
    return {
      connected: true,
      google_email: connection.google_email || "",
      granted_scopes: parseStoredScopes(connection.granted_scopes),
      expires_at: connection.expires_at || "",
      connected_at: connection.connected_at || "",
      updated_at: connection.updated_at || "",
      last_error: lastError,
      needs_reconnect: Boolean(lastError) || expiresSoonWithoutRefresh,
      token_health: lastError ? "error" : expiresSoonWithoutRefresh ? "reconnect_recommended" : "ok",
      documentation_url: GOOGLE_CONTACTS_SETUP_DOC,
      configured: Boolean(env.GOOGLE_CONTACTS_CLIENT_ID && env.GOOGLE_CONTACTS_CLIENT_SECRET && googleContactsTokenSecret(env)),
    };
  } catch (error) {
    return {
      connected: false,
      migration_required: true,
      documentation_url: GOOGLE_CONTACTS_SETUP_DOC,
      message: error?.message || String(error),
    };
  }
}

export async function getStaffGoogleContactsAccessToken(db, auth, env) {
  const connection = await getRawGoogleContactsConnection(db, auth.id);
  if (!connection || connection.revoked_at) {
    return {
      error: "GOOGLE_CONTACTS_NOT_CONNECTED",
      message: "Google Contacts belum terhubung untuk akun staff ini. Klik Hubungkan Google Contacts dari tab Outreach.",
      status: 409,
      setup_required: true,
      connect_required: true,
      documentation_url: GOOGLE_CONTACTS_SETUP_DOC,
    };
  }

  try {
    if (!tokenExpiresSoon(connection.expires_at)) {
      return {
        token: await decryptGoogleContactsToken(env, connection.access_token_encrypted, auth.id, "access_token"),
      };
    }

    if (!connection.refresh_token_encrypted) {
      return reconnectRequired("Sesi Google Contacts sudah kedaluwarsa. Hubungkan Google Contacts ulang dari tab Outreach.");
    }

    const refreshToken = await decryptGoogleContactsToken(env, connection.refresh_token_encrypted, auth.id, "refresh_token");
    const refreshed = await refreshAccessToken(env, refreshToken);
    const scopes = refreshed.scope ? normalizeScopes(refreshed.scope) : parseStoredScopes(connection.granted_scopes);
    if (scopes.length && !scopes.includes(GOOGLE_CONTACTS_SCOPE)) {
      return reconnectRequired("Izin Google Contacts tidak ada pada token terbaru. Hubungkan Google Contacts ulang dari tab Outreach.");
    }

    const encryptedAccess = await encryptGoogleContactsToken(env, refreshed.access_token, auth.id, "access_token");
    const encryptedRefresh = refreshed.refresh_token
      ? await encryptGoogleContactsToken(env, refreshed.refresh_token, auth.id, "refresh_token")
      : connection.refresh_token_encrypted;
    const expiresAt = refreshed.expires_in ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString() : connection.expires_at;
    await db
      .prepare(
        `UPDATE staff_google_connections
         SET access_token_encrypted = ?, refresh_token_encrypted = ?, granted_scopes = ?, token_type = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP, last_error = NULL
         WHERE id = ?`,
      )
      .bind(encryptedAccess, encryptedRefresh, JSON.stringify(scopes.length ? scopes : parseStoredScopes(connection.granted_scopes)), refreshed.token_type || connection.token_type || "Bearer", expiresAt, connection.id)
      .run();

    return { token: refreshed.access_token };
  } catch (error) {
    await db
      .prepare("UPDATE staff_google_connections SET last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(error?.message || String(error), connection.id)
      .run();
    return reconnectRequired("Google Contacts perlu dihubungkan ulang. Klik Hubungkan Google Contacts dari tab Outreach.");
  }
}

export async function revokeStaffGoogleContactsConnection(db, auth) {
  await db
    .prepare("UPDATE staff_google_connections SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND provider = ?")
    .bind(auth.id, PROVIDER)
    .run();
  return jsonResponse({ success: true, message: "Koneksi Google Contacts diputus." });
}

async function cleanupGoogleContactsOAuthStates(db, userId) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db
    .prepare(
      `DELETE FROM staff_google_oauth_states
       WHERE user_id = ?
         AND (consumed_at IS NOT NULL OR expires_at <= ?)`,
    )
    .bind(userId, cutoff)
    .run();
}

async function consumeGoogleContactsOAuthState(db, state, reason, existingRow = null) {
  const row = existingRow || await db
    .prepare("SELECT * FROM staff_google_oauth_states WHERE state = ? AND consumed_at IS NULL LIMIT 1")
    .bind(state)
    .first()
    .catch(() => null);
  if (!row) return;
  await db.batch([
    db.prepare("UPDATE staff_google_oauth_states SET consumed_at = CURRENT_TIMESTAMP WHERE state = ? AND consumed_at IS NULL").bind(state),
    auditStatement(db, `dashboard.google_contacts.oauth_${reason}`, "user", row.user_id, {
      return_path: row.return_path || "",
      expires_at: row.expires_at || "",
    }, row.user_id),
  ]);
}

function reconnectRequired(message) {
  return {
    error: "GOOGLE_CONTACTS_RECONNECT_REQUIRED",
    message,
    status: 409,
    setup_required: true,
    connect_required: true,
    reauth_required: true,
    documentation_url: GOOGLE_CONTACTS_SETUP_DOC,
  };
}

function googleContactsOAuthConfig(env, request) {
  if (!env.GOOGLE_CONTACTS_CLIENT_ID || !env.GOOGLE_CONTACTS_CLIENT_SECRET) {
    throw new AuthError("Google Contacts OAuth belum dikonfigurasi.", 503, "GOOGLE_CONTACTS_OAUTH_MISSING");
  }
  if (!googleContactsTokenSecret(env)) {
    throw new AuthError("GOOGLE_CONTACTS_TOKEN_KEY belum dikonfigurasi di Cloudflare Pages.", 503, "GOOGLE_CONTACTS_TOKEN_KEY_MISSING");
  }
  return {
    clientId: env.GOOGLE_CONTACTS_CLIENT_ID,
    clientSecret: env.GOOGLE_CONTACTS_CLIENT_SECRET,
    redirectUri: env.GOOGLE_CONTACTS_REDIRECT_URI || `${new URL(request.url).origin}/google-contacts-callback`,
  };
}

async function exchangeAuthorizationCode(config, code) {
  return googleTokenRequest({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
}

async function refreshAccessToken(env, refreshToken) {
  if (!env.GOOGLE_CONTACTS_CLIENT_ID || !env.GOOGLE_CONTACTS_CLIENT_SECRET) throw new Error("GOOGLE_CONTACTS_OAUTH_MISSING");
  return googleTokenRequest({
    client_id: env.GOOGLE_CONTACTS_CLIENT_ID,
    client_secret: env.GOOGLE_CONTACTS_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
}

async function googleTokenRequest(params) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(body?.error_description || body?.error || "GOOGLE_TOKEN_EXCHANGE_FAILED");
  }
  return body;
}

async function fetchGoogleUserinfo(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error_description || body?.error || "GOOGLE_USERINFO_FAILED");
  return body || {};
}

async function getRawGoogleContactsConnection(db, userId) {
  return db
    .prepare("SELECT * FROM staff_google_connections WHERE user_id = ? AND provider = ? LIMIT 1")
    .bind(userId, PROVIDER)
    .first();
}

function tokenExpiresSoon(expiresAt, skewMs = 60 * 1000) {
  const time = Date.parse(expiresAt || "");
  return !time || time <= Date.now() + skewMs;
}

function parseStoredScopes(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch (_error) {
    // Fall through to whitespace parsing.
  }
  return normalizeScopes(value);
}

function normalizeScopes(value) {
  if (Array.isArray(value)) return [...new Set(value.map(String).filter(Boolean))];
  return [...new Set(String(value || "").split(/\s+/).filter(Boolean))];
}

function googleContactsTokenSecret(env) {
  return env.GOOGLE_CONTACTS_TOKEN_KEY || env.OCR_KEY || "";
}

async function encryptGoogleContactsToken(env, token, userId, fieldName) {
  return encryptCredentialValue(googleContactsTokenSecret(env), token, tokenAad(userId, fieldName));
}

async function decryptGoogleContactsToken(env, token, userId, fieldName) {
  return decryptCredentialValue(googleContactsTokenSecret(env), token, tokenAad(userId, fieldName));
}

function tokenAad(userId, fieldName) {
  return `staff_google_connections:${userId}:${fieldName}`;
}

function redirectToDashboard(path) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: path,
      "Cache-Control": "no-store",
    },
  });
}

function redirectToReturnPath(path, status) {
  const normalized = safeReturnPath(path);
  const [beforeHash, hash = "outreach"] = normalized.split("#");
  const separator = beforeHash.includes("?") ? "&" : "?";
  return redirectToDashboard(`${beforeHash}${separator}google_contacts=${encodeURIComponent(status)}#${hash || "outreach"}`);
}

function safeReturnPath(value) {
  const text = String(value || "").trim();
  if (text.startsWith("/dashboard")) return text;
  return "/dashboard/#outreach";
}
