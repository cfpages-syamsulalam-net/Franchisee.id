(function (window, document) {
  const Auth = window.FranchiseAuth;
  if (!Auth) return;

  document.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-save-franchise]");
    if (!button) return;
    event.preventDefault();
    await toggleSave(button);
  });

  async function toggleSave(button) {
    const franchiseId = button.getAttribute("data-save-franchise") || "";
    if (!franchiseId || button.disabled) return;
    const wasSaved = button.getAttribute("data-saved") === "true";
    setButtonBusy(button, true);
    setMessage(button, "");

    try {
      const clerk = await Auth.init();
      if (!clerk?.session) {
        window.location.href = "/login/?next=" + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }
      const headers = await Auth.getAuthHeaders();
      const response = await fetch("/profile-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: wasSaved ? "remove_franchise_opportunity" : "save_franchise_opportunity",
          franchise_id: franchiseId,
        }),
      });
      const payload = await response.json();
      if (!payload.success) {
        setActionMessage(button, payload, "Peluang belum bisa disimpan.", "error");
        return;
      }
      applySavedState(button, !wasSaved);
      setActionMessage(button, { message: wasSaved ? "Dihapus dari tersimpan." : "Disimpan ke profil Anda." }, "", "success");
    } catch (error) {
      setActionMessage(button, { message: error.message || "Peluang belum bisa disimpan." }, "", "error");
    } finally {
      setButtonBusy(button, false);
    }
  }

  function applySavedState(button, saved) {
    const label = saved ? "Tersimpan" : "Simpan";
    const tooltip = saved ? "Hapus dari tersimpan" : "Simpan peluang";
    button.setAttribute("data-saved", saved ? "true" : "false");
    button.setAttribute("aria-label", tooltip);
    button.setAttribute("data-fr-tooltip", tooltip);
    button.classList.toggle("is-saved", saved);
    const labelClass = button.classList.contains("fr-save-opportunity-button--card")
      ? "fr-save-opportunity-label fr-save-opportunity-label--hidden"
      : "fr-save-opportunity-label";
    button.innerHTML = `<i class="fas fa-bookmark" aria-hidden="true"></i><span class="${labelClass}">${label}</span>`;
  }

  function setButtonBusy(button, busy) {
    button.disabled = busy;
    if (busy) {
      const labelClass = button.classList.contains("fr-save-opportunity-button--card")
        ? "fr-save-opportunity-label fr-save-opportunity-label--hidden"
        : "fr-save-opportunity-label";
      button.innerHTML = `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span class="${labelClass}">Menyimpan</span>`;
    } else {
      applySavedState(button, button.getAttribute("data-saved") === "true");
    }
  }

  function setActionMessage(button, payload, fallback, type) {
    const container = button.closest("[data-save-franchise-wrap]") || button.parentElement;
    if (!container) return;
    let message = container.querySelector("[data-save-franchise-message]");
    if (!message) {
      message = document.createElement("div");
      message.setAttribute("data-save-franchise-message", "");
      container.appendChild(message);
    }
    message.className = "fr-save-opportunity-message" + (type === "error" ? " is-error" : "");
    const text = payload?.message || fallback || "";
    const actionUrl = withReturnUrl(payload?.action_url || "");
    const actionLabel = payload?.action_label || "";
    const actionHint = payload?.action_hint || "";
    message.textContent = "";
    if (!text && !actionUrl) return;

    const textEl = document.createElement("span");
    textEl.textContent = text;
    message.appendChild(textEl);

    if (actionHint) {
      const hintEl = document.createElement("small");
      hintEl.textContent = actionHint;
      message.appendChild(hintEl);
    }

    if (actionUrl && actionLabel) {
      const link = document.createElement("a");
      link.className = "fr-save-opportunity-cta";
      link.href = actionUrl;
      link.textContent = actionLabel;
      message.appendChild(link);
    }
  }

  function setMessage(button, text, type) {
    setActionMessage(button, { message: text || "" }, "", type);
  }

  function withReturnUrl(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url, window.location.origin);
      if (!parsed.searchParams.has("next")) {
        parsed.searchParams.set("next", window.location.pathname + window.location.search);
      }
      return parsed.pathname + parsed.search + parsed.hash;
    } catch (_) {
      return url;
    }
  }
})(window, document);
