(function (window, document) {
  "use strict";

  const TOOLTIP_SELECTOR = "[data-fr-tooltip]";
  const UPGRADE_SELECTOR = [
    "a[title]",
    "button[title]",
    "input[title]",
    "select[title]",
    "textarea[title]",
    "[role='button'][title]",
    "[tabindex][title]",
    "i[title]",
  ].join(",");

  let tooltipEl = null;
  let activeTarget = null;
  let hideTimer = null;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    upgradeTitleTooltips(document.body);
    tooltipEl = ensureTooltip();
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", repositionIfVisible, true);
    window.addEventListener("resize", repositionIfVisible);
    observeNewTooltips();
  }

  function ensureTooltip() {
    const existing = document.querySelector(".fr-tooltip[data-shared-tooltip]");
    if (existing) return existing;
    const node = document.createElement("div");
    node.className = "fr-tooltip";
    node.setAttribute("data-shared-tooltip", "");
    node.setAttribute("role", "tooltip");
    node.hidden = true;
    document.body.appendChild(node);
    return node;
  }

  function observeNewTooltips() {
    if (!("MutationObserver" in window)) return;
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          upgradeTitleTooltips(node);
        });
        if (mutation.type === "attributes" && mutation.attributeName === "title") {
          upgradeTitleTooltips(mutation.target);
        }
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["title"],
    });
  }

  function upgradeTitleTooltips(root) {
    const nodes = [];
    if (root.matches && root.matches(UPGRADE_SELECTOR)) nodes.push(root);
    if (root.querySelectorAll) nodes.push.apply(nodes, root.querySelectorAll(UPGRADE_SELECTOR));
    nodes.forEach(function (node) {
      const title = (node.getAttribute("title") || "").trim();
      if (!title) {
        node.removeAttribute("title");
        return;
      }
      if (!node.hasAttribute("data-fr-tooltip")) node.setAttribute("data-fr-tooltip", title);
      if (!node.hasAttribute("aria-label") && isLabelNeeded(node)) node.setAttribute("aria-label", title);
      node.removeAttribute("title");
    });
  }

  function isLabelNeeded(node) {
    return !normalizeText(node.textContent) && !node.querySelector("img[alt], svg title");
  }

  function onPointerOver(event) {
    const target = event.target.closest && event.target.closest(TOOLTIP_SELECTOR);
    if (!target) return;
    show(target);
  }

  function onPointerOut(event) {
    if (!activeTarget) return;
    const target = event.target.closest && event.target.closest(TOOLTIP_SELECTOR);
    if (!target || target !== activeTarget) return;
    if (event.relatedTarget && target.contains(event.relatedTarget)) return;
    hide();
  }

  function onFocusIn(event) {
    const target = event.target.closest && event.target.closest(TOOLTIP_SELECTOR);
    if (!target) return;
    show(target);
  }

  function onFocusOut(event) {
    if (activeTarget && event.target === activeTarget) hide();
  }

  function onKeyDown(event) {
    if (event.key === "Escape") hide();
  }

  function show(target) {
    const text = normalizeText(target.getAttribute("data-fr-tooltip"));
    if (!text || !tooltipEl) return;
    window.clearTimeout(hideTimer);
    activeTarget = target;
    tooltipEl.textContent = text;
    tooltipEl.hidden = false;
    tooltipEl.classList.add("is-visible");
    positionTooltip(target);
  }

  function hide() {
    if (!tooltipEl) return;
    tooltipEl.classList.remove("is-visible");
    activeTarget = null;
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(function () {
      if (!activeTarget && tooltipEl) tooltipEl.hidden = true;
    }, 90);
  }

  function repositionIfVisible() {
    if (!activeTarget || !tooltipEl || tooltipEl.hidden) return;
    positionTooltip(activeTarget);
  }

  function positionTooltip(target) {
    const rect = target.getBoundingClientRect();
    const spacing = 8;
    const edge = 12;
    const tipRect = tooltipEl.getBoundingClientRect();
    const aboveTop = rect.top - tipRect.height - spacing;
    const placeBelow = aboveTop < edge;
    const top = placeBelow ? rect.bottom + spacing : aboveTop;
    const idealLeft = rect.left + rect.width / 2 - tipRect.width / 2;
    const maxLeft = window.innerWidth - tipRect.width - edge;
    const left = Math.max(edge, Math.min(idealLeft, Math.max(edge, maxLeft)));

    tooltipEl.dataset.placement = placeBelow ? "bottom" : "top";
    tooltipEl.style.left = `${Math.round(left)}px`;
    tooltipEl.style.top = `${Math.round(top)}px`;
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }
})(window, document);
