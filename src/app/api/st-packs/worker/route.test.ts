// The successor must receive the lease the finishing invocation still holds.
// Kicking without that hand-off would either no-op (lease still taken) or
// race the page poll for a second worker.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const M = vi.hoisted(() => ({
  loopOpts: [] as Array<{ leaseUntil?: Date | null } | undefined>,
  kickArgs: [] as Array<{ handoffFrom?: Date } | undefined>,
  continueNeeded: true,
  handoffFrom: null as Date | null,
  pending: Promise.resolve() as Promise<unknown>,
}));

vi.mock("../_lib/guard", () => ({ JOB_ID_RE: /^[a-z0-9]{10,40}$/i }));
vi.mock("@/lib/st-packs/worker", () => ({
  WORKER_HEADER: "x-queue-secret",
  workerLoop: async (_jobId: string, opts?: { leaseUntil?: Date | null }) => {
    M.loopOpts.push(opts);
    return { snapshot: { status: "running" }, continueNeeded: M.continueNeeded, handoffFrom: M.handoffFrom };
  },
  kickWorker: async (_jobId: string, opts?: { handoffFrom?: Date }) => {
    M.kickArgs.push(opts);
    return true;
  },
}));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => Promise<unknown>) => { M.pending = Promise.resolve(fn()); } };
});

import { POST } from "./route";

const LEASE = "2030-05-01T00:00:00.000Z";

function post(body: unknown) {
  return POST(new Request("https://sprite-lab.com/api/st-packs/worker", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-queue-secret": "queue-secret" },
    body: JSON.stringify(body),
  }));
}

describe("POST /api/st-packs/worker", () => {
  afterEach(() => {
    delete process.env.ST_PACKS_ENABLED;
    delete process.env.QUEUE_SECRET;
  });

  beforeEach(() => {
    M.loopOpts = [];
    M.kickArgs = [];
    M.continueNeeded = true;
    M.handoffFrom = new Date("2030-05-01T00:04:00.000Z");
    M.pending = Promise.resolve();
    process.env.ST_PACKS_ENABLED = "true";
    process.env.QUEUE_SECRET = "queue-secret";
  });

  it("runs the loop with the claimed lease and hands that lease to the successor", async () => {
    const res = await post({ jobId: "job1abcdefg", leaseUntil: LEASE });
    await M.pending;
    expect(res.status).toBe(202);
    expect(M.loopOpts[0]?.leaseUntil?.toISOString()).toBe(LEASE);
    expect(M.kickArgs).toEqual([{ handoffFrom: M.handoffFrom }]);
  });

  it("does not kick a successor when the loop still holds the job or the job has finished", async () => {
    M.continueNeeded = false;
    M.handoffFrom = null;
    await post({ jobId: "job1abcdefg", leaseUntil: LEASE });
    await M.pending;
    expect(M.kickArgs).toEqual([]);
  });

  it("does not kick when the loop asks to continue but has no lease to hand over", async () => {
    M.continueNeeded = true;
    M.handoffFrom = null;
    await post({ jobId: "job1abcdefg", leaseUntil: LEASE });
    await M.pending;
    expect(M.kickArgs).toEqual([]);
  });
});