"use client";

import { useEffect, useState } from "react";

/**
 * Walk cycle in the hero. fetchPriority is low so the headline stays the
 * largest-content candidate; the file is a small animated WebP. Reduced
 * motion shows the still sheet instead of the loop.
 */
export function HeroWalk() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const src = reduced ? "/showcase/sheet-witch-walk.png" : "/showcase/anim-witch-walk.webp";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={reduced ? "Pixel-art witch walk cycle, shown as a still sprite sheet" : "Pixel-art witch walking in a loop"}
      width={256}
      height={256}
      decoding="async"
      fetchPriority="low"
      className="pixel-perfect h-[78%] w-auto max-w-[78%] object-contain"
    />
  );
}
