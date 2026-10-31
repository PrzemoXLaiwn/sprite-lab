// Animated WebP is the pack format: every frame keeps its alpha, the loop is
// endless, each frame carries the 16 fps delay, and the size ladder steps
// down until the file fits.
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { encodeAnimatedWebp, encodePreviewGrid, readAnimatedWebp } from "./encode";
import type { Frame } from "./types";

function disc(w: number, h: number, cx: number, seed: number): Frame {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const d = Math.hypot(x - cx, y - h / 2);
    // noisy colour so the encoder has something to compress
    data[i] = (x * 7 + seed * 13) & 255; data[i + 1] = (y * 5 + seed * 29) & 255; data[i + 2] = 90;
    data[i + 3] = d < w * 0.3 ? 255 : d < w * 0.32 ? 120 : 0;
  }
  return { data, width: w, height: h };
}

describe("encodeAnimatedWebp", () => {
  it("writes an endless loop with one 62 ms delay per frame and keeps alpha per frame", async () => {
    const frames = Array.from({ length: 6 }, (_, i) => disc(120, 160, 60 + i, i));
    const out = await encodeAnimatedWebp(frames, 16);
    const meta = await readAnimatedWebp(out.webp);
    expect(meta.pages).toBe(6);
    expect(meta.loop).toBe(0);
    expect(meta.delay).toEqual(Array(6).fill(63));
    expect(meta.width).toBe(120);
    expect(meta.height).toBe(160);
    expect(out.quality).toBe(78);
    const page3 = await sharp(out.webp, { page: 3 }).ensureAlpha().raw().toBuffer();
    expect(page3[3]).toBe(0); // corner transparent
    expect(page3[((80 * 120) + 63) * 4 + 3]).toBe(255); // centre opaque
  });

  it("steps down the quality ladder until the file fits the target", async () => {
    const frames = Array.from({ length: 8 }, (_, i) => disc(200, 266, 100, i * 3));
    const full = await encodeAnimatedWebp(frames, 16);
    const squeezed = await encodeAnimatedWebp(frames, 16, { targetBytes: Math.floor(full.bytes * 0.9) });
    expect(squeezed.quality).toBeLessThan(full.quality);
    expect(squeezed.bytes).toBeLessThan(full.bytes);
    const last = await encodeAnimatedWebp(frames, 16, { targetBytes: 10 });
    expect(last.quality).toBe(66); // the last rung is used even if it does not fit
  });

  it("builds a labelled preview grid GIF", async () => {
    const items = ["neutral", "joy", "anger"].map((label, i) => ({ label, frames: [disc(60, 80, 30, i), disc(60, 80, 31, i)] }));
    const gif = await encodePreviewGrid(items, 16, 60);
    const meta = await sharp(gif, { animated: true }).metadata();
    expect(meta.format).toBe("gif");
    expect(meta.pages).toBe(2);
    expect(meta.width).toBe(180);
  });
});
