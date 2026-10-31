import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  alignFrames,
  applyQualityPassIfEnabled,
  bboxHeight,
  cleanupAlpha,
  centerOffset,
  finalizeAnimationFrames,
  footY,
  lightFringeCount,
  lockPalette,
  opaqueBounds,
  qualityPostprocessEnabled,
  recenter,
  uniqueOpaqueColors,
  type RawImage,
} from "./quality-postprocess";

function fill(w: number, h: number, paint: (x: number, y: number, px: (r: number, g: number, b: number, a?: number) => void) => void): RawImage {
  const data = Buffer.alloc(w * h * 4);
  const px = (x: number, y: number) => (r: number, g: number, b: number, a = 255) => {
    const i = (y * w + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) paint(x, y, px(x, y));
  return { data, width: w, height: h };
}

function rect(img: RawImage, x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number], a = 255) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = a;
    }
  }
}

describe("quality post-process flag", () => {
  it("is off unless the env var is exactly 1", () => {
    expect(qualityPostprocessEnabled({})).toBe(false);
    expect(qualityPostprocessEnabled({ SPRITE_QUALITY_POSTPROCESS: "0" })).toBe(false);
    expect(qualityPostprocessEnabled({ SPRITE_QUALITY_POSTPROCESS: "true" })).toBe(false);
    expect(qualityPostprocessEnabled({ SPRITE_QUALITY_POSTPROCESS: "1" })).toBe(true);
  });

  it("returns the same buffer when the flag is off", async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 4, background: { r: 200, g: 20, b: 20, alpha: 1 } },
    }).png().toBuffer();
    const out = await applyQualityPassIfEnabled(png, { pixel: true }, {});
    expect(out).toBe(png);
  });

  it("returns the same frame array when the flag is off", async () => {
    const png = await sharp({
      create: { width: 4, height: 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).png().toBuffer();
    const frames = [png, png];
    const out = await finalizeAnimationFrames(frames, { pixel: true, frameWidth: 4, frameHeight: 4 }, {});
    expect(out.frames).toBe(frames);
    expect(out.frameWidth).toBe(4);
    expect(out.frameHeight).toBe(4);
  });
});

describe("cleanupAlpha", () => {
  it("removes a white halo around a red sprite and keeps the red", () => {
    const img = fill(24, 24, () => {});
    rect(img, 8, 8, 16, 16, [180, 30, 30]);
    // Two-pixel rim. The inner rim must not be mistaken for the body colour.
    rect(img, 6, 6, 18, 8, [250, 250, 250]);
    rect(img, 6, 16, 18, 18, [250, 250, 250]);
    rect(img, 6, 8, 8, 16, [250, 250, 250]);
    rect(img, 16, 8, 18, 16, [250, 250, 250]);
    expect(lightFringeCount(img)).toBeGreaterThan(0);
    const { image, cleared } = cleanupAlpha(img);
    expect(cleared).toBeGreaterThan(0);
    expect(lightFringeCount(image)).toBe(0);
    expect(image.data[(12 * 24 + 12) * 4]).toBe(180);
    expect(image.data[(12 * 24 + 12) * 4 + 3]).toBe(255);
  });

  it("keeps a white shirt behind a dark outline", () => {
    const img = fill(24, 24, () => {});
    rect(img, 6, 6, 18, 18, [20, 16, 24]);
    rect(img, 8, 8, 16, 16, [248, 248, 248]);
    const { image } = cleanupAlpha(img);
    expect(image.data[(12 * 24 + 12) * 4 + 3]).toBe(255);
    expect(image.data[(6 * 24 + 12) * 4 + 3]).toBe(255);
  });

  it("keeps an opaque white ghost whose edge matches its body", () => {
    const img = fill(24, 24, () => {});
    rect(img, 6, 6, 18, 18, [250, 250, 250]);
    const before = opaqueBounds(img);
    const { image, cleared } = cleanupAlpha(img);
    expect(cleared).toBe(0);
    expect(opaqueBounds(image)).toEqual(before);
  });

  it("drops near-invisible dust", () => {
    const img = fill(8, 8, (x, y, px) => {
      if (x === 1 && y === 1) px(255, 255, 255, 8);
      else if (x === 4 && y === 4) px(20, 20, 20, 255);
    });
    const { image } = cleanupAlpha(img);
    expect(image.data[(1 * 8 + 1) * 4 + 3]).toBe(0);
    expect(image.data[(4 * 8 + 4) * 4 + 3]).toBe(255);
  });
});

describe("recenter", () => {
  it("moves an off-centre subject onto the canvas centre", () => {
    const img = fill(40, 40, () => {});
    rect(img, 2, 4, 10, 16, [20, 80, 200]);
    expect(centerOffset(img)).toBeGreaterThan(8);
    const out = recenter(img);
    expect(centerOffset(out)).toBeLessThan(1);
    expect(out.width).toBe(40);
    expect(out.height).toBe(40);
  });

  it("does not shift a subject that already spans the canvas", () => {
    const img = fill(20, 20, () => {});
    rect(img, 0, 2, 20, 18, [20, 80, 200]);
    const out = recenter(img);
    expect(opaqueBounds(out)).toEqual(opaqueBounds(img));
  });
});

describe("lockPalette", () => {
  it("merges near-duplicate reds across frames and keeps a distant blue", () => {
    const a = fill(6, 6, (x, y, px) => { if (x > 0 && y > 0) px(200, 30, 30); });
    const b = fill(6, 6, (x, y, px) => { if (x > 0 && y > 0) px(206, 34, 32); });
    rect(b, 0, 0, 2, 2, [20, 40, 200]);
    expect(uniqueOpaqueColors([a, b])).toBeGreaterThan(2);
    const locked = lockPalette([a, b], { threshold: 12, maxColors: 32 });
    expect(uniqueOpaqueColors(locked)).toBe(2);
    const red = locked[0].data[(3 * 6 + 3) * 4];
    const red2 = locked[1].data[(3 * 6 + 3) * 4];
    expect(red2).toBe(red);
    expect(locked[1].data[2]).toBe(200);
  });

  it("keeps a real shading step", () => {
    const img = fill(4, 4, (x, y, px) => px(x < 2 ? 180 : 140, x < 2 ? 40 : 30, x < 2 ? 40 : 30));
    const [out] = lockPalette([img], { threshold: 12, maxColors: 32 });
    expect(uniqueOpaqueColors([out])).toBe(2);
  });
});

describe("alignFrames", () => {
  it("shares a foot line and corrects a small scale drift", () => {
    const standing = fill(30, 40, () => {});
    rect(standing, 8, 10, 18, 36, [180, 40, 40]);
    const drifted = fill(36, 48, () => {});
    rect(drifted, 20, 10, 32, 39, [180, 40, 40]);
    const [a, b] = alignFrames([standing, drifted]);
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
    expect(footY(a)).toBe(footY(b));
    expect(Math.abs(bboxHeight(a) - bboxHeight(b))).toBeLessThanOrEqual(1);
  });

  it("does not scale a crouch up to the standing height", () => {
    const stand = fill(20, 40, () => {});
    rect(stand, 4, 4, 16, 36, [40, 40, 160]);
    const stand2 = fill(20, 40, () => {});
    rect(stand2, 4, 4, 16, 36, [40, 40, 160]);
    const crouch = fill(20, 40, () => {});
    rect(crouch, 4, 22, 16, 36, [40, 40, 160]);
    const aligned = alignFrames([stand, stand2, crouch]);
    const heights = aligned.map(bboxHeight);
    expect(heights[2]).toBeLessThan(heights[0] * 0.8);
    expect(footY(aligned[0])).toBe(footY(aligned[2]));
  });
});
