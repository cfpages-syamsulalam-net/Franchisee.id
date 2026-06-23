(function (window, document) {
  const CLERK_JS_URLS = [
    "/clerk/clerk.browser.js",
    "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6.17.0/dist/clerk.browser.js",
    "https://unpkg.com/@clerk/clerk-js@6.17.0/dist/clerk.browser.js",
  ];
  const PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_Y2xlcmsuZnJhbmNoaXNlZS5pZCQ";
  const PENDING_ROLE_KEY = "franchise_auth_pending_role";
  const PENDING_NEXT_KEY = "franchise_auth_pending_next";
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

  Auth.init = initClerk;
  Auth.getToken = getToken;
  Auth.getAuthHeaders = getAuthHeaders;
  Auth.syncUser = syncUser;
  Auth.ensureSignedIn = ensureSignedIn;

  document.addEventListener("DOMContentLoaded", function () {
    mountAuthPage();
  });

  async function initClerk() {
    if (clerkPromise) return clerkPromise;

    clerkPromise = (async function () {
      const config = await fetchAuthConfig();
      const publishableKey = normalizePublishableKey(config.publishableKey) || PUBLIC_CLERK_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error("Clerk publishable key belum dikonfigurasi di Cloudflare Pages.");
      }

      await loadScriptWithFallbacks(CLERK_JS_URLS, publishableKey);
      const ClerkCtor = window.Clerk;
      if (!ClerkCtor) throw new Error("ClerkJS gagal dimuat.");

      const clerk = createClerkInstance(ClerkCtor, publishableKey);
      await loadClerkInstance(clerk, publishableKey);
      await handleOAuthRedirectIfNeeded(clerk);
      Auth.clerk = clerk;
      return clerk;
    })();

    return clerkPromise;
  }

  async function getToken() {
    const clerk = await initClerk();
    if (!clerk.session) return null;
    return clerk.session.getToken();
  }

  async function getAuthHeaders(options = {}) {
    const token = await getToken();
    if (token && !options.skipPendingRoleSync) {
      await syncPendingRoleIfNeeded(token);
    }
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

    const response = await fetch("/auth-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(role ? { requested_role: role } : {}),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || result.error || "Sinkronisasi akun gagal.");
    syncedUser = result.user;
    return syncedUser;
  }

  function mountAuthPage() {
    const root = document.getElementById("franchise-auth-root") || document.getElementById("wpforms-725");
    if (!root) return;

    const variant = root.getAttribute("data-auth-variant") || "public";
    const isLoginOnly = variant === "staff";
    const defaultMode = root.getAttribute("data-auth-mode") || new URLSearchParams(window.location.search).get("mode") || "login";
    root.innerHTML = authTemplate(defaultMode === "register" && !isLoginOnly ? "register" : "login", {
      isLoginOnly,
    });
    bindAuthEvents(root);
    renderSessionState(root);
  }

  function authTemplate(mode, options = {}) {
    const isRegister = mode === "register";
    const isLoginOnly = Boolean(options.isLoginOnly);
    return `
      <div class="fr-auth-shell" data-current-mode="${mode}">
        <div class="fr-auth-panel">
          ${isLoginOnly ? `
            <div class="fr-auth-context">
              <h2>Login Admin / Staff</h2>
              <p>Gunakan akun internal yang sudah diberi peran admin atau staff di D1.</p>
            </div>
          ` : `
            <div class="fr-auth-tabs" role="tablist" aria-label="Login dan daftar">
              <button class="fr-auth-tab ${!isRegister ? "is-active" : ""}" type="button" data-auth-switch="login">Login</button>
              <button class="fr-auth-tab ${isRegister ? "is-active" : ""}" type="button" data-auth-switch="register">Daftar</button>
            </div>
          `}
          <div class="fr-auth-message" data-auth-message></div>
          <div data-auth-session></div>
          <form class="fr-auth-form" data-auth-form="login" ${isRegister ? "hidden" : ""} aria-hidden="${isRegister ? "true" : "false"}">
            <div class="fr-auth-oauth">
              <button class="fr-auth-oauth-button" type="button" data-auth-oauth="google" data-auth-oauth-mode="login">
                <span class="fr-auth-oauth-icon" aria-hidden="true">G</span>
                <span>Login dengan Google</span>
              </button>
              <div class="fr-auth-divider"><span>atau</span></div>
            </div>
            <div class="fr-auth-field">
              <label for="fr-auth-login-email">Email</label>
              <input id="fr-auth-login-email" name="email" type="email" autocomplete="email" required>
            </div>
            <div class="fr-auth-field">
              <label for="fr-auth-login-password">Password</label>
              <input id="fr-auth-login-password" name="password" type="password" autocomplete="current-password" required>
            </div>
            <div class="fr-auth-actions">
              <button class="fr-auth-button" type="submit">Login</button>
            </div>
            ${isLoginOnly ? "" : `<p class="fr-auth-switch-note">
              Belum daftar?
              <button class="fr-auth-inline-link" type="button" data-auth-switch="register">Daftar dulu di sini.</button>
            </p>`}
          </form>
          ${isLoginOnly ? "" : `<form class="fr-auth-form" data-auth-form="register" ${!isRegister ? "hidden" : ""} aria-hidden="${!isRegister ? "true" : "false"}">
            <div class="fr-auth-oauth">
              <button class="fr-auth-oauth-button" type="button" data-auth-oauth="google" data-auth-oauth-mode="register">
                <span class="fr-auth-oauth-icon" aria-hidden="true">G</span>
                <span>Daftar dengan Google</span>
              </button>
              <div class="fr-auth-divider"><span>atau</span></div>
            </div>
            <div class="fr-auth-field">
              <label for="fr-auth-register-email">Email</label>
              <input id="fr-auth-register-email" name="email" type="email" autocomplete="email" required>
            </div>
            <div class="fr-auth-field">
              <label for="fr-auth-register-password">Password</label>
              <input id="fr-auth-register-password" name="password" type="password" autocomplete="new-password" minlength="8" required>
            </div>
            <div>
              <div class="fr-auth-role-title">Tipe akun</div>
              <div class="fr-auth-role-grid">
                <label class="fr-auth-role">
                  <input type="radio" name="role" value="franchisee" checked>
                  <span>Franchisee</span>
                </label>
                <label class="fr-auth-role">
                  <input type="radio" name="role" value="franchisor">
                  <span>Franchisor</span>
                </label>
              </div>
            </div>
            <div class="fr-auth-actions">
              <button class="fr-auth-button" type="submit">Daftar</button>
            </div>
            <p class="fr-auth-switch-note">
              Sudah punya akun?
              <button class="fr-auth-inline-link" type="button" data-auth-switch="login">Login di sini.</button>
            </p>
          </form>
          <form class="fr-auth-form" data-auth-form="verify" hidden aria-hidden="true">
            <div class="fr-auth-field">
              <label for="fr-auth-code">Kode verifikasi email</label>
              <input id="fr-auth-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" required>
            </div>
            <div class="fr-auth-actions">
              <button class="fr-auth-button" type="submit">Verifikasi</button>
            </div>
          </form>`}
        </div>
      </div>
    `;
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
  }

  async function renderSessionState(root) {
    try {
      const clerk = await initClerk();
      const holder = root.querySelector("[data-auth-session]");
      if (!holder || !clerk.session) return;

      const user = await syncUser();
      holder.innerHTML = `
        <div class="fr-auth-status">
          <div>
            <strong>Anda sudah login.</strong>
            <div class="fr-auth-muted">${escapeHtml(user?.email || clerk.user?.primaryEmailAddress?.emailAddress || "")}</div>
          </div>
          <div class="fr-auth-actions">
            <a class="fr-auth-button" href="${escapeHtml(nextUrl(root))}">Lanjutkan</a>
            <button class="fr-auth-link-button" type="button" data-auth-signout>Logout</button>
          </div>
        </div>
      `;
      hideForms(root);
      holder.querySelector("[data-auth-signout]").addEventListener("click", async function () {
        await clerk.signOut();
        window.location.reload();
      });
    } catch (error) {
      showMessage(root, error.message, "error");
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

      const params = {
        strategy: "oauth_google",
        redirectUrl: currentAuthUrl(),
        redirectUrlComplete: nextUrl(root),
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

      throw new Error("Google login belum tersedia di konfigurasi ClerkJS ini.");
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
    showMessage(root, "Akun berhasil dibuat.", "success");
    window.location.href = nextUrl(root);
  }

  function switchMode(root, mode) {
    root.querySelector(".fr-auth-shell")?.setAttribute("data-current-mode", mode);
    root.querySelectorAll("[data-auth-switch]").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-auth-switch") === mode);
    });
    root.querySelectorAll("[data-auth-form]").forEach(function (form) {
      const isActive = form.getAttribute("data-auth-form") === mode;
      form.hidden = !isActive;
      form.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
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
    if (!SELF_ASSIGNABLE_ROLES.has(role)) return;
    if (pendingRoleSyncPromise) return pendingRoleSyncPromise;

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
      if (!response.ok) return { publishableKey: PUBLIC_CLERK_PUBLISHABLE_KEY, configured: true, source: "client-fallback" };
      const config = await response.json();
      return {
        ...config,
        publishableKey: normalizePublishableKey(config.publishableKey) || PUBLIC_CLERK_PUBLISHABLE_KEY,
      };
    } catch (error) {
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
    if (!clerk || typeof clerk.load !== "function") throw new Error("ClerkJS gagal diinisialisasi.");
    try {
      await clerk.load({ publishableKey: publishableKey });
    } catch (error) {
      if (!/publishableKey/i.test(error?.message || "")) throw error;
      await clerk.load(publishableKey);
    }
  }

  async function handleOAuthRedirectIfNeeded(clerk) {
    if (!hasClerkRedirectParams() || typeof clerk.handleRedirectCallback !== "function") return;

    const redirectUrlComplete = getPendingNext() || nextUrlFromSearch() || currentAuthUrl();
    let callbackTarget = redirectUrlComplete;
    const createdSessionId = getClerkRedirectParam("__clerk_created_session");
    await clerk.handleRedirectCallback({ redirectUrlComplete }, async function (target) {
      callbackTarget = target || redirectUrlComplete;
    });
    if (!clerk.session && createdSessionId && typeof clerk.setActive === "function") {
      await clerk.setActive({ session: createdSessionId });
    }
    await refreshClerkResources(clerk);
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
      return;
    }

    window.location.assign(targetUrl.href);
    await new Promise(function () {});
  }

  async function refreshClerkResources(clerk) {
    if (typeof clerk.__internal_reloadInitialResources === "function") {
      await clerk.__internal_reloadInitialResources();
      return;
    }
    if (typeof clerk.load === "function") {
      await clerk.load();
    }
  }

  function hasClerkRedirectParams() {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams((window.location.hash || "").replace(/^#\/?/, ""));
    return CLERK_REDIRECT_PARAMS.some(function (key) {
      return search.has(key) || hash.has(key);
    });
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

    throw lastError || new Error("ClerkJS gagal dimuat.");
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
        reject(new Error("ClerkJS gagal dimuat."));
      }, { once: true });
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
    if (next && next.startsWith("/")) return next;
    return rootNext && rootNext.startsWith("/") ? rootNext : "/daftar/";
  }

  function nextUrlFromSearch() {
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith("/") ? next : "";
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
