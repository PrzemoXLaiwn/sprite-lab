"use client";

import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";

/** Small-screen section menu for SiteNav. Closes on link tap, Escape and outside click. */
export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: Event) => {
      const d = ref.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, []);

  return (
    <details ref={ref} className="group relative lg:hidden">
      <summary
        aria-label="Menu"
        className="ml-1 flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-white/[0.08] text-[#C9CFDB] transition-colors hover:text-white [&::-webkit-details-marker]:hidden"
      >
        <Menu className="h-[18px] w-[18px] group-open:hidden" aria-hidden="true" />
        <X className="hidden h-[18px] w-[18px] group-open:block" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 top-[calc(100%+12px)] w-56 rounded-2xl border border-white/[0.08] bg-[#0E1016] p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
        {links.map((l) => (
          <a key={l.label} href={l.href} onClick={() => { if (ref.current) ref.current.open = false; }}
            className="flex h-11 items-center rounded-xl px-3 font-mono text-[13px] text-[#C9CFDB] transition-colors hover:bg-white/[0.05] hover:text-white">
            {l.label}
          </a>
        ))}
      </div>
    </details>
  );
}
