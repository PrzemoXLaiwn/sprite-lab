// =============================================================================
// Sprite Dungeon — the whole expedition, simulated on the server
// =============================================================================
// Pure and deterministic: same party + same seed → the same log, byte for byte.
// The client only replays the log; it never decides an outcome.
//
// Each floor: enemies of the floor's theme spawn (scaled by depth, a boss
// every 5th floor), then rounds of auto-battle. In a round every living party
// member acts in slot order — a member with a trinket first heals the weakest
// hurt ally, then everyone hits the front enemy — then every living enemy hits
// a random living member. Clearing a floor rests the survivors; the run ends
// on the floor where the party falls.
// =============================================================================

import {
  BOSS_ATK, BOSS_DEF, BOSS_EVERY, BOSS_HP, CRIT_CHANCE, CRIT_MULTIPLIER, DAMAGE_SPREAD,
  ENEMY_ATK_PER_FLOOR, ENEMY_DEF_EVERY, ENEMY_HP_PER_FLOOR, ENEMY_STATS,
  HEAL_THRESHOLD, MAX_ENEMIES, MAX_FLOOR, MAX_ROUNDS_PER_FLOOR, REST_HEAL, themeFor, type EnemyKind,
} from "./config";
import { makeRng } from "./rng";
import type { UnitStats } from "./stats";

export interface EnemyUnit {
  kind: EnemyKind;
  name: string;
  boss: boolean;
  hp: number;
  atk: number;
  def: number;
}

export interface BattleAction {
  round: number;
  /** Who acts. */
  side: "party" | "enemy";
  actor: number;
  /** "hit" targets the other side, "heal" the actor's own side. */
  kind: "hit" | "heal";
  target: number;
  amount: number;
  crit: boolean;
  /** The target fell to this hit. */
  ko: boolean;
}

export interface FloorLog {
  floor: number;
  /** Theme id (sewers, crypt, cave, forge, abyss). */
  theme: string;
  boss: boolean;
  enemies: EnemyUnit[];
  /** Party HP when the floor starts (0 = knocked out earlier). */
  partyHpStart: number[];
  actions: BattleAction[];
  rounds: number;
  cleared: boolean;
  /** Per party slot, this floor. */
  dealt: number[];
  taken: number[];
  healed: number[];
  /** Party slots knocked out on this floor. */
  partyKos: number[];
  enemyKos: number;
}

export interface RunLog {
  version: 2;
  seed: number;
  party: UnitStats[];
  floors: FloorLog[];
  /** Deepest floor reached (the one the party fell on). */
  floor: number;
}

/** Enemy line-up of a floor. Uses the run's rng, so it's part of the deterministic log. */
export function spawnFloor(floor: number, rng: () => number): EnemyUnit[] {
  const theme = themeFor(floor);
  const hpMul = 1 + ENEMY_HP_PER_FLOOR * (floor - 1);
  const atkMul = 1 + ENEMY_ATK_PER_FLOOR * (floor - 1);
  const defAdd = Math.floor((floor - 1) / ENEMY_DEF_EVERY);
  const make = (kind: EnemyKind, name: string, boss: boolean): EnemyUnit => {
    const d = ENEMY_STATS[kind];
    return {
      kind,
      name,
      boss,
      hp: Math.round(d.hp * hpMul * (boss ? BOSS_HP : 1)),
      atk: Math.round(d.atk * atkMul * (boss ? BOSS_ATK : 1)),
      def: d.def + defAdd + (boss ? BOSS_DEF : 0),
    };
  };
  if (floor % BOSS_EVERY === 0) return [make(theme.boss.kind, theme.boss.name, true)];
  const count = Math.min(MAX_ENEMIES, 1 + Math.floor(floor / 3));
  return Array.from({ length: count }, () => {
    const e = theme.enemies[Math.floor(rng() * theme.enemies.length)];
    return make(e.kind, e.name, false);
  });
}

function damage(atk: number, def: number, critChance: number, rng: () => number): { amount: number; crit: boolean } {
  const spread = 1 - DAMAGE_SPREAD + rng() * DAMAGE_SPREAD * 2;
  const crit = rng() < critChance;
  return { amount: Math.max(1, Math.round(atk * spread * (crit ? CRIT_MULTIPLIER : 1)) - def), crit };
}

export function simulateRun(party: UnitStats[], seed: number): RunLog {
  const rng = makeRng(seed);
  const hp = party.map((u) => u.hp);
  const floors: FloorLog[] = [];
  let floor = 0;

  while (party.length > 0 && floor < MAX_FLOOR && hp.some((h) => h > 0)) {
    floor++;
    const enemies = spawnFloor(floor, rng);
    const ehp = enemies.map((e) => e.hp);
    const log: FloorLog = {
      floor, theme: themeFor(floor).id, boss: enemies.some((e) => e.boss), enemies, partyHpStart: [...hp], actions: [], rounds: 0, cleared: false,
      dealt: party.map(() => 0), taken: party.map(() => 0), healed: party.map(() => 0), partyKos: [], enemyKos: 0,
    };
    const partyAlive = () => hp.some((h) => h > 0);
    const enemiesAlive = () => ehp.some((h) => h > 0);

    while (partyAlive() && enemiesAlive() && log.rounds < MAX_ROUNDS_PER_FLOOR) {
      const round = ++log.rounds;

      for (let i = 0; i < party.length && enemiesAlive(); i++) {
        if (hp[i] <= 0) continue;
        const u = party[i];
        // Trinket: a free heal on the weakest hurt ally
        if (u.heal > 0) {
          let best = -1, bestRatio = HEAL_THRESHOLD;
          for (let j = 0; j < party.length; j++) {
            const ratio = hp[j] / party[j].hp;
            if (hp[j] > 0 && ratio < bestRatio) { best = j; bestRatio = ratio; }
          }
          if (best >= 0) {
            const amount = Math.min(u.heal, party[best].hp - hp[best]);
            hp[best] += amount;
            log.healed[i] += amount;
            log.actions.push({ round, side: "party", actor: i, kind: "heal", target: best, amount, crit: false, ko: false });
          }
        }
        const t = ehp.findIndex((h) => h > 0);
        const hit = damage(u.atk, enemies[t].def, CRIT_CHANCE + u.crit, rng);
        const amount = Math.min(hit.amount, ehp[t]);
        ehp[t] -= amount;
        log.dealt[i] += amount;
        const ko = ehp[t] <= 0;
        if (ko) log.enemyKos++;
        log.actions.push({ round, side: "party", actor: i, kind: "hit", target: t, amount, crit: hit.crit, ko });
      }

      for (let e = 0; e < enemies.length && partyAlive(); e++) {
        if (ehp[e] <= 0) continue;
        const alive = hp.map((h, i) => (h > 0 ? i : -1)).filter((i) => i >= 0);
        const t = alive[Math.floor(rng() * alive.length)];
        const hit = damage(enemies[e].atk, party[t].def, CRIT_CHANCE, rng);
        const amount = Math.min(hit.amount, hp[t]);
        hp[t] -= amount;
        log.taken[t] += amount;
        const ko = hp[t] <= 0;
        if (ko) log.partyKos.push(t);
        log.actions.push({ round, side: "enemy", actor: e, kind: "hit", target: t, amount, crit: hit.crit, ko });
      }
    }

    log.cleared = !enemiesAlive() && partyAlive();
    floors.push(log);
    if (!log.cleared) break;
    for (let i = 0; i < party.length; i++) {
      if (hp[i] > 0) hp[i] = Math.min(party[i].hp, hp[i] + Math.round(party[i].hp * REST_HEAL));
    }
  }

  return { version: 2, seed, party, floors, floor };
}
