"use client";

import { useEffect, useRef } from "react";

/** Muted looping clip that only loads and plays while it is on screen. */
export function InViewVideo({ src, poster, label, className }: { src: string; poster: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        // The poster is a real JPEG. Leave it off until the card is on screen
        // so the homepage does not download three covers during first paint.
        if (!v.poster) v.poster = poster;
        if (reduce) return;
        if (!v.src) v.src = src;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, [src, poster]);

  return (
    <video ref={ref} muted loop playsInline preload="none" aria-label={label} className={className} />
  );
}
