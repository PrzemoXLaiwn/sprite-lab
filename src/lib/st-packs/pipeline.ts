// =============================================================================
// ST Packs — one expression's post-processing: clip → looping transparent
// sprite. Pure apart from the optional per-frame Runware matte; the worker in
// jobs.ts handles storage and the database.
// =============================================================================
import { PING_PONG_ALLOWED, type StExpressionLabel } from "@/config/st-expressions";
import { ST_PIPELINE, ST_QA, type StMatteMode } from "@/config/st-packs";
import { encodeAnimatedWebp, type WebpResult } from "./encode";
import { decodeVideo, framePng, pngFrame, resizeFrames, type CropFraction } from "./frames";
import { makeSeamlessLoop, resampleFps } from "./loop";
import { estimateBackground, keyFrame, matteFrames, postMatte } from "./matte";
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
}

export interface ProcessResult {
  frames: Frame[];
  webp: WebpResult;
  qa: QaResult;
  loopMethod: "crossfade" | "pingpong";
  stabilize: { maxShift: number; flagged: boolean; residualRangePx: number };
  sourceFps: number;
  sourceFrames: number;
}

/** Working canvas: ~1.5× the output so the matte has detail, 3:4 kept. */
export function workingSize(width: number, height: number): { width: number; height: number } {
  return { width: Math.round(width * ST_PIPELINE.workScale), height: Math.round(height * ST_PIPELINE.workScale) };
}

export async function processClip(mp4: Buffer, opts: ProcessOptions): Promise<ProcessResult> {
  const work = workingSize(opts.width, opts.height);
  // Decode straight at the pack's fps: a 5 s clip is 80 working frames instead of
  // 120–150. Each stage below copies every frame (~4.4 MB each at 912×1215), so
  // one `frames` variable is reassigned and the previous stage can be collected —
  // keeping all six stages alive at once ran the function out of memory.
  const decoded = await decodeVideo(mp4, { width: work.width, height: work.height, crop: opts.crop, fps: ST_PIPELINE.outputFps });
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
        out[i] = png ? await pngFrame(png) : keyFrame(raw[i], bg);
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, raw.length) }, worker));
    frames = postMatte(out, bg);
  } else {
    frames = matteFrames(frames).frames;
  }

  // Drift
  const stab = stabilizeFrames(frames, { band: ST_PIPELINE.stabilizeBand, window: ST_PIPELINE.stabilizeWindow, maxShiftPx: ST_PIPELINE.stabilizeMaxShiftPx });
  frames = stab.frames;
  stab.frames = [];

  // Loop at the clip's fps, then down to the pack's fps
  const k = Math.max(2, Math.round(ST_PIPELINE.crossfadeFrames * (fps / 24)));
  const loop = makeSeamlessLoop(frames, { k, allowPingPong: PING_PONG_ALLOWED.has(opts.label), duplicateThreshold: ST_PIPELINE.duplicateFrameThreshold });
  frames = loop.frames;
  loop.frames = [];
  if (fps !== ST_PIPELINE.outputFps) frames = resampleFps(frames, fps, ST_PIPELINE.outputFps);

  // Final size and file
  frames = await resizeFrames(frames, opts.width, opts.height);
  const webp = await encodeAnimatedWebp(frames, ST_PIPELINE.outputFps);
  const qa = computeQa(frames, { fps: ST_PIPELINE.outputFps, bytes: webp.bytes, band: ST_PIPELINE.stabilizeBand }, ST_QA);
  if (stab.flagged) {
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
