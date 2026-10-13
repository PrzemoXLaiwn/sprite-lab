// =============================================================================
// Resend webhooks — signature check + bounce / complaint handling
// =============================================================================
// Resend signs webhooks the Svix way:
//   headers  svix-id, svix-timestamp (unix seconds), svix-signature
//            ("v1,<base64> v1,<base64>" — several during secret rotation)
//   secret   "whsec_<base64 key>" (RESEND_WEBHOOK_SECRET)
//   signed   HMAC-SHA256(key, `${id}.${timestamp}.${rawBody}`), base64
// Timestamps more than 5 minutes off are rejected (replay protection); within
// that window a replay is harmless because every write below is idempotent.
//
// Events:
//   email.delivery_delayed → email_logs.status "delivery_delayed"
//   email.bounced          → "bounced"    + bouncedAt, marketing: false
//   email.complained       → "complained" + complainedAt, marketing: false
// Statuses only move forward (sent < delivery_delayed < bounced < complained),
// so a late or repeated event never downgrades a row.
// =============================================================================

import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export type VerifyResult = { ok: true } | { ok: false; reason: "missing_secret" | "missing_headers" | "bad_timestamp" | "stale_timestamp" | "bad_signature" };

export interface SignedRequest {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
}

function secretKey(secret: string): Buffer | null {
  const s = secret.trim();
  if (!s) return null;
  const raw = s.startsWith("whsec_") ? s.slice("whsec_".length) : s;
  const key = Buffer.from(raw, "base64");
  return key.length > 0 ? key : null;
}

export function signPayload(secret: string, id: string, timestamp: string, body: string): string {
  const key = secretKey(secret);
  if (!key) throw new Error("empty webhook secret");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

/** Verifies a Svix-style signature. Fails closed: no secret → never ok. */
export function verifyWebhookSignature(secret: string | undefined, req: SignedRequest, now: Date = new Date()): VerifyResult {
  const key = secretKey(secret ?? "");
  if (!key) return { ok: false, reason: "missing_secret" };
  if (!req.id || !req.timestamp || !req.signature) return { ok: false, reason: "missing_headers" };
  if (!/^\d{1,12}$/.test(req.timestamp)) return { ok: false, reason: "bad_timestamp" };
  const ts = Number(req.timestamp);
  if (Math.abs(now.getTime() / 1000 - ts) > SIGNATURE_TOLERANCE_SECONDS) return { ok: false, reason: "stale_timestamp" };

  const expected = createHmac("sha256", key).update(`${req.id}.${req.timestamp}.${req.body}`).digest();
  for (const part of req.signature.split(" ")) {
    const [version, sig] = part.split(",", 2);
    if (version !== "v1" || !sig) continue;
    const given = Buffer.from(sig, "base64");
    if (given.length === expected.length && timingSafeEqual(given, expected)) return { ok: true };
  }
  return { ok: false, reason: "bad_signature" };
}

// -----------------------------------------------------------------------------
// Event handling
// -----------------------------------------------------------------------------

export type DeliveryStatus = "delivery_delayed" | "bounced" | "complained";

export const EVENT_STATUS: Record<string, DeliveryStatus> = {
  "email.delivery_delayed": "delivery_delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

/** Lower-ranked statuses a new status may replace (never the other way round). */
export const REPLACEABLE: Record<DeliveryStatus, readonly string[]> = {
  delivery_delayed: ["sent"],
  bounced: ["sent", "delivery_delayed", "opened", "clicked"],
  complained: ["sent", "delivery_delayed", "opened", "clicked", "bounced"],
};

export interface WebhookDeps {
  /** Moves email_logs rows with this message id from one of `from` to `to`; returns rows changed. */
  updateStatus(messageId: string, to: DeliveryStatus, from: readonly string[]): Promise<number>;
  /** Accounts behind the message (by email_logs.user_id) or the recipient addresses. */
  findUsers(messageId: string, addresses: string[]): Promise<{ id: string; emailPreferences: unknown }[]>;
  /** jsonb merge into users.email_preferences (mergeEmailPreferences). */
  mergePrefs(userId: string, patch: Record<string, unknown>): Promise<void>;
}

export interface WebhookOutcome {
  handled: boolean;
  type: string;
  status?: DeliveryStatus;
  rowsUpdated: number;
  usersSuppressed: number;
}

interface ResendEvent {
  type?: unknown;
  created_at?: unknown;
  data?: { email_id?: unknown; to?: unknown };
}

export async function handleResendEvent(payload: unknown, deps: WebhookDeps, now: Date = new Date()): Promise<WebhookOutcome> {
  const ev = (payload && typeof payload === "object" ? payload : {}) as ResendEvent;
  const type = typeof ev.type === "string" ? ev.type : "unknown";
  const status = EVENT_STATUS[type];
  const out: WebhookOutcome = { handled: false, type, rowsUpdated: 0, usersSuppressed: 0 };
  if (!status) return out;

  const messageId = typeof ev.data?.email_id === "string" ? ev.data.email_id : "";
  const to = ev.data?.to;
  const addresses = (Array.isArray(to) ? to : [to])
    .filter((a): a is string => typeof a === "string" && a.includes("@"))
    .map((a) => a.trim().toLowerCase());
  out.handled = true;
  out.status = status;

  if (messageId) out.rowsUpdated = await deps.updateStatus(messageId, status, REPLACEABLE[status]);
  if (status === "delivery_delayed") return out;

  // Bounce or complaint: stop all marketing to the account, once
  const key = status === "bounced" ? "bouncedAt" : "complainedAt";
  const at = typeof ev.created_at === "string" && !Number.isNaN(Date.parse(ev.created_at)) ? new Date(ev.created_at).toISOString() : now.toISOString();
  const users = messageId || addresses.length ? await deps.findUsers(messageId, addresses) : [];
  for (const u of users) {
    const prefs = u.emailPreferences && typeof u.emailPreferences === "object" ? (u.emailPreferences as Record<string, unknown>) : {};
    if (typeof prefs[key] === "string" && prefs.marketing === false) continue; // already recorded
    await deps.mergePrefs(u.id, { [key]: typeof prefs[key] === "string" ? prefs[key] : at, marketing: false });
    out.usersSuppressed++;
  }
  return out;
}
