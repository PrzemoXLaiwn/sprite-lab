/**
 * Tileability validation — step 8 of the pipeline, tile category only.
 *
 * Checks whether a square sprite's opposite edges match closely enough
 * to tile seamlessly. If both left↔right and top↔bottom mismatch
 * percentages are below `MISMATCH_THRESHOLD`, the tile is declared
 * tileable; otherwise the orchestrator can trigger the reinforced
 * "seamless tileable, edges match" prompt retry path.
 *
 * Algorithm:
 *   - Extract raw RGBA pixels via sharp.
 *   - For each row y, compare pixel (0, y) to pixel (size-1, y).
 *   - For each column x, compare pixel (x, 0) to pixel (x, size-1).
 *   - Per-pair diff: sum of per-channel absolute differences
 *     |Δr| + |Δg| + |Δb| + |Δa|. Above PIXEL_DIFF_THRESHOLD = mismatch.
 *   - Special case: both pixels fully transparent (alpha === 0) →
 *     match, regardless of RGB. BiRefNet output has arbitrary RGB
 *     underneath alpha=0 pixels (often clamped to black but not
 *     guaranteed); treating them as equal avoids false mismatches on
 *     tile edges that happen to have transparent corners.
 *
 * Metric choice: sum-of-abs-diff in RGBA, NOT LAB / perceptual. This
 * is a structural check ("does the seam jump?"), not a colour-match.
 * Fast and sufficient.
 */

import sharp from "sharp";
import { ImageProcessingError } from "../pipeline/errors";
import { logger } from "../logger";

/**
 * Declared-tileable threshold: up to 10% of edge pixels may mismatch
 * before the tile is flagged non-tileable. Exported so the orchestrator
 * can compare directly when deciding whether to trigger the retry path.
 */
export const MISMATCH_THRESHOLD = 0.10;

/**
 * Per-pair channel-sum threshold. `|Δr| + |Δg| + |Δb| + |Δa|` above this
 * counts as a mismatch. 30 ≈ 7–8 units per channel on average. Tunable;
 * raise to tolerate more edge drift, lower for a stricter seam check.
 */
const PIXEL_DIFF_THRESHOLD = 30;

export interface TileabilityResult {
  tileable: boolean;
  leftRightMismatchPct: number;
  topBottomMismatchPct: number;
}

export async function checkTileability(input: Buffer): Promise<TileabilityResult> {
  if (input.length === 0) {
    throw new ImageProcessingError("checkTileability: empty input buffer", {
      context: { inputBytes: 0 },
    });
  }

  const t0 = Date.now();

  let rawData: Buffer;
  let width: number;
  let height: number;
  try {
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    rawData = data;
    width = info.width;
    height = info.height;
  } catch (cause) {
    throw new ImageProcessingError("checkTileability: sharp decode failed", {
      cause,
      context: { inputBytes: input.length },
    });
  }

  if (width !== height) {
    throw new ImageProcessingError(
      `checkTileability: tile must be square, got ${width}×${height}`,
      {
        context: {
          inputBytes: input.length,
          width,
          height,
        },
      }
    );
  }
  if (width < 2) {
    // 0×0 and 1×1 produce trivially-matching edges (or none at all).
    // Surface as a pipeline bug rather than silently returning "tileable".
    throw new ImageProcessingError(
      `checkTileability: tile too small for edge comparison (${width}×${height})`,
      {
        context: {
          inputBytes: input.length,
          width,
          height,
        },
      }
    );
  }

  const size = width;

  // Left vs right: compare column x=0 to column x=size-1, per row.
  let lrMismatch = 0;
  for (let y = 0; y < size; y++) {
    const leftIdx = (y * size) * 4;
    const rightIdx = (y * size + (size - 1)) * 4;
    if (pixelMismatch(rawData, leftIdx, rightIdx)) lrMismatch++;
  }

  // Top vs bottom: compare row y=0 to row y=size-1, per column.
  let tbMismatch = 0;
  for (let x = 0; x < size; x++) {
    const topIdx = x * 4;
    const bottomIdx = ((size - 1) * size + x) * 4;
    if (pixelMismatch(rawData, topIdx, bottomIdx)) tbMismatch++;
  }

  const leftRightMismatchPct = lrMismatch / size;
  const topBottomMismatchPct = tbMismatch / size;
  const tileable =
    leftRightMismatchPct < MISMATCH_THRESHOLD &&
    topBottomMismatchPct < MISMATCH_THRESHOLD;

  const durationMs = Date.now() - t0;
  logger.debug("checkTileability ok", {
    size,
    leftRightMismatchPct,
    topBottomMismatchPct,
    tileable,
    durationMs,
  });

  return { tileable, leftRightMismatchPct, topBottomMismatchPct };
}

/**
 * Returns true if the two pixels at byte offsets `i` and `j` differ beyond
 * the structural threshold. `i` and `j` must each point at the R byte of
 * an RGBA pixel.
 *
 * Short-circuit: both pixels fully transparent (alpha === 0) → not a
 * mismatch, regardless of RGB. See top-of-file rationale.
 */
function pixelMismatch(data: Buffer, i: number, j: number): boolean {
  const a1 = data[i + 3];
  const a2 = data[j + 3];
  if (a1 === 0 && a2 === 0) return false;

  const diff =
    Math.abs(data[i + 0] - data[j + 0]) +
    Math.abs(data[i + 1] - data[j + 1]) +
    Math.abs(data[i + 2] - data[j + 2]) +
    Math.abs(a1 - a2);
  return diff > PIXEL_DIFF_THRESHOLD;
}
