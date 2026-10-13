"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sandboxed email preview (no scripts). Grows to the email's height once it
 * has loaded; the Width toggle shows the 360px phone layout.
 */
export function EmailFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(900);
  const [narrow, setNarrow] = useState(false);

  const fit = () => {
    try {
      const doc = ref.current?.contentDocument;
      if (doc?.body) setHeight(Math.min(Math.max(doc.documentElement.scrollHeight, 400), 4000));
    } catch {
      /* cross-origin: keep the default height */
    }
  };

  // srcDoc can finish loading before hydration attaches onLoad
  useEffect(() => {
    const t = setTimeout(fit, 300);
    return () => clearTimeout(t);
  }, [html]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5" role="group" aria-label="Preview width">
        {([false, true] as const).map((n) => (
          <button
            key={String(n)}
            type="button"
            onClick={() => { setNarrow(n); setTimeout(fit, 50); }}
            aria-pressed={narrow === n}
            className={`h-10 rounded-lg border px-3 font-mono text-[12px] transition-colors ${
              narrow === n ? "border-[#FF8A3D]/50 bg-[#FF8A3D]/10 text-[#FF9F43]" : "border-white/[0.08] bg-white/[0.03] text-[#8B93A5] hover:text-white"
            }`}
          >
            {n ? "360 px" : "600 px"}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0B0D12]">
        <iframe
          ref={ref}
          title={title}
          srcDoc={html}
          onLoad={fit}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          className="mx-auto block w-full max-w-full border-0"
          style={{ height, width: narrow ? 360 : 600 }}
        />
      </div>
    </div>
  );
}
