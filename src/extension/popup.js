const els = {
  title: document.getElementById("title"),
  languageBtn: document.getElementById("languageBtn"),
  leftTitle: document.getElementById("leftTitle"),
  setLeftBtn: document.getElementById("setLeftBtn"),
  clearLeftBtn: document.getElementById("clearLeftBtn"),
  leftInfo: document.getElementById("leftInfo"),
  rightTitle: document.getElementById("rightTitle"),
  setRightBtn: document.getElementById("setRightBtn"),
  clearRightBtn: document.getElementById("clearRightBtn"),
  rightInfo: document.getElementById("rightInfo"),
  topTitle: document.getElementById("topTitle"),
  setTopBtn: document.getElementById("setTopBtn"),
  clearTopBtn: document.getElementById("clearTopBtn"),
  topInfo: document.getElementById("topInfo"),
  bottomTitle: document.getElementById("bottomTitle"),
  setBottomBtn: document.getElementById("setBottomBtn"),
  clearBottomBtn: document.getElementById("clearBottomBtn"),
  bottomInfo: document.getElementById("bottomInfo"),
  maxHeightLabel: document.getElementById("maxHeightLabel"),
  maxHeight: document.getElementById("maxHeight"),
  outputModeLabel: document.getElementById("outputModeLabel"),
  outputMode: document.getElementById("outputMode"),
  qualityLabel: document.getElementById("qualityLabel"),
  outputQuality: document.getElementById("outputQuality"),
  linkLabel: document.getElementById("linkLabel"),
  linkInput: document.getElementById("feishuUrl"),
  linkScopeLabel: document.getElementById("linkScopeLabel"),
  linkScope: document.getElementById("linkScope"),
  captureBtn: document.getElementById("captureBtn"),
  status: document.getElementById("status")
};

const POPUP_CONFIG_KEY = "popupConfig";
const CROP_BOUNDS_KEY = "lastCropBounds";
const UI_LANGUAGE_KEY = "uiLanguage";

const messages = {
  en: {
    title: "LongShot",
    languageBtn: "中文",
    edgeTitles: { left: "Left", right: "Right", top: "Top", bottom: "Bottom" },
    setEdge: { left: "Set Left", right: "Set Right", top: "Set Top", bottom: "Set Bottom" },
    clearEdge: "Full",
    full: "Full",
    unavailable: "Unavailable",
    maxHeightLabel: "Max Output Height (px)",
    maxHeightPlaceholder: "0 = no limit",
    outputModeLabel: "Output Mode",
    outputModes: {
      long: "Single Long Image",
      grid4: "4 Grid",
      grid3: "3 Grid",
      grid6: "6 Grid",
      grid9: "9 Grid"
    },
    qualityLabel: "Output Quality",
    qualities: {
      standard: "Standard",
      high: "High",
      max: "Max"
    },
    linkLabel: "Source Link (optional)",
    linkPlaceholder: "https://example.com/page",
    linkScopeLabel: "Link Placement",
    linkScopes: {
      none: "Do not attach",
      last: "Attach on last page",
      all: "Attach on all pages"
    },
    capture: "Capture & Export",
    statuses: {
      noTab: "No active tab.",
      cannotRun: "Cannot run on this page. Try a normal http/https page.",
      invalidUrl: "Please enter a valid URL.",
      pickHorizontal: (edge) => `Click on the page to set ${edge}.`,
      pickVertical: (edge) => `Scroll or use the page directory, then set ${edge} on-page.`,
      resetEdge: (edge) => `${edge} reset to full.`,
      capturing: "Capturing...",
      splitOpened: "Capture done. Split editor opened.",
      exported: (count) => `Done. Exported ${count} file(s).`,
      captureFailed: "Capture failed."
    }
  },
  zh: {
    title: "LongShot",
    languageBtn: "EN",
    edgeTitles: { left: "左边界", right: "右边界", top: "上边界", bottom: "下边界" },
    setEdge: { left: "设置左边界", right: "设置右边界", top: "设置上边界", bottom: "设置下边界" },
    clearEdge: "全宽/全高",
    full: "全宽/全高",
    unavailable: "不可用",
    maxHeightLabel: "最大导出高度（像素）",
    maxHeightPlaceholder: "0 = 不限制",
    outputModeLabel: "导出模式",
    outputModes: {
      long: "单张长图",
      grid4: "4 张分图",
      grid3: "3 张分图",
      grid6: "6 张分图",
      grid9: "9 张分图"
    },
    qualityLabel: "输出清晰度",
    qualities: {
      standard: "标准",
      high: "高清",
      max: "最高"
    },
    linkLabel: "网页链接（可选）",
    linkPlaceholder: "https://example.com/page",
    linkScopeLabel: "链接附加位置",
    linkScopes: {
      none: "不附加",
      last: "仅最后一张",
      all: "每一张都附加"
    },
    capture: "截图并导出",
    statuses: {
      noTab: "没有可用的当前标签页。",
      cannotRun: "当前页面无法运行，请换到普通 http/https 页面。",
      invalidUrl: "请输入合法的网址。",
      pickHorizontal: (edge) => `请在页面中点击设置${edge}。`,
      pickVertical: (edge) => `请滚动页面或使用目录跳转，然后在页面中设置${edge}。`,
      resetEdge: (edge) => `${edge}已恢复为全宽/全高。`,
      capturing: "正在截图...",
      splitOpened: "截图完成，已打开分图编辑器。",
      exported: (count) => `完成，已导出 ${count} 个文件。`,
      captureFailed: "截图失败。"
    }
  }
};

const state = {
  lang: "en"
};

function t() {
  return messages[state.lang];
}

function edgeLabel(edge) {
  return t().edgeTitles[edge];
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? "#b91c1c" : "#1f2a37";
}

function isValidUrl(url) {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function readConfigFromDom() {
  return {
    maxHeight: els.maxHeight.value,
    outputMode: els.outputMode.value,
    outputQuality: els.outputQuality.value,
    feishuUrl: els.linkInput.value,
    linkScope: els.linkScope.value
  };
}

async function savePopupConfig() {
  try {
    await chrome.storage.local.set({ [POPUP_CONFIG_KEY]: readConfigFromDom() });
  } catch {
    // Ignore popup state persistence failures.
  }
}

async function restorePopupConfig() {
  try {
    const data = await chrome.storage.local.get([POPUP_CONFIG_KEY, UI_LANGUAGE_KEY]);
    const config = data[POPUP_CONFIG_KEY];
    state.lang = data[UI_LANGUAGE_KEY] || "en";
    if (config) {
      if (config.maxHeight !== undefined) els.maxHeight.value = config.maxHeight;
      if (config.outputMode) els.outputMode.value = config.outputMode;
      if (config.outputQuality) els.outputQuality.value = config.outputQuality;
      if (config.feishuUrl !== undefined) els.linkInput.value = config.feishuUrl;
      if (config.linkScope) els.linkScope.value = config.linkScope;
    }
  } catch {
    state.lang = "en";
  }
}

async function saveLanguage() {
  try {
    await chrome.storage.local.set({ [UI_LANGUAGE_KEY]: state.lang });
  } catch {
    // Ignore language persistence failures.
  }
}

function applyTranslations() {
  const copy = t();
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  els.title.textContent = copy.title;
  els.languageBtn.textContent = copy.languageBtn;
  els.leftTitle.textContent = copy.edgeTitles.left;
  els.rightTitle.textContent = copy.edgeTitles.right;
  els.topTitle.textContent = copy.edgeTitles.top;
  els.bottomTitle.textContent = copy.edgeTitles.bottom;
  els.setLeftBtn.textContent = copy.setEdge.left;
  els.setRightBtn.textContent = copy.setEdge.right;
  els.setTopBtn.textContent = copy.setEdge.top;
  els.setBottomBtn.textContent = copy.setEdge.bottom;
  els.clearLeftBtn.textContent = copy.clearEdge;
  els.clearRightBtn.textContent = copy.clearEdge;
  els.clearTopBtn.textContent = copy.clearEdge;
  els.clearBottomBtn.textContent = copy.clearEdge;
  els.maxHeightLabel.childNodes[0].textContent = `${copy.maxHeightLabel}\n        `;
  els.maxHeight.placeholder = copy.maxHeightPlaceholder;
  els.outputModeLabel.childNodes[0].textContent = `${copy.outputModeLabel}\n        `;
  Array.from(els.outputMode.options).forEach((option) => {
    option.textContent = copy.outputModes[option.value];
  });
  els.qualityLabel.childNodes[0].textContent = `${copy.qualityLabel}\n        `;
  Array.from(els.outputQuality.options).forEach((option) => {
    option.textContent = copy.qualities[option.value];
  });
  els.linkLabel.childNodes[0].textContent = `${copy.linkLabel}\n        `;
  els.linkInput.placeholder = copy.linkPlaceholder;
  els.linkScopeLabel.childNodes[0].textContent = `${copy.linkScopeLabel}\n        `;
  Array.from(els.linkScope.options).forEach((option) => {
    option.textContent = copy.linkScopes[option.value];
  });
  els.captureBtn.textContent = copy.capture;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "LONGSHOT_GET_PAGE_INFO" });
    return true;
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
      return true;
    } catch {
      return false;
    }
  }
}

async function getCropBounds() {
  const data = await chrome.storage.local.get(CROP_BOUNDS_KEY);
  return data[CROP_BOUNDS_KEY] || null;
}

function formatEdgeValue(edge, bounds) {
  const value = bounds?.[edge];
  if (value == null) return t().full;
  return `${Math.round(value)}px`;
}

async function refreshCropBoundsInfo() {
  try {
    const tab = await getActiveTab();
    const bounds = await getCropBounds();
    const activeBounds = bounds && (!tab?.url || !bounds.pageUrl || bounds.pageUrl === tab.url) ? bounds : null;

    els.leftInfo.textContent = formatEdgeValue("left", activeBounds);
    els.rightInfo.textContent = formatEdgeValue("right", activeBounds);
    els.topInfo.textContent = formatEdgeValue("top", activeBounds);
    els.bottomInfo.textContent = formatEdgeValue("bottom", activeBounds);
  } catch {
    els.leftInfo.textContent = t().unavailable;
    els.rightInfo.textContent = t().unavailable;
    els.topInfo.textContent = t().unavailable;
    els.bottomInfo.textContent = t().unavailable;
  }
}

async function startEdgePicker(edge) {
  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus(t().statuses.noTab, true);
    return;
  }

  const ready = await ensureContentScript(tab.id);
  if (!ready) {
    setStatus(t().statuses.cannotRun, true);
    return;
  }

  await chrome.tabs.sendMessage(tab.id, {
    type: "LONGSHOT_START_EDGE_PICKER",
    payload: { edge, language: state.lang }
  });
  if (edge === "top" || edge === "bottom") {
    setStatus(t().statuses.pickVertical(edgeLabel(edge)));
  } else {
    setStatus(t().statuses.pickHorizontal(edgeLabel(edge)));
  }
}

async function clearEdge(edge) {
  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus(t().statuses.noTab, true);
    return;
  }

  const ready = await ensureContentScript(tab.id);
  if (!ready) {
    setStatus(t().statuses.cannotRun, true);
    return;
  }

  await chrome.tabs.sendMessage(tab.id, {
    type: "LONGSHOT_CLEAR_EDGE",
    payload: { edge }
  });
  await refreshCropBoundsInfo();
  setStatus(t().statuses.resetEdge(edgeLabel(edge)));
}

els.setLeftBtn.addEventListener("click", () => startEdgePicker("left"));
els.setRightBtn.addEventListener("click", () => startEdgePicker("right"));
els.setTopBtn.addEventListener("click", () => startEdgePicker("top"));
els.setBottomBtn.addEventListener("click", () => startEdgePicker("bottom"));

els.clearLeftBtn.addEventListener("click", () => clearEdge("left"));
els.clearRightBtn.addEventListener("click", () => clearEdge("right"));
els.clearTopBtn.addEventListener("click", () => clearEdge("top"));
els.clearBottomBtn.addEventListener("click", () => clearEdge("bottom"));

els.languageBtn.addEventListener("click", async () => {
  state.lang = state.lang === "en" ? "zh" : "en";
  applyTranslations();
  await saveLanguage();
  await refreshCropBoundsInfo();
});

els.captureBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus(t().statuses.noTab, true);
    return;
  }

  const ready = await ensureContentScript(tab.id);
  if (!ready) {
    setStatus(t().statuses.cannotRun, true);
    return;
  }

  const sourceUrl = els.linkInput.value.trim();
  if (!isValidUrl(sourceUrl)) {
    setStatus(t().statuses.invalidUrl, true);
    return;
  }

  setStatus(t().statuses.capturing);
  els.captureBtn.disabled = true;
  await savePopupConfig();

  const cropBounds = await getCropBounds();
  const config = {
    tabId: tab.id,
    cropBounds: cropBounds && (!cropBounds.pageUrl || cropBounds.pageUrl === tab.url) ? cropBounds : null,
    maxHeight: Number(els.maxHeight.value || 0),
    outputMode: els.outputMode.value,
    outputQuality: els.outputQuality.value,
    feishuUrl: sourceUrl,
    linkScope: els.linkScope.value,
    language: state.lang
  };

  try {
    const res = await chrome.runtime.sendMessage({
      type: "LONGSHOT_RUN_CAPTURE",
      payload: config
    });

    if (!res?.ok) {
      setStatus(res?.error || t().statuses.captureFailed, true);
    } else {
      const result = res.result || {};
      if (result.mode === "needs_split_editor" && result.sessionId) {
        const editorUrl = chrome.runtime.getURL(`editor.html?sessionId=${encodeURIComponent(result.sessionId)}`);
        await chrome.tabs.create({ url: editorUrl });
        setStatus(t().statuses.splitOpened);
      } else {
        setStatus(t().statuses.exported(result.fileCount || 1));
      }
    }
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  } finally {
    els.captureBtn.disabled = false;
  }
});

for (const el of [els.maxHeight, els.outputMode, els.outputQuality, els.linkInput, els.linkScope]) {
  const eventName = el.tagName === "SELECT" ? "change" : "input";
  el.addEventListener(eventName, () => {
    savePopupConfig();
  });
}

await restorePopupConfig();
applyTranslations();
await refreshCropBoundsInfo();
