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

/**
 * Studio still: darker flat-ish border, lighter toward the character, plus a
 * soft shadow on the left. The flat key stops where the gradient has moved
 * ~40 levels off the border colour and the hole fill then paints that whole
 * unreached region opaque — the blob in production. Skin, an enclosed white
 * shirt and a light-grey outer panel must stay solid.
 */
function studioStill(): {
  frame: Frame;
  blob: [number, number];
  skin: [number, number];
  shirt: [number, number];
  cloth: [number, number];
  outside: [number, number];
} {
  const W = 180;
  const H = 220;
  const f = makeFrame(W, H, [0, 0, 0, 255]);
  const cx = 100;
  const cy = 100;
  const sigma = 78;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      // Coding noise, the size of a soft video frame, must not stall the walk.
      let l = 186 + 52 * Math.exp(-d2 / (2 * sigma * sigma)) + ((x * 13 + y * 7) % 11) - 5;
      // Contact shadow to the left of the torso: a short ramp, then flat.
      if (y > 80 && y < 190) {
        if (x < 48) l -= 22;
        else if (x < 66) l -= ((66 - x) / 18) * 22;
      }
      const v = Math.max(0, Math.min(255, Math.round(l)));
      const o = (y * W + x) * 4;
      f.data[o] = v;
      f.data[o + 1] = v;
      f.data[o + 2] = Math.min(255, v + 1);
      f.data[o + 3] = 255;
    }
  }
  drawRect(f, 78, 96, 128, 210, [136, 164, 196]);
  // Light-grey outer panel. Its right edge is the silhouette against the gradient.
  drawRect(f, 124, 108, 146, 188, [198, 200, 204]);
  drawRect(f, 92, 124, 114, 168, [250, 250, 248]);
  drawDisc(f, 100, 78, 26, [244, 216, 200]);
  return {
    frame: f,
    blob: [70, 90],
    skin: [100, 78],
    shirt: [102, 146],
    cloth: [135, 148],
    outside: [100, 44],
  };
}

describe("gradient backgrounds", () => {
  it("clears a light gradient and shadow the flat key leaves stuck to the character", () => {
    const scene = studioStill();
    const source = scene.frame;
    const bg = estimateBackground(source);
    const keyed = keyFrame(source, bg);
    closeSilhouette(keyed);
    // Root cause: the bright patch is too far from the border colour to be
    // keyed, so the hole fill turns it into foreground.
    expect(pixel(keyed, scene.blob[0], scene.blob[1])[3]).toBe(255);
    expect(pixel(source, scene.blob[0], scene.blob[1])[3]).toBe(255);

    const { frames: out } = matteFrames([studioStill().frame, studioStill().frame, studioStill().frame]);
    const f = out[1];
    expect(pixel(f, scene.blob[0], scene.blob[1])[3]).toBe(0);
    expect(pixel(f, 36, 120)[3]).toBe(0); // the flat part of the contact shadow
    expect(pixel(f, scene.outside[0], scene.outside[1])[3]).toBe(0);
    expect(pixel(f, 2, 2)[3]).toBe(0);
    expect(pixel(f, scene.skin[0], scene.skin[1])[3]).toBe(255);
    expect(pixel(f, scene.skin[0], scene.skin[1]).slice(0, 3)).toEqual([244, 216, 200]);
    expect(pixel(f, scene.shirt[0], scene.shirt[1])[3]).toBe(255);
    expect(pixel(f, scene.shirt[0], scene.shirt[1]).slice(0, 3)).toEqual([250, 250, 248]);
    expect(pixel(f, scene.cloth[0], scene.cloth[1])[3]).toBe(255);
    expect(pixel(f, scene.cloth[0], scene.cloth[1]).slice(0, 3)).toEqual([198, 200, 204]);
    expect(pixel(f, 100, 170)[3]).toBe(255); // blue sweater
  });

  it("keeps an anime outline, pale skin and white hair opaque on the same gradient", () => {
    const W = 140;
    const H = 180;
    const paint = (): Frame => {
      const f = makeFrame(W, H, [0, 0, 0, 255]);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const d = Math.hypot(x - 70, y - 90);
          const l = Math.round(190 + 46 * Math.exp(-(d * d) / (2 * 64 * 64)));
          const o = (y * W + x) * 4;
          f.data[o] = l;
          f.data[o + 1] = l;
          f.data[o + 2] = l;
          f.data[o + 3] = 255;
        }
      }
      drawRect(f, 44, 48, 100, 168, [24, 26, 34]);
      drawRect(f, 48, 52, 96, 164, [255, 232, 220]);
      drawRect(f, 56, 96, 88, 150, [247, 247, 245]);
      drawDisc(f, 72, 46, 22, [24, 26, 34]);
      drawDisc(f, 72, 46, 16, [250, 250, 248]);
      return f;
    };
    const { frames: out } = matteFrames([paint(), paint(), paint()]);
    const f = out[1];
    expect(pixel(f, 2, 2)[3]).toBe(0);
    expect(pixel(f, 20, 90)[3]).toBe(0);
    expect(pixel(f, 72, 70)[3]).toBe(255); // pale cheek inside the outline
    expect(pixel(f, 72, 70).slice(0, 3)).toEqual([255, 232, 220]);
    expect(pixel(f, 72, 120)[3]).toBe(255); // white clothing
    expect(pixel(f, 72, 120).slice(0, 3)).toEqual([247, 247, 245]);
    expect(pixel(f, 72, 46)[3]).toBe(255); // white hair
    expect(pixel(f, 72, 46).slice(0, 3)).toEqual([250, 250, 248]);
  });

  it("clears a smooth bay between an arm and the torso without eating either", () => {
    const W = 160;
    const H = 200;
    const paint = (): Frame => {
      const f = makeFrame(W, H, [0, 0, 0, 255]);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const d = Math.hypot(x - 90, y - 100);
          const l = Math.round(168 + 74 * Math.exp(-(d * d) / (2 * 70 * 70)));
          const o = (y * W + x) * 4;
          f.data[o] = l;
          f.data[o + 1] = l;
          f.data[o + 2] = l;
          f.data[o + 3] = 255;
        }
      }
      drawRect(f, 86, 70, 122, 190, [150, 176, 206]);
      drawRect(f, 48, 96, 66, 188, [168, 188, 214]);
      // White cuff enclosed by the arm, and a skin-coloured hand on its end.
      drawRect(f, 52, 150, 62, 172, [248, 248, 246]);
      drawDisc(f, 57, 184, 8, [236, 206, 190]);
      return f;
    };
    const raw = paint();
    const keyed = keyFrame(raw, estimateBackground(raw));
    closeSilhouette(keyed);
    // The bright gap reads as an enclosed blob once the flat key gives up.
    expect(pixel(keyed, 76, 140)[3]).toBe(255);

    const { frames: out } = matteFrames([paint(), paint(), paint()]);
    const f = out[1];
    expect(pixel(f, 76, 140)[3]).toBe(0);
    expect(pixel(f, 100, 120)[3]).toBe(255);
    expect(pixel(f, 57, 130)[3]).toBe(255);
    expect(pixel(f, 57, 160)[3]).toBe(255);
    expect(pixel(f, 57, 160).slice(0, 3)).toEqual([248, 248, 246]);
    expect(pixel(f, 57, 184)[3]).toBe(255);
  });

  it("mattes a working-size stack well inside the post-process budget", () => {
    const W = 912;
    const H = 1215;
    const f = makeFrame(W, H, [180, 180, 182, 255]);
    const { data } = f;
    const cx = W / 2;
    const cy = H / 2;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - cx, y - cy);
        const l = Math.max(150, Math.min(245, Math.round(176 + 58 * Math.exp(-(d * d) / (2 * 420 * 420)))));
        const o = (row + x) * 4;
        data[o] = l;
        data[o + 1] = l;
        data[o + 2] = l;
      }
    }
    drawRect(f, 330, 520, 590, 1180, [138, 166, 198]);
    drawRect(f, 400, 700, 520, 980, [248, 248, 246]);
    drawDisc(f, 460, 430, 90, [242, 214, 198]);
    const frames = [f, f, f, f, f, f, f, f];
    const t0 = performance.now();
    const { frames: out } = matteFrames(frames);
    const ms = performance.now() - t0;
    // 8 frames at the 608×810 working canvas (912×1215). A 4 s clip is 64
    // frames, so two clips are 16× this. The whole post-process is ~2 min.
    console.log(`matte 8×${W}×${H}: ${ms.toFixed(0)} ms (${(ms / 8).toFixed(1)} ms/frame)`);
    expect(pixel(out[3], 12, 12)[3]).toBe(0);
    expect(pixel(out[3], 460, 430)[3]).toBe(255);
    expect(pixel(out[3], 450, 840)[3]).toBe(255);
    expect(ms).toBeLessThan(5_000);
  });
});
