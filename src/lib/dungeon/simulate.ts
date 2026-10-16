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
import type { SkillStat, UnitStats } from "./stats";
import { SKILL_RULES, type SkillSlot, type Tier } from "./config";
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
  kind: "hit" | "heal" | "revive" | "stunned";
  target: number;
  amount: number;
  crit: boolean;
  ko: boolean;
  element: Element;
  matchup: Matchup;
  /** Other enemies hit by the same attack (Casters, staves). */
  extra?: HitTarget[];
  /** Enemy hit redirected to a Guardian by its taunt. */
  taunt?: boolean;
  /** Damage reduced by the target's element ward. */
  ward?: boolean;
  /** HP the attacker healed from Leech. */
  leech?: number;
  /** First-round bonus from Ambush applied. */
  ambush?: boolean;
  /** The skill this hit used (its animation is played in the replay). */
  skill?: { slot: SkillSlot; tier: Tier; name: string; animId: string; rule: SkillStat["rule"] };
  /** Enemies stunned by this hit (Legendary skill). */
  stun?: number[];
}

/** Something that happens as a floor starts (shown before the fight). */
export interface StartEvent {
  kind: "revive";
  target: number;
  amount: number;
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
  /** HP each hero regained after clearing the floor (rest + Second wind / Mending moss). */
  restHeal: number[];
  /** Events before the fight (e.g. Phoenix feather reviving a fallen hero). */
  startEvents: StartEvent[];
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
  /** Fallen heroes to bring back at the start of the next floor (Phoenix feather picked while someone was down). */
  reviveNow?: number;
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
  const stunned = enemies.map(() => 0);
  const legendaryUsed = party.map(() => false);
  const log: FloorLog = {
    floor, zone: zoneFor(floor).id, boss: enemies.some((e) => e.boss), enemies, partyHpStart: [...hp], actions: [], rounds: 0, cleared: false,
    dealt: party.map(() => 0), taken: party.map(() => 0), healed: party.map(() => 0), partyKos: [], enemyHpEnd: [], chest: null, restHeal: party.map(() => 0), startEvents: [],
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
      const ambush = round === 1 && mods.firstRoundMul > 1;
      const modifier = mods.atkMul * (mods.elementMul[u.attackElement] ?? 1) * (ambush ? mods.firstRoundMul : 1);
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
      // Skill for this turn (the hero's turn number = the round): Legendary once per floor,
      // Epic every 4th turn, Rare every 3rd, otherwise the basic attack (SKILL_RULES)
      const skills = u.skills ?? [];
      const leg = skills.find((k) => k.rule === "legendary");
      const epic = skills.find((k) => k.rule === "epic");
      const rare = skills.find((k) => k.rule === "rare");
      let skill: SkillStat | undefined;
      if (leg && !legendaryUsed[i] && round === SKILL_RULES.legendary.atTurn) { skill = leg; legendaryUsed[i] = true; }
      else if (epic && round % SKILL_RULES.epic.every === 0) skill = epic;
      else if (rare && round % SKILL_RULES.rare.every === 0) skill = rare;
      else skill = skills.find((k) => k.rule === "basic");
      const rule = skill?.rule ?? "basic";
      const sMult = rule === "basic" ? 1 : SKILL_RULES[rule].mult;
      const sAll = rule !== "basic" && SKILL_RULES[rule].all;
      const others = ehp.map((h, t) => (h > 0 && t !== front ? t : -1)).filter((t) => t >= 0);
      const mainShare = sAll ? sMult : (u.allHit > 0 ? u.allHit : 1) * sMult;
      const main = hitOne(front, mainShare);
      const share = sAll ? sMult : u.allHit > 0 ? u.allHit : u.splash;
      const extra = share > 0 ? others.map((t) => hitOne(t, share)) : [];
      const stun: number[] = [];
      if (rule === "legendary") {
        for (const t of [front, ...others]) if (ehp[t] > 0) { stunned[t] = SKILL_RULES.legendary.stun; stun.push(t); }
      }
      const total = main.amount + extra.reduce((a, x) => a + x.amount, 0);
      const leech = mods.lifesteal > 0 ? Math.min(u.hp - hp[i], Math.round(total * mods.lifesteal)) : 0;
      if (leech > 0) { hp[i] += leech; log.healed[i] += leech; }
      log.actions.push({
        round, side: "party", actor: i, kind: "hit", target: front, amount: main.amount, crit, ko: main.ko,
        element: u.attackElement, matchup: main.matchup, ...(extra.length ? { extra } : {}),
        ...(leech > 0 ? { leech } : {}), ...(ambush ? { ambush: true } : {}),
        ...(skill ? { skill: { slot: skill.slot, tier: skill.tier, name: skill.name, animId: skill.animId, rule } } : {}),
        ...(stun.length ? { stun } : {}),
      });
    }

    for (let e = 0; e < enemies.length && partyAlive(); e++) {
      if (ehp[e] <= 0) continue;
      if (stunned[e] > 0) {
        stunned[e]--;
        log.actions.push({ round, side: "enemy", actor: e, kind: "stunned", target: -1, amount: 0, crit: false, ko: false, element: enemies[e].element, matchup: "normal" });
        continue;
      }
      const alive = living();
      const guards = alive.filter((i) => party[i].taunt > 0);
      const tauntRoll = rng.next();
      const taunted = guards.length > 0 && tauntRoll < (mods.taunt ?? party[guards[0]].taunt);
      const t = taunted ? guards[0] : alive[Math.floor(rng.next() * alive.length)];
      const u = party[t];
      const ecrit = rng.next() < ENEMY_CRIT;
      const warded = u.ward !== null && u.ward === enemies[e].element;
      const r = computeDamage({
        atk: enemies[e].atk, def: u.def * mods.defMul, attackElement: enemies[e].element, defenderElement: u.element,
        crit: ecrit, modifier: warded ? WARD_MULTIPLIER : 1, roll: rng.next(),
      });
      const amount = Math.min(r.amount, hp[t]);
      hp[t] -= amount;
      log.taken[t] += amount;
      const ko = hp[t] <= 0;
      log.actions.push({
        round, side: "enemy", actor: e, kind: "hit", target: t, amount, crit: ecrit, ko, element: enemies[e].element, matchup: r.matchup,
        ...(taunted ? { taunt: true } : {}), ...(warded ? { ward: true } : {}),
      });
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
    // Phoenix feather picked while a hero was down: they get back up now
    const startEvents: StartEvent[] = [];
    while ((st.reviveNow ?? 0) > 0) {
      st.reviveNow = (st.reviveNow ?? 0) - 1;
      const down = st.hp.findIndex((h) => h <= 0);
      if (down < 0) break;
      st.hp[down] = Math.round(party[down].hp * 0.5);
      startEvents.push({ kind: "revive", target: down, amount: st.hp[down] });
    }
    const mods = modsFor([...st.blessings, ...st.buffs]);
    const log = fightFloor(party, st, floor, mods, rng);
    log.startEvents = startEvents;
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
      if (st.hp[i] <= 0) continue;
      const before = st.hp[i];
      st.hp[i] = Math.min(party[i].hp, st.hp[i] + Math.round(party[i].hp * heal));
      log.restHeal[i] = st.hp[i] - before;
    }
    if (floor >= MAX_FLOOR) { st.done = true; break; }
    if (floor % BLESSING_EVERY === 0) {
      st.offer = offerFor(st.seed, floor, st.blessings, party.map((u) => u.attackElement), party.some((u) => u.taunt > 0));
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
  const next: RunState = { ...structuredClone(state), blessings: [...state.blessings, blessingId], offer: null };
  // Phoenix feather with a hero already down: that hero gets back up as the next floor starts,
  // which uses up the feather (otherwise it waits for the next hero to fall).
  if (blessingId === "phoenix" && state.hp.some((h) => h <= 0)) {
    next.reviveNow = (next.reviveNow ?? 0) + 1;
    next.revivesUsed += 1;
  }
  return { ok: true, state: next };
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
