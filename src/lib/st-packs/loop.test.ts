import { describe, expect, it } from "vitest";
import { crossfadeLoop, dropDuplicateClosingFrame, makeSeamlessLoop, meanAbsDiff, pingPong, resampleFps, seamRatio } from "./loop";
import { bustFrame, drawDisc, makeFrame, pixel } from "./test-fixtures";
import type { Frame } from "./types";

function discAt(x: number, y: number, size = 64): Frame {
  const f = makeFrame(size, size);
  drawDisc(f, x, y, 10, [220, 120, 60]);
  return f;
}

/** A disc going round a small circle (constant step) while drifting sideways by `driftTotal` px. */
function driftingOrbit(n: number, driftTotal: number): Frame[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (2 * Math.PI * i) / n;
    const drift = (driftTotal * i) / (n - 1);
    return discAt(32 + 4 * Math.cos(t) + drift, 32 + 4 * Math.sin(t));
  });
}

const ratio = (frames: Frame[]) => {
  const s = seamRatio(frames);
  return s.seam / s.consMed;
};

describe("meanAbsDiff", () => {
  it("is 0 for identical frames and scales with the change", () => {
    const a = discAt(32, 32);
    expect(meanAbsDiff(a, a)).toBe(0);
    const small = meanAbsDiff(a, discAt(32.5, 32));
    const big = meanAbsDiff(a, discAt(50, 32));
    expect(small).toBeGreaterThan(0);
    expect(big).toBeGreaterThan(small * 5);
  });

  it("ignores colour under zero alpha (premultiplied)", () => {
    const a = makeFrame(4, 4, [255, 255, 255, 0]);
    const b = makeFrame(4, 4, [0, 0, 0, 0]);
    expect(meanAbsDiff(a, b)).toBe(0);
  });

  it("throws on a size mismatch", () => {
    expect(() => meanAbsDiff(makeFrame(2, 2), makeFrame(3, 2))).toThrow();
  });
});

describe("dropDuplicateClosingFrame", () => {
  it("drops a duplicated closing frame and keeps a different one", () => {
    const seq = [discAt(20, 32), discAt(24, 32), discAt(28, 32), discAt(20, 32)];
    expect(dropDuplicateClosingFrame(seq, 0.02)).toHaveLength(3);
    const open = [discAt(20, 32), discAt(24, 32), discAt(28, 32), discAt(40, 32)];
    expect(dropDuplicateClosingFrame(open, 0.02)).toHaveLength(4);
    expect(dropDuplicateClosingFrame([discAt(20, 32), discAt(20, 32)], 0.02)).toHaveLength(2);
  });
});

describe("crossfadeLoop", () => {
  it("turns a big last→first jump into a normal step and returns n − k frames", () => {
    const n = 48;
    const k = 8;
    const frames = driftingOrbit(n, 2.2);
    expect(ratio(frames)).toBeGreaterThan(2.5);

    const out = crossfadeLoop(frames, k);
    expect(out).toHaveLength(n - k);
    expect(ratio(out)).toBeLessThan(2);
    // middle frames are untouched copies
    expect(out[k].data.equals(frames[k].data)).toBe(true);
    expect(Object.is(out[k].data, frames[k].data)).toBe(false);
    expect(out[n - k - 1].data.equals(frames[n - k - 1].data)).toBe(true);
  });

  it("blends in premultiplied space so semi-transparent pixels keep their colour", () => {
    const a = makeFrame(1, 1, [200, 0, 0, 255]);
    const b = makeFrame(1, 1, [0, 0, 200, 0]); // transparent blue must not tint
    const frames = [a, b, b, a, a];
    const out = crossfadeLoop(frames, 2);
    expect(out).toHaveLength(3);
    const p = pixel(out[0], 0, 0);
    expect(p[0]).toBe(200);
    expect(p[2]).toBe(0);
    expect(p[3]).toBeGreaterThan(0);
  });

  it("clamps k and returns copies when nothing can be faded", () => {
    const frames = [discAt(20, 32), discAt(24, 32)];
    const out = crossfadeLoop(frames, 8);
    expect(out).toHaveLength(2);
    expect(out[0].data.equals(frames[0].data)).toBe(true);
    expect(crossfadeLoop(driftingOrbit(5, 0), 8)).toHaveLength(3); // k clamped to 2
  });
});

describe("pingPong", () => {
  it("appends the reversed interior without repeating the turn-around frames", () => {
    const frames = [discAt(20, 32), discAt(24, 32), discAt(28, 32), discAt(32, 32)];
    const out = pingPong(frames);
    expect(out).toHaveLength(6);
    expect(out[4].data.equals(frames[2].data)).toBe(true);
    expect(out[5].data.equals(frames[1].data)).toBe(true);
    expect(pingPong(frames.slice(0, 2))).toHaveLength(2);
  });
});

describe("resampleFps", () => {
  it("24 → 16 fps turns 96 frames into 64", () => {
    const frames = Array.from({ length: 96 }, (_, i) => makeFrame(2, 2, [i, 0, 0, 255]));
    const out = resampleFps(frames, 24, 16);
    expect(out).toHaveLength(64);
    expect(out[0].data[0]).toBe(0);
    expect(out[1].data[0]).toBe(2); // round(1.5) = 2
    expect(out[63].data[0]).toBe(95);
  });

  it("keeps at least one frame and copies when the rate is unchanged", () => {
    expect(resampleFps([makeFrame(1, 1)], 24, 1)).toHaveLength(1);
    expect(resampleFps([], 24, 16)).toHaveLength(0);
    const frames = [makeFrame(1, 1, [1, 2, 3, 4]), makeFrame(1, 1, [5, 6, 7, 8])];
    const same = resampleFps(frames, 16, 16);
    expect(same).toHaveLength(2);
    expect(same[1].data.equals(frames[1].data)).toBe(true);
  });
});

describe("seamRatio", () => {
  it("reports the seam and consecutive stats ×1000", () => {
    const frames = driftingOrbit(16, 0);
    const s = seamRatio(frames);
    expect(s.seam).toBeGreaterThan(0);
    expect(s.consMed).toBeGreaterThan(0);
    expect(s.consMax).toBeGreaterThanOrEqual(s.consMed);
    expect(s.seam / s.consMed).toBeLessThan(1.5);
    expect(seamRatio([])).toEqual({ seam: 0, consMed: 0, consMax: 0 });
    expect(seamRatio([frames[0]])).toEqual({ seam: 0, consMed: 0, consMax: 0 });
  });
});

describe("makeSeamlessLoop", () => {
  const opts = { k: 8, duplicateThreshold: 0.02 };

  it("fixes a moderate jump with a crossfade", () => {
    const frames = driftingOrbit(48, 2.2);
    // a 2 px slip of a small disc is below the full-frame duplicate threshold; tighten it for this fixture
    const res = makeSeamlessLoop(frames, { ...opts, duplicateThreshold: 0.001, allowPingPong: true });
    expect(res.method).toBe("crossfade");
    expect(res.seamBefore).toBeGreaterThan(2);
    expect(res.seamAfter).toBeLessThan(2);
    expect(res.frames).toHaveLength(40);
  });

  it("eases a hard cut onto an exact copy of frame 0 when ping-pong is off", () => {
    const frames = driftingOrbit(48, 24); // the disc ends nowhere near where it started
    const res = makeSeamlessLoop(frames, { ...opts, allowPingPong: false });
    expect(res.method).toBe("crossfade");
    expect(res.seamAfter).toBeLessThan(1);
    expect(res.frames.at(-1)!.data.equals(res.frames[0].data)).toBe(true);
  });

  it("ping-pongs when allowed and the crossfade cannot fix a hard cut", () => {
    const frames = driftingOrbit(48, 24);
    const res = makeSeamlessLoop(frames, { ...opts, allowPingPong: true });
    expect(res.method).toBe("pingpong");
    expect(res.frames).toHaveLength(48 * 2 - 2);
    expect(res.seamAfter).toBeLessThan(2);
  });

  it("drops a duplicated closing frame when the frame before it still loops", () => {
    const base = driftingOrbit(24, 0);
    const frames = [...base, base[0]];
    const res = makeSeamlessLoop(frames, { ...opts, allowPingPong: true });
    expect(res.method).toBe("trim");
    expect(res.seamAfter).toBeLessThan(2);
    expect(res.frames.length).toBeGreaterThan(16);
    expect(res.frames.length).toBeLessThanOrEqual(25);
  });
});

/** The old post step: drop a duplicate end, then crossfade a fixed tail. */
function previousLoop(frames: Frame[], k = 8): Frame[] {
  return crossfadeLoop(dropDuplicateClosingFrame(frames, 0.02), k);
}

describe("loop point", () => {
  const opts = { k: 8, duplicateThreshold: 0.02, allowPingPong: false };

  it("cuts a clip that returns to the start and then wanders off", () => {
    const n = 48;
    const back = 30;
    const frames = Array.from({ length: n }, (_, i) => {
      const dx = i <= back ? 22 * Math.sin((Math.PI * i) / back) : 30 * ((i - back) / (n - 1 - back));
      return bustFrame(96, 128, { dx });
    });
    const raw = seamRatio(frames);
    const old = seamRatio(previousLoop(frames));
    const res = makeSeamlessLoop(frames, opts);
    expect(res.method).toBe("trim");
    expect(raw.seam).toBeGreaterThan(old.seam);
    expect(res.seamBefore).toBeGreaterThan(2);
    expect(res.seamAfter).toBeLessThan(2);
    expect(seamRatio(res.frames).seam).toBeLessThan(6);
    expect(seamRatio(res.frames).seam).toBeLessThan(old.seam);
  });

  it("keeps a pinned last frame when ping-pong is off, and reverses the snap when it is on", () => {
    const n = 48;
    const sway = Array.from({ length: n }, (_, i) => bustFrame(96, 128, { dx: (28 * i) / (n - 1) }));
    const frames = [...sway, sway[0]];
    const raw = seamRatio(frames);
    const old = seamRatio(previousLoop(frames));
    const held = makeSeamlessLoop(frames, opts);
    expect(held.method).toBe("trim");
    expect(raw.seam).toBeLessThan(1);
    expect(raw.consMax).toBeGreaterThan(100);
    expect(old.seam).toBeGreaterThan(6);
    expect(seamRatio(held.frames).seam).toBeLessThan(1);
    expect(held.frames.at(-1)!.data.equals(held.frames[0].data)).toBe(true);

    const reversed = makeSeamlessLoop(frames, { ...opts, allowPingPong: true });
    const after = seamRatio(reversed.frames);
    expect(reversed.method).toBe("pingpong");
    expect(after.seam).toBeLessThan(6);
    expect(after.consMax).toBeLessThan(raw.consMax / 4);
  });
});
