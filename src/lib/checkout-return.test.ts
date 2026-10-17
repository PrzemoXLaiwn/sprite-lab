import { describe, expect, it } from "vitest";
import { checkoutPurchaseLabel } from "@/lib/checkout-intent";
import { isCheckoutReturn, safeRedirectPath } from "@/lib/safe-redirect";

const origin = "https://spritelab.example";

describe("safeRedirectPath", () => {
  it("keeps same-site checkout and app paths", () => {
    expect(safeRedirectPath("/checkout/pro", origin)).toBe("/checkout/pro");
    expect(safeRedirectPath("/checkout/credits/ember", origin)).toBe("/checkout/credits/ember");
    expect(safeRedirectPath("/checkout/lifetime/pro_lifetime?x=1", origin)).toBe("/checkout/lifetime/pro_lifetime?x=1");
    expect(safeRedirectPath("/community", origin)).toBe("/community");
    expect(safeRedirectPath("/update-password", origin)).toBe("/update-password");
    expect(safeRedirectPath(null, origin)).toBe("/generate");
  });

  it("rejects open redirects", () => {
    for (const evil of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "///evil.com",
      "/\\@evil.com",
      "/%2f%2fevil.com",
      "/%5c%5cevil.com",
      "/%09/evil.com",
      "/checkout/pro\nSet-Cookie: a",
      " /checkout/pro",
      "javascript:alert(1)",
    ]) {
      expect(safeRedirectPath(evil, origin), evil).toBe("/generate");
    }
  });

  it("normalizes traversal onto this origin", () => {
    expect(safeRedirectPath("/checkout/%2e%2e/login", origin)).toBe("/login");
    expect(isCheckoutReturn(safeRedirectPath("/checkout/%2e%2e/login", origin))).toBe(false);
  });
});

describe("checkout return", () => {
  it("matches checkout paths only", () => {
    expect(isCheckoutReturn("/checkout/pro")).toBe(true);
    expect(isCheckoutReturn("/checkout/credits/ember?x=1")).toBe(true);
    expect(isCheckoutReturn("/checkout-evil")).toBe(false);
    expect(isCheckoutReturn("/generate")).toBe(false);
    expect(isCheckoutReturn("/play")).toBe(false);
  });

  it("names the purchase from the public cards", () => {
    expect(checkoutPurchaseLabel("/checkout/pro")).toBe("Pro");
    expect(checkoutPurchaseLabel("/checkout/starter")).toBe("Starter");
    expect(checkoutPurchaseLabel("/checkout/studio")).toBe("Studio");
    expect(checkoutPurchaseLabel("/checkout/credits/blaze")).toBe("Blaze");
    expect(checkoutPurchaseLabel("/checkout/credits/75")).toBe("Blaze");
    expect(checkoutPurchaseLabel("/checkout/lifetime/pro_lifetime")).toBe("Pro Lifetime");
    expect(checkoutPurchaseLabel("/checkout/success")).toBeNull();
    expect(checkoutPurchaseLabel("//evil.com")).toBeNull();
    expect(checkoutPurchaseLabel("/generate")).toBeNull();
  });
});
