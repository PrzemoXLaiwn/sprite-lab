// =============================================================================
// Sprite Dungeon — the climb report: near misses, MVP, who fell, build tips
// =============================================================================
// Pure. Every tip comes from what actually happened in the run and points at
// a real product action (equip, generate, animate).
// =============================================================================

import { CLASSES, ELEMENT_DEFS, STAR_STEP, zoneFor, type ClassId, type Element, type GearSlot } from "./config";
import type { RunState } from "./simulate";
import { floorEnemies, towerWeek } from "./tower";

export interface RunTip {
  text: string;
  /** Link to a product action, or null when the page should open a picker. */
  href: string | null;
  action: string;
  picker?: { index: number; slot: GearSlot };
}

export interface ResultHero {
  id: string;
  name: string;
  classId: ClassId;
  stars: number;
  animated: boolean;
  hd: boolean;
  attackElement: Element;
  gear: Partial<Record<GearSlot, string>>;
}

export interface RunReport {
  floor: number;
  newBest: boolean;
  bestBefore: number | null;
  rankBefore: number | null;
  rankAfter: number | null;
  players: number;
  nearMiss: string[];
  mvp: number;
  mvpDamage: number;
  firstFallen: number | null;
  stoppedBy: string;
  bossStop: boolean;
  tips: RunTip[];
}

const joinAnd = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function buildReport(input: {
  state: RunState;
  heroes: ResultHero[];
  bestBefore: number | null;
  rankBefore: number | null;
  rankAfter: number | null;
  players: number;
  /** Unused sprites the player owns, per gear slot. */
  spare: Record<GearSlot, number>;
}): RunReport {
  const { state: st, heroes } = input;
  const floor = st.floor;
  const enemies = floor > 0 ? floorEnemies(st.week, floor) : [];
  const boss = enemies.find((e) => e.boss);
  const names = [...new Set(enemies.map((e) => e.name))];
  let mvp = 0;
  st.dealt.forEach((d, i) => { if (d > st.dealt[mvp]) mvp = i; });

  const newBest = input.bestBefore === null || floor > input.bestBefore;
  const nearMiss: string[] = [];
  // "HP short" only when it was close: at most a third of the floor's total enemy HP
  const floorHp = enemies.reduce((sum, e) => sum + e.hp, 0);
  if (st.shortBy !== null && st.shortBy > 0 && st.shortBy <= floorHp / 3) nearMiss.push(`${st.shortBy.toLocaleString("en")} HP short of floor ${floor + 1}`);
  if (input.bestBefore !== null && input.bestBefore > floor) nearMiss.push(`Your best is ${plural(input.bestBefore - floor, "floor")} up`);
  if (newBest && input.bestBefore !== null && floor > input.bestBefore) nearMiss.push(`${plural(floor - input.bestBefore, "floor")} above your old best`);

  return {
    floor, newBest, bestBefore: input.bestBefore, rankBefore: input.rankBefore, rankAfter: input.rankAfter, players: input.players,
    nearMiss, mvp, mvpDamage: st.dealt[mvp] ?? 0, firstFallen: st.firstFallen,
    stoppedBy: boss ? boss.name : joinAnd(names) || "the tower", bossStop: Boolean(boss),
    tips: runTips(st, heroes, input.spare),
  };
}

const short = (n: string) => (n.length > 22 ? `${n.slice(0, 21)}…` : n);

/** Up to two tips, in priority order, from what happened in this run. */
export function runTips(st: RunState, heroes: ResultHero[], spare: Record<GearSlot, number>): RunTip[] {
  const tips: RunTip[] = [];
  const fell = st.firstFallen !== null ? heroes[st.firstFallen] : undefined;

  // 1. Who fell first, and what would have kept them up
  if (fell) {
    const idx = st.firstFallen!;
    if (!fell.gear.armor) {
      tips.push(spare.armor > 0
        ? { text: `${short(fell.name)} fell first. Give them armor.`, href: null, action: "Equip armor", picker: { index: idx, slot: "armor" } }
        : { text: `${short(fell.name)} fell first. Armor adds HP and defence: make one.`, href: "/generate?categoryId=ARMOR", action: "Make armor" });
    } else if (!heroes.some((h) => CLASSES[h.classId].heal > 0)) {
      tips.push({ text: `${short(fell.name)} fell first. A Healer would keep the party up: make a cleric or druid.`, href: "/generate?categoryId=CHARACTERS&prompt=cleric", action: "Make a healer" });
    }
  }

  // 2. The zone that stopped you: its weakness this week vs your attack elements
  const zone = towerWeek(st.week).find((z) => z.id === zoneFor(Math.max(1, st.floor)).id);
  if (zone && zone.weakTo.length) {
    const yours = new Set(heroes.map((h) => h.attackElement));
    if (!zone.weakTo.some((e) => yours.has(e))) {
      const first = zone.weakTo[0];
      const label = ELEMENT_DEFS[first].label;
      const list = zone.weakTo.map((e) => ELEMENT_DEFS[e].label).join(" and ");
      tips.push({
        text: `${zone.name} enemies this week are weak to ${list}. You have no ${label} weapon: make one.`,
        href: `/generate?categoryId=WEAPONS&prompt=${encodeURIComponent(`${label.toLowerCase()} sword`)}`,
        action: `Make a ${label} weapon`,
      });
    }
  }

  // 3. Stars: the weakest hero's next star
  if (tips.length < 2 && heroes.length) {
    const low = [...heroes].sort((a, b) => a.stars - b.stars)[0];
    if (!low.animated) {
      tips.push({ text: `Animate ${short(low.name)}: +1 star, ×${STAR_STEP} to everything it gives.`, href: `/animate?id=${encodeURIComponent(low.id)}`, action: "Animate" });
    } else if (!low.hd) {
      tips.push({ text: `HD sprites get +1 star. Make your next hero in HD.`, href: "/generate?categoryId=CHARACTERS", action: "Create" });
    }
  }
  return tips.slice(0, 2);
}
