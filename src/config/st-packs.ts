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
    /** Edits in flight. 8 lets a default pack submit every clip in one wave. */
    concurrency: intEnv("ST_PACKS_CONCURRENCY", 8, env),
    /**
     * Two posts at once inside the one leased worker. #28 peaked near 1506 MB
     * for a single 5 s clip at 912×1215 (~80 frames). Native 720×960 is about
     * 0.62× the pixels, so two posts sit near 1.5 GB inside the 3009 MB
     * function, with headroom left. A second worker per expression would need
     * a second lease; #29 allows one.
     */
    postConcurrency: intEnv("ST_PACKS_POST_CONCURRENCY", 2, env),
    /** Open Vidu tasks. 8 is one full default set in a single round. */
    videoConcurrency: intEnv("ST_PACKS_VIDEO_CONCURRENCY", 8, env),
    videoModel: videoModelSpec(env.ST_PACKS_VIDEO_MODEL?.trim()).air,
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
 * Video models with first AND last frame conditioning (the loop closes on
 * itself). Seedance, PixVerse and Hailuo are first-frame only, so they are out.
 * The still is fitted into the model's canvas (padded when it is not 3:4) and
 * the decoded frames are cropped back.
 */
export interface StVideoModelSpec {
  air: string;
  label: string;
  width: number;
  height: number;
  /** Requested fps, or null when the model decides (the clip's fps is read back from the file). */
  fps: number | null;
  usdPerSecond: number;
  /** Extra request fields (provider settings). */
  body: Record<string, unknown>;
}

export const ST_VIDEO_MODELS: Record<string, StVideoModelSpec> = {
  // Any 64-multiple size, true 3:4, $0.03/s at the 720p tier. Its prompt
  // enhancer rewrites "static camera, subtle idle" into a moving shot — off.
  "lightricks:ltx@2.3-fast": { air: "lightricks:ltx@2.3-fast", label: "LTX-2.3 Fast", width: 768, height: 1024, fps: 24, usdPerSecond: 0.03, body: { settings: { enhancePrompt: false } } },
  // Frame mode only takes 720×1280 (9:16) — the 3:4 still is padded — but it
  // has a "small" movement amplitude, which is exactly an idle. $0.0825 per 4 s.
  "vidu:3@2": { air: "vidu:3@2", label: "Vidu Q2 Turbo", width: 720, height: 1280, fps: null, usdPerSecond: 0.0825 / 4, body: { providerSettings: { vidu: { movementAmplitude: "small", bgm: false } } } },
};
// Measured on the same still (Oct 2026): Vidu small-amplitude idle drifted 0.006 px with a clean
// seam; LTX (enhancer off) still drifted 3 px with a pop. Vidu is the default.
export const ST_DEFAULT_VIDEO_MODEL = "vidu:3@2";
export const ST_VIDEO_MODEL = ST_VIDEO_MODELS[ST_DEFAULT_VIDEO_MODEL];

/** The configured model's spec; an unknown AIR falls back to the default. */
export function videoModelSpec(air: string | null | undefined): StVideoModelSpec {
  return (air && ST_VIDEO_MODELS[air]) || ST_VIDEO_MODEL;
}
/** Source fps the clip is assumed to have when the model does not take one (used for the crossfade length). */
export const ST_ASSUMED_FPS = 24;
/** Runware background removal, per frame (only in matteMode "runware"). */
export const ST_MATTE_USD_PER_FRAME = 0.002;

// ── Canvas ───────────────────────────────────────────────────────────────────
export const ST_FRAMINGS = ["waist", "bust"] as const;
export type StFraming = (typeof ST_FRAMINGS)[number];

/**
 * Pixels the character occupies inside a model canvas. A 3:4 still letterboxed
 * into Vidu's 720×1280 is 720×960; LTX's canvas is already 3:4 (768×1024).
 * A near-fit (within 4 px, same rule as padToCanvas) uses the whole canvas.
 */
export function nativeContentSize(spec: StVideoModelSpec = ST_VIDEO_MODEL): { width: number; height: number } {
  const scale = Math.min(spec.width / 3, spec.height / 4);
  let width = Math.round(3 * scale);
  let height = Math.round(4 * scale);
  if (Math.abs(width - spec.width) <= 4 && Math.abs(height - spec.height) <= 4) {
    width = spec.width;
    height = spec.height;
  }
  if (width % 2) width -= 1;
  if (height % 2) height -= 1;
  return { width, height };
}

/** Older packs. Still accepted so a stored job can be retried; new jobs use the native size. */
export const ST_LEGACY_OUTPUT_SIZES = [
  { width: 432, height: 576 },
  { width: 504, height: 672 },
  { width: 608, height: 810 },
] as const;
export const ST_DEFAULT_SIZE = nativeContentSize();
export function isOutputSize(w: unknown, h: unknown): boolean {
  if (typeof w !== "number" || typeof h !== "number") return false;
  if (ST_LEGACY_OUTPUT_SIZES.some((s) => s.width === w && s.height === h)) return true;
  if (w === ST_DEFAULT_SIZE.width && h === ST_DEFAULT_SIZE.height) return true;
  return Object.values(ST_VIDEO_MODELS).some((spec) => {
    const n = nativeContentSize(spec);
    return n.width === w && n.height === h;
  });
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
  /**
   * One encode, chosen up front: quality 90 and full alpha, effort 4.
   * No ladder. A file over the cap is flagged, not re-encoded.
   */
  webpQuality: 90,
  webpAlphaQuality: 100,
  webpEffort: 4,
  /** Hard cap. QA flags a file over this; the encoder does not retry. */
  webpMaxBytes: 6_000_000,
} as const;

/** QA thresholds (qa.ts). Any failure flags the expression; the admin decides. */
export const ST_QA = {
  /**
   * Residual sideways drift after stabilising. 0.5 px flagged ordinary idle
   * on a 720-wide frame (the man's anger was 3.2 px and looked fine). A real
   * slide still fails above 4 px.
   */
  driftPx: 4,
  seamRatio: 2,
  seamAbs: 6,
  consSpikeRatio: 4,
  /** A blink on an otherwise still loop is a 4× spike too; a pop must also exceed this absolute step (×1000). */
  consSpikeAbs: 10,
  alphaCoverageMin: 0.08,
  /** 0.706 shipped a near-white field with the corners already clear. */
  alphaCoverageMax: 0.65,
  cornerOpaqueMax: 0.02,
  /** Edge vs near-interior luminance. Line-art outlines sit right at the edge, so only a gross fringe trips this. */
  haloDelta: 100,
  maxBytes: ST_PIPELINE.webpMaxBytes,
} as const;

// ── Cost estimate shown before a job starts ──────────────────────────────────
export function estimateExpressionUsd(label: StExpressionLabel, opts: { videoSeconds: number; matteMode: StMatteMode; fps?: number; usdPerSecond?: number }): number {
  const edit = label === "neutral" ? 0 : ST_EDIT_MODEL.approxCostUsd;
  const video = (opts.usdPerSecond ?? ST_VIDEO_MODEL.usdPerSecond) * opts.videoSeconds;
  const frames = opts.videoSeconds * (opts.fps ?? ST_VIDEO_MODEL.fps ?? ST_ASSUMED_FPS);
  const matte = opts.matteMode === "runware" ? frames * ST_MATTE_USD_PER_FRAME : 0;
  return edit + video + matte;
}

export function estimateJobUsd(labels: readonly StExpressionLabel[], opts: { videoSeconds: number; matteMode: StMatteMode; usdPerSecond?: number }): number {
  return labels.reduce((sum, l) => sum + estimateExpressionUsd(l, opts), 0);
}

export const ST_JOB_STATUSES = ["draft", "base_ready", "running", "done", "partial", "failed", "cancelled"] as const;
export type StJobStatus = (typeof ST_JOB_STATUSES)[number];
export const ST_EXPRESSION_STATUSES = ["queued", "editing", "edited", "video_submitted", "video_ready", "processing", "done", "failed"] as const;
export type StExpressionStatus = (typeof ST_EXPRESSION_STATUSES)[number];
