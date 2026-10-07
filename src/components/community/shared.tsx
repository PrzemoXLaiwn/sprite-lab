import type { CSSProperties } from "react";

/** Checkerboard backdrop for transparent sprite tiles. */
export const CHECKERBOARD: CSSProperties = {
  backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)",
  backgroundSize: "16px 16px",
};

/** Pixel-art styles must render with nearest-neighbour scaling. */
export const isPixelStyleId = (styleId?: string | null): boolean =>
  !!styleId && styleId.toUpperCase().includes("PIXEL");

/**
 * Round avatar with an initial-letter fallback. Hook-free so it works in both
 * server and client components.
 */
export function CommunityAvatar({
  src,
  name,
  size = 20,
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.42)) };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" style={style} className={`shrink-0 rounded-full object-cover ${className}`} />
    );
  }
  return (
    <span
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF8A3D] to-[#E0562A] font-semibold leading-none text-white ${className}`}
    >
      {(name?.trim()?.[0] || "?").toUpperCase()}
    </span>
  );
}
