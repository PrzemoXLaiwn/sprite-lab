import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Every side effect is mocked and counted: a gated cron must return before it
// touches the database, Stripe or the sender.
const touched: string[] = [];
const track = (name: string, value: unknown) =>
  vi.fn(async () => {
    touched.push(name);
    return value;
  });

const prisma = {
  user: { findMany: track("user.findMany", []), findUnique: track("user.findUnique", null) },
  generation: { count: track("generation.count", 0), groupBy: track("generation.groupBy", []), findFirst: track("generation.findFirst", null), findMany: track("generation.findMany", []) },
  emailLog: { findFirst: track("emailLog.findFirst", null) },
};
const sender = {
  sendReEngagementEmail: track("send", { success: true }),
  sendAbandonedCartEmail: track("send", { success: true }),
  sendSpecialOfferEmail: track("send", { success: true }),
  sendDailyReminderEmail: track("send", { success: true }),
  sendWeeklyDigestEmail: track("send", { success: true }),
};
const stripe = { checkout: { sessions: { list: track("stripe", { data: [] }), listLineItems: track("stripe", { data: [] }) } } };

vi.mock("@/lib/prisma", () => ({ prisma, default: prisma }));
vi.mock("@/lib/email/send", () => sender);
vi.mock("@/lib/stripe", () => ({ stripe, PLANS: { STARTER: {}, PRO: {}, UNLIMITED: {} }, CREDIT_PACKS: {} }));
vi.mock("@/app/api/_lib/email-prefs", () => ({ mergeEmailPreferences: track("mergeEmailPreferences", undefined) }));

const routes = {
  "cron/emails": (await import("./emails/route")).GET,
  "cron/daily-reminder": (await import("./daily-reminder/route")).GET,
  "email/special-offer": (await import("../email/special-offer/route")).GET,
  "email/abandoned-cart": (await import("../email/abandoned-cart/route")).GET,
};
const digest = (await import("./weekly-digest/route")).GET;

const req = (path: string) => new NextRequest(`https://www.sprite-lab.com/api/${path}`, { headers: { authorization: "Bearer test-cron" } });

describe("one switch for all marketing (MARKETING_EMAILS_ENABLED)", () => {
  beforeEach(() => {
    touched.length = 0;
    vi.stubEnv("CRON_SECRET", "test-cron");
    vi.stubEnv("RESEND_API_KEY", "re_test_not_real");
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each(Object.keys(routes))("%s does nothing while the switch is off", async (name) => {
    for (const v of ["", "false", "TRUE", "1"]) {
      vi.stubEnv("MARKETING_EMAILS_ENABLED", v);
      const res = await routes[name as keyof typeof routes](req(name));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, skipped: true, reason: "MARKETING_EMAILS_ENABLED is not true" });
    }
    expect(touched).toEqual([]);
  });

  it.each(Object.keys(routes))("%s runs (against the mocks) only when the switch is exactly 'true'", async (name) => {
    vi.stubEnv("MARKETING_EMAILS_ENABLED", "true");
    const body = await (await routes[name as keyof typeof routes](req(name))).json();
    expect(body.reason).not.toBe("MARKETING_EMAILS_ENABLED is not true");
    expect(touched.length).toBeGreaterThan(0);
  });
});

describe("weekly digest (WEEKLY_DIGEST_ENABLED, independent of the marketing switch)", () => {
  beforeEach(() => {
    touched.length = 0;
    vi.stubEnv("CRON_SECRET", "test-cron");
    vi.stubEnv("RESEND_API_KEY", "re_test_not_real");
    vi.stubEnv("MARKETING_EMAILS_ENABLED", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("still runs when the flag is unset, even with marketing off (current behaviour)", async () => {
    vi.stubEnv("WEEKLY_DIGEST_ENABLED", "");
    const body = await (await digest(req("cron/weekly-digest"))).json();
    expect(body).toMatchObject({ success: true });
    expect(body.skipped).toBeUndefined();
    expect(touched).toContain("user.findMany");
  });

  it("stops when set to false", async () => {
    for (const v of ["false", "FALSE", "0", "off"]) {
      vi.stubEnv("WEEKLY_DIGEST_ENABLED", v);
      expect(await (await digest(req("cron/weekly-digest"))).json()).toEqual({ success: true, skipped: true, reason: "WEEKLY_DIGEST_ENABLED is false" });
    }
    expect(touched).toEqual([]);
  });
});
