import { clampMaxHeight, getGridCount, validateOptionalUrl } from "./shared.js";

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MIN_CAPTURE_INTERVAL_MS = 700;
let lastCaptureAt = 0;
const CAPTURE_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const CAPTURE_META_PREFIX = "captureMeta:";
const CAPTURE_CACHE_NAME = "longshot-capture-cache-v1";
const QR_FOOTER_HEIGHT = 220;
const PAGE_SETTLE_TIMEOUT_MS = 2200;

function getRenderScale(dpr, outputQuality) {
  if (outputQuality === "standard") return 1;
  if (outputQuality === "high") return Math.max(1, Math.min(dpr || 1, 1.5));
  return Math.max(1, dpr || 1);
}

async function sendTabMessage(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

async function ensureContentScript(tabId) {
  try {
    await sendTabMessage(tabId, { type: "LONGSHOT_GET_PAGE_INFO" });
    return;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  }
}

async function captureVisible(windowId) {
  const now = Date.now();
  const waitMs = Math.max(0, MIN_CAPTURE_INTERVAL_MS - (now - lastCaptureAt));
  if (waitMs > 0) {
    await delay(waitMs);
  }

  let lastErr = null;
  for (let i = 0; i < 4; i += 1) {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
      lastCaptureAt = Date.now();
      return dataUrl;
    } catch (error) {
      lastErr = error;
      const message = String(error?.message || error || "");
      if (!message.includes("MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND")) {
        throw error;
      }
      await delay(800 + i * 400);
    }
  }

  throw lastErr || new Error("captureVisibleTab failed");
}

async function dataUrlToImageBitmap(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

async function blobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  return `data:${blob.type || "image/png"};base64,${base64}`;
}

const qrCache = new Map();

async function getQrBitmap(link) {
  if (!link) return null;
  if (qrCache.has(link)) return qrCache.get(link);
  try {
    const endpoint = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(link)}`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    qrCache.set(link, bmp);
    return bmp;
  } catch {
    return null;
  }
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

function fitText(ctx, text, maxWidth) {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;

  const ellipsis = "...";
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, mid)}${ellipsis}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return `${text.slice(0, low)}${ellipsis}`;
}

function parseLinkMeta(link) {
  try {
    const url = new URL(link);
    const pathname = url.pathname === "/" ? "" : url.pathname;
    return {
      host: url.hostname.replace(/^www\./i, ""),
      path: pathname,
      scheme: url.protocol.replace(":", "").toUpperCase()
    };
  } catch {
    return { host: "Website", path: link, scheme: "LINK" };
  }
}

function getFooterCopy(language) {
  if (language === "zh") {
    return {
      helper: "扫描二维码查看全文"
    };
  }
  return {
    helper: "Scan QR to view full page"
  };
}

async function drawQrFooter(ctx, width, height, link, language = "en") {
  const footerHeight = QR_FOOTER_HEIGHT;
  const footerTop = height - footerHeight;
  const gradient = ctx.createLinearGradient(0, footerTop, width, height);
  gradient.addColorStop(0, "#f7efe5");
  gradient.addColorStop(0.52, "#efe9ff");
  gradient.addColorStop(1, "#e5f0ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, footerTop, width, footerHeight);

  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#fb923c";
  ctx.beginPath();
  ctx.arc(Math.max(84, width - 112), footerTop + 56, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2563eb";
  ctx.beginPath();
  ctx.arc(56, footerTop + footerHeight - 32, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const cardX = 20;
  const cardY = footerTop + 20;
  const cardWidth = Math.max(1, width - 40);
  const cardHeight = footerHeight - 40;

  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.12)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  fillRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 30, "rgba(255, 255, 255, 0.92)");
  ctx.restore();

  fillRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 30, "rgba(255, 255, 255, 0.82)");

  const qr = await getQrBitmap(link);
  const qrFrameSize = 148;
  const qrSize = 108;
  const qrX = cardX + 26;
  const qrY = cardY + Math.floor((cardHeight - qrFrameSize) / 2);
  fillRoundedRect(ctx, qrX, qrY, qrFrameSize, qrFrameSize, 30, "#111827");
  fillRoundedRect(ctx, qrX + 12, qrY + 12, qrFrameSize - 24, qrFrameSize - 24, 20, "#ffffff");
  if (qr) {
    ctx.drawImage(
      qr,
      qrX + Math.floor((qrFrameSize - qrSize) / 2),
      qrY + Math.floor((qrFrameSize - qrSize) / 2),
      qrSize,
      qrSize
    );
  } else {
    ctx.fillStyle = "#e2e8f0";
    fillRoundedRect(ctx, qrX + 10, qrY + 10, qrFrameSize - 20, qrFrameSize - 20, 18, "#e2e8f0");
  }

  const copy = getFooterCopy(language);
  const textX = qrX + qrFrameSize + 30;
  const textWidth = Math.max(120, cardX + cardWidth - textX - 28);
  const helperSize = language === "zh" ? 26 : 24;
  ctx.fillStyle = "#334155";
  ctx.font = `700 ${helperSize}px "Segoe UI", sans-serif`;
  const metrics = ctx.measureText(copy.helper);
  const textHeight = (metrics.actualBoundingBoxAscent || helperSize * 0.8) + (metrics.actualBoundingBoxDescent || helperSize * 0.2);
  const textY = cardY + Math.floor((cardHeight + textHeight) / 2) - 6;
  ctx.fillText(fitText(ctx, copy.helper, textWidth), textX, textY);
}

function getCaptureBounds({ pageInfo, cropBounds, maxHeight }) {
  const dpr = pageInfo.dpr || 1;
  const targetX = Math.max(0, Math.floor(cropBounds?.left ?? 0));
  const maxVisibleRight = Math.max(pageInfo.viewportWidth, targetX + 1);
  const requestedRight = cropBounds?.right == null ? pageInfo.viewportWidth : Math.floor(cropBounds.right);
  const endX = Math.max(targetX + 1, Math.min(requestedRight, maxVisibleRight));
  const startY = Math.max(0, Math.floor(cropBounds?.top ?? 0));
  const requestedBottom = cropBounds?.bottom == null ? pageInfo.docHeight : Math.floor(cropBounds.bottom);
  const endY = Math.max(startY + 1, Math.min(requestedBottom, pageInfo.docHeight));
  const baseWidth = Math.max(1, endX - targetX);
  let baseHeight = Math.max(1, endY - startY);
  if (maxHeight > 0) {
    baseHeight = Math.min(baseHeight, maxHeight);
  }

  return {
    dpr,
    targetX,
    startY,
    endY: startY + baseHeight,
    baseWidth,
    baseHeight,
    hasBottomBound: cropBounds?.bottom != null
  };
}

async function composeLongImage({ frames, pageInfo, cropBounds, maxHeight, feishuUrl, linkScope, outputMode, outputQuality, language }) {
  const { dpr, targetX, startY, endY, baseWidth, baseHeight } = getCaptureBounds({
    pageInfo,
    cropBounds,
    maxHeight
  });
  const renderScale = getRenderScale(dpr, outputQuality);
  const viewportOffsetX = pageInfo.viewportOffsetX || 0;
  const viewportOffsetY = pageInfo.viewportOffsetY || 0;

  const linkFooterNeeded = !!feishuUrl && linkScope !== "none" && outputMode === "long";
  const footerHeight = linkFooterNeeded ? QR_FOOTER_HEIGHT : 0;

  const canvas = new OffscreenCanvas(
    Math.max(1, Math.floor(baseWidth * renderScale)),
    Math.max(1, Math.floor((baseHeight + footerHeight) * renderScale))
  );
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sortedFrames = [...frames].sort((a, b) => a.pageY - b.pageY);
  let lastDrawBottom = startY;

  for (let i = 0; i < sortedFrames.length; i += 1) {
    const frame = sortedFrames[i];
    const img = await dataUrlToImageBitmap(frame.dataUrl);

    const frameVisibleTop = frame.pageY;
    const frameVisibleBottom = frame.pageY + pageInfo.viewportHeight;

    const drawTop = Math.max(frameVisibleTop, startY, lastDrawBottom - 2);
    const drawBottom = Math.min(frameVisibleBottom, endY);

    if (drawBottom <= drawTop) {
      img.close();
      continue;
    }

    const srcX = Math.max(0, Math.floor((viewportOffsetX + targetX) * dpr));
    const srcY = Math.max(0, Math.floor((viewportOffsetY + (drawTop - frame.pageY)) * dpr));
    const srcW = Math.min(img.width - srcX, Math.floor(baseWidth * dpr));
    const srcH = Math.floor((drawBottom - drawTop) * dpr);

    const destX = 0;
    const destY = Math.floor((drawTop - startY) * renderScale);
    const destW = Math.floor((srcW / dpr) * renderScale);
    const destH = Math.floor((srcH / dpr) * renderScale);

    ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
    lastDrawBottom = Math.max(lastDrawBottom, drawBottom);
    img.close();
  }

  if (linkFooterNeeded) {
    ctx.save();
    ctx.scale(renderScale, renderScale);
    await drawQrFooter(ctx, baseWidth, baseHeight + footerHeight, feishuUrl, language);
    ctx.restore();
  }

  const actualContentHeight = Math.max(1, Math.min(baseHeight, lastDrawBottom - startY));
  const finalHeight = actualContentHeight + footerHeight;

  if (actualContentHeight !== baseHeight) {
    const trimmedCanvas = new OffscreenCanvas(
      Math.max(1, Math.floor(baseWidth * renderScale)),
      Math.max(1, Math.floor(finalHeight * renderScale))
    );
    const trimmedCtx = trimmedCanvas.getContext("2d");
    trimmedCtx.fillStyle = "#ffffff";
    trimmedCtx.fillRect(0, 0, trimmedCanvas.width, trimmedCanvas.height);
    trimmedCtx.drawImage(
      canvas,
      0,
      0,
      trimmedCanvas.width,
      Math.floor(actualContentHeight * renderScale),
      0,
      0,
      trimmedCanvas.width,
      Math.floor(actualContentHeight * renderScale)
    );

    if (linkFooterNeeded) {
      trimmedCtx.save();
      trimmedCtx.scale(renderScale, renderScale);
      await drawQrFooter(trimmedCtx, baseWidth, finalHeight, feishuUrl, language);
      trimmedCtx.restore();
    }

    const blob = await trimmedCanvas.convertToBlob({ type: "image/png" });
    return {
      blob,
      width: trimmedCanvas.width,
      height: trimmedCanvas.height,
      cssWidth: baseWidth,
      cssHeight: finalHeight,
      pixelRatio: renderScale
    };
  }

  const blob = await canvas.convertToBlob({ type: "image/png" });
  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    cssWidth: baseWidth,
    cssHeight: baseHeight + footerHeight,
    pixelRatio: renderScale
  };
}

function normalizeBoundaries(boundaries, totalHeight) {
  const minGap = 40;
  const clean = (Array.isArray(boundaries) ? boundaries : [])
    .map((v) => Math.floor(Number(v || 0)))
    .filter((v) => Number.isFinite(v) && v > 0 && v < totalHeight)
    .sort((a, b) => a - b);

  const unique = [];
  for (let i = 0; i < clean.length; i += 1) {
    const v = clean[i];
    if (unique.length === 0 || v - unique[unique.length - 1] >= minGap) {
      unique.push(v);
    }
  }
  return unique;
}

function getFooterHeights(gridCount, feishuUrl, linkScope) {
  const heights = new Array(gridCount).fill(0);
  if (!feishuUrl || linkScope === "none") return heights;
  if (linkScope === "all") {
    return heights.map(() => QR_FOOTER_HEIGHT);
  }
  heights[gridCount - 1] = QR_FOOTER_HEIGHT;
  return heights;
}

function getFooterHeightsPx(gridCount, feishuUrl, linkScope, pixelRatio) {
  return getFooterHeights(gridCount, feishuUrl, linkScope).map((height) => Math.round(height * pixelRatio));
}

async function splitByBoundaries({ longBlob, boundaries, feishuUrl, linkScope, pixelRatio, language }) {
  const bmp = await createImageBitmap(longBlob);
  const clean = normalizeBoundaries(boundaries, bmp.height);
  const points = [0, ...clean, bmp.height];
  const blobs = [];
  const footerHeights = getFooterHeightsPx(points.length - 1, feishuUrl, linkScope, pixelRatio);

  for (let i = 0; i < points.length - 1; i += 1) {
    const y = points[i];
    const h = points[i + 1] - points[i];
    if (h <= 0) continue;

    const withFooter = feishuUrl && (linkScope === "all" || (linkScope === "last" && i === points.length - 2));
    const footerHeight = withFooter ? footerHeights[i] : 0;

    const canvas = new OffscreenCanvas(bmp.width, h + footerHeight);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, y, bmp.width, h, 0, 0, bmp.width, h);

    if (withFooter) {
      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);
      await drawQrFooter(ctx, bmp.width / pixelRatio, h / pixelRatio + QR_FOOTER_HEIGHT, feishuUrl, language);
      ctx.restore();
    }

    blobs.push(await canvas.convertToBlob({ type: "image/png" }));
  }

  bmp.close();
  return blobs;
}

async function downloadBlob(blob, filename) {
  const dataUrl = await blobToDataUrl(blob);
  await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: false
  });
}

function captureSessionKey(id) {
  return `${CAPTURE_META_PREFIX}${id}`;
}

function captureSessionImageUrl(sessionId) {
  return `https://longshot.capture/${encodeURIComponent(sessionId)}.png`;
}

async function saveCaptureSession(session, imageBlob) {
  const key = captureSessionKey(session.id);
  await chrome.storage.local.set({ [key]: session });

  const cache = await caches.open(CAPTURE_CACHE_NAME);
  const url = captureSessionImageUrl(session.id);
  await cache.put(
    new Request(url),
    new Response(imageBlob, {
      headers: {
        "content-type": "image/png"
      }
    })
  );
}

async function deleteCaptureSession(sessionId) {
  const key = captureSessionKey(sessionId);
  await chrome.storage.local.remove(key);
  const cache = await caches.open(CAPTURE_CACHE_NAME);
  await cache.delete(new Request(captureSessionImageUrl(sessionId)));
}

async function getCaptureSessionWithBlob(sessionId) {
  const key = captureSessionKey(sessionId);
  const data = await chrome.storage.local.get(key);
  const session = data[key] || null;
  if (!session) return null;

  if (Date.now() - (session.createdAt || 0) > CAPTURE_SESSION_TTL_MS) {
    await deleteCaptureSession(sessionId);
    return null;
  }

  const cache = await caches.open(CAPTURE_CACHE_NAME);
  const response = await cache.match(new Request(captureSessionImageUrl(sessionId)));
  if (!response) return null;
  const blob = await response.blob();
  return { session, blob };
}

async function getCaptureSessionForEditor(sessionId) {
  const data = await getCaptureSessionWithBlob(sessionId);
  if (!data) return null;
  return {
    ...data.session,
    imageDataUrl: await blobToDataUrl(data.blob)
  };
}

function defaultBoundaries(totalHeight, gridCount, feishuUrl, linkScope, pixelRatio) {
  const result = [];
  const footerHeights = getFooterHeightsPx(gridCount, feishuUrl, linkScope, pixelRatio);
  const totalFinalHeight = totalHeight + footerHeights.reduce((sum, value) => sum + value, 0);
  const baseFinalHeight = Math.floor(totalFinalHeight / gridCount);
  let remainder = totalFinalHeight % gridCount;
  let accumulatedContentHeight = 0;

  for (let i = 0; i < gridCount - 1; i += 1) {
    const finalHeight = baseFinalHeight + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    const remainingMinHeight = gridCount - i - 1;
    const desiredContentHeight = Math.max(1, finalHeight - footerHeights[i]);
    const availableContentHeight = Math.max(1, totalHeight - accumulatedContentHeight - remainingMinHeight);
    accumulatedContentHeight += Math.min(desiredContentHeight, availableContentHeight);
    result.push(accumulatedContentHeight);
  }
  return result;
}

async function waitForPageSettled(tabId, timeoutMs = PAGE_SETTLE_TIMEOUT_MS) {
  const response = await sendTabMessage(tabId, {
    type: "LONGSHOT_WAIT_FOR_PAGE_SETTLED",
    payload: { timeoutMs }
  });
  return response?.payload || null;
}

async function runCapture(payload) {
  const { tabId, cropBounds, maxHeight, outputMode, outputQuality, feishuUrl, linkScope, language } = payload;
  if (!tabId) throw new Error("Missing tab id");
  if (!validateOptionalUrl(feishuUrl)) throw new Error("Invalid URL");

  const tab = await chrome.tabs.get(tabId);
  if (!tab?.windowId) throw new Error("Invalid tab/window context");
  if (!/^https?:/i.test(tab.url || "")) {
    throw new Error("This page is unsupported. Open an http/https page.");
  }

  await ensureContentScript(tabId);

  const pageRes = await sendTabMessage(tabId, { type: "LONGSHOT_GET_PAGE_INFO" });
  const pageInfo = pageRes?.payload;
  if (!pageInfo) throw new Error("Unable to read page info");

  const bounds = getCaptureBounds({
    pageInfo,
    cropBounds,
    maxHeight: clampMaxHeight(maxHeight)
  });
  const viewport = pageInfo.viewportHeight;
  const overlap = Math.max(80, Math.floor(viewport * 0.15));
  const step = Math.max(100, viewport - overlap);

  const frames = [];
  const originalPos = pageInfo.scrollY;
  let targetY = bounds.startY;
  let done = false;
  let latestPageInfo = pageInfo;

  try {
    while (!done) {
      const scrollRes = await sendTabMessage(tabId, { type: "LONGSHOT_SCROLL_TO", payload: { y: targetY } });
      await delay(160);

      latestPageInfo = (await waitForPageSettled(tabId, PAGE_SETTLE_TIMEOUT_MS)) || latestPageInfo;
      const pageY = scrollRes?.payload?.scrollY ?? latestPageInfo.scrollY ?? targetY;
      const dataUrl = await captureVisible(tab.windowId);

      if (frames.length === 0 || frames[frames.length - 1].pageY !== pageY) {
        frames.push({ pageY, dataUrl });
      } else {
        frames[frames.length - 1] = { pageY, dataUrl };
      }

      const visibleBottom = pageY + latestPageInfo.viewportHeight;
      if (bounds.hasBottomBound) {
        if (visibleBottom >= bounds.endY - 2) {
          done = true;
        } else {
          targetY = pageY + step;
        }
        continue;
      }

      if (visibleBottom < latestPageInfo.docHeight - 2) {
        targetY = pageY + step;
        continue;
      }

      const settledBottomInfo = (await waitForPageSettled(tabId, PAGE_SETTLE_TIMEOUT_MS + 900)) || latestPageInfo;
      latestPageInfo = settledBottomInfo;
      if (visibleBottom < settledBottomInfo.docHeight - 2) {
        targetY = pageY + step;
        continue;
      }

      done = true;
    }
  } finally {
    await sendTabMessage(tabId, { type: "LONGSHOT_SCROLL_TO", payload: { y: originalPos } });
  }

  const composed = await composeLongImage({
    frames,
    pageInfo: latestPageInfo,
    cropBounds,
    maxHeight: clampMaxHeight(maxHeight),
    feishuUrl,
    linkScope,
    outputMode,
    outputQuality,
    language
  });

  const gridCount = getGridCount(outputMode);
  if (gridCount === 1) {
    await downloadBlob(composed.blob, `longshot/longshot_${Date.now()}.png`);
    return { mode: "downloaded", fileCount: 1 };
  }

  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session = {
    id: sessionId,
    createdAt: Date.now(),
    width: composed.width,
    height: composed.height,
    cssWidth: composed.cssWidth,
    cssHeight: composed.cssHeight,
    pixelRatio: composed.pixelRatio || 1,
    uiLanguage: language || "en",
    gridCount,
    feishuUrl: feishuUrl || "",
    linkScope: linkScope || "none",
    boundaries: defaultBoundaries(composed.height, gridCount, feishuUrl, linkScope, composed.pixelRatio || 1)
  };
  await saveCaptureSession(session, composed.blob);

  return { mode: "needs_split_editor", sessionId, gridCount };
}

async function exportSplit(payload) {
  const { sessionId, boundaries } = payload || {};
  if (!sessionId) throw new Error("Missing sessionId");
  const data = await getCaptureSessionWithBlob(sessionId);
  if (!data) throw new Error("Capture session expired. Please capture again.");
  const { session, blob: longBlob } = data;
  const exportBoundaries = normalizeBoundaries(boundaries, session.height);

  const blobs = await splitByBoundaries({
    longBlob,
    boundaries: exportBoundaries,
    feishuUrl: session.feishuUrl,
    linkScope: session.linkScope,
    pixelRatio: session.pixelRatio || 1,
    language: session.uiLanguage || "en"
  });

  const stamp = Date.now();
  for (let i = 0; i < blobs.length; i += 1) {
    const index = String(i + 1).padStart(2, "0");
    await downloadBlob(blobs[i], `longshot/longshot_${stamp}_${index}.png`);
  }

  return { fileCount: blobs.length };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "LONGSHOT_RUN_CAPTURE") {
    runCapture(msg.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (msg?.type === "LONGSHOT_GET_CAPTURE_SESSION") {
    getCaptureSessionForEditor(msg.payload?.sessionId)
      .then((session) => {
        if (!session) {
          sendResponse({ ok: false, error: "Session not found" });
          return;
        }
        sendResponse({ ok: true, session });
      })
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (msg?.type === "LONGSHOT_EXPORT_SPLIT") {
    exportSplit(msg.payload)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
