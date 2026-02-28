const params = new URLSearchParams(location.search);
const sessionId = params.get("sessionId");
const UI_LANGUAGE_KEY = "uiLanguage";

const els = {
  title: document.getElementById("title"),
  languageBtn: document.getElementById("languageBtn"),
  status: document.getElementById("status"),
  workspace: document.getElementById("workspace"),
  previewWrap: document.getElementById("previewWrap"),
  previewImage: document.getElementById("previewImage"),
  lineLayer: document.getElementById("lineLayer"),
  metaInfo: document.getElementById("metaInfo"),
  metaHint1: document.getElementById("metaHint1"),
  metaHint2: document.getElementById("metaHint2"),
  resetBtn: document.getElementById("resetBtn"),
  exportBtn: document.getElementById("exportBtn")
};

const copy = {
  en: {
    title: "Split Editor",
    languageBtn: "中文",
    reset: "Reset",
    export: "Export Images",
    metaHint1: "Drag the horizontal split lines to adjust crop positions.",
    metaHint2: "Exports will keep this exact order top to bottom.",
    status: {
      missing: "Missing session id.",
      loading: "Loading capture session...",
      notFound: "Session not found.",
      ready: "Drag split lines, then export.",
      exporting: "Exporting images...",
      failed: "Export failed.",
      done: (count) => `Done. Exported ${count} images.`
    },
    splitLabel: (index) => `Split ${index}`,
    meta: (width, height, parts) => `Image: ${width}x${height}px | Parts: ${parts.join(" | ")}`
  },
  zh: {
    title: "分图编辑器",
    languageBtn: "EN",
    reset: "重置",
    export: "导出图片",
    metaHint1: "拖动横向分割线来调整切分位置。",
    metaHint2: "导出顺序会严格保持从上到下。",
    status: {
      missing: "缺少会话 ID。",
      loading: "正在加载截图会话...",
      notFound: "未找到会话。",
      ready: "拖动分割线后再导出。",
      exporting: "正在导出图片...",
      failed: "导出失败。",
      done: (count) => `完成，已导出 ${count} 张图片。`
    },
    splitLabel: (index) => `分割线 ${index}`,
    meta: (width, height, parts) => `图片：${width}x${height}px | 分段：${parts.join(" | ")}`
  }
};

const state = {
  session: null,
  boundaries: [],
  defaultBoundaries: [],
  draggingIndex: -1,
  pointerMove: null,
  pointerUp: null,
  lang: "en"
};
const QR_FOOTER_HEIGHT = 220;

function t() {
  return copy[state.lang];
}

async function loadLanguage() {
  try {
    const data = await chrome.storage.local.get(UI_LANGUAGE_KEY);
    state.lang = data[UI_LANGUAGE_KEY] || "en";
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
  const langCopy = t();
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  els.title.textContent = langCopy.title;
  els.languageBtn.textContent = langCopy.languageBtn;
  els.resetBtn.textContent = langCopy.reset;
  els.exportBtn.textContent = langCopy.export;
  els.metaHint1.textContent = langCopy.metaHint1;
  els.metaHint2.textContent = langCopy.metaHint2;
  if (state.session) {
    renderLines();
  }
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? "#b91c1c" : "#0f172a";
}

function getScale() {
  const naturalHeight = els.previewImage.naturalHeight || 1;
  const renderedHeight = els.previewImage.getBoundingClientRect().height || 1;
  return renderedHeight / naturalHeight;
}

function clampBoundary(value, index) {
  const minGap = 60;
  const height = state.session.height;
  const prev = index === 0 ? 0 : state.boundaries[index - 1];
  const next = index === state.boundaries.length - 1 ? height : state.boundaries[index + 1];
  return Math.max(prev + minGap, Math.min(next - minGap, value));
}

function getFooterHeights() {
  const heights = new Array(state.session?.gridCount || 0).fill(0);
  if (!state.session?.feishuUrl || state.session.linkScope === "none") return heights;
  if (state.session.linkScope === "all") {
    return heights.map(() => QR_FOOTER_HEIGHT);
  }
  if (heights.length > 0) {
    heights[heights.length - 1] = QR_FOOTER_HEIGHT;
  }
  return heights;
}

function renderMeta() {
  const footerHeights = getFooterHeights();
  const parts = [];
  const points = [0, ...state.boundaries, state.session.height];
  for (let i = 0; i < points.length - 1; i += 1) {
    const contentHeight = points[i + 1] - points[i];
    parts.push(`#${i + 1}: ${contentHeight + footerHeights[i]}px`);
  }
  els.metaInfo.textContent = t().meta(state.session.width, state.session.height, parts);
}

function renderLines() {
  const scale = getScale();
  els.lineLayer.replaceChildren();

  state.boundaries.forEach((y, index) => {
    const line = document.createElement("div");
    line.className = "split-line";
    line.style.top = `${Math.round(y * scale)}px`;

    const label = document.createElement("span");
    label.className = "split-label";
    label.textContent = t().splitLabel(index + 1);
    line.appendChild(label);

    line.addEventListener("mousedown", (e) => {
      e.preventDefault();
      state.draggingIndex = index;
    });

    els.lineLayer.appendChild(line);
  });

  renderMeta();
}

function installDragHandlers() {
  state.pointerMove = (e) => {
    if (state.draggingIndex < 0) return;
    const rect = els.previewImage.getBoundingClientRect();
    const scale = getScale();
    const y = (e.clientY - rect.top) / scale;
    const next = clampBoundary(Math.floor(y), state.draggingIndex);
    state.boundaries[state.draggingIndex] = next;
    renderLines();
  };

  state.pointerUp = () => {
    state.draggingIndex = -1;
  };

  window.addEventListener("mousemove", state.pointerMove);
  window.addEventListener("mouseup", state.pointerUp);
}

async function loadSession() {
  if (!sessionId) {
    setStatus(t().status.missing, true);
    return;
  }

  setStatus(t().status.loading);

  const res = await chrome.runtime.sendMessage({
    type: "LONGSHOT_GET_CAPTURE_SESSION",
    payload: { sessionId }
  });

  if (!res?.ok || !res.session) {
    setStatus(res?.error || t().status.notFound, true);
    return;
  }

  state.session = res.session;
  state.boundaries = [...(res.session.boundaries || [])];
  state.defaultBoundaries = [...state.boundaries];

  els.previewImage.src = res.session.imageDataUrl;
  await els.previewImage.decode();
  els.workspace.classList.remove("hidden");
  renderLines();
  installDragHandlers();
  setStatus(t().status.ready);
}

els.languageBtn.addEventListener("click", async () => {
  state.lang = state.lang === "en" ? "zh" : "en";
  applyTranslations();
  await saveLanguage();
});

els.resetBtn.addEventListener("click", () => {
  if (!state.session) return;
  state.boundaries = [...state.defaultBoundaries];
  renderLines();
});

els.exportBtn.addEventListener("click", async () => {
  if (!state.session) return;
  els.exportBtn.disabled = true;
  setStatus(t().status.exporting);

  try {
    const res = await chrome.runtime.sendMessage({
      type: "LONGSHOT_EXPORT_SPLIT",
      payload: {
        sessionId: state.session.id,
        boundaries: state.boundaries
      }
    });

    if (!res?.ok) {
      setStatus(res?.error || t().status.failed, true);
      return;
    }

    setStatus(t().status.done(res.fileCount));
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  } finally {
    els.exportBtn.disabled = false;
  }
});

window.addEventListener("resize", () => {
  if (!state.session) return;
  renderLines();
});

await loadLanguage();
applyTranslations();
loadSession();
