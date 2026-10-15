// =============================================================================
// Sprite Dungeon — database side (Prisma raw SQL over src/lib/dungeon/sql.ts)
// =============================================================================

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { LEADERBOARD_SIZE, PARTY_SIZE, RUNS_PER_DAY } from "./config";
import { runSeed } from "./rng";
import {
  displayName, isoWeek, nextRunIndex, nextUtcMidnight, previousWeek, runsLeft, utcDay, weekStart,
} from "./rules";
import { simulateRun, type RunLog } from "./simulate";
import {
  INSERT_RUN_SQL, LEADERBOARD_SQL, PARTY_GET_SQL, PARTY_SAVE_SQL, PAY_PRIZES_SQL, RUNS_TODAY_SQL, SPRITES_SQL, TROPHIES_SQL, prizeParams,
} from "./sql";
import { deriveParty, deriveUnit, type SpriteFacts, type UnitStats } from "./stats";

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
  /** Pixel styles are drawn with nearest-neighbour scaling. */
  pixel: boolean;
  stats: UnitStats;
}

const ROSTER_LIMIT = 120;

function facts(r: SpriteRow): SpriteFacts {
  return { id: r.id, categoryId: r.category_id, styleId: r.style_id, animated: Boolean(r.animated), hd: Boolean(r.hd) };
}

function shortName(prompt: string): string {
  const p = prompt.replace(/\s+/g, " ").trim();
  return p.length > 40 ? `${p.slice(0, 39)}…` : p || "Sprite";
}

function toSprite(r: SpriteRow, stats: UnitStats): DungeonSprite {
  return { id: r.id, name: shortName(r.prompt), imageUrl: r.image_url, styleId: r.style_id, pixel: r.style_id.toUpperCase().includes("PIXEL"), stats };
}

async function spriteRows(userId: string, ids: string[] | null, limit: number): Promise<SpriteRow[]> {
  return prisma.$queryRawUnsafe<SpriteRow[]>(SPRITES_SQL, userId, ids, limit);
}

/** The user's eligible sprites (newest first), each with its stats on its own. */
export async function loadRoster(userId: string): Promise<DungeonSprite[]> {
  const rows = await spriteRows(userId, null, ROSTER_LIMIT);
  return rows.map((r) => toSprite(r, deriveUnit(facts(r))));
}

async function savedSlots(userId: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ slots: unknown }[]>(PARTY_GET_SQL, userId);
  const slots = rows[0]?.slots;
  return Array.isArray(slots) ? slots.filter((s): s is string => typeof s === "string").slice(0, PARTY_SIZE) : [];
}

/** The saved party, still-eligible members only, in slot order, with synergy applied. */
export async function loadParty(userId: string): Promise<DungeonSprite[]> {
  const slots = await savedSlots(userId);
  if (slots.length === 0) return [];
  const rows = await spriteRows(userId, slots, PARTY_SIZE);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = slots.map((id) => byId.get(id)).filter((r): r is SpriteRow => Boolean(r));
  const stats = deriveParty(ordered.map(facts));
  return ordered.map((r, i) => toSprite(r, stats[i]));
}

/** Saves the slots the user owns and may use; returns the party as stored. */
export async function saveParty(userId: string, ids: string[]): Promise<DungeonSprite[]> {
  const unique = [...new Set(ids)].slice(0, PARTY_SIZE);
  const rows = unique.length ? await spriteRows(userId, unique, PARTY_SIZE) : [];
  const owned = new Set(rows.map((r) => r.id));
  const slots = unique.filter((id) => owned.has(id));
  await prisma.$executeRawUnsafe(PARTY_SAVE_SQL, userId, JSON.stringify(slots));
  return loadParty(userId);
}

export async function runsUsedToday(userId: string, now = new Date()): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ run_index: number }[]>(RUNS_TODAY_SQL, userId, utcDay(now));
  return rows.length;
}

export type RunResult =
  | { ok: true; log: RunLog; sprites: DungeonSprite[]; runIndex: number; runsLeft: number }
  | { ok: false; reason: "no_party" | "daily_limit" };

/** Simulates and stores one expedition, respecting the daily limit even under parallel requests. */
export async function startRun(userId: string, now = new Date()): Promise<RunResult> {
  const party = await loadParty(userId);
  if (party.length === 0) return { ok: false, reason: "no_party" };
  const day = utcDay(now);
  const week = isoWeek(now);
  const units = party.map((p) => p.stats);

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
    if (inserted.length === 1) return { ok: true, log, sprites: party, runIndex: index, runsLeft: runsLeft(index) };
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
