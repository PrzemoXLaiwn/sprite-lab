"use client";

import Link from "next/link";
import type { GearSlot } from "@/lib/dungeon/config";
import type { PartyMember } from "@/lib/dungeon/store";
import type { Upgrade } from "@/lib/dungeon/upgrades";
import { FUNNEL, track } from "@/lib/analytics";
import { markDungeonReturn } from "./dungeon-return";
import { SpriteImg } from "./Sheet";

/**
 * The party's next upgrades, each tied to a real SpriteLab action: the effect
 * comes from the game rules, the price from the tool's config. Equipping gear
 * the player already owns opens the page's own picker instead of a tool.
 */
export function UpgradeCards({ upgrades, members, onPicker }: {
  upgrades: Upgrade[];
  members: PartyMember[];
  onPicker: (p: { index: number; slot: GearSlot }) => void;
}) {
  if (!upgrades.length) return null;
  return (
    <section aria-labelledby="upgrades-h" className="sl-panel mt-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id="upgrades-h" className="font-display text-[18px] font-semibold text-[#FFF1E8]">Make your party stronger</h2>
        <p className="text-[12.5px] text-[#A7ADD4]">Create it in SpriteLab, test it in the tower.</p>
      </div>
      <ul className="mt-2 grid gap-2 md:grid-cols-3">
        {upgrades.map((u) => {
          const hero = u.heroIndex >= 0 ? members[u.heroIndex]?.hero : undefined;
          const onClick = () => {
            track(FUNNEL.dungeonUpgradeClicked, { kind: u.kind });
            if (u.href) markDungeonReturn(u.kind);
          };
          return (
            <li key={u.id} className="sl-card flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2.5">
                {hero && <span className="checker checker-sm h-11 w-11 shrink-0 overflow-hidden rounded-[6px]"><SpriteImg s={hero} /></span>}
                <p className="min-w-0 text-[13px] leading-snug text-[#A7ADD4]">{u.now}</p>
              </div>
              <p className="text-[14px] leading-snug text-[#FFF1E8]">{u.effect}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <span className="text-[12.5px] text-[#C8CCE8]">{u.cost}</span>
                {u.href ? (
                  <Link href={u.href} onClick={onClick} className="btn btn-secondary h-10 px-3 text-[13.5px]">{u.action}</Link>
                ) : (
                  <button type="button" onClick={() => { onClick(); if (u.picker) onPicker(u.picker); }} className="btn btn-secondary h-10 px-3 text-[13.5px]">
                    {u.action}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
