import { beforeEach, describe, expect, it, vi } from "vitest";

const fulfill = vi.fn();
const auth = { user: null as { id: string } | null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: auth.user } }) } }),
}));

vi.mock("../_lib/fulfillment", () => ({
  fulfillOneTimePayment: (...args: unknown[]) => fulfill(...args),
}));

const receipt = {
  transactionId: "pi_pack200",
  value: 7.99,
  currency: "GBP",
  itemId: "PACK_200",
  itemName: "Inferno",
};

function post(body: unknown) {
  return new Request("http://sprite.test/api/stripe/confirm-credit-purchase?price=1.19", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/stripe/confirm-credit-purchase", () => {
  beforeEach(() => {
    fulfill.mockReset();
    auth.user = { id: "buyer" };
  });

  it("requires a signed-in caller before it reads Stripe", async () => {
    auth.user = null;
    const { POST } = await import("./route");
    const res = await POST(post({ paymentIntentId: "pi_pack200" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(fulfill).not.toHaveBeenCalled();
  });

  it("passes the caller id through and does not accept a URL price", async () => {
    fulfill.mockResolvedValue({
      status: "credited",
      kind: "credit_pack",
      credits: 250,
      totalCredits: 260,
      purchase: receipt,
    });
    const { POST } = await import("./route");
    const res = await POST(post({ paymentIntentId: "pi_pack200", price: 119, value: 1.19 }));
    expect(res.status).toBe(200);
    expect(fulfill).toHaveBeenCalledWith("pi_pack200", { expectedUserId: "buyer" });
    const json = await res.json();
    expect(json.purchase).toEqual(receipt);
    expect(json.price).toBeUndefined();
    expect(json.value).toBeUndefined();
  });

  it("returns no receipt when the payment is not the caller's or is not paid", async () => {
    const { POST } = await import("./route");
    fulfill.mockResolvedValueOnce({ status: "forbidden" });
    const forbidden = await POST(post({ paymentIntentId: "pi_other" }));
    expect(forbidden.status).toBe(401);
    expect(await forbidden.json()).not.toHaveProperty("purchase");

    fulfill.mockResolvedValueOnce({ status: "not_paid" });
    const unpaid = await POST(post({ paymentIntentId: "pi_open" }));
    expect(unpaid.status).toBe(400);
    expect(await unpaid.json()).toEqual({ error: "Payment not completed" });
  });

  it("still returns the receipt when the credit was already applied", async () => {
    fulfill.mockResolvedValue({
      status: "already_processed",
      kind: "credit_pack",
      credits: 250,
      purchase: receipt,
    });
    const { POST } = await import("./route");
    const res = await POST(post({ paymentIntentId: "pi_pack200" }));
    expect(res.status).toBe(200);
    expect((await res.json()).purchase.transactionId).toBe("pi_pack200");
  });
});
