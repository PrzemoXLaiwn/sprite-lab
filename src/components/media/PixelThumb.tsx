import { gallerySrc, showcaseIconSrc, snapThumbWidth, THUMB_WIDTHS, type ThumbWidth } from "@/lib/image/sprite-thumb";

const SRCSET_WIDTHS: ThumbWidth[] = THUMB_WIDTHS.filter((w) => w >= 64);

type PixelThumbProps = {
  src: string;
  alt: string;
  /**
   * CSS `sizes` hint. Gallery cells are about
   * `(max-width: 640px) 45vw, 184px`; a 64px chip is `64px`.
   */
  sizes: string;
  pixel?: boolean;
  className?: string;
  /** Layout width/height in CSS pixels. Reserves the box (no CLS). */
  width?: number;
  height?: number;
};

function srcSetFor(src: string, pixel: boolean): string | undefined {
  const entries = SRCSET_WIDTHS.map((w) => {
    const url = gallerySrc(src, w, pixel);
    // Native files are not width-addressable; a fake srcset would lie.
    if (url === src) return null;
    return `${url} ${w}w`;
  }).filter((entry): entry is string => entry !== null);
  if (entries.length === 0) return undefined;
  return entries.join(", ");
}

/**
 * Sprite tile that downloads a size close to the box on screen.
 * Pixel art uses a nearest-neighbor derivative plus `pixel-perfect`
 * (crisp-edges). Not priority — the LCP image opts in elsewhere.
 */
export function PixelThumb({ src, alt, sizes, pixel = false, className = "", width, height }: PixelThumbProps) {
  // 20px chips have a committed 40×40 file. Don't request the full PNG.
  const iconCandidate = width !== undefined && width <= 40 ? showcaseIconSrc(src) : undefined;
  const icon = iconCandidate && iconCandidate !== src ? iconCandidate : undefined;
  const fallbackWidth = snapThumbWidth(width ? width * 2 : 256);
  const url = icon ?? gallerySrc(src, fallbackWidth, pixel);
  const srcSet = icon ? undefined : srcSetFor(src, pixel);
  const cls = `${className}${pixel ? " pixel-perfect" : ""}`.trim();

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={cls}
    />
  );
}
