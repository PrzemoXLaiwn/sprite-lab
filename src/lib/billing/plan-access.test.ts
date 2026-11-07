import { describe, expect, it } from "vitest";
import { describePlanAccess } from "./plan-access";

const NOW = new Date("2026-11-07T22:00:00Z");
const DEC6 = new Date("2026-12-06T23:59:59Z");

describe("describePlanAccess", () => {
  it("tells a cancelled Studio subscriber they keep access until 6 December 2026 and it will not renew", () => {
    const view = describePlanAccess({
      plan: "UNLIMITED",
      periodEnd: DEC6,
      cancelAtPeriodEnd: true,
      canManageBilling: true,
      now: NOW,
    });
    expect(view.planName).toBe("Studio");
    expect(view.status).toBe("ending");
    expect(view.summary).toContain("6 December 2026");
    expect(view.summary).toContain("will not renew");
    expect(view.summary).toContain("keep Studio until");
    expect(view.summary.toLowerCase()).not.toContain("upgrade");
    expect(view.canManageBilling).toBe(true);
  });

  it("says an active Studio plan renews, and does not invent a cancellation", () => {
    const view = describePlanAccess({
      plan: "UNLIMITED",
      periodEnd: DEC6,
      cancelAtPeriodEnd: false,
      now: NOW,
    });
    expect(view.status).toBe("renewing");
    expect(view.summary).toBe("Studio renews on 6 December 2026.");
  });

  it("does not guess when Stripe could not be read", () => {
    const view = describePlanAccess({
      plan: "PRO",
      periodEnd: DEC6,
      cancelAtPeriodEnd: null,
      now: NOW,
    });
    expect(view.status).toBe("unknown");
    expect(view.summary).toContain("couldn't confirm whether it renews");
  });

  it("names no date and no cancellation when the provider returned nothing", () => {
    const view = describePlanAccess({
      plan: "UNLIMITED",
      periodEnd: null,
      cancelAtPeriodEnd: null,
      now: NOW,
    });
    expect(view.status).toBe("unknown");
    expect(view.summary).toBe("Studio plan. The renewal date isn't available right now.");
    expect(view.summary.toLowerCase()).not.toContain("cancel");
  });

  it("describes Free and Lifetime without a renewal", () => {
    expect(describePlanAccess({ plan: "FREE", cancelAtPeriodEnd: null }).summary).toContain("no subscription");
    expect(describePlanAccess({ plan: "STARTER", isLifetime: true, cancelAtPeriodEnd: false }).status).toBe("lifetime");
  });
});
