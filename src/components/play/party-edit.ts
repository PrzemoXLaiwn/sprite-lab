// Party editing on the page (pure). The result is only a request: the server
// re-validates every slot list before saving it.

import { GEAR_SLOTS, PARTY_SIZE, type GearSlot, type SkillSlot } from "@/lib/dungeon/config";
import type { SlotIds } from "@/lib/dungeon/party";
import type { Leaderboard, PartyMember } from "@/lib/dungeon/store";

export function toSlots(members: PartyMember[]): SlotIds[] {
  return members.map((m) => {
    const s: SlotIds = { hero: m.hero.id };
    for (const g of GEAR_SLOTS) if (m[g]) s[g] = m[g]!.id;
    const skills: Partial<Record<SkillSlot, string>> = {};
    for (const k of m.skills ?? []) if (k.slot) skills[k.slot] = k.id;
    if (Object.keys(skills).length) s.skills = skills;
    return s;
  });
}

/** Puts an animation in a skill slot (taking it out of any other slot of that hero), or empties the slot. */
export function setSkill(slots: SlotIds[], index: number, slot: SkillSlot, animId: string | null): SlotIds[] {
  return slots.map((s, i) => {
    if (i !== index) return s;
    const skills: Partial<Record<SkillSlot, string>> = {};
    for (const [k, v] of Object.entries(s.skills ?? {}) as [SkillSlot, string][]) if (v !== animId) skills[k] = v;
    if (animId) skills[slot] = animId;
    else delete skills[slot];
    return { ...s, skills };
  });
}

/** Puts a hero in slot `index` (appends when the slot is empty). Keeps that slot's gear. */
export function setHero(slots: SlotIds[], index: number, heroId: string): SlotIds[] {
  if (slots.some((s, i) => i !== index && s.hero === heroId)) return slots;
  const next = slots.map((s) => ({ ...s }));
  if (index < next.length) next[index].hero = heroId;
  else if (next.length < PARTY_SIZE) next.push({ hero: heroId });
  return next;
}

export function removeHero(slots: SlotIds[], index: number): SlotIds[] {
  return slots.filter((_, i) => i !== index);
}

/** Equips (or with null unequips) an item; an item worn by another member moves over. */
export function setGear(slots: SlotIds[], index: number, slot: GearSlot, itemId: string | null): SlotIds[] {
  return slots.map((s, i) => {
    const n = { ...s };
    if (i === index) {
      if (itemId) n[slot] = itemId;
      else delete n[slot];
    } else if (itemId && n[slot] === itemId) {
      delete n[slot];
    }
    return n;
  });
}

/** Index of the member wearing / being `id`, or -1. */
export function wornBy(slots: SlotIds[], id: string): number {
  return slots.findIndex((s) => s.hero === id || GEAR_SLOTS.some((g) => s[g] === id));
}

/** The board to show after a run: the fresh one the server read after storing the run. */
export function boardAfterRun(current: Leaderboard | null, fromRun: Leaderboard | null | undefined): Leaderboard | null {
  return fromRun ?? current;
}
