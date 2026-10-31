// =============================================================================
// Import a user's own sprite — make an uploaded image usable like a generated one
// =============================================================================
// People keep asking to animate or edit "the uploaded character" (21 prompts
// in one week of Oct 2026). An import goes through the same rules as our own
// output: transparent background (a flat background is keyed out), trimmed
// with a margin, pixel art scaled only by whole numbers. No AI call, no cost.
// =============================================================================

import sharp from "sharp";
import { keySpriteBackground } from "@/lib/image/sprite-postprocess";

export interface ImportedSprite {
  png: Buffer;
  width: number;
  height: number;
  /** Hard-edged art with a small palette (decides nearest-neighbour scaling and the pixel styles). */
  pixel: boolean;
  /** "kept" = the file already had transparency; "keyed" = a flat background was removed; "none" = no plain background found. */
  background: "kept" | "keyed" | "none";
}

export const IMPORT_MAX_BYTES = 8 * 1024 * 1024;
export const IMPORT_MAX_SIDE = 4096;
export const IMPORT_MIN_SIDE = 8;

type Raw = { data: Buffer; width: number; height: number };

const transparentShare = (raw: Raw) => {
  let n = 0;
  for (let i = 3; i < raw.data.length; i += 4) if (raw.data[i] < 128) n++;
  return n / (raw.width * raw.height);
};

/** Distinct colours among opaque pixels, capped (pixel art stays well under ~200). */
function colourCount(raw: Raw, cap = 400): number {
  const seen = new Set<number>();
  for (let i = 0; i < raw.data.length; i += 4) {
    if (raw.data[i + 3] < 128) continue;
    seen.add((raw.data[i] << 16) | (raw.data[i + 1] << 8) | raw.data[i + 2]);
    if (seen.size > cap) break;
  }
  return seen.size;
}

/** Opaque bounding box, or null when everything is transparent. */
function bounds(raw: Raw): { x: number; y: number; w: number; h: number } | null {
  let x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) {
      if (raw.data[(y * raw.width + x) * 4 + 3] < 128) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Upload → transparent, trimmed, square PNG ready for Animate / Edit.
 * Throws an Error with a user-facing message when the image can't be used.
 */
export async function importSprite(input: Buffer): Promise<ImportedSprite> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 0, h = meta.height ?? 0;
  if (w < IMPORT_MIN_SIDE || h < IMPORT_MIN_SIDE) throw new Error("The image is too small. Use one at least 8 × 8 pixels.");
  if (w > IMPORT_MAX_SIDE || h > IMPORT_MAX_SIDE) throw new Error("The image is too large. Use one at most 4096 pixels on each side.");

  // First frame only (animated GIF/WebP), sRGB, with alpha
  const { data, info } = await sharp(input, { pages: 1 }).toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const raw: Raw = { data, width: info.width, height: info.height };

  let background: ImportedSprite["background"] = "kept";
  if (transparentShare(raw) < 0.03) {
    // No real transparency: remove a plain background the same way generated sprites are keyed
    const copy: Raw = { data: Buffer.from(raw.data), width: raw.width, height: raw.height };
    keySpriteBackground(copy);
    const removed = transparentShare(copy);
    // A photo or a busy scene has no plain background to remove: keep the image as it is
    if (removed >= 0.05 && removed <= 0.97) {
      raw.data = copy.data;
      background = "keyed";
    } else {
      background = "none";
    }
  }

  const box = bounds(raw);
  if (!box) throw new Error("The image is completely transparent.");
  const pixel = colourCount(raw) <= 256;

  // Trim, then centre on a square canvas with a 6% margin
  const side = Math.ceil(Math.max(box.w, box.h) * 1.12);
  const left = Math.floor((side - box.w) / 2), top = Math.floor((side - box.h) / 2);
  const trimmed = await sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } })
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .extend({ left, right: side - box.w - left, top, bottom: side - box.h - top, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Size: pixel art grows by a whole number up to 1024 (never blurred);
  // painted art is brought into 512–1024
  let out = trimmed, size = side;
  if (pixel) {
    const k = Math.max(1, Math.floor(1024 / side));
    if (k > 1) { size = side * k; out = await sharp(trimmed).resize(size, size, { kernel: "nearest" }).png().toBuffer(); }
    else if (side > 1024) { size = 1024; out = await sharp(trimmed).resize(1024, 1024, { kernel: "nearest" }).png().toBuffer(); }
  } else if (side > 1024 || side < 512) {
    size = side > 1024 ? 1024 : 512;
    out = await sharp(trimmed).resize(size, size, { kernel: "lanczos3" }).png().toBuffer();
  }
  return { png: await sharp(out).png({ compressionLevel: 9 }).toBuffer(), width: size, height: size, pixel, background };
}

// Uploads are marked in full_prompt (see src/lib/upload-marker.ts)
export { UPLOAD_MARKER, isUploadedPrompt } from "@/lib/upload-marker";
