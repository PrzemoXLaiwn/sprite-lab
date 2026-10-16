// =============================================================================
// Sprite Dungeon — database side (Prisma raw SQL over src/lib/dungeon/sql.ts)
// =============================================================================

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { GEAR_SLOTS, LEADERBOARD_SIZE, PARTY_SIZE, RUNS_PER_DAY, type GearSlot, type SpriteSlot } from "./config";
import { autoEquip, parseSlots, pickTip, referencedIds, validateSlots, type SlotIds, type Spare, type Tip } from "./party";
import { runSeed } from "./rng";
import {
  displayName, isoWeek, nextRunIndex, nextUtcMidnight, previousWeek, runsLeft, utcDay, weekStart,
} from "./rules";
import { simulateRun, type RunLog } from "./simulate";
import {
  INSERT_RUN_SQL, LEADERBOARD_SQL, PARTY_GET_SQL, PARTY_SAVE_SQL, PAY_PRIZES_SQL, RECORDS_SQL, RUNS_TODAY_SQL, SPRITES_SQL,
  TROPHIES_SQL, prizeParams,
} from "./sql";
import {
  deriveParty, deriveUnit, gearBonus, powerOf, slotFor, type MemberFacts, type SpriteFacts, type StatBlock, type UnitStats,
} from "./stats";

interface SpriteRow {
  id: string;
  category_id: string;
  style_id: string;
  image_url: string;
  prompt: string;
  animated: boolean;
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
  animated: boolean;
  hd: boolean;
  /** Hero: bare power. Item: the power its bonus adds. */
  power: number;
  /** Heroes: bare stats. */
  stats: UnitStats | null;
  /** Items: what they add when equipped. */
  bonus: StatBlock | null;
}

export interface PartyMember {
  hero: DungeonSprite;
  weapon: DungeonSprite | null;
  armor: DungeonSprite | null;
  trinket: DungeonSprite | null;
  /** Final stats with gear and party synergy. */
  stats: UnitStats;
}

export interface Records {
  bestEver: number | null;
  bestWeek: number | null;
  runsWeek: number;
}

const ROSTER_LIMIT = 150;

function facts(r: SpriteRow): SpriteFacts {
  return { id: r.id, categoryId: r.category_id, styleId: r.style_id, animated: Boolean(r.animated), hd: Boolean(r.hd) };
}

function shortName(prompt: string): string {
  const p = prompt.replace(/\s+/g, " ").trim();
  return p.length > 40 ? `${p.slice(0, 39)}…` : p || "Sprite";
}

function toSprite(r: SpriteRow): DungeonSprite {
  const f = facts(r);
  const slot = slotFor(f.categoryId);
  const stats = slot === "hero" ? deriveUnit(f) : null;
  const bonus = slot === "hero" ? null : gearBonus(f, slot);
  return {
    id: r.id, name: shortName(r.prompt), imageUrl: r.image_url, styleId: r.style_id, categoryId: r.category_id, slot,
    pixel: r.style_id.toUpperCase().includes("PIXEL"), animated: f.animated, hd: f.hd,
    power: stats ? stats.power : powerOf(bonus!), stats, bonus,
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
  const memberFacts: MemberFacts[] = clean.map((m) => ({
    hero: facts(byId.get(m.hero)!),
    weapon: m.weapon ? facts(byId.get(m.weapon)!) : null,
    armor: m.armor ? facts(byId.get(m.armor)!) : null,
    trinket: m.trinket ? facts(byId.get(m.trinket)!) : null,
  }));
  const stats = deriveParty(memberFacts);
  const sprite = (id?: string) => (id ? toSprite(byId.get(id)!) : null);
  const members = clean.map((m, i) => ({
    hero: toSprite(byId.get(m.hero)!), weapon: sprite(m.weapon), armor: sprite(m.armor), trinket: sprite(m.trinket), stats: stats[i],
  }));
  return { slots: clean, members };
}

/** Saves the party after server-side validation; returns it as stored. */
export async function saveParty(userId: string, slots: SlotIds[]): Promise<PartyMember[]> {
  const { slots: clean, members } = await resolve(userId, slots);
  await prisma.$executeRawUnsafe(PARTY_SAVE_SQL, userId, JSON.stringify(clean));
  return members;
}

/** Best party from the user's sprites (deterministic), saved through the normal validation. */
export async function autoEquipParty(userId: string, roster?: DungeonSprite[]): Promise<PartyMember[]> {
  const list = roster ?? (await loadRoster(userId));
  const slots = autoEquip(list.map((s) => ({ id: s.id, categoryId: s.categoryId, styleId: s.styleId, animated: s.animated, hd: s.hd })));
  return saveParty(userId, slots);
}

/**
 * The saved party (old-format rows load too: only figure ids survive, as heroes).
 * A user who never saved one gets an auto-equipped party when `autoIfNew` is set.
 */
export async function loadParty(userId: string, opts: { autoIfNew?: boolean; roster?: DungeonSprite[] } = {}): Promise<PartyMember[]> {
  const slots = await savedSlots(userId);
  if (slots === null) {
    if (!opts.autoIfNew) return [];
    const roster = opts.roster ?? (await loadRoster(userId));
    return roster.some((s) => s.slot === "hero") ? autoEquipParty(userId, roster) : [];
  }
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

/** Unused sprites per slot (for the upgrade tip). */
export function spareCounts(roster: DungeonSprite[], members: PartyMember[]): Spare {
  const used = new Set<string>();
  for (const m of members) {
    used.add(m.hero.id);
    for (const s of GEAR_SLOTS) if (m[s]) used.add(m[s]!.id);
  }
  const spare: Spare = { hero: 0, weapon: 0, armor: 0, trinket: 0 };
  for (const s of roster) if (!used.has(s.id)) spare[s.slot]++;
  return spare;
}

export function tipFor(members: PartyMember[], roster: DungeonSprite[]): Tip | null {
  return pickTip(
    members.map((m) => ({
      id: m.hero.id, name: m.hero.name, animated: m.hero.animated, hd: m.hero.hd,
      gear: Object.fromEntries(GEAR_SLOTS.filter((s) => m[s]).map((s) => [s, m[s]!.id])) as Partial<Record<GearSlot, string>>,
    })),
    spareCounts(roster, members),
  );
}

export type RunResult =
  | {
      ok: true;
      log: RunLog;
      members: PartyMember[];
      runIndex: number;
      runsLeft: number;
      /** Fresh board, read after the run was stored. */
      board: Leaderboard;
      rankBefore: number | null;
      records: Records;
      newBest: boolean;
      tip: Tip | null;
    }
  | { ok: false; reason: "no_party" | "daily_limit" };

/** Simulates and stores one expedition, respecting the daily limit even under parallel requests. */
export async function startRun(userId: string, now = new Date()): Promise<RunResult> {
  const party = await loadParty(userId);
  if (party.length === 0) return { ok: false, reason: "no_party" };
  const day = utcDay(now);
  const week = isoWeek(now);
  const units = party.map((p) => p.stats);
  const [before, boardBefore] = await Promise.all([loadRecords(userId, now), loadLeaderboard(userId, now)]);

  // A parallel request can take the index we picked; then try the next one.
  for (let attempt = 0; attempt <= RUNS_PER_DAY; attempt++) {
    const taken = (await prisma.$queryRawUnsafe<{ run_index: number }[]>(RUNS_TODAY_SQL, userId, day)).map((r) => Number(r.run_index));
    const index = nextRunIndex(taken);
    if (index === null) return { ok: false, reason: "daily_limit" };
    const seed = runSeed(userId, day, index);
    const log = simulateRun(units, seed);
    const inserted = await prisma.$queryRawUnsafe<{ id: string }[]>(
      INSERT_RUN_SQL, randomUUID(), userId, week, day, index, log.floor, seed.toString(16), JSON.stringify(units),
    );
    if (inserted.length !== 1) continue;
    // The run is stored and counted: from here on a failed read must not turn
    // it into an error, so each extra falls back on its own.
    const soft = <T,>(p: Promise<T>, fallback: T, what: string) =>
      p.catch((err) => { console.error(`[Dungeon] post-run ${what} failed:`, err instanceof Error ? err.message : err); return fallback; });
    const newBest = before.bestEver === null || log.floor > before.bestEver;
    const [board, records, roster] = await Promise.all([
      soft(loadLeaderboard(userId, now), boardBefore, "leaderboard"),
      soft(loadRecords(userId, now), {
        bestEver: Math.max(before.bestEver ?? 0, log.floor),
        bestWeek: Math.max(before.bestWeek ?? 0, log.floor),
        runsWeek: before.runsWeek + 1,
      }, "records"),
      soft(loadRoster(userId), [] as DungeonSprite[], "roster"),
    ]);
    return {
      ok: true, log, members: party, runIndex: index, runsLeft: runsLeft(index),
      board, rankBefore: boardBefore.me?.rank ?? null, records, newBest,
      tip: roster.length ? tipFor(party, roster) : null,
    };
  }
  return { ok: false, reason: "daily_limit" };
}

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
