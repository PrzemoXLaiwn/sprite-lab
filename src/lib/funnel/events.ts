// Funnel event names the first-party store accepts.
// `purchase` is server-only (Stripe webhook). Clients cannot insert it.

export const CLIENT_FUNNEL_EVENTS = [
  "landing_view",
  "signup_complete",
  "first_generation_attempt",
  "first_generation_success",
  "first_generation_failed",
  "generation_attempt",
  "generation_success",
  "generation_error",
  "credits_exhausted",
  "upgrade_modal_shown",
  "upgrade_modal_clicked",
  "upsell_shown",
  "upsell_click",
  "checkout_start",
  "checkout_complete",
  "pricing_view",
  "offer_applied",
  "experiment_exposure",
] as const;

export const PURCHASE_EVENT = "purchase";

const ALL = new Set<string>([...CLIENT_FUNNEL_EVENTS, PURCHASE_EVENT]);

export function isClientFunnelEvent(name: unknown): name is (typeof CLIENT_FUNNEL_EVENTS)[number] {
  return typeof name === "string" && (CLIENT_FUNNEL_EVENTS as readonly string[]).includes(name);
}

export function isStoredFunnelEvent(name: unknown): boolean {
  return typeof name === "string" && ALL.has(name);
}

export interface Utm {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
}

function clipToken(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 80);
  if (!trimmed || /[@\s]/.test(trimmed)) return null;
  return trimmed;
}

/** Query-string attribution. Drops anything that looks like an email or a token blob. */
export function readUtm(search: string): Utm {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const get = (key: string) => clipToken(params.get(key));
  return {
    source: get("utm_source"),
    medium: get("utm_medium"),
    campaign: get("utm_campaign"),
    content: get("utm_content"),
    term: get("utm_term"),
  };
}

/** Origin and path only. Query strings can carry reset tokens. */
export function sanitizeReferrer(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return null;
  }
}

export function sanitizePath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  const path = raw.split("?")[0]?.split("#")[0] ?? "";
  return path.slice(0, 200) || null;
}

const PROP_KEYS = new Set([
  "plan", "type", "offer", "reason", "source", "mode", "target", "styleId", "categoryId", "experiment", "variant", "balance", "cost",
]);

/** Small non-PII props. Email-shaped strings are dropped. */
export function sanitizeProps(raw: unknown): Record<string, string | number | boolean> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!PROP_KEYS.has(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "boolean") out[key] = value;
    else if (typeof value === "string") {
      const text = value.trim().slice(0, 80);
      if (!text || text.includes("@")) continue;
      out[key] = text;
    }
    if (Object.keys(out).length >= 8) break;
  }
  return Object.keys(out).length ? out : null;
}

export function hasUtm(utm: Utm): boolean {
  return Boolean(utm.source || utm.medium || utm.campaign || utm.content || utm.term);
}
