// Runs the real migration and the exact SQL the billing store uses against an
// in-memory Postgres (PGlite) — no network, never a production database.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { REFUND_SQL, SETTLE_PENDING_SQL, SPEND_LOCK, SPEND_SQL, STALE_RUNNING_SQL, STATS_SQL } from "./store";

const MIGRATION = readFileSync(join(process.cwd(), "prisma/sql/2026-10-13_cost_ledger.sql"), "utf8");
let db: PGlite;
const day = new Date(Date.UTC(2026, 9, 13));
const at = (h: number) => new Date(day.getTime() + h * 3600_000);

async function op(id: string, o: Partial<{ user: string; status: string; charged: number; refunded: number; est: number; plan: string; incomplete: boolean; input: string; ip: string; created: Date }> = {}) {
  await db.query(
    `INSERT INTO operations (id, user_id, feature, status, credits_charged, credits_refunded, est_cost_usd, cost_cap_usd, plan, cost_log_incomplete, input_hash, ip_hash, created_at)
     VALUES ($1,$2,'anim_6',$3,$4,$5,$6,$6,$7,$8,$9,$10,$11)`,
    [id, o.user ?? "u1", o.status ?? "RUNNING", o.charged ?? 8, o.refunded ?? 0, o.est ?? 0.25, o.plan ?? "PRO", o.incomplete ?? false, o.input ?? null, o.ip ?? null, o.created ?? at(10)],
  );
}
const call = (id: string, opId: string | null, cost: number | null, est: number, created = at(10)) =>
  db.query(`INSERT INTO provider_calls (id, operation_id, provider, model, task, outcome, cost_usd, est_cost_usd, created_at) VALUES ($1,$2,'runware','m','grid','ok',$3,$4,$5)`, [id, opId, cost, est, created]);
const spend = async () => (await db.query<{ total: number; free: number; outside: number }>(SPEND_SQL, [day])).rows[0];
const refund = async (id: string, amount: number | null) => (await db.query<{ due: number; user_id: string }>(REFUND_SQL, [id, amount ?? 2147483647])).rows[0]?.due ?? 0;

beforeEach(async () => {
  db = new PGlite();
  // A stand-in for the existing generations table (the migration adds one column to it)
  await db.exec(`CREATE TABLE generations (id TEXT PRIMARY KEY, prompt TEXT NOT NULL, user_id TEXT, created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP); INSERT INTO generations (id, prompt) VALUES ('g_old', 'a knight');`);
  await db.exec(MIGRATION);
});

describe("migration", () => {
  it("is additive and safe to run twice", async () => {
    await db.exec(MIGRATION);
    const t = await db.query<{ table_name: string }>(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`);
    expect(t.rows.map((r) => r.table_name)).toEqual(["cost_reconciliations", "generations", "operations", "provider_calls"]);
  });

  it("adds a nullable source_generation_id to generations without touching existing rows", async () => {
    const r = await db.query<{ id: string; prompt: string; source_generation_id: string | null }>(`SELECT id, prompt, source_generation_id FROM generations`);
    expect(r.rows).toEqual([{ id: "g_old", prompt: "a knight", source_generation_id: null }]);
    await db.query(`INSERT INTO generations (id, prompt, source_generation_id) VALUES ('anim1', '[Animation: walk, 4f] a knight', 'g_old')`);
    const idx = await db.query<{ indexname: string }>(`SELECT indexname FROM pg_indexes WHERE tablename = 'generations'`);
    expect(idx.rows.map((x) => x.indexname)).toContain("generations_source_generation_id_idx");
  });

  it("rejects a refund larger than the charge at the database level", async () => {
    await op("a", { charged: 8 });
    await expect(db.query(`UPDATE operations SET credits_refunded = 9 WHERE id = 'a'`)).rejects.toThrow();
  });
});

describe("spend query (daily budget)", () => {
  it("counts a running operation at its reservation, a finished one at its logged cost", async () => {
    await op("run", { status: "RUNNING", est: 0.25 });
    await op("done", { status: "SUCCEEDED", est: 0.25 });
    await call("c1", "done", 0.1029, 0.1029);
    expect((await spend()).total).toBeCloseTo(0.25 + 0.1029);
  });

  it("never treats a finished operation without ledger rows as free", async () => {
    await op("nolog", { status: "SUCCEEDED", est: 0.25 });
    expect((await spend()).total).toBeCloseTo(0.25);
  });

  it("uses the larger of reservation and logged cost when the log is incomplete", async () => {
    await op("inc", { status: "FAILED", est: 0.25, incomplete: true });
    await call("c1", "inc", 0.1, 0.1);
    expect((await spend()).total).toBeCloseTo(0.25);
  });

  it("reports calls outside an operation separately (they don't block) and free-tier spend apart", async () => {
    await op("f", { status: "SUCCEEDED", plan: "FREE", est: 0.2 });
    await call("c1", "f", 0.0692, 0.0692);
    await call("orphan", null, null, 0.05);
    const s = await spend();
    expect(s.total).toBeCloseTo(0.0692);
    expect(s.outside).toBeCloseTo(0.05);
    expect(s.free).toBeCloseTo(0.0692);
  });

  it("ignores yesterday", async () => {
    await op("old", { created: at(-5) });
    expect((await spend()).total).toBe(0);
  });

  it("the advisory lock statement runs", async () => {
    await expect(db.query(`SELECT pg_advisory_xact_lock(${SPEND_LOCK})`)).resolves.toBeTruthy();
  });
});

describe("guard counters", () => {
  it("counts the user's ops, failures, same-input failures and failures from the same network", async () => {
    await op("1", { user: "u1", status: "FAILED", input: "h1", ip: "ipA" });
    await op("2", { user: "u1", status: "FAILED", input: "h1", ip: "ipA" });
    await op("3", { user: "u1", status: "SUCCEEDED" });
    await op("4", { user: "u2", status: "FAILED", ip: "ipA" });
    await op("5", { user: "u1", status: "FAILED", created: at(5) }); // outside the hour
    const r = (await db.query<Record<string, number>>(STATS_SQL, ["u1", "ipA", "h1", at(9.5)])).rows[0];
    expect(r).toEqual({ opsLastHour: 3, failedLastHour: 2, sameInputFailed: 2, ipFailedLastHour: 3 });
  });

  it("works without an IP", async () => {
    await op("1", { user: "u1", status: "FAILED" });
    const r = (await db.query<Record<string, number>>(STATS_SQL, ["u1", null, null, at(9.5)])).rows[0];
    expect(r.failedLastHour).toBe(1);
    expect(r.ipFailedLastHour).toBe(0);
  });
});

describe("recovery queries (cron)", () => {
  const ago = (min: number) => new Date(Date.now() - min * 60_000);

  it("fails stuck operations that delivered nothing, leaves ones that saved a generation", async () => {
    await op("stuck", { user: "u1", status: "RUNNING", created: ago(30) });
    await op("delivered", { user: "u2", status: "RUNNING", created: ago(30) });
    await db.query(`INSERT INTO generations (id, prompt, user_id, created_at) VALUES ('g2', 'x', 'u2', $1)`, [ago(28)]);
    await op("fresh", { user: "u3", status: "RUNNING", created: ago(2) });
    const r = await db.query<{ id: string }>(STALE_RUNNING_SQL);
    expect(r.rows.map((x) => x.id)).toEqual(["stuck"]);
    expect(await refund("stuck", null)).toBe(8); // then refunded by the next step
    expect(await refund("delivered", null)).toBe(8); // still RUNNING → refundable only by its own request path
  });

  it("settles a pending partial refund exactly once, capped at what's left", async () => {
    await op("p", { status: "PARTIAL", charged: 15, refunded: 0 });
    await db.query(`UPDATE operations SET error_code = 'refund_pending:7' WHERE id = 'p'`);
    const first = await db.query<{ due: number; user_id: string }>(SETTLE_PENDING_SQL, ["p"]);
    expect(first.rows[0]).toEqual({ due: 7, user_id: "u1" });
    const again = await db.query(SETTLE_PENDING_SQL, ["p"]);
    expect(again.rows).toHaveLength(0);
    const row = (await db.query<{ credits_refunded: number; error_code: string }>(`SELECT credits_refunded, error_code FROM operations WHERE id='p'`)).rows[0];
    expect(row).toEqual({ credits_refunded: 7, error_code: "refund_settled:7" });
  });

  it("never settles more than was charged", async () => {
    await op("p", { status: "PARTIAL", charged: 8, refunded: 6 });
    await db.query(`UPDATE operations SET error_code = 'refund_pending:5' WHERE id = 'p'`);
    expect((await db.query<{ due: number }>(SETTLE_PENDING_SQL, ["p"])).rows[0].due).toBe(2);
  });
});

describe("refund query", () => {
  it("refunds partially, then the rest, then nothing", async () => {
    await op("a", { charged: 15 });
    expect(await refund("a", 7)).toBe(7);
    expect(await refund("a", null)).toBe(8);
    expect(await refund("a", null)).toBe(0);
    expect((await db.query<{ credits_refunded: number }>(`SELECT credits_refunded FROM operations WHERE id='a'`)).rows[0].credits_refunded).toBe(15);
  });

  it("caps an oversized request at what's left", async () => {
    await op("a", { charged: 8, refunded: 6 });
    expect(await refund("a", 50)).toBe(2);
  });

  it("refunds FAILED operations (reconcile) but never delivered ones", async () => {
    await op("failed", { status: "FAILED" });
    await op("ok", { status: "SUCCEEDED" });
    await op("part", { status: "PARTIAL" });
    expect(await refund("failed", null)).toBe(8);
    expect(await refund("ok", null)).toBe(0);
    expect(await refund("part", null)).toBe(0);
  });

  it("returns the owner so the balance goes to the right user", async () => {
    await op("a", { user: "u42" });
    const r = await db.query<{ due: number; user_id: string }>(REFUND_SQL, ["a", 3]);
    expect(r.rows[0]).toEqual({ due: 3, user_id: "u42" });
  });
});
