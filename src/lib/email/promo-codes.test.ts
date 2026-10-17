import { afterEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { render } from "@react-email/render";
import { comebackPromoCode, visiblePromoCode, welcomePromoCode } from "./promo-codes";
import { SpecialOfferEmail } from "./templates/SpecialOfferEmail";

describe("special-offer promo codes", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("treats missing, blank, and the literal undefined as no code", () => {
    expect(visiblePromoCode(undefined)).toBeUndefined();
    expect(visiblePromoCode(null)).toBeUndefined();
    expect(visiblePromoCode("")).toBeUndefined();
    expect(visiblePromoCode("   ")).toBeUndefined();
    expect(visiblePromoCode("undefined")).toBeUndefined();
    expect(visiblePromoCode("Undefined")).toBeUndefined();
  });

  it("reads each offer from its own server env var", () => {
    vi.stubEnv("PROMO_CODE_COMEBACK", " SAMPLE-COMEBACK ");
    vi.stubEnv("PROMO_CODE_WELCOME", "");
    expect(comebackPromoCode()).toBe("SAMPLE-COMEBACK");
    expect(welcomePromoCode()).toBeUndefined();

    vi.stubEnv("PROMO_CODE_COMEBACK", "undefined");
    vi.stubEnv("PROMO_CODE_WELCOME", "SAMPLE-WELCOME");
    expect(comebackPromoCode()).toBeUndefined();
    expect(welcomePromoCode()).toBe("SAMPLE-WELCOME");
  });

  it("sends the offer without a code section when the code is unset", async () => {
    const html = await render(
      React.createElement(SpecialOfferEmail, {
        offerTitle: "We miss your creativity!",
        discountPercent: 20,
        expiresIn: "7 days",
        promoCode: visiblePromoCode(undefined),
      })
    );
    expect(html).toContain("20% OFF");
    expect(html).not.toContain("Use code");
    expect(html).not.toContain("undefined");
  });

  it("prints a configured code and still hides a literal undefined", async () => {
    const withCode = await render(
      React.createElement(SpecialOfferEmail, {
        discountPercent: 15,
        promoCode: visiblePromoCode("SAMPLE-WELCOME"),
      })
    );
    expect(withCode).toContain("Use code");
    expect(withCode).toContain("SAMPLE-WELCOME");

    const hidden = await render(
      React.createElement(SpecialOfferEmail, {
        discountPercent: 15,
        promoCode: "undefined",
      })
    );
    expect(hidden).toContain("15% OFF");
    expect(hidden).not.toContain("Use code");
    expect(hidden).not.toContain(">undefined<");
  });
});
