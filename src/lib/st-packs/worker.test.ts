// The background worker keeps a job moving without the page: it loops over
// ticks until the job ends or its budget runs out (then asks for a successor),
// and a job nobody has touched for a while counts as stalled.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobSnapshot } from "./types";

const M = vi.hoisted(() => ({ statuses: [] as string[], ran: 0 }));
vi.mock("./jobs", () => ({
  tick: async () => {
    await new Promise((r) => setTimeout(r, 2));
    const status = M.statuses.shift() ?? "done";
    const work = status === "running" ? [async () => { M.ran++; }] : [];
    return { snapshot: { id: "j", status, startedAt: null, createdAt: new Date().toISOString(), expressions: [] } as unknown as JobSnapshot, work };
  },
  runWork: async (work: Array<() => Promise<void>>) => { for (const w of work) await w(); },
}));

import { isStalled, workerLoop } from "./worker";

describe("workerLoop", () => {
  beforeEach(() => { M.statuses.length = 0; M.ran = 0; });

  it("runs ticks until the job leaves 'running' and then stops without a successor", async () => {
    M.statuses.push("running", "running", "done");
    const out = await workerLoop("j", 60_000);
    expect(M.ran).toBe(2);
    expect(out.continueNeeded).toBe(false);
    expect(out.snapshot?.status).toBe("done");
  });

  it("asks for a successor when the budget ends with the job still running", async () => {
    M.statuses.push(...Array(50).fill("running"));
    const out = await workerLoop("j", 1);
    expect(out.continueNeeded).toBe(true);
  });
});

describe("isStalled", () => {
  const snap = (status: string, agoMs: number): JobSnapshot => ({
    id: "j", status, startedAt: new Date(Date.now() - agoMs).toISOString(), createdAt: new Date(Date.now() - agoMs - 1000).toISOString(),
    expressions: [{ updatedAt: new Date(Date.now() - agoMs).toISOString() }],
  } as unknown as JobSnapshot);

  it("flags a running job untouched for over 45 s, never a finished one", () => {
    expect(isStalled(snap("running", 10_000))).toBe(false);
    expect(isStalled(snap("running", 60_000))).toBe(true);
    expect(isStalled(snap("done", 600_000))).toBe(false);
  });
});
