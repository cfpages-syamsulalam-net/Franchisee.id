(function (window, document) {
  const Auth = window.FranchiseAuth;
  if (!Auth) return;

  document.addEventListener("click", async function (event) {
    const inquiryButton = event.target.closest("[data-create-franchise-inquiry]");
    if (inquiryButton) {
      event.preventDefault();
      await createInquiry(inquiryButton);
      return;
    }

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
      if (window.FranchiseProductEvents && typeof window.FranchiseProductEvents.record === "function") {
        window.FranchiseProductEvents.record(franchiseId, wasSaved ? "unsave" : "save", "public_save");
      }
      setActionMessage(button, { message: wasSaved ? "Dihapus dari tersimpan." : "Disimpan ke profil Anda." }, "", "success");
    } catch (error) {
      setActionMessage(button, { message: error.message || "Peluang belum bisa disimpan." }, "", "error");
    } finally {
      setButtonBusy(button, false);
    }
  }

  async function createInquiry(button) {
    const franchiseId = button.getAttribute("data-create-franchise-inquiry") || "";
    const brand = button.getAttribute("data-inquiry-brand") || "brand ini";
    if (!franchiseId || button.disabled) return;
    setInquiryBusy(button, true);
    setActionMessage(button, { message: "" }, "", "");

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
          action: "create_franchise_inquiry",
          franchise_id: franchiseId,
          message: "Saya tertarik dengan " + brand + ".",
          buyer_context: getBuyerContext(),
        }),
      });
      const payload = await response.json();
      if (!payload.success) {
        setActionMessage(button, payload, "Permintaan info belum terkirim.", "error");
        return;
      }
      if (window.FranchiseProductEvents && typeof window.FranchiseProductEvents.record === "function") {
        window.FranchiseProductEvents.record(franchiseId, "inquiry", "premium_detail");
      }
      setActionMessage(button, { message: payload.already_sent ? "Anda sudah pernah meminta info untuk brand ini." : "Permintaan info terkirim." }, "", "success");
    } catch (error) {
      setActionMessage(button, { message: error.message || "Permintaan info belum terkirim." }, "", "error");
    } finally {
      setInquiryBusy(button, false);
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

  function setInquiryBusy(button, busy) {
    button.disabled = busy;
    if (busy) {
      button.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>Mengirim</span>';
    } else {
      button.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i><span>Minta info</span>';
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

  function getBuyerContext() {
    try {
      const parsed = JSON.parse(localStorage.getItem("franchise_buyer_context") || "{}");
      if (!parsed || typeof parsed !== "object") return {};
      return parsed;
    } catch (_) {
      return {};
    }
  }
})(window, document);
