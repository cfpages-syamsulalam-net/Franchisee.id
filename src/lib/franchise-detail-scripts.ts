export const FRANCHISE_DETAIL_SCRIPT_ID = "franchise-detail-tabs-js";

export function renderFranchiseDetailScripts() {
  return `<script id="${FRANCHISE_DETAIL_SCRIPT_ID}">
function setFranchiseDetailTab(tabs, index) {
  tabs.querySelectorAll(".e-n-tab-title").forEach(function (item) {
    var active = item.getAttribute("data-tab-index") === index;
    item.setAttribute("aria-selected", active ? "true" : "false");
    item.setAttribute("tabindex", active ? "0" : "-1");
  });
  tabs.querySelectorAll(".e-n-tab-content").forEach(function (panel) {
    panel.classList.toggle("e-active", panel.getAttribute("data-tab-index") === index);
  });
}
document.addEventListener("click", function (event) {
  var target = event.target;
  var button = target && target.closest ? target.closest(".e-n-tab-title") : null;
  if (!button) return;
  var tabs = button.closest(".e-n-tabs");
  if (!tabs) return;
  setFranchiseDetailTab(tabs, button.getAttribute("data-tab-index") || "1");
});
document.querySelectorAll(".e-n-tabs").forEach(function (tabs) {
  var selected = tabs.querySelector('.e-n-tab-title[aria-selected="true"]');
  setFranchiseDetailTab(tabs, selected ? selected.getAttribute("data-tab-index") || "1" : "1");
});
initCompareButtons();
initProposalReaders();
document.addEventListener("click", function (event) {
  var opener = event.target && event.target.closest ? event.target.closest("[data-open-contact-tab]") : null;
  if (!opener) return;
  event.preventDefault();
  var tabs = document.querySelector(".e-n-tabs");
  if (!tabs) return;
  var buttons = Array.prototype.slice.call(tabs.querySelectorAll(".e-n-tab-title"));
  var contact = buttons.find(function (button) {
    return (button.textContent || "").toLowerCase().indexOf("kontak") !== -1;
  });
  if (!contact) return;
  setFranchiseDetailTab(tabs, contact.getAttribute("data-tab-index") || "2");
  tabs.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(function () { contact.focus(); }, 250);
});
document.addEventListener("click", function (event) {
  var navigation = event.target && event.target.closest ? event.target.closest("[data-proposal-previous], [data-proposal-next]") : null;
  if (navigation) {
    var reader = navigation.closest("[data-proposal-reader]");
    if (reader) setProposalPage(reader, Number(reader.getAttribute("data-current-page") || "1") + (navigation.hasAttribute("data-proposal-next") ? 1 : -1));
    return;
  }
  var button = event.target && event.target.closest ? event.target.closest("[data-proposal-pdf]") : null;
  if (!button) return;
  event.preventDefault();
  downloadProposalPdf(button);
});
async function downloadProposalPdf(button) {
  var reader = button.closest("[data-proposal-reader]");
  var status = reader ? reader.querySelector("[data-proposal-status]") : button.closest(".fr-proposal-tab")?.querySelector("[data-proposal-status]");
  var images = [];
  try {
    images = JSON.parse(button.getAttribute("data-proposal-images") || "[]");
  } catch (_error) {
    images = [];
  }
  if (!images.length) {
    setProposalStatus(status, "Proposal gambar belum tersedia untuk dibuat PDF.", true);
    return;
  }
  button.disabled = true;
  button.classList.add("is-loading");
  if (reader) reader.classList.add("is-downloading");
  button.style.setProperty("--proposal-progress", "18%");
  var original = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>Menyiapkan PDF</span><span class="fr-proposal-download-progress" aria-hidden="true"></span>';
  setProposalStatus(status, "Menyiapkan PDF brosur...");
  try {
    button.style.setProperty("--proposal-progress", "45%");
    var response = await fetch("/proposal-download", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/pdf, application/json" },
      body: JSON.stringify({
        images: images,
        brand: button.getAttribute("data-proposal-brand") || "proposal",
        franchise_id: button.getAttribute("data-franchise-id") || ""
      })
    });
    button.style.setProperty("--proposal-progress", "76%");
    if (!response.ok) {
      var message = "PDF belum bisa dibuat. Coba ulangi beberapa saat lagi.";
      try {
        var payload = await response.json();
        if (payload && payload.message) message = payload.message;
      } catch (_jsonError) {}
      throw new Error(message);
    }
    var pdfBlob = await response.blob();
    button.style.setProperty("--proposal-progress", "96%");
    var filename = (button.getAttribute("data-proposal-brand") || "proposal") + ".pdf";
    triggerDownload(pdfBlob, filename);
    setProposalStatus(status, "PDF proposal mulai diunduh.");
    if (window.FranchiseProductEvents && typeof window.FranchiseProductEvents.record === "function") {
      window.FranchiseProductEvents.record(button.getAttribute("data-franchise-id") || "", "contact_click", "proposal_pdf");
    }
  } catch (error) {
    setProposalStatus(status, error.message || "PDF belum bisa dibuat. Coba ulangi atau buka gambar proposal.", true);
  } finally {
    button.disabled = false;
    button.classList.remove("is-loading");
    if (reader) reader.classList.remove("is-downloading");
    button.style.removeProperty("--proposal-progress");
    button.innerHTML = original;
  }
}
function setProposalStatus(node, text, isError) {
  if (!node) return;
  node.textContent = text || "";
  node.className = "fr-proposal-status" + (isError ? " is-error" : "");
  if (text) node.removeAttribute("hidden");
  else node.setAttribute("hidden", "");
}
function initProposalReaders() {
  document.querySelectorAll("[data-proposal-reader]").forEach(function (reader) {
    setProposalPage(reader, 1);
    reader.setAttribute("tabindex", "0");
    var stage = reader.querySelector(".fr-proposal-stage");
    var hidePointerTimer = null;
    function showPointerControls() {
      reader.classList.add("is-pointer-active");
      window.clearTimeout(hidePointerTimer);
      hidePointerTimer = window.setTimeout(function () {
        reader.classList.remove("is-pointer-active");
      }, 1000);
    }
    function hidePointerControls() {
      window.clearTimeout(hidePointerTimer);
      reader.classList.remove("is-pointer-active");
    }
    if (stage) {
      stage.addEventListener("pointermove", showPointerControls);
      stage.addEventListener("pointerdown", showPointerControls);
      stage.addEventListener("pointerleave", hidePointerControls);
    }
    reader.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      setProposalPage(reader, Number(reader.getAttribute("data-current-page") || "1") + (event.key === "ArrowRight" ? 1 : -1));
    });
  });
}
function setProposalPage(reader, requestedPage) {
  var pages = Array.prototype.slice.call(reader.querySelectorAll("[data-proposal-page]"));
  if (!pages.length) return;
  var page = Math.max(1, Math.min(pages.length, Number(requestedPage) || 1));
  reader.setAttribute("data-current-page", String(page));
  pages.forEach(function (item, index) {
    var active = index + 1 === page;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-hidden", active ? "false" : "true");
  });
  var counter = reader.querySelector("[data-proposal-counter]");
  if (counter) counter.textContent = page + " / " + pages.length;
  var previous = reader.querySelector("[data-proposal-previous]");
  var next = reader.querySelector("[data-proposal-next]");
  if (previous) previous.disabled = page === 1;
  if (next) next.disabled = page === pages.length;
}
function triggerDownload(blob, filename) {
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}
function initCompareButtons() {
  var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-compare-franchise]"));
  if (!buttons.length) return;
  var floating = document.querySelector("[data-compare-floating]");
  if (!floating) {
    floating = document.createElement("a");
    floating.href = "/bandingkan";
    floating.className = "fr-compare-floating";
    floating.setAttribute("data-compare-floating", "");
    floating.innerHTML = '<i class="fas fa-balance-scale" aria-hidden="true"></i><span data-compare-count>Bandingkan</span>';
    document.body.appendChild(floating);
  }
  function getSelected() {
    try {
      return JSON.parse(localStorage.getItem("franchise_compare_ids") || "[]");
    } catch (_error) {
      return [];
    }
  }
  function setSelected(ids) {
    try {
      var nextIds = ids.slice(0, 4);
      localStorage.setItem("franchise_compare_ids", JSON.stringify(nextIds));
      var current = JSON.parse(localStorage.getItem("franchise_buyer_context") || "{}");
      current.updated_at = new Date().toISOString();
      current.last_tool = "comparison";
      current.comparison = { source: "comparison", selected_brand_ids: nextIds };
      localStorage.setItem("franchise_buyer_context", JSON.stringify(current));
    } catch (_error) {
      return null;
    }
  }
  function renderState() {
    var selected = getSelected();
    buttons.forEach(function (button) {
      var active = selected.indexOf(button.getAttribute("data-compare-franchise")) !== -1;
      button.classList.toggle("is-added", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    floating.classList.toggle("is-visible", selected.length > 0);
    var count = floating.querySelector("[data-compare-count]");
    if (count) count.textContent = selected.length + " dibandingkan";
    floating.href = selected.length ? "/bandingkan?ids=" + selected.join(",") : "/bandingkan";
  }
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      var id = button.getAttribute("data-compare-franchise");
      var selected = getSelected();
      var index = selected.indexOf(id);
      if (index >= 0) selected.splice(index, 1);
      else if (selected.length < 4) selected.push(id);
      else {
        selected.shift();
        selected.push(id);
      }
      setSelected(selected);
      renderState();
    });
  });
  renderState();
}
</script>`;
}
