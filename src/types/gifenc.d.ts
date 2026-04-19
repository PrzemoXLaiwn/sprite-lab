/**
 * Type declarations for gifenc — the package ships no types and there is
 * no @types/gifenc on npm. Declarations derived from the gifenc source
 * (node_modules/gifenc/dist/gifenc.esm.js v1.0.3) and cover only the
 * surface used by src/lib/image/quantize.ts. Expand if more is needed.
 */
declare module "gifenc" {
  /**
   * Palette format. Controls how gifenc bucket-counts colours during the
   * median-cut pass:
   *   "rgb565"   — 5-6-5-bit RGB, alpha ignored (default). Best for sprites
   *                where alpha is handled externally.
   *   "rgb444"   — 4-4-4-bit RGB.
   *   "rgba4444" — 4-4-4-4-bit RGBA, alpha considered. Palette entries
   *                become 4-tuples [r,g,b,a].
   */
  export type GifencFormat = "rgb565" | "rgb444" | "rgba4444";

  export interface GifencQuantizeOptions {
    format?: GifencFormat;
    /** When format is "rgba4444": pixels with alpha ≤ threshold become (0,0,0,0). Default true. */
    clearAlpha?: boolean;
    /** Replacement RGB when clearAlpha fires. Default 0. */
    clearAlphaColor?: number;
    /** Alpha threshold for clearAlpha. Default 0. */
    clearAlphaThreshold?: number;
    /** Collapse alpha to {0, 255} at the given threshold. `true` = threshold 127. */
    oneBitAlpha?: boolean | number;
    /** Disable sqrt weighting of bucket populations. Default true (enabled). */
    useSqrt?: boolean;
  }

  /**
   * Median-cut-style palette extraction. Returns up to `maxColors` entries.
   * Each entry is [r, g, b] (for rgb565/rgb444) or [r, g, b, a] (for rgba4444).
   */
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: GifencQuantizeOptions
  ): number[][];

  /**
   * Map each RGBA pixel to its nearest palette index. Returns a Uint8Array
   * with length = pixel count. The `format` parameter must match the one
   * passed to `quantize` for the palette to match correctly.
   */
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    format?: GifencFormat
  ): Uint8Array;
}
