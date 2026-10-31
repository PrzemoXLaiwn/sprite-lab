// =============================================================================
// ST Packs — register an edited still back onto its base
// =============================================================================
// The edit model is asked to keep the character pixel-identical, but a small
// shift or scale change still happens now and then. The lower torso band is
// compared through a background key on both stills; a shift over 2 px is
// undone with a sub-pixel translation. A scale change over 3 % cannot be fixed
// without resampling the character, so it is reported and left to QA.
// =============================================================================
import { estimateBackground, keyFrame } from "./matte";
import { bandCentroid, translateFrame } from "./stabilize";
import type { Frame } from "./types";

const BAND: [number, number] = [0.6, 0.97];

function bandWidth(frame: Frame, band: [number, number]): number {
  const y0 = Math.floor(frame.height * band[0]), y1 = Math.floor(frame.height * band[1]);
  let minX = frame.width, maxX = -1;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < frame.width; x++) {
      if (frame.data[(y * frame.width + x) * 4 + 3] > 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  return maxX < minX ? 0 : maxX - minX + 1;
}

export interface AlignResult {
  frame: Frame;
  dx: number;
  dy: number;
  scale: number;
  /** True when the still was moved. */
  shifted: boolean;
  /** The scale differs by more than 3 % — cannot be corrected here. */
  scaleMismatch: boolean;
}

export function alignToBase(base: Frame, edit: Frame): AlignResult {
  const bg = estimateBackground(base);
  const kb = keyFrame(base, bg), ke = keyFrame(edit, bg);
  const cb = bandCentroid(kb, BAND), ce = bandCentroid(ke, BAND);
  const wb = bandWidth(kb, BAND), we = bandWidth(ke, BAND);
  const scale = wb > 0 && we > 0 ? we / wb : 1;
  if (!cb || !ce) return { frame: edit, dx: 0, dy: 0, scale, shifted: false, scaleMismatch: Math.abs(scale - 1) > 0.03 };
  const dx = cb.x - ce.x, dy = cb.y - ce.y;
  const shifted = Math.abs(dx) > 2 || Math.abs(dy) > 2;
  return {
    frame: shifted ? translateFrame(edit, dx, dy) : edit,
    dx, dy, scale, shifted,
    scaleMismatch: Math.abs(scale - 1) > 0.03,
  };
}
