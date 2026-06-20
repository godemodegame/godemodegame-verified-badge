(() => {
  "use strict";

  const USERNAME = "godemodegame";
  const DISPLAY_NAME_ALIASES = ["kris.gmg"];
  const PROFILE_LINK_RE = new RegExp(`^/${USERNAME}/?$`, "i");
  const PROFILE_SURFACE_RE = new RegExp(`^/${USERNAME}(?:/(?:with_replies|media|likes|about))?/?$`, "i");
  const ABOUT_RE = new RegExp(`^/${USERNAME}/about/?$`, "i");
  const HELP_URL = "https://help.x.com/en/managing-your-account/about-x-bluecheck";
  const BADGE_CLASS = "gmv-verified-badge";
  const BADGED_ATTR = "data-gmv-badged";
  const ABOUT_ROW_ID = "gmv-about-verified-row";
  const POPOVER_ID = "gmv-verified-popover";
  const HOVER_ROW_CLASS = "gmv-hover-verified-row";
  const GENERIC_LABELS = new Set([
    "profile",
    "posts",
    "replies",
    "media",
    "likes",
    "about",
    "about your account",
    "about this account"
  ]);

  const verifiedPath =
    "M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.214-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.588.274-1.087.705-1.441 1.246-.355.541-.552 1.17-.57 1.817.018.647.215 1.276.57 1.817.354.54.853.972 1.441 1.246-.224.606-.274 1.263-.144 1.896.13.635.433 1.22.878 1.69.47.445 1.055.751 1.69.882.635.132 1.294.083 1.902-.14.271.586.7 1.086 1.24 1.44s1.167.551 1.813.568c.647-.016 1.276-.213 1.817-.568s.972-.854 1.245-1.44c.607.223 1.264.27 1.897.14.634-.132 1.218-.437 1.687-.882.445-.47.751-1.053.882-1.687.13-.633.083-1.29-.14-1.897.586-.274 1.084-.706 1.438-1.246.355-.541.552-1.17.57-1.816z";
  const checkPath =
    "M9.662 14.85 6.233 11.42l1.293-1.293 2.136 2.136 4.812-4.812 1.293 1.293z";

  let scanQueued = false;
  let lastUrl = location.href;
  let hoverHideTimer = 0;
  const knownDisplayNames = new Set([USERNAME.toLowerCase(), ...DISPLAY_NAME_ALIASES.map((name) => name.toLowerCase())]);

  function createVerifiedSvg({ outline = false } = {}) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 22 22");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("gmv-verified-svg");

    const badge = document.createElementNS("http://www.w3.org/2000/svg", "path");
    badge.setAttribute("d", verifiedPath);

    const check = document.createElementNS("http://www.w3.org/2000/svg", "path");
    check.setAttribute("d", checkPath);

    if (outline) {
      badge.setAttribute("fill", "none");
      badge.setAttribute("stroke", "currentColor");
      badge.setAttribute("stroke-width", "2.1");
      badge.setAttribute("stroke-linejoin", "round");
      check.setAttribute("fill", "currentColor");
      svg.append(badge, check);
    } else {
      const maskId = `gmv-verified-mask-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
      const maskBadge = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const maskCheck = document.createElementNS("http://www.w3.org/2000/svg", "path");

      mask.setAttribute("id", maskId);
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("x", "0");
      mask.setAttribute("y", "0");
      mask.setAttribute("width", "22");
      mask.setAttribute("height", "22");
      maskBadge.setAttribute("d", verifiedPath);
      maskBadge.setAttribute("fill", "#ffffff");
      maskCheck.setAttribute("d", checkPath);
      maskCheck.setAttribute("fill", "#000000");
      mask.append(maskBadge, maskCheck);
      defs.append(mask);
      svg.append(defs);

      badge.setAttribute("fill", "#1d9bf0");
      badge.setAttribute("mask", `url(#${maskId})`);
      svg.append(badge);
    }

    return svg;
  }

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function normalizedText(value) {
    return cleanText(value).toLowerCase();
  }

  function isVisibleElement(element) {
    if (!element || !element.getClientRects().length) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
  }

  function isGenericLabel(text) {
    return GENERIC_LABELS.has(normalizedText(text));
  }

  function isValidNameText(text) {
    const value = cleanText(text);
    if (!value || value.length > 80) return false;
    if (value.startsWith("@") || value.includes(`@${USERNAME}`)) return false;
    if (/^\d+$/.test(value) || isGenericLabel(value)) return false;
    return true;
  }

  function recordDisplayName(text) {
    if (!isValidNameText(text)) return;
    knownDisplayNames.add(normalizedText(text));
  }

  function isKnownDisplayName(text) {
    const value = normalizedText(text);
    return knownDisplayNames.has(value) || value === USERNAME;
  }

  function isAliasDisplayName(text) {
    return DISPLAY_NAME_ALIASES.some((alias) => normalizedText(alias) === normalizedText(text));
  }

  function mentionsKnownDisplayName(text) {
    const value = normalizedText(text);
    return Array.from(knownDisplayNames).some((name) => value.includes(name));
  }

  function hasSameTextDescendant(element) {
    const text = normalizedText(element.textContent);
    if (!text) return false;

    return Array.from(element.querySelectorAll("span, div, h1, h2, [role='heading']")).some((child) => {
      return child !== element && isVisibleElement(child) && normalizedText(child.textContent) === text;
    });
  }

  function isLeafNameElement(element) {
    return isValidNameText(element.textContent) && !hasSameTextDescendant(element);
  }

  function isBlockedUiContext(target) {
    if (target.closest("[data-testid='SideNav_AccountSwitcher_Button']")) return false;
    return Boolean(target.closest("nav[aria-label='Primary'], [role='tablist'], [role='tab']"));
  }

  function isTargetProfileHref(href) {
    try {
      const url = new URL(href, location.origin);
      return (url.hostname === "x.com" || url.hostname === "twitter.com") && PROFILE_LINK_RE.test(url.pathname);
    } catch {
      return false;
    }
  }

  function isOnTargetAboutPage() {
    return ABOUT_RE.test(location.pathname);
  }

  function isTargetProfileSurfaceVisible() {
    if (PROFILE_SURFACE_RE.test(location.pathname)) return true;

    return Array.from(document.querySelectorAll(`a[href='/${USERNAME}/about'], a[href$='/${USERNAME}/about']`)).some((anchor) => {
      return isVisibleElement(anchor) && normalizedText(anchor.textContent).includes("joined");
    });
  }

  function isExtensionOwned(node) {
    return Boolean(node.closest(`.${BADGE_CLASS}, .gmv-popover, #${ABOUT_ROW_ID}, .${HOVER_ROW_CLASS}`));
  }

  function createBadge(size = "normal") {
    const badge = document.createElement("span");
    badge.className = `${BADGE_CLASS} ${BADGE_CLASS}--${size}`;
    badge.setAttribute("role", "button");
    badge.setAttribute("tabindex", "0");
    badge.setAttribute("aria-label", "Verified account");
    badge.append(createVerifiedSvg());
    return badge;
  }

  function hasNearbyBadge(target) {
    const parent = target.parentElement;
    if (!parent) return false;
    return Boolean(parent.querySelector(`:scope > .${BADGE_CLASS}`));
  }

  function addBadgeAfter(target, size = "normal") {
    if (!target || target.nodeType !== Node.ELEMENT_NODE || isExtensionOwned(target)) return;
    if (isBlockedUiContext(target) || !isLeafNameElement(target)) return;
    if (target.querySelector?.(`.${BADGE_CLASS}`)) return;
    if (target.matches(`.${BADGE_CLASS}`) || target.hasAttribute(BADGED_ATTR) || hasNearbyBadge(target)) return;

    recordDisplayName(target.textContent);
    const badge = createBadge(size);
    target.insertAdjacentElement("afterend", badge);
    target.setAttribute(BADGED_ATTR, "true");
  }

  function firstVisibleTextElement(root) {
    const candidates = [
      "span[dir='auto']",
      "div[dir='auto'] span",
      "span",
      "div"
    ];

    for (const selector of candidates) {
      for (const element of root.querySelectorAll(selector)) {
        if (isExtensionOwned(element)) continue;
        if (!isVisibleElement(element)) continue;
        const text = cleanText(element.textContent);
        if (!isValidNameText(text)) continue;
        if (element.querySelector(`.${BADGE_CLASS}`)) continue;
        return element;
      }
    }

    return null;
  }

  function addBadgesInsideUserNameBlocks() {
    const selectors = [
      "[data-testid='User-Name']",
      "[data-testid='UserName']",
      "[data-testid='UserCell']"
    ];

    for (const block of document.querySelectorAll(selectors.join(","))) {
      if (isExtensionOwned(block)) continue;

      const hasTargetLink = Array.from(block.querySelectorAll("a[href]")).some((anchor) =>
        isTargetProfileHref(anchor.getAttribute("href"))
      );
      const hasTargetHandle = block.textContent.toLowerCase().includes(`@${USERNAME}`);
      if (!hasTargetLink && !hasTargetHandle) continue;

      const target = firstVisibleTextElement(block) || block.querySelector("a[href]");
      if (target) addBadgeAfter(target);
    }
  }

  function addBadgesToAccountSwitcher() {
    for (const button of document.querySelectorAll("[data-testid='SideNav_AccountSwitcher_Button']")) {
      if (!button.textContent.toLowerCase().includes(`@${USERNAME}`)) continue;

      const target = firstVisibleTextElement(button);
      if (target) addBadgeAfter(target, "small");
    }
  }

  function addBadgesNearTargetHandles() {
    const handleText = `@${USERNAME}`;
    for (const element of document.querySelectorAll("span, div")) {
      if (cleanText(element.textContent).toLowerCase() !== handleText) continue;
      if (isExtensionOwned(element)) continue;

      const structuredBlock = element.closest(
        "[data-testid='User-Name'], [data-testid='UserName'], [data-testid='UserCell'], [data-testid='SideNav_AccountSwitcher_Button']"
      );
      const profileLink = element.closest("a[href]");
      const block =
        structuredBlock ||
        (profileLink && isTargetProfileHref(profileLink.getAttribute("href")) ? profileLink : null);
      if (!block) continue;

      const target = firstVisibleTextElement(block);
      if (target) addBadgeAfter(target, block.matches("[data-testid='SideNav_AccountSwitcher_Button']") ? "small" : "normal");
    }
  }

  function addBadgesToKnownDisplayNames() {
    for (const element of document.querySelectorAll("span, div, h1, h2, [role='heading']")) {
      if (!isKnownDisplayName(element.textContent) || isExtensionOwned(element) || !isVisibleElement(element)) continue;
      if (!isLeafNameElement(element)) continue;
      if (element.closest("a[href]") && !isTargetProfileHref(element.closest("a[href]").getAttribute("href"))) continue;

      addBadgeAfter(element, "normal");
    }

    for (const element of document.querySelectorAll("[aria-label]")) {
      const label = element.getAttribute("aria-label");
      if (!mentionsKnownDisplayName(label)) continue;
      if (isExtensionOwned(element) || !isVisibleElement(element) || isBlockedUiContext(element)) continue;

      const target = firstVisibleTextElement(element);
      if (target && isKnownDisplayName(target.textContent)) addBadgeAfter(target, "normal");
    }
  }

  function cleanupInjectedBadges() {
    const seenByCluster = new Map();

    for (const badge of Array.from(document.querySelectorAll(`.${BADGE_CLASS}`))) {
      const target = badge.previousElementSibling;
      if (!target || !isLeafNameElement(target) || isBlockedUiContext(target)) {
        badge.remove();
        continue;
      }

      const cluster =
        target.closest(
          "[data-testid='User-Name'], [data-testid='UserName'], [data-testid='UserCell'], [data-testid='SideNav_AccountSwitcher_Button'], a[href], h1, h2, [role='heading']"
        ) || target.parentElement;

      if (seenByCluster.get(cluster)) {
        badge.remove();
        continue;
      }

      seenByCluster.set(cluster, badge);
    }
  }

  function addBadgesInsideProfileLinks() {
    for (const anchor of document.querySelectorAll("a[href]")) {
      if (!isTargetProfileHref(anchor.getAttribute("href")) || isExtensionOwned(anchor)) continue;

      const text = cleanText(anchor.textContent);
      if (!isKnownDisplayName(text)) continue;

      const target = firstVisibleTextElement(anchor) || anchor;
      addBadgeAfter(target);
    }
  }

  function addBadgesToProfileHeader() {
    if (!PROFILE_SURFACE_RE.test(location.pathname)) return;

    const primary = document.querySelector("[data-testid='primaryColumn']") || document.querySelector("main[role='main']");
    if (!primary) return;

    const headings = primary.querySelectorAll("h1, h2, [role='heading']");
    for (const heading of headings) {
      if (isExtensionOwned(heading)) continue;
      const target = firstVisibleTextElement(heading) || heading;
      const text = cleanText(target.textContent);
      if (!isKnownDisplayName(text) || isGenericLabel(text)) continue;

      addBadgeAfter(target, "large");
      break;
    }
  }

  function createPopover() {
    const popover = document.createElement("div");
    popover.id = POPOVER_ID;
    popover.className = "gmv-popover";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", "Verified account");
    popover.innerHTML = `
      <div class="gmv-popover__title">Verified account</div>
      <div class="gmv-popover__row">
        <span class="gmv-popover__icon gmv-popover__icon--blue"></span>
        <div class="gmv-popover__text">
          <span>This account is verified.</span>
          <a href="${HELP_URL}" target="_blank" rel="noopener noreferrer">Learn more</a>
        </div>
      </div>
      <div class="gmv-popover__row">
        <span class="gmv-popover__icon gmv-popover__icon--calendar" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M7 2v3M17 2v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/>
            <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/>
          </svg>
        </span>
        <div class="gmv-popover__text">Verified since November 2025.</div>
      </div>
    `;
    popover.querySelector(".gmv-popover__icon--blue").append(createVerifiedSvg());
    document.body.append(popover);
    return popover;
  }

  function positionPopover(popover, badge) {
    popover.style.visibility = "hidden";
    popover.classList.add("gmv-popover--visible");

    const badgeRect = badge.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 10;
    const left = Math.min(
      Math.max(viewportPadding, badgeRect.left - 28),
      window.innerWidth - popoverRect.width - viewportPadding
    );
    let top = badgeRect.bottom + gap;

    if (top + popoverRect.height > window.innerHeight - viewportPadding) {
      top = badgeRect.top - popoverRect.height - gap;
    }

    popover.style.left = `${Math.max(viewportPadding, left)}px`;
    popover.style.top = `${Math.max(viewportPadding, top)}px`;
    popover.style.visibility = "visible";
  }

  function hidePopover() {
    window.clearTimeout(hoverHideTimer);
    hoverHideTimer = 0;
    const popover = document.getElementById(POPOVER_ID);
    if (popover) popover.remove();
  }

  function scheduleHidePopover() {
    window.clearTimeout(hoverHideTimer);
    hoverHideTimer = window.setTimeout(hidePopover, 180);
  }

  function keepPopoverOpen() {
    window.clearTimeout(hoverHideTimer);
    hoverHideTimer = 0;
  }

  function showPopoverForBadge(badge, { toggle = false } = {}) {
    keepPopoverOpen();
    const existing = document.getElementById(POPOVER_ID);
    if (toggle && existing && existing.dataset.anchor === badge.dataset.gmvAnchor) {
      hidePopover();
      return;
    }
    if (existing && existing.dataset.anchor === badge.dataset.gmvAnchor) return;

    hidePopover();
    if (!badge.dataset.gmvAnchor) {
      badge.dataset.gmvAnchor = `badge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    const popover = createPopover();
    popover.dataset.anchor = badge.dataset.gmvAnchor;
    positionPopover(popover, badge);
  }

  function createAboutRow() {
    const row = document.createElement("a");
    row.id = ABOUT_ROW_ID;
    row.className = "gmv-about-row";
    row.href = HELP_URL;
    row.target = "_blank";
    row.rel = "noopener noreferrer";
    row.innerHTML = `
      <span class="gmv-about-row__icon"></span>
      <span class="gmv-about-row__copy">
        <span class="gmv-about-row__title">Verified</span>
        <span class="gmv-about-row__subtitle">Since November 2025</span>
      </span>
      <span class="gmv-about-row__chevron" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="m9 5 7 7-7 7"/>
        </svg>
      </span>
    `;
    row.querySelector(".gmv-about-row__icon").append(createVerifiedSvg({ outline: true }));
    return row;
  }

  function createHoverVerifiedRow() {
    const row = document.createElement("a");
    row.className = HOVER_ROW_CLASS;
    row.href = HELP_URL;
    row.target = "_blank";
    row.rel = "noopener noreferrer";
    row.innerHTML = `
      <span class="gmv-hover-verified-row__icon"></span>
      <span class="gmv-hover-verified-row__text">Verified since November 2025</span>
      <span class="gmv-hover-verified-row__chevron" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="m9 5 7 7-7 7"/>
        </svg>
      </span>
    `;
    row.querySelector(".gmv-hover-verified-row__icon").append(createVerifiedSvg({ outline: true }));
    return row;
  }

  function directChildUnder(root, node) {
    let child = node;
    while (child && child.parentElement && child.parentElement !== root) {
      child = child.parentElement;
    }
    return child && child.parentElement === root ? child : null;
  }

  function findAboutVerifiedInsertTarget(primary) {
    const idVerifiedCandidates = Array.from(primary.querySelectorAll("a, button, div, span"))
      .filter((element) => {
        if (isExtensionOwned(element) || !isVisibleElement(element)) return false;
        return normalizedText(element.textContent).includes("id verified");
      })
      .sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return aRect.width * aRect.height - bRect.width * bRect.height;
      });

    for (const element of idVerifiedCandidates) {
      const interactiveRow = element.closest("a, button, [role='link'], [role='tab']");
      if (interactiveRow && primary.contains(interactiveRow) && !isExtensionOwned(interactiveRow)) {
        return { mode: "before", node: interactiveRow };
      }

      let row = element;
      while (row && row.parentElement && row.parentElement !== primary) {
        const rect = row.getBoundingClientRect();
        if (rect.width >= 240 && rect.height >= 40 && rect.height <= 120) {
          return { mode: "before", node: row };
        }
        row = row.parentElement;
      }

      const child = directChildUnder(primary, element);
      if (child) return { mode: "before", node: child };
    }

    const tabLink = primary.querySelector(`a[href='/${USERNAME}/about'], a[href$='/${USERNAME}/about']`);
    const tabContainer = tabLink ? directChildUnder(primary, tabLink) : null;
    if (tabContainer) return { mode: "after", node: tabContainer };

    return { mode: "append", node: primary };
  }

  function updateAboutRow() {
    const existing = document.getElementById(ABOUT_ROW_ID);
    if (!isOnTargetAboutPage()) {
      if (existing) existing.remove();
      return;
    }

    const primary = document.querySelector("[data-testid='primaryColumn']") || document.querySelector("main[role='main']");
    if (!primary) return;

    const row = existing || createAboutRow();
    const target = findAboutVerifiedInsertTarget(primary);

    if (target.mode === "before") {
      target.node.insertAdjacentElement("beforebegin", row);
    } else if (target.mode === "after") {
      target.node.insertAdjacentElement("afterend", row);
    } else {
      primary.append(row);
    }
  }

  function findAboutHoverCard() {
    const cards = Array.from(document.querySelectorAll("div"))
      .filter((element) => {
        if (!isVisibleElement(element) || isExtensionOwned(element)) return false;

        const text = normalizedText(element.textContent);
        if (!text.includes("about this account") || !text.includes("joined")) return false;
        if (!text.includes("id verified") && !text.includes("username change")) return false;

        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width >= 240 && rect.width <= 620 && rect.height >= 120 && rect.height <= 620 && style.borderRadius !== "0px";
      })
      .sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return aRect.width * aRect.height - bRect.width * bRect.height;
      });

    return cards[0] || null;
  }

  function findHoverIdVerifiedRow(card) {
    const candidates = Array.from(card.querySelectorAll("a, button, div, span"))
      .filter((element) => {
        if (isExtensionOwned(element) || !isVisibleElement(element)) return false;
        return normalizedText(element.textContent).includes("id verified");
      })
      .sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return aRect.width * aRect.height - bRect.width * bRect.height;
      });

    for (const element of candidates) {
      const interactiveRow = element.closest("a, button, [role='link'], [role='tab']");
      if (interactiveRow && card.contains(interactiveRow) && !isExtensionOwned(interactiveRow)) return interactiveRow;

      let row = element;
      while (row && row.parentElement && row.parentElement !== card) {
        const rect = row.getBoundingClientRect();
        if (rect.width >= 180 && rect.height >= 36 && rect.height <= 80) return row;
        row = row.parentElement;
      }
    }

    return null;
  }

  function updateJoinedHoverCard() {
    if (!isTargetProfileSurfaceVisible()) return;

    const card = findAboutHoverCard();
    if (!card || card.querySelector(`.${HOVER_ROW_CLASS}`)) return;

    const text = normalizedText(card.textContent);
    if (text.includes("verified since november 2025")) return;

    const idVerifiedRow = findHoverIdVerifiedRow(card);
    if (!idVerifiedRow) return;

    idVerifiedRow.insertAdjacentElement("beforebegin", createHoverVerifiedRow());
  }

  function scan() {
    scanQueued = false;
    cleanupInjectedBadges();
    addBadgesInsideUserNameBlocks();
    addBadgesToAccountSwitcher();
    addBadgesNearTargetHandles();
    addBadgesToKnownDisplayNames();
    addBadgesInsideProfileLinks();
    addBadgesToProfileHeader();
    updateAboutRow();
    updateJoinedHoverCard();
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(scan);
  }

  document.addEventListener(
    "click",
    (event) => {
      const badge = event.target.closest(`.${BADGE_CLASS}`);
      const popover = event.target.closest(".gmv-popover");

      if (badge) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        showPopoverForBadge(badge, { toggle: true });
        return;
      }

      if (!popover) hidePopover();
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      const badge = event.target.closest(`.${BADGE_CLASS}`);
      if (badge && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        showPopoverForBadge(badge, { toggle: true });
      }
      if (event.key === "Escape") hidePopover();
    },
    true
  );

  document.addEventListener(
    "mouseover",
    (event) => {
      const badge = event.target.closest(`.${BADGE_CLASS}`);
      if (badge) {
        showPopoverForBadge(badge);
        return;
      }
      if (event.target.closest(".gmv-popover")) keepPopoverOpen();
    },
    true
  );

  document.addEventListener(
    "mouseout",
    (event) => {
      const from = event.target.closest(`.${BADGE_CLASS}, .gmv-popover`);
      const to = event.relatedTarget?.closest?.(`.${BADGE_CLASS}, .gmv-popover`);
      if (from && !to) scheduleHidePopover();
    },
    true
  );

  window.addEventListener("resize", hidePopover);
  window.addEventListener("scroll", hidePopover, true);

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      hidePopover();
    }
    queueScan();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  queueScan();
})();
