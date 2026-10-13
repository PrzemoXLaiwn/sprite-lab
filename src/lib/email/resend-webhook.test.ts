import { describe, expect, it, vi } from "vitest";
import { handleResendEvent, signPayload, verifyWebhookSignature, type WebhookDeps } from "./resend-webhook";

// Random-looking test key, not a real secret
const SECRET = `whsec_${Buffer.from("test-key-0123456789abcdef").toString("base64")}`;
const NOW = new Date("2026-10-13T11:00:00Z");
const ts = (d: Date) => String(Math.floor(d.getTime() / 1000));
const body = JSON.stringify({ type: "email.bounced", data: { email_id: "msg_1", to: ["A@x.co"] } });

function signed(over: Partial<{ id: string; timestamp: string; body: string; secret: string }> = {}) {
  const id = over.id ?? "msg_evt_1";
  const timestamp = over.timestamp ?? ts(NOW);
  const b = over.body ?? body;
  return { id, timestamp, body: b, signature: `v1,${signPayload(over.secret ?? SECRET, id, timestamp, b)}` };
}

describe("verifyWebhookSignature", () => {
  it("accepts a valid Svix signature (also among several during secret rotation)", () => {
    expect(verifyWebhookSignature(SECRET, signed(), NOW)).toEqual({ ok: true });
    const s = signed();
    expect(verifyWebhookSignature(SECRET, { ...s, signature: `v1,AAAA ${s.signature}` }, NOW)).toEqual({ ok: true });
  });

  it("rejects a wrong signature, a tampered body and a different secret", () => {
    const s = signed();
    expect(verifyWebhookSignature(SECRET, { ...s, signature: "v1,bm90LXRoZS1zaWduYXR1cmU=" }, NOW)).toEqual({ ok: false, reason: "bad_signature" });
    expect(verifyWebhookSignature(SECRET, { ...s, body: s.body.replace("bounced", "complained") }, NOW)).toEqual({ ok: false, reason: "bad_signature" });
    const other = signed({ secret: `whsec_${Buffer.from("another-key").toString("base64")}` });
    expect(verifyWebhookSignature(SECRET, other, NOW)).toEqual({ ok: false, reason: "bad_signature" });
    expect(verifyWebhookSignature(SECRET, { ...s, signature: s.signature.replace("v1,", "v2,") }, NOW)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects an old or future timestamp, even with a valid signature (replay)", () => {
    const old = signed({ timestamp: ts(new Date(NOW.getTime() - 6 * 60_000)) });
    expect(verifyWebhookSignature(SECRET, old, NOW)).toEqual({ ok: false, reason: "stale_timestamp" });
    const future = signed({ timestamp: ts(new Date(NOW.getTime() + 6 * 60_000)) });
    expect(verifyWebhookSignature(SECRET, future, NOW)).toEqual({ ok: false, reason: "stale_timestamp" });
    expect(verifyWebhookSignature(SECRET, { ...signed(), timestamp: "abc" }, NOW)).toEqual({ ok: false, reason: "bad_timestamp" });
  });

  it("fails closed without a secret or headers", () => {
    expect(verifyWebhookSignature(undefined, signed(), NOW)).toEqual({ ok: false, reason: "missing_secret" });
    expect(verifyWebhookSignature("  ", signed(), NOW)).toEqual({ ok: false, reason: "missing_secret" });
    expect(verifyWebhookSignature(SECRET, { ...signed(), signature: null }, NOW)).toEqual({ ok: false, reason: "missing_headers" });
  });
});

// In-memory email_logs + users, behaving like the real deps
function store() {
  const logs = [
    { messageId: "msg_1", userId: "u1", status: "sent" },
    { messageId: "msg_2", userId: "u2", status: "sent" },
  ];
  const prefs: Record<string, Record<string, unknown>> = { u1: { gift: { claimedAt: null } }, u2: {} };
  const deps: WebhookDeps = {
    updateStatus: vi.fn(async (id, to, from) => {
      let n = 0;
      for (const l of logs) if (l.messageId === id && from.includes(l.status)) { l.status = to; n++; }
      return n;
    }),
    findUsers: vi.fn(async (id) => logs.filter((l) => l.messageId === id).map((l) => ({ id: l.userId, emailPreferences: { ...prefs[l.userId] } }))),
    mergePrefs: vi.fn(async (userId, patch) => {
      prefs[userId] = { ...prefs[userId], ...patch };
    }),
  };
  return { logs, prefs, deps };
}

const event = (type: string, emailId = "msg_1", created_at = "2026-10-13T10:59:00.000Z") => ({ type, created_at, data: { email_id: emailId, to: ["a@x.co"] } });

describe("handleResendEvent", () => {
  it("bounce: marks the log, sets bouncedAt + marketing:false and keeps other prefs", async () => {
    const s = store();
    const out = await handleResendEvent(event("email.bounced"), s.deps, NOW);
    expect(out).toMatchObject({ handled: true, status: "bounced", rowsUpdated: 1, usersSuppressed: 1 });
    expect(s.logs[0].status).toBe("bounced");
    expect(s.prefs.u1).toEqual({ gift: { claimedAt: null }, bouncedAt: "2026-10-13T10:59:00.000Z", marketing: false });
  });

  it("is idempotent: the same event twice changes nothing the second time", async () => {
    const s = store();
    await handleResendEvent(event("email.complained"), s.deps, NOW);
    const second = await handleResendEvent(event("email.complained"), s.deps, NOW);
    expect(second).toMatchObject({ rowsUpdated: 0, usersSuppressed: 0 });
    expect(s.logs[0].status).toBe("complained");
    expect(s.deps.mergePrefs).toHaveBeenCalledTimes(1);
    expect(s.prefs.u1.complainedAt).toBe("2026-10-13T10:59:00.000Z");
  });

  it("never downgrades a status (late delivery_delayed after a bounce)", async () => {
    const s = store();
    await handleResendEvent(event("email.bounced"), s.deps, NOW);
    const late = await handleResendEvent(event("email.delivery_delayed"), s.deps, NOW);
    expect(late.rowsUpdated).toBe(0);
    expect(s.logs[0].status).toBe("bounced");
    // A complaint still outranks the bounce
    await handleResendEvent(event("email.complained"), s.deps, NOW);
    expect(s.logs[0].status).toBe("complained");
  });

  it("delivery_delayed only updates the log, never the user", async () => {
    const s = store();
    const out = await handleResendEvent(event("email.delivery_delayed", "msg_2"), s.deps, NOW);
    expect(out).toMatchObject({ status: "delivery_delayed", rowsUpdated: 1, usersSuppressed: 0 });
    expect(s.deps.findUsers).not.toHaveBeenCalled();
    expect(s.prefs.u2).toEqual({});
  });

  it("ignores other event types", async () => {
    const s = store();
    expect(await handleResendEvent(event("email.delivered"), s.deps, NOW)).toMatchObject({ handled: false });
    expect(await handleResendEvent(null, s.deps, NOW)).toMatchObject({ handled: false });
    expect(s.deps.updateStatus).not.toHaveBeenCalled();
  });
});
