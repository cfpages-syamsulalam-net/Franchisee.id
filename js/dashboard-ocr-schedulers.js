(function () {
  var SCHEDULER_META = {
    upstash_qstash: {
      fields: ["api_key", "request_url", "clear_api_key"],
      token_label: "QSTASH_TOKEN",
      help: "Upstash QStash otomatis menjadwalkan panggilan berikutnya sampai batch selesai."
    },
    cron_job_org: {
      fields: ["api_key", "request_url", "schedule_cron", "clear_api_key"],
      token_label: "cron-job.org API key",
      help: "Gunakan untuk mengelola trigger eksternal yang memanggil worker secara berkala."
    },
    inngest: {
      fields: ["api_key", "request_url", "clear_api_key"],
      token_label: "Inngest signing/API key",
      help: "Opsi workflow eksternal; saat ini dipakai sebagai konfigurasi trigger manual."
    },
    trigger_dev: {
      fields: ["api_key", "request_url", "clear_api_key"],
      token_label: "Trigger.dev access token",
      help: "Opsi workflow eksternal; saat ini dipakai sebagai konfigurasi trigger manual."
    }
  };

  function providerMeta(providerKey) {
    return SCHEDULER_META[providerKey] || SCHEDULER_META.upstash_qstash;
  }

  function countActive(providers) {
    return (providers || []).filter(function (provider) {
      return provider && provider.is_enabled && provider.has_api_key;
    }).length;
  }

  function firstActive(providers) {
    return (providers || []).find(function (provider) {
      return provider && provider.is_enabled && provider.has_api_key;
    }) || null;
  }

  window.FranchiseDashboardOcrSchedulers = {
    providerMeta: providerMeta,
    countActive: countActive,
    firstActive: firstActive
  };
}());
