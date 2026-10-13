// The admin ledger queries against the real migration (PGlite, in memory),
// and the empty state when the tables don't exist yet.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadLedgerStats, type Query } from "./ledger-report";

const MIGRATION = readFileSync(join(process.cwd(), "prisma/sql/2026-10-13_cost_ledger.sql"), "utf8");
const since = new Date(Date.UTC(2026, 9, 12));
const dates = ["2026-10-12", "2026-10-13"];
const at = (d: number, h: number) => new Date(Date.UTC(2026, 9, d, h));
let db: PGlite;
const q: Query = async <T,>(sql: string, ...args: unknown[]) => (await db.query<T>(sql, args as never[])).rows;

async function op(id: string, feature: string, status: string, charged: number, refunded = 0, extra: Partial<{ created: Date; errorCode: string; incomplete: boolean }> = {}) {
  await db.query(
    `INSERT INTO operations (id, user_id, feature, status, credits_charged, credits_refunded, est_cost_usd, cost_cap_usd, error_code, cost_log_incomplete, created_at)
     VALUES ($1,'u1',$2,$3,$4,$5,0.1,0.2,$6,$7,$8)`,
    [id, feature, status, charged, refunded, extra.errorCode ?? null, extra.incomplete ?? false, extra.created ?? at(13, 10)],
  );
}
async function call(id: string, opId: string | null, provider: string, cost: number | null, est: number, outcome = "ok", created = at(13, 10)) {
  await db.query(
    `INSERT INTO provider_calls (id, operation_id, provider, model, task, outcome, cost_usd, est_cost_usd, created_at) VALUES ($1,$2,$3,'m','t',$4,$5,$6,$7)`,
    [id, opId, provider, outcome, cost, est, created],
  );
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`CREATE TABLE generations (id TEXT PRIMARY KEY, prompt TEXT, user_id TEXT, created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP)`);
});

describe("ledger report", () => {
  it("degrades to an empty, unavailable report when the ledger tables don't exist (no throw)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await loadLedgerStats(q, since, dates);
    expect(r).toEqual({
      available: false,
      days: dates.map((date) => ({ date, reportedUsd: 0, estimatedUsd: 0 })),
      providers: [], features: [], reconciliation: null, health: null,
    });
  });

  it("is available but empty right after the migration", async () => {
    await db.exec(MIGRATION);
    const r = await loadLedgerStats(q, since, dates);
    expect(r.available).toBe(true);
    expect(r.features).toEqual([]);
    expect(r.health).toEqual({ stuckRunning: 0, refundsPending: 0, creditsDue: 0 });
  });

  it("splits spend per day into reported vs estimated, and sums operations per feature", async () => {
    await db.exec(MIGRATION);
    await op("a", "anim_6", "SUCCEEDED", 8);
    await op("b", "anim_6", "FAILED", 8, 8);
    await op("c", "variations", "PARTIAL", 3, 1);
    await call("1", "a", "runware", 0.1029, 0.1029);
    await call("2", "a", "anthropic", null, 0.04);
    await call("3", "b", "anthropic", null, 0, "error");
    await call("4", "c", "replicate", null, 0.04, "ok", at(12, 9));
    await call("5", null, "runware", 0.0008, 0.0008, "ok", at(11, 9)); // before the range
    const r = await loadLedgerStats(q, since, dates);

    expect(r.days[0]).toEqual({ date: "2026-10-12", reportedUsd: 0, estimatedUsd: 0.04 });
    expect(r.days[1].reportedUsd).toBeCloseTo(0.1029);
    expect(r.days[1].estimatedUsd).toBeCloseTo(0.04);
    expect(r.providers.find((p) => p.provider === "anthropic")).toMatchObject({ calls: 2, failed: 1 });

    const anim = r.features.find((f) => f.feature === "anim_6")!;
    expect(anim).toMatchObject({ ops: 2, failed: 1, delivered: 1, refundedOps: 1, creditsCharged: 16, creditsRefunded: 8 });
    expect(anim.costUsd).toBeCloseTo(0.1429);
    expect(r.features.find((f) => f.feature === "variations")).toMatchObject({ ops: 1, delivered: 1, creditsRefunded: 1 });
  });

  it("flags stuck operations and credits still owed, and returns the latest Runware gap", async () => {
    await db.exec(MIGRATION);
    await op("stuck", "anim_4", "RUNNING", 5, 0, { created: new Date(Date.now() - 30 * 60_000) });
    await op("fresh", "anim_4", "RUNNING", 5, 0, { created: new Date() });
    await op("owed", "edit", "FAILED", 4, 0);
    await op("settled", "edit", "FAILED", 4, 4);
    await op("partial", "anim_smooth_6", "PARTIAL", 15, 0, { errorCode: "refund_pending:7" });
    await db.query(`INSERT INTO cost_reconciliations (id, provider, checked_at, reported_total_usd, reported_delta_usd, logged_delta_usd, gap_usd) VALUES
      ('r1','runware',$1,10,1,1,0), ('r2','runware',$2,12,2,1.5,0.5)`, [at(12, 0), at(13, 0)]);
    const r = await loadLedgerStats(q, since, dates);
    expect(r.health).toEqual({ stuckRunning: 1, refundsPending: 2, creditsDue: 4 + 7 });
    // the latest snapshot (r2), not the first one
    expect(r.reconciliation).toMatchObject({ gapUsd: 0.5, reportedDeltaUsd: 2, loggedDeltaUsd: 1.5 });
  });
});
