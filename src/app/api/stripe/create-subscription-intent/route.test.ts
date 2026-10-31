import { beforeEach, describe, expect, it, vi } from "vitest";

const created: Array<Record<string, unknown>> = [];
const customers: string[] = [];

vi.mock("@/lib/stripe", async (orig) => {
  const real = await orig<typeof import("@/lib/stripe")>();
  return {
    ...real,
    PLANS: {
      ...real.PLANS,
      STARTER: { ...real.PLANS.STARTER, priceId: "price_starter" },
      PRO: { ...real.PLANS.PRO, priceId: "price_pro" },
      UNLIMITED: { ...real.PLANS.UNLIMITED, priceId: "price_studio" },
    },
    stripe: {
      setupIntents: {
        create: async (args: Record<string, unknown>) => {
          created.push(args);
          return { id: "seti_1", client_secret: "cs_test" };
        },
      },
    },
    getOrCreateStripeCustomer: async () => {
      customers.push("cus_1");
      return "cus_1";
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: async () => ({ plan: "FREE", stripeSubscriptionId: null, stripePriceId: null }),
    },
    creditTransaction: { findFirst: async () => null },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user_1", email: "buyer@example.com" } } }) },
  }),
}));

vi.mock("@/app/api/stripe/_lib/fulfillment", () => ({
  hasActiveSubscription: async () => false,
}));

function post(body: unknown) {
  return new Request("http://localhost/api/stripe/create-subscription-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  created.length = 0;
  customers.length = 0;
  delete process.env.STRIPE_COUPON_STARTER_FIRST_MONTH;
});

describe("create-subscription-intent", () => {
  it("preview returns the plan and does not create a customer or SetupIntent", async () => {
    const { POST } = await import("./route");
    const res = await POST(post({ plan: "STARTER", intent: "preview", offer: "first3" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.clientSecret).toBeUndefined();
    expect(json.customerId).toBeUndefined();
    expect(json.plan).toMatchObject({ name: "Starter", price: 5, credits: 250 });
    expect(json.firstMonthOffer).toEqual({ applied: false });
    expect(created).toEqual([]);
    expect(customers).toEqual([]);
  });

  it("creates a card-only SetupIntent when the buyer pays, and reuses nothing from preview", async () => {
    process.env.STRIPE_COUPON_STARTER_FIRST_MONTH = "coupon_starter_first_month";
    const { POST } = await import("./route");
    const res = await POST(post({ plan: "STARTER", offer: "first3" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.clientSecret).toBe("cs_test");
    expect(json.firstMonthOffer).toEqual({ applied: true });
    expect(customers).toEqual(["cus_1"]);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      customer: "cus_1",
      payment_method_types: ["card"],
      metadata: { userId: "user_1", plan: "STARTER", priceId: "price_starter", offer: "first3" },
    });
    expect(created[0]).not.toHaveProperty("automatic_payment_methods");
  });
});
