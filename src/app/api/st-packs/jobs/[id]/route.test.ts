// The snapshot poll (every 4 s) may start a worker only when the lease is
// gone and no expression step is locked. Otherwise a quiet Vidu render would
// spawn another 240 s function on every poll.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobSnapshot } from "@/lib/st-packs/types";

const M = vi.hoisted(() => ({
  kicks: 0,
  kickOk: true,
  ticks: 0,
  ran: 0,
  snapshot: null as JobSnapshot | null,
  pending: Promise.resolve() as Promise<unknown>,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
}));
vi.mock("@/lib/admin", () => ({
  isAdmin: async () => true,
  isModerator: async () => true,
  getUserRole: async () => "ADMIN",
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/st-packs/jobs", () => ({
  getSnapshot: async () => M.snapshot,
  tick: async () => { M.ticks++; return { work: [async () => { M.ran++; }] }; },
  runWork: async (work: Array<() => Promise<void>>) => { for (const w of work) await w(); },
}));
vi.mock("@/lib/st-packs/worker", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/st-packs/worker")>();
  return {
    ...actual,
    kickWorker: async () => { M.kicks++; return M.kickOk; },
  };
});
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => Promise<unknown>) => { M.pending = Promise.resolve(fn()); } };
});

import { GET } from "./route";

function get() {
  return GET(new Request("https://sprite-lab.com/api/st-packs/jobs/job1abcdefg"), { params: Promise.resolve({ id: "job1abcdefg" }) });
}

function snap(over: { status?: string; workerLeaseUntil?: string | null; lockedUntil?: string | null }): JobSnapshot {
  return {
    id: "job1abcdefg",
    status: over.status ?? "running",
    workerLeaseUntil: over.workerLeaseUntil ?? null,
    expressions: [{ lockedUntil: over.lockedUntil ?? null, updatedAt: new Date(Date.now() - 120_000).toISOString() }],
  } as unknown as JobSnapshot;
}

describe("GET /api/st-packs/jobs/[id]", () => {
  afterEach(() => { delete process.env.ST_PACKS_ENABLED; });

  beforeEach(() => {
    M.kicks = 0;
    M.kickOk = true;
    M.ticks = 0;
    M.ran = 0;
    M.snapshot = null;
    M.pending = Promise.resolve();
    process.env.ST_PACKS_ENABLED = "true";
  });

  it("does not kick while the worker lease is held, even though no expression row has changed", async () => {
    M.snapshot = snap({ workerLeaseUntil: new Date(Date.now() + 30_000).toISOString() });
    expect((await get()).status).toBe(200);
    await M.pending;
    expect(M.kicks).toBe(0);
    expect(M.ticks).toBe(0);
  });

  it("does not kick while an expression lock is still active", async () => {
    M.snapshot = snap({ workerLeaseUntil: new Date(Date.now() - 5_000).toISOString(), lockedUntil: new Date(Date.now() + 60_000).toISOString() });
    expect((await get()).status).toBe(200);
    await M.pending;
    expect(M.kicks).toBe(0);
  });

  it("kicks once when the lease has expired and nothing is locked, and does not also tick", async () => {
    M.snapshot = snap({ workerLeaseUntil: null });
    expect((await get()).status).toBe(200);
    await M.pending;
    expect(M.kicks).toBe(1);
    expect(M.ticks).toBe(0);
  });

  it("advances on the poll itself when the kick cannot start a worker", async () => {
    M.kickOk = false;
    M.snapshot = snap({ workerLeaseUntil: null });
    await get();
    await M.pending;
    expect(M.kicks).toBe(1);
    expect(M.ticks).toBe(1);
    expect(M.ran).toBe(1);
  });
});
