(function (window) {
  function create(state) {
    function savedStorageKey(userId) {
      return `franchise_profile_saved_opportunities:${userId || "anonymous"}`;
    }

    function loadSavedOpportunities(userId) {
      try {
        const raw = window.localStorage.getItem(savedStorageKey(userId));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((item) => item?.id).slice(0, 24) : [];
      } catch (_error) {
        return [];
      }
    }

    function persistSavedOpportunities() {
      try {
        window.localStorage.setItem(savedStorageKey(state.data?.user?.id), JSON.stringify(state.savedOpportunities.slice(0, 24)));
      } catch (_error) {
        // Browser storage can be unavailable in private modes; saving is a convenience feature.
      }
    }

    function clearSavedOpportunities(userId) {
      try {
        window.localStorage.removeItem(savedStorageKey(userId));
      } catch (_error) {
        // Local saved opportunities are best-effort only.
      }
    }

    function mergeSavedOpportunities(serverItems, localItems) {
      const seen = new Set();
      return [...serverItems, ...localItems].filter((item) => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }).slice(0, 24);
    }

    function isOpportunitySaved(franchiseId) {
      return state.savedOpportunities.some((item) => item.id === franchiseId);
    }

    function opportunityById(franchiseId) {
      return [...(state.data?.franchisee_recommendations || []), ...state.savedOpportunities].find((item) => item.id === franchiseId);
    }

    function hasAskedInfo(franchiseId) {
      return (state.data?.inquiry_history || []).some((lead) => lead.franchise_id === franchiseId);
    }

    return {
      clearSavedOpportunities,
      hasAskedInfo,
      isOpportunitySaved,
      loadSavedOpportunities,
      mergeSavedOpportunities,
      opportunityById,
      persistSavedOpportunities,
    };
  }

  window.FranchiseProfileOpportunities = { create };
})(window);
