(function (window) {
  function normalizeOptions(options) {
    if (typeof options === "string") return { fallbackMessage: options };
    return options || {};
  }

  async function readJson(response, options) {
    var settings = normalizeOptions(options);
    var fallbackMessage = settings.fallbackMessage || "Permintaan gagal.";
    var retryMessage = settings.retryMessage || "Muat ulang halaman lalu coba lagi.";
    var text = await response.text().catch(function () { return ""; });
    if (!text.trim()) {
      return {
        success: false,
        error: "EMPTY_RESPONSE",
        status: response.status || 0,
        message: fallbackMessage + " Server mengembalikan HTTP " + (response.status || "tanpa status") + " tanpa detail. " + retryMessage
      };
    }
    try {
      return JSON.parse(text);
    } catch (_error) {
      return {
        success: false,
        error: "INVALID_JSON_RESPONSE",
        status: response.status || 0,
        message: fallbackMessage + " Server mengembalikan respons yang belum bisa dibaca. " + retryMessage
      };
    }
  }

  async function fetchJson(input, init, options) {
    var response = await fetch(input, init);
    var data = await readJson(response, options);
    return { response: response, data: data };
  }

  window.FranchiseFetch = {
    readJson: readJson,
    fetchJson: fetchJson
  };
})(window);
