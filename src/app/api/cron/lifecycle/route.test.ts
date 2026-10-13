import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Every side effect of the real wiring is mocked: the test proves the route
// never reaches the sender unless the master switch is on and it isn't a dry run.
const sendLifecycleEmail = vi.fn(async () => ({ success: true }));
const claimLifecycleDay = vi.fn(async () => true);
const mergeEmailPreferences = vi.fn(async () => {});
const loadSendStats = vi.fn(async () => ({ sentToday: 0, firstLiveSendAt: null as Date | null }));

vi.mock("@/lib/email/lifecycle/send", () => ({ sendLifecycleEmail }));
vi.mock("@/app/api/_lib/email-prefs", () => ({ claimLifecycleDay, mergeEmailPreferences }));
vi.mock("@/lib/email/lifecycle/data", async () => {
  const { SAMPLE_INSPIRATION } = await import("@/lib/email/lifecycle/samples");
  const now = Date.now();
  const sprite = { id: "s1", kind: "sprite", imageUrl: "https://cdn.x/s.png", prompt: "knight", categoryId: "CHARACTERS", styleId: "PIXEL", createdAt: new Date(now - 30 * 3600e3) };
  return {
    loadSendStats,
    loadLifecycleAudience: vi.fn(async () => ({
      scanned: 1,
      gated: {},
      inspiration: SAMPLE_INSPIRATION,
      users: [{
        id: "u1", email: "u1@x.co", name: null, credits: 10, createdAt: new Date(now - 2 * 86400e3), lastActiveAt: new Date(now - 30 * 3600e3),
        prefs: { sentAt: {} }, marketingSends: [], suppressed: false, latestItem: sprite, latestSprite: sprite, hasAnimation: false, lastCreatedAt: sprite.createdAt,
      }],
    })),
  };
});

const { GET } = await import("./route");

const req = (qs = "") =>
  new NextRequest(`https://www.sprite-lab.com/api/cron/lifecycle${qs}`, { headers: { authorization: "Bearer test-cron" } });

describe("GET /api/cron/lifecycle", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron");
    vi.stubEnv("EMAIL_LINK_SECRET", "test-link-secret");
    vi.stubEnv("RESEND_API_KEY", "re_test_not_real");
    vi.stubEnv("MARKETING_EMAILS_ENABLED", "");
    sendLifecycleEmail.mockClear();
    claimLifecycleDay.mockClear();
    mergeEmailPreferences.mockClear();
    loadSendStats.mockReset();
    loadSendStats.mockResolvedValue({ sentToday: 0, firstLiveSendAt: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("rejects requests without the cron secret", async () => {
    const res = await GET(new NextRequest("https://www.sprite-lab.com/api/cron/lifecycle"));
    expect(res.status).toBe(401);
  });

  it("is a dry run while the flag is off — zero sends, zero writes", async () => {
    for (const v of ["", "false", "TRUE", "1", "yes"]) {
      vi.stubEnv("MARKETING_EMAILS_ENABLED", v);
      const body = await (await GET(req())).json();
      expect(body).toMatchObject({ success: true, dryRun: true, dryRunReason: "MARKETING_EMAILS_ENABLED is not true" });
      expect(body.planned.bring_to_life).toBe(1);
    }
    expect(sendLifecycleEmail).toHaveBeenCalledTimes(0);
    expect(claimLifecycleDay).toHaveBeenCalledTimes(0);
    expect(mergeEmailPreferences).toHaveBeenCalledTimes(0);
  });

  it("?dryRun=1 sends nothing even with the flag on", async () => {
    vi.stubEnv("MARKETING_EMAILS_ENABLED", "true");
    const body = await (await GET(req("?dryRun=1"))).json();
    expect(body).toMatchObject({ dryRun: true, dryRunReason: "dryRun=1", sent: 0 });
    expect(sendLifecycleEmail).toHaveBeenCalledTimes(0);
    expect(claimLifecycleDay).toHaveBeenCalledTimes(0);
  });

  it("without a Resend key it stays a dry run", async () => {
    vi.stubEnv("MARKETING_EMAILS_ENABLED", "true");
    vi.stubEnv("RESEND_API_KEY", "");
    const body = await (await GET(req())).json();
    expect(body).toMatchObject({ dryRun: true, dryRunReason: "RESEND_API_KEY not configured" });
    expect(sendLifecycleEmail).toHaveBeenCalledTimes(0);
  });

  it("only with the flag exactly 'true' does it reach the (mocked) sender", async () => {
    vi.stubEnv("MARKETING_EMAILS_ENABLED", "true");
    const body = await (await GET(req())).json();
    expect(body).toMatchObject({ dryRun: false, sent: 1 });
    expect(sendLifecycleEmail).toHaveBeenCalledTimes(1);
    expect(claimLifecycleDay).toHaveBeenCalledTimes(1);
  });

  it("never pushes the day over RESEND_DAILY_LIMIT (all senders count)", async () => {
    vi.stubEnv("MARKETING_EMAILS_ENABLED", "true");
    vi.stubEnv("RESEND_DAILY_LIMIT", "100");
    loadSendStats.mockResolvedValue({ sentToday: 100, firstLiveSendAt: null });
    const body = await (await GET(req())).json();
    expect(body).toMatchObject({ dryRun: false, dailyCap: 0, deferred: 1, sent: 0 });
    expect(body.limits).toMatchObject({ providerLimit: 100, sentToday: 100, providerRemaining: 0, limitedBy: "provider" });
    expect(sendLifecycleEmail).toHaveBeenCalledTimes(0);
  });

  it("defaults to a cap of 20 before the first live send", async () => {
    vi.stubEnv("LIFECYCLE_DAILY_CAP", "");
    const body = await (await GET(req())).json();
    expect(body.limits).toMatchObject({ baseCap: 20, warmupDay: 0, warmupCap: 20, providerLimit: 100 });
  });
});
