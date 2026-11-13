"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * A CSS background that is not requested until the box nears the viewport.
 * A stylesheet url() is fetched as soon as the element is in the document,
 * which pulled the direction sheet onto the homepage's first load.
 */
export function LazyBackground({
  url,
  className,
  style,
}: {
  url: string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setShown(true);
      io.disconnect();
    }, { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={className}
      style={shown ? { ...style, backgroundImage: `url("${url}")` } : style}
    />
  );
}
