(function () {
  var actions = document.querySelector("[data-dashboard-account-actions]");
  if (!actions) return;

  var buttons = Array.from(actions.querySelectorAll("[data-dashboard-account-action]"));
  var clearCache = function () {};
  var setStatus = function () {};
  var pending = false;

  function setSession(hasSession) {
    actions.hidden = !hasSession;
  }

  async function signOut(mode) {
    if (pending) return;
    pending = true;
    buttons.forEach(function (button) { button.disabled = true; });
    try {
      if (!window.FranchiseAuth?.clerk?.signOut) throw new Error("Sign-out unavailable");
      await window.FranchiseAuth.clerk.signOut();
    } catch (_error) {
      setStatus("Gagal keluar dari akun. Coba tombol Ganti akun atau Keluar lagi.", true);
      pending = false;
      buttons.forEach(function (button) { button.disabled = false; });
      return;
    }
    clearCache();
    window.location.assign(mode === "switch" ? "/dashboard/" : "/");
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      return signOut(button.getAttribute("data-dashboard-account-action"));
    });
  });

  window.FranchiseDashboardAccount = {
    configure: function (options) {
      clearCache = options.clearCache;
      setStatus = options.setStatus;
    },
    setSession: setSession,
    signOut: signOut
  };
})();
