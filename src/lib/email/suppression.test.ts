import { beforeEach, describe, expect, it, vi } from "vitest";

// Database mocked: the guard reads users.email_preferences and email_logs only
const userFindFirst = vi.fn(async (): Promise<{ emailPreferences: unknown } | null> => null);
const logFindFirst = vi.fn(async (): Promise<{ status: string } | null> => null);
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findFirst: userFindFirst }, emailLog: { findFirst: logFindFirst } } }));

const { marketingBlockedByPrefs, marketingSuppressionReason } = await import("./suppression");
const { gate, parseLifecyclePrefs } = await import("./lifecycle/rules");

describe("marketingBlockedByPrefs", () => {
  it("blocks bounced, complained and opted-out users, allows the rest", () => {
    expect(marketingBlockedByPrefs({ complainedAt: "2026-10-01T00:00:00Z", marketing: false })).toBe("complained");
    expect(marketingBlockedByPrefs({ bouncedAt: "2026-10-01T00:00:00Z" })).toBe("bounced");
    // Re-enabling marketing in settings doesn't undo a bounce
    expect(marketingBlockedByPrefs({ bouncedAt: "2026-10-01T00:00:00Z", marketing: true })).toBe("bounced");
    expect(marketingBlockedByPrefs({ marketing: false })).toBe("opted_out");
    expect(marketingBlockedByPrefs({ unsubscribedAt: "2026-10-01T00:00:00Z" })).toBe("opted_out");
    expect(marketingBlockedByPrefs({ marketing: true, weeklyDigest: true })).toBeNull();
    expect(marketingBlockedByPrefs(null)).toBeNull();
    expect(marketingBlockedByPrefs([])).toBeNull();
  });
});

describe("marketingSuppressionReason (last-line guard before every marketing send)", () => {
  beforeEach(() => {
    userFindFirst.mockReset().mockResolvedValue(null);
    logFindFirst.mockReset().mockResolvedValue(null);
  });

  it("blocks a user the webhook marked as bounced", async () => {
    userFindFirst.mockResolvedValue({ emailPreferences: { bouncedAt: "2026-10-12T00:00:00Z", marketing: false } });
    expect(await marketingSuppressionReason("a@x.co", "u1")).toBe("suppressed: bounced");
  });

  it("blocks an address with a complaint in email_logs even without an account", async () => {
    logFindFirst.mockResolvedValue({ status: "complained" });
    expect(await marketingSuppressionReason("Guest@X.co")).toBe("suppressed: complained");
    expect(logFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ email: { in: ["Guest@X.co", "guest@x.co"] } }) }));
  });

  it("lets a normal user through", async () => {
    userFindFirst.mockResolvedValue({ emailPreferences: { marketing: true } });
    expect(await marketingSuppressionReason("a@x.co", "u1")).toBeNull();
  });
});

describe("lifecycle gate", () => {
  const base = { email: "a@x.co", suppressed: false, createdAt: new Date("2026-01-01T00:00:00Z"), marketingSends: [] };
  const now = new Date("2026-10-13T11:00:00Z");
  it("skips complained and bounced users as 'suppressed'", () => {
    expect(gate({ ...base, prefs: parseLifecyclePrefs({ complainedAt: "2026-10-01T00:00:00Z", marketing: false }) }, now)).toBe("suppressed");
    expect(gate({ ...base, prefs: parseLifecyclePrefs({ bouncedAt: "2026-10-01T00:00:00Z", marketing: false }) }, now)).toBe("suppressed");
    expect(gate({ ...base, prefs: parseLifecyclePrefs({}) }, now)).toBeNull();
  });
});
