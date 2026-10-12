/**
 * Client-side helpers for pixel-art sprites.
 *
 * Pixel-art sprites are stored upscaled by an integer factor. These helpers
 * detect that factor (largest f in 64..2 where every f×f block is a single
 * colour, sampled at block corners) and downscale the image back to its true
 * art-pixel resolution with nearest-neighbour sampling. Mirrors
 * `downloadNative` in src/components/generate/GenerateWorkspace.tsx.
 */

export function isPixelStyleId(styleId: string | null | undefined): boolean {
  if (!styleId) return false;
  return styleId.toUpperCase().includes("PIXEL");
}

/** Largest integer upscale factor of the image data (1 when none is found). */
export function detectUpscaleFactor(data: Uint8ClampedArray, width: number, height: number): number {
  const px = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return (data[i] << 24) ^ (data[i + 1] << 16) ^ (data[i + 2] << 8) ^ data[i + 3];
  };
  const uniform = (f: number) => {
    for (let by = 0; by < height; by += f) {
      for (let bx = 0; bx < width; bx += f) {
        const c = px(bx, by);
        const x2 = Math.min(bx + f - 1, width - 1);
        const y2 = Math.min(by + f - 1, height - 1);
        if (px(x2, by) !== c) return false;
        if (px(bx, y2) !== c) return false;
        if (px(x2, y2) !== c) return false;
      }
    }
    return true;
  };
  for (let f = 64; f >= 2; f--) {
    if (width % f === 0 && height % f === 0 && uniform(f)) return f;
  }
  return 1;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas-toblob-failed"))), "image/png")
  );
}

/**
 * Downscale an upscaled pixel-art PNG blob to its native resolution.
 * Returns the original blob (factor 1) when no upscale is detected.
 */
export async function toNativePixelBlob(blob: Blob): Promise<{ blob: Blob; width: number; height: number; factor: number }> {
  const bitmap = await createImageBitmap(blob);
  try {
    const probe = document.createElement("canvas");
    probe.width = bitmap.width;
    probe.height = bitmap.height;
    const pctx = probe.getContext("2d", { willReadFrequently: true });
    if (!pctx) throw new Error("canvas-2d-unavailable");
    pctx.drawImage(bitmap, 0, 0);
    const { data, width, height } = pctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const factor = detectUpscaleFactor(data, width, height);
    if (factor === 1) return { blob, width, height, factor };

    const out = document.createElement("canvas");
    out.width = Math.round(width / factor);
    out.height = Math.round(height / factor);
    const octx = out.getContext("2d");
    if (!octx) throw new Error("canvas-2d-unavailable");
    octx.imageSmoothingEnabled = false;
    octx.drawImage(bitmap, 0, 0, out.width, out.height);
    return { blob: await canvasToPng(out), width: out.width, height: out.height, factor };
  } finally {
    bitmap.close();
  }
}
