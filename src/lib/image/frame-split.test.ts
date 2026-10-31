// Cutting a sheet into sprites: a direction sheet's front and back views are
// about twice as wide as its side views, and a row with one piece per cell
// must never be split further. Two sprites that genuinely touch at a thin
// point are still separated when the row is short of pieces.
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { extractFrames, isSlicedFrame } from "./animation";

type RGB = [number, number, number];
function sheet(w: number, h: number) {
  const data = Buffer.alloc(w * h * 4, 255); // white page
  const rect = (x0: number, y0: number, x1: number, y1: number, c: RGB) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; }
  };
  const png = () => sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  return { rect, png };
}
const INK: RGB = [40, 40, 60];

describe("extractFrames", () => {
  it("keeps a front / side / back / side row as four whole pieces", async () => {
    const s = sheet(1024, 400);
    s.rect(40, 60, 300, 360, INK); // front: wide
    s.rect(360, 60, 470, 360, INK); // side: narrow
    s.rect(540, 60, 800, 360, INK); // back: wide
    s.rect(870, 60, 980, 360, INK); // side
    const frames = await extractFrames(await s.png(), 4, 1);
    expect(frames.map((f) => f.width)).toEqual([260, 110, 260, 110]);
    expect(frames.some((f) => isSlicedFrame(f))).toBe(false);
  });

  it("still separates two sprites that touch at a thin point when the row is short", async () => {
    const s = sheet(1024, 400);
    s.rect(40, 60, 260, 360, INK); // sprite 1
    s.rect(260, 200, 280, 206, INK); // a thin bridge (a hand reaching over)
    s.rect(280, 60, 500, 360, INK); // sprite 2
    s.rect(580, 60, 800, 360, INK); // sprite 3
    const frames = await extractFrames(await s.png(), 4, 1);
    // Cut at the bridge: three sprites, the 20 px bridge ending up on one side
    // (a rectangle's straight edge reads as "cut", so no slice check here)
    expect(frames.length).toBe(3);
    expect(frames.every((f) => f.width >= 220 && f.width <= 240)).toBe(true);
  });
});
