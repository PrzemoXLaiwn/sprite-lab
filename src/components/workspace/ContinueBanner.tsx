"use client";

/**
 * "Continue where you left off": a small dismissible card that points back to
 * the last session in another tool (e.g. on Create after leaving an
 * animation half-done), plus the note a tool shows after it reopened the
 * previous session by itself.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, History, X } from "lucide-react";
import type { WorkspaceTool } from "@/lib/workspace/history";
import { dismissLastActivity, LAST_ACTIVITY_KEY, parseLastActivity } from "@/lib/workspace/session";
import { useStoredRaw } from "@/components/workspace/restore";

const VERB: Record<WorkspaceTool, string> = {
  create: "Continue creating",
  animate: "Continue animating",
  edit: "Continue editing",
};

/** Shown in a tool when the last session was in a different tool. */
export function ContinueBanner({ current }: { current: WorkspaceTool }) {
  // Read during render (null on the server, so nothing shows until hydrated).
  // Captured once per mount: this page's own saves shouldn't swap the card.
  const raw = useStoredRaw(LAST_ACTIVITY_KEY);
  const [hidden, setHidden] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  if (raw !== null && captured === null) setCaptured(raw);
  const last = useMemo(() => parseLastActivity(captured), [captured]);

  if (!last || hidden || last.dismissed || last.tool === current) return null;
  const dismiss = () => {
    dismissLastActivity();
    setHidden(true);
  };

  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#151922] p-1.5 pr-1">
      <Link href={last.href}
        className="group flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 transition-colors hover:bg-white/[0.04]">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-[#0E1016]"
          style={{ backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)", backgroundSize: "8px 8px" }}>
          {last.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={last.thumbUrl} alt="" className={`h-full w-full object-contain p-0.5 ${last.pixel ? "pixel-perfect" : ""}`} />
          ) : (
            <History className="h-4 w-4 text-[#8B93A5]" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#FFB27A]">{VERB[last.tool]}</span>
          <span className="block truncate text-[12.5px] text-[#C9CFDB]" title={last.title}>{last.title || "Your last session"}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-[#8B93A5] transition-colors group-hover:text-white" aria-hidden />
      </Link>
      <button type="button" onClick={dismiss} aria-label="Dismiss"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#8B93A5] transition-colors hover:bg-white/[0.06] hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** "Picked up where you left off · Start fresh" after an automatic restore. */
export function RestoredNote({ onStartFresh, onDismiss }: { onStartFresh: () => void; onDismiss: () => void }) {
  return (
    <div role="status" className="flex items-center gap-2 rounded-xl border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] py-1 pl-3 pr-1 text-[12px] text-[#ECEEF3]">
      <History className="h-3.5 w-3.5 shrink-0 text-[#FFB27A]" aria-hidden />
      <span className="min-w-0 flex-1 leading-snug">Picked up where you left off.</span>
      <button type="button" onClick={onStartFresh}
        className="min-h-10 shrink-0 rounded-lg px-2.5 font-semibold text-[#FFB27A] transition-colors hover:bg-white/[0.04] hover:text-white lg:min-h-8">
        Start fresh
      </button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#8B93A5] transition-colors hover:bg-white/[0.06] hover:text-white lg:h-8 lg:w-8">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
