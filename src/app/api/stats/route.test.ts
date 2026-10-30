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
    user: {
      count: async () => {
        throw new Error("user counts must not be public");
      },
    },
  },
}));

import { GET } from "@/app/api/stats/route";

const HIDDEN = ["totalUsers", "activeUsersToday", "activeUsersWeek", "paidSubscribers", "paidUsers"];

describe("public stats", () => {
  beforeEach(() => {
    state.fail = false;
    resetPublicStatsCacheForTests();
  });

  it("returns only the generation count", async () => {
    const body = await (await GET()).json();
    expect(body.totalGenerations).toBe(42);
    expect(body.cached).toBe(false);
    for (const key of HIDDEN) expect(body).not.toHaveProperty(key);
    expect(Object.keys(body).sort()).toEqual(["cached", "timestamp", "totalGenerations"]);
  });

  it("does not invent user numbers when the database is down", async () => {
    state.fail = true;
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.totalGenerations).toBe(0);
    expect(body.error).toBe(true);
    for (const key of HIDDEN) expect(body).not.toHaveProperty(key);
  });
});
