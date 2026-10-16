// =============================================================================
// Sprite Dungeon — database side (Prisma raw SQL over src/lib/dungeon/sql.ts)
// =============================================================================
// Runs are stepwise: POST /api/play/run climbs to the first blessing choice
// (or the end) and stores the run's state; POST /api/play/run/choose applies a
// choice and climbs on. Every step is a conditional UPDATE on the run's step
// counter, so a double tap can't apply two choices. The leaderboard reads the
// run's floor as it grows, so an unfinished run counts at the floor reached.
// =============================================================================

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { pickAnimations, type AnimRef, type AnimRow, type HeroAnims } from "./anims";
import { skillScores, type CachedScore } from "./skill-analyse";
import { NEUTRAL_SCORE, isSkillLabel, resolveSkills, skillName, type SkillMetrics } from "./skills";
import { parseAnimationPrompt } from "@/lib/workspace/history";
import { blessingView } from "./blessings";
import { GEAR_SLOTS, LEADERBOARD_SIZE, PARTY_SIZE, RUN_IDLE_MS, RUNS_PER_DAY, SKILL_SLOTS, type GearSlot, type SkillSlot, type SpriteSlot, type Tier } from "./config";
import { autoEquip, parseSlots, referencedIds, validateSlots, type SlotIds } from "./party";
import { runSeed } from "./rng";
import {
  displayName, isoWeek, nextRunIndex, nextUtcMidnight, previousWeek, runsLeft, utcDay, weekStart,
} from "./rules";
import { chooseBlessing, initialState, runSegment, type FloorLog, type RunState } from "./simulate";
import {
  ACTIVE_RUN_SQL, ADVANCE_RUN_SQL, HERO_ANIMS_SQL, INSERT_RUN_SQL, LEADERBOARD_SQL, PARTY_GET_SQL, PARTY_SAVE_SQL, PAY_PRIZES_SQL, RECORDS_SQL,
  RUN_BY_ID_SQL, RUNS_TODAY_SQL, SPRITES_SQL, TROPHIES_SQL, prizeParams,
} from "./sql";
import {
  deriveParty, deriveUnit, itemBonus, powerOf, slotFor, type ItemBonus, type MemberFacts, type SpriteFacts, type UnitStats,
} from "./stats";
import { buildReport, type ResultHero, type RunReport } from "./summary";
import { classFor, elementFor, heroWork, starsFor } from "./detect";
import { towerWeek, type ZoneWeek } from "./tower";
import type { ClassId, Element } from "./config";

interface SpriteRow {
  id: string;
  category_id: string;
  style_id: string;
  image_url: string;
  prompt: string;
  animations: number;
  rotated: boolean;
  hd: boolean;
}

/** A sprite as the page sees it. */
export interface DungeonSprite {
  id: string;
  name: string;
  imageUrl: string;
  styleId: string;
  categoryId: string;
  /** Where it can go: a hero, or one gear slot. */
  slot: SpriteSlot;
  /** Pixel styles are drawn with nearest-neighbour scaling. */
  pixel: boolean;
  stars: number;
  hd: boolean;
  animated: boolean;
  /** Different animations made from it (heroes: each adds power). */
  animations: number;
  element: Element;
  classId: ClassId | null;
  /** Hero: bare power. Item: the power its bonus adds. */
  power: number;
  /** Heroes: bare stats with the breakdown. */
  stats: UnitStats | null;
  /** Items: what they add when equipped (for a hero of no particular class). */
  bonus: ItemBonus | null;
}

export interface PartyMember {
  hero: DungeonSprite;
  weapon: DungeonSprite | null;
  armor: DungeonSprite | null;
  trinket: DungeonSprite | null;
  /** Final stats with gear, including the "why this power?" breakdown. */
  stats: UnitStats;
  /** The hero's own animation sheets, played in battle (missing roles fall back to the sprite). */
  anims?: HeroAnims;
  /** Distinct animation labels made from the hero (each one adds power). */
  animationLabels?: string[];
  /** Skills in their slots (Basic / Special / Legendary). */
  skills?: PartySkill[];
  /** Every attack animation of the hero, scored (for swapping skills). */
  skillOptions?: PartySkill[];
}

export interface PartySkill {
  /** Animation generation id. */
  id: string;
  name: string;
  label: string;
  score: number;
  tier: Tier;
  metrics: SkillMetrics;
  /** Not analysed yet: shown as "analysing", counts as Common for now. */
  pending: boolean;
  anim: AnimRef;
  slot: SkillSlot | null;
}

export interface Records {
  bestEver: number | null;
  bestWeek: number | null;
  runsWeek: number;
}

const ROSTER_LIMIT = 150;

function facts(r: SpriteRow): SpriteFacts {
  return {
    id: r.id, categoryId: r.category_id, styleId: r.style_id, prompt: r.prompt ?? "",
    hd: Boolean(r.hd), animations: Number(r.animations ?? 0), rotated: Boolean(r.rotated),
  };
}

function shortName(prompt: string): string {
  const p = prompt.replace(/\s+/g, " ").trim();
  return p.length > 40 ? `${p.slice(0, 39)}…` : p || "Sprite";
}

function toSprite(r: SpriteRow): DungeonSprite {
  const f = facts(r);
  const slot = slotFor(f.categoryId);
  const st = slot === "hero" ? heroWork(f) : starsFor(f);
  const stats = slot === "hero" ? deriveUnit(f) : null;
  const bonus = slot === "hero" ? null : itemBonus(f, slot);
  return {
    id: r.id, name: shortName(r.prompt), imageUrl: r.image_url, styleId: r.style_id, categoryId: r.category_id, slot,
    pixel: r.style_id.toUpperCase().includes("PIXEL"), stars: st.stars, hd: st.hd,
    animated: "animations" in st ? st.animations > 0 : st.animated, animations: f.animations,
    element: elementFor(f.prompt), classId: classFor(f.prompt, f.categoryId),
    power: stats ? stats.power : powerOf({ hp: bonus!.hp, atk: bonus!.atk, def: bonus!.def, crit: bonus!.crit, heal: bonus!.heal, allHit: 0, splash: bonus!.splash }),
    stats, bonus,
  };
}

async function spriteRows(userId: string, ids: string[] | null, limit: number): Promise<SpriteRow[]> {
  return prisma.$queryRawUnsafe<SpriteRow[]>(SPRITES_SQL, userId, ids, limit);
}

/** The user's eligible sprites (newest first): figures and items. */
export async function loadRoster(userId: string): Promise<DungeonSprite[]> {
  return (await spriteRows(userId, null, ROSTER_LIMIT)).map(toSprite);
}

/** null = the user never saved a party. */
async function savedSlots(userId: string): Promise<SlotIds[] | null> {
  const rows = await prisma.$queryRawUnsafe<{ slots: unknown }[]>(PARTY_GET_SQL, userId);
  return rows.length ? parseSlots(rows[0].slots) : null;
}

/** Validates slots against the user's own sprites and builds the members. */
async function resolve(userId: string, slots: SlotIds[]): Promise<{ slots: SlotIds[]; members: PartyMember[] }> {
  const ids = referencedIds(slots.slice(0, PARTY_SIZE * 2)).slice(0, PARTY_SIZE * 8);
  const rows = ids.length ? await spriteRows(userId, ids, ids.length) : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const clean = validateSlots(slots, new Map(rows.map((r) => [r.id, facts(r)])));
  const f = (id?: string) => (id ? facts(byId.get(id)!) : null);
  const sprite = (id?: string) => (id ? toSprite(byId.get(id)!) : null);

  // The heroes' animations: motion roles for the stage, attack animations as skills
  const heroIds = clean.map((m) => m.hero);
  const animRows = heroIds.length ? await prisma.$queryRawUnsafe<AnimRow[]>(HERO_ANIMS_SQL, userId, heroIds).catch(() => [] as AnimRow[]) : [];
  const anims = pickAnimations(animRows);
  const skillRows = animRows.filter((r): r is AnimRow & { id: string } => {
    const p = parseAnimationPrompt(r.prompt);
    return Boolean(r.id && p && !p.directions && isSkillLabel(p.label));
  });
  const scores = await skillScores(skillRows.map((r) => ({
    id: r.id, prompt: r.prompt, imageUrl: r.image_url, sourceUrl: byId.get(r.source_generation_id)?.image_url ?? null,
  }))).catch(() => new Map<string, CachedScore>());

  const options = new Map<string, PartySkill[]>();
  for (const r of skillRows) {
    const p = parseAnimationPrompt(r.prompt)!;
    const sc = scores.get(r.id) ?? { ...NEUTRAL_SCORE, pending: true };
    const list = options.get(r.source_generation_id) ?? [];
    list.push({
      id: r.id, name: skillName(p.label), label: p.label, score: sc.score, tier: sc.tier, metrics: sc.metrics, pending: sc.pending,
      anim: { id: r.id, url: r.image_url, label: p.label, frameCount: p.frameCount, walkSet: false, fps: p.frameCount >= 9 ? 14 : 12 },
      slot: null,
    });
    options.set(r.source_generation_id, list);
  }

  const resolved = clean.map((m) => {
    const opts = options.get(m.hero) ?? [];
    const choice = resolveSkills(m.skills, opts.map((o) => ({ id: o.id, score: o.score, tier: o.tier })));
    const skills = SKILL_SLOTS.flatMap((slot) => {
      const o = opts.find((x) => x.id === choice[slot]);
      return o ? [{ ...o, slot }] : [];
    });
    return { slot: { ...m, skills: m.skills ? choice : undefined } as SlotIds, skills, opts };
  });

  const memberFacts: MemberFacts[] = clean.map((m, i) => ({
    hero: f(m.hero)!, weapon: f(m.weapon), armor: f(m.armor), trinket: f(m.trinket),
    skills: resolved[i].skills.map((k) => ({ slot: k.slot!, tier: k.tier, name: k.name, animId: k.id })),
  }));
  const stats = deriveParty(memberFacts);
  const members = clean.map((m, i) => {
    const heroAnims: HeroAnims = { ...(anims[m.hero] ?? {}) };
    const basic = resolved[i].skills.find((k) => k.slot === "basic");
    if (basic) heroAnims.attack = basic.anim;
    else delete heroAnims.attack; // no Basic skill: the plain attack, no animation
    return {
      hero: toSprite(byId.get(m.hero)!), weapon: sprite(m.weapon), armor: sprite(m.armor), trinket: sprite(m.trinket), stats: stats[i],
      anims: heroAnims,
      animationLabels: [...new Set(animRows.filter((r) => r.source_generation_id === m.hero).map((r) => parseAnimationPrompt(r.prompt)?.label).filter((l): l is string => Boolean(l)))],
      skills: resolved[i].skills,
      skillOptions: resolved[i].opts,
    };
  });
  return { slots: resolved.map((r) => r.slot), members };
}

/** Saves the party after server-side validation; returns it as stored. */
export async function saveParty(userId: string, slots: SlotIds[]): Promise<PartyMember[]> {
  const { slots: clean, members } = await resolve(userId, slots);
  await prisma.$executeRawUnsafe(PARTY_SAVE_SQL, userId, JSON.stringify(clean));
  return members;
}

/** Best party from the user's sprites (deterministic), saved through the normal validation. */
export async function autoEquipParty(userId: string): Promise<PartyMember[]> {
  const rows = await spriteRows(userId, null, ROSTER_LIMIT);
  return saveParty(userId, autoEquip(rows.map(facts)));
}

/**
 * The saved party (old-format rows load too: only figure ids survive, as heroes).
 * A user who never saved one gets an auto-equipped party when `autoIfNew` is set.
 */
export async function loadParty(userId: string, opts: { autoIfNew?: boolean } = {}): Promise<PartyMember[]> {
  const slots = await savedSlots(userId);
  if (slots === null) return opts.autoIfNew ? autoEquipParty(userId) : [];
  if (slots.length === 0) return [];
  return (await resolve(userId, slots)).members;
}

export async function runsUsedToday(userId: string, now = new Date()): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ run_index: number }[]>(RUNS_TODAY_SQL, userId, utcDay(now));
  return rows.length;
}

export async function loadRecords(userId: string, now = new Date()): Promise<Records> {
  const [r] = await prisma.$queryRawUnsafe<{ best_ever: number | null; best_week: number | null; runs_week: number }[]>(RECORDS_SQL, userId, isoWeek(now));
  return {
    bestEver: r?.best_ever == null ? null : Number(r.best_ever),
    bestWeek: r?.best_week == null ? null : Number(r.best_week),
    runsWeek: Number(r?.runs_week ?? 0),
  };
}

/** Unused sprites per gear slot (for tips). */
export function spareCounts(roster: DungeonSprite[], members: PartyMember[]): Record<GearSlot, number> {
  const used = new Set<string>();
  for (const m of members) for (const s of GEAR_SLOTS) if (m[s]) used.add(m[s]!.id);
  const spare: Record<GearSlot, number> = { weapon: 0, armor: 0, trinket: 0 };
  for (const s of roster) if (s.slot !== "hero" && !used.has(s.id)) spare[s.slot]++;
  return spare;
}

// ── Runs ─────────────────────────────────────────────────────────────────────

/** What the server keeps per run (state column). */
type StoredState = RunState & { before: { best: number | null; rank: number | null } };

interface RunRow {
  id: string;
  week: string;
  seed: string;
  floor: number;
  party: unknown;
  state: StoredState | null;
  step: number;
  status: string;
  updated_at: Date;
}

export interface BlessingCard {
  id: string;
  name: string;
  text: string;
  icon: string;
  element: Element | null;
}

export interface RunView {
  id: string;
  status: "choosing" | "done";
  week: string;
  floor: number;
  /** Floors climbed in this step (empty when a paused run is resumed). */
  floors: FloorLog[];
  offer: BlessingCard[] | null;
  blessings: BlessingCard[];
  buffs: BlessingCard[];
  members: PartyMember[];
  /** HP after this step. */
  hp: number[];
  /** Filled when the run is over. */
  report: RunReport | null;
  board: Leaderboard | null;
  records: Records | null;
}

const cards = (ids: string[]) => ids.map((id) => blessingView(id)).filter((b): b is BlessingCard => b !== null);

function membersOf(party: unknown): PartyMember[] {
  const p = party as { members?: PartyMember[] } | null;
  return Array.isArray(p?.members) ? p!.members : [];
}

function heroesForReport(members: PartyMember[]): ResultHero[] {
  return members.map((m) => ({
    id: m.hero.id, name: m.hero.name, classId: m.stats.classId, stars: m.hero.stars, animated: m.hero.animated, hd: m.hero.hd,
    attackElement: m.stats.attackElement, gear: m.stats.gear,
  }));
}

/** The view of a run; `done` runs get the report, a fresh board and records. */
async function viewOf(userId: string, id: string, week: string, state: StoredState, members: PartyMember[], floors: FloorLog[], now: Date): Promise<RunView> {
  const base: RunView = {
    id, status: state.done ? "done" : "choosing", week, floor: state.floor, floors,
    offer: state.offer ? cards(state.offer) : null, blessings: cards(state.blessings), buffs: cards(state.buffs),
    members, hp: state.hp, report: null, board: null, records: null,
  };
  if (!state.done) return base;
  // The run is stored: from here a failed read must not turn it into an error.
  const soft = <T,>(p: Promise<T>, fallback: T, what: string) =>
    p.catch((err) => { console.error(`[Dungeon] post-run ${what} failed:`, err instanceof Error ? err.message : err); return fallback; });
  const [board, records, roster] = await Promise.all([
    soft(loadLeaderboard(userId, now), null, "leaderboard"),
    soft(loadRecords(userId, now), null, "records"),
    soft(loadRoster(userId), [] as DungeonSprite[], "roster"),
  ]);
  base.board = board;
  base.records = records;
  base.report = buildReport({
    state, heroes: heroesForReport(members), bestBefore: state.before.best, rankBefore: state.before.rank,
    rankAfter: board?.me?.rank ?? null, players: board?.players ?? 0, spare: spareCounts(roster, members),
  });
  return base;
}

async function advance(userId: string, row: RunRow, state: StoredState): Promise<boolean> {
  const updated = await prisma.$queryRawUnsafe<{ step: number }[]>(
    ADVANCE_RUN_SQL, row.id, userId, row.step, JSON.stringify(state), state.done ? "done" : "choosing", state.floor,
  );
  return updated.length === 1;
}

/** Finishes a run nobody came back to: the first offered blessing at every choice. */
async function autoFinish(userId: string, row: RunRow): Promise<void> {
  if (!row.state) return;
  const units = membersOf(row.party).map((m) => m.stats);
  let state = row.state;
  for (let i = 0; i < 40 && !state.done; i++) {
    if (state.offer?.length) {
      const c = chooseBlessing(state, state.offer[0]);
      if (!c.ok) break;
      state = { ...c.state, before: row.state.before };
    }
    state = { ...runSegment(units, state).state, before: row.state.before };
  }
  if (!state.done) state = { ...state, done: true, offer: null };
  await advance(userId, row, state);
}

/** The unfinished run to resume, or null. Runs idle for 10+ minutes are finished automatically. */
export async function loadActiveRun(userId: string, now = new Date()): Promise<RunView | null> {
  const [row] = await prisma.$queryRawUnsafe<RunRow[]>(ACTIVE_RUN_SQL, userId);
  if (!row || !row.state) return null;
  if (now.getTime() - new Date(row.updated_at).getTime() > RUN_IDLE_MS) {
    await autoFinish(userId, row);
    return null;
  }
  return viewOf(userId, row.id, row.week, row.state, membersOf(row.party), [], now);
}

export type StartResult =
  | { ok: true; view: RunView; resumed: boolean; runsLeft: number }
  | { ok: false; reason: "no_party" | "daily_limit" };

/** Starts a run (climbing to the first choice), or resumes the unfinished one. */
export async function startRun(userId: string, now = new Date()): Promise<StartResult> {
  const active = await loadActiveRun(userId, now);
  if (active) return { ok: true, view: active, resumed: true, runsLeft: runsLeft(await runsUsedToday(userId, now)) };

  const members = await loadParty(userId);
  if (members.length === 0) return { ok: false, reason: "no_party" };
  const day = utcDay(now);
  const week = isoWeek(now);
  const units = members.map((m) => m.stats);
  const [records, boardBefore] = await Promise.all([loadRecords(userId, now), loadLeaderboard(userId, now)]);

  // A parallel request can take the index we picked; then try the next one.
  for (let attempt = 0; attempt <= RUNS_PER_DAY; attempt++) {
    const taken = (await prisma.$queryRawUnsafe<{ run_index: number }[]>(RUNS_TODAY_SQL, userId, day)).map((r) => Number(r.run_index));
    const index = nextRunIndex(taken);
    if (index === null) return { ok: false, reason: "daily_limit" };
    const seed = runSeed(userId, day, index);
    const seg = runSegment(units, initialState(units, seed, week));
    const state: StoredState = { ...seg.state, before: { best: records.bestEver, rank: boardBefore.me?.rank ?? null } };
    const id = randomUUID();
    const inserted = await prisma.$queryRawUnsafe<{ id: string }[]>(
      INSERT_RUN_SQL, id, userId, week, day, index, state.floor, seed.toString(16), JSON.stringify({ members }),
      state.done ? "done" : "choosing", JSON.stringify(state),
    );
    if (inserted.length !== 1) continue;
    return { ok: true, view: await viewOf(userId, id, week, state, members, seg.floors, now), resumed: false, runsLeft: runsLeft(index) };
  }
  return { ok: false, reason: "daily_limit" };
}

export type ChooseResult =
  | { ok: true; view: RunView }
  | { ok: false; reason: "not-found" | "finished" | "not-offered" | "conflict" };

/** Applies a blessing (must be one the server offered) and climbs on. */
export async function chooseInRun(userId: string, runId: string, blessingId: string, now = new Date()): Promise<ChooseResult> {
  const [row] = await prisma.$queryRawUnsafe<RunRow[]>(RUN_BY_ID_SQL, runId, userId);
  if (!row || !row.state) return { ok: false, reason: "not-found" };
  if (row.status === "done" || row.state.done) return { ok: false, reason: "finished" };
  const c = chooseBlessing(row.state, blessingId);
  if (!c.ok) return { ok: false, reason: c.reason === "not-offered" ? "not-offered" : "finished" };
  const members = membersOf(row.party);
  const seg = runSegment(members.map((m) => m.stats), c.state);
  const state: StoredState = { ...seg.state, before: row.state.before };
  if (!(await advance(userId, row, state))) return { ok: false, reason: "conflict" };
  return { ok: true, view: await viewOf(userId, row.id, row.week, state, members, seg.floors, now) };
}

// ── Leaderboard, tower, trophies, prizes ─────────────────────────────────────

export interface LeaderRow {
  rank: number;
  name: string;
  floor: number;
  you: boolean;
}

export interface Leaderboard {
  week: string;
  resetsAt: string;
  players: number;
  top: LeaderRow[];
  me: LeaderRow | null;
}

export async function loadLeaderboard(userId: string, now = new Date(), size = LEADERBOARD_SIZE): Promise<Leaderboard> {
  const week = isoWeek(now);
  const rows = await prisma.$queryRawUnsafe<{ rank: number; user_id: string; floor: number; players: number; username: string | null }[]>(
    LEADERBOARD_SQL, week, size, userId,
  );
  const mapped = rows.map((r) => ({
    rank: Number(r.rank), name: displayName(r.username, r.user_id), floor: Number(r.floor), you: r.user_id === userId,
  }));
  return {
    week,
    resetsAt: new Date(weekStart(now).getTime() + 7 * 86_400_000).toISOString(),
    players: rows[0] ? Number(rows[0].players) : 0,
    top: mapped.filter((r) => r.rank <= size),
    me: mapped.find((r) => r.you) ?? null,
  };
}

/** This week's zones and their weaknesses (the same tower for everyone). */
export function loadTower(now = new Date()): { week: string; zones: ZoneWeek[] } {
  const week = isoWeek(now);
  return { week, zones: towerWeek(week) };
}

export interface Trophy {
  week: string;
  rank: number;
  credits: number;
  badge: string;
}

export async function loadTrophies(userId: string): Promise<Trophy[]> {
  const rows = await prisma.$queryRawUnsafe<Trophy[]>(TROPHIES_SQL, userId);
  return rows.map((r) => ({ week: r.week, rank: Number(r.rank), credits: Number(r.credits), badge: r.badge }));
}

export interface PrizePayout {
  week: string;
  prizes: { rank: number; credits: number }[];
  credits: number;
}

/** Pays the previous week (and the one before, in case a cron run was missed). Idempotent. */
export async function payWeeklyPrizes(now = new Date()): Promise<PrizePayout[]> {
  const last = previousWeek(now);
  const before = previousWeek(last.start);
  const out: PrizePayout[] = [];
  for (const w of [before, last]) {
    const rows = await prisma.$queryRawUnsafe<{ rank: number; credits: number }[]>(PAY_PRIZES_SQL, ...prizeParams(w.week, w.start, w.end));
    const prizes = rows.map((r) => ({ rank: Number(r.rank), credits: Number(r.credits) }));
    out.push({ week: w.week, prizes, credits: prizes.reduce((a, p) => a + p.credits, 0) });
  }
  return out;
}

export { nextUtcMidnight };
