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
  const GOOGLE_ICON = `
    <svg class="fr-auth-google-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.54-5.17 3.54-8.88z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3.01c-1.08.72-2.45 1.14-4.05 1.14-3.11 0-5.75-2.1-6.7-4.93H1.29v3.1A11.99 11.99 0 0 0 12 24z"/>
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.29a12.02 12.02 0 0 0 0 10.8l4.01-3.1z"/>
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.79l3.43-3.43A11.52 11.52 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.6L5.3 9.7C6.25 6.87 8.89 4.77 12 4.77z"/>
    </svg>
  `;
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
  let clerkPromise = null;
  let syncedUser = null;
  let pendingRoleSyncPromise = null;

  const Auth = (window.FranchiseAuth = window.FranchiseAuth || {});
  if (!window.FranchiseAuthDebug || typeof window.FranchiseAuthDebug.create !== "function") {
    throw new Error("FranchiseAuthDebug belum dimuat.");
  }

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

  document.addEventListener("DOMContentLoaded", function () {
    mountAuthPage();
  });

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

  function mountAuthPage() {
    const root = document.getElementById("franchise-auth-root") || document.getElementById("wpforms-725");
    if (!root) return;

    const variant = root.getAttribute("data-auth-variant") || "public";
    const isLoginOnly = variant === "staff";
    const defaultMode = root.getAttribute("data-auth-mode") || new URLSearchParams(window.location.search).get("mode") || "login";
    root.innerHTML = authTemplate(normalizeAuthMode(defaultMode, isLoginOnly), {
      isLoginOnly,
    });
    bindAuthEvents(root);
    showInitialAuthMessage(root);
    renderSessionState(root);
  }

  function authTemplate(mode, options = {}) {
    if (!window.FranchiseAuthUI || typeof window.FranchiseAuthUI.authTemplate !== "function") {
      throw new Error("Tampilan login belum siap. Silakan muat ulang halaman.");
    }
    return window.FranchiseAuthUI.authTemplate(mode, options);
  }

  function bindAuthEvents(root) {
    root.querySelectorAll("[data-auth-oauth]").forEach(function (button) {
      button.addEventListener("click", function () {
        handleOAuth(root, button);
      });
    });

    root.querySelectorAll("[data-auth-switch]").forEach(function (button) {
      button.addEventListener("click", function () {
        switchMode(root, button.getAttribute("data-auth-switch"));
      });
    });

    const loginForm = root.querySelector('[data-auth-form="login"]');
    const registerForm = root.querySelector('[data-auth-form="register"]');
    const verifyForm = root.querySelector('[data-auth-form="verify"]');
    const forgotPasswordForm = root.querySelector('[data-auth-form="forgot-password"]');
    const resetPasswordForm = root.querySelector('[data-auth-form="reset-password"]');

    if (loginForm) {
      loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        handleLogin(root, loginForm);
      });
    }

    if (registerForm) {
      registerForm.addEventListener("submit", function (event) {
        event.preventDefault();
        handleRegister(root, registerForm);
      });
    }

    if (verifyForm) {
      verifyForm.addEventListener("submit", function (event) {
        event.preventDefault();
        handleVerification(root, verifyForm);
      });
    }

    if (forgotPasswordForm) {
      forgotPasswordForm.addEventListener("submit", function (event) {
        event.preventDefault();
        handleForgotPassword(root, forgotPasswordForm);
      });
    }

    if (resetPasswordForm) {
      resetPasswordForm.addEventListener("submit", function (event) {
        event.preventDefault();
        handleResetPassword(root, resetPasswordForm);
      });
    }
  }

  async function renderSessionState(root) {
    try {
      const clerk = await initClerk();
      const holder = root.querySelector("[data-auth-session]");
      if (!holder || !clerk.session) return;

      const user = await syncUser();
      const privileged = isPrivilegedUser(user);
      holder.innerHTML = `
        <div class="fr-auth-status ${privileged ? "is-inspectable" : ""}">
          <div>
            <strong><i class="fas fa-user-check" aria-hidden="true"></i> Anda sudah login.</strong>
            <div class="fr-auth-muted">${escapeHtml(user?.email || clerk.user?.primaryEmailAddress?.emailAddress || "")}</div>
          </div>
          <div class="fr-auth-actions">
            <a class="fr-auth-button" href="${escapeHtml(nextUrl(root))}"><i class="fas fa-arrow-right" aria-hidden="true"></i> Lanjutkan</a>
            <button class="fr-auth-link-button" type="button" data-auth-signout><i class="fas fa-sign-out-alt" aria-hidden="true"></i> Logout</button>
          </div>
        </div>
      `;
      if (!privileged) hideForms(root);
      holder.querySelector("[data-auth-signout]").addEventListener("click", async function () {
        await clerk.signOut();
        window.location.reload();
      });
    } catch (error) {
      showMessage(root, error.message, "error");
    }
  }

  function showInitialAuthMessage(root) {
    const next = new URLSearchParams(window.location.search).get("next") || "";
    if (next.startsWith("/daftar")) {
      showMessage(root, "Silakan masuk dulu untuk melanjutkan ke form daftar mitra.", "info");
      return;
    }
    if (next.startsWith("/profil")) {
      showMessage(root, "Silakan masuk dulu untuk membuka profil akun.", "info");
    }
  }

  async function handleLogin(root, form) {
    setBusy(form, true);
    showMessage(root, "", "");
    try {
      const clerk = await initClerk();
      const data = formData(form);
      const signIn = await clerk.client.signIn.create({
        identifier: data.email,
        password: data.password,
      });

      if (signIn.status !== "complete" || !signIn.createdSessionId) {
        throw new Error("Login memerlukan langkah verifikasi tambahan yang belum diaktifkan di halaman ini.");
      }

      await clerk.setActive({ session: signIn.createdSessionId });
      await syncUser();
      showMessage(root, "Login berhasil.", "success");
      window.location.href = nextUrl(root);
    } catch (error) {
      showMessage(root, clerkErrorMessage(error), "error");
    } finally {
      setBusy(form, false);
    }
  }

  async function handleForgotPassword(root, form) {
    setBusy(form, true);
    showMessage(root, "", "");
    try {
      const clerk = await initClerk();
      const data = formData(form);
      const signIn = await clerk.client.signIn.create({
        strategy: "reset_password_email_code",
        identifier: data.email,
      });
      Auth.resetPasswordSignIn = signIn;
      Auth.resetPasswordEmail = data.email;
      switchMode(root, "reset-password");
      showMessage(root, "Kode atur ulang password sudah dikirim ke email Anda.", "success");
      root.querySelector('[data-auth-form="reset-password"] input[name="code"]')?.focus();
    } catch (error) {
      showMessage(root, clerkErrorMessage(error), "error");
    } finally {
      setBusy(form, false);
    }
  }

  async function handleResetPassword(root, form) {
    setBusy(form, true);
    showMessage(root, "", "");
    try {
      const clerk = await initClerk();
      const data = formData(form);
      if (!Auth.resetPasswordSignIn) {
        throw new Error("Silakan kirim kode atur ulang password terlebih dahulu.");
      }
      if (String(data.password || "").length < 8) {
        throw new Error("Password minimal 8 karakter.");
      }
      if (data.password !== data.confirm_password) {
        throw new Error("Ulangi password baru dengan nilai yang sama.");
      }

      const verified = await Auth.resetPasswordSignIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: data.code,
      });
      if (verified.status !== "needs_new_password") {
        throw new Error("Kode belum valid. Periksa email dan coba lagi.");
      }

      const reset = await verified.resetPassword({
        password: data.password,
        signOutOfOtherSessions: true,
      });
      if (reset.status !== "complete" || !reset.createdSessionId) {
        throw new Error("Password belum bisa disimpan. Silakan coba lagi.");
      }

      await clerk.setActive({ session: reset.createdSessionId });
      await syncUser();
      Auth.resetPasswordSignIn = null;
      Auth.resetPasswordEmail = "";
      showMessage(root, "Password baru tersimpan.", "success");
      window.location.href = nextUrl(root);
    } catch (error) {
      showMessage(root, clerkErrorMessage(error), "error");
    } finally {
      setBusy(form, false);
    }
  }

  async function handleOAuth(root, button) {
    button.disabled = true;
    showMessage(root, "", "");
    try {
      const clerk = await initClerk();
      const mode = button.getAttribute("data-auth-oauth-mode") || "login";
      const role = mode === "register" ? getSelectedRegisterRole(root) : "";
      if (SELF_ASSIGNABLE_ROLES.has(role)) {
        setPendingRole(role);
      }
      const redirectUrlComplete = mode === "register" ? registrationNextUrl(role) : nextUrl(root);

      const params = {
        strategy: "oauth_google",
        redirectUrl: oauthCallbackUrl(),
        redirectUrlComplete,
        signInFallbackRedirectUrl: redirectUrlComplete,
        signUpFallbackRedirectUrl: redirectUrlComplete,
        continueSignIn: true,
        continueSignUp: true,
      };
      setPendingNext(params.redirectUrlComplete);

      if (mode === "register" && clerk.client?.signUp?.authenticateWithRedirect) {
        await clerk.client.signUp.authenticateWithRedirect({
          ...params,
          unsafeMetadata: role ? { requested_role: role } : undefined,
        });
        return;
      }

      if (clerk.client?.signIn?.authenticateWithRedirect) {
        await clerk.client.signIn.authenticateWithRedirect(params);
        return;
      }

      throw new Error("Login Google belum tersedia saat ini.");
    } catch (error) {
      clearPendingRole();
      clearPendingNext();
      button.disabled = false;
      showMessage(root, clerkErrorMessage(error), "error");
    }
  }

  async function handleRegister(root, form) {
    setBusy(form, true);
    showMessage(root, "", "");
    try {
      const clerk = await initClerk();
      const data = formData(form);
      Auth.pendingRole = data.role;
      setPendingRole(data.role);
      setPendingNext(registrationNextUrl(data.role));
      const signUp = await clerk.client.signUp.create({
        emailAddress: data.email,
        password: data.password,
        unsafeMetadata: { requested_role: data.role },
      });

      if (signUp.status === "complete" && signUp.createdSessionId) {
        await finishRegistration(root, clerk, signUp.createdSessionId, data.role);
        return;
      }

      await clerk.client.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      switchMode(root, "verify");
      showMessage(root, "Kode verifikasi sudah dikirim ke email Anda.", "success");
    } catch (error) {
      showMessage(root, clerkErrorMessage(error), "error");
    } finally {
      setBusy(form, false);
    }
  }

  async function handleVerification(root, form) {
    setBusy(form, true);
    showMessage(root, "", "");
    try {
      const clerk = await initClerk();
      const data = formData(form);
      const result = await clerk.client.signUp.attemptEmailAddressVerification({ code: data.code });
      if (result.status !== "complete" || !result.createdSessionId) {
        throw new Error("Kode verifikasi belum valid.");
      }
      await finishRegistration(root, clerk, result.createdSessionId, Auth.pendingRole || "franchisee");
    } catch (error) {
      showMessage(root, clerkErrorMessage(error), "error");
    } finally {
      setBusy(form, false);
    }
  }

  async function finishRegistration(root, clerk, sessionId, role) {
    await clerk.setActive({ session: sessionId });
    await syncUser(role);
    clearPendingRole();
    clearPendingNext();
    showMessage(root, "Akun berhasil dibuat.", "success");
    window.location.href = registrationNextUrl(role);
  }

  function switchMode(root, mode) {
    const nextMode = normalizeAuthMode(mode, root?.getAttribute("data-auth-variant") === "staff", { allowReset: true });
    root.querySelector(".fr-auth-shell")?.setAttribute("data-current-mode", nextMode);
    root.querySelectorAll("[data-auth-switch]").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-auth-switch") === nextMode);
    });
    root.querySelectorAll("[data-auth-form]").forEach(function (form) {
      const isActive = form.getAttribute("data-auth-form") === nextMode;
      form.hidden = !isActive;
      form.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
  }

  function normalizeAuthMode(mode, isLoginOnly, options = {}) {
    const value = String(mode || "login").toLowerCase();
    if (isLoginOnly) return "login";
    const allowed = options.allowReset
      ? ["login", "register", "forgot-password", "reset-password", "forgot-email"]
      : ["login", "register", "forgot-password", "forgot-email"];
    return allowed.includes(value) ? value : "login";
  }

  function hideForms(root) {
    root.querySelectorAll("[data-auth-form], .fr-auth-tabs").forEach(function (item) {
      item.hidden = true;
      item.setAttribute("aria-hidden", "true");
    });
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function getSelectedRegisterRole(root) {
    return root.querySelector('[data-auth-form="register"] input[name="role"]:checked')?.value || "franchisee";
  }

  function isPrivilegedUser(user) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    return roles.some(function (role) {
      const name = typeof role === "string" ? role : role?.role;
      return name === "admin" || name === "staff";
    });
  }

  function setBusy(form, busy) {
    form.querySelectorAll("button, input").forEach(function (item) {
      item.disabled = busy;
    });
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

  function showMessage(root, message, type) {
    const target = root.querySelector("[data-auth-message]");
    if (!target) return;
    target.textContent = message || "";
    target.className = "fr-auth-message";
    if (message) {
      target.classList.add("is-visible", type === "success" ? "is-success" : "is-error");
    }
  }

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

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[char];
    });
  }
})(window, document);
