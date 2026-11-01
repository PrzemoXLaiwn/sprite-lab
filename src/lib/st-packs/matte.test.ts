import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { clearEdgeBars, closeSilhouette, conformAlphaCoverage, defringe, estimateBackground, keyFrame, matteFrames, postMatte, sealInteriorHoles, temporalMedianAlpha } from "./matte";
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
  it("clears a mild flat-grey field and keeps a light coat the loose key would enter", () => {
    const W = 96;
    const H = 128;
    const bg: Rgb = [232, 232, 234];
    const f = makeFrame(W, H, [bg[0], bg[1], bg[2], 255]);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const n = ((x * 3 + y) % 5) - 2;
        const o = (y * W + x) * 4;
        f.data[o] = bg[0] + n;
        f.data[o + 1] = bg[1] + n;
        f.data[o + 2] = bg[2] + n;
      }
    }
    const coat: Rgb = [196, 198, 202];
    const shirt: Rgb = [250, 250, 252];
    drawRect(f, 28, 36, 70, H, coat);
    drawRect(f, 40, 48, 58, 100, shirt);
    const { frames } = matteFrames([f, f, f]);
    const out = frames[1];
    expect(pixel(out, 4, 64)[3]).toBe(0);
    expect(pixel(out, 90, 16)[3]).toBe(0);
    expect(pixel(out, 32, 80)[3]).toBe(255);
    expect(pixel(out, 48, 70)[3]).toBe(255);
    expect(pixel(out, 48, 70).slice(0, 3)).toEqual(shirt);
  });
});

describe("enclosed backdrop", () => {
  it("keeps a trapped side gap opaque when the border cannot reach it, and keeps the shirt", () => {
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
    expect(pixel(out, 22, 80)[3]).toBe(255);
    expect(pixel(out, 56, 80)[3]).toBe(255);
    expect(pixel(out, 40, 60)[3]).toBe(255);
    expect(pixel(out, 40, 60).slice(0, 3)).toEqual(shirt);
    expect(pixel(out, 4, 4)[3]).toBe(0);
  });

  it("keeps a white shirt on a light ground fully opaque and still clears the side gaps", () => {
    const W = 160;
    const H = 210;
    const bg: Rgb = [246, 246, 248];
    const coat: Rgb = [22, 28, 52];
    const shirt: Rgb = [254, 254, 255];
    const scene = (): Frame => {
      const f = makeFrame(W, H, [bg[0], bg[1], bg[2], 255]);
      // Torso, arms, and shoulders. The shoulders close the gaps so the flood
      // cannot walk into them from the border.
      drawRect(f, 48, 36, 112, 200, coat);
      drawRect(f, 18, 48, 48, 78, coat);
      drawRect(f, 112, 48, 142, 78, coat);
      drawRect(f, 18, 78, 40, 168, coat);
      drawRect(f, 120, 78, 142, 168, coat);
      // Backdrop trapped between each arm and the torso.
      drawRect(f, 40, 86, 48, 150, bg);
      drawRect(f, 112, 86, 120, 150, bg);
      // Shirt, plus a lateral white panel that is still clothing (not a gap).
      drawRect(f, 58, 52, 102, 168, shirt);
      drawRect(f, 50, 90, 58, 140, shirt);
      return f;
    };
    const base = scene();
    const flickered = scene();
    // A fold on a later frame matches the ground exactly. It must not open a hole.
    drawRect(flickered, 70, 80, 90, 110, bg);
    const shifted = scene();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const src = Math.min(W - 1, x + 2);
        const so = (y * W + src) * 4;
        const o = (y * W + x) * 4;
        shifted.data[o] = base.data[so];
        shifted.data[o + 1] = base.data[so + 1];
        shifted.data[o + 2] = base.data[so + 2];
        shifted.data[o + 3] = base.data[so + 3];
      }
    }
    const { frames } = matteFrames([base, flickered, shifted]);
    let shirtPx = 0;
    let shirtOpaque = 0;
    for (let y = 52; y < 168; y++) {
      for (let x = 58; x < 102; x++) {
        shirtPx++;
        if (pixel(frames[0], x, y)[3] === 255) shirtOpaque++;
      }
    }
    expect(shirtOpaque / shirtPx).toBeGreaterThan(0.99);
    // The flickered patch and the shifted shirt stay solid. No per-frame blotches.
    expect(pixel(frames[1], 80, 95)[3]).toBe(255);
    expect(pixel(frames[2], 78, 100)[3]).toBe(255);
    expect(pixel(frames[0], 44, 110)[3]).toBe(0);
    expect(pixel(frames[0], 116, 110)[3]).toBe(0);
    expect(pixel(frames[1], 44, 110)[3]).toBe(0);
    expect(pixel(frames[2], 42, 110)[3]).toBe(0);
    expect(pixel(frames[0], 4, 4)[3]).toBe(0);
  });

  it("keeps the shirt opaque when a later frame cracks the outline open to the backdrop", () => {
    const W = 160;
    const H = 210;
    const bg: Rgb = [246, 246, 248];
    const coat: Rgb = [22, 28, 52];
    const shirt: Rgb = [254, 254, 255];
    const scene = (): Frame => {
      const f = makeFrame(W, H, [bg[0], bg[1], bg[2], 255]);
      drawRect(f, 48, 36, 112, 200, coat);
      drawRect(f, 58, 52, 102, 168, shirt);
      return f;
    };
    const cracked = scene();
    drawRect(cracked, 0, 100, 80, 104, bg);
    const { frames } = matteFrames([scene(), cracked, scene()]);
    expect(pixel(frames[1], 80, 102)[3]).toBe(255);
    expect(pixel(frames[1], 4, 102)[3]).toBe(0);
    expect(pixel(frames[0], 80, 102)[3]).toBe(255);
  });
});

describe("shipped-frame repair", () => {
  it("fills interior holes and replaces a frame that kept a backdrop slab", () => {
    const base = subjectOnFlat(80, 80, 24);
    const { frames } = matteFrames([base, base, base, base]);
    const shirt = frames[1];
    const o = (40 * 80 + 40) * 4;
    shirt.data[o + 3] = 0;
    shirt.data[o + 1 * 4 + 3] = 0;
    sealInteriorHoles(frames);
    expect(shirt.data[o + 3]).toBe(255);

    const slab = frames[2];
    for (let y = 0; y < 80; y++) {
      for (let x = 0; x < 30; x++) slab.data[(y * 80 + x) * 4 + 3] = 255;
    }
    const replaced = conformAlphaCoverage(frames);
    expect(replaced).toBe(1);
    expect(pixel(slab, 2, 2)[3]).toBe(0);
    expect(pixel(slab, 40, 40)[3]).toBe(255);
  });
});

async function loadFixture(name: string): Promise<Frame> {
  const png = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", name));
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function interiorTransparent(frame: Frame): number {
  const { data, width, height } = frame;
  const n = width * height;
  const open = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 128) open[i] = 1;
  const seen = new Uint8Array(n);
  const q = new Int32Array(n);
  let qt = 0;
  const push = (i: number) => { if (!open[i] || seen[i]) return; seen[i] = 1; q[qt++] = i; };
  for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1); }
  let qh = 0;
  while (qh < qt) {
    const i = q[qh++];
    const x = i % width;
    if (x > 0) push(i - 1);
    if (x + 1 < width) push(i + 1);
    if (i >= width) push(i - width);
    if (i + width < n) push(i + width);
  }
  let c = 0;
  for (let i = 0; i < n; i++) if (open[i] && !seen[i]) c++;
  return c;
}

describe("production packs", () => {
  it("keys the man's near-white ground when the coat owns the bottom edge", async () => {
    const shipped = await loadFixture("man-joy-unkeyed-f8.png");
    let opaque = 0;
    for (let i = 3; i < shipped.data.length; i += 4) if (shipped.data[i] > 127) opaque++;
    expect(opaque / (shipped.width * shipped.height)).toBeGreaterThan(0.65);
    const restored = {
      data: Buffer.from(shipped.data),
      width: shipped.width,
      height: shipped.height,
    };
    for (let i = 0; i < restored.data.length; i += 4) {
      if (restored.data[i + 3] < 128) {
        restored.data[i] = 255;
        restored.data[i + 1] = 253;
        restored.data[i + 2] = 255;
        restored.data[i + 3] = 255;
      }
    }
    const { frames } = matteFrames([restored, restored, restored]);
    const out = frames[1];
    let left = 0;
    for (let i = 3; i < out.data.length; i += 4) if (out.data[i] > 127) left++;
    expect(left / (out.width * out.height)).toBeLessThanOrEqual(0.65);
    expect(pixel(out, 0, 0)[3]).toBe(0);
    expect(pixel(out, 100, 100)[3]).toBe(0);
    expect(pixel(out, 250, 500)[3]).toBe(255);
  });

  it("seals the woman's interior shirt holes from the shipped webp frame", async () => {
    const frame = await loadFixture("woman-anger-f15.png");
    const before = interiorTransparent(frame);
    expect(before).toBeGreaterThan(1000);
    sealInteriorHoles([frame]);
    expect(interiorTransparent(frame)).toBe(0);
  });

  it("drops the man's joy frame that kept a white backdrop slab", async () => {
    const frames = await Promise.all(["man-joy-f15.png", "man-joy-f16.png", "man-joy-f17.png"].map(loadFixture));
    const area = frames[0].width * frames[0].height;
    const counts = frames.map((f) => {
      let n = 0;
      for (let i = 3; i < f.data.length; i += 4) if (f.data[i] > 127) n++;
      return n;
    });
    expect(Math.abs(counts[1] - counts[0]) / area).toBeGreaterThan(0.03);
    let whiteKept = 0;
    for (let i = 0; i < area; i++) {
      const o = i * 4;
      if (frames[1].data[o + 3] > 200 && frames[0].data[o + 3] < 16 && frames[1].data[o] > 240 && frames[1].data[o + 1] > 240) whiteKept++;
    }
    expect(whiteKept).toBeGreaterThan(1000);
    expect(conformAlphaCoverage(frames)).toBe(1);
    expect(Math.abs(opaqueOf(frames[1]) - opaqueOf(frames[0])) / area).toBeLessThanOrEqual(0.03);
  });
});

function opaqueOf(frame: Frame): number {
  let n = 0;
  for (let i = 3; i < frame.data.length; i += 4) if (frame.data[i] > 127) n++;
  return n;
}

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

describe("clearEdgeBars", () => {
  it("clears a near-black bar on the bottom edge and leaves the figure", () => {
    const f = makeFrame(40, 40, [180, 170, 160, 255]);
    for (let y = 32; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        const o = (y * 40 + x) * 4;
        f.data[o] = 4;
        f.data[o + 1] = 4;
        f.data[o + 2] = 6;
        f.data[o + 3] = 255;
      }
    }
    // A dark patch that does not span the frame stays opaque.
    f.data[4] = 8;
    f.data[5] = 8;
    f.data[6] = 8;
    f.data[7] = 255;
    clearEdgeBars(f);
    expect(pixel(f, 20, 36)[3]).toBe(0);
    expect(pixel(f, 20, 20)[3]).toBe(255);
    expect(pixel(f, 1, 0)[3]).toBe(255);
  });
});
