(function (window, document) {
  const CLERK_JS_URLS = [
    "/clerk/clerk.browser.js",
    "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6.17.0/dist/clerk.browser.js",
    "https://unpkg.com/@clerk/clerk-js@6.17.0/dist/clerk.browser.js",
  ];
  const PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_Y2xlcmsuZnJhbmNoaXNlZS5pZCQ";
  const PENDING_ROLE_KEY = "franchise_auth_pending_role";
  const PENDING_NEXT_KEY = "franchise_auth_pending_next";
  const SSO_CALLBACK_PATH = "/sso-callback/";
  const SELF_ASSIGNABLE_ROLES = new Set(["franchisee", "franchisor"]);
  const CLERK_REDIRECT_PARAMS = [
    "__clerk_status",
    "__clerk_created_session",
    "__clerk_invitation_token",
    "__clerk_ticket",
    "__clerk_modal_state",
    "__clerk_handshake",
    "__clerk_handshake_nonce",
    "__clerk_help",
    "__clerk_netlify_cache_bust",
    "__clerk_synced",
    "__clerk_satellite_url",
    "__clerk_db_jwt",
    "__clerk_oauth_nonce",
    "__clerk_transfer",
    "suffixed_cookies",
  ];

  window.FranchiseAuthCore = {
    create,
  };

  function create(Auth) {
    if (!window.FranchiseAuthDebug || typeof window.FranchiseAuthDebug.create !== "function") {
      throw new Error("FranchiseAuthDebug belum dimuat.");
    }

    let clerkPromise = null;
    let syncedUser = null;
    let pendingRoleSyncPromise = null;

    const Debug = window.FranchiseAuthDebug.create({
      auth: Auth,
      getSyncedUser: function () {
        return syncedUser;
      },
      getPendingRole,
      getPendingNext,
      hasClerkRedirectParams,
      getClerkRedirectParam,
      removeClerkRedirectParams,
    });
    const recordDebug = Debug.recordDebug;
    const summarizeClerk = Debug.summarizeClerk;
    const keyHint = Debug.keyHint;
    const tokenHint = Debug.tokenHint;
    const sessionHint = Debug.sessionHint;

    Auth.init = initClerk;
    Auth.getToken = getToken;
    Auth.getAuthHeaders = getAuthHeaders;
    Auth.syncUser = syncUser;
    Auth.ensureSignedIn = ensureSignedIn;
    Auth.debugEvents = Debug.initEvents(Auth.debugEvents || []);
    Auth.getDebugSnapshot = Debug.getDebugSnapshot;
    Auth.recordDebug = recordDebug;

    async function initClerk() {
      if (clerkPromise) return clerkPromise;

      clerkPromise = (async function () {
        recordDebug("init:start", { href: sanitizedLocation() });
        const config = await fetchAuthConfig();
        const publishableKey = normalizePublishableKey(config.publishableKey) || PUBLIC_CLERK_PUBLISHABLE_KEY;
        recordDebug("config:resolved", {
          configured: Boolean(config.configured),
          source: config.source || "unknown",
          hasPublishableKey: Boolean(publishableKey),
          publishableKeyHint: keyHint(publishableKey),
        });
        if (!publishableKey) {
          throw new Error("Layanan login belum siap. Silakan coba lagi nanti.");
        }

        await loadScriptWithFallbacks(CLERK_JS_URLS, publishableKey);
        recordDebug("script:loaded", { hasWindowClerk: Boolean(window.Clerk) });
        const ClerkCtor = window.Clerk;
        if (!ClerkCtor) throw new Error("Layanan login gagal dimuat. Silakan muat ulang halaman.");

        const clerk = createClerkInstance(ClerkCtor, publishableKey);
        await loadClerkInstance(clerk, publishableKey);
        recordDebug("clerk:loaded", summarizeClerk(clerk));
        await handleOAuthRedirectIfNeeded(clerk);
        recordDebug("init:ready", summarizeClerk(clerk));
        Auth.clerk = clerk;
        return clerk;
      })().catch(function (error) {
        recordDebug("init:error", { message: clerkErrorMessage(error) });
        clerkPromise = null;
        throw error;
      });

      return clerkPromise;
    }

    async function getToken() {
      const clerk = await initClerk();
      if (!clerk.session) {
        recordDebug("token:missing_session", summarizeClerk(clerk));
        return null;
      }
      const token = await clerk.session.getToken();
      recordDebug("token:resolved", { hasToken: Boolean(token), tokenHint: tokenHint(token), ...summarizeClerk(clerk) });
      return token;
    }

    async function getAuthHeaders(options = {}) {
      const token = await getToken();
      if (token && !options.skipPendingRoleSync) {
        await syncPendingRoleIfNeeded(token);
      }
      recordDebug("headers:resolved", { hasAuthorization: Boolean(token), skipPendingRoleSync: Boolean(options.skipPendingRoleSync) });
      return token ? { Authorization: "Bearer " + token } : {};
    }

    async function ensureSignedIn() {
      const clerk = await initClerk();
      if (!clerk.session) {
        throw new Error("Silakan login terlebih dahulu sebelum menyimpan data.");
      }
      return clerk;
    }

    async function syncUser(role) {
      const headers = await getAuthHeaders({ skipPendingRoleSync: true });
      if (!headers.Authorization) return null;
      const requestedRole = SELF_ASSIGNABLE_ROLES.has(role) ? role : getPendingRole();

      const response = await fetch("/auth-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(SELF_ASSIGNABLE_ROLES.has(requestedRole) ? { requested_role: requestedRole } : {}),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || result.error || "Sinkronisasi akun gagal.");
      syncedUser = result.user;
      if (SELF_ASSIGNABLE_ROLES.has(requestedRole)) clearPendingRole();
      return syncedUser;
    }

    function setPendingRole(role) {
      try {
        sessionStorage.setItem(PENDING_ROLE_KEY, role);
      } catch (_error) {
        Auth.pendingRole = role;
      }
    }

    function getPendingRole() {
      try {
        return sessionStorage.getItem(PENDING_ROLE_KEY) || Auth.pendingRole || "";
      } catch (_error) {
        return Auth.pendingRole || "";
      }
    }

    function clearPendingRole() {
      try {
        sessionStorage.removeItem(PENDING_ROLE_KEY);
      } catch (_error) {
        // Ignore storage failures; Auth.pendingRole is still cleared below.
      }
      Auth.pendingRole = "";
    }

    function setPendingNext(url) {
      if (!url || !url.startsWith("/")) return;
      try {
        sessionStorage.setItem(PENDING_NEXT_KEY, url);
      } catch (_error) {
        Auth.pendingNext = url;
      }
    }

    function getPendingNext() {
      try {
        return sessionStorage.getItem(PENDING_NEXT_KEY) || Auth.pendingNext || "";
      } catch (_error) {
        return Auth.pendingNext || "";
      }
    }

    function clearPendingNext() {
      try {
        sessionStorage.removeItem(PENDING_NEXT_KEY);
      } catch (_error) {
        // Ignore storage failures; Auth.pendingNext is still cleared below.
      }
      Auth.pendingNext = "";
    }

    async function syncPendingRoleIfNeeded(token) {
      const role = getPendingRole();
      if (!SELF_ASSIGNABLE_ROLES.has(role)) {
        recordDebug("pending_role:skip", { role: role || "", reason: role ? "not_self_assignable" : "none" });
        return;
      }
      if (pendingRoleSyncPromise) return pendingRoleSyncPromise;

      recordDebug("pending_role:sync_start", { role });
      pendingRoleSyncPromise = fetch("/auth-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ requested_role: role }),
      })
        .then(async function (response) {
          const result = await response.json();
          if (!result.success) throw new Error(result.message || result.error || "Sinkronisasi akun gagal.");
          syncedUser = result.user;
          clearPendingRole();
          recordDebug("pending_role:sync_ok", {
            role,
            userId: result.user?.id || "",
            roles: result.user?.roles || [],
          });
        })
        .catch(function (error) {
          recordDebug("pending_role:sync_error", { role, message: clerkErrorMessage(error) });
          throw error;
        })
        .finally(function () {
          pendingRoleSyncPromise = null;
        });

      return pendingRoleSyncPromise;
    }

    return {
      SELF_ASSIGNABLE_ROLES,
      Debug,
      initClerk,
      syncUser,
      setPendingRole,
      getPendingRole,
      clearPendingRole,
      setPendingNext,
      getPendingNext,
      clearPendingNext,
      clerkErrorMessage,
      nextUrl,
      registrationNextUrl,
      oauthCallbackUrl,
    };

    async function fetchAuthConfig() {
      try {
        const response = await fetch("/auth-config", { cache: "no-store" });
        recordDebug("config:response", { ok: response.ok, status: response.status });
        if (!response.ok) return { publishableKey: PUBLIC_CLERK_PUBLISHABLE_KEY, configured: true, source: "client-fallback" };
        const config = await response.json();
        return {
          ...config,
          publishableKey: normalizePublishableKey(config.publishableKey) || PUBLIC_CLERK_PUBLISHABLE_KEY,
        };
      } catch (error) {
        recordDebug("config:error", { message: clerkErrorMessage(error) });
        return { publishableKey: PUBLIC_CLERK_PUBLISHABLE_KEY, configured: true, source: "client-fallback" };
      }
    }

    function normalizePublishableKey(value) {
      return (value || "").toString().trim();
    }

    function createClerkInstance(ClerkCtor, publishableKey) {
      if (typeof ClerkCtor === "function") return new ClerkCtor(publishableKey);
      return ClerkCtor;
    }

    async function loadClerkInstance(clerk, publishableKey) {
      if (!clerk || typeof clerk.load !== "function") throw new Error("Layanan login gagal dimuat. Silakan muat ulang halaman.");
      try {
        await clerk.load({ publishableKey: publishableKey });
        recordDebug("clerk:load_object_ok", summarizeClerk(clerk));
      } catch (error) {
        if (!/publishableKey/i.test(error?.message || "")) throw error;
        await clerk.load(publishableKey);
        recordDebug("clerk:load_string_ok", summarizeClerk(clerk));
      }
    }

    async function handleOAuthRedirectIfNeeded(clerk) {
      const hasRedirectParams = hasClerkRedirectParams();
      const isCallbackPath = isCurrentSsoCallbackPath();
      if ((!hasRedirectParams && !isCallbackPath) || typeof clerk.handleRedirectCallback !== "function") {
        recordDebug("oauth_callback:skip", {
          hasRedirectParams,
          isCallbackPath,
          hasHandler: typeof clerk.handleRedirectCallback === "function",
        });
        return;
      }

      const redirectUrlComplete = getPendingNext() || nextUrlFromSearch() || currentAuthUrl();
      let callbackTarget = redirectUrlComplete;
      const createdSessionId = getClerkRedirectParam("__clerk_created_session");
      recordDebug("oauth_callback:start", {
        redirectUrlComplete,
        hasRedirectParams,
        isCallbackPath,
        hasCreatedSessionId: Boolean(createdSessionId),
        createdSessionHint: sessionHint(createdSessionId),
        before: summarizeClerk(clerk),
      });
      await clerk.handleRedirectCallback({ redirectUrlComplete }, async function (target) {
        callbackTarget = target || redirectUrlComplete;
        recordDebug("oauth_callback:navigate_target", { target: callbackTarget });
      });
      recordDebug("oauth_callback:handled", summarizeClerk(clerk));
      if (!clerk.session && createdSessionId && typeof clerk.setActive === "function") {
        await clerk.setActive({ session: createdSessionId });
        recordDebug("oauth_callback:set_active_from_param", summarizeClerk(clerk));
      }
      await refreshClerkResources(clerk);
      recordDebug("oauth_callback:refreshed", summarizeClerk(clerk));
      clearPendingNext();

      await navigateAfterOAuth(callbackTarget);
    }

    async function navigateAfterOAuth(target) {
      clearPendingNext();
      const targetUrl = new URL(target || currentAuthUrl(), window.location.origin);
      const currentUrl = new URL(window.location.href);
      removeClerkRedirectParams(currentUrl.searchParams);

      if (
        targetUrl.origin === currentUrl.origin &&
        targetUrl.pathname === currentUrl.pathname &&
        targetUrl.search === currentUrl.search &&
        targetUrl.hash === currentUrl.hash
      ) {
        window.history.replaceState(window.history.state, document.title, targetUrl.href);
        recordDebug("oauth_callback:clean_url", { target: targetUrl.href });
        return;
      }

      recordDebug("oauth_callback:redirect", { target: targetUrl.href });
      window.location.assign(targetUrl.href);
      await new Promise(function () {});
    }

    async function refreshClerkResources(clerk) {
      if (typeof clerk.__internal_reloadInitialResources === "function") {
        await clerk.__internal_reloadInitialResources();
        recordDebug("clerk:resources_reloaded_internal", summarizeClerk(clerk));
        return;
      }
      if (typeof clerk.load === "function") {
        await clerk.load();
        recordDebug("clerk:resources_reloaded_load", summarizeClerk(clerk));
      }
    }

    function hasClerkRedirectParams() {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams((window.location.hash || "").replace(/^#\/?/, ""));
      return CLERK_REDIRECT_PARAMS.some(function (key) {
        return search.has(key) || hash.has(key);
      });
    }

    function isCurrentSsoCallbackPath() {
      const expected = new URL(SSO_CALLBACK_PATH, window.location.origin).pathname.replace(/\/+$/, "");
      const current = window.location.pathname.replace(/\/+$/, "");
      return current === expected;
    }

    function getClerkRedirectParam(key) {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams((window.location.hash || "").replace(/^#\/?/, ""));
      return search.get(key) || hash.get(key) || "";
    }

    function removeClerkRedirectParams(params) {
      CLERK_REDIRECT_PARAMS.forEach(function (key) {
        params.delete(key);
      });
    }

    function currentAuthUrl() {
      const url = new URL(window.location.href);
      removeClerkRedirectParams(url.searchParams);
      return url.href;
    }

    function oauthCallbackUrl() {
      return new URL(SSO_CALLBACK_PATH, window.location.origin).href;
    }

    async function loadScriptWithFallbacks(srcList, publishableKey) {
      if (window.Clerk) return;

      applyPublishableKeyGlobals(publishableKey);

      let lastError = null;
      for (const src of srcList) {
        try {
          await loadScript(src, publishableKey);
          if (window.Clerk) return;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error("Layanan login gagal dimuat. Silakan muat ulang halaman.");
    }

    function loadScript(src, publishableKey) {
      if (window.Clerk) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        const existing = Array.from(document.querySelectorAll('script[data-franchise-clerk="true"]'))
          .find(function (script) {
            return script.getAttribute("src") === src;
          });
        if (existing) {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", reject, { once: true });
          recordDebug("script:reuse", { src });
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.dataset.franchiseClerk = "true";
        script.dataset.clerkPublishableKey = publishableKey;
        script.setAttribute("data-clerk-publishable-key", publishableKey);
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener("error", function () {
          script.remove();
          recordDebug("script:error", { src });
          reject(new Error("Layanan login gagal dimuat. Silakan muat ulang halaman."));
        }, { once: true });
        recordDebug("script:append", { src });
        document.head.appendChild(script);
      });
    }

    function applyPublishableKeyGlobals(publishableKey) {
      window.__clerk_publishable_key = publishableKey;
    }

    function clerkErrorMessage(error) {
      const apiError = error?.errors?.[0];
      return apiError?.longMessage || apiError?.message || error.message || "Proses autentikasi gagal.";
    }

    function nextUrl(root) {
      const next = new URLSearchParams(window.location.search).get("next");
      const rootNext = root?.getAttribute("data-auth-next");
      if (root?.getAttribute("data-auth-variant") === "staff" && rootNext && rootNext.startsWith("/")) {
        return rootNext;
      }
      if (next && next.startsWith("/")) return next;
      return rootNext && rootNext.startsWith("/") ? rootNext : "/profil/";
    }

    function registrationNextUrl(role) {
      const normalizedRole = SELF_ASSIGNABLE_ROLES.has(role) ? role : "franchisee";
      const url = new URL("/daftar/", window.location.origin);
      url.searchParams.set("role", normalizedRole);
      url.searchParams.set("continue", "1");
      return url.pathname + url.search;
    }

    function nextUrlFromSearch() {
      const next = new URLSearchParams(window.location.search).get("next");
      return next && next.startsWith("/") ? next : "";
    }

    function sanitizedLocation() {
      const url = new URL(window.location.href);
      removeClerkRedirectParams(url.searchParams);
      return url.pathname + url.search + url.hash;
    }
  }
})(window, document);
