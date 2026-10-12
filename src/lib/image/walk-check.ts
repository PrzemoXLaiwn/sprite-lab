// =============================================================================
// Walk-cycle check — catches "frozen" rows where the model drew the same pose
// four times (the figure slides instead of stepping).
// =============================================================================
// Two signals, both scale-free:
//   • stride  — width of the feet band relative to height. A side-view walk
//     alternates wide (contact) and narrow (passing) frames; a frozen row
//     keeps one stride in every frame.
//   • legs    — how much the leg area changes frame to frame, with the upper
//     body lined up so only the legs count.
// =============================================================================

import type { Raw } from "./animation";

const ALPHA = 128;

function opaqueBounds(f: Raw) {
  let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
  for (let y = 0; y < f.height; y++) {
    for (let x = 0; x < f.width; x++) {
      if (f.data[(y * f.width + x) * 4 + 3] <= ALPHA) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, x1, y0, y1, h: y1 - y0 + 1 };
}

/** Feet-band width / figure height. */
export function strideOf(f: Raw): number {
  const b = opaqueBounds(f);
  if (!b) return 0;
  const band = Math.max(2, Math.round(b.h * 0.12));
  let x0 = Infinity, x1 = -1;
  for (let y = b.y1 - band + 1; y <= b.y1; y++) {
    for (let x = 0; x < f.width; x++) {
      if (f.data[(y * f.width + x) * 4 + 3] <= ALPHA) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
  }
  return x1 < 0 ? 0 : (x1 - x0 + 1) / b.h;
}

/** Leg pixels (lowest 35%) keyed relative to the feet line and the upper-body centre. */
function legSet(f: Raw): Set<number> {
  const set = new Set<number>();
  const b = opaqueBounds(f);
  if (!b) return set;
  const top = b.y1 - Math.round(b.h * 0.35);
  let sx = 0, n = 0;
  for (let y = b.y0; y < top; y++) {
    for (let x = 0; x < f.width; x++) if (f.data[(y * f.width + x) * 4 + 3] > ALPHA) { sx += x; n++; }
  }
  const cx = n ? Math.round(sx / n) : Math.round((b.x0 + b.x1) / 2);
  // Normalise to the figure height so frames of slightly different size compare
  const k = 100 / b.h;
  for (let y = top; y <= b.y1; y++) {
    for (let x = 0; x < f.width; x++) {
      if (f.data[(y * f.width + x) * 4 + 3] <= ALPHA) continue;
      set.add(Math.round((b.y1 - y) * k) * 1000 + Math.round((x - cx) * k) + 500);
    }
  }
  return set;
}

function difference(a: Set<number>, b: Set<number>): number {
  let only = 0;
  for (const v of a) if (!b.has(v)) only++;
  for (const v of b) if (!a.has(v)) only++;
  const union = a.size + b.size - (a.size + b.size - only) / 2;
  return union ? only / union : 0;
}

export interface WalkRowStats {
  /** max − min stride across the row */
  strideRange: number;
  /** mean leg-area change between neighbouring frames (cyclic) */
  legChange: number;
}

export function walkRowStats(frames: Raw[]): WalkRowStats {
  const strides = frames.map(strideOf);
  const legs = frames.map(legSet);
  let change = 0;
  for (let i = 0; i < legs.length; i++) change += difference(legs[i], legs[(i + 1) % legs.length]);
  return { strideRange: Math.max(...strides) - Math.min(...strides), legChange: legs.length ? change / legs.length : 0 };
}

/**
 * True when a row doesn't read as walking. Side views must alternate their
 * stride; front/back views only need visible leg change (their stride barely
 * changes even in a good cycle). Thresholds come from real sheets: frozen
 * side rows measured stride ≤0.07 / legs ≈0.2, good front rows legs ≈0.4.
 */
export function walkRowFrozen(frames: Raw[], view: "side" | "front" | "back"): boolean {
  if (frames.length < 2) return true;
  const s = walkRowStats(frames);
  if (view === "side") return s.strideRange < 0.1 && s.legChange < 0.3;
  return s.legChange < 0.1;
}

/** Higher = more of a walk. For choosing between an original row and a redraw. */
export function walkRowScore(frames: Raw[]): number {
  const s = walkRowStats(frames);
  return s.strideRange * 2 + s.legChange;
}
