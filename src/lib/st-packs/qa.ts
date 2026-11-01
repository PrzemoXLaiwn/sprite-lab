// =============================================================================
// ST Packs — automatic QA of a finished expression loop
// =============================================================================
// Cheap pixel statistics that catch the failure modes we saw in the prototype:
// sideways drift, a popping loop seam, a background that survived the matte
// (opaque corners), a cropped character (alpha on the side columns), a bright
// fringe (halo) and a file too large for SillyTavern. Any failure flags the
// expression for the admin; nothing here blocks the pipeline.
// =============================================================================

import { ST_QA } from "@/config/st-packs";
import { seamRatio } from "./loop";
import { centroidRangeX } from "./stabilize";
import type { Frame, QaMetrics, QaResult } from "./types";

export type QaThresholds = { [K in keyof typeof ST_QA]: number };

export interface QaInfo {
  fps: number;
  /** Encoded size of the delivered file. */
  bytes: number;
  /** Lower-body band used for the drift metric (the stabiliser's band). */
  band: [number, number];
}

const HEAD_BAND: [number, number] = [0.05, 0.4];
const CORNER_PATCH = 24;
/** Alpha above this counts as "opaque" for coverage, edge and corner checks. */
const OPAQUE = 128;
/** Alpha at or above this is interior for the halo metric; below (and > 0) is edge. */
const INTERIOR = 200;

interface PixelStats {
  opaque: number;
  total: number;
  edgeTouch: boolean;
  cornerOpaque: number;
  cornerTotal: number;
  edgeLum: number;
  edgeCount: number;
  interiorLum: number;
  interiorCount: number;
}

function luminance(data: Buffer, o: number): number {
  return 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
}

/** Interior pixels within this many px of an edge pixel are the halo reference (a bright face against a dark coat is not a fringe). */
const HALO_RING = 3;

/** 1 where a semi-transparent edge pixel lies within HALO_RING px (separable dilation). */
function nearEdgeMask(frame: Frame): Uint8Array {
  const { width, height, data } = frame;
  const edge = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3];
    if (a > 0 && a < INTERIOR) edge[i] = 1;
  }
  const row = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let hit = 0;
      for (let k = -HALO_RING; k <= HALO_RING && !hit; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < width && edge[y * width + xx]) hit = 1;
      }
      row[y * width + x] = hit;
    }
  }
  const near = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let hit = 0;
      for (let k = -HALO_RING; k <= HALO_RING && !hit; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < height && row[yy * width + x]) hit = 1;
      }
      near[y * width + x] = hit;
    }
  }
  return near;
}

function accumulate(frame: Frame, s: PixelStats): void {
  const { width, height, data } = frame;
  const cp = Math.min(CORNER_PATCH, width, height);
  const near = nearEdgeMask(frame);
  for (let y = 0; y < height; y++) {
    const inCornerRow = y < cp || y >= height - cp;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const a = data[o + 3];
      s.total++;
      if (a > OPAQUE) {
        s.opaque++;
        if (x === 0 || x === width - 1) s.edgeTouch = true;
      }
      if (inCornerRow && (x < cp || x >= width - cp)) {
        s.cornerTotal++;
        if (a > OPAQUE) s.cornerOpaque++;
      }
      if (a >= INTERIOR) {
        if (near[y * width + x]) {
          s.interiorLum += luminance(data, o);
          s.interiorCount++;
        }
      } else if (a > 0) {
        s.edgeLum += luminance(data, o);
        s.edgeCount++;
      }
    }
  }
}

const fmt = (v: number, digits = 1): string => (Number.isFinite(v) ? v.toFixed(digits) : String(v));

export function computeQa(frames: Frame[], info: QaInfo, thresholds: QaThresholds = ST_QA): QaResult {
  const stats: PixelStats = {
    opaque: 0,
    total: 0,
    edgeTouch: false,
    cornerOpaque: 0,
    cornerTotal: 0,
    edgeLum: 0,
    edgeCount: 0,
    interiorLum: 0,
    interiorCount: 0,
  };
  for (const f of frames) accumulate(f, stats);

  const seam = seamRatio(frames);
  const halo =
    stats.edgeCount > 0 && stats.interiorCount > 0 ? stats.edgeLum / stats.edgeCount - stats.interiorLum / stats.interiorCount : 0;

  const metrics: QaMetrics = {
    drift_px: centroidRangeX(frames, info.band),
    head_x_range: centroidRangeX(frames, HEAD_BAND),
    seam: seam.seam,
    cons_med: seam.consMed,
    cons_max: seam.consMax,
    alpha_coverage: stats.total > 0 ? stats.opaque / stats.total : 0,
    edge_touch: stats.edgeTouch,
    corner_opaque: stats.cornerTotal > 0 ? stats.cornerOpaque / stats.cornerTotal : 0,
    halo,
    bytes: info.bytes,
    frames: frames.length,
    fps: info.fps,
    width: frames[0]?.width ?? 0,
    height: frames[0]?.height ?? 0,
  };

  const flags: string[] = [];
  if (frames.length === 0) flags.push("no frames");
  if (metrics.drift_px > thresholds.driftPx) flags.push(`drift ${fmt(metrics.drift_px)} px > ${thresholds.driftPx}`);
  if (metrics.seam > thresholds.seamRatio * metrics.cons_med) {
    flags.push(`seam ${fmt(metrics.seam)} > ${thresholds.seamRatio}× ${fmt(metrics.cons_med)}`);
  }
  if (metrics.seam > thresholds.seamAbs) flags.push(`seam ${fmt(metrics.seam)} > ${thresholds.seamAbs} abs`);
  if (metrics.cons_med > 0 && metrics.cons_max > thresholds.consSpikeRatio * metrics.cons_med && metrics.cons_max > thresholds.consSpikeAbs) {
    flags.push(`pop ${fmt(metrics.cons_max)} > ${thresholds.consSpikeRatio}× ${fmt(metrics.cons_med)}`);
  }
  if (metrics.alpha_coverage < thresholds.alphaCoverageMin || metrics.alpha_coverage > thresholds.alphaCoverageMax) {
    flags.push(`alpha coverage ${fmt(metrics.alpha_coverage, 2)} outside ${thresholds.alphaCoverageMin}–${thresholds.alphaCoverageMax}`);
  }
  if (metrics.edge_touch) flags.push("edge touch: subject reaches a side edge");
  if (metrics.corner_opaque > thresholds.cornerOpaqueMax) {
    flags.push(`corner opaque ${fmt(metrics.corner_opaque, 2)} > ${thresholds.cornerOpaqueMax}`);
  }
  if (metrics.halo > thresholds.haloDelta) flags.push(`halo ${fmt(metrics.halo)} > ${thresholds.haloDelta}`);
  if (metrics.bytes > thresholds.maxBytes) flags.push(`bytes ${metrics.bytes} > ${thresholds.maxBytes}`);

  return { metrics, flags, flagged: flags.length > 0 };
}
