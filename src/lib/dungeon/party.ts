// =============================================================================
// Sprite Dungeon — party slots: parsing, validation, auto-equip
// =============================================================================
// Pure. The server runs every slot list through validateSlots() against the
// user's own original sprites before saving or fighting — the client is never
// trusted.
// =============================================================================

import { GEAR_SLOTS, PARTY_SIZE, SKILL_SLOTS, type GearSlot, type SkillSlot } from "./config";
import { deriveUnit, itemBonus, slotFor, type SpriteFacts } from "./stats";

/** One party member as stored in dungeon_parties.slots. */
export interface SlotIds {
  hero: string;
  weapon?: string;
  armor?: string;
  trinket?: string;
  /** The player's skill choice (animation ids by slot); checked against the hero's own scored animations on load. */
  skills?: Partial<Record<SkillSlot, string>>;
}

const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64;

/**
 * Reads dungeon_parties.slots in either format:
 *  - old: ["genId", …] (any category; non-figures are dropped later by validation)
 *  - new: [{ hero, weapon?, armor?, trinket? }, …]
 * Anything malformed is skipped. At most 4 members.
 */
export function parseSlots(raw: unknown): SlotIds[] {
  if (!Array.isArray(raw)) return [];
  const out: SlotIds[] = [];
  for (const entry of raw) {
    if (isId(entry)) out.push({ hero: entry });
    else if (entry && typeof entry === "object" && isId((entry as Record<string, unknown>).hero)) {
      const e = entry as Record<string, unknown>;
      const m: SlotIds = { hero: e.hero as string };
      for (const s of GEAR_SLOTS) if (isId(e[s])) m[s] = e[s] as string;
      const sk = e.skills as Record<string, unknown> | undefined;
      if (sk && typeof sk === "object") {
        const picked: Partial<Record<SkillSlot, string>> = {};
        for (const slot of SKILL_SLOTS) if (isId(sk[slot])) picked[slot] = sk[slot] as string;
        if (Object.keys(picked).length) m.skills = picked;
      }
      out.push(m);
    }
  }
  return out;
}

/** Every generation id a slot list mentions (to load them in one query). */
export function referencedIds(slots: SlotIds[]): string[] {
  const ids = new Set<string>();
  for (const m of slots) {
    ids.add(m.hero);
    for (const s of GEAR_SLOTS) if (m[s]) ids.add(m[s]!);
  }
  return [...ids];
}

/**
 * Keeps only what's allowed: heroes must be the user's own figure sprites
 * (CHARACTERS / CREATURES), each gear id must be the user's own sprite of
 * the slot's category, no sprite is used twice, at most 4 members.
 * `owned` holds the user's eligible original sprites by id.
 */
export function validateSlots(slots: SlotIds[], owned: Map<string, SpriteFacts>): SlotIds[] {
  const used = new Set<string>();
  const out: SlotIds[] = [];
  for (const m of slots) {
    if (out.length >= PARTY_SIZE) break;
    const hero = owned.get(m.hero);
    if (!hero || slotFor(hero.categoryId) !== "hero" || used.has(hero.id)) continue;
    used.add(hero.id);
    const clean: SlotIds = { hero: hero.id };
    for (const s of GEAR_SLOTS) {
      const id = m[s];
      const item = id ? owned.get(id) : undefined;
      if (!item || slotFor(item.categoryId) !== s || used.has(item.id)) continue;
      used.add(item.id);
      clean[s] = item.id;
    }
    if (m.skills) clean.skills = { ...m.skills };
    out.push(clean);
  }
  return out;
}

const byScore = <T extends { id: string }>(score: (x: T) => number) => (a: T, b: T) =>
  score(b) - score(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** How much an item adds, as one number (for auto-equip ordering). */
export function itemScore(item: SpriteFacts, slot: GearSlot): number {
  const b = itemBonus(item, slot);
  return b.atk * 3 * (1 + b.crit * 4) + b.splash * 30 + b.hp / 4 + b.def * 0.8 + b.heal * 3 + (b.ward ? 6 : 0) + b.stars;
}

/**
 * Deterministic best party: the 4 strongest figures (bare power), each given
 * the best unused weapon / armor / trinket in that order.
 */
export function autoEquip(sprites: SpriteFacts[]): SlotIds[] {
  const figures = sprites.filter((s) => slotFor(s.categoryId) === "hero")
    .sort(byScore((s) => deriveUnit(s).power)).slice(0, PARTY_SIZE);
  const pools: Record<GearSlot, SpriteFacts[]> = { weapon: [], armor: [], trinket: [] };
  for (const s of sprites) {
    const slot = slotFor(s.categoryId);
    if (slot !== "hero") pools[slot].push(s);
  }
  for (const g of GEAR_SLOTS) pools[g].sort(byScore((x) => itemScore(x, g)));
  return figures.map((f, i) => {
    const m: SlotIds = { hero: f.id };
    for (const g of GEAR_SLOTS) if (pools[g][i]) m[g] = pools[g][i].id;
    return m;
  });
}
