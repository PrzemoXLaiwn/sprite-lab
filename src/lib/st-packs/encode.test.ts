// Animated WebP is the pack format: every frame keeps its alpha, the loop is
// endless, each frame carries the 16 fps delay, and the file is encoded once.
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { encodeAnimatedWebp, encodePreviewGrid, readAnimatedWebp, encodeWithinCap } from "./encode";
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
    expect(out.quality).toBe(90);
    expect(out.alphaQuality).toBe(100);
    expect(out.lossless).toBe(false);
    const page3 = await sharp(out.webp, { page: 3 }).ensureAlpha().raw().toBuffer();
    expect(page3[3]).toBe(0); // corner transparent
    expect(page3[((80 * 120) + 63) * 4 + 3]).toBe(255); // centre opaque
  });

  it("encodes once at the given quality, and lossless keeps the opaque pixel", async () => {
    const frames = Array.from({ length: 4 }, (_, i) => disc(48, 64, 24, i));
    const lossy = await encodeAnimatedWebp(frames, 16, { quality: 90, alphaQuality: 100, effort: 4 });
    const exact = await encodeAnimatedWebp(frames, 16, { lossless: true, effort: 4 });
    expect(lossy.lossless).toBe(false);
    expect(lossy.quality).toBe(90);
    expect(exact.lossless).toBe(true);
    const page = await sharp(exact.webp, { page: 0 }).ensureAlpha().raw().toBuffer();
    const src = frames[0].data;
    // Centre of the disc is fully opaque and must survive lossless.
    const o = (32 * 48 + 24) * 4;
    expect([page[o], page[o + 1], page[o + 2], page[o + 3]]).toEqual([src[o], src[o + 1], src[o + 2], src[o + 3]]);
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

describe("encodeWithinCap", () => {
  it("re-encodes once, smaller, when the HQ file is over the cap; leaves a small file alone", async () => {
    const frames = Array.from({ length: 6 }, (_, i) => {
      const w = 96, h = 128, data = Buffer.alloc(w * h * 4);
      for (let p = 0; p < w * h; p++) { data[p * 4] = (p * 31 + i * 17) & 255; data[p * 4 + 1] = (p * 7) & 255; data[p * 4 + 2] = (p * 13 + i) & 255; data[p * 4 + 3] = 255; }
      return { data, width: w, height: h };
    });
    const roomy = await encodeWithinCap(frames, 16, 10_000_000);
    expect(roomy.reencoded).toBe(false);
    expect(roomy.quality).toBe(90);
    const tight = await encodeWithinCap(frames, 16, Math.floor(roomy.bytes * 0.9));
    expect(tight.reencoded).toBe(true);
    expect(tight.quality).toBe(80);
    expect(tight.bytes).toBeLessThan(roomy.bytes);
  });
});
