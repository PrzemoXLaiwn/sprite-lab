// =============================================================================
// Sprite Dungeon — this week's tower (pure, the same for every player)
// =============================================================================
// Seeded by the ISO week only: each zone gets an element for the week and
// every floor's line-up is fixed. Combat rolls come from the run's own seed.
// =============================================================================

import {
  BOSS_ATK, BOSS_DEF, BOSS_EVERY, BOSS_HP, ELEMENT_DEFS, ENEMY_ATK_GROWTH, ENEMY_DEF_PER_FLOOR, ENEMY_HP_GROWTH,
  ENEMY_BASE, ENEMY_STATS, MAX_ENEMIES, ZONES, zoneFor, type Element, type EnemyKind, type ZoneDef,
} from "./config";
import { hash32, makeRng } from "./rng";

export interface EnemyUnit {
  kind: EnemyKind;
  name: string;
  boss: boolean;
  element: Element;
  hp: number;
  atk: number;
  def: number;
}

export interface ZoneWeek {
  id: ZoneDef["id"];
  name: string;
  from: number;
  to: number | null;
  element: Element;
  /** Elements that hit this zone's enemies for ×1.5. */
  weakTo: Element[];
  resists: Element[];
  boss: string;
}

export function zoneElement(week: string, zone: ZoneDef): Element {
  return zone.elements[hash32(`zone:${week}:${zone.id}`) % zone.elements.length];
}

/** The week's zones with their element and weaknesses (shown to players to plan builds). */
export function towerWeek(week: string): ZoneWeek[] {
  return ZONES.map((z, i) => {
    const element = zoneElement(week, z);
    const d = ELEMENT_DEFS[element];
    return { id: z.id, name: z.name, from: z.from, to: ZONES[i + 1] ? ZONES[i + 1].from - 1 : null, element, weakTo: d.weakTo, resists: d.resists, boss: z.boss.name };
  });
}

/** Enemy line-up of a floor this week. */
export function floorEnemies(week: string, floor: number): EnemyUnit[] {
  const zone = zoneFor(floor);
  const element = zoneElement(week, zone);
  const rng = makeRng(hash32(`tower:${week}:${floor}`));
  const hpMul = ENEMY_BASE * ENEMY_HP_GROWTH ** (floor - 1);
  const atkMul = ENEMY_BASE * ENEMY_ATK_GROWTH ** (floor - 1);
  const defAdd = ENEMY_DEF_PER_FLOOR * (floor - 1);
  const adj = ELEMENT_DEFS[element].adjective;
  const make = (kind: EnemyKind, boss: boolean, bossName?: string): EnemyUnit => {
    const d = ENEMY_STATS[kind];
    return {
      kind, boss, element,
      name: boss ? bossName! : adj ? `${adj} ${d.name}` : d.name,
      hp: Math.round(d.hp * hpMul * (boss ? BOSS_HP : 1)),
      atk: Math.round(d.atk * atkMul * (boss ? BOSS_ATK : 1)),
      def: d.def + defAdd + (boss ? BOSS_DEF : 0),
    };
  };
  if (floor % BOSS_EVERY === 0) return [make(zone.boss.kind, true, zone.boss.name)];
  const count = Math.min(MAX_ENEMIES, 1 + Math.floor(floor / 3));
  return Array.from({ length: count }, () => make(zone.enemies[Math.floor(rng() * zone.enemies.length)], false));
}
