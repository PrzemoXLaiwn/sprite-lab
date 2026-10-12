// In-memory BillingStore for tests. Mirrors the SQL semantics of store.ts:
// conditional charge, refund capped at the charge, first-finish-wins, and the
// spend guard serialised by one lock (like pg_advisory_xact_lock).
import type { BillingStore, OpenInput, OpenResult, UserStats } from "../store";
import type { LedgerRow } from "../ledger";

interface Op {
  id: string; userId: string; feature: string; status: string; creditsCharged: number; creditsRefunded: number;
  estCostUsd: number; inputHash: string | null; ipHash: string | null; plan: string | null; createdAt: Date; costLogIncomplete: boolean;
}

export class MemoryStore implements BillingStore {
  users = new Map<string, { credits: number }>();
  ops: Op[] = [];
  calls: LedgerRow[] = [];
  txs: { userId: string; amount: number; type: string }[] = [];
  failNext: Partial<Record<"stats" | "open" | "refund" | "finish", number>> = {};
  private lock: Promise<void> = Promise.resolve();
  private seq = 0;

  constructor(users: Record<string, number> = {}) {
    for (const [id, credits] of Object.entries(users)) this.users.set(id, { credits });
  }

  private maybeFail(k: keyof MemoryStore["failNext"]) {
    if (this.failNext[k]) { this.failNext[k]! -= 1; throw new Error(`db down (${k})`); }
  }

  /** Same rules as SPEND_SQL. */
  spend(dayStart: Date) {
    const costOf = (o: Op) => {
      const logged = this.calls.filter((c) => c.operationId === o.id).reduce((a, c) => a + (c.costUsd ?? c.estCostUsd), 0);
      const has = this.calls.some((c) => c.operationId === o.id);
      if (o.status === "RUNNING" || o.costLogIncomplete) return Math.max(o.estCostUsd, logged);
      return has ? logged : o.estCostUsd;
    };
    const today = this.ops.filter((o) => o.createdAt >= dayStart);
    const orphan = this.calls.filter((c) => !c.operationId).reduce((a, c) => a + (c.costUsd ?? c.estCostUsd), 0);
    return {
      total: today.reduce((a, o) => a + costOf(o), 0) + orphan,
      free: today.filter((o) => o.plan === "FREE").reduce((a, o) => a + costOf(o), 0),
    };
  }

  async stats(userId: string, ipHash: string | null, inputHash: string | null, since: Date): Promise<UserStats> {
    this.maybeFail("stats");
    const recent = this.ops.filter((o) => o.createdAt >= since);
    const mine = recent.filter((o) => o.userId === userId);
    return {
      opsLastHour: mine.length,
      failedLastHour: mine.filter((o) => o.status === "FAILED").length,
      sameInputFailed: mine.filter((o) => o.status === "FAILED" && o.inputHash === inputHash).length,
      ipFailedLastHour: ipHash ? recent.filter((o) => o.ipHash === ipHash && o.status === "FAILED").length : 0,
    };
  }

  async open(input: OpenInput): Promise<OpenResult> {
    this.maybeFail("open");
    const run = async (): Promise<OpenResult> => {
      await new Promise((r) => setTimeout(r, 1)); // let parallel callers interleave
      if (input.expensive) {
        const s = this.spend(input.dayStart);
        if (s.total + input.estCostUsd > input.dailyLimitUsd) return { ok: false, reason: "budget" };
        if (input.plan === "FREE" && s.free + input.estCostUsd > input.freeDailyLimitUsd) return { ok: false, reason: "free_budget" };
      }
      const u = this.users.get(input.userId);
      if (!u) return { ok: false, reason: "no_user" };
      if (u.credits < input.credits) return { ok: false, reason: "insufficient" };
      u.credits -= input.credits;
      const id = `op${++this.seq}`;
      this.ops.push({ id, userId: input.userId, feature: input.feature, status: "RUNNING", creditsCharged: input.credits, creditsRefunded: 0,
        estCostUsd: input.estCostUsd, inputHash: input.inputHash, ipHash: input.ipHash, plan: input.plan, createdAt: new Date(), costLogIncomplete: false });
      this.txs.push({ userId: input.userId, amount: -input.credits, type: "GENERATION" });
      return { ok: true, operationId: id, credits: u.credits };
    };
    // Expensive opens are serialised like the advisory lock
    if (!input.expensive) return run();
    const prev = this.lock;
    let release!: () => void;
    this.lock = new Promise((r) => (release = r));
    await prev;
    try { return await run(); } finally { release(); }
  }

  async refund(operationId: string, amount: number | null, _reason: string): Promise<number> {
    this.maybeFail("refund");
    const o = this.ops.find((x) => x.id === operationId);
    if (!o || !(o.status === "RUNNING" || o.status === "FAILED")) return 0;
    const due = Math.min(o.creditsCharged - o.creditsRefunded, amount ?? Infinity);
    if (due <= 0) return 0;
    o.creditsRefunded += due;
    this.users.get(o.userId)!.credits += due;
    this.txs.push({ userId: o.userId, amount: due, type: "REFUND" });
    return due;
  }

  async finish(operationId: string, status: "SUCCEEDED" | "PARTIAL" | "FAILED", data: { costLogIncomplete?: boolean }): Promise<void> {
    this.maybeFail("finish");
    const o = this.ops.find((x) => x.id === operationId);
    if (!o || o.status !== "RUNNING") return;
    o.status = status;
    if (data.costLogIncomplete !== undefined) o.costLogIncomplete = data.costLogIncomplete;
  }

  op(id: string) { return this.ops.find((o) => o.id === id)!; }
  credits(userId: string) { return this.users.get(userId)!.credits; }
}
