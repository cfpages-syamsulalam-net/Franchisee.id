(function (window, document) {
  const DEBUG_EVENTS_KEY = "franchise_auth_debug_events";
  const MAX_DEBUG_EVENTS = 60;

  window.FranchiseAuthDebug = {
    create,
  };

  function create(options) {
    const auth = options.auth;

    return {
      initEvents,
      getDebugSnapshot,
      recordDebug,
      summarizeClerk,
      keyHint,
      tokenHint,
      sessionHint,
    };

    function initEvents(current) {
      return mergeDebugEvents(loadStoredDebugEvents(), current || []);
    }

    function getDebugSnapshot() {
      const clerk = auth.clerk || null;
      const syncedUser = safeCall(options.getSyncedUser, null);
      return {
        generatedAt: new Date().toISOString(),
        location: sanitizedLocation(),
        locationParts: locationParts(),
        hasWindowClerk: Boolean(window.Clerk),
        hasAuthClerk: Boolean(clerk),
        clerk: summarizeClerk(clerk),
        storage: {
          pendingRole: safeCall(options.getPendingRole, ""),
          pendingNext: safeCall(options.getPendingNext, ""),
        },
        browserState: {
          clerkCookieNames: getClerkCookieNames(),
          sessionStorageKeys: getStorageKeys(window.sessionStorage),
          localStorageKeys: getStorageKeys(window.localStorage),
        },
        redirect: {
          hasParams: Boolean(safeCall(options.hasClerkRedirectParams, false)),
          createdSessionHint: sessionHint(safeCall(function () {
            return options.getClerkRedirectParam("__clerk_created_session");
          }, "")),
        },
        syncedUser: syncedUser
          ? {
              id: syncedUser.id || "",
              email: syncedUser.email || syncedUser.primary_email || "",
              roles: syncedUser.roles || [],
            }
          : null,
        events: (auth.debugEvents || []).slice(-MAX_DEBUG_EVENTS),
      };
    }

    function recordDebug(event, details = {}) {
      const entry = {
        at: new Date().toISOString(),
        event,
        details: sanitizeDebugValue(details),
      };
      auth.debugEvents = auth.debugEvents || [];
      auth.debugEvents.push(entry);
      if (auth.debugEvents.length > MAX_DEBUG_EVENTS) {
        auth.debugEvents.splice(0, auth.debugEvents.length - MAX_DEBUG_EVENTS);
      }
      storeDebugEvents(auth.debugEvents);
      if (window.FRANCHISE_AUTH_DEBUG || /(?:\?|&)auth_debug=1(?:&|$)/.test(window.location.search)) {
        console.info("[FranchiseAuth]", event, entry.details);
      }
      return entry;
    }

    function sanitizedLocation() {
      const url = new URL(window.location.href);
      if (typeof options.removeClerkRedirectParams === "function") {
        options.removeClerkRedirectParams(url.searchParams);
      }
      return url.pathname + url.search + url.hash;
    }
  }

  function summarizeClerk(clerk) {
    if (!clerk) {
      return {
        loaded: false,
        hasUser: false,
        hasSession: false,
        sessionHint: "",
        userIdHint: "",
        email: "",
        clientSessionCount: 0,
        clientActiveSessionHint: "",
      };
    }
    const sessions = Array.isArray(clerk.client?.sessions) ? clerk.client.sessions : [];
    const activeSession = clerk.session || clerk.client?.activeSessions?.[0] || null;
    return {
      loaded: Boolean(clerk.loaded),
      hasUser: Boolean(clerk.user),
      hasSession: Boolean(clerk.session),
      sessionHint: sessionHint(activeSession?.id || clerk.session?.id || ""),
      userIdHint: sessionHint(clerk.user?.id || activeSession?.user?.id || ""),
      email: clerk.user?.primaryEmailAddress?.emailAddress || activeSession?.user?.primaryEmailAddress?.emailAddress || "",
      clientSessionCount: sessions.length,
      clientActiveSessionHint: sessionHint(clerk.client?.activeSession?.id || ""),
    };
  }

  function sanitizeDebugValue(value) {
    if (value == null) return value;
    if (typeof value === "string") {
      if (/^eyJ/.test(value) || value.length > 180) return tokenHint(value);
      return value;
    }
    if (Array.isArray(value)) return value.map(sanitizeDebugValue);
    if (typeof value === "object") {
      return Object.keys(value).reduce(function (result, key) {
        if (/token|secret|password/i.test(key)) {
          result[key] = tokenHint(value[key] || "");
        } else {
          result[key] = sanitizeDebugValue(value[key]);
        }
        return result;
      }, {});
    }
    return value;
  }

  function locationParts() {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams((window.location.hash || "").replace(/^#\/?/, ""));
    return {
      pathname: window.location.pathname,
      searchKeys: Array.from(search.keys()).sort(),
      hashKeys: Array.from(hash.keys()).sort(),
      hasHash: Boolean(window.location.hash),
    };
  }

  function keyHint(value) {
    if (!value) return "";
    const text = String(value);
    return text.slice(0, 8) + "..." + text.slice(-6);
  }

  function tokenHint(value) {
    if (!value) return "";
    const text = String(value);
    return text.slice(0, 10) + "...len" + text.length;
  }

  function sessionHint(value) {
    if (!value) return "";
    const text = String(value);
    return text.length <= 10 ? text : text.slice(0, 6) + "..." + text.slice(-4);
  }

  function getClerkCookieNames() {
    try {
      return document.cookie
        .split(";")
        .map(function (part) {
          return part.trim().split("=")[0];
        })
        .filter(function (name) {
          return /clerk|__client|__session|sess/i.test(name);
        })
        .sort();
    } catch (_error) {
      return [];
    }
  }

  function getStorageKeys(storage) {
    try {
      return Object.keys(storage || {})
        .filter(function (key) {
          return /clerk|franchise_auth/i.test(key);
        })
        .sort();
    } catch (_error) {
      return [];
    }
  }

  function loadStoredDebugEvents() {
    try {
      const raw = sessionStorage.getItem(DEBUG_EVENTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(-MAX_DEBUG_EVENTS) : [];
    } catch (_error) {
      return [];
    }
  }

  function storeDebugEvents(events) {
    try {
      sessionStorage.setItem(DEBUG_EVENTS_KEY, JSON.stringify((events || []).slice(-MAX_DEBUG_EVENTS)));
    } catch (_error) {
      // Debug persistence is best-effort only.
    }
  }

  function mergeDebugEvents(stored, current) {
    const seen = new Set();
    return (stored || []).concat(current || []).filter(function (event) {
      const key = [event.at, event.event, JSON.stringify(event.details || {})].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(-MAX_DEBUG_EVENTS);
  }

  function safeCall(callback, fallback) {
    try {
      return typeof callback === "function" ? callback() : fallback;
    } catch (_error) {
      return fallback;
    }
  }
})(window, document);
