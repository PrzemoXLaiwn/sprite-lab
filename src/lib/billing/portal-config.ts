import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

/**
 * Portal configuration used for payment method and invoices.
 * Subscription cancel and plan changes stay off so the portal cannot skip
 * the retention flow. Optional STRIPE_BILLING_PORTAL_CONFIGURATION_ID pins
 * a configuration the owner already created with those features disabled.
 * Without it, we reuse or create one tagged spritelab-manage-only.
 */

export const PORTAL_CONFIGURATION_PURPOSE = "spritelab-manage-only";

export const MANAGE_ONLY_PORTAL_FEATURES: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
  payment_method_update: { enabled: true },
  invoice_history: { enabled: true },
  customer_update: {
    enabled: true,
    allowed_updates: ["email", "name", "address"],
  },
  subscription_cancel: { enabled: false },
  subscription_update: { enabled: false },
};

let cachedConfigId: Promise<string> | null = null;

export function resetPortalConfigurationCache(): void {
  cachedConfigId = null;
}

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://www.sprite-lab.com";
}

export async function getManageOnlyPortalConfigurationId(): Promise<string> {
  const fromEnv = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim();
  if (fromEnv) return fromEnv;
  if (!cachedConfigId) {
    cachedConfigId = resolveManageOnlyPortalConfiguration().catch((error) => {
      cachedConfigId = null;
      throw error;
    });
  }
  return cachedConfigId;
}

async function resolveManageOnlyPortalConfiguration(): Promise<string> {
  const list = await stripe.billingPortal.configurations.list({ limit: 100 });
  const existing = list.data.find(
    (config) => config.active && config.metadata?.purpose === PORTAL_CONFIGURATION_PURPOSE
  );
  if (existing) {
    const cancelOn = existing.features.subscription_cancel.enabled;
    const updateOn = existing.features.subscription_update.enabled;
    if (cancelOn || updateOn) {
      await stripe.billingPortal.configurations.update(existing.id, {
        features: {
          subscription_cancel: { enabled: false },
          subscription_update: { enabled: false },
        },
      });
    }
    return existing.id;
  }

  const origin = appOrigin();
  const created = await stripe.billingPortal.configurations.create({
    name: "SpriteLab payment and invoices",
    metadata: { purpose: PORTAL_CONFIGURATION_PURPOSE },
    default_return_url: `${origin}/settings#billing`,
    business_profile: {
      privacy_policy_url: `${origin}/privacy`,
      terms_of_service_url: `${origin}/terms`,
    },
    features: MANAGE_ONLY_PORTAL_FEATURES,
  });
  return created.id;
}
