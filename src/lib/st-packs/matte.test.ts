import { describe, expect, it } from "vitest";
import { closeSilhouette, defringe, estimateBackground, keyFrame, matteFrames, postMatte, temporalMedianAlpha } from "./matte";
import { drawDisc, drawRect, makeFrame, pixel } from "./test-fixtures";
import type { Frame } from "./types";

type Rgb = [number, number, number];

const BG: Rgb = [40, 200, 60];
const FG: Rgb = [220, 80, 30];

function subjectOnFlat(w = 64, h = 64, r = 18): Frame {
  const f = makeFrame(w, h, [BG[0], BG[1], BG[2], 255]);
  drawDisc(f, w / 2, h / 2, r, FG);
  return f;
}

describe("estimateBackground", () => {
  it("returns the flat border colour even with a character in the middle", () => {
    const f = subjectOnFlat();
    expect(estimateBackground(f)).toEqual(BG);
  });

  it("ignores a few noisy border pixels (median)", () => {
    const f = subjectOnFlat();
    for (let i = 0; i < 20; i++) {
      const o = i * 4;
      f.data[o] = 255;
      f.data[o + 1] = 255;
      f.data[o + 2] = 255;
    }
    expect(estimateBackground(f)).toEqual(BG);
  });

  it("uses the whole border, so a subject filling the corner patches cannot move it", () => {
    const f = makeFrame(200, 80, [255, 255, 255, 255]);
    const red: [number, number, number] = [200, 10, 10];
    drawRect(f, 0, 0, 24, 24, red);
    drawRect(f, 176, 0, 200, 24, red);
    drawRect(f, 0, 56, 24, 80, red);
    drawRect(f, 176, 56, 200, 80, red);
    expect(pixel(f, 1, 1).slice(0, 3)).toEqual(red);
    expect(estimateBackground(f)).toEqual([255, 255, 255]);
  });

  it("clamps a thick border to a tiny frame", () => {
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

  it("keeps near-white interior regions opaque and the outer background clear", () => {
    const W = 120;
    const H = 120;
    const white: Rgb = [255, 255, 255];
    const red: Rgb = [180, 20, 30];
    const hole: Rgb = [254, 254, 254];
    const skin: Rgb = [250, 230, 220];
    const ghost: Rgb = [240, 240, 240];
    const scene = (): Frame => {
      const f = makeFrame(W, H, [white[0], white[1], white[2], 255]);
      drawRect(f, 40, 28, 108, 112, red);
      drawRect(f, 58, 48, 88, 78, hole);
      drawRect(f, 48, 84, 72, 102, skin);
      // Near-background patch sitting in the real background, away from the character.
      drawRect(f, 10, 10, 24, 24, ghost);
      return f;
    };
    const source = scene();
    const keyed = keyFrame(source, white);
    // The raw key punches the interior: the highlight is gone, the skin is see-through.
    expect(pixel(keyed, 73, 63)[3]).toBe(0);
    expect(pixel(keyed, 60, 93)[3]).toBeGreaterThan(0);
    expect(pixel(keyed, 60, 93)[3]).toBeLessThan(255);
    // A flat near-white patch in the background survives defringe on its own.
    const [keyedOnly] = defringe([keyed], white);
    expect(pixel(keyedOnly, 16, 16)[3]).toBeGreaterThan(0);

    const { frames: out, background } = matteFrames([scene(), scene(), scene()]);
    expect(background).toEqual(white);
    for (const f of out) {
      expect(pixel(f, 2, 2)[3]).toBe(0);
      expect(pixel(f, 12, 60)[3]).toBe(0);
      expect(pixel(f, 16, 16)[3]).toBe(0);
      expect(pixel(f, 73, 63)).toEqual([...hole, 255]);
      expect(pixel(f, 60, 93)[3]).toBe(255);
      expect(pixel(f, 50, 36)).toEqual([...red, 255]);
    }
    // The source frame the key was measured on is not mutated.
    expect(pixel(source, 73, 63)[3]).toBe(255);
  });

  it("keys each frame from that frame's own border", () => {
    const green: Rgb = [40, 200, 60];
    const blue: Rgb = [30, 40, 220];
    const near = (bg: Rgb): Rgb => [bg[0] + 6, bg[1] + 6, bg[2] + 6];
    const framed = (bg: Rgb): Frame => {
      const f = makeFrame(72, 72, [bg[0], bg[1], bg[2], 255]);
      drawRect(f, 14, 14, 58, 58, [180, 20, 30]);
      drawRect(f, 28, 28, 44, 44, near(bg));
      return f;
    };
    const { frames: out, background } = matteFrames([framed(green), framed(blue), framed(blue)]);
    expect(background).toEqual(green);
    expect(pixel(out[0], 2, 2)[3]).toBe(0);
    expect(pixel(out[1], 2, 2)[3]).toBe(0);
    expect(pixel(out[2], 2, 2)[3]).toBe(0);
    expect(pixel(out[0], 35, 35)[3]).toBe(255);
    expect(pixel(out[1], 35, 35)[3]).toBe(255);
    expect(pixel(out[1], 35, 35).slice(0, 3)).toEqual(near(blue));
  });

  it("repairs a one-frame crack into an interior hole from the neighbouring silhouettes", () => {
    const base = (): Frame => {
      const f = makeFrame(80, 80, [255, 255, 255, 255]);
      drawRect(f, 12, 12, 68, 68, [180, 20, 30]);
      drawRect(f, 30, 30, 50, 50, [254, 254, 254]);
      return f;
    };
    const frames = [base(), base(), base()];
    // Frame 0: a 4-connected white crack from the border into the highlight,
    // so the flood can reach it. Frames 1 and 2 stay sealed.
    for (let y = 0; y <= 30; y++) drawRect(frames[0], 40, y, 41, y + 1, [255, 255, 255]);
    const { frames: out } = matteFrames(frames);
    expect(pixel(out[0], 40, 40)[3]).toBe(255);
    expect(pixel(out[1], 40, 40)[3]).toBe(255);
    expect(pixel(out[2], 40, 40)[3]).toBe(255);
    expect(pixel(out[0], 1, 1)[3]).toBe(0);
  });
});

describe("gradient backdrop", () => {
  it("clears a graded studio background the flat key would keep, and keeps enclosed light skin and grey cloth", () => {
    const W = 96;
    const H = 128;
    const f = makeFrame(W, H, [0, 0, 0, 255]);
    const tone = (x: number, y: number) => {
      const v = 110 + 130 * (x / (W - 1)) + 8 * (y / (H - 1));
      const n = ((x * 17 + y * 13) % 5) - 2;
      return Math.max(0, Math.min(255, Math.round(v + n)));
    };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = tone(x, y);
        const o = (y * W + x) * 4;
        f.data[o] = v;
        f.data[o + 1] = v;
        f.data[o + 2] = Math.min(255, v + 2);
      }
    }
    // Waist-up body reaches the bottom edge. Hair encloses the face so the
    // near-white highlight is a hole, not a path out to the backdrop.
    const sweater: Rgb = [120, 145, 185];
    const hair: Rgb = [70, 48, 32];
    const skin: Rgb = [230, 198, 176];
    const highlight: Rgb = [252, 250, 248];
    const collar: Rgb = [214, 214, 218];
    drawRect(f, 30, 48, 70, H, sweater);
    drawRect(f, 34, 36, 66, 78, hair);
    drawRect(f, 40, 44, 60, 70, skin);
    drawRect(f, 46, 52, 54, 60, highlight);
    drawRect(f, 40, 78, 58, 92, collar);

    const old = keyFrame(f, estimateBackground(f));
    closeSilhouette(old);
    expect(pixel(old, 4, 64)[3]).toBe(255);

    const { frames } = matteFrames([f, f, f]);
    const out = frames[1];
    expect(pixel(out, 4, 64)[3]).toBe(0);
    expect(pixel(out, 90, 16)[3]).toBe(0);
    expect(pixel(out, 16, 90)[3]).toBe(0);
    expect(pixel(out, 50, 56)[3]).toBe(255);
    expect(pixel(out, 50, 56).slice(0, 3)).toEqual(highlight);
    expect(pixel(out, 48, 60)[3]).toBe(255);
    expect(pixel(out, 48, 84)[3]).toBe(255);
    expect(pixel(out, 36, 100)[3]).toBe(255);
    expect(pixel(out, 2, 2)[3]).toBe(0);
  });
});

describe("enclosed backdrop", () => {
  it("clears a side gap that matches the backdrop and keeps a central light shirt", () => {
    const W = 80;
    const H = 110;
    const bg: Rgb = [200, 200, 204];
    const coat: Rgb = [24, 32, 58];
    const shirt: Rgb = [248, 248, 250];
    const f = makeFrame(W, H, [bg[0], bg[1], bg[2], 255]);
    drawRect(f, 16, 18, 64, 104, coat);
    // Two pockets of the backdrop colour, trapped between the sleeves and the shirt.
    drawRect(f, 18, 72, 28, 92, bg);
    drawRect(f, 52, 72, 62, 92, bg);
    drawRect(f, 30, 36, 50, 96, shirt);
    const { frames } = matteFrames([f, f, f]);
    const out = frames[1];
    expect(pixel(out, 22, 80)[3]).toBe(0);
    expect(pixel(out, 56, 80)[3]).toBe(0);
    expect(pixel(out, 40, 60)[3]).toBe(255);
    expect(pixel(out, 40, 60).slice(0, 3)).toEqual(shirt);
    expect(pixel(out, 4, 4)[3]).toBe(0);
  });
});

describe("closeSilhouette", () => {
  it("fills an enclosed hole and leaves the border-connected background clear", () => {
    const f = makeFrame(21, 21, [255, 255, 255, 0]);
    drawRect(f, 2, 2, 19, 19, [180, 20, 30]);
    for (let y = 8; y < 13; y++) {
      for (let x = 8; x < 13; x++) {
        const o = (y * 21 + x) * 4;
        f.data[o] = 254;
        f.data[o + 1] = 254;
        f.data[o + 2] = 254;
        f.data[o + 3] = 0;
      }
    }
    closeSilhouette(f);
    expect(pixel(f, 10, 10)[3]).toBe(255);
    expect(pixel(f, 8, 8)[3]).toBe(255);
    expect(pixel(f, 0, 0)[3]).toBe(0);
    expect(pixel(f, 10, 10).slice(0, 3)).toEqual([254, 254, 254]);
  });

  it("keeps partial alpha on the outer edge of a keyed subject", () => {
    const keyed = keyFrame(subjectOnFlat(), BG);
    closeSilhouette(keyed);
    expect(pixel(keyed, 32, 32)[3]).toBe(255);
    expect(pixel(keyed, 1, 1)[3]).toBe(0);
    let soft = 0;
    for (let y = 0; y < keyed.height; y++) {
      for (let x = 0; x < keyed.width; x++) {
        const a = pixel(keyed, x, y)[3];
        if (a > 0 && a < 255) soft++;
      }
    }
    expect(soft).toBeGreaterThan(0);
  });
});
