"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Film, Footprints, Gem, Loader2, PersonStanding, Plus, Shield, Sparkles, Star, Sword, Swords, Wand2 } from "lucide-react";
import {
  ANIMATION_DECAY, ANIMATION_FIRST_BONUS, CLASSES, ELEMENT_DEFS, GEAR_LABEL, GEAR_MAKE_CATEGORY, GEAR_SLOTS, HD_MULTIPLIER, HERO_MAKE_CATEGORY,
  MAX_COUNTED_ANIMATIONS, PARTY_SIZE, SKILL_POWER, SKILL_RULES, SKILL_SLOTS, SLOT_LABEL, SLOT_MIN_TIER, TIER_COLOR, TIER_LABEL,
  animationMultiplier, animationStep, type Element, type GearSlot, type SkillSlot,
} from "@/lib/dungeon/config";
import type { AnimRef } from "@/lib/dungeon/anims";
import { slotAccepts } from "@/lib/dungeon/skills";
import type { SlotIds } from "@/lib/dungeon/party";
import type { DungeonSprite, PartyMember, PartySkill } from "@/lib/dungeon/store";
import { ElementTag, Sheet, SpriteImg, Stars } from "./Sheet";
import { markDungeonReturn } from "./dungeon-return";
import { FUNNEL, track } from "@/lib/analytics";
import { wornBy } from "./party-edit";

export type PickerMode = { kind: "hero"; index: number } | { kind: GearSlot; index: number };

const GEAR_ICON: Record<GearSlot, typeof Sword> = { weapon: Sword, armor: Shield, trinket: Gem };

/** Element pip on a gear slot: a weapon's attack element, a trinket's ward. Never shown as the hero's element. */
function pipFor(slot: GearSlot, item: DungeonSprite): Element | null {
  if (slot === "weapon" && item.bonus && item.bonus.element !== "neutral") return item.bonus.element;
  if (slot === "trinket" && item.bonus?.ward) return item.bonus.ward;
  return null;
}

const RULE_TEXT = (src: { rule: string; word: string | null; element: Element }): string =>
  src.rule === "word" ? `from “${src.word}” in the prompt`
  : src.rule === "colour" ? `from the colour “${src.word}” in the prompt`
  : src.rule === "creature" ? `${src.word}s default to ${ELEMENT_DEFS[src.element].label}`
  : "no element word, colour or creature in the prompt";
const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const MAKE_LABEL: Record<GearSlot, string> = { weapon: "Make a weapon", armor: "Make armor", trinket: "Make an item" };
const NONE_YET: Record<GearSlot, string> = { weapon: "weapons", armor: "armor", trinket: "items" };

// ── Hero card ────────────────────────────────────────────────────────────────
/** A looping preview of an animation sheet (one row of frames), CSS only. */
export function SkillPreview({ anim, pixel }: { anim: AnimRef; pixel: boolean }) {
  const n = Math.max(1, anim.frameCount);
  return (
    <span className="skill-strip block h-full w-full" aria-hidden
      style={{
        backgroundImage: `url(${anim.url})`, backgroundSize: `${n * 100}% 100%`, backgroundRepeat: "no-repeat",
        imageRendering: pixel ? "pixelated" : undefined,
        animation: n > 1 ? `skillstrip ${(n / anim.fps).toFixed(2)}s steps(${n}) infinite` : undefined,
        ["--to" as string]: `${n > 1 ? (100 * n) / (n - 1) : 0}%`,
      }} />
  );
}

export const SKILL_STRIP_CSS = "@keyframes skillstrip{from{background-position:0% 0}to{background-position:var(--to) 0}}@media (prefers-reduced-motion: reduce){.skill-strip{animation:none!important}}";

function HeroCard({ m, index, locked, onPick, onWhy, onSkill }: {
  m: PartyMember; index: number; locked: boolean; onPick: (mode: PickerMode) => void; onWhy: (i: number) => void;
  onSkill: (index: number, slot: SkillSlot) => void;
}) {
  const s = m.stats;
  const glow = s.attackElement !== "neutral" ? ELEMENT_DEFS[s.attackElement].color : "#29ADFF";
  return (
    <li className="flex flex-col rounded-[10px] border border-[#29ADFF]/20 bg-[#19223F] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <button type="button" disabled={locked} onClick={() => onPick({ kind: "hero", index })} aria-label={`Swap ${m.hero.name}`}
        style={{ background: `radial-gradient(circle at 50% 70%, ${glow}40 0%, #131A31 68%)` }}
        className="relative block aspect-square overflow-hidden rounded-[8px] border border-white/[0.06] transition hover:ring-2 hover:ring-[#FFA300]/70 disabled:opacity-80">
        <span className="absolute inset-x-0 bottom-[8%] mx-auto h-[8%] w-[60%] rounded-[50%] bg-black/40" aria-hidden />
        <span className="absolute inset-[6%] block"><SpriteImg s={m.hero} /></span>
        <span className="absolute left-1 top-1 max-w-[calc(100%-8px)] truncate rounded-[4px] bg-[#0B1022]/80 px-1.5 py-0.5 text-[11.5px] font-semibold text-[#FFF1E8]">{shortName(m.hero.name)}</span>
        <span className="absolute bottom-1 left-1 rounded-[4px] bg-[#0B1022]/80 px-1.5 py-0.5 text-[10.5px] font-semibold text-[#C8CCE8]">{CLASSES[s.classId].label}</span>
      </button>
      <button type="button" onClick={() => onWhy(index)} aria-label={`Why power ${s.power}? Show the breakdown`}
        className="mt-1 flex min-h-11 flex-col items-start gap-0.5 rounded-[6px] px-1 py-1 text-left hover:bg-white/[0.05]">
        <span className="flex w-full items-center justify-between gap-1">
          <span className="font-display text-[16px] font-semibold leading-none text-[#FFF1E8]">{s.power}</span>
          <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#FFC857]" aria-label={`${m.hero.stars} stars`}>
            <Star className="h-3 w-3 fill-[#FFA300] text-[#FFA300]" aria-hidden />{m.hero.stars}
          </span>
        </span>
        <span className="flex w-full items-center justify-between gap-1">
          <span className="text-[11.5px] text-[#A7ADD4]">Power</span>
          <ElementTag e={s.element} small />
        </span>
        {s.attackElement !== s.element && (
          <span className="text-[11px] leading-tight text-[#A7ADD4]">Attacks with {ELEMENT_DEFS[s.attackElement].label} (weapon)</span>
        )}
      </button>
      <AnimRow m={m} />
      <div className="mt-1 grid grid-cols-3 gap-1">
        {GEAR_SLOTS.map((g) => {
          const item = m[g];
          const Icon = GEAR_ICON[g];
          return (
            <button key={g} type="button" disabled={locked} onClick={() => onPick({ kind: g, index })}
              aria-label={item ? `${GEAR_LABEL[g]}: ${item.name}. Change` : `Empty ${GEAR_LABEL[g].toLowerCase()} slot`}
              title={item ? `${GEAR_LABEL[g]}: ${item.bonus?.text ?? ""}` : `${GEAR_LABEL[g]} (empty)`}
              className={`relative flex aspect-square min-h-10 min-w-0 items-center justify-center overflow-hidden rounded-[5px] transition disabled:opacity-70 ${item ? "checker checker-sm border border-white/[0.1] hover:ring-2 hover:ring-[#FFA300]/70" : "border border-dashed border-white/[0.18] text-[#7F86B5] hover:border-[#FFA300]/70 hover:text-[#FFF1E8]"}`}>
              {item ? <SpriteImg s={item} /> : <Icon className="h-4 w-4" aria-hidden />}
              {item && pipFor(g, item) && (
                <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-[2px] ring-1 ring-[#131A31]" style={{ background: ELEMENT_DEFS[pipFor(g, item)!].color }}
                  title={g === "weapon" ? `${ELEMENT_DEFS[pipFor(g, item)!].label} attacks` : `${ELEMENT_DEFS[pipFor(g, item)!].label} ward`} aria-hidden />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1" aria-label="Skills">
        {SKILL_SLOTS.map((slot) => {
          const k = m.skills?.find((x) => x.slot === slot);
          const color = k ? TIER_COLOR[k.tier] : "rgba(255,255,255,0.18)";
          return (
            <button key={slot} type="button" disabled={locked} onClick={() => onSkill(index, slot)}
              aria-label={k ? `${SLOT_LABEL[slot]} skill: ${k.name}, ${TIER_LABEL[k.tier]}. Details` : `Empty ${SLOT_LABEL[slot]} skill slot`}
              title={k ? `${SLOT_LABEL[slot]}: ${k.name} (${TIER_LABEL[k.tier]} ${k.score})` : `${SLOT_LABEL[slot]} skill (empty)`}
              className={`relative flex aspect-square min-h-10 min-w-0 items-center justify-center overflow-hidden rounded-[5px] transition disabled:opacity-70 ${k ? "checker checker-sm" : "border border-dashed"}`}
              style={{ boxShadow: k ? `inset 0 0 0 2px ${color}` : undefined, borderColor: k ? undefined : color }}>
              {k ? <SkillPreview anim={k.anim} pixel={m.hero.pixel} /> : <span className="text-[10.5px] leading-tight text-[#7F86B5]">{SLOT_SHORT[slot]}</span>}
              {k?.pending && <Loader2 className="absolute right-0.5 top-0.5 h-3 w-3 animate-spin text-[#C8CCE8]" aria-hidden />}
            </button>
          );
        })}
      </div>
    </li>
  );
}

/** Empty skill tiles are ~32–42px wide: short names (the full one is in the title and aria-label). */
const SLOT_SHORT: Record<(typeof SKILL_SLOTS)[number], string> = { basic: "Basic", special: "Spec.", legendary: "Leg." };

/** "fox mage in a purple robe" → "Fox mage" (the card shows the whole prompt on hover via the picker). */
function shortName(name: string): string {
  const w = name.replace(/[^A-Za-z0-9' -]/g, " ").trim().split(/\s+/).slice(0, 2).join(" ");
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : "Hero";
}

const ANIM_ROLES = [["idle", "Idle", PersonStanding], ["walk", "Walk", Footprints], ["attack", "Attack", Swords]] as const;

/** Which of the hero's animations play in the tower (green) and which aren't made yet, with a way to make them. */
function AnimRow({ m }: { m: PartyMember }) {
  const missing = ANIM_ROLES.filter(([role]) => !m.anims?.[role]);
  const have = ANIM_ROLES.length - missing.length;
  const icons = (
    <span className="flex items-center gap-1">
        {ANIM_ROLES.map(([role, label, Icon]) => {
          const ok = Boolean(m.anims?.[role]);
          return (
            <span key={role} title={ok ? `${label}: plays in the tower` : `${label}: not made yet`} aria-label={`${label} ${ok ? "made" : "missing"}`}
              className={`flex h-5 w-5 items-center justify-center rounded-[4px] ${ok ? "bg-[#00E436]/15 text-[#00E436]" : "bg-white/[0.05] text-[#5F6696]"}`}>
              <Icon className="h-3 w-3" aria-hidden />
            </span>
          );
        })}
    </span>
  );
  // Something missing: the whole row opens the animator for this hero
  if (!missing.length) return <div className="mt-1 flex h-10 items-center px-1" aria-label={`All ${have} tower animations made`}>{icons}</div>;
  return (
    <Link href={`/animate?id=${encodeURIComponent(m.hero.id)}`} aria-label={`Animate ${m.hero.name}: missing ${missing.map(([, l]) => l.toLowerCase()).join(", ")}`}
      title={`Missing: ${missing.map(([, l]) => l).join(", ")}. Animate this hero`}
      onClick={() => { markDungeonReturn("party-animate"); track(FUNNEL.dungeonUpgradeClicked, { kind: "party_animate", missing: missing.map(([role]) => role).join(",") }); }}
      className="mt-1 flex h-10 items-center justify-between gap-1 rounded-[7px] px-1 hover:bg-white/[0.06]">
      {icons}
      <Film className="h-4 w-4 shrink-0 text-[#FFC857]" aria-hidden />
    </Link>
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

      <h3 className="mt-4 flex items-center gap-2 text-[14px] font-semibold text-[#FFF1E8]">2. Work on the sprite <span className="font-mono text-[13px] font-normal text-[#FFC857]">×{w.work.multiplier}</span></h3>
      <p className="text-[12.5px] text-[#A7ADD4]">
        HD is ×{HD_MULTIPLIER}. Every different animation adds power: the first +{Math.round(ANIMATION_FIRST_BONUS * 100)}%, each next one {Math.round(ANIMATION_DECAY * 100)}% of the previous, up to {MAX_COUNTED_ANIMATIONS}.
      </p>
      <ul className="mt-1">
        <Row ok={w.work.hd} label={`HD quality (×${HD_MULTIPLIER})`} hint={<Link className={link} href={`/generate?categoryId=${HERO_MAKE_CATEGORY}`}>Make one in HD</Link>} />
        {w.work.steps.map((step, k) => (
          <Row key={k} ok label={`${m.animationLabels?.[k] ? cap1(m.animationLabels[k]) : `Animation ${k + 1}`} (+${Math.round(step * 1000) / 10}%)`} />
        ))}
        {w.work.animations > MAX_COUNTED_ANIMATIONS && <li className="py-1 text-[12.5px] text-[#A7ADD4]">More animations still count for skills, not for base power.</li>}
      </ul>
      {w.work.animations < MAX_COUNTED_ANIMATIONS && (() => {
        const n = w.work.animations;
        const gain = Math.round((animationStep(n + 1) / animationMultiplier(n)) * 100);
        const labels = (m.animationLabels ?? []).join(" ").toLowerCase();
        const next = !/walk|run|move/.test(labels) ? { what: "a walk animation", why: "and your hero walks up the tower" }
          : !/idle|breath|stand/.test(labels) ? { what: "an idle animation", why: "and your hero breathes while it waits" }
          : !(m.skills ?? []).length ? { what: "an attack animation", why: "and it becomes a skill your hero uses in battle" }
          : { what: "another attack animation", why: "and it can fill a better skill slot" };
        return (
          <p className="mt-1 rounded-[7px] bg-[#212B4E] px-3 py-2 text-[13px] text-[#FFF1E8]">
            Add {next.what}: +{gain}% to its base stats, {next.why}.{" "}
            <Link className={link} href={`/animate?id=${encodeURIComponent(m.hero.id)}`}>Animate</Link>
          </p>
        );
      })()}

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

      <h3 className="mt-4 text-[14px] font-semibold text-[#FFF1E8]">4. Skills {w.skillBonus > 0 && <span className="font-mono text-[13px] font-normal text-[#FFC857]">+{Math.round(w.skillBonus * 100)}% offence</span>}</h3>
      {(m.skills ?? []).length === 0 ? (
        <p className="mt-1 text-[13px] text-[#C8CCE8]">No skills yet: its attacks are plain. <Link className={link} href={`/animate?id=${encodeURIComponent(m.hero.id)}`}>Make an attack animation</Link></p>
      ) : (
        <ul className="mt-1 space-y-1 text-[13px] text-[#C8CCE8]">
          {(m.skills ?? []).map((k) => (
            <li key={k.id}><span style={{ color: TIER_COLOR[k.tier] }}>{TIER_LABEL[k.tier]}</span> {k.name} in the {SLOT_LABEL[k.slot!]} slot{SKILL_POWER[k.tier] && k.slot !== "basic" ? `: +${Math.round(SKILL_POWER[k.tier] * 100)}% offence` : ""}</li>
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-[14px] font-semibold text-[#FFF1E8]">5. Element</h3>
      <p className="mt-1 text-[13px] text-[#C8CCE8]">
        <ElementTag e={w.element} />, {RULE_TEXT(w.elementSource)}.
      </p>
      <p className="mt-1 text-[13px] text-[#C8CCE8]">
        {w.attackElement !== w.element
          ? <>Attacks with <ElementTag e={w.attackElement} /> from its weapon. </>
          : <>Attacks with its own element. </>}
        {m.stats.ward ? <>Its trinket wards off <ElementTag e={m.stats.ward} /> (×0.6 damage taken). </> : null}
        Hitting a weakness deals ×1.5, a resisted hit ×0.6.
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

// ── Skill sheet ──────────────────────────────────────────────────────────────
const SLOT_RULE_TEXT: Record<SkillSlot, string> = {
  basic: "Used on every turn.",
  special: `Rare: every ${SKILL_RULES.rare.every}rd turn, ×${SKILL_RULES.rare.mult} on one enemy. Epic or better: every ${SKILL_RULES.epic.every}th turn, ×${SKILL_RULES.epic.mult} on every enemy.`,
  legendary: `Epic: every ${SKILL_RULES.epic.every}th turn, ×${SKILL_RULES.epic.mult} on every enemy. Legendary: once per floor, ×${SKILL_RULES.legendary.mult} on every enemy and stuns them for a turn.`,
};

export function scoreLines(k: PartySkill): { label: string; pts: number }[] {
  const x = k.metrics;
  const level = x.motion < 0.1 ? "low" : x.motion < 0.2 ? "medium" : "high";
  return [
    { label: `${x.frames} frames`, pts: x.framesPts },
    { label: `Motion ${level} (${Math.round(x.motion * 100)}% of the hero changes per frame)`, pts: x.motionPts },
    { label: `Reach ${x.reach}× its own size`, pts: x.reachPts },
    { label: `${x.newColours} new effect colours over ${Math.round(x.coverage * 100)}% of the frame`, pts: x.effectsPts },
  ];
}

export function SkillSheet({ m, slot, onAssign, onClose }: {
  m: PartyMember; slot: SkillSlot; onAssign: (animId: string | null) => void; onClose: () => void;
}) {
  const k = m.skills?.find((x) => x.slot === slot);
  const options = [...(m.skillOptions ?? [])].sort((a, b) => b.score - a.score);
  const link = "font-semibold text-[#FFC857] underline underline-offset-2";
  return (
    <Sheet title={`${SLOT_LABEL[slot]} skill`} onClose={onClose}>
      <p className="text-[13px] text-[#C8CCE8]">{SLOT_RULE_TEXT[slot]} This slot takes {TIER_LABEL[SLOT_MIN_TIER[slot]]} or better.</p>
      {k ? (
        <div className="mt-3 flex gap-3">
          <span className="checker checker-sm h-20 w-20 shrink-0 overflow-hidden rounded-[6px]" style={{ boxShadow: `inset 0 0 0 2px ${TIER_COLOR[k.tier]}` }}>
            <SkillPreview anim={k.anim} pixel={m.hero.pixel} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[17px] font-semibold text-[#FFF1E8]">{k.name}</p>
            <p className="text-[13px]" style={{ color: TIER_COLOR[k.tier] }}>{TIER_LABEL[k.tier]}, spectacle {k.score}{k.pending ? " (analysing…)" : ""}</p>
            {!k.pending && (
              <ul className="mt-1.5 space-y-0.5 text-[12.5px] text-[#C8CCE8]">
                {scoreLines(k).map((l) => <li key={l.label} className="flex justify-between gap-2"><span>{l.label}</span><span className="font-mono text-[#FFF1E8]">+{l.pts}</span></li>)}
                <li className="flex justify-between gap-2 border-t border-white/[0.08] pt-0.5 font-semibold"><span>Total</span><span className="font-mono" style={{ color: TIER_COLOR[k.tier] }}>{k.score} {TIER_LABEL[k.tier]}</span></li>
              </ul>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-[#C8CCE8]">{slot === "basic" ? "Empty: your hero uses its plain attack." : "Empty."} <Link className={link} href={`/animate?id=${encodeURIComponent(m.hero.id)}`}>Make an attack animation</Link></p>
      )}
      <p className="mt-3 text-[12.5px] text-[#A7ADD4]">
        Score is measured on the animation itself: more frames, more movement, a wider reach and new effect colours (fire, magic, sparks) score higher. Common under 35, Rare 35+, Epic 60+, Legendary 80+.{" "}
        <Link className={link} href={`/animate?id=${encodeURIComponent(m.hero.id)}`}>Make a stronger one</Link>
      </p>
      {options.length > 0 && (
        <>
          <h3 className="mt-4 text-[14px] font-semibold text-[#FFF1E8]">Put in this slot</h3>
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {options.map((o) => {
              const ok = slotAccepts(slot, o.tier);
              const here = k?.id === o.id;
              return (
                <li key={o.id}>
                  <button type="button" disabled={!ok || here} onClick={() => onAssign(o.id)}
                    className="flex w-full flex-col rounded-[7px] border border-white/[0.08] bg-[#212B4E] p-1.5 text-left transition hover:border-[#FFA300]/70 disabled:opacity-45 disabled:hover:border-white/[0.08]">
                    <span className="checker checker-sm block aspect-square overflow-hidden rounded-[5px]" style={{ boxShadow: `inset 0 0 0 2px ${TIER_COLOR[o.tier]}` }}>
                      <SkillPreview anim={o.anim} pixel={m.hero.pixel} />
                    </span>
                    <span className="mt-1 truncate text-[12.5px] font-semibold text-[#FFF1E8]">{o.name}</span>
                    <span className="text-[11.5px]" style={{ color: TIER_COLOR[o.tier] }}>{here ? "In this slot" : ok ? `${TIER_LABEL[o.tier]} ${o.score}` : `${TIER_LABEL[o.tier]}: too weak here`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {k && (
        <button type="button" onClick={() => onAssign(null)} className="mt-3 inline-flex h-10 items-center rounded-[7px] border border-white/[0.14] px-3.5 text-[13.5px] text-[#FFF1E8] hover:bg-white/[0.06]">
          Use the best one automatically
        </button>
      )}
    </Sheet>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────
export function PartyPanel({ members, figures, hasItems, locked, saving, onPick, onWhy, onAuto, onSkill }: {
  members: PartyMember[]; figures: number; hasItems: boolean; locked: boolean; saving: boolean;
  onPick: (mode: PickerMode) => void; onWhy: (i: number) => void; onAuto: () => void; onSkill: (index: number, slot: SkillSlot) => void;
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
      <style>{SKILL_STRIP_CSS}</style>
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
          if (m) return <HeroCard key={m.hero.id} m={m} index={i} locked={locked || saving} onPick={onPick} onWhy={onWhy} onSkill={onSkill} />;
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
        Tap a hero to swap it, a slot to change gear or skills, the power number to see why. Animated heroes are stronger and you see their animations in battle.{hint ? " You have more heroes than slots: try Auto-equip." : ""}
      </p>
    </>
  );
}
