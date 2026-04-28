// =============================================================================
// SpriteLab — pixel-snap post-processing
// =============================================================================
// FLUX produces images that LOOK pixelated (visible blocky shading) but
// don't actually live on a fixed pixel grid — zoom in and you'll see
// anti-aliased gradients, sub-pixel edges, and inconsistent pixel sizes.
// Game engines ingesting that output still treat it as a smooth bitmap.
//
// This module forces a real pixel grid:
//   1. Fetch the upstream image (Runware URL or Buffer).
//   2. Nearest-neighbor downsample to the style's native resolution
//      (e.g. 64x64 for PIXEL_ART_16). All sub-pixel detail collapses
//      into discrete pixels.
//   3. Nearest-neighbor upsample back to 1024x1024 so the asset is
//      crisp at the size the rest of the pipeline expects.
//
// The result: an actual pixel-art sprite with hard edges and a fixed
// palette resolution, ready for nearest-neighbor scaling in any engine.
// =============================================================================

import sharp from "sharp";

export interface PixelateOptions {
  /**
   * Native pixel-grid resolution. The image is downsampled to this size
   * first; everything beyond this resolution is collapsed to a single
   * pixel. Pick per style:
   *   - 32  → NES / Game Boy era
   *   - 48  → SNES sprite chunk
   *   - 64  → "16-bit" detail level
   *   - 96  → late-SNES / GBA
   *   - 128 → modern indie pixel art
   */
  gridSize: 32 | 48 | 64 | 96 | 128 | 192 | 256;
  /**
   * Final upscaled output size (square). Defaults to 1024.
   */
  outputSize?: number;
}

/**
 * Pixelate an image buffer or remote URL.
 * Returns a PNG buffer at `outputSize × outputSize`.
 *
 * Throws if the source can't be fetched / decoded.
 */
export async function pixelateImage(
  source: Buffer | string,
  options: PixelateOptions
): Promise<Buffer> {
  const { gridSize, outputSize = 1024 } = options;

  const inputBuffer =
    typeof source === "string" ? await fetchImageBuffer(source) : source;

  // Step 1: collapse to native grid (nearest neighbor preserves pixel art).
  const downsampled = await sharp(inputBuffer)
    .resize(gridSize, gridSize, { kernel: "nearest", fit: "fill" })
    .png()
    .toBuffer();

  // Step 2: upscale with nearest neighbor so pixels stay crisp at 1024.
  return sharp(downsampled)
    .resize(outputSize, outputSize, { kernel: "nearest", fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status}): ${url.substring(0, 80)}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
