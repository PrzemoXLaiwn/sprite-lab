import { describe, expect, it } from "vitest";
import { defringe, estimateBackground, keyFrame, matteFrames, postMatte, temporalMedianAlpha } from "./matte";
import { drawDisc, makeFrame, pixel } from "./test-fixtures";
import type { Frame } from "./types";

const BG: [number, number, number] = [40, 200, 60];
const FG: [number, number, number] = [220, 80, 30];

function subjectOnFlat(w = 64, h = 64, r = 18): Frame {
  const f = makeFrame(w, h, [BG[0], BG[1], BG[2], 255]);
  drawDisc(f, w / 2, h / 2, r, FG);
  return f;
}

describe("estimateBackground", () => {
  it("returns the flat corner colour even with a character in the middle", () => {
    const f = subjectOnFlat();
    expect(estimateBackground(f)).toEqual(BG);
  });

  it("ignores a few noisy corner pixels (median)", () => {
    const f = subjectOnFlat();
    for (let i = 0; i < 20; i++) {
      const o = i * 4;
      f.data[o] = 255;
      f.data[o + 1] = 255;
      f.data[o + 2] = 255;
    }
    expect(estimateBackground(f)).toEqual(BG);
  });

  it("clamps the patch to tiny frames", () => {
    const f = makeFrame(8, 8, [1, 2, 3, 255]);
    expect(estimateBackground(f, 24)).toEqual([1, 2, 3]);
  });
});

describe("keyFrame", () => {
  it("makes the flat background transparent and keeps the subject opaque", () => {
    const f = subjectOnFlat();
    const keyed = keyFrame(f, BG);
    expect(pixel(keyed, 1, 1)[3]).toBe(0);
    expect(pixel(keyed, 62, 62)[3]).toBe(0);
    expect(pixel(keyed, 32, 32)[3]).toBe(255);
    // RGB is untouched by the key
    expect(pixel(keyed, 32, 32).slice(0, 3)).toEqual(FG);
    // the input is not mutated
    expect(pixel(f, 1, 1)[3]).toBe(255);
  });

  it("ramps alpha between hard and soft", () => {
    const f = makeFrame(1, 1, [BG[0] + 30, BG[1], BG[2], 255]); // distance 30
    const a = pixel(keyFrame(f, BG, { hard: 20, soft: 40 }), 0, 0)[3];
    expect(a).toBeGreaterThan(100);
    expect(a).toBeLessThan(160);
  });

  it("scales an existing alpha instead of replacing it", () => {
    const f = makeFrame(1, 1, [255, 255, 255, 100]);
    expect(pixel(keyFrame(f, BG), 0, 0)[3]).toBe(100);
  });
});

describe("temporalMedianAlpha", () => {
  it("fills a one-frame hole in the alpha from its neighbours", () => {
    const frames = [0, 1, 2, 3].map(() => {
      const f = makeFrame(32, 32);
      drawDisc(f, 16, 16, 10, FG);
      return f;
    });
    // frame 2 flickers: a hole in the middle of the disc
    for (let y = 12; y < 20; y++) for (let x = 12; x < 20; x++) frames[2].data[(y * 32 + x) * 4 + 3] = 0;
    expect(pixel(frames[2], 16, 16)[3]).toBe(0);

    const fixed = temporalMedianAlpha(frames);
    expect(pixel(fixed[2], 16, 16)[3]).toBe(255);
    expect(pixel(fixed[2], 1, 1)[3]).toBe(0);
    // the input is not mutated
    expect(pixel(frames[2], 16, 16)[3]).toBe(0);
  });

  it("wraps circularly so the first and last frames also get a median", () => {
    const frames = [0, 1, 2].map(() => makeFrame(2, 2, [0, 0, 0, 255]));
    frames[0].data[3] = 0; // flicker in frame 0 only
    const fixed = temporalMedianAlpha(frames);
    expect(fixed[0].data[3]).toBe(255);
  });

  it("returns copies for fewer than three frames", () => {
    const frames = [makeFrame(2, 2, [1, 1, 1, 7]), makeFrame(2, 2, [1, 1, 1, 9])];
    const out = temporalMedianAlpha(frames);
    expect(out[0].data[3]).toBe(7);
    expect(out[1].data[3]).toBe(9);
    expect(Object.is(out[0].data, frames[0].data)).toBe(false);
  });
});

describe("defringe", () => {
  it("un-mixes the background from a 50 % edge pixel and recovers the foreground colour", () => {
    // A 5×5 opaque foreground block with a 50 %-mixed edge pixel in the middle so
    // erosion keeps a neighbourhood around it.
    const f = makeFrame(9, 9);
    for (let y = 1; y < 8; y++) {
      for (let x = 1; x < 8; x++) {
        const o = (y * 9 + x) * 4;
        f.data[o] = FG[0];
        f.data[o + 1] = FG[1];
        f.data[o + 2] = FG[2];
        f.data[o + 3] = 255;
      }
    }
    const o = (4 * 9 + 4) * 4;
    for (let c = 0; c < 3; c++) f.data[o + c] = Math.round(0.5 * FG[c] + 0.5 * BG[c]);
    f.data[o + 3] = 128;

    const [out] = defringe([f], BG);
    const p = pixel(out, 4, 4);
    for (let c = 0; c < 3; c++) expect(Math.abs(p[c] - FG[c])).toBeLessThanOrEqual(3);
  });

  it("erodes the alpha by a pixel and zeroes near-transparent remainders", () => {
    const f = makeFrame(16, 16);
    for (let y = 4; y < 12; y++) {
      for (let x = 4; x < 12; x++) {
        const o = (y * 16 + x) * 4;
        f.data[o + 3] = 255;
      }
    }
    // a lone speck
    f.data[(1 * 16 + 1) * 4 + 3] = 6;
    const [out] = defringe([f], BG);
    expect(pixel(out, 4, 4)[3]).toBeLessThan(255); // the outer ring is eroded + blurred
    expect(pixel(out, 7, 7)[3]).toBe(255); // the core is intact
    expect(pixel(out, 1, 1)[3]).toBe(0);
    expect(pixel(out, 2, 2)[3]).toBe(0);
    // the input is not mutated
    expect(pixel(f, 4, 4)[3]).toBe(255);
  });
});

describe("matteFrames / postMatte", () => {
  it("keys a flat-background clip to a transparent, un-haloed subject", () => {
    const frames = [0, 1, 2, 3].map(() => subjectOnFlat(64, 64, 18));
    const { frames: out, background } = matteFrames(frames);
    expect(background).toEqual(BG);
    expect(out).toHaveLength(4);
    for (const f of out) {
      expect(pixel(f, 2, 2)[3]).toBe(0);
      expect(pixel(f, 32, 32)).toEqual([...FG, 255]);
    }
    // every surviving edge pixel was pushed away from the background tint (less green, more red than the raw mix)
    let edgePixels = 0;
    for (let i = 0; i < out.length; i++) {
      const f = out[i];
      const raw = frames[i];
      for (let o = 0; o < f.data.length; o += 4) {
        const a = f.data[o + 3];
        if (a === 0 || a === 255) continue;
        edgePixels++;
        expect(f.data[o + 1]).toBeLessThanOrEqual(raw.data[o + 1]);
        expect(f.data[o]).toBeGreaterThanOrEqual(raw.data[o]);
      }
    }
    expect(edgePixels).toBeGreaterThan(0);
  });

  it("postMatte keeps already-matted frames and only cleans the edges", () => {
    const frames = [0, 1, 2].map(() => {
      const f = makeFrame(32, 32);
      drawDisc(f, 16, 16, 10, FG);
      return f;
    });
    const out = postMatte(frames, BG);
    expect(out).toHaveLength(3);
    expect(pixel(out[1], 16, 16)).toEqual([...FG, 255]);
    expect(pixel(out[1], 1, 1)[3]).toBe(0);
  });

  it("handles an empty input", () => {
    expect(matteFrames([])).toEqual({ frames: [], background: [0, 0, 0] });
  });
});
