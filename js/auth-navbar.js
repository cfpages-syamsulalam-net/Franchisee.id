(function (window, document) {
  const Auth = window.FranchiseAuth;
  const PUBLIC_ROLES = ["franchisee", "franchisor"];
  const ROLE_LABELS = {
    franchisee: "Franchisee",
    franchisor: "Franchisor",
    staff: "Staff",
    admin: "Admin",
  };
  const LOGOUT_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M16 13v-2H7.83l3.58-3.59L10 6l-6 6 6 6 1.41-1.41L7.83 13H16Zm3-10H9a2 2 0 0 0-2 2v3h2V5h10v14H9v-3H7v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"/>
    </svg>
  `;

  if (!Auth || typeof Auth.init !== "function") return;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavbarAuth);
  } else {
    initNavbarAuth();
  }

  async function initNavbarAuth() {
    try {
      const pairs = findAuthMenuPairs();
      if (!pairs.length) return;
      normalizeLoggedOutLinks(pairs);

      const clerk = await Auth.init();
      if (!clerk?.session) return;

      const user = typeof Auth.syncUser === "function" ? await Auth.syncUser() : null;
      replaceAuthLinks(pairs, clerk, user);
    } catch (error) {
      if (typeof Auth.recordDebug === "function") {
        Auth.recordDebug("navbar:error", { message: error?.message || "Navbar auth gagal." });
      }
    }
  }

  function findAuthMenuPairs() {
    const menus = Array.from(document.querySelectorAll(".hfe-nav-menu"));
    return menus
      .map(function (menu) {
        const links = Array.from(menu.querySelectorAll("a[href]"));
        const loginLink = links.find(function (link) {
          return normalizePath(link.getAttribute("href")) === "/login";
        });
        const daftarLink = links.find(function (link) {
          return normalizePath(link.getAttribute("href")) === "/daftar";
        });
        if (!loginLink && !daftarLink) return null;
        return {
          menu,
          loginItem: closestMenuItem(loginLink),
          daftarItem: closestMenuItem(daftarLink),
        };
      })
      .filter(Boolean);
  }

  function replaceAuthLinks(pairs, clerk, user) {
    const accountItem = createAccountItem(clerk, user);
    pairs.forEach(function (pair, index) {
      const item = index === 0 ? accountItem : accountItem.cloneNode(true);
      bindLogout(item, clerk);

      if (pair.loginItem) {
        pair.loginItem.replaceWith(item);
      } else if (pair.daftarItem) {
        pair.daftarItem.replaceWith(item);
      } else {
        pair.menu.appendChild(item);
      }

      if (pair.daftarItem && pair.daftarItem.isConnected) {
        pair.daftarItem.remove();
      }
    });
  }

  function normalizeLoggedOutLinks(pairs) {
    pairs.forEach(function (pair) {
      const loginLink = pair.loginItem?.querySelector("a[href]");
      const daftarLink = pair.daftarItem?.querySelector("a[href]");
      if (loginLink) loginLink.textContent = "Masuk";
      if (daftarLink) {
        daftarLink.textContent = "Daftar Mitra";
        daftarLink.setAttribute("href", "/login/?mode=register");
      }
    });
  }

  function createAccountItem(clerk, user) {
    const role = primaryRole(user?.roles || []);
    const name = displayName(user, clerk);
    const item = document.createElement("li");
    item.className = "menu-item menu-item-type-custom menu-item-object-custom parent hfe-creative-menu fr-auth-nav-account";
    item.innerHTML = `
      <a href="/daftar/" class="hfe-menu-item fr-auth-nav-link">
        <span class="fr-auth-nav-name">${escapeHtml(name)}</span>
        <span class="fr-auth-nav-role">${escapeHtml(ROLE_LABELS[role] || "Akun")}</span>
      </a>
      <button class="fr-auth-nav-logout" type="button" data-auth-navbar-logout aria-label="Logout" title="Logout">${LOGOUT_ICON}</button>
    `;
    return item;
  }

  function bindLogout(item, clerk) {
    const button = item.querySelector("[data-auth-navbar-logout]");
    if (!button) return;
    button.addEventListener("click", async function (event) {
      event.preventDefault();
      event.stopPropagation();
      button.disabled = true;
      await clerk.signOut();
      window.location.href = "/";
    });
  }

  function primaryRole(roles) {
    const names = roles.map(function (role) {
      return typeof role === "string" ? role : role?.role;
    });
    return PUBLIC_ROLES.find(function (role) {
      return names.includes(role);
    }) || (names.includes("admin") ? "admin" : names.includes("staff") ? "staff" : "");
  }

  function displayName(user, clerk) {
    const email = user?.email || clerk?.user?.primaryEmailAddress?.emailAddress || "";
    return (
      user?.display_name ||
      clerk?.user?.fullName ||
      clerk?.user?.firstName ||
      (email ? email.split("@")[0] : "Akun")
    );
  }

  function closestMenuItem(link) {
    return link ? link.closest("li.menu-item") : null;
  }

  function normalizePath(href) {
    try {
      return new URL(href, window.location.origin).pathname.replace(/\/+$/, "") || "/";
    } catch (_error) {
      return "";
    }
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
