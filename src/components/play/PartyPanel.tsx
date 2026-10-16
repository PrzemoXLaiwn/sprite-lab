"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Gem, Plus, Shield, Sparkles, Sword, Wand2 } from "lucide-react";
import {
  CLASSES, GEAR_LABEL, GEAR_MAKE_CATEGORY, GEAR_SLOTS, HERO_MAKE_CATEGORY, PARTY_SIZE, STAR_STEP, type GearSlot,
} from "@/lib/dungeon/config";
import type { SlotIds } from "@/lib/dungeon/party";
import type { DungeonSprite, PartyMember } from "@/lib/dungeon/store";
import { ElementTag, Sheet, SpriteImg, Stars } from "./Sheet";
import { wornBy } from "./party-edit";

export type PickerMode = { kind: "hero"; index: number } | { kind: GearSlot; index: number };

const GEAR_ICON: Record<GearSlot, typeof Sword> = { weapon: Sword, armor: Shield, trinket: Gem };
const MAKE_LABEL: Record<GearSlot, string> = { weapon: "Make a weapon", armor: "Make armor", trinket: "Make an item" };
const NONE_YET: Record<GearSlot, string> = { weapon: "weapons", armor: "armor", trinket: "items" };

// ── Hero card ────────────────────────────────────────────────────────────────
function HeroCard({ m, index, locked, onPick, onWhy }: {
  m: PartyMember; index: number; locked: boolean; onPick: (mode: PickerMode) => void; onWhy: (i: number) => void;
}) {
  const s = m.stats;
  return (
    <li className="flex flex-col rounded-[8px] border border-white/[0.1] bg-[#19223F] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <button type="button" disabled={locked} onClick={() => onPick({ kind: "hero", index })} aria-label={`Swap ${m.hero.name}`}
        className="checker checker-sm relative block aspect-square overflow-hidden rounded-[6px] transition hover:ring-2 hover:ring-[#FFA300]/70 disabled:opacity-80">
        <SpriteImg s={m.hero} />
        <span className="absolute left-1 top-1 rounded-[4px] bg-[#131A31]/85 px-1.5 py-0.5 text-[11.5px] font-semibold text-[#FFF1E8]">{CLASSES[s.classId].label}</span>
      </button>
      <button type="button" onClick={() => onWhy(index)} aria-label={`Why power ${s.power}? Show the breakdown`}
        className="mt-1 flex min-h-11 flex-col items-start gap-0.5 rounded-[6px] px-1 py-1 text-left hover:bg-white/[0.05]">
        <span className="flex w-full items-center justify-between gap-1">
          <span className="font-display text-[16px] font-semibold leading-none text-[#FFF1E8]">{s.power}</span>
          <Stars n={m.hero.stars} size={11} />
        </span>
        <span className="flex w-full items-center justify-between gap-1">
          <span className="text-[11.5px] text-[#A7ADD4]">Power</span>
          <ElementTag e={s.attackElement} small />
        </span>
      </button>
      <div className="mt-1 grid grid-cols-3 gap-1">
        {GEAR_SLOTS.map((g) => {
          const item = m[g];
          const Icon = GEAR_ICON[g];
          return (
            <button key={g} type="button" disabled={locked} onClick={() => onPick({ kind: g, index })}
              aria-label={item ? `${GEAR_LABEL[g]}: ${item.name}. Change` : `Empty ${GEAR_LABEL[g].toLowerCase()} slot`}
              title={item ? `${GEAR_LABEL[g]}: ${item.bonus?.text ?? ""}` : `${GEAR_LABEL[g]} (empty)`}
              className={`relative flex aspect-square min-h-10 items-center justify-center overflow-hidden rounded-[5px] transition disabled:opacity-70 ${item ? "checker checker-sm border border-white/[0.1] hover:ring-2 hover:ring-[#FFA300]/70" : "border border-dashed border-white/[0.18] text-[#7F86B5] hover:border-[#FFA300]/70 hover:text-[#FFF1E8]"}`}>
              {item ? <SpriteImg s={item} /> : <Icon className="h-4 w-4" aria-hidden />}
            </button>
          );
        })}
      </div>
    </li>
  );
}

// ── Picker ───────────────────────────────────────────────────────────────────
export function Picker({ mode, roster, slots, members, onPick, onClear, onClose }: {
  mode: PickerMode; roster: DungeonSprite[]; slots: SlotIds[]; members: PartyMember[];
  onPick: (id: string) => void; onClear: () => void; onClose: () => void;
}) {
  const list = roster.filter((s) => s.slot === mode.kind).sort((a, b) => b.power - a.power || a.id.localeCompare(b.id));
  const current = mode.kind === "hero" ? slots[mode.index]?.hero : slots[mode.index]?.[mode.kind];
  const heroName = members[mode.index]?.hero.name;
  const title = mode.kind === "hero" ? (current ? "Swap hero" : "Add a hero") : `${GEAR_LABEL[mode.kind]}${heroName ? ` for ${heroName.length > 18 ? `${heroName.slice(0, 17)}…` : heroName}` : ""}`;
  const makeHref = `/generate?categoryId=${mode.kind === "hero" ? HERO_MAKE_CATEGORY : GEAR_MAKE_CATEGORY[mode.kind]}`;

  return (
    <Sheet title={title} onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap gap-2">
        {current && (
          <button type="button" onClick={onClear} className="inline-flex h-10 items-center rounded-[7px] border border-white/[0.14] px-3.5 text-[13.5px] text-[#FFF1E8] hover:bg-white/[0.06]">
            {mode.kind === "hero" ? "Remove from party" : "Unequip"}
          </button>
        )}
        <Link href={makeHref} className="inline-flex h-10 items-center gap-1.5 rounded-[7px] border border-white/[0.14] px-3.5 text-[13.5px] text-[#FFC857] hover:bg-white/[0.06]">
          <Wand2 className="h-4 w-4" aria-hidden /> {mode.kind === "hero" ? "Make a character or creature" : MAKE_LABEL[mode.kind]}
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-white/[0.16] p-4 text-[14px] text-[#C8CCE8]">
          {mode.kind === "hero" ? "Make a character or creature: it joins your party." : `You don't have any ${NONE_YET[mode.kind]} yet. Every one you make becomes loot.`}
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {list.map((s) => {
            const owner = wornBy(slots, s.id);
            const here = owner === mode.index;
            const heroTaken = mode.kind === "hero" && owner >= 0 && !here;
            const note = here ? "Equipped"
              : heroTaken ? "In party"
              : owner >= 0 ? `Move from ${members[owner]?.hero.name.slice(0, 10) ?? "hero"}`
              : mode.kind === "hero" ? CLASSES[s.classId ?? "striker"].label
              : s.bonus?.text ?? "";
            return (
              <li key={s.id}>
                <button type="button" disabled={heroTaken || here} onClick={() => onPick(s.id)}
                  className="flex w-full flex-col items-stretch rounded-[7px] border border-white/[0.08] bg-[#212B4E] p-1.5 text-left transition hover:border-[#FFA300]/70 disabled:opacity-45 disabled:hover:border-white/[0.08]">
                  <span className="checker checker-sm block aspect-square overflow-hidden rounded-[5px]"><SpriteImg s={s} /></span>
                  <span className="mt-1.5 flex items-center justify-between gap-1 px-0.5">
                    <span className="font-display text-[14px] font-semibold text-[#FFF1E8]">{s.power}</span>
                    <Stars n={s.stars} size={9} />
                  </span>
                  <span className="truncate px-0.5 text-[11.5px] leading-tight text-[#A7ADD4]">{note}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

// ── Why this power? ──────────────────────────────────────────────────────────
function Row({ ok, label, hint }: { ok: boolean; label: string; hint?: ReactNode }) {
  return (
    <li className="flex items-start gap-2 py-1">
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] ${ok ? "bg-[#00E436]/20 text-[#00E436]" : "border border-white/[0.2]"}`}>
        {ok && <Check className="h-3 w-3" aria-hidden />}
      </span>
      <span className="text-[13.5px] text-[#C8CCE8]">{label}{!ok && hint ? <> {hint}</> : null}</span>
    </li>
  );
}

export function WhySheet({ m, onClose, onEquip }: { m: PartyMember; onClose: () => void; onEquip: (slot: GearSlot) => void }) {
  const w = m.stats.why;
  const c = CLASSES[w.classId];
  const link = "font-semibold text-[#FFC857] underline underline-offset-2";
  return (
    <Sheet title={`Why power ${m.stats.power}?`} onClose={onClose}>
      <div className="flex gap-3">
        <span className="checker checker-sm h-16 w-16 shrink-0 overflow-hidden rounded-[6px]"><SpriteImg s={m.hero} /></span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-[#FFF1E8]">{m.hero.name}</p>
          <p className="text-[13px] text-[#C8CCE8]">
            {c.label}{w.classWord ? <> from the word &ldquo;{w.classWord}&rdquo;</> : <> (default for its category)</>}. {c.role}.
          </p>
        </div>
      </div>

      <h3 className="mt-4 text-[14px] font-semibold text-[#FFF1E8]">1. Class base at one star</h3>
      <p className="mt-1 font-mono text-[13px] text-[#C8CCE8]">HP {w.base.hp}, ATK {w.base.atk}, DEF {w.base.def}</p>

      <h3 className="mt-4 flex items-center gap-2 text-[14px] font-semibold text-[#FFF1E8]">2. Stars <Stars n={w.stars.stars} /> <span className="font-mono text-[13px] font-normal text-[#FFC857]">×{w.starMultiplier}</span></h3>
      <p className="text-[12.5px] text-[#A7ADD4]">Each star multiplies the hero by {STAR_STEP}. Stars come from work on the sprite:</p>
      <ul className="mt-1">
        <Row ok label="Made the sprite (first star)" />
        <Row ok={w.stars.hd} label="HD quality" hint={<Link className={link} href={`/generate?categoryId=${HERO_MAKE_CATEGORY}`}>Make one in HD</Link>} />
        <Row ok={w.stars.animated} label="Animated" hint={<Link className={link} href={`/animate?id=${encodeURIComponent(m.hero.id)}`}>Animate it</Link>} />
        <Row ok={w.stars.showcase} label="3 different animations, or a walk / rotation set" hint={<Link className={link} href={`/animate?id=${encodeURIComponent(m.hero.id)}`}>Add more</Link>} />
      </ul>

      <h3 className="mt-4 text-[14px] font-semibold text-[#FFF1E8]">3. Gear</h3>
      <ul className="mt-1 space-y-1.5">
        {GEAR_SLOTS.map((g) => {
          const b = w.gear.find((x) => x.slot === g);
          const item = m[g];
          return (
            <li key={g} className="flex items-center gap-2">
              <span className="w-[62px] shrink-0 text-[12.5px] text-[#A7ADD4]">{GEAR_LABEL[g]}</span>
              {b && item ? (
                <span className="flex min-w-0 items-center gap-2 text-[13px] text-[#C8CCE8]">
                  <Stars n={b.stars} size={9} /> <span className="truncate">{b.text}</span>
                </span>
              ) : (
                <button type="button" onClick={() => onEquip(g)} className="inline-flex min-h-10 items-center text-[13px] font-semibold text-[#FFC857] underline underline-offset-2">
                  Empty: equip one
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <h3 className="mt-4 text-[14px] font-semibold text-[#FFF1E8]">4. Element</h3>
      <p className="mt-1 text-[13px] text-[#C8CCE8]">
        Hero: <ElementTag e={w.element} />{w.elementWord ? <> (&ldquo;{w.elementWord}&rdquo;)</> : null}. Attacks with <ElementTag e={w.attackElement} />
        {w.attackElement !== w.element ? " from its weapon" : ""}. Hitting a weakness deals ×1.5, a resisted hit ×0.6.
      </p>

      <div className="mt-4 rounded-[8px] bg-[#212B4E] p-3 font-mono text-[13px] text-[#FFF1E8]">
        HP {m.stats.hp}, ATK {m.stats.atk}, DEF {m.stats.def}, crit {Math.round(m.stats.crit * 100)}%
        {m.stats.heal ? `, heals ${m.stats.heal}/turn` : ""}{m.stats.allHit ? `, hits all at ${Math.round(m.stats.allHit * 100)}%` : ""}
        {m.stats.splash ? `, splash ${Math.round(m.stats.splash * 100)}%` : ""}{m.stats.ward ? `, ${m.stats.ward} ward` : ""}
      </div>
      <p className="mt-2 text-[12px] text-[#A7ADD4]">Power = HP / 4 + attack × 3 (more with crit and multi-hits) + DEF × 0.8 + healing × 3.</p>
    </Sheet>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────
export function PartyPanel({ members, figures, hasItems, locked, saving, onPick, onWhy, onAuto }: {
  members: PartyMember[]; figures: number; hasItems: boolean; locked: boolean; saving: boolean;
  onPick: (mode: PickerMode) => void; onWhy: (i: number) => void; onAuto: () => void;
}) {
  const power = members.reduce((a, m) => a + m.stats.power, 0);
  const [hint] = useState(() => figures > members.length);
  if (figures === 0) {
    return (
      <div className="mt-3 rounded-[8px] border border-dashed border-white/[0.16] bg-[#19223F] p-5">
        <p className="text-[15px] font-semibold text-[#FFF1E8]">Make a character or creature: it joins your party</p>
        <p className="mt-1 text-[13.5px] text-[#A7ADD4]">
          {hasItems ? "Your weapons, armor and items are ready as loot; they need a hero to carry them." : "Weapons, armor and items you make become their gear."}
        </p>
        <Link href={`/generate?categoryId=${HERO_MAKE_CATEGORY}`} className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-[7px] bg-[#FFA300] px-4 text-[14px] font-semibold text-[#131A31] hover:bg-[#FFB733]">
          <Wand2 className="h-4 w-4" aria-hidden /> Create a character
        </Link>
      </div>
    );
  }
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13.5px] text-[#A7ADD4]">Party power <span className="font-display text-[17px] font-semibold text-[#FFC857]">{power}</span></p>
        <button type="button" onClick={onAuto} disabled={locked || saving}
          className="inline-flex h-10 items-center gap-1.5 rounded-[7px] border border-white/[0.14] px-3.5 text-[13.5px] text-[#FFF1E8] hover:bg-white/[0.06] disabled:opacity-50">
          <Sparkles className="h-4 w-4 text-[#FFC857]" aria-hidden /> Auto-equip
        </button>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: PARTY_SIZE }, (_, i) => {
          const m = members[i];
          if (m) return <HeroCard key={m.hero.id} m={m} index={i} locked={locked || saving} onPick={onPick} onWhy={onWhy} />;
          const canAdd = i === members.length && figures > members.length;
          return (
            <li key={`empty-${i}`}>
              {canAdd ? (
                <button type="button" disabled={locked} onClick={() => onPick({ kind: "hero", index: i })}
                  className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed border-white/[0.18] text-[#A7ADD4] transition hover:border-[#FFA300]/70 hover:text-[#FFF1E8] disabled:opacity-40">
                  <Plus className="h-6 w-6" aria-hidden /><span className="text-[13px]">Add hero</span>
                </button>
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center rounded-[8px] border border-dashed border-white/[0.1] p-3 text-center">
                  {i === members.length ? (
                    <Link href={`/generate?categoryId=${HERO_MAKE_CATEGORY}`} className="inline-flex min-h-10 items-center text-[13px] font-medium text-[#FFC857]">Make a hero</Link>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[12.5px] text-[#A7ADD4]">
        Tap a hero to swap it, a slot to change gear, the power number to see why.{hint ? " You have more heroes than slots: try Auto-equip." : ""}
      </p>
    </>
  );
}
