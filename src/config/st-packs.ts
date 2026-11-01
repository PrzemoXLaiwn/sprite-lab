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
    videoSeconds: videoSecondsSetting(intEnv("ST_PACKS_VIDEO_SECONDS", 4, env)),
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
  // Same 720×1280 first+last request as Turbo. 720p 6s first-frame example is
  // $0.179; first-last 720p 8s is $0.234 (Runware docs, 2026-11-01).
  "vidu:3@1": { air: "vidu:3@1", label: "Vidu Q2 Pro", width: 720, height: 1280, fps: null, usdPerSecond: 0.179 / 6, body: { providerSettings: { vidu: { movementAmplitude: "small", bgm: false } } } },
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

export const ST_MOTION_MODES = ["subtle", "expressive"] as const;
export type StMotionMode = (typeof ST_MOTION_MODES)[number];

/** Lengths the studio offers. Vidu Q2 Turbo accepts any integer from 1 to 8; 6 and 8 are the longer acting clips. */
export const ST_VIDEO_SECOND_CHOICES = [3, 4, 5, 6, 8] as const;
export type StVideoSeconds = (typeof ST_VIDEO_SECOND_CHOICES)[number];

export function isVideoSeconds(n: number): n is StVideoSeconds {
  return (ST_VIDEO_SECOND_CHOICES as readonly number[]).includes(n);
}

function videoSecondsSetting(n: number): StVideoSeconds {
  return isVideoSeconds(n) ? n : 4;
}

/**
 * Vidu Q2 Turbo, 720p, the request we send (first frame and last frame are the
 * same still). Sources, Runware docs for `vidu:3@2` (checked 2026-11-01):
 *   4s  $0.0825  rate card, 720p
 *   5s  $0.11    published example, first-frame 720p
 *   8s  $0.193   published example, first-last-frame 720p
 * The rate card also lists 720p 8s at $0.138 without that first-last example.
 * 6s has no published 720p first-last price: $0.1375 is the 4s rate plus two
 * steps of ($0.11 − $0.0825). 3s has no published price; it stays 3/4 of the 4s rate.
 */
export function viduQ2TurboClipUsd(seconds: number): number {
  switch (seconds) {
    case 3: return 0.061875;
    case 4: return 0.0825;
    case 5: return 0.11;
    case 6: return 0.1375;
    case 8: return 0.193;
    default: return Math.round((0.0825 + (seconds - 4) * 0.0275) * 10000) / 10000;
  }
}

/** Provider list price for one clip. Vidu uses the table above; LTX stays per second. */
/** Published first-frame 720p 6s is $0.179. First-last 720p 8s is $0.234. 5s rate card is $0.0963. */
export function viduQ2ProClipUsd(seconds: number): number {
  if (seconds >= 8) return 0.234;
  if (seconds >= 6) return 0.179;
  return 0.0963;
}

export const ST_SELECTABLE_VIDEO_MODELS = ["vidu:3@2", "vidu:3@1"] as const;

export function isSelectableVideoModel(air: string): air is (typeof ST_SELECTABLE_VIDEO_MODELS)[number] {
  return (ST_SELECTABLE_VIDEO_MODELS as readonly string[]).includes(air);
}

/**
 * What an admin sees before picking a stronger clip model. Only the two Vidu
 * rows are sent to Runware: they share the 720×1280 first+last request we
 * already run. The others are priced from the Runware docs (2026-11-01) and
 * are not wired, because their request shape is different or first+last at
 * 720p is not what the example measured.
 */
export const ST_VIDEO_COST_TABLE = [
  { label: "Vidu Q2 Turbo", air: "vidu:3@2", usd6: 0.1375, wired: true, note: "first+last. 6s estimated; 8s first-last example $0.193" },
  { label: "Vidu Q2 Pro", air: "vidu:3@1", usd6: 0.179, wired: true, note: "published first-frame 720p 6s. First-last 720p 8s is $0.234" },
  { label: "Wan 2.7", air: null, usd6: 0.6, wired: false, note: "$0.10/s at 720p. First-last 7s example $0.708. Not wired" },
  { label: "Seedance 2.5", air: null, usd6: 1.38, wired: false, note: "$0.23/s at 720p. First-last 10s example $2.32. Not wired" },
  { label: "Kling 3.0 Pro", air: null, usd6: 0.672, wired: false, note: "published first-frame 6s. First+last not confirmed. Not wired" },
  { label: "Hailuo 2.3", air: null, usd6: 0.49, wired: false, note: "1080p 6s, not a 720p first-last price. Not wired" },
] as const;

export function clipListUsd(air: string, seconds: number): number {
  if (air === "vidu:3@2") return viduQ2TurboClipUsd(seconds);
  if (air === "vidu:3@1") return viduQ2ProClipUsd(seconds);
  return videoModelSpec(air).usdPerSecond * seconds;
}

/**
 * Expressive QA. Alpha, corners and the seam stay on the subtle bars: a white
 * field, a hole, or an open loop still fails. Drift and pop are looser so a
 * step, a head turn or a fast arm is not a glitch. The stabiliser only removes
 * jitter under `stabilizeJitterPx`; a larger lower-body move is left in the frames.
 */
export const ST_EXPRESSIVE = {
  driftPx: 72,
  consSpikeRatio: 8,
  consSpikeAbs: 40,
  stabilizeJitterPx: 6,
  interiorShiftPx: 96,
  coverageMaxFrac: 0.12,
} as const;

export function qaThresholds(motion: StMotionMode): { [K in keyof typeof ST_QA]: number } {
  if (motion !== "expressive") return ST_QA;
  return { ...ST_QA, driftPx: ST_EXPRESSIVE.driftPx, consSpikeRatio: ST_EXPRESSIVE.consSpikeRatio, consSpikeAbs: ST_EXPRESSIVE.consSpikeAbs };
}

// ── Cost estimate shown before a job starts ──────────────────────────────────
export function estimateExpressionUsd(label: StExpressionLabel, opts: { videoSeconds: number; matteMode: StMatteMode; fps?: number; usdPerSecond?: number; model?: string }): number {
  const edit = label === "neutral" ? 0 : ST_EDIT_MODEL.approxCostUsd;
  const video = opts.model
    ? clipListUsd(opts.model, opts.videoSeconds)
    : opts.usdPerSecond != null
      ? opts.usdPerSecond * opts.videoSeconds
      : clipListUsd(ST_DEFAULT_VIDEO_MODEL, opts.videoSeconds);
  const frames = opts.videoSeconds * (opts.fps ?? ST_VIDEO_MODEL.fps ?? ST_ASSUMED_FPS);
  const matte = opts.matteMode === "runware" ? frames * ST_MATTE_USD_PER_FRAME : 0;
  return edit + video + matte;
}

export function estimateJobUsd(labels: readonly StExpressionLabel[], opts: { videoSeconds: number; matteMode: StMatteMode; usdPerSecond?: number; model?: string }): number {
  return labels.reduce((sum, l) => sum + estimateExpressionUsd(l, opts), 0);
}

export const ST_JOB_STATUSES = ["draft", "base_ready", "running", "done", "partial", "failed", "cancelled"] as const;
export type StJobStatus = (typeof ST_JOB_STATUSES)[number];
export const ST_EXPRESSION_STATUSES = ["queued", "editing", "edited", "video_submitted", "video_ready", "processing", "done", "failed"] as const;
export type StExpressionStatus = (typeof ST_EXPRESSION_STATUSES)[number];
