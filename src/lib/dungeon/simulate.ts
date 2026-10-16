// =============================================================================
// Sprite Dungeon — the climb, simulated on the server in resumable segments
// =============================================================================
// Pure and deterministic. A run is a state (RunState) plus segments: each
// segment climbs floor after floor until a blessing choice (after every 3rd
// cleared floor) or until the party falls. The state holds the rng position,
// so a paused run continues exactly where it stopped. The client only replays
// the floors it is sent; it never decides an outcome.
//
// A round: every living hero acts in slot order (healers / healing trinkets
// first mend the weakest hurt ally, then everyone attacks: Casters hit every
// enemy, staves splash, others hit the front enemy), then every living enemy
// attacks (a living Guardian draws its taunt share, otherwise a random hero).
// =============================================================================

import { CHEST_BUFFS, chestFor, modsFor, offerFor, type RunMods } from "./blessings";
import {
  BLESSING_EVERY, BOSS_EVERY, ENEMY_CRIT, HEAL_THRESHOLD, MAX_FLOOR, MAX_ROUNDS_PER_FLOOR, REST_HEAL, WARD_MULTIPLIER, zoneFor, type Element,
} from "./config";
import { computeDamage, type Matchup } from "./damage";
import { createRng, type Rng } from "./rng";
import type { UnitStats } from "./stats";
import { floorEnemies, type EnemyUnit } from "./tower";

export type { EnemyUnit } from "./tower";

export interface HitTarget {
  target: number;
  amount: number;
  ko: boolean;
  matchup: Matchup;
}

export interface BattleAction {
  round: number;
  side: "party" | "enemy";
  actor: number;
  /** hit: damage to the other side; heal: to the actor's side; revive: a fallen hero gets back up. */
  kind: "hit" | "heal" | "revive";
  target: number;
  amount: number;
  crit: boolean;
  ko: boolean;
  element: Element;
  matchup: Matchup;
  /** Other enemies hit by the same attack (Casters, staves). */
  extra?: HitTarget[];
}

export interface FloorLog {
  floor: number;
  zone: string;
  boss: boolean;
  enemies: EnemyUnit[];
  /** Party HP when the floor starts (0 = knocked out earlier). */
  partyHpStart: number[];
  actions: BattleAction[];
  rounds: number;
  cleared: boolean;
  dealt: number[];
  taken: number[];
  healed: number[];
  partyKos: number[];
  /** Enemy HP left when the floor ended (all 0 when cleared). */
  enemyHpEnd: number[];
  /** Boss chest buff id, when a boss fell. */
  chest: string | null;
}

export interface RunState {
  v: 1;
  seed: number;
  week: string;
  /** rng position (mulberry32 state). */
  rng: number;
  /** Deepest floor entered. */
  floor: number;
  hp: number[];
  blessings: string[];
  buffs: string[];
  /** Blessing ids offered and waiting for a choice (null = not paused). */
  offer: string[] | null;
  done: boolean;
  revivesUsed: number;
  /** Damage per hero over the whole run. */
  dealt: number[];
  firstFallen: number | null;
  /** Enemy HP left on the floor where the party fell. */
  shortBy: number | null;
}

export function initialState(party: UnitStats[], seed: number, week: string): RunState {
  return {
    v: 1, seed, week, rng: seed >>> 0, floor: 0, hp: party.map((u) => u.hp), blessings: [], buffs: [], offer: null, done: party.length === 0,
    revivesUsed: 0, dealt: party.map(() => 0), firstFallen: null, shortBy: null,
  };
}

function fightFloor(party: UnitStats[], st: RunState, floor: number, mods: RunMods, rng: Rng): FloorLog {
  const enemies = floorEnemies(st.week, floor);
  const hp = st.hp;
  const ehp = enemies.map((e) => e.hp);
  const log: FloorLog = {
    floor, zone: zoneFor(floor).id, boss: enemies.some((e) => e.boss), enemies, partyHpStart: [...hp], actions: [], rounds: 0, cleared: false,
    dealt: party.map(() => 0), taken: party.map(() => 0), healed: party.map(() => 0), partyKos: [], enemyHpEnd: [], chest: null,
  };
  const partyAlive = () => hp.some((h) => h > 0);
  const enemiesAlive = () => ehp.some((h) => h > 0);
  const living = () => hp.map((h, i) => (h > 0 ? i : -1)).filter((i) => i >= 0);

  while (partyAlive() && enemiesAlive() && log.rounds < MAX_ROUNDS_PER_FLOOR) {
    const round = ++log.rounds;

    for (let i = 0; i < party.length && enemiesAlive(); i++) {
      if (hp[i] <= 0) continue;
      const u = party[i];
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
          log.actions.push({ round, side: "party", actor: i, kind: "heal", target: best, amount, crit: false, ko: false, element: "holy", matchup: "normal" });
        }
      }
      const front = ehp.findIndex((h) => h > 0);
      const crit = rng.next() < u.crit + mods.critAdd;
      const modifier = mods.atkMul * (mods.elementMul[u.attackElement] ?? 1) * (round === 1 ? mods.firstRoundMul : 1);
      const hitOne = (t: number, share: number): HitTarget => {
        const e = enemies[t];
        const r = computeDamage({
          atk: u.atk * share, def: e.def, attackElement: u.attackElement, defenderElement: e.element, crit,
          modifier, roll: rng.next(), weakMul: mods.weakMul, critMul: e.boss ? mods.bossCritMul : undefined,
        });
        const amount = Math.min(r.amount, ehp[t]);
        ehp[t] -= amount;
        log.dealt[i] += amount;
        st.dealt[i] += amount;
        return { target: t, amount, ko: ehp[t] <= 0, matchup: r.matchup };
      };
      const others = ehp.map((h, t) => (h > 0 && t !== front ? t : -1)).filter((t) => t >= 0);
      const main = hitOne(front, u.allHit > 0 ? u.allHit : 1);
      const share = u.allHit > 0 ? u.allHit : u.splash;
      const extra = share > 0 ? others.map((t) => hitOne(t, share)) : [];
      const total = main.amount + extra.reduce((a, x) => a + x.amount, 0);
      if (mods.lifesteal > 0) hp[i] = Math.min(u.hp, hp[i] + Math.round(total * mods.lifesteal));
      log.actions.push({
        round, side: "party", actor: i, kind: "hit", target: front, amount: main.amount, crit, ko: main.ko,
        element: u.attackElement, matchup: main.matchup, ...(extra.length ? { extra } : {}),
      });
    }

    for (let e = 0; e < enemies.length && partyAlive(); e++) {
      if (ehp[e] <= 0) continue;
      const alive = living();
      const guards = alive.filter((i) => party[i].taunt > 0);
      const tauntRoll = rng.next();
      const t = guards.length && tauntRoll < (mods.taunt ?? party[guards[0]].taunt)
        ? guards[0]
        : alive[Math.floor(rng.next() * alive.length)];
      const u = party[t];
      const ecrit = rng.next() < ENEMY_CRIT;
      const r = computeDamage({
        atk: enemies[e].atk, def: u.def * mods.defMul, attackElement: enemies[e].element, defenderElement: u.element,
        crit: ecrit, modifier: u.ward && u.ward === enemies[e].element ? WARD_MULTIPLIER : 1, roll: rng.next(),
      });
      const amount = Math.min(r.amount, hp[t]);
      hp[t] -= amount;
      log.taken[t] += amount;
      const ko = hp[t] <= 0;
      log.actions.push({ round, side: "enemy", actor: e, kind: "hit", target: t, amount, crit: ecrit, ko, element: enemies[e].element, matchup: r.matchup });
      if (ko) {
        log.partyKos.push(t);
        if (st.firstFallen === null) st.firstFallen = t;
        if (st.revivesUsed < mods.revives) {
          st.revivesUsed++;
          hp[t] = Math.round(u.hp * 0.5);
          log.actions.push({ round, side: "party", actor: t, kind: "revive", target: t, amount: hp[t], crit: false, ko: false, element: "holy", matchup: "normal" });
        }
      }
    }
  }

  log.cleared = !enemiesAlive() && partyAlive();
  log.enemyHpEnd = [...ehp];
  return log;
}

/**
 * Climbs from the state's floor until the next blessing choice or the end.
 * Mutates nothing it was given: returns the floors fought and the new state.
 */
export function runSegment(party: UnitStats[], state: RunState): { floors: FloorLog[]; state: RunState } {
  const st: RunState = structuredClone(state);
  const floors: FloorLog[] = [];
  if (st.done || st.offer) return { floors, state: st };
  const rng = createRng(st.rng);

  while (!st.done) {
    const floor = st.floor + 1;
    st.floor = floor;
    const mods = modsFor([...st.blessings, ...st.buffs]);
    const log = fightFloor(party, st, floor, mods, rng);
    floors.push(log);
    if (!log.cleared) {
      st.done = true;
      st.shortBy = log.enemyHpEnd.reduce((a, h) => a + Math.max(0, h), 0);
      break;
    }
    if (floor % BOSS_EVERY === 0) {
      log.chest = chestFor(st.seed, floor);
      st.buffs.push(log.chest);
    }
    const heal = REST_HEAL + modsFor([...st.blessings, ...st.buffs]).healAfterFloor;
    for (let i = 0; i < party.length; i++) {
      if (st.hp[i] > 0) st.hp[i] = Math.min(party[i].hp, st.hp[i] + Math.round(party[i].hp * heal));
    }
    if (floor >= MAX_FLOOR) { st.done = true; break; }
    if (floor % BLESSING_EVERY === 0) {
      st.offer = offerFor(st.seed, floor, st.blessings, party.map((u) => u.attackElement));
      if (st.offer.length) break;
      st.offer = null;
    }
  }
  st.rng = rng.state;
  return { floors, state: st };
}

export type ChooseError = "not-waiting" | "not-offered";

/** Applies a blessing choice to a paused state (validated against the server's offer). */
export function chooseBlessing(state: RunState, blessingId: string): { ok: true; state: RunState } | { ok: false; reason: ChooseError } {
  if (!state.offer || state.done) return { ok: false, reason: "not-waiting" };
  if (!state.offer.includes(blessingId)) return { ok: false, reason: "not-offered" };
  return { ok: true, state: { ...structuredClone(state), blessings: [...state.blessings, blessingId], offer: null } };
}

/** A whole run, picking with `pick` at every choice (tests, auto-finish). */
export function simulateFull(party: UnitStats[], seed: number, week: string, pick: (offer: string[]) => string = (o) => o[0]): { floors: FloorLog[]; state: RunState } {
  let state = initialState(party, seed, week);
  const floors: FloorLog[] = [];
  for (let guard = 0; guard < MAX_FLOOR + 1 && !state.done; guard++) {
    const seg = runSegment(party, state);
    floors.push(...seg.floors);
    state = seg.state;
    if (state.offer) {
      const c = chooseBlessing(state, pick(state.offer));
      if (!c.ok) break;
      state = c.state;
    }
  }
  return { floors, state };
}

/** Chest buff names for display. */
export function chestName(id: string): string {
  return CHEST_BUFFS.find((c) => c.id === id)?.name ?? "Chest";
}
