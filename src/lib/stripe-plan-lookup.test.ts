// Price → plan lookup must recognise the current (GBP) price IDs from the env
// and the legacy USD ones that existing subscriptions still renew on.
import { beforeAll, describe, expect, it } from "vitest";

let getPlanByPriceId: (id: string) => string | null;

beforeAll(async () => {
  process.env.STRIPE_STARTER_PRICE_ID = "price_test_starter_gbp";
  process.env.STRIPE_PRO_PRICE_ID = "price_test_pro_gbp";
  process.env.STRIPE_STUDIO_PRICE_ID = "price_test_studio_gbp";
  ({ getPlanByPriceId } = await import("./stripe"));
});

describe("getPlanByPriceId", () => {
  it("maps the current price IDs", () => {
    expect(getPlanByPriceId("price_test_starter_gbp")).toBe("STARTER");
    expect(getPlanByPriceId("price_test_pro_gbp")).toBe("PRO");
    expect(getPlanByPriceId("price_test_studio_gbp")).toBe("UNLIMITED");
  });

  it("still maps the legacy USD price IDs", () => {
    expect(getPlanByPriceId("price_1Se4yK9iyMYBcHNbbNFTQtaJ")).toBe("STARTER");
    expect(getPlanByPriceId("price_1Se4zo9iyMYBcHNboxldbwa2")).toBe("PRO");
    expect(getPlanByPriceId("price_1Se4zu9iyMYBcHNbM4mr5e9v")).toBe("UNLIMITED");
  });

  it("never matches the Free plan or an unknown price", () => {
    expect(getPlanByPriceId("price_unknown")).toBeNull();
    expect(getPlanByPriceId("")).toBeNull();
  });
});
