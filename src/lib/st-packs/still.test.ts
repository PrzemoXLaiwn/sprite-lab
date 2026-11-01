// Regression tests for the three ST Packs bugs found on prod (Nov 2026):
//  1. framing jumped between expressions (each edit cropped/scaled differently)
//  2. white/grey bands and the neutral's own dark backdrop survived the key
//  3. Vidu painted near-black pixels into the top corners of every clip
import { describe, expect, it } from "vitest";
import { CHROMA_GREEN, type Rgb } from "./chroma";
import {
  alignStill, backdropRingRatio, backgroundToKey, borderKeyRatio, clearBorderBlack, measureFraming,
  prepareStill, subjectMask, STILL_RING_MIN,
} from "./still";
import type { Frame } from "./types";

const W = 448, H = 600;
const KEY = CHROMA_GREEN;
const SKIN: Rgb = [232, 192, 160];
const SHIRT: Rgb = [196, 40, 48];
const HAIR: Rgb = [70, 40, 30];

function canvas(w: number, h: number, bg: (x: number, y: number) => Rgb): Frame {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = bg(x, y);
    const o = (y * w + x) * 4;
    data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
  }
  return { data, width: w, height: h };
}

/** A waist-up figure: hair cap, head, neck, torso to the bottom edge, arms. `s` scales it about the head top. */
function drawFigure(f: Frame, cx: number, top: number, s: number): void {
  const put = (x: number, y: number, c: Rgb) => {
    if (x < 0 || y < 0 || x >= f.width || y >= f.height) return;
    const o = (y * f.width + x) * 4;
    f.data[o] = c[0]; f.data[o + 1] = c[1]; f.data[o + 2] = c[2]; f.data[o + 3] = 255;
  };
  const headR = 52 * s;
  const headCy = top + headR;
  for (let y = Math.max(0, Math.floor(top)); y < f.height; y++) {
    for (let x = 0; x < f.width; x++) {
      const dx = x - cx, dy = y - headCy;
      if (dx * dx + dy * dy <= headR * headR) { put(x, y, y < headCy - headR * 0.4 ? HAIR : SKIN); continue; }
      const neckTop = headCy + headR * 0.8, shoulders = headCy + headR * 1.25;
      if (y >= neckTop && y < shoulders && Math.abs(dx) < 18 * s) { put(x, y, SKIN); continue; }
      if (y >= shoulders && Math.abs(dx) < 92 * s) { put(x, y, SHIRT); continue; }
      if (y >= shoulders + 10 * s && Math.abs(dx) >= 92 * s && Math.abs(dx) < 118 * s) put(x, y, SKIN); // arms
    }
  }
}

function figureOn(bg: (x: number, y: number) => Rgb, cx = W / 2, top = 70, s = 1, w = W, h = H): Frame {
  const f = canvas(w, h, bg);
  drawFigure(f, cx, top, s);
  return f;
}

function countColour(f: Frame, c: Rgb, tol = 30): number {
  let n = 0;
  for (let o = 0; o < f.data.length; o += 4) {
    if (Math.abs(f.data[o] - c[0]) + Math.abs(f.data[o + 1] - c[1]) + Math.abs(f.data[o + 2] - c[2]) <= tol) n++;
  }
  return n;
}

const green = (): Rgb => KEY;
const purple = (): Rgb => [92, 38, 140];

describe("backgroundToKey (bug 2: bands and dark backdrops)", () => {
  const cases: Array<[string, (x: number, y: number) => Rgb]> = [
    ["white band", (x, y) => (x < 22 || y < 22 || x >= W - 22 ? [250, 250, 250] : KEY)],
    ["grey band", (x, y) => (x < 30 || y < 18 || x >= W - 30 ? [168, 170, 172] : KEY)],
    ["dark gradient", (_x, y) => [Math.round(14 + (y / H) * 30), Math.round(8 + (y / H) * 18), Math.round(30 + (y / H) * 50)]],
    ["purple backdrop", purple],
    ["light grey studio", () => [214, 214, 216]],
  ];

  for (const [name, bg] of cases) {
    it(`${name}: the ring becomes key and the character is untouched`, () => {
      const still = figureOn(bg);
      const shirt = countColour(still, SHIRT);
      const skin = countColour(still, SKIN);
      const out = backgroundToKey(still, KEY);
      expect(backdropRingRatio(out, KEY)).toBeGreaterThanOrEqual(STILL_RING_MIN);
      expect(borderKeyRatio(out, KEY)).toBeGreaterThan(0.75); // the bottom ring is the torso
      expect(countColour(out, SHIRT)).toBe(shirt);
      expect(countColour(out, SKIN)).toBeGreaterThanOrEqual(skin * 0.98);
      // nothing of the old backdrop survives anywhere
      expect(countColour(out, bg(5, 5), 12)).toBeLessThan(0.002 * W * H);
    });
  }

  it("a grey pocket enclosed by an arm only goes when it is key-coloured", () => {
    const still = figureOn(green);
    const out = backgroundToKey(still, KEY);
    // the green gap between torso and arm stays key
    const o = (300 * W + Math.round(W / 2 + 92 * 1 - 1)) * 4;
    expect(out.data[o]).toBe(SHIRT[0]); // the torso edge itself is untouched
  });

  it("the gate fails a busy scene the flood cannot reach", () => {
    const scene = figureOn((x, y) => [(x * 37 + y * 11) & 255, (x * 5 + y * 53) & 255, (x * 29 + y * 17) & 255]);
    const prepared = prepareStill(scene, KEY);
    expect(prepared.ok).toBe(false);
  });
});

describe("alignStill (bug 1: framing jumps between expressions)", () => {
  const base = backgroundToKey(figureOn(purple), KEY);
  const ref = measureFraming(subjectMask(base, KEY), W, H)!;

  const edits: Array<[string, Frame]> = [
    ["zoomed in, cut at the chest", figureOn(green, W / 2 - 20, 40, 1.3)],
    ["zoomed out, shows more of the body", figureOn(green, W / 2 + 25, 120, 0.78)],
    ["same scale, shifted", figureOn(green, W / 2 + 30, 95, 1)],
    ["different canvas size", figureOn(green, 300, 60, 1.2, 600, 800)],
    ["white band and a new crop", figureOn((x, y) => (y < 20 || x < 20 || x >= W - 20 ? [250, 250, 250] : KEY), W / 2 - 10, 50, 1.15)],
  ];

  for (const [name, edit] of edits) {
    it(`${name}: head top, width and centre land within ±2 px of the reference`, () => {
      const prepared = prepareStill(edit, KEY, base);
      expect(prepared.ok).toBe(true);
      expect(prepared.frame.width).toBe(W);
      expect(prepared.frame.height).toBe(H);
      const got = measureFraming(subjectMask(prepared.frame, KEY), W, H)!;
      expect(Math.abs(got.top - ref.top)).toBeLessThanOrEqual(2);
      expect(Math.abs(got.upperWidth - ref.upperWidth)).toBeLessThanOrEqual(2);
      expect(Math.abs(got.centreX - ref.centreX)).toBeLessThanOrEqual(2);
      // the whole silhouette sits in the same place (arms included)
      expect(Math.abs(got.left - ref.left)).toBeLessThanOrEqual(3);
      expect(Math.abs(got.right - ref.right)).toBeLessThanOrEqual(3);
    });
  }

  it("an already aligned edit is not resampled (keeps its sharpness)", () => {
    const edit = backgroundToKey(figureOn(green), KEY);
    const a = alignStill(base, edit, KEY);
    expect(a.moved).toBe(false);
    expect(a.frame).toBe(edit);
  });

  it("an edit with no character is reported, not warped", () => {
    const empty = canvas(W, H, green);
    expect(alignStill(base, empty, KEY).failed).toBe(true);
    expect(prepareStill(empty, KEY, base).ok).toBe(false);
  });
});

describe("clearBorderBlack (bug 3: black corners in Vidu clips)", () => {
  function viduFrame(): Frame {
    const w = 360, h = 480;
    // after the key: transparent backdrop, opaque character
    const f = canvas(w, h, () => [0, 0, 0]);
    for (let o = 0; o < f.data.length; o += 4) f.data[o + 3] = 0;
    drawFigure(f, w / 2, 60, 0.8);
    // Vidu's black wedges in the top corners, fully opaque
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30 - y; x++) {
      for (const xx of [x, w - 1 - x]) {
        const o = (y * w + xx) * 4;
        f.data[o] = 0; f.data[o + 1] = 0; f.data[o + 2] = 3; f.data[o + 3] = 255;
      }
    }
    // a black coat sleeve touching the right edge mid-frame must stay
    for (let y = 240; y < 320; y++) for (let x = w - 60; x < w; x++) {
      const o = (y * w + x) * 4;
      f.data[o] = 12; f.data[o + 1] = 12; f.data[o + 2] = 16; f.data[o + 3] = 255;
    }
    return f;
  }
  const opaqueIn = (f: Frame, x0: number, y0: number, size: number) => {
    let n = 0;
    for (let y = y0; y < y0 + size; y++) for (let x = x0; x < x0 + size; x++) if (f.data[(y * f.width + x) * 4 + 3] > 128) n++;
    return n / (size * size);
  };

  it("clears the black corner wedges", () => {
    const f = viduFrame();
    expect(opaqueIn(f, 0, 0, 40)).toBeGreaterThan(0.2);
    clearBorderBlack(f);
    expect(opaqueIn(f, 0, 0, 40)).toBe(0);
    expect(opaqueIn(f, f.width - 40, 0, 40)).toBe(0);
  });

  it("keeps a dark sleeve that reaches the side edge away from the corners, and the hair", () => {
    const f = viduFrame();
    clearBorderBlack(f);
    expect(opaqueIn(f, f.width - 40, 250, 40)).toBe(1);
    expect(countColour(f, HAIR, 4)).toBeGreaterThan(0);
  });
});
