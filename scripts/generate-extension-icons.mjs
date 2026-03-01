import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const OUT_DIR = path.resolve("src/extension/icons");
const SIZES = [16, 32, 48, 128];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function makePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const header = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
  ]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function setPixel(buffer, size, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const index = (y * size + x) * 4;
  buffer[index] = r;
  buffer[index + 1] = g;
  buffer[index + 2] = b;
  buffer[index + 3] = a;
}

function fillRect(buffer, size, x, y, width, height, color) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      setPixel(buffer, size, xx, yy, ...color);
    }
  }
}

function fillCircle(buffer, size, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        setPixel(buffer, size, x, y, ...color);
      }
    }
  }
}

function drawRoundedRect(buffer, size, x, y, width, height, radius, color) {
  const r = Math.max(0, Math.min(radius, Math.floor(Math.min(width, height) / 2)));
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      const rx = xx < x + r ? x + r - xx : xx >= x + width - r ? xx - (x + width - r - 1) : 0;
      const ry = yy < y + r ? y + r - yy : yy >= y + height - r ? yy - (y + height - r - 1) : 0;
      if (rx === 0 || ry === 0 || rx * rx + ry * ry <= r * r) {
        setPixel(buffer, size, xx, yy, ...color);
      }
    }
  }
}

function drawIcon(size) {
  const buffer = Buffer.alloc(size * size * 4);
  const bgTop = [247, 242, 235, 255];
  const bgBottom = [232, 240, 251, 255];

  for (let y = 0; y < size; y += 1) {
    const t = size === 1 ? 0 : y / (size - 1);
    const r = Math.round(bgTop[0] * (1 - t) + bgBottom[0] * t);
    const g = Math.round(bgTop[1] * (1 - t) + bgBottom[1] * t);
    const b = Math.round(bgTop[2] * (1 - t) + bgBottom[2] * t);
    for (let x = 0; x < size; x += 1) {
      setPixel(buffer, size, x, y, r, g, b, 255);
    }
  }

  fillCircle(
    buffer,
    size,
    size * 0.24,
    size * 0.2,
    Math.max(2, size * 0.11),
    [255, 255, 255, 72]
  );
  fillCircle(
    buffer,
    size,
    size * 0.82,
    size * 0.82,
    Math.max(3, size * 0.16),
    [255, 255, 255, 56]
  );

  const shadowInset = Math.max(1, Math.round(size * 0.14));
  const cardInset = Math.max(2, Math.round(size * 0.17));
  const cardRadius = Math.max(2, Math.round(size * 0.15));
  drawRoundedRect(
    buffer,
    size,
    shadowInset,
    shadowInset + Math.max(1, Math.round(size * 0.025)),
    size - shadowInset * 2,
    size - shadowInset * 2,
    cardRadius,
    [28, 39, 60, 28]
  );
  drawRoundedRect(
    buffer,
    size,
    cardInset,
    cardInset,
    size - cardInset * 2,
    size - cardInset * 2,
    cardRadius,
    [255, 255, 255, 255]
  );

  const foldSize = Math.max(2, Math.round(size * 0.18));
  const foldStartX = size - cardInset - foldSize;
  const foldStartY = cardInset;
  for (let y = 0; y < foldSize; y += 1) {
    for (let x = 0; x < foldSize - y; x += 1) {
      setPixel(buffer, size, foldStartX + x, foldStartY + y, 231, 237, 247, 255);
    }
  }

  const divider = Math.max(1, Math.round(size * 0.02));
  for (let i = 0; i < foldSize; i += 1) {
    setPixel(buffer, size, foldStartX + i, foldStartY + foldSize - i - 1, 212, 221, 236, 255);
    if (divider > 1) {
      setPixel(buffer, size, foldStartX + i, foldStartY + foldSize - i - 2, 212, 221, 236, 255);
    }
  }

  const lineLeft = cardInset + Math.max(2, Math.round(size * 0.11));
  const lineRight = size - cardInset - Math.max(3, Math.round(size * 0.12));
  const lineHeight = Math.max(1, Math.round(size * 0.05));
  const lineGap = Math.max(2, Math.round(size * 0.095));
  const firstLineY = cardInset + Math.max(3, Math.round(size * 0.2));
  fillRect(buffer, size, lineLeft, firstLineY, lineRight - lineLeft, lineHeight, [42, 64, 99, 255]);
  fillRect(buffer, size, lineLeft, firstLineY + lineGap, Math.max(2, Math.round((lineRight - lineLeft) * 0.8)), lineHeight, [104, 125, 158, 255]);
  fillRect(buffer, size, lineLeft, firstLineY + lineGap * 2, Math.max(2, Math.round((lineRight - lineLeft) * 0.58)), lineHeight, [104, 125, 158, 255]);

  const qrFrame = Math.max(4, Math.round(size * 0.2));
  const qrInset = Math.max(1, Math.round(qrFrame * 0.16));
  const qrX = size - cardInset - qrFrame - Math.max(1, Math.round(size * 0.08));
  const qrY = size - cardInset - qrFrame - Math.max(1, Math.round(size * 0.09));
  drawRoundedRect(buffer, size, qrX, qrY, qrFrame, qrFrame, Math.max(2, Math.round(qrFrame * 0.24)), [15, 23, 42, 255]);
  fillRect(buffer, size, qrX + qrInset, qrY + qrInset, qrFrame - qrInset * 2, qrFrame - qrInset * 2, [255, 255, 255, 255]);

  const finder = Math.max(1, Math.round(qrFrame * 0.22));
  const finderGap = Math.max(1, Math.round(qrFrame * 0.12));
  fillRect(buffer, size, qrX + qrInset + finderGap, qrY + qrInset + finderGap, finder, finder, [15, 23, 42, 255]);
  fillRect(buffer, size, qrX + qrFrame - qrInset - finderGap - finder, qrY + qrInset + finderGap, finder, finder, [15, 23, 42, 255]);
  fillRect(buffer, size, qrX + qrInset + finderGap, qrY + qrFrame - qrInset - finderGap - finder, finder, finder, [15, 23, 42, 255]);

  const accentWidth = Math.max(2, Math.round(size * 0.045));
  const accentHeight = Math.max(4, Math.round(size * 0.22));
  fillRect(
    buffer,
    size,
    cardInset - Math.max(1, Math.round(size * 0.03)),
    cardInset + Math.max(2, Math.round(size * 0.18)),
    accentWidth,
    accentHeight,
    [244, 114, 44, 255]
  );

  return buffer;
}

await fs.mkdir(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  const rgba = drawIcon(size);
  const png = makePng(size, size, rgba);
  await fs.writeFile(path.join(OUT_DIR, `icon-${size}.png`), png);
}

console.log(`Generated icons in ${OUT_DIR}`);
