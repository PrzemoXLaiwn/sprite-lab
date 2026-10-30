import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: auth.userId ? { id: auth.userId } : null } }) },
  }),
}));

vi.mock("@/lib/billing/manage-subscription", () => ({
  BillingError: class BillingError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  startCancellation: vi.fn(),
  keepSubscription: vi.fn(),
  acceptRetentionOffer: vi.fn(),
  confirmCancellation: vi.fn(async () => ({ outcome: "cancelled", periodEnd: null, message: "done" })),
  getBillingSubscription: vi.fn(),
  resumeCancellation: vi.fn(),
  resumePausedBilling: vi.fn(),
}));

import { POST } from "@/app/api/billing/cancellation/route";

function post(body: unknown) {
  return POST(new Request("http://localhost/api/billing/cancellation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

describe("cancellation route", () => {
  beforeEach(() => {
    auth.userId = null;
  });

  it("requires a logged-in user", async () => {
    const res = await post({ action: "confirm", attemptId: "att_1" });
    expect(res.status).toBe(401);
  });

  it("rejects a confirm that skipped the reason", async () => {
    auth.userId = "user_1";
    const res = await post({ action: "confirm" });
    expect(res.status).toBe(400);
  });
});
