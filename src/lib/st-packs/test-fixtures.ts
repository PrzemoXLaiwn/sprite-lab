// Synthetic frames for the st-packs unit tests (not part of the pipeline).
import type { Frame } from "./types";

export type Rgba = [number, number, number, number];

export function makeFrame(width: number, height: number, fill: Rgba = [0, 0, 0, 0]): Frame {
  const data = Buffer.alloc(width * height * 4);
  for (let o = 0; o < data.length; o += 4) {
    data[o] = fill[0];
    data[o + 1] = fill[1];
    data[o + 2] = fill[2];
    data[o + 3] = fill[3];
  }
  return { data, width, height };
}

/** Straight-alpha "over" of a source colour with coverage 0–1 onto the pixel at (x, y). In place. */
export function blendPixel(frame: Frame, x: number, y: number, rgb: [number, number, number], coverage: number): void {
  if (coverage <= 0 || x < 0 || y < 0 || x >= frame.width || y >= frame.height) return;
  const o = (y * frame.width + x) * 4;
  const d = frame.data;
  const srcA = Math.min(1, coverage);
  const dstA = d[o + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  for (let c = 0; c < 3; c++) {
    d[o + c] = Math.round((rgb[c] * srcA + d[o + c] * dstA * (1 - srcA)) / outA);
  }
  d[o + 3] = Math.round(outA * 255);
}

/** Anti-aliased disc (1 px soft edge) composited over the frame. In place. */
export function drawDisc(frame: Frame, cx: number, cy: number, r: number, rgb: [number, number, number]): void {
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const x1 = Math.min(frame.width - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const y1 = Math.min(frame.height - 1, Math.ceil(cy + r + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const cov = Math.max(0, Math.min(1, r + 0.5 - Math.sqrt(dx * dx + dy * dy)));
      blendPixel(frame, x, y, rgb, cov);
    }
  }
}

/** Solid rectangle [x0, x1) × [y0, y1) composited over the frame. In place. */
export function drawRect(frame: Frame, x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number], alpha = 1): void {
  for (let y = Math.max(0, y0); y < Math.min(frame.height, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(frame.width, x1); x++) blendPixel(frame, x, y, rgb, alpha);
  }
}

export function pixel(frame: Frame, x: number, y: number): Rgba {
  const o = (y * frame.width + x) * 4;
  return [frame.data[o], frame.data[o + 1], frame.data[o + 2], frame.data[o + 3]];
}

/**
 * A "bust" sprite on a transparent canvas: a torso block that reaches the bottom
 * edge plus a round head, both offset by (dx, dy); `headR` lets a test animate it.
 */
export function bustFrame(width: number, height: number, opts: { dx?: number; dy?: number; headR?: number } = {}): Frame {
  const dx = opts.dx ?? 0;
  const dy = opts.dy ?? 0;
  const headR = opts.headR ?? width * 0.15;
  const f = makeFrame(width, height);
  const cx = width / 2 + dx;
  const torsoHalf = width * 0.19;
  // Similar luminance for head and torso so the (hard-edged) torso doesn't skew the halo metric.
  drawRect(f, Math.round(cx - torsoHalf), Math.round(height * 0.55 + dy), Math.round(cx + torsoHalf), height, [140, 160, 230]);
  drawDisc(f, cx, height * 0.35 + dy, headR, [220, 180, 150]);
  return f;
}
