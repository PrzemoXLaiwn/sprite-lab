import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Fakes: Stripe PaymentIntents + a Prisma with a unique PI constraint ─────
const intents = new Map<string, Record<string, unknown>>();
const created: string[] = [];
const state = { users: new Map<string, { isLifetime: boolean; plan: string; credits: number; lifetimeDeal: string | null }>(), piSeen: new Set<string>() };

vi.mock("@/lib/stripe", async (orig) => {
  const real = await orig<typeof import("@/lib/stripe")>();
  return {
    ...real,
    stripe: {
      paymentIntents: {
        retrieve: async (id: string) => intents.get(id),
        create: async () => { created.push("pi"); return { id: "pi_new", client_secret: "x" }; },
      },
      refunds: { create: async () => ({ id: "re_1" }) },
    },
    getOrCreateStripeCustomer: async () => "cus_1",
  };
});

vi.mock("@/lib/prisma", () => {
  const tx = {
    creditTransaction: {
      create: async ({ data }: { data: { stripePaymentIntentId?: string } }) => {
        if (data.stripePaymentIntentId) {
          if (state.piSeen.has(data.stripePaymentIntentId)) {
            const err = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
            Object.setPrototypeOf(err, (await import("@prisma/client")).Prisma.PrismaClientKnownRequestError.prototype);
            throw err;
          }
          state.piSeen.add(data.stripePaymentIntentId);
        }
        return {};
      },
      findFirst: async () => null,
    },
    $executeRawUnsafe: async () => 0,
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => state.users.get(where.id) ?? null,
      count: async () => [...state.users.values()].filter((u) => u.isLifetime).length,
      update: async ({ where, data }: { where: { id: string }; data: { credits: { increment: number }; plan: string; lifetimeDeal: string } }) => {
        const u = state.users.get(where.id)!;
        u.isLifetime = true; u.plan = data.plan; u.lifetimeDeal = data.lifetimeDeal; u.credits += data.credits.increment;
        return { credits: u.credits };
      },
    },
  };
  const prisma = { ...tx, $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
    // all-or-nothing: roll back the PI marker if the body throws after creating it
    const before = new Set(state.piSeen);
    try { return await fn(tx); } catch (e) { state.piSeen = before; throw e; }
  } };
  return { prisma, default: prisma };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "buyer", email: "b@x.com" } } }) } }) }));

const paidIntent = (id: string) => intents.set(id, {
  id, status: "succeeded", amount: 9900, amount_received: 9900, latest_charge: { amount_refunded: 0, disputed: false },
  metadata: { userId: "buyer", type: "lifetime_deal", deal: "PRO_LIFETIME", credits: "500" },
});

beforeEach(() => {
  intents.clear(); created.length = 0;
  state.users = new Map([["buyer", { isLifetime: false, plan: "FREE", credits: 10, lifetimeDeal: null }]]);
  state.piSeen = new Set();
  delete process.env.LIFETIME_SALES_ENABLED;
});

describe("lifetime sales pause", () => {
  it("refuses new lifetime payments when the flag is off — before any Stripe object is created", async () => {
    const { POST } = await import("@/app/api/stripe/create-lifetime-intent/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ deal: "PRO_LIFETIME" }) }));
    expect(res.status).toBe(410);
    expect((await res.json()).error).toBe("LIFETIME_PAUSED");
    expect(created).toHaveLength(0);
  });

  it("reports sales as closed to the pricing pages", async () => {
    const { GET } = await import("@/app/api/lifetime-slots/route");
    const body = await (await GET()).json();
    expect(body.salesEnabled).toBe(false);
  });
});

describe("existing lifetime obligations still honoured", () => {
  it("fulfils a payment made before the pause even when its webhook arrives late", async () => {
    paidIntent("pi_old");
    const { fulfillOneTimePayment } = await import("./fulfillment");
    const r = await fulfillOneTimePayment("pi_old");
    expect(r.status).toBe("credited");
    expect(state.users.get("buyer")).toMatchObject({ isLifetime: true, credits: 510 });
  });

  it("a duplicated webhook / confirm call credits only once", async () => {
    paidIntent("pi_dup");
    const { fulfillOneTimePayment } = await import("./fulfillment");
    const first = await fulfillOneTimePayment("pi_dup");
    const second = await fulfillOneTimePayment("pi_dup");
    expect(first.status).toBe("credited");
    expect(second.status).toBe("already_processed");
    expect(state.users.get("buyer")!.credits).toBe(510);
  });

  it("an unpaid (abandoned) intent is never fulfilled", async () => {
    intents.set("pi_abandoned", { id: "pi_abandoned", status: "requires_payment_method", metadata: { userId: "buyer", type: "lifetime_deal", deal: "PRO_LIFETIME", credits: "500" } });
    const { fulfillOneTimePayment } = await import("./fulfillment");
    expect((await fulfillOneTimePayment("pi_abandoned")).status).toBe("not_paid");
    expect(state.users.get("buyer")!.isLifetime).toBe(false);
  });
});
