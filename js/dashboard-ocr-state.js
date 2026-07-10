(function () {
  function createInitialState() {
    return {
      providers: [],
      schedulers: [],
      adminOnly: true,
      schedulerAdminOnly: true,
      activeProviderCount: 0,
      activeSchedulerCount: 0,
      filling: false,
      fillingScheduler: false,
      autosaveTimer: null,
      schedulerAutosaveTimer: null,
      saving: false,
      savingScheduler: false,
      lastJobsPayload: null,
      resultPageByFranchise: {},
      resultSearchActive: false,
      resultSearchResults: [],
      resultSearchMeta: null,
      resultSearchLoading: false,
      jobFilterStatus: "",
      jobFilterResults: [],
      jobFilterMeta: null,
      jobFilterLoading: false,
      jobFilterBootstrapped: false,
      jobPageSize: 120,
      pollTimer: null,
      countdownTimer: null,
      polling: false,
      foregroundRefreshAt: 0,
      continuousRunActive: false,
      continuousRunStopRequested: false,
      continuousRunLeaseId: ""
    };
  }

  window.FranchiseDashboardOcrState = { createInitialState: createInitialState };
})();
