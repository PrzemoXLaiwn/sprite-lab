import { describe, expect, it } from "vitest";
import { animationCredits, ROTATIONS } from "@/config/animations";
import { PLAN_MONTHLY_CREDITS } from "@/config/plan-features";
import { subscriptionCheckoutIncludes } from "@/config/checkout-summary";

describe("subscription checkout summary", () => {
  it("names the commercial licence and derives animation counts from the real prices", () => {
    const credits = PLAN_MONTHLY_CREDITS.STARTER;
    const lines = subscriptionCheckoutIncludes(credits);
    const fourFrame = animationCredits(4, false);
    const walk = ROTATIONS.find((rotation) => rotation.id === "walk4dir")?.credits ?? 0;
    expect(lines[0]).toMatch(/Commercial licence/);
    expect(lines.join(" ")).toContain(`${Math.floor(credits / fourFrame)} four-frame`);
    expect(lines.join(" ")).toContain(`${Math.floor(credits / walk)} four-direction walk`);
    expect(lines).toContain("Cancel anytime");
    expect(lines.join(" ")).not.toMatch(/Background removal/);
  });
});
