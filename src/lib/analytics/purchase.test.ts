import { describe, expect, it, vi } from "vitest";
import { GA_MEASUREMENT_ID } from "./measurement-id";
import {
  createPurchaseReporter,
  memoryPurchaseStore,
  paymentReturnToConfirm,
  firstPaidSubscriptionInvoice,
  purchaseFromConfirmBody,
  purchaseFromPaymentIntent,
  purchaseFromSubscriptionInvoice,
  stripeReturnIds,
  subscriptionReturnToConfirm,
} from "./purchase";

const pack = {
  id: "pi_pack200",
  status: "succeeded" as const,
  amount: 799,
  amount_received: 799,
  currency: "gbp",
};

const inferno = { itemId: "PACK_200", itemName: "Inferno" };

function params(query: string) {
  return new URLSearchParams(query);
}

describe("server purchase amounts", () => {
  it("converts credit-pack minor units and ignores catalog fallbacks", () => {
    const receipt = purchaseFromPaymentIntent(pack, inferno);
    expect(receipt).toEqual({
      transactionId: "pi_pack200",
      value: 7.99,
      currency: "GBP",
      itemId: "PACK_200",
      itemName: "Inferno",
    });
    expect(receipt?.value).not.toBe(799);
    expect(receipt?.value).not.toBe(1.19);
  });

  it("uses the paid invoice, including the first-month promo, not the list price", () => {
    const receipt = purchaseFromSubscriptionInvoice({
      id: "in_first3",
      status: "paid",
      billing_reason: "subscription_create",
      amount_paid: 300,
      currency: "gbp",
    }, { itemId: "STARTER", itemName: "Starter" });
    expect(receipt?.value).toBe(3);
    expect(receipt?.currency).toBe("GBP");
    expect(receipt?.transactionId).toBe("in_first3");
    expect(receipt?.value).not.toBe(5);
  });

  it("will not reuse another customer's subscription or a renewal invoice", () => {
    const created = { id: "in_owner", status: "paid", billing_reason: "subscription_create", amount_paid: 1200 };
    const renewal = { id: "in_renew", status: "paid", billing_reason: "subscription_cycle", amount_paid: 1200 };
    const owned = { metadata: { userId: "buyer", plan: "PRO" } };
    expect(firstPaidSubscriptionInvoice([renewal, created], owned, "buyer", "PRO")).toBe(created);
    expect(firstPaidSubscriptionInvoice([renewal], owned, "buyer", "PRO")).toBeNull();
    expect(firstPaidSubscriptionInvoice([created], owned, "intruder", "PRO")).toBeNull();
    expect(firstPaidSubscriptionInvoice([created], owned, "buyer", "STARTER")).toBeNull();
    expect(firstPaidSubscriptionInvoice([created], { metadata: {} }, "buyer", "PRO")).toBeNull();
  });

  it("does not measure an unpaid, canceled, renewal, or id-less charge", () => {
    expect(purchaseFromPaymentIntent({ ...pack, status: "canceled" }, inferno)).toBeNull();
    expect(purchaseFromPaymentIntent({ ...pack, status: "requires_payment_method" }, inferno)).toBeNull();
    expect(purchaseFromPaymentIntent({ ...pack, id: "" }, inferno)).toBeNull();
    expect(purchaseFromPaymentIntent({ ...pack, id: "seti_notacharge" }, inferno)).toBeNull();
    expect(purchaseFromPaymentIntent({ ...pack, currency: undefined }, inferno)).toBeNull();
    expect(purchaseFromPaymentIntent({ ...pack, amount_received: undefined, amount: undefined }, inferno)).toBeNull();
    expect(purchaseFromSubscriptionInvoice({
      id: "in_renew",
      status: "paid",
      billing_reason: "subscription_cycle",
      amount_paid: 500,
      currency: "gbp",
    }, { itemId: "STARTER", itemName: "Starter" })).toBeNull();
    expect(purchaseFromSubscriptionInvoice({
      id: "in_open",
      status: "open",
      billing_reason: "subscription_create",
      amount_paid: 500,
      currency: "gbp",
    }, { itemId: "STARTER", itemName: "Starter" })).toBeNull();
  });
});

describe("confirm body versus the URL", () => {
  const trusted = {
    success: true,
    price: 1.19,
    value: 799,
    purchase: {
      transactionId: "pi_pack200",
      value: 7.99,
      currency: "GBP",
      itemId: "PACK_200",
      itemName: "Inferno",
    },
  };

  it("reads the server receipt and not a price sitting beside it", () => {
    expect(purchaseFromConfirmBody(trusted)?.value).toBe(7.99);
  });

  it("rejects error bodies, missing receipts, and a purchase with no id", () => {
    expect(purchaseFromConfirmBody({ success: false, error: "Payment not completed", purchase: trusted.purchase })).toBeNull();
    expect(purchaseFromConfirmBody({ error: "Unauthorized" })).toBeNull();
    expect(purchaseFromConfirmBody({ success: true, price: 12 })).toBeNull();
    expect(purchaseFromConfirmBody({
      success: true,
      purchase: { ...trusted.purchase, transactionId: "" },
    })).toBeNull();
    expect(purchaseFromConfirmBody({
      success: true,
      purchase: { ...trusted.purchase, transactionId: "cs_session" },
    })).toBeNull();
  });

  it("does not treat redirect_status or a bare success URL as a payment", () => {
    const succeeded = params("redirect_status=succeeded&plan=PRO&price=12&session_id=cs_123");
    expect(subscriptionReturnToConfirm(succeeded)).toBeNull();
    expect(paymentReturnToConfirm(succeeded)).toBeNull();
    expect(stripeReturnIds(succeeded)).toEqual({ setupIntentId: null, paymentIntentId: null });

    const failedHide = params("setup_intent=seti_abc&redirect_status=failed&plan=PRO&price=1");
    expect(subscriptionReturnToConfirm(failedHide)).toEqual({ setupIntentId: "seti_abc", plan: "PRO" });

    const failedPack = params("payment_intent=pi_abc&redirect_status=failed&price=19.99");
    expect(paymentReturnToConfirm(failedPack)).toEqual({ paymentIntentId: "pi_abc" });

    expect(paymentReturnToConfirm(params("payment_intent=../pi_abc"))).toBeNull();
    expect(subscriptionReturnToConfirm(params("setup_intent=seti_abc"))).toBeNull();
  });
});

describe("GA4 purchase reporting", () => {
  const receipt = {
    transactionId: "pi_pack200",
    value: 7.99,
    currency: "GBP",
    itemId: "PACK_200",
    itemName: "Inferno",
  };

  it("sends one purchase to the GA4 stream and not the old Ads label", () => {
    const gtag = vi.fn();
    const reporter = createPurchaseReporter(memoryPurchaseStore());
    expect(reporter.report(receipt, gtag)).toBe("sent");
    expect(reporter.report(receipt, gtag)).toBe("duplicate");
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag.mock.calls[0][0]).toBe("event");
    expect(gtag.mock.calls[0][1]).toBe("purchase");
    const payload = gtag.mock.calls[0][2] as { send_to: string; transaction_id: string; value: number };
    expect(payload.send_to).toBe(GA_MEASUREMENT_ID);
    expect(payload.send_to.startsWith("G-")).toBe(true);
    expect(payload.transaction_id).toBe("pi_pack200");
    expect(payload.value).toBe(7.99);
    expect(JSON.stringify(payload)).not.toContain("AW-");
    expect(JSON.stringify(payload)).not.toContain("conversion");
  });

  it("keeps the id across a reload and a second reporter", () => {
    const store = memoryPurchaseStore();
    const gtag = vi.fn();
    expect(createPurchaseReporter(store).report(receipt, gtag)).toBe("sent");
    expect(createPurchaseReporter(store).report(receipt, gtag)).toBe("duplicate");
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("waits for gtag instead of dropping or double-sending", () => {
    const store = memoryPurchaseStore();
    const reporter = createPurchaseReporter(store);
    expect(reporter.report(receipt)).toBe("unavailable");
    expect(reporter.report(receipt)).toBe("unavailable");
    const gtag = vi.fn();
    reporter.flush(gtag);
    reporter.flush(gtag);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(reporter.report(receipt, gtag)).toBe("duplicate");
  });

  it("does not send when the receipt is rejected", () => {
    const gtag = vi.fn();
    const reporter = createPurchaseReporter(memoryPurchaseStore());
    expect(reporter.report({ ...receipt, transactionId: "session_id" }, gtag)).toBe("rejected");
    expect(reporter.report(null, gtag)).toBe("rejected");
    expect(gtag).not.toHaveBeenCalled();
  });

  it("a throw after the hit is queued does not unlock a second send", () => {
    const gtag = vi.fn(() => { throw new Error("blocked"); });
    const store = memoryPurchaseStore();
    const reporter = createPurchaseReporter(store);
    expect(reporter.report(receipt, gtag)).toBe("sent");
    expect(createPurchaseReporter(store).report(receipt, vi.fn())).toBe("duplicate");
    expect(gtag).toHaveBeenCalledTimes(1);
  });
});
