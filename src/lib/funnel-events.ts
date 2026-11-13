// Names recorded in funnel_events. Client and server share this list so a
// browser cannot write an arbitrary event name.

export const FUNNEL_EVENT_NAMES = ["paywall_shown", "checkout_opened", "payment_failed", "payment_succeeded"] as const;

export type FunnelEventName = (typeof FUNNEL_EVENT_NAMES)[number];

export function isFunnelEventName(value: unknown): value is FunnelEventName {
  return typeof value === "string" && (FUNNEL_EVENT_NAMES as readonly string[]).includes(value);
}

/** Drops anything that is not a short scalar. Never stores an email or a card. */
export function sanitizeFunnelProps(value: unknown): Record<string, string | number | boolean | null> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  let count = 0;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (count >= 12) break;
    if (!/^[a-z0-9_]{1,40}$/i.test(key)) continue;
    if (typeof raw === "string") out[key] = raw.slice(0, 120);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
    else if (typeof raw === "boolean") out[key] = raw;
    else if (raw === null) out[key] = null;
    else continue;
    count += 1;
  }
  return Object.keys(out).length ? out : undefined;
}
