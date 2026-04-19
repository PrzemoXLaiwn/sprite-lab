/**
 * Nearest-neighbor image resizing for the pipeline's pixelation stage.
 *
 * Two operations exposed:
 *   pixelate(buf, N)           — step 6. Downsamples to N×N using nearest-
 *                                 neighbor. This is THE step that turns a
 *                                 1024² AI-stylised image into a pixel-art
 *                                 sprite. Without it the output is "AI art
 *                                 at small scale", not a sprite.
 *   upscaleForDisplay(buf, N)  — step 10. Upscales the sprite back to N×N
 *                                 (typically 1024) for UI display so the
 *                                 gallery doesn't render the native 32²
 *                                 and let the browser smooth it into mush.
 *
 * Both are opinionated with zero knobs: PNG output, nearest-neighbor kernel,
 * "contain" fit with transparent padding. Do NOT add options parameters —
 * the pipeline has one correct behaviour here and this file is its
 * single enforcement point.
 *
 * Kernel choice is non-negotiable. Any kernel other than `sharp.kernel.nearest`
 * (cubic, mitchell, lanczos2/3) produces smooth / anti-aliased output that
 * defeats the entire point of pixelation. The spec for module 2 calls out
 * `kernel.nearest, NO other kernel ever`; this file is where that is enforced.
 */

import sharp from "sharp";
import { ImageProcessingError } from "../pipeline/errors";
import { logger } from "../logger";

const MIN_SIZE = 1;
const MAX_SIZE = 2048;

/**
 * Fully transparent pad colour for `fit: "contain"` when the input is
 * non-square. Preserves any alpha channel from step 5's BG removal.
 */
const TRANSPARENT_BG = { r: 0, g: 0, b: 0, alpha: 0 };

function assertSize(size: number, name: "targetSize" | "displaySize"): void {
  if (!Number.isFinite(size) || size < MIN_SIZE || size > MAX_SIZE) {
    throw new ImageProcessingError(
      `${name} out of bounds: ${size} (valid: ${MIN_SIZE}..${MAX_SIZE})`,
      { context: { [name]: size } }
    );
  }
}

function assertBufferNonEmpty(buf: Buffer, op: "pixelate" | "upscaleForDisplay"): void {
  if (buf.length === 0) {
    throw new ImageProcessingError(`${op} received empty input buffer`, {
      context: { inputBytes: 0 },
    });
  }
}

/**
 * Step 6: nearest-neighbor downsample to `targetSize × targetSize`.
 *
 * Alpha channel is preserved (step 5 already produced a transparent BG).
 * Non-square inputs are centred with transparent padding so the output
 * is always square without distortion.
 *
 * Throws `ImageProcessingError` on:
 *   - empty input buffer
 *   - targetSize outside 1..2048
 *   - any sharp failure (wrapped with `cause` + context)
 */
export async function pixelate(input: Buffer, targetSize: number): Promise<Buffer> {
  assertSize(targetSize, "targetSize");
  assertBufferNonEmpty(input, "pixelate");

  const t0 = Date.now();
  let output: Buffer;
  try {
    // fit: "contain" gracefully handles non-square inputs with transparent padding.
    // Currently step 4 always sends 1024×1024 (enforced by types.ts ImageInferenceRequest),
    // so this is effectively a no-op — but the behavior is here for correctness.
    // If non-square inputs become intentional (e.g. landscape scene assets), revisit
    // whether padding or cropping is the desired semantic.
    output = await sharp(input)
      .resize(targetSize, targetSize, {
        kernel: sharp.kernel.nearest,
        fit: "contain",
        background: TRANSPARENT_BG,
      })
      .png()
      .toBuffer();
  } catch (cause) {
    throw new ImageProcessingError("pixelate: sharp resize failed", {
      cause,
      context: {
        targetSize,
        inputBytes: input.length,
      },
    });
  }
  const durationMs = Date.now() - t0;

  logger.debug("pixelate ok", {
    inputBytes: input.length,
    targetSize,
    outputBytes: output.length,
    durationMs,
  });

  return output;
}

/**
 * Step 10: nearest-neighbor upscale to `displaySize × displaySize`, for
 * the UI display variant only. The canonical download asset is the raw
 * output of `pixelate()` at its native pixel size; this upscaled copy
 * exists purely so browsers don't soft-scale the sprite in the gallery.
 *
 * Same kernel as pixelate — hard pixel edges preserved during upscale.
 *
 * Throws `ImageProcessingError` on:
 *   - empty input buffer
 *   - displaySize outside 1..2048
 *   - any sharp failure (wrapped with `cause` + context)
 */
export async function upscaleForDisplay(input: Buffer, displaySize: number): Promise<Buffer> {
  assertSize(displaySize, "displaySize");
  assertBufferNonEmpty(input, "upscaleForDisplay");

  const t0 = Date.now();
  let output: Buffer;
  try {
    // fit: "contain" gracefully handles non-square inputs with transparent padding.
    // Currently step 4 always sends 1024×1024 (enforced by types.ts ImageInferenceRequest),
    // so this is effectively a no-op — but the behavior is here for correctness.
    // If non-square inputs become intentional (e.g. landscape scene assets), revisit
    // whether padding or cropping is the desired semantic.
    output = await sharp(input)
      .resize(displaySize, displaySize, {
        kernel: sharp.kernel.nearest,
        fit: "contain",
        background: TRANSPARENT_BG,
      })
      .png()
      .toBuffer();
  } catch (cause) {
    throw new ImageProcessingError("upscaleForDisplay: sharp resize failed", {
      cause,
      context: {
        displaySize,
        inputBytes: input.length,
      },
    });
  }
  const durationMs = Date.now() - t0;

  logger.debug("upscaleForDisplay ok", {
    inputBytes: input.length,
    displaySize,
    outputBytes: output.length,
    durationMs,
  });

  return output;
}
