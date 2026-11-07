import { describe, expect, it } from "vitest";
import { isStripePortalUrl } from "./open-portal";

describe("isStripePortalUrl", () => {
  it("accepts the Stripe billing host only", () => {
    expect(isStripePortalUrl("https://billing.stripe.com/p/session/test_123")).toBe(true);
  });

  it("rejects other hosts, insecure URLs, and junk", () => {
    expect(isStripePortalUrl("https://evil.example/billing.stripe.com")).toBe(false);
    expect(isStripePortalUrl("http://billing.stripe.com/p/session/test")).toBe(false);
    expect(isStripePortalUrl("javascript:alert(1)")).toBe(false);
    expect(isStripePortalUrl("")).toBe(false);
  });
});
