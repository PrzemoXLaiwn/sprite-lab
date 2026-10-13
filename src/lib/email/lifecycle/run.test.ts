import { beforeEach, describe, expect, it, vi } from "vitest";
import { runLifecycle, type LifecycleDeps } from "./run";
import { DAY, HOUR, type UserSnapshot } from "./rules";
import { SAMPLE_INSPIRATION } from "./samples";

// The route test mocks these modules; here the deps are injected directly.
const NOW = new Date("2026-10-13T11:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

function user(id: string, over: Partial<UserSnapshot> = {}): UserSnapshot {
  const sprite = { id: `s-${id}`, kind: "sprite" as const, imageUrl: "https://cdn.x/s.png", prompt: "knight", categoryId: "CHARACTERS", styleId: "PIXEL", createdAt: ago(30 * HOUR) };
  return {
    id, email: `${id}@x.co`, name: null, credits: 10, createdAt: ago(2 * DAY), lastActiveAt: ago(30 * HOUR),
    prefs: { sentAt: {} }, marketingSends: [], suppressed: false,
    latestItem: sprite, latestSprite: sprite, hasAnimation: false, lastCreatedAt: ago(30 * HOUR), ...over,
  };
}

function deps(users: UserSnapshot[]) {
  return {
    loadAudience: vi.fn(async () => ({ users, gated: { opted_out: 4 }, scanned: users.length + 4, inspiration: SAMPLE_INSPIRATION })),
    unsubscribeUrl: vi.fn<LifecycleDeps["unsubscribeUrl"]>((id) => `https://www.sprite-lab.com/api/email/unsubscribe?u=${id}&t=x`),
    claimDay: vi.fn<LifecycleDeps["claimDay"]>(async () => true),
    send: vi.fn<LifecycleDeps["send"]>(async () => ({ success: true, messageId: "m" })),
    markSent: vi.fn<LifecycleDeps["markSent"]>(async () => {}),
    sleep: vi.fn<LifecycleDeps["sleep"]>(async () => {}),
  } satisfies LifecycleDeps;
}

describe("runLifecycle", () => {
  let d: ReturnType<typeof deps>;
  const winback = user("w", { createdAt: ago(200 * DAY), lastActiveAt: ago(90 * DAY), lastCreatedAt: null, latestItem: null, latestSprite: null });
  beforeEach(() => {
    d = deps([user("a"), user("b", { prefs: { marketing: false, sentAt: {} } }), winback]);
  });

  it("dry run counts and never claims, sends or writes", async () => {
    const r = await runLifecycle({ dryRun: true, now: NOW, dryRunReason: "test" }, d);
    expect(d.send).not.toHaveBeenCalled();
    expect(d.claimDay).not.toHaveBeenCalled();
    expect(d.markSent).not.toHaveBeenCalled();
    expect(d.unsubscribeUrl).not.toHaveBeenCalled();
    expect(r).toMatchObject({ dryRun: true, dryRunReason: "test", day: "2026-10-13", scanned: 7, sent: 0 });
    expect(r.planned).toMatchObject({ bring_to_life: 1, winback: 1 });
    expect(r.skipped).toMatchObject({ opted_out: 5 });
    expect(r.sample.map((s) => s.sequence)).toEqual(["bring_to_life", "winback"]);
    expect(JSON.stringify(r)).not.toContain("@x.co");
  });

  it("live run claims, sends with unsubscribe + text, and stores the markers", async () => {
    const r = await runLifecycle({ dryRun: false, now: NOW }, d);
    expect(r.sent).toBe(2);
    expect(d.claimDay).toHaveBeenCalledWith("a", "2026-10-13");
    const first = d.send.mock.calls[0]![0];
    expect(first).toMatchObject({ to: "a@x.co", userId: "a", sequence: "bring_to_life" });
    expect(first.html).toContain("unsubscribe?u=a");
    expect(first.text).toContain("unsubscribe?u=a");
    expect(d.markSent).toHaveBeenCalledWith("a", expect.objectContaining({ lifecycleBringToLifeAt: NOW.toISOString(), lastMarketingEmailAt: NOW.toISOString() }));
  });

  it("skips users whose day was already claimed (idempotent per day)", async () => {
    d.claimDay.mockImplementation(async (id) => id !== "a");
    const r = await runLifecycle({ dryRun: false, now: NOW }, d);
    expect(r.alreadyClaimed).toBe(1);
    expect(d.send).toHaveBeenCalledTimes(1);
    expect(d.send.mock.calls[0]![0].userId).toBe("w");
  });

  it("respects the daily cap, strongest sequence first", async () => {
    const r = await runLifecycle({ dryRun: false, now: NOW, dailyCap: 1 }, d);
    expect(r.deferred).toBe(1);
    expect(d.send).toHaveBeenCalledTimes(1);
    expect(d.send.mock.calls[0]![0].sequence).toBe("bring_to_life");
  });

  it("does not mark a failed send as sent and stops on a quota error", async () => {
    d.send.mockResolvedValue({ success: false, error: "daily quota exceeded" });
    const r = await runLifecycle({ dryRun: false, now: NOW }, d);
    expect(r.failed).toBe(1);
    expect(d.send).toHaveBeenCalledTimes(1);
    expect(d.markSent).not.toHaveBeenCalled();
  });
});
