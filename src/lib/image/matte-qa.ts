// =============================================================================
// Matte QA — after the background is keyed out
// =============================================================================
// Painted and anime sprites were keeping a light fringe (about 1 in 5 edge
// pixels near-white) and occasionally losing a pale subject into the white
// key. This checks the matte and repairs it locally: drop specks, and clear
// a light fringe only where the pixel inward of it is actually the subject
// (a white shirt, whose inward neighbour is also white, stays).
// A subject that came back as scraps is reported as a cutout so the caller
// can re-key tighter. No network call.
// =============================================================================

export interface RgbaImage {
  data: Buffer;
  width: number;
  height: number;
}

export interface MatteReport {
  opaqueRatio: number;
  /** Share of edge pixels that are near-white and unsaturated. */
  lightEdgeRatio: number;
  fragments: number;
  halo: boolean;
  cutout: boolean;
}

const LIGHT_LUMA = 225;
const LIGHT_CHROMA = 28;

function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function opaque(data: Buffer, p: number): boolean {
  return data[p * 4 + 3] >= 128;
}

export function assessMatte(raw: RgbaImage): MatteReport {
  const { width: w, height: h, data } = raw;
  const total = w * h;
  let opaqueCount = 0;
  let edge = 0;
  let lightEdge = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!opaque(data, p)) continue;
      opaqueCount++;
      const touches =
        (x > 0 && !opaque(data, p - 1)) || (x < w - 1 && !opaque(data, p + 1)) ||
        (y > 0 && !opaque(data, p - w)) || (y < h - 1 && !opaque(data, p + w));
      if (!touches) continue;
      edge++;
      const i = p * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (luma(r, g, b) >= LIGHT_LUMA && Math.max(r, g, b) - Math.min(r, g, b) <= LIGHT_CHROMA) lightEdge++;
    }
  }
  const lightEdgeRatio = edge ? lightEdge / edge : 0;
  const fragments = countSpecks(raw, opaqueCount);
  const opaqueRatio = total ? opaqueCount / total : 0;
  return {
    opaqueRatio,
    lightEdgeRatio,
    fragments,
    halo: lightEdgeRatio >= 0.12 && lightEdge >= 8,
    // Scraps: almost nothing left, or what is left is in pieces.
    cutout: opaqueCount > 0 && (opaqueRatio < 0.045 || (opaqueRatio < 0.1 && fragments >= 4)),
  };
}

function countSpecks(raw: RgbaImage, opaqueCount: number): number {
  if (opaqueCount === 0) return 0;
  const { width: w, height: h, data } = raw;
  const speck = Math.min(24, Math.max(6, Math.round(opaqueCount * 0.0015)));
  const seen = new Uint8Array(w * h);
  let fragments = 0;
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || !opaque(data, start)) continue;
    let size = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const x = p % w, y = (p - x) / w;
      const tryPush = (q: number) => {
        if (!seen[q] && opaque(data, q)) { seen[q] = 1; stack.push(q); }
      };
      if (x > 0) tryPush(p - 1);
      if (x < w - 1) tryPush(p + 1);
      if (y > 0) tryPush(p - w);
      if (y < h - 1) tryPush(p + w);
    }
    if (size <= speck) fragments++;
  }
  return fragments;
}

/** Delete connected scraps smaller than a few dozen pixels. Returns how many. */
export function dropSpecks(raw: RgbaImage): number {
  const { width: w, height: h, data } = raw;
  let opaqueCount = 0;
  for (let p = 0; p < w * h; p++) if (opaque(data, p)) opaqueCount++;
  if (!opaqueCount) return 0;
  const speck = Math.min(24, Math.max(6, Math.round(opaqueCount * 0.0015)));
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  let removed = 0;
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || !opaque(data, start)) continue;
    const comp: number[] = [];
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      comp.push(p);
      const x = p % w, y = (p - x) / w;
      const tryPush = (q: number) => {
        if (!seen[q] && opaque(data, q)) { seen[q] = 1; stack.push(q); }
      };
      if (x > 0) tryPush(p - 1);
      if (x < w - 1) tryPush(p + 1);
      if (y > 0) tryPush(p - w);
      if (y < h - 1) tryPush(p + w);
    }
    if (comp.length > speck) continue;
    for (const p of comp) data[p * 4 + 3] = 0;
    removed++;
  }
  return removed;
}

/**
 * Clear a near-white anti-aliased fringe. A pixel is fringe only when the
 * neighbour away from the transparency is darker or more saturated — white
 * cloth, whose inside is also white, is left alone.
 */
export function defringeLightEdges(raw: RgbaImage, passes = 2): number {
  const { width: w, height: h, data } = raw;
  let cleared = 0;
  for (let pass = 0; pass < passes; pass++) {
    const kill: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (!opaque(data, p)) continue;
        const i = p * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (luma(r, g, b) < LIGHT_LUMA || Math.max(r, g, b) - Math.min(r, g, b) > LIGHT_CHROMA) continue;
        const neigh: Array<[number, number]> = [];
        if (x > 0 && !opaque(data, p - 1)) neigh.push([1, 0]);
        if (x < w - 1 && !opaque(data, p + 1)) neigh.push([-1, 0]);
        if (y > 0 && !opaque(data, p - w)) neigh.push([0, 1]);
        if (y < h - 1 && !opaque(data, p + w)) neigh.push([0, -1]);
        if (!neigh.length) continue;
        // A fringe sits on the subject: at least one direction hits a darker
        // pixel within 4px. White cloth's neighbours are white, so it stays.
        let onSubject = false;
        for (const [sx, sy] of neigh) {
          for (let s = 1; s <= 4; s++) {
            const ix = x + sx * s, iy = y + sy * s;
            if (ix < 0 || iy < 0 || ix >= w || iy >= h) break;
            const q = iy * w + ix;
            if (!opaque(data, q)) continue;
            const j = q * 4;
            const ir = data[j], ig = data[j + 1], ib = data[j + 2];
            const inwardLight = luma(ir, ig, ib) >= LIGHT_LUMA - 15 && Math.max(ir, ig, ib) - Math.min(ir, ig, ib) <= LIGHT_CHROMA + 8;
            if (!inwardLight) { onSubject = true; break; }
          }
        }
        if (!onSubject) continue;
        kill.push(p);
      }
    }
    if (!kill.length) break;
    for (const p of kill) data[p * 4 + 3] = 0;
    cleared += kill.length;
  }
  return cleared;
}

/** Specks, then the light fringe. Returns the matte after the repair. */
export function repairMatte(raw: RgbaImage): MatteReport {
  dropSpecks(raw);
  defringeLightEdges(raw, 2);
  return assessMatte(raw);
}
