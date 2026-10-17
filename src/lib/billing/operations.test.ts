import { beforeEach, describe, expect, it } from "vitest";
import { budgetPlan, startOperation } from "./operations";
import { FEATURES, LIMITS } from "./features";
import { canSpend, recordProviderCall, setLedgerSink } from "./ledger";
import { MemoryStore } from "./test-utils/memory-store";

let store: MemoryStore;
const START = (over: Partial<Parameters<typeof startOperation>[0]> = {}) =>
  startOperation({ userId: "u1", feature: "anim_6", credits: 8, plan: "PRO", input: { m: "walk" }, ip: "1.1.1.1", store, ...over });
const grid = (cost: number | null, est = 0.1029) => recordProviderCall({ provider: "runware", model: "google:4@3", task: "grid", outcome: "ok", costUsd: cost, estCostUsd: est });

beforeEach(() => {
  store = new MemoryStore({ u1: 100, u2: 100, poor: 3 });
  setLedgerSink(async (row) => { store.calls.push(row); });
  process.env.DAILY_SPEND_LIMIT_USD = "20";
  process.env.FREE_DAILY_SPEND_LIMIT_USD = "4";
});

describe("charging", () => {
  it("charges once and opens an operation", async () => {
    const r = await START();
    expect(r.ok).toBe(true);
    expect(store.credits("u1")).toBe(92);
    expect(store.txs.filter((t) => t.type === "GENERATION")).toHaveLength(1);
  });

  it("refuses with 402 and charges nothing when credits are short", async () => {
    const r = await START({ userId: "poor" });
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.status).toBe(402); expect(r.body.noCredits).toBe(true); }
    expect(store.credits("poor")).toBe(3);
    expect(store.ops).toHaveLength(0);
  });

  it("refuses with 503 and charges nothing when the database can't open the operation", async () => {
    store.failNext.open = 1;
    const r = await START();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(503);
    expect(store.credits("u1")).toBe(100);
  });
});

describe("refunds are idempotent", () => {
  it("fail() twice refunds once", async () => {
    const r = await START(); if (!r.ok) throw new Error();
    expect(await r.op.fail("X")).toBe(8);
    expect(await r.op.fail("X")).toBe(0);
    expect(store.credits("u1")).toBe(100);
    expect(store.txs.filter((t) => t.type === "REFUND")).toHaveLength(1);
  });

  it("a partial refund plus a failure never exceeds the charge", async () => {
    const r = await START({ feature: "anim_smooth_6", credits: 15 }); if (!r.ok) throw new Error();
    expect(await r.op.refund(7, "smooth_pass_unavailable")).toBe(7);
    expect(await r.op.refund(7, "smooth_pass_unavailable")).toBe(7);
    expect(await r.op.refund(7, "again")).toBe(1); // only 1 left
    expect(await r.op.fail("late")).toBe(0);
    expect(store.credits("u1")).toBe(100);
    expect(store.op(r.op.id).creditsRefunded).toBe(15);
  });

  it("smooth fallback keeps the key-frame price and closes as PARTIAL", async () => {
    const r = await START({ feature: "anim_smooth_6", credits: 15 }); if (!r.ok) throw new Error();
    await r.op.refund(7, "smooth_pass_unavailable");
    await r.op.partial("gen1", "smooth_pass_unavailable");
    expect(store.credits("u1")).toBe(92);
    expect(store.op(r.op.id).status).toBe("PARTIAL");
  });

  it("a refund that hits a DB error returns 0, stays due, and is settled exactly once later", async () => {
    const r = await START(); if (!r.ok) throw new Error();
    store.failNext.refund = 1;
    expect(await r.op.fail("PROVIDER_ERROR")).toBe(0);
    expect(store.credits("u1")).toBe(92);
    expect(store.op(r.op.id).status).toBe("FAILED");
    // the reconcile job runs (possibly twice)
    expect(await store.refund(r.op.id, null, "reconcile")).toBe(8);
    expect(await store.refund(r.op.id, null, "reconcile")).toBe(0);
    expect(store.credits("u1")).toBe(100);
  });

  it("the first finish wins (a late duplicate can't flip the result)", async () => {
    const r = await START(); if (!r.ok) throw new Error();
    await r.op.succeed("gen1");
    expect(await r.op.fail("late-error")).toBe(0); // delivered → never refunded
    expect(store.op(r.op.id).status).toBe("SUCCEEDED");
    expect(store.credits("u1")).toBe(92);
  });
});

describe("guards", () => {
  it("rate-limits expensive work after the hourly cap", async () => {
    store.users.set("u1", { credits: 1000 });
    for (let i = 0; i < LIMITS.opsPerHour; i++) {
      const r = await START({ input: i }); if (r.ok) await r.op.succeed(null);
    }
    const r = await START({ input: "one more" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(429);
  });

  it("never rate-limits 1-credit sprites by the expensive-work cap (bulk sprite makers)", async () => {
    store.users.set("u1", { credits: 1000 });
    for (let i = 0; i < LIMITS.opsPerHour + 5; i++) {
      const r = await START({ feature: "sprite", credits: 1, input: i });
      expect(r.ok).toBe(true);
      if (r.ok) await r.op.succeed(null);
    }
    const anim = await START({ input: "anim" });
    expect(anim.ok).toBe(true); // sprites don't use up the animation allowance
  });

  it("pauses expensive features after repeated failures, not cheap ones", async () => {
    for (let i = 0; i < LIMITS.failedPerHour; i++) { const r = await START({ input: i }); if (r.ok) await r.op.fail("X"); }
    const exp = await START({ input: "new" });
    expect(exp.ok).toBe(false);
    if (!exp.ok) expect(exp.code).toBe("FAILURE_COOLDOWN");
    const cheap = await START({ feature: "sprite", credits: 1 });
    expect(cheap.ok).toBe(true);
    expect(store.credits("u1")).toBe(99); // failures were refunded; only the sprite is charged
  });

  it("blocks the exact input that keeps failing (moderation / timeouts loop)", async () => {
    for (let i = 0; i < LIMITS.sameInputFailures; i++) { const r = await START(); if (r.ok) await r.op.fail("moderated"); }
    const r = await START();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("REPEATED_FAILURE");
  });

  it("counts failures per network so fresh accounts don't reset the cap", async () => {
    store.users.set("a", { credits: 50 }); store.users.set("b", { credits: 50 }); store.users.set("c", { credits: 50 });
    let n = 0;
    for (const u of ["a", "b"]) for (let i = 0; i < 3; i++) { const r = await START({ userId: u, input: n++ }); if (r.ok) await r.op.fail("X"); }
    const r = await START({ userId: "c", input: "fresh" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FAILURE_COOLDOWN");
  });

  it("fails safe for expensive features when the guard can't read the database", async () => {
    store.failNext.stats = 1;
    const exp = await START();
    expect(exp.ok).toBe(false);
    if (!exp.ok) expect(exp.status).toBe(503);
    expect(store.credits("u1")).toBe(100);
    store.failNext.stats = 1;
    const cheap = await START({ feature: "sprite", credits: 1 });
    expect(cheap.ok).toBe(true);
  });
});

describe("cancel and pending refunds", () => {
  it("cancel refunds everything and doesn't count as a failure", async () => {
    for (let i = 0; i < LIMITS.failedPerHour + 1; i++) {
      const r = await START({ feature: "rig", credits: 2, input: i }); if (!r.ok) throw new Error();
      expect(await r.op.cancel("NO_PIXEL_WALK")).toBe(2);
    }
    expect(store.credits("u1")).toBe(100);
    const next = await START({ input: "after cancels" });
    expect(next.ok).toBe(true); // no failure cooldown from cancels
  });

  it("a partial refund that fails to write is recorded as pending on the operation", async () => {
    const r = await START({ feature: "sprite_hd", credits: 3 }); if (!r.ok) throw new Error();
    store.failNext.refund = 1;
    expect(await r.op.refund(2, "single:downgrade")).toBe(0);
    await r.op.partial("gen1", "downgraded");
    expect(store.op(r.op.id).status).toBe("PARTIAL");
    expect(store.op(r.op.id).errorCode).toBe("refund_pending:2");
  });
});

describe("budget tier", () => {
  it("anyone who has paid draws from the paid budget", () => {
    expect(budgetPlan(null)).toBe("FREE");
    expect(budgetPlan({ plan: "FREE", totalSpent: 0 })).toBe("FREE");
    expect(budgetPlan({ plan: "FREE", totalSpent: 1.19 })).toBe("PAID"); // bought a pack
    expect(budgetPlan({ plan: "FREE", stripeCustomerId: "cus_1" })).toBe("PAID");
    expect(budgetPlan({ plan: "PRO" })).toBe("PRO");
  });
});

describe("daily spend guard", () => {
  it("calls made outside any operation (guest sprites, helpers) don't block paid work", async () => {
    process.env.DAILY_SPEND_LIMIT_USD = String(FEATURES.anim_6.estCostUsd + 0.01);
    for (let i = 0; i < 50; i++) recordProviderCall({ provider: "anthropic", model: "m", task: "suggest", outcome: "ok", estCostUsd: 0.05 });
    await new Promise((r) => setTimeout(r, 5));
    const r = await START();
    expect(r.ok).toBe(true);
  });

  it("never lets parallel requests overshoot the budget", async () => {
    process.env.DAILY_SPEND_LIMIT_USD = String(FEATURES.anim_6.estCostUsd * 3 + 0.01);
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => START({ input: i, userId: i % 2 ? "u1" : "u2" })));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    const refused = results.filter((r) => !r.ok);
    expect(refused.every((r) => !r.ok && r.code === "BUDGET")).toBe(true);
    expect(store.credits("u1") + store.credits("u2")).toBe(200 - 3 * 8);
  });

  it("counts a finished operation with no ledger rows at its estimate (no row ≠ free)", async () => {
    process.env.DAILY_SPEND_LIMIT_USD = String(FEATURES.anim_6.estCostUsd * 1.5);
    const a = await START({ input: 1 }); if (!a.ok) throw new Error();
    await a.op.succeed("g"); // nothing was logged for it
    const b = await START({ input: 2 });
    expect(b.ok).toBe(false);
  });

  it("uses reported costs once the ledger has them", async () => {
    process.env.DAILY_SPEND_LIMIT_USD = String(FEATURES.anim_6.estCostUsd * 1.5);
    const a = await START({ input: 1 }); if (!a.ok) throw new Error();
    await a.op.run(async () => grid(0.1029));
    await a.op.succeed("g");
    const b = await START({ input: 2 });
    expect(b.ok).toBe(true);
  });

  it("caps free-tier spend separately (multi-account protection)", async () => {
    process.env.FREE_DAILY_SPEND_LIMIT_USD = String(FEATURES.anim_6.estCostUsd + 0.01);
    const a = await START({ plan: "FREE", input: 1 }); expect(a.ok).toBe(true);
    const b = await START({ plan: "FREE", input: 2, userId: "u2" });
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.code).toBe("FREE_BUDGET");
    const paid = await START({ plan: "PRO", input: 3, userId: "u2" });
    expect(paid.ok).toBe(true);
  });
});

describe("per-operation cost cap", () => {
  it("allows the first pass and stops extra passes at the cap", async () => {
    const r = await START(); if (!r.ok) throw new Error();
    await r.op.run(async () => {
      expect(canSpend(0.1029)).toBe(true);
      grid(0.1029);
      expect(canSpend(0.1029)).toBe(true); // one redraw fits
      grid(0.1029);
      expect(canSpend(0.1029)).toBe(false); // a third pass would cross the cap
    });
  });

  it("counts a timeout with no reported cost at the list price", async () => {
    const r = await START(); if (!r.ok) throw new Error();
    await r.op.run(async () => {
      recordProviderCall({ provider: "runware", model: "m", task: "grid", outcome: "timeout", costUsd: null, estCostUsd: 0.1029, error: "aborted" });
      expect(r.op.context.spentUsd).toBeCloseTo(0.1029);
    });
  });
});

describe("ledger failures never break billing", () => {
  it("a failing ledger write marks the log incomplete but the operation still succeeds", async () => {
    setLedgerSink(async () => { throw new Error("db down"); });
    const r = await START(); if (!r.ok) throw new Error();
    await r.op.run(async () => grid(0.1029));
    await r.op.succeed("g");
    expect(store.op(r.op.id).status).toBe("SUCCEEDED");
    expect(store.op(r.op.id).costLogIncomplete).toBe(true);
    expect(store.credits("u1")).toBe(92);
  });

  it("a synchronously throwing sink doesn't throw into provider code", async () => {
    setLedgerSink(() => { throw new Error("boom"); });
    const r = await START(); if (!r.ok) throw new Error();
    await expect(r.op.run(async () => { grid(0.1); return 1; })).resolves.toBe(1);
  });

  it("finishing still works when the finish write fails (no throw, refund intact)", async () => {
    const r = await START(); if (!r.ok) throw new Error();
    store.failNext.finish = 1;
    await expect(r.op.fail("X")).resolves.toBe(8);
    expect(store.credits("u1")).toBe(100);
  });
});
