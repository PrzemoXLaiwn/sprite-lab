// The background worker keeps a job moving without the page: one lease per
// job, renewed every loop, handed to a successor when the budget ends. A poll
// may start a worker only when that lease is gone and no step lock is active.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobSnapshot } from "./types";

const M = vi.hoisted(() => ({
  statuses: [] as string[],
  ran: 0,
  ticks: 0,
  claims: 0,
  renews: 0,
  releases: [] as Date[],
  events: [] as string[],
  takeOvers: 0,
  failRenewAt: 0,
  workOnTerminal: false,
  claimResult: null as Date | null,
  takeOverResult: null as Date | null,
  token: new Date("2030-01-01T00:00:00.000Z"),
}));

vi.mock("./jobs", () => ({
  tick: async () => {
    await new Promise((r) => setTimeout(r, 2));
    M.ticks++;
    const status = M.statuses.shift() ?? "done";
    const work = status === "running" || M.workOnTerminal ? [async () => { M.ran++; }] : [];
    return { snapshot: { id: "j", status, startedAt: null, createdAt: new Date().toISOString(), expressions: [] } as unknown as JobSnapshot, work };
  },
  runWork: async (work: Array<() => Promise<void>>) => {
    M.events.push("run");
    for (const w of work) await w();
  },
}));

vi.mock("./worker-lease", () => ({
  claimWorkerLease: async () => {
    M.claims++;
    return M.claimResult;
  },
  renewWorkerLease: async () => {
    M.renews++;
    if (M.failRenewAt && M.renews >= M.failRenewAt) return null;
    M.token = new Date(M.token.getTime() + 60_000);
    return M.token;
  },
  releaseWorkerLease: async (_id: string, held: Date) => {
    M.events.push("release");
    M.releases.push(held);
    return true;
  },
  takeOverWorkerLease: async () => {
    M.takeOvers++;
    return M.takeOverResult;
  },
}));

import { isStalled, kickWorker, workerBaseUrl, workerLoop } from "./worker";

describe("workerLoop", () => {
  beforeEach(() => {
    M.statuses.length = 0;
    M.ran = 0;
    M.ticks = 0;
    M.claims = 0;
    M.renews = 0;
    M.releases = [];
    M.events = [];
    M.takeOvers = 0;
    M.failRenewAt = 0;
    M.workOnTerminal = false;
    M.token = new Date("2030-01-01T00:00:00.000Z");
    M.claimResult = M.token;
    M.takeOverResult = null;
  });

  it("renews the lease on every tick until the job leaves 'running', then releases it", async () => {
    M.statuses.push("running", "running", "done");
    const out = await workerLoop("j", { budgetMs: 600_000 });
    expect(M.ran).toBe(2);
    expect(M.claims).toBe(1);
    expect(M.renews).toBe(3);
    expect(M.releases).toHaveLength(1);
    expect(out.continueNeeded).toBe(false);
    expect(out.handoffFrom).toBeNull();
    expect(out.snapshot?.status).toBe("done");
  });

  it("renews a lease the kick already claimed, instead of claiming a second one", async () => {
    M.statuses.push("done");
    const given = new Date("2030-02-01T00:00:00.000Z");
    await workerLoop("j", { budgetMs: 600_000, leaseUntil: given });
    expect(M.claims).toBe(0);
    expect(M.renews).toBe(1);
  });

  it("stops without a successor when the lease was taken by someone else", async () => {
    M.failRenewAt = 1;
    M.statuses.push("running", "running");
    const out = await workerLoop("j", { budgetMs: 600_000 });
    expect(M.ran).toBe(0);
    expect(M.releases).toHaveLength(0);
    expect(out.continueNeeded).toBe(false);
    expect(out.handoffFrom).toBeNull();
  });

  it("asks for a successor still holding the lease when the budget ends with the job running", async () => {
    M.statuses.push(...Array(50).fill("running"));
    const out = await workerLoop("j", { budgetMs: 1 });
    expect(out.continueNeeded).toBe(true);
    expect(out.handoffFrom).toEqual(M.token);
    expect(M.releases).toHaveLength(0);
  });

  it("runs the pack finalisation the finishing tick queued, then releases the lease", async () => {
    M.workOnTerminal = true;
    M.statuses.push("done");
    const out = await workerLoop("j", { budgetMs: 600_000 });
    expect(M.events).toEqual(["run", "release"]);
    expect(M.ran).toBe(1);
    expect(out.continueNeeded).toBe(false);
    expect(out.handoffFrom).toBeNull();
    expect(out.snapshot?.status).toBe("done");
  });

  it("hands off before tick when the remaining time cannot fit the longest step", async () => {
    M.statuses.push("running", "running");
    const out = await workerLoop("j", { budgetMs: 30_000 });
    expect(M.ticks).toBe(0);
    expect(M.ran).toBe(0);
    expect(M.releases).toHaveLength(0);
    expect(out.continueNeeded).toBe(true);
    expect(out.handoffFrom).toEqual(M.token);
  });

  it("hands off before tick when the function kill is closer than the longest step, even if the budget is not", async () => {
    M.statuses.push("running");
    const out = await workerLoop("j", { budgetMs: 600_000, maxDurationMs: 30_000 });
    expect(M.ticks).toBe(0);
    expect(out.continueNeeded).toBe(true);
    expect(out.handoffFrom).not.toBeNull();
    expect(M.releases).toHaveLength(0);
  });
});

describe("kickWorker", () => {
  afterEach(() => {
    delete process.env.QUEUE_SECRET;
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    M.claims = 0;
    M.takeOvers = 0;
    M.releases = [];
    M.claimResult = new Date("2030-03-01T00:00:00.000Z");
    M.takeOverResult = new Date("2030-03-01T00:01:00.000Z");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 202 })));
    process.env.QUEUE_SECRET = "queue-secret";
    delete process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.ST_PACKS_WORKER_URL;
  });

  it("never sends the secret to NEXT_PUBLIC_APP_URL; uses the project's own host", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://someone-else.vercel.app";
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "www.sprite-lab.com";
    process.env.VERCEL_URL = "sprite-lab-abc.vercel.app";
    expect(await kickWorker("job1")).toBe(true);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://www.sprite-lab.com/api/st-packs/worker");
    expect(url).not.toContain("someone-else.vercel.app");
    expect((init?.headers as Record<string, string>)["x-queue-secret"]).toBe("queue-secret");
    expect(workerBaseUrl({ VERCEL_ENV: "preview", VERCEL_URL: "p.vercel.app", NEXT_PUBLIC_APP_URL: "https://x.app" })).toBe("https://p.vercel.app");
    expect(workerBaseUrl({ ST_PACKS_WORKER_URL: "https://w.example/" })).toBe("https://w.example");
  });

  it("does not claim or fetch when QUEUE_SECRET is missing", async () => {
    delete process.env.QUEUE_SECRET;
    expect(await kickWorker("job1")).toBe(false);
    expect(M.claims).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not fetch when another worker already holds the lease", async () => {
    M.claimResult = null;
    expect(await kickWorker("job1")).toBe(true);
    expect(M.claims).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("claims, then fetches with that lease timestamp", async () => {
    expect(await kickWorker("job1")).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/st-packs/worker");
    expect(JSON.parse(String(init?.body))).toEqual({ jobId: "job1", leaseUntil: "2030-03-01T00:00:00.000Z" });
    const headers = init?.headers as Record<string, string>;
    expect(headers["x-queue-secret"]).toBe("queue-secret");
  });

  it("takes the outgoing lease over on a hand-off and does not open a second claim", async () => {
    const held = new Date("2030-03-01T00:00:00.000Z");
    expect(await kickWorker("job1", { handoffFrom: held })).toBe(true);
    expect(M.claims).toBe(0);
    expect(M.takeOvers).toBe(1);
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({ leaseUntil: "2030-03-01T00:01:00.000Z" });
  });

  it("does not fetch when the hand-off loses the lease", async () => {
    M.takeOverResult = null;
    expect(await kickWorker("job1", { handoffFrom: new Date("2030-03-01T00:00:00.000Z") })).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("releases the lease when the kick is rejected, so the caller can do one tick", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    M.ticks = 0;
    expect(await kickWorker("job1")).toBe(false);
    expect(M.ticks).toBe(0);
    expect(M.releases.map((d) => d.toISOString())).toEqual(["2030-03-01T00:00:00.000Z"]);
  });
});

describe("isStalled", () => {
  const now = Date.parse("2030-04-01T00:00:00.000Z");
  const snap = (over: { status?: string; workerLeaseUntil?: string | null; lockedUntil?: Array<string | null> }): JobSnapshot => ({
    id: "j",
    status: over.status ?? "running",
    workerLeaseUntil: over.workerLeaseUntil ?? null,
    expressions: (over.lockedUntil ?? []).map((lockedUntil) => ({ lockedUntil })),
  } as unknown as JobSnapshot);

  it("does not kick while the worker lease is still in the future, even if no row has moved", () => {
    const lease = new Date(now + 30_000).toISOString();
    expect(isStalled(snap({ workerLeaseUntil: lease }), now)).toBe(false);
  });

  it("does not kick while an expression lock is still active, even after the lease expired", () => {
    const lease = new Date(now - 5_000).toISOString();
    const lock = new Date(now + 60_000).toISOString();
    expect(isStalled(snap({ workerLeaseUntil: lease, lockedUntil: [lock] }), now)).toBe(false);
  });

  it("kicks a running job only when the lease is gone and no step is locked", () => {
    expect(isStalled(snap({ workerLeaseUntil: null }), now)).toBe(true);
    expect(isStalled(snap({ workerLeaseUntil: new Date(now - 1).toISOString(), lockedUntil: [new Date(now - 1).toISOString()] }), now)).toBe(true);
    expect(isStalled(snap({ status: "done", workerLeaseUntil: null }), now)).toBe(false);
  });
});
