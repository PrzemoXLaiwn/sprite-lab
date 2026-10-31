"use client";

import { useEffect } from "react";
import Link from "next/link";
import { track, FUNNEL } from "@/lib/analytics";

/** Points a new sprite at animation and directions — the actions payers use. */
export function FirstSessionNextStep({ generationId, onDismiss }: { generationId: string; onDismiss: () => void }) {
  const href = `/animate?id=${encodeURIComponent(generationId)}`;

  useEffect(() => {
    track(FUNNEL.upsellShown, { reason: "first_success", offer: "animate" });
  }, []);

  return (
    <div className="rounded-[10px] border border-[#FFA300]/35 bg-[#FFA300]/10 px-3 py-3">
      <p className="text-[13.5px] font-semibold text-white">This character can walk.</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[#C8CCE8]">
        Animate a walk cycle, or turn the same sprite to face 4 or 8 directions. The frames stay one size, on a transparent sheet.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={href}
          onClick={() => track(FUNNEL.upsellClick, { reason: "first_success", offer: "animate" })}
          className="inline-flex h-10 items-center rounded-[8px] bg-[#FFA300] px-3 text-[13px] font-semibold text-[#131A31] hover:bg-[#FFB733]"
        >
          Animate
        </Link>
        <Link
          href={href}
          onClick={() => track(FUNNEL.upsellClick, { reason: "first_success", offer: "directions" })}
          className="inline-flex h-10 items-center rounded-[8px] border border-white/[0.14] px-3 text-[13px] font-semibold text-[#FFF1E8] hover:bg-white/[0.06]"
        >
          4 and 8 directions
        </Link>
        <button type="button" onClick={onDismiss} className="inline-flex h-10 items-center px-2 text-[13px] text-[#A7ADD4] hover:text-white">
          Not now
        </button>
      </div>
    </div>
  );
}
