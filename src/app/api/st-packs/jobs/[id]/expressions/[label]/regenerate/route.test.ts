// The free retry claims a step in tick(). That claim has to run even when the
// background worker accepts the kick — dropping it left the row locked until
// it counted as a failed attempt.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const M = vi.hoisted(() => ({
  order: [] as string[],
  kickOk: true,
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
vi.mock("@/lib/rate-limit", () => ({ rateLimitUserAction: async () => ({ blocked: null }) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/st-packs/jobs", () => ({
  regenerateExpression: async () => true,
  tick: async () => ({
    snapshot: { id: "job1abcdefg", status: "running", expressions: [] },
    work: [async () => { M.order.push("step"); }],
  }),
  runWork: async (work: Array<() => Promise<void>>) => {
    M.order.push("runWork");
    for (const w of work) await w();
  },
}));
vi.mock("@/lib/st-packs/worker", () => ({
  kickWorker: async () => {
    M.order.push("kick");
    return M.kickOk;
  },
}));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => Promise<unknown>) => { M.pending = Promise.resolve(fn()); } };
});

import { POST } from "./route";

const params = { params: Promise.resolve({ id: "job1abcdefg", label: "joy" }) };

function post(from: string) {
  return POST(new Request("https://sprite-lab.com/api/st-packs/jobs/job1abcdefg/expressions/joy/regenerate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from }),
  }), params);
}

describe("POST regenerate", () => {
  afterEach(() => { delete process.env.ST_PACKS_ENABLED; });

  beforeEach(() => {
    M.order = [];
    M.kickOk = true;
    M.pending = Promise.resolve();
    process.env.ST_PACKS_ENABLED = "true";
  });

  it("runs the claimed step and only then kicks, including when the kick is accepted", async () => {
    const res = await post("post");
    await M.pending;
    expect(res.status).toBe(200);
    expect(M.order).toEqual(["runWork", "step", "kick"]);
  });

  it("still runs the claimed step when the kick cannot start a worker", async () => {
    M.kickOk = false;
    const res = await post("post");
    await M.pending;
    expect(res.status).toBe(200);
    expect(M.order).toEqual(["runWork", "step", "kick"]);
  });
});
