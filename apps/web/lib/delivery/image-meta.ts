/**
 * Deterministic image header parsing (PNG / WebP / JPEG). Pure — takes a Buffer,
 * returns metadata. Used by the asset audit so dimensions and alpha are FACTS,
 * not model guesses.
 */

export type ImageMeta = { width: number; height: number; hasAlpha: boolean; format: string } | null;

export function readImageMeta(buf: Buffer): ImageMeta {
  if (buf.length < 16) return null;

  // ---- PNG: \x89PNG\r\n\x1a\n then IHDR ----
  if (buf.length > 24 && buf.toString("ascii", 1, 4) === "PNG") {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const colorType = buf.readUInt8(25); // 4 = grey+alpha, 6 = RGBA
    return { width, height, hasAlpha: colorType === 4 || colorType === 6, format: "png" };
  }

  // ---- WebP: RIFF....WEBP ----
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X" && buf.length > 30) {
      const width = 1 + buf.readUIntLE(24, 3);
      const height = 1 + buf.readUIntLE(27, 3);
      const flags = buf.readUInt8(20);
      return { width, height, hasAlpha: (flags & 0x10) !== 0, format: "webp" };
    }
    if (chunk === "VP8L" && buf.length > 25) {
      const b = buf.readUInt32LE(21);
      const width = (b & 0x3fff) + 1;
      const height = ((b >> 14) & 0x3fff) + 1;
      const hasAlpha = ((b >> 28) & 0x1) !== 0;
      return { width, height, hasAlpha, format: "webp" };
    }
    if (chunk === "VP8 " && buf.length > 30) {
      // lossy: 3-byte frame tag, then 0x9d012a sync code, then 14-bit dims
      const start = 23;
      if (buf.readUInt8(start) === 0x9d && buf.readUInt8(start + 1) === 0x01 && buf.readUInt8(start + 2) === 0x2a) {
        const width = buf.readUInt16LE(start + 3) & 0x3fff;
        const height = buf.readUInt16LE(start + 5) & 0x3fff;
        return { width, height, hasAlpha: false, format: "webp" };
      }
    }
    return null;
  }

  // ---- JPEG ----
  if (buf.readUInt16BE(0) === 0xffd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf.readUInt8(off) !== 0xff) { off++; continue; }
      const marker = buf.readUInt8(off + 1);
      const len = buf.readUInt16BE(off + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: buf.readUInt16BE(off + 7), height: buf.readUInt16BE(off + 5), hasAlpha: false, format: "jpeg" };
      }
      off += 2 + len;
    }
  }

  return null;
}

export function aspectRatio(w: number, h: number): number {
  return h === 0 ? 0 : Math.round((w / h) * 1000) / 1000;
}
