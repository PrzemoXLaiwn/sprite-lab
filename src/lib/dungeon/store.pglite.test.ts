// Sprite Dungeon SQL against a real Postgres (PGlite, in memory), using the
// migration file itself: eligible sprites, race-safe daily limit, weekly
// leaderboard, and prizes that pay exactly once to eligible players only.
import { readFileSync } from "fs";
import { join } from "path";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { PRIZE_BUDGET_PER_WEEK, RUNS_PER_DAY } from "./config";
import { isoWeek, nextRunIndex, utcDay } from "./rules";
import { parseSlots } from "./party";
import {
  ACTIVE_RUN_SQL, ADVANCE_RUN_SQL, INSERT_RUN_SQL, LEADERBOARD_SQL, PARTY_GET_SQL, PARTY_SAVE_SQL, PAY_PRIZES_SQL, RECORDS_SQL, RUN_BY_ID_SQL,
  RUNS_TODAY_SQL, SPRITES_SQL, prizeParams,
} from "./sql";

const MIGRATION = readFileSync(join(process.cwd(), "prisma/sql/2026-10-15_sprite_dungeon.sql"), "utf8");
const TOWER = readFileSync(join(process.cwd(), "prisma/sql/2026-10-17_dungeon_tower.sql"), "utf8");
const WEEK = "2026-W42";
const START = new Date("2026-10-12T00:00:00Z");
const END = new Date("2026-10-19T00:00:00Z");

let db: PGlite;
let runId = 0;

async function addRun(user: string, floor: number, at: string, week = WEEK, day = at.slice(0, 10), index?: number) {
  const taken = (await db.query<{ run_index: number }>(RUNS_TODAY_SQL, [user, day])).rows.map((r) => r.run_index);
  const idx = index ?? nextRunIndex(taken) ?? 99;
  await db.query(INSERT_RUN_SQL, [`r${++runId}`, user, week, day, idx, floor, "abc", "[]", "done", "{}"]);
  await db.query(`UPDATE dungeon_runs SET created_at = $1, floor_at = $1 WHERE id = $2`, [at, `r${runId}`]);
}

async function paidOps(user: string, n: number, at = "2026-10-13 10:00", status = "SUCCEEDED") {
  for (let i = 0; i < n; i++) {
    await db.query(`INSERT INTO operations (id, user_id, status, credits_charged, created_at) VALUES ($1, $2, $3, 1, $4)`, [`o_${user}_${status}_${at}_${i}`, user, status, at]);
  }
}

const balances = async () =>
  Object.fromEntries((await db.query<{ id: string; credits: number }>(`SELECT id, credits FROM users ORDER BY id`)).rows.map((r) => [r.id, r.credits]));

beforeEach(async () => {
  runId = 0;
  db = new PGlite();
  await db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, email TEXT, credits INT NOT NULL DEFAULT 10, total_bonus_credits INT NOT NULL DEFAULT 0, updated_at TIMESTAMP(3));
    CREATE TABLE generations (id TEXT PRIMARY KEY, user_id TEXT, prompt TEXT, category_id TEXT, subcategory_id TEXT, style_id TEXT, image_url TEXT, source_generation_id TEXT, created_at TIMESTAMP(3) DEFAULT now());
    CREATE TABLE operations (id TEXT PRIMARY KEY, user_id TEXT, feature TEXT DEFAULT 'sprite', status TEXT, credits_charged INT, generation_id TEXT, created_at TIMESTAMP(3));
    CREATE TABLE credit_transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), amount INT NOT NULL, type TEXT NOT NULL, description TEXT, money_amount DOUBLE PRECISION, admin_id TEXT, credits_reversed INT NOT NULL DEFAULT 0, created_at TIMESTAMP(3) NOT NULL DEFAULT now());
  `);
  await db.exec(MIGRATION);
  await db.exec(MIGRATION); // safe to run twice
  // A run stored before the tower update keeps working once the new columns arrive
  await db.query(`INSERT INTO dungeon_runs (id, user_id, week, run_day, run_index, floor, seed, party) VALUES ('old', 'zz', '2026-W40', '2026-09-30', 1, 4, 's', '[]')`);
  await db.exec(TOWER);
  await db.exec(TOWER);
  await db.exec(`INSERT INTO users (id, username, email) VALUES ('a', 'ana', 'ana@x.io'), ('b', NULL, 'bob@x.io'), ('c', 'cy', 'cy@x.io'), ('d', 'di', 'di@x.io'), ('e', 'ed', 'ed@x.io')`);
});

describe("sprites + party", () => {
  it("lists originals only, counts different animations, walk/rotation sets and HD", async () => {
    await db.exec(`
      INSERT INTO generations (id, user_id, prompt, category_id, subcategory_id, style_id, image_url, source_generation_id) VALUES
        ('g1','a','a knight','CHARACTERS','HEROES','PIXEL_ART_16','u1',NULL),
        ('g2','a','a sword','WEAPONS','SWORDS','CARTOON','u2',NULL),
        ('g3','a','[Upscaled 2x] a knight','CHARACTERS','HEROES','PIXEL_ART_16','u3',NULL),
        ('g4','a','[Animation: walk, 4f] a knight','CHARACTERS','ANIMATION','PIXEL_ART_16','u4','g1'),
        ('g6','a','[Animation: walk, 6f] a knight','CHARACTERS','ANIMATION','PIXEL_ART_16','u6','g1'),
        ('g7','a','[Animation: attack, 4f] a knight','CHARACTERS','ANIMATION','PIXEL_ART_16','u7','g1'),
        ('g8','a','[Animation: 4-direction walk, 16f] a sword','WEAPONS','ANIMATION','CARTOON','u8','g2'),
        ('g5','b','someone else','CHARACTERS','HEROES','PIXEL_ART_16','u5',NULL);
      INSERT INTO operations (id, user_id, feature, status, credits_charged, generation_id, created_at) VALUES
        ('o1','a','sprite_hd','SUCCEEDED',3,'g2',now()), ('o2','a','sprite_hd','FAILED',3,'g1',now());
    `);
    const rows = (await db.query<{ id: string; animations: number; rotated: boolean; hd: boolean }>(SPRITES_SQL, ["a", null, 100])).rows;
    // g1: "walk" twice + "attack" = 2 different animations; g2: a 4-direction walk set
    expect(rows.map((r) => [r.id, r.animations, r.rotated, r.hd]).sort()).toEqual([["g1", 2, false, false], ["g2", 1, true, true]]);
    const only = (await db.query<{ id: string }>(SPRITES_SQL, ["a", ["g2", "g5", "g3"], 4])).rows;
    expect(only.map((r) => r.id)).toEqual(["g2"]); // someone else's / tool outputs are never yours to use
  });

  it("saves the party per user (upsert)", async () => {
    await db.query(PARTY_SAVE_SQL, ["a", JSON.stringify(["g1"])]);
    await db.query(PARTY_SAVE_SQL, ["a", JSON.stringify(["g2", "g1"])]);
    expect((await db.query<{ slots: string[] }>(PARTY_GET_SQL, ["a"])).rows[0].slots).toEqual(["g2", "g1"]);
  });
});

describe("daily limit", () => {
  it(`parallel requests can't store more than ${RUNS_PER_DAY} runs or share a run index`, async () => {
    const day = "2026-10-14";
    const attempt = async (n: number) => {
      for (let tries = 0; tries <= RUNS_PER_DAY; tries++) {
        const taken = (await db.query<{ run_index: number }>(RUNS_TODAY_SQL, ["a", day])).rows.map((r) => r.run_index);
        const idx = nextRunIndex(taken);
        if (idx === null) return null;
        const res = await db.query(INSERT_RUN_SQL, [`p${n}_${tries}`, "a", WEEK, day, idx, 3, "s", "[]", "done", "{}"]);
        if (res.rows.length === 1) return idx;
      }
      return null;
    };
    const results = await Promise.all(Array.from({ length: 9 }, (_, i) => attempt(i)));
    expect(results.filter((r) => r !== null).sort()).toEqual([1, 2, 3, 4, 5]);
    expect((await db.query(RUNS_TODAY_SQL, ["a", day])).rows).toHaveLength(RUNS_PER_DAY);
    // Same index twice is refused by the unique key
    expect((await db.query(INSERT_RUN_SQL, ["dup", "a", WEEK, day, 2, 9, "s", "[]", "done", "{}"])).rows).toHaveLength(0);
    // A new UTC day starts again at 1
    expect((await db.query(INSERT_RUN_SQL, ["next", "a", WEEK, "2026-10-15", 1, 2, "s", "[]", "done", "{}"])).rows).toHaveLength(1);
  });
});

describe("leaderboard", () => {
  it("ranks each user's best floor; ties go to whoever got there first; no emails", async () => {
    await addRun("a", 7, "2026-10-13 10:00:00");
    await addRun("a", 12, "2026-10-14 09:00:00");
    await addRun("b", 12, "2026-10-13 18:00:00");
    await addRun("c", 4, "2026-10-12 08:00:00");
    await addRun("d", 30, "2026-10-05 08:00:00", "2026-W41"); // last week doesn't count
    const rows = (await db.query<{ rank: number; user_id: string; floor: number; players: number; username: string | null }>(LEADERBOARD_SQL, [WEEK, 2, "c"])).rows;
    expect(rows.map((r) => [r.rank, r.user_id, r.floor])).toEqual([[1, "b", 12], [2, "a", 12], [3, "c", 4]]);
    expect(rows[0].players).toBe(3);
    expect(JSON.stringify(rows)).not.toContain("@");
  });
});

describe("leaderboard right after a run", () => {
  it("a run stored now is on the board for this ISO week (the same week/day the run route uses)", async () => {
    const now = new Date();
    const res = await db.query(INSERT_RUN_SQL, ["now1", "a", isoWeek(now), utcDay(now), 1, 6, "s", "[]", "done", "{}"]);
    expect(res.rows).toHaveLength(1);
    const rows = (await db.query<{ rank: number; user_id: string; floor: number }>(LEADERBOARD_SQL, [isoWeek(now), 25, "a"])).rows;
    expect(rows.map((r) => [r.rank, r.user_id, r.floor])).toEqual([[1, "a", 6]]);
  });

  it("personal records: best ever, best this week, runs this week", async () => {
    expect((await db.query(RECORDS_SQL, ["a", WEEK])).rows[0]).toEqual({ best_ever: null, best_week: null, runs_week: 0 });
    await addRun("a", 14, "2026-10-05 10:00:00", "2026-W41");
    await addRun("a", 6, "2026-10-13 10:00:00");
    await addRun("a", 9, "2026-10-14 10:00:00");
    expect((await db.query(RECORDS_SQL, ["a", WEEK])).rows[0]).toEqual({ best_ever: 14, best_week: 9, runs_week: 2 });
  });
});

describe("party slots storage", () => {
  it("stores the new format and still reads old rows", async () => {
    await db.query(PARTY_SAVE_SQL, ["a", JSON.stringify([{ hero: "g1", weapon: "w1" }])]);
    expect(parseSlots((await db.query<{ slots: unknown }>(PARTY_GET_SQL, ["a"])).rows[0].slots)).toEqual([{ hero: "g1", weapon: "w1" }]);
    await db.query(PARTY_SAVE_SQL, ["b", JSON.stringify(["g5", "g6"])]); // a row saved before the gear update
    expect(parseSlots((await db.query<{ slots: unknown }>(PARTY_GET_SQL, ["b"])).rows[0].slots)).toEqual([{ hero: "g5" }, { hero: "g6" }]);
  });
});

describe("stepwise runs", () => {
  const insertChoosing = (id: string, user: string, floor: number, day = "2026-10-14", idx = 1) =>
    db.query(INSERT_RUN_SQL, [id, user, WEEK, day, idx, floor, "s", '{"members":[]}', "choosing", JSON.stringify({ floor, offer: ["whetstone"] })]);

  it("of two parallel choices exactly one lands (step counter)", async () => {
    await insertChoosing("run1", "a", 3);
    const results = await Promise.all([1, 2, 3].map((k) =>
      db.query(ADVANCE_RUN_SQL, ["run1", "a", 0, JSON.stringify({ floor: 6, pick: k }), "choosing", 6])));
    expect(results.filter((r) => r.rows.length === 1)).toHaveLength(1);
    const row = (await db.query<{ step: number; floor: number; status: string }>(RUN_BY_ID_SQL, ["run1", "a"])).rows[0];
    expect(row).toMatchObject({ step: 1, floor: 6, status: "choosing" });
    // A stale step or another user's run never moves
    expect((await db.query(ADVANCE_RUN_SQL, ["run1", "a", 0, "{}", "done", 9])).rows).toHaveLength(0);
    expect((await db.query(ADVANCE_RUN_SQL, ["run1", "b", 1, "{}", "done", 9])).rows).toHaveLength(0);
    // Finishing: floor only grows, a done run is frozen
    expect((await db.query(ADVANCE_RUN_SQL, ["run1", "a", 1, "{}", "done", 8])).rows).toHaveLength(1);
    expect((await db.query(ADVANCE_RUN_SQL, ["run1", "a", 2, "{}", "choosing", 20])).rows).toHaveLength(0);
    expect((await db.query<{ floor: number; status: string }>(RUN_BY_ID_SQL, ["run1", "a"])).rows[0]).toMatchObject({ floor: 8, status: "done" });
  });

  it("finds the unfinished run to resume, and old rows count as finished", async () => {
    expect((await db.query(ACTIVE_RUN_SQL, ["a"])).rows).toHaveLength(0);
    await insertChoosing("run2", "a", 3);
    expect((await db.query<{ id: string }>(ACTIVE_RUN_SQL, ["a"])).rows.map((r) => r.id)).toEqual(["run2"]);
    expect((await db.query<{ status: string; step: number }>(`SELECT status, step FROM dungeon_runs WHERE id = 'old'`)).rows[0]).toEqual({ status: "done", step: 0 });
    expect((await db.query(ACTIVE_RUN_SQL, ["zz"])).rows).toHaveLength(0);
  });

  it("an unfinished run counts on the board at the floor it reached; ties go to who got there first", async () => {
    await insertChoosing("run3", "a", 6);
    await db.query(`UPDATE dungeon_runs SET floor_at = '2026-10-14 10:00' WHERE id = 'run3'`);
    await insertChoosing("run4", "b", 3);
    await db.query(`UPDATE dungeon_runs SET floor_at = '2026-10-14 09:00' WHERE id = 'run4'`);
    await db.query(ADVANCE_RUN_SQL, ["run4", "b", 0, "{}", "choosing", 6]); // b reaches 6 now, after a
    const rows = (await db.query<{ rank: number; user_id: string; floor: number }>(LEADERBOARD_SQL, [WEEK, 25, "a"])).rows;
    expect(rows.map((r) => [r.rank, r.user_id, r.floor])).toEqual([[1, "a", 6], [2, "b", 6]]);
  });
});

describe("weekly prizes", () => {
  async function setupWeek() {
    await addRun("a", 20, "2026-10-13 10:00:00"); // 1st
    await addRun("b", 15, "2026-10-14 10:00:00"); // 2nd
    await addRun("c", 15, "2026-10-15 10:00:00"); // 3rd (tie, later)
    await addRun("d", 9, "2026-10-16 10:00:00"); // 4th
    await paidOps("a", 5);
    await paidOps("c", 6);
    await paidOps("b", 4); // one short
    await paidOps("b", 3, "2026-10-13 11:00", "FAILED"); // failed work doesn't count
    await paidOps("b", 3, "2026-10-19 01:00"); // next week doesn't count
    await paidOps("d", 9);
  }

  it("pays the top 3 once, only to eligible players; top 10 get badges", async () => {
    await setupWeek();
    const before = await balances();
    const first = (await db.query<{ rank: number; user_id: string; credits: number; credited: number; logged: number }>(PAY_PRIZES_SQL, prizeParams(WEEK, START, END))).rows;
    expect(first.map((r) => [r.rank, r.user_id, r.credits])).toEqual([[1, "a", 30], [2, "b", 0], [3, "c", 10], [4, "d", 0]]);
    expect(first[0].credited).toBe(2);
    expect(first[0].logged).toBe(2);

    const after = await balances();
    expect(after.a - before.a).toBe(30);
    expect(after.b - before.b).toBe(0);
    expect(after.c - before.c).toBe(10);
    expect(after.d - before.d).toBe(0);

    const tx = (await db.query<{ user_id: string; amount: number; type: string; description: string }>(`SELECT user_id, amount, type, description FROM credit_transactions ORDER BY user_id`)).rows;
    expect(tx).toEqual([
      { user_id: "a", amount: 30, type: "BONUS", description: "Sprite Dungeon: week 2026-W42 rank 1" },
      { user_id: "c", amount: 10, type: "BONUS", description: "Sprite Dungeon: week 2026-W42 rank 3" },
    ]);
    const badges = (await db.query<{ user_id: string; badge: string }>(`SELECT user_id, badge FROM dungeon_prizes ORDER BY rank`)).rows;
    expect(badges.map((b) => b.badge)).toEqual(["gold", "silver", "bronze", "top10"]);

    // Second run (and parallel runs) pay nothing more
    const again = await Promise.all([1, 2, 3].map(() => db.query(PAY_PRIZES_SQL, prizeParams(WEEK, START, END))));
    expect(again.every((r) => r.rows.length === 0)).toBe(true);
    expect(await balances()).toEqual(after);
    expect((await db.query(`SELECT 1 FROM credit_transactions`)).rows).toHaveLength(2);
  });

  it(`never pays more than ${PRIZE_BUDGET_PER_WEEK} credits in a week, even with many players`, async () => {
    const users = Array.from({ length: 30 }, (_, i) => `p${i}`);
    for (const [i, u] of users.entries()) {
      await db.query(`INSERT INTO users (id) VALUES ($1)`, [u]);
      await addRun(u, 50 - i, `2026-10-13 10:${String(i).padStart(2, "0")}:00`);
      await paidOps(u, 10);
    }
    const rows = (await db.query<{ credits: number }>(PAY_PRIZES_SQL, prizeParams(WEEK, START, END))).rows;
    expect(rows).toHaveLength(10);
    const total = rows.reduce((s, r) => s + r.credits, 0);
    expect(total).toBe(60);
    expect(total).toBeLessThanOrEqual(PRIZE_BUDGET_PER_WEEK);
    const sum = (await db.query<{ s: number }>(`SELECT coalesce(sum(amount), 0)::int AS s FROM credit_transactions`)).rows[0].s;
    expect(sum).toBe(total);
  });

  it("skips users that no longer exist and pays nothing for an empty week", async () => {
    expect((await db.query(PAY_PRIZES_SQL, prizeParams(WEEK, START, END))).rows).toHaveLength(0);
    await addRun("ghost", 40, "2026-10-13 10:00:00");
    await addRun("a", 3, "2026-10-13 11:00:00");
    await paidOps("a", 5);
    const rows = (await db.query<{ rank: number; user_id: string; credits: number }>(PAY_PRIZES_SQL, prizeParams(WEEK, START, END))).rows;
    expect(rows.map((r) => r.user_id)).toEqual(["a"]);
    expect(rows[0].rank).toBe(2); // the deleted user's rank isn't handed down
  });
});
