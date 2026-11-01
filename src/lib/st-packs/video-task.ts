// =============================================================================
// ST Packs — the Runware videoInference body
// =============================================================================
// Vidu Q2 Turbo (vidu:3@2) accepts two frameImages. The same edited still is
// the first frame and the last, so the clip is asked to finish on the pose it
// started on. That is one video task, not a second image and not a longer
// clip: 720p × 4 s stays $0.0825. LTX-2.3 Fast takes the same pair.

export interface StVideoTaskInput {
  taskUUID: string;
  model: string;
  prompt: string;
  /** Data URI of the edited still. Sent as both the opening and closing frame. */
  stillDataUri: string;
  width: number;
  height: number;
  seconds: number;
  /** Omitted for models that fix their own frame rate. */
  fps?: number | null;
  /** Provider-specific request fields (settings, providerSettings). */
  extra?: Record<string, unknown>;
}

/** Vidu Q2 Turbo rejects a positivePrompt longer than this. Ours is well under it. */
export const ST_VIDEO_PROMPT_MAX = 2000;

export function buildStVideoTask(opts: StVideoTaskInput): Record<string, unknown> {
  const still = opts.stillDataUri;
  return {
    taskType: "videoInference",
    taskUUID: opts.taskUUID,
    model: opts.model,
    positivePrompt: opts.prompt.slice(0, ST_VIDEO_PROMPT_MAX),
    width: opts.width,
    height: opts.height,
    duration: opts.seconds,
    ...(opts.fps ? { fps: opts.fps } : {}),
    ...(opts.extra ?? {}),
    // After `extra`, so a provider setting cannot drop the pinned frames.
    inputs: {
      frameImages: [
        { image: still, frame: "first" },
        { image: still, frame: "last" },
      ],
    },
    outputFormat: "MP4",
    outputQuality: 95,
    deliveryMethod: "async",
    includeCost: true,
    numberResults: 1,
  };
}
