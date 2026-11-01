// Shared shapes for the ST Packs pipeline and its API (client-safe: types only).
import type { StExpressionLabel, StExpressionSet } from "@/config/st-expressions";
import type { StExpressionStatus, StFraming, StJobStatus, StMatteMode } from "@/config/st-packs";

/** Straight (non-premultiplied) RGBA pixels, row-major, 4 bytes per pixel. */
export interface Frame {
  data: Buffer;
  width: number;
  height: number;
}

export interface JobOptions {
  gif: boolean;
  png: boolean;
  grid: boolean;
  readme: boolean;
  matteMode: StMatteMode;
  videoSeconds: number;
  /** HQ lossy is the default. Lossless is exact and usually larger. */
  lossless: boolean;
}

/** Per-step wall time in ms, written by the worker as each step finishes. */
export interface StepTimings {
  edit?: number;
  video?: number;
  post?: number;
}

export interface QaMetrics {
  drift_px: number;
  head_x_range: number;
  seam: number;
  cons_med: number;
  cons_max: number;
  alpha_coverage: number;
  edge_touch: boolean;
  corner_opaque: number;
  halo: number;
  bytes: number;
  frames: number;
  fps: number;
  width: number;
  height: number;
}

export interface QaResult {
  metrics: QaMetrics;
  /** Human-readable reasons, empty when everything passed. */
  flags: string[];
  flagged: boolean;
}

export interface ExpressionSnapshot {
  id: string;
  label: StExpressionLabel;
  status: StExpressionStatus;
  attempt: number;
  flagged: boolean;
  qa: QaResult | null;
  costUsd: number;
  timings: StepTimings;
  error: string | null;
  frames: number | null;
  bytes: number | null;
  has: { edit: boolean; video: boolean; webp: boolean; gif: boolean; png: boolean };
  updatedAt: string;
  /** Set while this expression's current step is claimed. A poll must not start a worker before it passes. */
  lockedUntil: string | null;
}

export interface JobSnapshot {
  id: string;
  status: StJobStatus;
  source: "upload" | "prompt";
  prompt: string | null;
  styleNotes: string | null;
  framing: StFraming;
  expressionSet: StExpressionSet;
  labels: StExpressionLabel[];
  width: number;
  height: number;
  options: JobOptions;
  estCostUsd: number;
  costUsd: number;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** When the background worker last extended its lease. Null or in the past means no live worker. */
  workerLeaseUntil: string | null;
  has: { base: boolean; zip: boolean; grid: boolean };
  /** Totals across expressions, ms. */
  timings: Required<StepTimings>;
  expressions: ExpressionSnapshot[];
}

export interface JobListItem {
  id: string;
  status: StJobStatus;
  labels: number;
  costUsd: number;
  estCostUsd: number;
  createdAt: string;
  prompt: string | null;
  hasBase: boolean;
}

export type DownloadKind = "zip" | "png" | "gif" | "grid" | "readme" | "webp" | "still" | "base" | "edit";
