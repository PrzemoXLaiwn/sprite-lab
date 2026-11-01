// =============================================================================
// ST Packs — one expression's post-processing: clip → looping transparent
// sprite. Pure apart from the optional per-frame Runware matte; the worker in
// jobs.ts handles storage and the database.
// =============================================================================
import type { StExpressionLabel } from "@/config/st-expressions";
import { ST_EXPRESSIVE, ST_PIPELINE, qaThresholds, type StMatteMode, type StMotionMode } from "@/config/st-packs";
import { encodeAnimatedWebp, type WebpResult } from "./encode";
import { decodeVideo, framePng, pngFrame, type CropFraction } from "./frames";
import { makeSeamlessLoop, resampleFps } from "./loop";
import { keyChromaFrames, type Rgb } from "./chroma";
import { clearEdgeBars, estimateBackground, matteAlpha, matteFrames, postMatte } from "./matte";
import { computeQa } from "./qa";
import { stabilizeFrames } from "./stabilize";
import type { Frame, QaResult } from "./types";

export interface ProcessOptions {
  label: StExpressionLabel;
  width: number;
  height: number;
  matteMode: StMatteMode;
  /** Per-frame background removal (matteMode "runware"); returns an RGBA PNG or null. */
  removeBackground?: (png: Buffer) => Promise<Buffer | null>;
  concurrency?: number;
  /** Where the 3:4 still sits in the clip when the model canvas was padded. */
  crop?: CropFraction;
  /** Exact pixels. Default is the HQ lossy encode. */
  lossless?: boolean;
  /** Subtle cancels idle drift. Expressive keeps a real body move and loosens drift/pop QA only. */
  motion?: StMotionMode;
  /** When set, the matte removes this colour everywhere instead of flooding from the border. */
  keyColour?: Rgb | null;
}

export interface ProcessResult {
  frames: Frame[];
  webp: WebpResult;
  qa: QaResult;
  loopMethod: "trim" | "crossfade" | "pingpong";
  stabilize: { maxShift: number; flagged: boolean; residualRangePx: number };
  sourceFps: number;
  sourceFrames: number;
}

export async function processClip(mp4: Buffer, opts: ProcessOptions): Promise<ProcessResult> {
  // Decode at the output size. That is the cropped Vidu frame (720×960), not a
  // 1.5× upscale that would be scaled back down. One `frames` variable is
  // reassigned so the previous stage can be collected — a 4 s clip is 64 frames,
  // about 2.6 MB each at 720×960.
  const decoded = await decodeVideo(mp4, { width: opts.width, height: opts.height, crop: opts.crop, fps: ST_PIPELINE.outputFps });
  const fps = decoded.fps;
  const sourceFrames = decoded.frames.length;
  let frames: Frame[] = decoded.frames;
  decoded.frames = [];

  // Background removal
  if (opts.matteMode === "runware" && opts.removeBackground) {
    const raw = frames;
    const bg = estimateBackground(raw[0]);
    const limit = Math.max(1, opts.concurrency ?? 4);
    const out: Frame[] = new Array(raw.length);
    let next = 0;
    // One retry per frame; a frame the provider still rejects falls back to the
    // colour key (the temporal median then smooths it against its neighbours)
    const worker = async () => {
      while (next < raw.length) {
        const i = next++;
        const png = (await opts.removeBackground!(await framePng(raw[i]))) ?? (await opts.removeBackground!(await framePng(raw[i])));
        // Same backdrop matte as key mode when the provider rejects a frame.
        // postMatte below does the temporal median and the defringe.
        out[i] = png ? await pngFrame(png) : matteAlpha(raw[i]);
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, raw.length) }, worker));
    frames = postMatte(out, bg);
  } else if (opts.keyColour) {
    frames = keyChromaFrames(frames, opts.keyColour);
  } else {
    frames = matteFrames(frames, opts.motion === "expressive"
      ? { interiorShiftMax: ST_EXPRESSIVE.interiorShiftPx, coverageMaxFrac: ST_EXPRESSIVE.coverageMaxFrac }
      : {}).frames;
  }
  // Vidu sometimes paints a near-black letterbox inside the cropped frame.
  // The grey-backdrop flood leaves it opaque, which is the bottom bar and the
  // corner/edge QA flags. A full-width bar is cleared; a dark outfit is not.
  for (const frame of frames) clearEdgeBars(frame);

  // Drift. Expressive only cancels a few pixels of jitter; a step or a lean
  // is the performance, so a larger shift is left in the frames and not flagged.
  const expressive = opts.motion === "expressive";
  const maxShiftPx = expressive ? ST_EXPRESSIVE.stabilizeJitterPx : ST_PIPELINE.stabilizeMaxShiftPx;
  const stab = stabilizeFrames(frames, { band: ST_PIPELINE.stabilizeBand, window: ST_PIPELINE.stabilizeWindow, maxShiftPx });
  frames = stab.frames;
  stab.frames = [];

  // Loop at the clip's fps, then down to the pack's fps
  const bars = qaThresholds(opts.motion ?? "subtle");
  const k = Math.max(2, Math.round(ST_PIPELINE.crossfadeFrames * (fps / 24)));
  // Every label, including joy. A reversed held idle is the last resort when
  // the clip never returns to its start pose; leaving the seam open is worse.
  // Expressive uses the looser pop bar so a motivated return to the still is
  // not played backwards. The seam still has to close.
  const loop = makeSeamlessLoop(frames, {
    k,
    allowPingPong: true,
    duplicateThreshold: ST_PIPELINE.duplicateFrameThreshold,
    popRatio: bars.consSpikeRatio,
    popAbs: bars.consSpikeAbs,
  });
  frames = loop.frames;
  loop.frames = [];
  if (fps !== ST_PIPELINE.outputFps) frames = resampleFps(frames, fps, ST_PIPELINE.outputFps);

  const webp = await encodeAnimatedWebp(frames, ST_PIPELINE.outputFps, { lossless: opts.lossless });
  const qa = computeQa(frames, { fps: ST_PIPELINE.outputFps, bytes: webp.bytes, band: ST_PIPELINE.stabilizeBand }, bars);
  if (stab.flagged && !expressive) {
    qa.flags.push(`drift too large to correct (${stab.maxShift.toFixed(1)} px > ${ST_PIPELINE.stabilizeMaxShiftPx})`);
    qa.flagged = true;
  }
  return {
    frames, webp, qa,
    loopMethod: loop.method,
    stabilize: { maxShift: stab.maxShift, flagged: stab.flagged, residualRangePx: stab.residualRangePx },
    sourceFps: fps,
    sourceFrames,
  };
}
