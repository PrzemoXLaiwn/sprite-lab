// =============================================================================
// Sprite Dungeon — party slots: parsing, validation, auto-equip, upgrade tip
// =============================================================================
// Pure. The server runs every slot list through validateSlots() against the
// user's own original sprites before saving or fighting — the client is never
// trusted.
// =============================================================================

import { GEAR_LABEL, GEAR_MAKE_CATEGORY, GEAR_SLOTS, HERO_MAKE_CATEGORY, PARTY_SIZE, type GearSlot } from "./config";
import { deriveUnit, slotFor, spriteMultiplier, type SpriteFacts } from "./stats";

/** One party member as stored in dungeon_parties.slots. */
export interface SlotIds {
  hero: string;
  weapon?: string;
  armor?: string;
  trinket?: string;
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
    out.push(clean);
  }
  return out;
}

const byScore = <T extends { id: string }>(score: (x: T) => number) => (a: T, b: T) =>
  score(b) - score(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Deterministic best party: the 4 strongest figures, each given the best
 * unused weapon / armor / trinket (by the item's own multiplier), in order.
 */
export function autoEquip(sprites: SpriteFacts[]): SlotIds[] {
  const figures = sprites.filter((s) => slotFor(s.categoryId) === "hero")
    .sort(byScore((s) => deriveUnit(s).power)).slice(0, PARTY_SIZE);
  const pools: Record<GearSlot, SpriteFacts[]> = { weapon: [], armor: [], trinket: [] };
  for (const s of sprites) {
    const slot = slotFor(s.categoryId);
    if (slot !== "hero") pools[slot].push(s);
  }
  for (const s of GEAR_SLOTS) pools[s].sort(byScore(spriteMultiplier));
  return figures.map((f, i) => {
    const m: SlotIds = { hero: f.id };
    for (const s of GEAR_SLOTS) if (pools[s][i]) m[s] = pools[s][i].id;
    return m;
  });
}

// ── Upgrade tip ──────────────────────────────────────────────────────────────

export interface TipMember {
  id: string;
  name: string;
  animated: boolean;
  hd: boolean;
  gear: Partial<Record<GearSlot, string>>;
}

/** Sprites the user owns but isn't using, per slot. */
export type Spare = Record<"hero" | GearSlot, number>;

export interface Tip {
  text: string;
  href: string;
  action: string;
}

const MAKE_WHAT: Record<GearSlot, string> = { weapon: "a weapon", armor: "armor", trinket: "an item" };

function short(name: string): string {
  return name.length > 22 ? `${name.slice(0, 21)}…` : name;
}

/**
 * At most one tip, chosen deterministically, always pointing at a real
 * product action. Order: animate a hero → make missing gear → make another
 * hero → HD. Gear the user already owns is left to Auto-equip, not a tip.
 */
export function pickTip(members: TipMember[], spare: Spare): Tip | null {
  const still = members.find((m) => !m.animated);
  if (still) {
    return { text: `Animate your ${short(still.name)}: animated heroes are 40% stronger.`, href: `/animate?id=${encodeURIComponent(still.id)}`, action: "Animate" };
  }
  for (const slot of GEAR_SLOTS) {
    const bare = members.find((m) => !m.gear[slot]);
    if (bare && spare[slot] === 0) {
      const what = MAKE_WHAT[slot];
      return { text: `Your ${short(bare.name)} has no ${GEAR_LABEL[slot].toLowerCase()}: make ${what} and it becomes loot.`, href: `/generate?categoryId=${GEAR_MAKE_CATEGORY[slot]}`, action: "Create" };
    }
  }
  if (members.length < PARTY_SIZE && spare.hero === 0) {
    return { text: "Make another character or creature: every new figure is a new hero.", href: `/generate?categoryId=${HERO_MAKE_CATEGORY}`, action: "Create" };
  }
  if (members.some((m) => !m.hd)) {
    return { text: "HD sprites are 15% stronger. Pick HD quality on your next character.", href: `/generate?categoryId=${HERO_MAKE_CATEGORY}`, action: "Create" };
  }
  return null;
}
