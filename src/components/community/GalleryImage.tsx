"use client";

/**
 * Gallery tile image with a fixed-size pulse placeholder.
 * The parent must be `relative` (and `group`) with a set aspect ratio so the
 * placeholder cannot shift layout while the file loads.
 */
export function GalleryImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 animate-pulse bg-white/[0.07] transition-opacity duration-300 group-has-[img.is-ready]:opacity-0"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) node.classList.add("is-ready");
        }}
        onLoad={(event) => event.currentTarget.classList.add("is-ready")}
        className={className}
      />
    </>
  );
}
