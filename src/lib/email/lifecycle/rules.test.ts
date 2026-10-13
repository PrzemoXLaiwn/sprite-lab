import { describe, expect, it } from "vitest";
import {
  DAY,
  HOUR,
  parseLifecyclePrefs,
  selectLifecycleEmail,
  sentPatch,
  type UserSnapshot,
  type WorkItem,
} from "./rules";

const NOW = new Date("2026-10-13T11:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

const sprite = (over: Partial<WorkItem> = {}): WorkItem => ({
  id: "spr1",
  kind: "sprite",
  imageUrl: "https://cdn.example.com/s.png",
  prompt: "armored knight",
  categoryId: "CHARACTERS",
  styleId: "PIXEL_ART_16",
  createdAt: ago(30 * HOUR),
  ...over,
});

function user(over: Partial<UserSnapshot> = {}): UserSnapshot {
  return {
    id: "u1",
    email: "a@b.co",
    name: "Alex",
    credits: 10,
    createdAt: ago(2 * DAY),
    lastActiveAt: ago(30 * HOUR),
    prefs: { sentAt: {} },
    marketingSends: [],
    suppressed: false,
    latestItem: sprite(),
    latestSprite: sprite(),
    hasAnimation: false,
    lastCreatedAt: ago(30 * HOUR),
    ...over,
  };
}

const ctx = { now: NOW, inspirationItems: 6 };
const pick = (u: UserSnapshot, c = ctx) => {
  const d = selectLifecycleEmail(u, c);
  return d.send ? d.sequence : `skip:${d.reason}`;
};

describe("hard rules", () => {
  it("never emails marketing === false, unsubscribed, bounced or invalid addresses", () => {
    expect(pick(user({ prefs: { marketing: false, sentAt: {} } }))).toBe("skip:opted_out");
    expect(pick(user({ prefs: { unsubscribedAt: "2026-10-01T00:00:00Z", sentAt: {} } }))).toBe("skip:opted_out");
    expect(pick(user({ suppressed: true }))).toBe("skip:suppressed");
    expect(pick(user({ prefs: { bouncedAt: "2026-10-01T00:00:00Z", sentAt: {} } }))).toBe("skip:suppressed");
    expect(pick(user({ email: "not-an-email" }))).toBe("skip:invalid_email");
  });

  it("keeps the first 24 h after signup quiet", () => {
    expect(pick(user({ createdAt: ago(23 * HOUR) }))).toBe("skip:quiet_period");
    expect(pick(user({ createdAt: ago(25 * HOUR) }))).toBe("bring_to_life");
  });

  it("sends at most one marketing email per day, whatever type it was", () => {
    // Weekly digest went out this morning
    expect(pick(user({ marketingSends: [ago(2 * HOUR)] }))).toBe("skip:already_today");
    // Yesterday 23:50 → still within the 20 h minimum gap
    expect(pick(user({ marketingSends: [new Date("2026-10-12T23:50:00Z")] }))).toBe("skip:already_today");
    // Marker in prefs counts too
    expect(pick(user({ prefs: { lastMarketingEmailAt: ago(3 * HOUR).toISOString(), sentAt: {} } }))).toBe("skip:already_today");
    // 30 h ago is fine
    expect(pick(user({ marketingSends: [ago(30 * HOUR)] }))).toBe("bring_to_life");
  });

  it("is idempotent within a day: a claimed day is never picked again", () => {
    const u = user();
    const d = selectLifecycleEmail(u, ctx);
    expect(d.send).toBe(true);
    const claimed = user({ prefs: { ...u.prefs, lifecycleDay: "2026-10-13" } });
    expect(pick(claimed)).toBe("skip:already_today");
    expect(pick(claimed, { ...ctx, now: new Date("2026-10-13T23:59:00Z") })).toBe("skip:already_today");
  });

  it("caps at 3 marketing emails per rolling 7 days", () => {
    const three = [ago(2 * DAY), ago(4 * DAY), ago(6 * DAY)];
    expect(pick(user({ marketingSends: three }))).toBe("skip:weekly_cap");
    // The oldest falls out of the window → allowed again
    expect(pick(user({ marketingSends: [ago(2 * DAY), ago(4 * DAY), ago(7 * DAY + HOUR)] }))).toBe("bring_to_life");
  });
});

describe("priority", () => {
  it("bring_to_life beats unfinished when both fit", () => {
    const old = sprite({ createdAt: ago(3 * DAY) });
    const u = user({ createdAt: ago(4 * DAY), latestItem: old, latestSprite: old, lastActiveAt: ago(3 * DAY), lastCreatedAt: ago(3 * DAY) });
    expect(pick(u)).toBe("bring_to_life");
    // After it was sent for that sprite, the same sprite is not featured again as "unfinished"
    const after = user({ ...u, marketingSends: [ago(2 * DAY)], prefs: { sentAt: { bring_to_life: ago(2 * DAY).toISOString() }, lifecycleLastItemId: old.id } });
    expect(pick(after)).toBe("skip:no_match");
  });

  it("bring_to_life needs a sprite with an image, no animation yet, and is sent once", () => {
    expect(pick(user({ latestSprite: null, latestItem: null, lastCreatedAt: null }))).not.toBe("bring_to_life");
    expect(pick(user({ hasAnimation: true }))).not.toBe("bring_to_life");
    expect(pick(user({ prefs: { sentAt: { bring_to_life: ago(3 * DAY).toISOString() } } }))).not.toBe("bring_to_life");
    expect(pick(user({ createdAt: ago(8 * DAY) }))).not.toBe("bring_to_life");
  });

  it("unfinished: made something in the last 7 days, nothing for 2+ days", () => {
    const anim: WorkItem = { ...sprite({ id: "an1", kind: "animation", createdAt: ago(3 * DAY) }), motionLabel: "walk" };
    const base = { createdAt: ago(30 * DAY), hasAnimation: true, latestItem: anim, lastActiveAt: ago(3 * DAY), lastCreatedAt: ago(3 * DAY) };
    expect(pick(user(base))).toBe("unfinished");
    // Active yesterday → too soon
    expect(pick(user({ ...base, lastActiveAt: ago(1 * DAY) }))).not.toBe("unfinished");
    // Older than 7 days → not "unfinished" any more
    const stale = { ...anim, createdAt: ago(8 * DAY) };
    expect(pick(user({ ...base, latestItem: stale, lastActiveAt: ago(8 * DAY), lastCreatedAt: ago(8 * DAY) }))).toBe("unused_credits");
    // Already sent for this item
    expect(pick(user({ ...base, prefs: { sentAt: {}, lifecycleLastItemId: "an1" } }))).not.toBe("unfinished");
  });

  it("unused_credits: away 5–20 days with credits, once per absence", () => {
    const base = { createdAt: ago(60 * DAY), hasAnimation: true, lastActiveAt: ago(10 * DAY), lastCreatedAt: ago(12 * DAY), latestItem: sprite({ createdAt: ago(12 * DAY) }) };
    expect(pick(user(base))).toBe("unused_credits");
    expect(pick(user({ ...base, credits: 0 }))).toBe("inspiration");
    // Sent during this absence → not again
    expect(pick(user({ ...base, prefs: { sentAt: { unused_credits: ago(3 * DAY).toISOString() } } }))).toBe("inspiration");
    // Sent during an earlier absence → fine again
    expect(pick(user({ ...base, prefs: { sentAt: { unused_credits: ago(40 * DAY).toISOString() } } }))).toBe("unused_credits");
  });

  it("winback: away 21+ days, once per absence", () => {
    const base = { createdAt: ago(200 * DAY), lastActiveAt: ago(90 * DAY), lastCreatedAt: ago(95 * DAY), latestItem: sprite({ createdAt: ago(95 * DAY) }) };
    expect(pick(user(base))).toBe("winback");
    expect(pick(user({ ...base, prefs: { sentAt: { winback: ago(30 * DAY).toISOString() } } }))).toBe("skip:no_match");
    // No sprite at all still gets the light version
    expect(pick(user({ ...base, latestItem: null, latestSprite: null, lastCreatedAt: null }))).toBe("winback");
  });

  it("inspiration only when nothing else went out that week and there are enough picks", () => {
    const base = { createdAt: ago(60 * DAY), hasAnimation: true, credits: 0, lastActiveAt: ago(6 * DAY), lastCreatedAt: ago(9 * DAY), latestItem: sprite({ createdAt: ago(9 * DAY) }) };
    expect(pick(user(base))).toBe("inspiration");
    expect(pick(user({ ...base, marketingSends: [ago(3 * DAY)] }))).toBe("skip:no_match");
    expect(pick(user(base), { ...ctx, inspirationItems: 2 })).toBe("skip:no_match");
    expect(pick(user({ ...base, prefs: { sentAt: { inspiration: ago(5 * DAY).toISOString() } } }))).toBe("skip:no_match");
  });
});

describe("prefs", () => {
  it("parses only well-formed keys and builds a flat merge patch", () => {
    const p = parseLifecyclePrefs({ marketing: true, lifecycleWinbackAt: "2026-09-01T00:00:00Z", lifecycleUnfinishedAt: "garbage", gifts: [{ id: 1 }] });
    expect(p.sentAt).toEqual({ winback: "2026-09-01T00:00:00Z" });
    expect(parseLifecyclePrefs(null).sentAt).toEqual({});
    const patch = sentPatch("unfinished", sprite(), NOW);
    expect(patch).toEqual({ lastMarketingEmailAt: NOW.toISOString(), lifecycleUnfinishedAt: NOW.toISOString(), lifecycleLastItemId: "spr1" });
  });
});
