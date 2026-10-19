"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swords, X } from "lucide-react";
import { FUNNEL, track } from "@/lib/analytics";
import { clearDungeonReturn, pendingDungeonReturn, rawDungeonReturn } from "./dungeon-return";

const noSubscribe = () => () => {};

/**
 * "Back to Sprite Dungeon" while the player is in a tool they opened from a
 * Dungeon upgrade. The tower reloads the party on arrival, so the new sprite
 * or animation counts right away.
 */
export function DungeonReturn() {
  const pathname = usePathname();
  const onPlay = Boolean(pathname?.startsWith("/play"));
  // Read on every render (navigation re-renders this), never on the server
  const raw = useSyncExternalStore(noSubscribe, rawDungeonReturn, () => null);
  // Hiding applies to this one trip; the next upgrade shows the way back again
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);

  // Back in the tower: the way back has done its job
  useEffect(() => { if (onPlay) clearDungeonReturn(); }, [onPlay]);

  const kind = onPlay || (raw !== null && raw === hiddenFor) ? null : pendingDungeonReturn(raw)?.kind ?? null;
  if (!kind) return null;
  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-40 flex items-center gap-1 rounded-[10px] border border-white/[0.12] bg-[#19223F]/95 p-1 shadow-[0_6px_18px_rgba(0,0,0,0.35)] md:bottom-5 md:right-5">
      <Link href="/play" onClick={() => { track(FUNNEL.dungeonReturnClicked, { kind }); clearDungeonReturn(); }}
        className="btn btn-secondary h-10 gap-2 px-3 text-[13.5px]">
        <Swords className="h-4 w-4 text-[#FFA300]" aria-hidden /> Back to Sprite Dungeon
      </Link>
      <button type="button" onClick={() => { setHiddenFor(raw); clearDungeonReturn(); }} aria-label="Hide the way back to the Dungeon"
        className="btn btn-ghost btn-icon h-10 w-10">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
