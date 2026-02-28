export function validateOptionalUrl(url) {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export const validateFeishuUrl = validateOptionalUrl;

export function getGridCount(outputMode) {
  if (outputMode === "grid3") return 3;
  if (outputMode === "grid4") return 4;
  if (outputMode === "grid6") return 6;
  if (outputMode === "grid9") return 9;
  return 1;
}

export function clampMaxHeight(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}
