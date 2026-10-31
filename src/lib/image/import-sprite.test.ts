import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { importSprite, isUploadedPrompt } from "./import-sprite";

async function png(w: number, h: number, draw: (x: number, y: number) => [number, number, number, number]) {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(draw(x, y), (y * w + x) * 4);
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}
const alphaAt = async (buf: Buffer, x: number, y: number) => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[(y * info.width + x) * 4 + 3];
};

describe("importSprite", () => {
  it("keeps transparency, trims and scales small pixel art by a whole number", async () => {
    // 32×32 canvas, a 10×16 red figure with a dark outline, the rest transparent
    const input = await png(32, 32, (x, y) => (x >= 11 && x < 21 && y >= 8 && y < 24 ? (x === 11 || x === 20 ? [20, 20, 20, 255] : [200, 30, 30, 255]) : [0, 0, 0, 0]));
    const out = await importSprite(input);
    expect(out.pixel).toBe(true);
    expect(out.background).toBe("kept");
    expect(out.width % 18).toBe(0); // side = ceil(16 × 1.12) = 18, scaled ×k
    expect(out.width).toBeLessThanOrEqual(1024);
    expect(await alphaAt(out.png, 0, 0)).toBe(0);
  });

  it("removes a plain white background", async () => {
    const input = await png(200, 200, (x, y) => (x > 60 && x < 140 && y > 40 && y < 170 ? [40, 90, 160, 255] : [255, 255, 255, 255]));
    const out = await importSprite(input);
    expect(out.background).toBe("keyed");
    expect(await alphaAt(out.png, 1, 1)).toBe(0);
  });

  it("refuses tiny images", async () => {
    await expect(importSprite(await png(4, 4, () => [255, 0, 0, 255]))).rejects.toThrow(/too small/);
  });

  it("marks uploads", () => {
    expect(isUploadedPrompt("[upload] my knight")).toBe(true);
    expect(isUploadedPrompt("A 2D video game sprite of a knight")).toBe(false);
  });
});
