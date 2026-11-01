// End to end with the providers mocked: a default 8 pack where every "edit"
// came back with its own crop, scale and background problem, and every "clip"
// came back with Vidu's black top corners. After the still preparation all
// eight stills share the neutral's framing and a fully keyed ring; after the
// key, the corner clean-up and QA, no clip carries a corner or edge flag.
import { describe, expect, it } from "vitest";
import { ST_DEFAULT_LABELS } from "@/config/st-expressions";
import { ST_PIPELINE, qaThresholds } from "@/config/st-packs";
import { CHROMA_GREEN, keyChromaFrames, type Rgb } from "./chroma";
import { clearEdgeBars } from "./matte";
import { computeQa } from "./qa";
import { clearBorderBlack, measureFraming, prepareStill, subjectMask, STILL_RING_MIN } from "./still";
import type { Frame } from "./types";

const W = 360, H = 480;
const KEY = CHROMA_GREEN;
const SKIN: Rgb = [232, 192, 160];
const SHIRT: Rgb = [196, 40, 48];
const HAIR: Rgb = [70, 40, 30];

function canvas(bg: (x: number, y: number) => Rgb, w = W, h = H): Frame {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = bg(x, y);
    const o = (y * w + x) * 4;
    data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
  }
  return { data, width: w, height: h };
}

function figure(f: Frame, cx: number, top: number, s: number, mouth = 0): Frame {
  const headR = 42 * s, headCy = top + headR;
  for (let y = Math.max(0, Math.floor(top)); y < f.height; y++) {
    for (let x = 0; x < f.width; x++) {
      const dx = x - cx, dy = y - headCy;
      let c: Rgb | null = null;
      if (dx * dx + dy * dy <= headR * headR) c = y < headCy - headR * 0.4 ? HAIR : SKIN;
      else if (y >= headCy + headR * 0.8 && y < headCy + headR * 1.25 && Math.abs(dx) < 14 * s) c = SKIN;
      else if (y >= headCy + headR * 1.25 && Math.abs(dx) < 74 * s) c = SHIRT;
      else if (y >= headCy + headR * 1.25 + 8 * s && Math.abs(dx) >= 74 * s && Math.abs(dx) < 95 * s) c = SKIN;
      // the "expression": a mouth whose size differs per label
      if (c === SKIN && mouth && Math.abs(dx) < mouth && Math.abs(y - (headCy + headR * 0.45)) < 3) c = [120, 30, 40];
      if (!c) continue;
      const o = (y * f.width + x) * 4;
      f.data[o] = c[0]; f.data[o + 1] = c[1]; f.data[o + 2] = c[2]; f.data[o + 3] = 255;
    }
  }
  return f;
}

/** What the mocked edit model returns for each label: a different crop and a different backdrop fault. */
const EDITS: Record<string, () => Frame> = {
  neutral: () => figure(canvas(() => [40, 20, 70]), W / 2, 56, 1), // the upload: dark purple backdrop
  joy: () => figure(canvas((x, y) => (y < 16 || x < 16 || x >= W - 16 ? [250, 250, 250] : KEY)), W / 2 - 14, 34, 1.25, 10),
  anger: () => figure(canvas(() => KEY), W / 2 + 20, 90, 0.8, 6),
  sadness: () => figure(canvas((x, y) => (y < 12 || x < 24 || x >= W - 24 ? [170, 170, 172] : KEY)), W / 2, 60, 1.05, 4),
  surprise: () => figure(canvas((x) => (x < 20 || x >= W - 20 ? [245, 245, 245] : KEY)), W / 2 + 8, 44, 1.15, 12),
  love: () => figure(canvas((x, y) => (y < 24 ? [252, 252, 252] : KEY)), W / 2 - 24, 70, 0.92, 7),
  embarrassment: () => figure(canvas(() => KEY), W / 2 + 12, 50, 1.1, 5),
  fear: () => figure(canvas(() => KEY), W / 2 - 6, 64, 0.97, 9),
};

/** What the mocked video model returns: the still breathing a pixel, with Vidu's black top corners. */
function mockClip(still: Frame, frames = 10): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < frames; i++) {
    const data = Buffer.from(still.data);
    const shift = Math.round(Math.sin((i / frames) * Math.PI * 2));
    if (shift) {
      // breathe: move rows below the shoulders one pixel
      for (let y = still.height - 1; y > still.height * 0.4; y--) {
        data.copy(data, y * still.width * 4, (y - shift) * still.width * 4, (y - shift + 1) * still.width * 4);
      }
    }
    for (let y = 0; y < 22; y++) for (let x = 0; x < 22 - y; x++) {
      for (const xx of [x, still.width - 1 - x]) {
        const o = (y * still.width + xx) * 4;
        data[o] = 0; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = 255;
      }
    }
    out.push({ data, width: still.width, height: still.height });
  }
  return out;
}

describe("default 8 pack, providers mocked", () => {
  const neutral = prepareStill(EDITS.neutral(), KEY);
  const stills = Object.fromEntries(ST_DEFAULT_LABELS.map((label) => [
    label,
    label === "neutral" ? neutral : prepareStill(EDITS[label](), KEY, neutral.frame),
  ]));
  const ref = measureFraming(subjectMask(neutral.frame, KEY), W, H)!;

  // The mocked model zoomed joy (1.25) so far that more than 6 % of the body
  // is gone: it goes back for one redraw. The milder zooms (1.1–1.15) lose
  // less than that and are kept, aligned.
  const ZOOMED = new Set(["joy"]);

  it("every still gets a clean ring; only the over-zoomed edits are sent back for a redraw", () => {
    for (const label of ST_DEFAULT_LABELS) {
      expect(stills[label].ringRatio, label).toBeGreaterThanOrEqual(STILL_RING_MIN);
      expect(!!stills[label].cropped, label).toBe(ZOOMED.has(label));
      expect(stills[label].ok, label).toBe(!ZOOMED.has(label));
    }
  });

  it("all eight stills share the neutral's framing (no jump between expressions)", () => {
    for (const label of ST_DEFAULT_LABELS) {
      const f = measureFraming(subjectMask(stills[label].frame, KEY), W, H)!;
      expect(stills[label].frame.width, label).toBe(W);
      expect(stills[label].frame.height, label).toBe(H);
      expect(Math.abs(f.top - ref.top), `${label} top`).toBeLessThanOrEqual(2);
      expect(Math.abs(f.centreX - ref.centreX), `${label} centre`).toBeLessThanOrEqual(2);
      if (ZOOMED.has(label)) continue; // lost its sides; redrawn before any clip
      expect(Math.abs(f.left - ref.left), `${label} left`).toBeLessThanOrEqual(3);
      expect(Math.abs(f.right - ref.right), `${label} right`).toBeLessThanOrEqual(3);
    }
  });

  it("every clip comes out without corner, edge or frame flags", () => {
    const bars = qaThresholds("expressive");
    for (const label of ["neutral", "joy", "anger"] as const) {
      let frames = keyChromaFrames(mockClip(stills[label].frame), KEY);
      for (const f of frames) { clearEdgeBars(f); clearBorderBlack(f); }
      frames = frames.map((f) => f);
      const qa = computeQa(frames, { fps: ST_PIPELINE.outputFps, bytes: 400_000, band: ST_PIPELINE.stabilizeBand }, bars);
      expect(qa.metrics.corner_opaque, label).toBeLessThanOrEqual(bars.cornerOpaqueMax);
      expect(qa.flags.filter((f) => /corner|edge/.test(f)), label).toEqual([]);
      // the purple neutral backdrop did not survive as an opaque frame
      expect(frames[0].data[(5 * W + W / 2) * 4 + 3], label).toBe(0);
    }
  });
});
