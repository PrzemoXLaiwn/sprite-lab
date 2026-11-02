// =============================================================================
// Seamless tiles — heal a seam without ghosting a second copy of the pattern
// =============================================================================
// The previous fix blended a half-tile-shifted copy into the outer 14% of the
// original. That hides the seam and also prints a faint second grid (the
// "ghosts" on production tiles). This rolls the tile so the bad edge meets in
// the middle, crossfades only that band, and rolls it back. The pattern is
// unchanged apart from a thin blend where the edges join.
// A tile whose seam is already under the same 1.6 threshold the app used is
// left exactly as it is.
// =============================================================================

export interface RgbaImage {
  data: Buffer;
  width: number;
  height: number;
}

/** Same threshold the tile post-process has used since the offset blend. */
export const SEAM_LIMIT = 1.6;

export interface SeamAxes {
  /** Left/right wrap, ~1 when it already tiles. */
  x: number;
  /** Top/bottom wrap. */
  y: number;
}

function channelDiff(data: Buffer, a: number, b: number): number {
  return Math.abs(data[a] - data[b]) + Math.abs(data[a + 1] - data[b + 1]) + Math.abs(data[a + 2] - data[b + 2]);
}

export function seamAxes(raw: RgbaImage): SeamAxes {
  const { width: w, height: h, data } = raw;
  let seamX = 0, innerX = 0, seamY = 0, innerY = 0;
  for (let y = 0; y < h; y++) {
    seamX += channelDiff(data, (y * w + w - 1) * 4, (y * w) * 4);
    const mx = Math.min(w - 2, Math.floor(w / 3) + (y % 7) * 37 % Math.max(1, w - 1));
    innerX += channelDiff(data, (y * w + mx) * 4, (y * w + mx + 1) * 4);
  }
  for (let x = 0; x < w; x++) {
    seamY += channelDiff(data, ((h - 1) * w + x) * 4, x * 4);
    const my = Math.min(h - 2, Math.floor(h / 3) + (x % 7) * 37 % Math.max(1, h - 1));
    innerY += channelDiff(data, (my * w + x) * 4, ((my + 1) * w + x) * 4);
  }
  const x = h ? (seamX / h) / Math.max(1, innerX / h) : 0;
  const y = w ? (seamY / w) / Math.max(1, innerY / w) : 0;
  return { x, y };
}

function offset(src: RgbaImage, dx: number, dy: number): RgbaImage {
  const { width: w, height: h, data } = src;
  const out = Buffer.alloc(data.length);
  const sx = ((dx % w) + w) % w;
  const sy = ((dy % h) + h) % h;
  for (let y = 0; y < h; y++) {
    const fromY = (y + sy) % h;
    for (let x = 0; x < w; x++) {
      const fromX = (x + sx) % w;
      const si = (fromY * w + fromX) * 4;
      const di = (y * w + x) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = 255;
    }
  }
  return { data: out, width: w, height: h };
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Crossfade a vertical band centred on x = w/2 (the rolled left/right seam). */
function blendVertical(src: RgbaImage, band: number): RgbaImage {
  const { width: w, height: h, data } = src;
  const out = Buffer.from(data);
  const cx = Math.floor(w / 2);
  const left = cx - band;
  const right = cx + band;
  for (let y = 0; y < h; y++) {
    const sample = (x: number) => {
      const xx = (x % w + w) % w;
      const i = (y * w + xx) * 4;
      return [data[i], data[i + 1], data[i + 2]] as const;
    };
    const a = sample(left);
    const b = sample(right);
    // The wrap, after rolling back, is the pair (cx-1, cx). Both must be the
    // midpoint or a flat tile still measures a seam (one gradient step on a
    // zero interior).
    const mid = a.map((v, k) => Math.round((v + b[k]) / 2));
    const paint = (x: number, rgb: readonly number[]) => {
      const xx = (x % w + w) % w;
      const i = (y * w + xx) * 4;
      out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2]; out[i + 3] = 255;
    };
    paint(cx - 1, mid);
    paint(cx, mid);
    const leftSpan = Math.max(1, cx - 1 - left);
    for (let x = left; x <= cx - 2; x++) {
      const m = smooth((x - left) / leftSpan);
      paint(x, a.map((v, k) => Math.round(v * (1 - m) + mid[k] * m)));
    }
    const rightSpan = Math.max(1, right - cx);
    for (let x = cx + 1; x <= right; x++) {
      const m = smooth((x - cx) / rightSpan);
      paint(x, mid.map((v, k) => Math.round(v * (1 - m) + b[k] * m)));
    }
  }
  return { data: out, width: w, height: h };
}

function blendHorizontal(src: RgbaImage, band: number): RgbaImage {
  const { width: w, height: h, data } = src;
  const out = Buffer.from(data);
  const cy = Math.floor(h / 2);
  const top = cy - band;
  const bottom = cy + band;
  for (let x = 0; x < w; x++) {
    const sample = (y: number) => {
      const yy = (y % h + h) % h;
      const i = (yy * w + x) * 4;
      return [data[i], data[i + 1], data[i + 2]] as const;
    };
    const a = sample(top);
    const b = sample(bottom);
    const mid = a.map((v, k) => Math.round((v + b[k]) / 2));
    const paint = (y: number, rgb: readonly number[]) => {
      const yy = (y % h + h) % h;
      const i = (yy * w + x) * 4;
      out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2]; out[i + 3] = 255;
    };
    paint(cy - 1, mid);
    paint(cy, mid);
    const topSpan = Math.max(1, cy - 1 - top);
    for (let y = top; y <= cy - 2; y++) {
      const m = smooth((y - top) / topSpan);
      paint(y, a.map((v, k) => Math.round(v * (1 - m) + mid[k] * m)));
    }
    const botSpan = Math.max(1, bottom - cy);
    for (let y = cy + 1; y <= bottom; y++) {
      const m = smooth((y - cy) / botSpan);
      paint(y, mid.map((v, k) => Math.round(v * (1 - m) + b[k] * m)));
    }
  }
  return { data: out, width: w, height: h };
}

function healAxis(src: RgbaImage, axis: "x" | "y", band: number): RgbaImage {
  const dx = axis === "x" ? Math.floor(src.width / 2) : 0;
  const dy = axis === "y" ? Math.floor(src.height / 2) : 0;
  const rolled = offset(src, dx, dy);
  const blended = axis === "x" ? blendVertical(rolled, band) : blendHorizontal(rolled, band);
  return offset(blended, (src.width - dx) % src.width, (src.height - dy) % src.height);
}

function bandFor(size: number, scale: number): number {
  if (size <= 256) return 1;
  return Math.max(2, Math.min(48, Math.round(size * 0.04 * scale)));
}

/**
 * Heal whichever wrap exceeds {@link SEAM_LIMIT}. An already-seamless tile is
 * returned unchanged (same buffer).
 */
export function healTileSeams(src: RgbaImage): RgbaImage {
  let out = src;
  let copied = false;
  const ensure = () => {
    if (copied) return;
    out = { data: Buffer.from(src.data), width: src.width, height: src.height };
    copied = true;
  };
  for (const axis of ["x", "y"] as const) {
    const size = axis === "x" ? out.width : out.height;
    if (seamAxes(out)[axis] <= SEAM_LIMIT) continue;
    ensure();
    out = healAxis(out, axis, bandFor(size, 1));
    if (seamAxes(out)[axis] > SEAM_LIMIT) out = healAxis(out, axis, bandFor(size, 2));
  }
  return out;
}
