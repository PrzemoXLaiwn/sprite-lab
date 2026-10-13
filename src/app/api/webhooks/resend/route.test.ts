import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signPayload } from "@/lib/email/resend-webhook";

// The database is fully mocked: the test proves the route writes only after a
// valid signature, and never with a missing secret.
const updateMany = vi.fn(async () => ({ count: 1 }));
const findManyLogs = vi.fn(async () => [{ userId: "u1" }]);
const findManyUsers = vi.fn(async () => [{ id: "u1", emailPreferences: {} }]);
const mergeEmailPreferences = vi.fn(async () => {});

vi.mock("@/lib/prisma", () => ({
  prisma: { emailLog: { updateMany, findMany: findManyLogs }, user: { findMany: findManyUsers } },
}));
vi.mock("@/app/api/_lib/email-prefs", () => ({ mergeEmailPreferences }));

const { POST } = await import("./route");

const SECRET = `whsec_${Buffer.from("route-test-key-not-real").toString("base64")}`;
const body = JSON.stringify({ type: "email.bounced", created_at: new Date().toISOString(), data: { email_id: "msg_1", to: ["a@x.co"] } });

function req(opts: { secret?: string; timestamp?: number; signature?: string; payload?: string } = {}) {
  const payload = opts.payload ?? body;
  const timestamp = String(opts.timestamp ?? Math.floor(Date.now() / 1000));
  const signature = opts.signature ?? `v1,${signPayload(opts.secret ?? SECRET, "evt_1", timestamp, payload)}`;
  return new Request("https://www.sprite-lab.com/api/webhooks/resend", {
    method: "POST",
    headers: { "svix-id": "evt_1", "svix-timestamp": timestamp, "svix-signature": signature, "content-type": "application/json" },
    body: payload,
  });
}

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", SECRET);
    for (const m of [updateMany, findManyLogs, findManyUsers, mergeEmailPreferences]) m.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("valid signature: updates the log status and suppresses the user", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, status: "bounced", rowsUpdated: 1, usersSuppressed: 1 });
    expect(updateMany).toHaveBeenCalledWith({ where: { messageId: "msg_1", status: { in: ["sent", "delivery_delayed", "opened", "clicked"] } }, data: { status: "bounced" } });
    expect(mergeEmailPreferences).toHaveBeenCalledWith("u1", expect.objectContaining({ marketing: false, bouncedAt: expect.any(String) }));
  });

  it("invalid signature: 401 and no writes", async () => {
    const res = await POST(req({ secret: `whsec_${Buffer.from("wrong").toString("base64")}` }));
    expect(res.status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
    expect(mergeEmailPreferences).not.toHaveBeenCalled();
  });

  it("old timestamp (replay): 401 and no writes", async () => {
    const res = await POST(req({ timestamp: Math.floor(Date.now() / 1000) - 3600 }));
    expect(res.status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("missing secret: fails closed with 503", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
