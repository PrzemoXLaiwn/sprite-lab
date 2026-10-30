import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPublicStatsCacheForTests } from "@/lib/public-stats";

const state = vi.hoisted(() => ({ fail: false }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    generation: {
      count: async () => {
        if (state.fail) throw new Error("db down");
        return 42;
      },
    },
  },
}));

import { GET } from "@/app/api/stats/total-generations/route";

describe("public total generations", () => {
  beforeEach(() => {
    state.fail = false;
    resetPublicStatsCacheForTests();
  });

  it("returns the generation count and nothing about users", async () => {
    const body = await (await GET()).json();
    expect(body).toEqual({ total: 42, cached: false });
  });

  it("does not invent a count when the database is down", async () => {
    state.fail = true;
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ total: 0, error: true });
  });
});
