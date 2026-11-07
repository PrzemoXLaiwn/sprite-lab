/** Stripe Customer Portal hosts. Anything else is refused before navigation. */
const STRIPE_PORTAL_HOSTS = new Set(["billing.stripe.com"]);

export function isStripePortalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && STRIPE_PORTAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Asks our server for a portal session. Does not cancel anything by itself.
 * Returns the URL only when it is an https Stripe billing host.
 */
export async function requestBillingPortal(): Promise<{ ok: true; url: string } | { ok: false }> {
  try {
    const res = await fetch("/api/stripe/create-portal", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.url !== "string" || !isStripePortalUrl(data.url)) return { ok: false };
    return { ok: true, url: data.url };
  } catch {
    return { ok: false };
  }
}
