import { describe, expect, it } from "vitest";
import { isProviderBalanceMessage, PROVIDER_BALANCE_MESSAGE } from "./provider-balance";

describe("provider balance errors", () => {
  it("recognises the prepaid-balance wording Runware actually returns", () => {
    const prod = "Runware concurrentRequestLimitExceeded: Insufficient available balance. 0.9978 credits are currently reserved for requests in progress, and this request needs 0.3438 credits.";
    expect(isProviderBalanceMessage(prod)).toBe(true);
    expect(isProviderBalanceMessage("insufficientCredits")).toBe(true);
    expect(isProviderBalanceMessage("Please top-up your account")).toBe(true);
    expect(isProviderBalanceMessage("Runware invalidInputImage: bad image")).toBe(false);
    expect(PROVIDER_BALANCE_MESSAGE).toBe("Provider balance too low");
  });
});
