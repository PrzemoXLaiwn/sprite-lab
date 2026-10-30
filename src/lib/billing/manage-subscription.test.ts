import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeSub = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  pause_collection: { behavior: string; resumes_at: number } | null;
  discounts: Array<{ id: string; source: { coupon: { id: string; percent_off: number | null; amount_off: number | null } | null } }>;
  items: { data: Array<{ id: string; price: { id: string }; current_period_end: number }> };
};

const state = vi.hoisted(() => ({
  updates: [] as { id: string; params: Record<string, unknown> }[],
  coupons: [] as Record<string, unknown>[],
  cancelCalls: 0,
  users: new Map<string, Record<string, unknown>>(),
  attempts: [] as Record<string, unknown>[],
  subs: new Map<string, FakeSub>(),
  seq: 0,
}));

function match(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value === null) return row[key] == null;
    return row[key] === value;
  });
}

vi.mock("@/lib/stripe", async (importOriginal) => {
  process.env.STRIPE_STARTER_PRICE_ID = "price_starter";
  process.env.STRIPE_PRO_PRICE_ID = "price_pro";
  process.env.STRIPE_STUDIO_PRICE_ID = "price_studio";
  const actual = await importOriginal<typeof import("@/lib/stripe")>();
  return {
    ...actual,
    stripe: {
      subscriptions: {
        retrieve: async (id: string) => {
          const sub = state.subs.get(id);
          if (!sub) {
            const error = new Error("missing") as Error & { code: string };
            error.code = "resource_missing";
            throw error;
          }
          return sub;
        },
        update: async (id: string, params: Record<string, unknown>) => {
          state.updates.push({ id, params });
          const sub = state.subs.get(id);
          if (!sub) throw new Error("missing sub");
          if (typeof params.cancel_at_period_end === "boolean") {
            sub.cancel_at_period_end = params.cancel_at_period_end;
          }
          if (params.pause_collection === "") sub.pause_collection = null;
          else if (params.pause_collection && typeof params.pause_collection === "object") {
            const pause = params.pause_collection as { behavior?: string; resumes_at?: number };
            sub.pause_collection = {
              behavior: pause.behavior ?? "void",
              resumes_at: pause.resumes_at ?? 0,
            };
          }
          const items = params.items as Array<{ id: string; price: string }> | undefined;
          if (items?.[0]) sub.items.data[0].price.id = items[0].price;
          if (Array.isArray(params.discounts)) {
            sub.discounts = (params.discounts as Array<{ coupon?: string; discount?: string }>).map((entry, index) => ({
              id: entry.discount || `di_${index}`,
              source: {
                coupon: entry.coupon
                  ? { id: entry.coupon, percent_off: 40, amount_off: null }
                  : { id: "coupon_existing", percent_off: null, amount_off: 200 },
              },
            }));
          }
          return sub;
        },
        cancel: async () => {
          state.cancelCalls += 1;
          throw new Error("immediate cancel must not be used");
        },
      },
      coupons: {
        create: async (params: Record<string, unknown>) => {
          state.coupons.push(params);
          return { id: `coupon_${state.coupons.length}` };
        },
      },
    },
  };
});

vi.mock("@/lib/prisma", () => {
  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => state.users.get(where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const user = state.users.get(where.id);
        if (!user) throw new Error("missing user");
        Object.assign(user, data);
        return user;
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        let count = 0;
        for (const user of state.users.values()) {
          if (match(user, where)) {
            Object.assign(user, data);
            count += 1;
          }
        }
        return { count };
      },
    },
    creditTransaction: {
      aggregate: async () => ({ _sum: { moneyAmount: 0 } }),
    },
    project: { count: async () => 2 },
    generation: { count: async () => 5 },
    subscriptionCancellation: {
      findMany: async ({ where }: { where?: { userId?: string } }) =>
        state.attempts.filter((row) => !where?.userId || row.userId === where.userId),
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        state.attempts.find((row) => match(row, where)) ?? null,
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.attempts.find((row) => row.id === where.id) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `att_${++state.seq}`,
          note: null,
          reason: null,
          offerShown: null,
          offerAccepted: false,
          stripeCouponId: null,
          ...data,
        };
        state.attempts.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = state.attempts.find((item) => item.id === where.id);
        if (!row) throw new Error("missing attempt");
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        let count = 0;
        for (const row of state.attempts) {
          if (match(row, where)) {
            Object.assign(row, data);
            count += 1;
          }
        }
        return { count };
      },
    },
  };
  return { prisma, default: prisma };
});

import {
  acceptRetentionOffer,
  confirmCancellation,
  resumeCancellation,
  startCancellation,
} from "@/lib/billing/manage-subscription";

function user(plan = "PRO") {
  state.users.set("user_1", {
    id: "user_1",
    plan,
    credits: 80,
    isLifetime: false,
    lifetimeDeal: null,
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_1",
    stripePriceId: plan === "STARTER" ? "price_starter" : "price_pro",
    stripeCurrentPeriodEnd: new Date("2026-11-30T00:00:00Z"),
    cancelAtPeriodEnd: false,
    billingPaused: false,
    subscriptionPauseResumesAt: null,
    retentionDiscountUsedAt: null,
    totalSpent: plan === "STARTER" ? 5 : 0,
  });
}

function sub() {
  state.subs.set("sub_1", {
    id: "sub_1",
    status: "active",
    cancel_at_period_end: false,
    pause_collection: null,
    discounts: [],
    items: { data: [{ id: "si_1", price: { id: "price_pro" }, current_period_end: 1_800_000_000 }] },
  });
}

beforeEach(() => {
  state.updates.length = 0;
  state.coupons.length = 0;
  state.cancelCalls = 0;
  state.users.clear();
  state.attempts.length = 0;
  state.subs.clear();
  state.seq = 0;
  user();
  sub();
});

describe("self-serve cancellation", () => {
  it("cancels at period end and never immediately", async () => {
    const started = await startCancellation("user_1", { reason: "other", note: "  shipping a game  " });
    const result = await confirmCancellation("user_1", started.attemptId);

    expect(result.outcome).toBe("cancelled");
    expect(state.cancelCalls).toBe(0);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].params).toMatchObject({ cancel_at_period_end: true });
    expect(state.users.get("user_1")?.cancelAtPeriodEnd).toBe(true);
    expect(state.users.get("user_1")?.plan).toBe("PRO");
    const attempt = state.attempts[0];
    expect(attempt.outcome).toBe("cancelled");
    expect(attempt.reason).toBe("other");
    expect(attempt.note).toBe("shipping a game");
    expect(attempt.offerAccepted).toBe(false);
  });

  it("resumes a subscription that was set to cancel", async () => {
    const started = await startCancellation("user_1", { reason: "other" });
    await confirmCancellation("user_1", started.attemptId);
    state.updates.length = 0;

    const resumed = await resumeCancellation("user_1");
    expect(resumed.message).toMatch(/renew/i);
    expect(state.updates[0].params).toMatchObject({ cancel_at_period_end: false });
    expect(state.users.get("user_1")?.cancelAtPeriodEnd).toBe(false);
    expect(state.users.get("user_1")?.plan).toBe("PRO");
    expect(state.cancelCalls).toBe(0);
  });

  it("creates a one-time coupon only when the discount is accepted", async () => {
    const started = await startCancellation("user_1", { reason: "quality" });
    expect(started.offers.map((offer) => offer.type)).toContain("discount");
    expect(state.coupons).toHaveLength(0);

    const saved = await acceptRetentionOffer("user_1", started.attemptId, "discount");
    expect(saved.outcome).toBe("retained");
    expect(state.coupons[0]).toMatchObject({
      percent_off: 40,
      duration: "once",
      max_redemptions: 1,
    });
    expect(state.updates[0].params).toMatchObject({ cancel_at_period_end: false });
    const discounts = state.updates[0].params.discounts as Array<{ coupon?: string }>;
    expect(discounts.some((entry) => entry.coupon === "coupon_1")).toBe(true);
    expect(state.users.get("user_1")?.retentionDiscountUsedAt).toBeInstanceOf(Date);
    expect(state.attempts[0].outcome).toBe("retained");
    expect(state.attempts[0].offerAccepted).toBe(true);
    expect(state.cancelCalls).toBe(0);

    user("PRO");
    state.users.get("user_1")!.retentionDiscountUsedAt = new Date();
    const again = await startCancellation("user_1", { reason: "quality" });
    expect(again.offers.map((offer) => offer.type)).not.toContain("discount");
  });

  it("downgrades without a proration charge", async () => {
    const started = await startCancellation("user_1", { reason: "too_expensive" });
    await acceptRetentionOffer("user_1", started.attemptId, "downgrade");
    expect(state.updates[0].params).toMatchObject({
      proration_behavior: "none",
      cancel_at_period_end: false,
      items: [{ id: "si_1", price: "price_starter" }],
    });
    expect(state.users.get("user_1")?.plan).toBe("STARTER");
    expect(state.cancelCalls).toBe(0);
  });

  it("pauses collection for a subscriber who is not using the plan", async () => {
    user("STARTER");
    const current = state.subs.get("sub_1");
    if (!current) throw new Error("missing sub");
    current.items.data[0].price.id = "price_starter";
    const started = await startCancellation("user_1", { reason: "not_using_enough" });
    expect(started.offers.map((offer) => offer.type)).toEqual(["pause"]);
    await acceptRetentionOffer("user_1", started.attemptId, "pause");
    const pause = state.updates[0].params.pause_collection as { behavior: string; resumes_at: number };
    expect(pause.behavior).toBe("void");
    expect(pause.resumes_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(state.users.get("user_1")?.billingPaused).toBe(true);
    expect(state.users.get("user_1")?.plan).toBe("STARTER");
  });

  it("refuses an offer that was not shown", async () => {
    user("STARTER");
    const started = await startCancellation("user_1", { reason: "one_project" });
    expect(started.offers).toEqual([]);
    await expect(acceptRetentionOffer("user_1", started.attemptId, "discount")).rejects.toThrow(/not available/i);
    expect(state.coupons).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });
});
