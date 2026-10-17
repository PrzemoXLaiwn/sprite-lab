/**
 * Display URLs for sprite thumbnails.
 *
 * Gallery cells are ~62–184 CSS pixels, but the files behind them are often
 * 1024×1024 PNGs (up to ~4 MB). Pixel art must stay on a hard grid, so these
 * thumbs are resized with a nearest-neighbor kernel (see /api/sprite-thumb)
 * and painted with `image-rendering: pixelated`. That is intentionally not
 * Vercel Image Optimization, which resamples with a smooth kernel and bills
 * a transformation per source image.
 *
 * Full-size originals stay on the `src` passed in by the caller — use them
 * for download / "open original", not for the grid.
 */

export const THUMB_WIDTHS = [40, 64, 128, 256, 512] as const;
export type ThumbWidth = (typeof THUMB_WIDTHS)[number];

/** Public R2 bucket that serves generated sprites (also via R2_PUBLIC_URL). */
export const R2_PUBLIC_HOST = "pub-6411769b95ba423f9b01e8987f6d6e34.r2.dev";

/**
 * 20px hero chips. fox-mage.png is 384×384 / ~145 KB; a 40×40 (2×) stand-in
 * is a couple of KB. The other three are already tiny native pixel PNGs —
 * the 40px file is still what the chip should request so the full sheet is
 * never preloaded.
 */
export const SHOWCASE_ICON_40: Record<string, string> = {
  "/showcase/fox-mage.png": "/showcase/w40/fox-mage.webp",
  "/showcase/knight.png": "/showcase/w40/knight.webp",
  "/showcase/fire-sword.png": "/showcase/w40/fire-sword.webp",
  "/showcase/health-potion.png": "/showcase/w40/health-potion.webp",
};

/** 8-direction sheet. CSS background; lossless WebP, same pixel grid. */
export const ROTATE_LIZARD_SHEET = "/showcase/rotate-lizard.webp";

const NATIVE_PIXEL = new Set([
  "/showcase/knight.png",
  "/showcase/fire-sword.png",
  "/showcase/flame-blade.png",
  "/showcase/goblin-archer.png",
  "/showcase/health-potion.png",
  "/showcase/slime.png",
  "/showcase/ice-staff.png",
  "/showcase/armored-knight.png",
  "/showcase/icon-1.png",
  "/showcase/icon-2.png",
  "/showcase/icon-3.png",
  "/showcase/icon-4.png",
  "/showcase/tile-grass.png",
  "/showcase/tile-stone-wall.png",
  "/showcase/tile-water.png",
]);

export function snapThumbWidth(width: number): ThumbWidth {
  const want = Number.isFinite(width) && width > 0 ? width : 256;
  for (const candidate of THUMB_WIDTHS) {
    if (candidate >= want) return candidate;
  }
  return THUMB_WIDTHS[THUMB_WIDTHS.length - 1];
}

export function isRemoteSpriteUrl(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname.toLowerCase() === R2_PUBLIC_HOST;
  } catch {
    return false;
  }
}

/** Local pixel sprites already stored at native resolution (about 1 KB). */
export function isNativePixelFile(src: string): boolean {
  return NATIVE_PIXEL.has(src);
}

export function thumbUrl(src: string, width: number, pixel: boolean): string {
  const params = new URLSearchParams({
    src,
    w: String(snapThumbWidth(width)),
    k: pixel ? "nearest" : "smooth",
  });
  return `/api/sprite-thumb?${params.toString()}`;
}

/**
 * URL to put in a gallery `<img>`. Small native pixel files stay as-is
 * (CSS nearest-neighbor scales them). Everything else goes through the
 * thumbnail route at `width` (device pixels).
 */
export function gallerySrc(src: string, width: number, pixel: boolean): string {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src;
  if (/\.gif($|\?)/i.test(src)) return src;
  if (pixel && isNativePixelFile(src)) return src;
  if (src.startsWith("/showcase/") || src.startsWith("/styles/") || isRemoteSpriteUrl(src)) {
    return thumbUrl(src, width, pixel);
  }
  return src;
}

/** 20px chips: the 40×40 derivative, never the full PNG. */
export function showcaseIconSrc(src: string): string {
  return SHOWCASE_ICON_40[src] ?? src;
}
