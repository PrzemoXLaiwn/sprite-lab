import { beforeEach, describe, expect, it, vi } from "vitest";

const stripe = vi.hoisted(() => ({
  billingPortal: {
    configurations: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/stripe", () => ({ stripe }));

import { getManageOnlyPortalConfigurationId, resetPortalConfigurationCache } from "@/lib/billing/portal-config";

describe("billing portal configuration", () => {
  beforeEach(() => {
    resetPortalConfigurationCache();
    delete process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
    stripe.billingPortal.configurations.list.mockReset();
    stripe.billingPortal.configurations.create.mockReset();
    stripe.billingPortal.configurations.update.mockReset();
  });

  it("creates a configuration that cannot cancel or change the plan", async () => {
    stripe.billingPortal.configurations.list.mockResolvedValue({ data: [] });
    stripe.billingPortal.configurations.create.mockResolvedValue({ id: "bpc_new" });

    await expect(getManageOnlyPortalConfigurationId()).resolves.toBe("bpc_new");

    const params = stripe.billingPortal.configurations.create.mock.calls[0][0];
    expect(params.features.subscription_cancel.enabled).toBe(false);
    expect(params.features.subscription_update.enabled).toBe(false);
    expect(params.features.payment_method_update.enabled).toBe(true);
    expect(params.features.invoice_history.enabled).toBe(true);
    expect(params.metadata.purpose).toBe("spritelab-manage-only");
  });

  it("turns cancellation off on a reused configuration", async () => {
    stripe.billingPortal.configurations.list.mockResolvedValue({
      data: [{
        id: "bpc_old",
        active: true,
        metadata: { purpose: "spritelab-manage-only" },
        features: {
          subscription_cancel: { enabled: true },
          subscription_update: { enabled: true },
        },
      }],
    });
    stripe.billingPortal.configurations.update.mockResolvedValue({ id: "bpc_old" });

    await expect(getManageOnlyPortalConfigurationId()).resolves.toBe("bpc_old");
    expect(stripe.billingPortal.configurations.create).not.toHaveBeenCalled();
    const update = stripe.billingPortal.configurations.update.mock.calls[0][1];
    expect(update.features.subscription_cancel.enabled).toBe(false);
    expect(update.features.subscription_update.enabled).toBe(false);
  });

  it("uses the owner's configuration id without creating another", async () => {
    process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID = "bpc_env";
    await expect(getManageOnlyPortalConfigurationId()).resolves.toBe("bpc_env");
    expect(stripe.billingPortal.configurations.list).not.toHaveBeenCalled();
    expect(stripe.billingPortal.configurations.create).not.toHaveBeenCalled();
  });
});
