let cachedScrollRoot = null;
let cropBounds = null;
let activePickerCleanup = null;
let uiLanguage = "en";
const PAGE_SETTLE_TIMEOUT_MS = 2200;
const PAGE_SETTLE_STABLE_MS = 320;
const CROP_BOUNDS_KEY = "lastCropBounds";

const pickerMessages = {
  en: {
    horizontal: (edge) => `Click anywhere on the page to set ${edge}. Press Esc to cancel.`,
    verticalInit: (edge) => `Scroll or use the page directory, then choose ${edge}.`,
    verticalLive: (edge, value) =>
      `Scroll or jump with the page directory, move the mouse to the target ${edge}, then click anywhere on the page to confirm. Current ${edge}: ${Math.round(value)}px`
  },
  zh: {
    horizontal: (edge) => `请在页面任意位置点击，设置${edge}。按 Esc 取消。`,
    verticalInit: (edge) => `请滚动页面或使用目录跳转，然后选择${edge}。`,
    verticalLive: (edge, value) =>
      `请滚动页面或使用目录跳转，将鼠标移动到目标${edge}，然后在页面中点击确认。当前${edge}：${Math.round(value)}px`
  }
};

function edgeLabel(edge) {
  const labels = {
    en: { left: "left", right: "right", top: "top", bottom: "bottom" },
    zh: { left: "左边界", right: "右边界", top: "上边界", bottom: "下边界" }
  };
  return labels[uiLanguage]?.[edge] || edge;
}

function pickerCopy() {
  return pickerMessages[uiLanguage] || pickerMessages.en;
}

function isScrollableElement(el) {
  if (!el || el === document.body || el === document.documentElement) return false;
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  const canScroll = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
  return canScroll && el.scrollHeight - el.clientHeight > 80 && el.clientHeight > 200;
}

function findBestScrollRoot() {
  const documentRoot = document.scrollingElement || document.documentElement;
  const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);

  const candidates = [documentRoot];
  const all = document.querySelectorAll("div, main, section, article");
  for (const el of all) {
    if (isScrollableElement(el)) candidates.push(el);
  }

  let best = documentRoot;
  let bestScore = 0;
  for (const el of candidates) {
    const scrollable = Math.max(0, el.scrollHeight - el.clientHeight);
    const width = el === documentRoot ? window.innerWidth : el.clientWidth;
    let score = scrollable * Math.max(1, width);

    if (centerEl && el.contains && el.contains(centerEl)) {
      score *= 1.4;
    }

    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}

function getScrollRoot() {
  if (cachedScrollRoot && document.contains(cachedScrollRoot)) {
    return cachedScrollRoot;
  }
  cachedScrollRoot = findBestScrollRoot();
  return cachedScrollRoot;
}

function getRootRect(root) {
  if (root === document.scrollingElement || root === document.documentElement || root === document.body) {
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  }
  const rect = root.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: root.clientWidth, height: root.clientHeight };
}

function getPageInfo() {
  const root = getScrollRoot();
  const rect = getRootRect(root);
  return {
    viewportWidth: Math.max(1, rect.width),
    viewportHeight: Math.max(1, rect.height),
    viewportOffsetX: Math.max(0, rect.left),
    viewportOffsetY: Math.max(0, rect.top),
    docHeight: Math.max(root.scrollHeight, root.clientHeight),
    docWidth: Math.max(root.scrollWidth, root.clientWidth),
    scrollY: root.scrollTop,
    scrollX: root.scrollLeft,
    dpr: window.devicePixelRatio || 1
  };
}

function scrollToY(y) {
  const root = getScrollRoot();
  const maxY = Math.max(0, root.scrollHeight - root.clientHeight);
  const nextY = Math.max(0, Math.min(maxY, y));
  root.scrollTop = nextY;
  return { scrollY: root.scrollTop };
}

async function waitForPageSettled(timeoutMs = PAGE_SETTLE_TIMEOUT_MS) {
  const startedAt = Date.now();
  let lastInfo = getPageInfo();
  let stableSince = startedAt;

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, 80);
      });
    });

    const nextInfo = getPageInfo();
    const changed =
      nextInfo.docHeight !== lastInfo.docHeight ||
      nextInfo.docWidth !== lastInfo.docWidth ||
      nextInfo.scrollY !== lastInfo.scrollY ||
      nextInfo.viewportHeight !== lastInfo.viewportHeight;

    if (changed) {
      lastInfo = nextInfo;
      stableSince = Date.now();
      continue;
    }

    if (Date.now() - stableSince >= PAGE_SETTLE_STABLE_MS) {
      return nextInfo;
    }
  }

  return getPageInfo();
}

function normalizeCropBounds(bounds) {
  if (!bounds || typeof bounds !== "object") {
    return {
      left: null,
      right: null,
      top: null,
      bottom: null,
      pageUrl: location.href,
      savedAt: Date.now()
    };
  }

  const safeBounds = bounds && typeof bounds === "object" ? bounds : {};
  const next = {
    left: Number.isFinite(safeBounds.left) ? Math.max(0, safeBounds.left) : null,
    right: Number.isFinite(safeBounds.right) ? Math.max(0, safeBounds.right) : null,
    top: Number.isFinite(safeBounds.top) ? Math.max(0, safeBounds.top) : null,
    bottom: Number.isFinite(safeBounds.bottom) ? Math.max(0, safeBounds.bottom) : null,
    pageUrl: location.href,
    savedAt: Date.now()
  };

  if (next.left != null && next.right != null && next.left > next.right) {
    [next.left, next.right] = [next.right, next.left];
  }

  if (next.top != null && next.bottom != null && next.top > next.bottom) {
    [next.top, next.bottom] = [next.bottom, next.top];
  }

  return next;
}

async function saveCropBounds(nextBounds) {
  cropBounds = normalizeCropBounds(nextBounds);
  try {
    await chrome.storage.local.set({ [CROP_BOUNDS_KEY]: cropBounds });
  } catch (error) {
    const message = String(error?.message || error || "");
    if (message.includes("Extension context invalidated")) {
      clearActivePicker();
      return cropBounds;
    }
    throw error;
  }
  return cropBounds;
}

function createFloatingPanel(message) {
  const panel = document.createElement("div");
  Object.assign(panel.style, {
    position: "fixed",
    top: "16px",
    right: "16px",
    zIndex: "2147483647",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minWidth: "240px",
    padding: "12px 14px",
    borderRadius: "14px",
    background: "rgba(15, 23, 42, 0.92)",
    color: "#fff",
    boxShadow: "0 16px 36px rgba(15, 23, 42, 0.24)",
    pointerEvents: "none"
  });

  const text = document.createElement("div");
  text.textContent = message;
  text.style.fontSize = "12px";
  text.style.lineHeight = "1.5";
  text.style.pointerEvents = "none";
  panel.appendChild(text);

  document.documentElement.appendChild(panel);
  return { panel, text };
}

function clearActivePicker() {
  if (typeof activePickerCleanup === "function") {
    activePickerCleanup();
    activePickerCleanup = null;
  }
}

function getPointFromClient(clientX, clientY) {
  const root = getScrollRoot();
  const rect = getRootRect(root);
  return {
    x: clientX - rect.left + root.scrollLeft,
    y: clientY - rect.top + root.scrollTop
  };
}

function startHorizontalEdgePicker(edge) {
  clearActivePicker();
  const { panel, text } = createFloatingPanel(pickerCopy().horizontal(edgeLabel(edge)));
  const guide = document.createElement("div");
  Object.assign(guide.style, {
    position: "fixed",
    top: "0",
    bottom: "0",
    width: "2px",
    background: "rgba(29, 78, 216, 0.95)",
    pointerEvents: "none",
    zIndex: "2147483646",
    display: "none"
  });
  document.documentElement.appendChild(guide);

  const cleanup = () => {
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    panel.remove();
    guide.remove();
  };

  const onMouseMove = (e) => {
    guide.style.display = "block";
    guide.style.left = `${e.clientX}px`;
  };

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const point = getPointFromClient(e.clientX, e.clientY);
    await saveCropBounds({ ...(cropBounds || {}), [edge]: Math.round(point.x) });
    cleanup();
    activePickerCleanup = null;
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cleanup();
      activePickerCleanup = null;
    }
  };

  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  text.textContent = pickerCopy().horizontal(edgeLabel(edge));
  activePickerCleanup = cleanup;
}

function startVerticalEdgePicker(edge) {
  clearActivePicker();
  const root = getScrollRoot();
  const rootRect = () => getRootRect(root);
  const { panel, text } = createFloatingPanel(pickerCopy().verticalInit(edgeLabel(edge)));
  const guide = document.createElement("div");
  Object.assign(guide.style, {
    position: "fixed",
    left: "0",
    right: "0",
    height: "0",
    borderTop: "2px solid rgba(29, 78, 216, 0.96)",
    pointerEvents: "none",
    zIndex: "2147483646"
  });
  document.documentElement.appendChild(guide);

  const badge = document.createElement("div");
  Object.assign(badge.style, {
    position: "fixed",
    right: "16px",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "rgba(29, 78, 216, 0.96)",
    color: "#fff",
    fontSize: "12px",
    zIndex: "2147483647",
    pointerEvents: "none"
  });
  document.documentElement.appendChild(badge);

  let pointerY = edge === "top" ? Math.min(120, window.innerHeight * 0.25) : Math.max(120, window.innerHeight * 0.75);

  function getCurrentValue() {
    const rect = rootRect();
    const relativeY = pointerY - rect.top;
    return Math.max(0, root.scrollTop + relativeY);
  }

  function updateGuide() {
    const clampedY = Math.max(0, Math.min(window.innerHeight - 2, pointerY));
    guide.style.top = `${clampedY}px`;
    badge.style.top = `${Math.max(16, Math.min(window.innerHeight - 40, clampedY - 14))}px`;
    const value = getCurrentValue();
    text.textContent = pickerCopy().verticalLive(edgeLabel(edge), value);
    badge.textContent = `${edgeLabel(edge)}: ${Math.round(value)}px`;
  }

  const cleanup = () => {
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onPageClick, true);
    root.removeEventListener("scroll", updateGuide, true);
    panel.remove();
    guide.remove();
    badge.remove();
  };

  const onConfirm = async () => {
    await saveCropBounds({ ...(cropBounds || {}), [edge]: Math.round(getCurrentValue()) });
    cleanup();
    activePickerCleanup = null;
  };

  const onMouseMove = (e) => {
    pointerY = e.clientY;
    updateGuide();
  };

  const onPageClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await onConfirm();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cleanup();
      activePickerCleanup = null;
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      onConfirm();
    }
  };

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onPageClick, true);
  root.addEventListener("scroll", updateGuide, true);
  updateGuide();
  activePickerCleanup = cleanup;
}

async function clearCropEdge(edge) {
  await saveCropBounds({ ...(cropBounds || {}), [edge]: null });
}

async function loadCropBounds() {
  try {
    const data = await chrome.storage.local.get(CROP_BOUNDS_KEY);
    const stored = data[CROP_BOUNDS_KEY];
    cropBounds = stored && (!stored.pageUrl || stored.pageUrl === location.href) ? normalizeCropBounds(stored) : normalizeCropBounds(null);
  } catch (error) {
    const message = String(error?.message || error || "");
    if (message.includes("Extension context invalidated")) {
      cropBounds = normalizeCropBounds(null);
      return;
    }
    throw error;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "LONGSHOT_GET_PAGE_INFO") {
    sendResponse({ ok: true, payload: getPageInfo() });
    return;
  }

  if (msg?.type === "LONGSHOT_SCROLL_TO") {
    const payload = scrollToY(msg.payload?.y || 0);
    sendResponse({ ok: true, payload });
    return;
  }

  if (msg?.type === "LONGSHOT_START_EDGE_PICKER") {
    uiLanguage = msg.payload?.language || uiLanguage;
    const edge = msg.payload?.edge;
    if (edge === "left" || edge === "right") {
      startHorizontalEdgePicker(edge);
    } else if (edge === "top" || edge === "bottom") {
      startVerticalEdgePicker(edge);
    }
    sendResponse({ ok: true });
    return;
  }

  if (msg?.type === "LONGSHOT_WAIT_FOR_PAGE_SETTLED") {
    waitForPageSettled(msg.payload?.timeoutMs)
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (msg?.type === "LONGSHOT_CLEAR_EDGE") {
    clearCropEdge(msg.payload?.edge)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (msg?.type === "LONGSHOT_GET_CROP_BOUNDS") {
    sendResponse({ ok: true, payload: cropBounds });
    return;
  }
});

loadCropBounds();
