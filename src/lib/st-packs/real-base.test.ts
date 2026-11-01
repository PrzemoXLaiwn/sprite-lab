// The real base that broke PR #43 on prod (job cmvygcz5t…, Nov 2026): a dark
// goth character on her own dark navy backdrop, normalised onto a light grey
// canvas. The colour flood alone kept the whole dark rectangle as "subject",
// the edits were aligned to it (anger/sadness zoomed to 1.43×) and the neutral
// clip showed a dark box in a green frame. Fixtures are the job's base, the
// Runware segmentation of it and two of its edits, at 336×450.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CHROMA_GREEN } from "./chroma";
import { isUsableReference, measureFraming, neutralReference, prepareStill, subjectCover, subjectMask } from "./still";
import type { Frame } from "./types";

const FX = join(process.cwd(), "src/lib/st-packs/__fixtures__/goth");
const KEY = CHROMA_GREEN;

async function load(name: string): Promise<Frame> {
  const { data, info } = await sharp(readFileSync(join(FX, name))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Share of a region that is key colour. */
function keyShare(f: Frame, x0: number, y0: number, w: number, h: number): number {
  let n = 0, k = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const o = (y * f.width + x) * 4;
    n++;
    if (Math.abs(f.data[o] - KEY[0]) + Math.abs(f.data[o + 1] - KEY[1]) + Math.abs(f.data[o + 2] - KEY[2]) < 60) k++;
  }
  return k / n;
}

describe("real base: dark character on a dark backdrop", () => {
  it("the colour flood alone cannot separate it (the PR #43 failure): the reference is rejected", async () => {
    const base = await load("base.webp");
    const flood = await neutralReference(base, KEY);
    expect(flood.segmented).toBe(false);
    // the dark rectangle survives as one big "subject"
    expect(subjectCover(flood.frame, KEY)).toBeGreaterThan(0.6);
    expect(flood.usable).toBe(false);
  });

  it("with the segmentation the neutral is on pure key: no dark rectangle, no hole in the jacket", async () => {
    const base = await load("base.webp");
    const cut = await load("base-cut.webp");
    const ref = await neutralReference(base, KEY, async () => cut);
    expect(ref.segmented).toBe(true);
    expect(ref.usable).toBe(true);
    // where the dark navy backdrop was (inside the grey padding, beside the head)
    expect(keyShare(ref.frame, 30, 60, 40, 60)).toBeGreaterThan(0.97);
    expect(keyShare(ref.frame, ref.frame.width - 70, 60, 40, 60)).toBeGreaterThan(0.97);
    const cover = subjectCover(ref.frame, KEY);
    expect(cover).toBeGreaterThan(0.2);
    expect(cover).toBeLessThan(0.6);
    // the black jacket at the lower left is not punched through
    expect(keyShare(ref.frame, 40, 330, 30, 30)).toBeLessThan(0.1);
  });

  it("the edits align to the segmented neutral within ±2 px and keep a clean ring", async () => {
    const base = await load("base.webp");
    const cut = await load("base-cut.webp");
    const ref = await neutralReference(base, KEY, async () => cut);
    const r = measureFraming(subjectMask(ref.frame, KEY), ref.frame.width, ref.frame.height)!;
    for (const name of ["edit-joy.webp", "edit-fear.webp"]) {
      const p = prepareStill(await load(name), KEY, ref.frame);
      expect(p.ok, name).toBe(true);
      expect(isUsableReference(p.frame, KEY), name).toBe(true);
      expect(p.align?.scale, name).toBeGreaterThan(0.97);
      expect(p.align?.scale, name).toBeLessThan(1.03);
      const f = measureFraming(subjectMask(p.frame, KEY), p.frame.width, p.frame.height)!;
      expect(Math.abs(f.top - r.top), `${name} top`).toBeLessThanOrEqual(2);
      expect(Math.abs(f.centreX - r.centreX), `${name} centre`).toBeLessThanOrEqual(2);
    }
  });
});
