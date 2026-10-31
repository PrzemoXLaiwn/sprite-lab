// =============================================================================
// ST Packs — admin-only SillyTavern expression pack generator (BETA)
// =============================================================================
// Feature flag, tunables and cost estimates. Client-safe: the only thing read
// from the environment is done in functions the server calls; nothing here is
// a NEXT_PUBLIC_ variable. The real provider work lives in src/lib/st-packs/.
// =============================================================================

import type { StExpressionLabel } from "@/config/st-expressions";

export const ST_PACKS_FLAG_ENV = "ST_PACKS_ENABLED";

/** Master switch. Off (the default) hides the page, the nav item and every API route. */
export function isStPacksEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[ST_PACKS_FLAG_ENV] === "true";
}

function intEnv(name: string, fallback: number, env: Record<string, string | undefined>): number {
  const n = Number(env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export type StMatteMode = "key" | "runware";

/** Runtime tunables (all optional; see docs/st-packs.md). */
export function stPacksSettings(env: Record<string, string | undefined> = process.env) {
  const matte = env.ST_PACKS_MATTE_MODE === "runware" ? "runware" : "key";
  return {
    concurrency: intEnv("ST_PACKS_CONCURRENCY", 4, env),
    videoConcurrency: intEnv("ST_PACKS_VIDEO_CONCURRENCY", 8, env),
    videoModel: env.ST_PACKS_VIDEO_MODEL?.trim() || ST_VIDEO_MODEL.air,
    videoSeconds: Math.min(5, Math.max(3, intEnv("ST_PACKS_VIDEO_SECONDS", 4, env))),
    matteMode: matte as StMatteMode,
    maxUsdPerJob: Number(env.ST_PACKS_MAX_USD_PER_JOB) > 0 ? Number(env.ST_PACKS_MAX_USD_PER_JOB) : 10,
    maxUsdPerExpression: Number(env.ST_PACKS_MAX_USD_PER_EXPRESSION) > 0 ? Number(env.ST_PACKS_MAX_USD_PER_EXPRESSION) : 1.5,
    keepVideo: env.ST_PACKS_KEEP_VIDEO === "true",
  };
}

// ── Models (Runware; verified against the model schemas, Oct 2026) ───────────
/**
 * Nano Banana 2 only draws fixed size pairs. 3:4 at the 1K tier is 896×1200
 * ($0.069 per image + $0.0003 per reference image).
 */
export const ST_EDIT_MODEL = { air: "google:4@3", width: 896, height: 1200, approxCostUsd: 0.07 } as const;
/**
 * LTX-2.3 Fast: first AND last frame conditioning, any 64-multiple size from
 * 128 to 2048, $0.03 per second at the 720p tier. The only cheap model on
 * Runware with a last frame and a true 3:4 canvas (Vidu Q2 only takes 9:16 in
 * frame mode; Seedance/PixVerse/Hailuo are first-frame only).
 */
export const ST_VIDEO_MODEL = { air: "lightricks:ltx@2.3-fast", width: 768, height: 1024, fps: 24, usdPerSecond: 0.03 } as const;
/** Runware background removal, per frame (only in matteMode "runware"). */
export const ST_MATTE_USD_PER_FRAME = 0.002;

// ── Canvas ───────────────────────────────────────────────────────────────────
export const ST_FRAMINGS = ["waist", "bust"] as const;
export type StFraming = (typeof ST_FRAMINGS)[number];

export const ST_OUTPUT_SIZES = [
  { width: 432, height: 576 },
  { width: 504, height: 672 },
  { width: 608, height: 810 },
] as const;
export const ST_DEFAULT_SIZE = ST_OUTPUT_SIZES[1];
export function isOutputSize(w: unknown, h: unknown): boolean {
  return ST_OUTPUT_SIZES.some((s) => s.width === w && s.height === h);
}

// ── Pipeline parameters (from the validated Python prototype) ────────────────
export const ST_PIPELINE = {
  outputFps: 16,
  /** Crossfade length at the model fps (8 frames ≈ 0.33 s at 24 fps). */
  crossfadeFrames: 8,
  /** Mean |last − first| below this (0–1) → the model repeated the first frame; drop it. */
  duplicateFrameThreshold: 0.02,
  /** Stabiliser: lower torso band (rows 80–97 %), smoothing window, clamp. */
  stabilizeBand: [0.8, 0.97] as [number, number],
  stabilizeWindow: 5,
  stabilizeMaxShiftPx: 24,
  /** Encoder quality ladder and the hard size cap (ST handles ≤ 1.5 MB comfortably). */
  webpLadder: [
    { quality: 78, alphaQuality: 50 },
    { quality: 75, alphaQuality: 50 },
    { quality: 72, alphaQuality: 50 },
    { quality: 70, alphaQuality: 45 },
    { quality: 66, alphaQuality: 45 },
  ],
  webpEffort: 6,
  webpTargetBytes: 1_480_000,
  webpMaxBytes: 1_500_000,
  /** Working canvas: ~1.5× the largest output so the matte has detail to work with. */
  workScale: 1.5,
} as const;

/** QA thresholds (qa.ts). Any failure flags the expression; the admin decides. */
export const ST_QA = {
  driftPx: 0.5,
  seamRatio: 2,
  seamAbs: 6,
  consSpikeRatio: 4,
  alphaCoverageMin: 0.08,
  alphaCoverageMax: 0.75,
  cornerOpaqueMax: 0.02,
  haloDelta: 40,
  maxBytes: ST_PIPELINE.webpMaxBytes,
} as const;

// ── Cost estimate shown before a job starts ──────────────────────────────────
export function estimateExpressionUsd(label: StExpressionLabel, opts: { videoSeconds: number; matteMode: StMatteMode; fps?: number }): number {
  const edit = label === "neutral" ? 0 : ST_EDIT_MODEL.approxCostUsd;
  const video = ST_VIDEO_MODEL.usdPerSecond * opts.videoSeconds;
  const frames = opts.videoSeconds * (opts.fps ?? ST_VIDEO_MODEL.fps);
  const matte = opts.matteMode === "runware" ? frames * ST_MATTE_USD_PER_FRAME : 0;
  return edit + video + matte;
}

export function estimateJobUsd(labels: readonly StExpressionLabel[], opts: { videoSeconds: number; matteMode: StMatteMode }): number {
  return labels.reduce((sum, l) => sum + estimateExpressionUsd(l, opts), 0);
}

export const ST_JOB_STATUSES = ["draft", "base_ready", "running", "done", "partial", "failed", "cancelled"] as const;
export type StJobStatus = (typeof ST_JOB_STATUSES)[number];
export const ST_EXPRESSION_STATUSES = ["queued", "editing", "edited", "video_submitted", "video_ready", "processing", "done", "failed"] as const;
export type StExpressionStatus = (typeof ST_EXPRESSION_STATUSES)[number];
