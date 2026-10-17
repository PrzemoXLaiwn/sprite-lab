import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildLifecycleMessage, renderLifecycleHtml } from "./content";
import { DAY, HOUR, selectLifecycleEmail, type UserSnapshot } from "./rules";
import { SHOWCASE_POOL, showcaseInspiration } from "./showcase";

const NOW = new Date("2026-10-13T11:00:00Z");

describe("inspiration fallback (curated /showcase examples)", () => {
  it("gives 6 absolute https images from www.sprite-lab.com that exist in public/showcase", () => {
    const pick = showcaseInspiration(NOW);
    expect(pick.source).toBe("showcase");
    expect(pick.items).toHaveLength(6);
    for (const it of pick.items) {
      expect(it.imageUrl).toMatch(/^https:\/\/www\.sprite-lab\.com\/showcase\/[\w-]+\.png$/);
      expect(existsSync(join(process.cwd(), "public", it.imageUrl.replace("https://www.sprite-lab.com/", "")))).toBe(true);
    }
    expect(SHOWCASE_POOL.length % 6).toBe(0);
  });

  it("alternates between sets week by week", () => {
    const a = showcaseInspiration(NOW).items.map((i) => i.id);
    const b = showcaseInspiration(new Date(NOW.getTime() + 7 * DAY)).items.map((i) => i.id);
    expect(a).not.toEqual(b);
    expect(a.some((id) => b.includes(id))).toBe(false);
  });

  it("is labelled as examples, never as community work", async () => {
    const msg = buildLifecycleMessage({
      sequence: "inspiration",
      user: { name: "Sam", credits: 3, latestSprite: null },
      item: null,
      inspiration: showcaseInspiration(NOW),
      unsubscribeUrl: "https://www.sprite-lab.com/api/email/unsubscribe?u=x&t=y",
    });
    expect(msg.subject).toBe("6 example sprites made with SpriteLab");
    expect(msg.subject.length).toBeLessThanOrEqual(50);
    expect(`${msg.subject} ${msg.preview} ${msg.text}`).not.toMatch(/other people|shared to|from the community/i);
    const html = await renderLifecycleHtml(msg);
    expect(html).toContain("Examples");
    expect(html).not.toContain("From the community");
    expect(html).not.toContain("other people shared");
    expect(html).toContain("https://www.sprite-lab.com/showcase/");
  });

  it("lets the inspiration sequence run when there are no public works", () => {
    const user: UserSnapshot = {
      id: "u", email: "u@x.co", name: null, credits: 0, createdAt: new Date(NOW.getTime() - 90 * DAY), lastActiveAt: new Date(NOW.getTime() - 3 * HOUR),
      prefs: { sentAt: {} }, marketingSends: [], suppressed: false, latestItem: null, latestSprite: null, hasAnimation: false, lastCreatedAt: null,
    };
    expect(selectLifecycleEmail(user, { now: NOW, inspirationItems: 0 })).toEqual({ send: false, reason: "no_match" });
    const items = showcaseInspiration(NOW).items.length;
    expect(selectLifecycleEmail(user, { now: NOW, inspirationItems: items })).toMatchObject({ send: true, sequence: "inspiration" });
  });
});
