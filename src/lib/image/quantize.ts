/**
 * Palette quantization — step 7 of the pipeline.
 *
 * Two modes:
 *   quantizeDerived(buf, N)    — extract an N-colour palette via gifenc's
 *                                median-cut-style quantizer, apply it back
 *                                to the image, return both the PNG and the
 *                                palette (so it can be stored on Asset).
 *   quantizeForced(buf, hex[]) — snap every pixel to the nearest colour in
 *                                a pre-supplied palette. Uses LAB-space
 *                                distance (ΔE76) — perceptual accuracy
 *                                matters here; RGB Euclidean distance
 *                                matches colours wrong for human eyes.
 *
 * Both preserve alpha by reconstruction: the output alpha channel is driven
 * from the INPUT alpha, not gifenc's / the palette's alpha. Opaque pixels
 * receive the quantised RGB with alpha clamped to 255; pixels below the
 * opacity threshold become fully transparent. Sprites exit step 5 with
 * binary alpha in practice, so edge-case handling for semi-transparency
 * is intentionally absent (flag if this changes).
 *
 * LAB conversion reference — Bruce Lindbloom (http://www.brucelindbloom.com).
 * sRGB companding per IEC 61966-2-1, sRGB→XYZ matrix for D65 reference
 * white, XYZ→CIE L*a*b* via the 1976 formula. Distance metric is ΔE76
 * (plain Euclidean in Lab). ΔE2000 is more accurate but ~3× the arithmetic;
 * ΔE76 is the MVP choice — upgrade if forced-palette matches look wrong.
 */

import sharp from "sharp";
import { quantize as gifQuantize, applyPalette } from "gifenc";
import { ImageProcessingError } from "../pipeline/errors";
import { logger } from "../logger";

// ─── Bounds & validation ──────────────────────────────────────────────────

const MIN_DERIVED_PALETTE_SIZE = 2;
const MAX_PALETTE_SIZE = 256;
const ALPHA_OPAQUE_THRESHOLD = 128; // below this → output transparent
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function assertDerivedPaletteSize(n: number): void {
  if (
    !Number.isInteger(n) ||
    n < MIN_DERIVED_PALETTE_SIZE ||
    n > MAX_PALETTE_SIZE
  ) {
    throw new ImageProcessingError(
      `quantizeDerived: paletteSize out of bounds: ${n} (valid: ${MIN_DERIVED_PALETTE_SIZE}..${MAX_PALETTE_SIZE})`,
      { context: { paletteSize: n } }
    );
  }
}

function assertForcedPalette(palette: string[]): void {
  if (!Array.isArray(palette) || palette.length < 1 || palette.length > MAX_PALETTE_SIZE) {
    throw new ImageProcessingError(
      `quantizeForced: palette length out of bounds: ${palette?.length ?? "not-array"} (valid: 1..${MAX_PALETTE_SIZE})`,
      { context: { paletteLength: Array.isArray(palette) ? palette.length : -1 } }
    );
  }
  for (let i = 0; i < palette.length; i++) {
    if (typeof palette[i] !== "string" || !HEX_RE.test(palette[i])) {
      throw new ImageProcessingError(
        `quantizeForced: invalid hex at index ${i}: ${JSON.stringify(palette[i])}`,
        { context: { paletteLength: palette.length, badIndex: i } }
      );
    }
  }
}

function assertBufferNonEmpty(
  buf: Buffer,
  op: "quantizeDerived" | "quantizeForced"
): void {
  if (buf.length === 0) {
    throw new ImageProcessingError(`${op} received empty input buffer`, {
      context: { inputBytes: 0 },
    });
  }
}

// ─── Hex helpers ──────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  // Pre-validated by assertForcedPalette — regex-matched #rrggbb.
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function byteToHex(b: number): string {
  return b.toString(16).padStart(2, "0");
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
}

// ─── sRGB ↔ Lab (D65) ─────────────────────────────────────────────────────

const D65_X = 0.95047;
const D65_Y = 1.0;
const D65_Z = 1.08883;

/** sRGB companding → linear RGB, on [0, 1]. IEC 61966-2-1. */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Lab f(t) — cube root with the standard near-zero linearisation. */
function labF(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/**
 * Convert 8-bit sRGB triple to CIE L*a*b*.
 * L ≈ [0, 100], a/b roughly [-128, 127].
 */
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);

  // Linear RGB → XYZ (D65, sRGB primaries).
  const X = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const Y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const Z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;

  const fx = labF(X / D65_X);
  const fy = labF(Y / D65_Y);
  const fz = labF(Z / D65_Z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** ΔE76 squared — Euclidean in Lab. Squared form avoids a sqrt in the hot loop. */
function deltaE76Sq(
  a: readonly [number, number, number],
  b: readonly [number, number, number]
): number {
  const dL = a[0] - b[0];
  const dA = a[1] - b[1];
  const dB = a[2] - b[2];
  return dL * dL + dA * dA + dB * dB;
}

// ─── PNG ↔ raw RGBA helpers ───────────────────────────────────────────────

interface RawImage {
  data: Buffer;
  width: number;
  height: number;
}

async function pngToRawRgba(pngBuf: Buffer): Promise<RawImage> {
  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function rawRgbaToPng(raw: RawImage): Promise<Buffer> {
  return sharp(raw.data, {
    raw: { width: raw.width, height: raw.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

// ─── quantizeDerived (median-cut via gifenc) ──────────────────────────────

/**
 * Extract an N-colour palette from the OPAQUE pixels of the image, then
 * re-encode the full image using that palette (keeping transparent pixels
 * transparent). Returns the PNG and the palette as hex strings.
 *
 * Transparency handling:
 *   - Palette extraction runs on opaque-only pixels (alpha ≥ 128), so the
 *     palette budget is never wasted on "tint of black" slots that would
 *     represent the transparent area. Critical for low-opacity sprites
 *     (icons, thin assets) where most pixels are transparent and the
 *     budget would otherwise be stolen by BG-removal's (0,0,0) backfill.
 *   - applyPalette still runs over the full image — every pixel gets
 *     indexed, but the reconstruction loop discards indices for pixels
 *     that were originally transparent, emitting (0,0,0,0) instead.
 *
 * Edge case:
 *   - Entirely-transparent input → ImageProcessingError. Indicates an
 *     upstream pipeline bug (BG-removal / pixelation shouldn't produce a
 *     fully transparent sprite); surfacing it is safer than silently
 *     returning an empty palette with a transparent PNG.
 *
 * Notes:
 *   - The returned `palette.length` is NOT guaranteed to equal `paletteSize`
 *     — gifenc returns fewer entries if the opaque pixels contain fewer
 *     distinct colours. The debug log surfaces both numbers.
 */
export async function quantizeDerived(
  input: Buffer,
  paletteSize: number
): Promise<{ buffer: Buffer; palette: string[] }> {
  assertDerivedPaletteSize(paletteSize);
  assertBufferNonEmpty(input, "quantizeDerived");

  const t0 = Date.now();
  let output: Buffer;
  let paletteHex: string[];
  try {
    const raw = await pngToRawRgba(input);
    const pxCount = raw.width * raw.height;

    // gifenc requires a Uint8Array. Node Buffer is a Uint8Array but must be
    // viewed without its offset for .buffer access to line up — use Uint8Array
    // construction with explicit byteOffset/byteLength.
    const rgbaView = new Uint8Array(
      raw.data.buffer,
      raw.data.byteOffset,
      raw.data.byteLength
    );

    // Build opaque-only RGBA buffer for palette extraction. Without this,
    // transparent pixels' underlying RGB (typically 0,0,0 from BiRefNet
    // output) votes during clustering and steals palette slots from real
    // sprite colours — destructive on low-opacity sprites.
    let opaqueCount = 0;
    for (let i = 0; i < pxCount; i++) {
      if (raw.data[i * 4 + 3] >= ALPHA_OPAQUE_THRESHOLD) opaqueCount++;
    }

    if (opaqueCount === 0) {
      throw new ImageProcessingError(
        "quantizeDerived: input is entirely transparent (no opaque pixels to quantize)",
        {
          context: {
            paletteSize,
            inputBytes: input.length,
            width: raw.width,
            height: raw.height,
          },
        }
      );
    }

    const opaqueBuf = new Uint8Array(opaqueCount * 4);
    {
      let w = 0;
      for (let i = 0; i < pxCount; i++) {
        if (raw.data[i * 4 + 3] >= ALPHA_OPAQUE_THRESHOLD) {
          opaqueBuf[w + 0] = raw.data[i * 4 + 0];
          opaqueBuf[w + 1] = raw.data[i * 4 + 1];
          opaqueBuf[w + 2] = raw.data[i * 4 + 2];
          // Alpha slot — gifenc's "rgb565" ignores it; 255 is the honest value.
          opaqueBuf[w + 3] = 255;
          w += 4;
        }
      }
    }

    const palette = gifQuantize(opaqueBuf, paletteSize, { format: "rgb565" });

    // applyPalette runs over the FULL image — transparent pixels get indexed
    // to their nearest palette colour, but the reconstruction loop below
    // discards those indices based on the original alpha.
    const indexed = applyPalette(rgbaView, palette, "rgb565");

    // Reconstruct output: palette RGB + alpha from the original pixel, with
    // sub-threshold alpha forced to fully transparent black.
    const out = Buffer.alloc(pxCount * 4);
    for (let i = 0; i < pxCount; i++) {
      const srcAlpha = raw.data[i * 4 + 3];
      if (srcAlpha < ALPHA_OPAQUE_THRESHOLD) {
        // out[i*4 .. i*4+3] already zero from Buffer.alloc
        continue;
      }
      const entry = palette[indexed[i]];
      out[i * 4 + 0] = entry[0];
      out[i * 4 + 1] = entry[1];
      out[i * 4 + 2] = entry[2];
      out[i * 4 + 3] = 255;
    }

    output = await rawRgbaToPng({
      data: out,
      width: raw.width,
      height: raw.height,
    });
    paletteHex = palette.map((c) => rgbToHex(c[0], c[1], c[2]));
  } catch (cause) {
    // Don't double-wrap: the all-transparent check throws ImageProcessingError
    // inside this try block, and we want it to surface with its own context.
    if (cause instanceof ImageProcessingError) throw cause;
    throw new ImageProcessingError("quantizeDerived failed", {
      cause,
      context: {
        paletteSize,
        inputBytes: input.length,
      },
    });
  }
  const durationMs = Date.now() - t0;

  logger.debug("quantizeDerived ok", {
    inputBytes: input.length,
    outputBytes: output.length,
    paletteSize,
    derivedColorCount: paletteHex.length,
    durationMs,
  });

  return { buffer: output, palette: paletteHex };
}

// ─── quantizeForced (LAB-space nearest from fixed palette) ────────────────

/**
 * Snap every opaque pixel to the nearest colour in `palette` using LAB
 * Euclidean distance (ΔE76). The palette is used exactly as supplied —
 * no re-derivation — so outputs are reproducible for Game Boy DMG,
 * PICO-8, DB16, and any user-supplied palette.
 */
export async function quantizeForced(
  input: Buffer,
  palette: string[]
): Promise<Buffer> {
  assertForcedPalette(palette);
  assertBufferNonEmpty(input, "quantizeForced");

  const t0 = Date.now();
  let output: Buffer;
  try {
    // Precompute palette in RGB and Lab once per call, not per pixel.
    const paletteRgb: Array<[number, number, number]> = palette.map(hexToRgb);
    const paletteLab: Array<[number, number, number]> = paletteRgb.map(([r, g, b]) =>
      rgbToLab(r, g, b)
    );

    const raw = await pngToRawRgba(input);
    const pxCount = raw.width * raw.height;
    const out = Buffer.alloc(pxCount * 4);

    for (let i = 0; i < pxCount; i++) {
      const srcAlpha = raw.data[i * 4 + 3];
      if (srcAlpha < ALPHA_OPAQUE_THRESHOLD) continue; // leave as (0,0,0,0)

      const pixelLab = rgbToLab(
        raw.data[i * 4 + 0],
        raw.data[i * 4 + 1],
        raw.data[i * 4 + 2]
      );

      let bestIdx = 0;
      let bestDist = Infinity;
      for (let p = 0; p < paletteLab.length; p++) {
        const d = deltaE76Sq(pixelLab, paletteLab[p]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = p;
        }
      }

      const [pr, pg, pb] = paletteRgb[bestIdx];
      out[i * 4 + 0] = pr;
      out[i * 4 + 1] = pg;
      out[i * 4 + 2] = pb;
      out[i * 4 + 3] = 255;
    }

    output = await rawRgbaToPng({
      data: out,
      width: raw.width,
      height: raw.height,
    });
  } catch (cause) {
    throw new ImageProcessingError("quantizeForced failed", {
      cause,
      context: {
        paletteLength: palette.length,
        inputBytes: input.length,
      },
    });
  }
  const durationMs = Date.now() - t0;

  logger.debug("quantizeForced ok", {
    inputBytes: input.length,
    outputBytes: output.length,
    paletteSize: palette.length,
    durationMs,
  });

  return output;
}
