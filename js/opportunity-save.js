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
      if (!payload.success) throw new Error(payload.message || "Peluang belum bisa disimpan.");
      applySavedState(button, !wasSaved);
      setMessage(button, wasSaved ? "Dihapus dari tersimpan." : "Disimpan ke profil Anda.", "success");
    } catch (error) {
      setMessage(button, error.message || "Peluang belum bisa disimpan.", "error");
    } finally {
      setButtonBusy(button, false);
    }
  }

  function applySavedState(button, saved) {
    button.setAttribute("data-saved", saved ? "true" : "false");
    button.classList.toggle("is-saved", saved);
    button.innerHTML = `<i class="fas fa-bookmark" aria-hidden="true"></i><span>${saved ? "Tersimpan" : "Simpan"}</span>`;
  }

  function setButtonBusy(button, busy) {
    button.disabled = busy;
    if (busy) {
      button.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>Menyimpan</span>';
    } else {
      applySavedState(button, button.getAttribute("data-saved") === "true");
    }
  }

  function setMessage(button, text, type) {
    const container = button.closest("[data-save-franchise-wrap]") || button.parentElement;
    if (!container) return;
    let message = container.querySelector("[data-save-franchise-message]");
    if (!message) {
      message = document.createElement("div");
      message.setAttribute("data-save-franchise-message", "");
      container.appendChild(message);
    }
    message.className = "fr-save-opportunity-message" + (type === "error" ? " is-error" : "");
    message.textContent = text || "";
  }
})(window, document);
