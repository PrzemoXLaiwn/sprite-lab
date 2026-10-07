"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Film, FolderOpen, Gift, Sparkles, X } from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";

type Claim = { granted: true; amount: number; kind: "returning" | "new"; credits: number };

/**
 * Claims the relaunch bonus on the first app visit during the campaign and
 * says so. Rendered by the dashboard layout only for accounts that haven't
 * claimed yet; the server grants it at most once.
 */
export function RelaunchBonus() {
  const [claim, setClaim] = useState<Claim | null>(null);
  const started = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch("/api/relaunch/claim", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.granted) {
          setClaim(data);
          triggerCreditsRefresh();
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!claim) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setClaim(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [claim]);

  if (!claim) return null;
  const returning = claim.kind === "returning";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setClaim(null)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="relaunch-title"
        onClick={(e) => e.stopPropagation()}
        className="pixel-grid relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0E1016] p-6 shadow-2xl"
      >
        <button ref={closeRef} type="button" onClick={() => setClaim(null)} aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-[#8B93A5] hover:bg-white/[0.06] hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF8A3D]/10">
          <Gift className="h-6 w-6 text-[#FF8A3D]" />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#FFB27A]">
          {returning ? "welcome back" : "relaunch bonus"}
        </p>
        <h2 id="relaunch-title" className="mt-1 font-display text-[22px] font-semibold leading-tight text-white">
          +{claim.amount} free credits are yours
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#A6ADBB]">
          {returning
            ? "SpriteLab is back — rebuilt from the ground up. Thanks for sticking around; here's something to try the new generator with."
            : "SpriteLab just relaunched. On top of your 10 starter credits, here are extra credits to explore everything."}
          {" "}You now have <span className="font-semibold tabular-nums text-white">{claim.credits}</span> credits.
        </p>
        <ul className="mt-4 space-y-2 text-[13px] text-[#C9CFDB]">
          <li className="flex items-center gap-2.5"><Sparkles className="h-4 w-4 shrink-0 text-[#FF8A3D]" /> Sprites that follow your prompt, on a clean transparent background</li>
          <li className="flex items-center gap-2.5"><Film className="h-4 w-4 shrink-0 text-[#FF8A3D]" /> Animate any sprite — walk, attack, fire breath</li>
          <li className="flex items-center gap-2.5"><FolderOpen className="h-4 w-4 shrink-0 text-[#FF8A3D]" /> Projects that sort your sprites and export a ready pack</li>
        </ul>
        <div className="mt-6 flex gap-2">
          <Link href="/generate" onClick={() => setClaim(null)}
            className="px-corners inline-flex h-10 flex-1 items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-[13px] font-semibold text-white transition hover:brightness-110">
            <Sparkles className="h-4 w-4" /> Create a sprite
          </Link>
          <button type="button" onClick={() => setClaim(null)}
            className="h-10 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] font-medium text-[#C9CFDB] hover:bg-white/[0.08] hover:text-white">
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
