import { describe, expect, it } from "vitest";
import { buildLifecycleMessage, cleanPrompt, creditIdeas, renderLifecycleHtml, shortName } from "./content";
import { SAMPLE_UNSUBSCRIBE_URL, sampleLifecycleMessages } from "./samples";
import { SEQUENCE_PRIORITY } from "./rules";
import { pickInspiration, summarizeWork, emailSafeImage, type CommunityRow, type GenerationRow } from "./snapshot";

describe("templates", () => {
  const samples = sampleLifecycleMessages();

  it.each(SEQUENCE_PRIORITY)("%s renders to HTML with the unsubscribe link and no undefined", async (seq) => {
    const msg = samples[seq];
    const html = await renderLifecycleHtml(msg);
    expect(html).toContain(SAMPLE_UNSUBSCRIBE_URL.replace(/&/g, "&amp;"));
    expect(html).toContain("Email settings");
    expect(html).not.toMatch(/undefined|null|NaN|\[object Object\]/);
    expect(html).toContain(msg.ctaUrl.replace(/&/g, "&amp;"));
    expect(html).toContain("utm_campaign=lifecycle");
    expect(html).toContain("#131A31");
    expect(html).not.toMatch(/press start|pixelify|silkscreen|VT323/i);

    expect(msg.text).toContain(SAMPLE_UNSUBSCRIBE_URL);
    expect(msg.text).toContain(msg.ctaUrl);
    expect(msg.text).not.toMatch(/undefined|null|NaN/);

    // Short, no emoji, no shouting
    expect(msg.subject.length).toBeLessThanOrEqual(50);
    expect(msg.subject).not.toMatch(/\p{Extended_Pictographic}|!/u);
    expect(msg.preview.length).toBeGreaterThan(20);
  });

  it("links straight back to where they left off", () => {
    expect(samples.bring_to_life.ctaUrl).toMatch(/^https:\/\/www\.sprite-lab\.com\/animate\?id=cmsamplesprite01&utm_/);
    expect(samples.unfinished.ctaUrl).toMatch(/\/animate\?id=cmsamplesprite01&result=cmsampleanim01&utm_/);
    expect(samples.inspiration.ctaUrl).toMatch(/\/generate\?prompt=fox%20mage/);
  });

  it("uses the user's own sprite as the hero image", async () => {
    const html = await renderLifecycleHtml(samples.bring_to_life);
    expect(html).toContain("https://www.sprite-lab.com/showcase/armored-knight.png");
  });

  it("edit and sprite items link to their own tools", () => {
    const base = { user: { name: null, credits: 2, latestSprite: null }, inspiration: null, unsubscribeUrl: SAMPLE_UNSUBSCRIBE_URL };
    const item = { id: "e1", kind: "edit" as const, imageUrl: "https://x.co/e.png", prompt: "knight", categoryId: "CHARACTERS", styleId: "PIXEL", createdAt: new Date() };
    expect(buildLifecycleMessage({ ...base, sequence: "unfinished", item }).ctaUrl).toContain("/edit?result=e1&");
    expect(buildLifecycleMessage({ ...base, sequence: "unfinished", item: { ...item, kind: "sprite" } }).ctaUrl).toContain("/generate?result=e1&");
  });
});

describe("copy helpers", () => {
  it("shortens prompts safely", () => {
    expect(shortName("An armored knight with a fire sword, pixel art")).toBe("armored knight");
    expect(shortName("[Edited] red potion in a round bottle")).toBe("red potion");
    expect(shortName("see https://evil.example")).toBe("sprite");
    expect(cleanPrompt("<script>")).toBeUndefined();
  });

  it("only suggests what the balance pays for", () => {
    const poor = creditIdeas("CHARACTERS", "knight", 2);
    expect(poor).toHaveLength(3);
    expect(poor.every((i) => !/from 6|^6 credits/.test(i.cost))).toBe(true);
    const rich = creditIdeas("CHARACTERS", "knight", 50);
    expect(rich[0].title).toBe("Animate your knight");
  });
});

describe("snapshot", () => {
  const row = (over: Partial<GenerationRow>): GenerationRow => ({
    id: "g", userId: "u", prompt: "knight", categoryId: "CHARACTERS", subcategoryId: "FRONT", styleId: "PIXEL_ART_16",
    imageUrl: "https://cdn.x/k.png", createdAt: new Date("2026-10-10T00:00:00Z"), ...over,
  });

  it("finds the latest item, the latest sprite and an animation's source", () => {
    const s = summarizeWork([
      row({ id: "sp", createdAt: new Date("2026-10-09T00:00:00Z") }),
      row({ id: "an", subcategoryId: "ANIMATION", prompt: "[Animation: walk, 8f] knight", createdAt: new Date("2026-10-11T00:00:00Z") }),
      row({ id: "m", styleId: "3D_LOWPOLY", imageUrl: "https://x/m.glb", createdAt: new Date("2026-10-12T00:00:00Z") }),
    ]);
    expect(s.latestItem).toMatchObject({ id: "an", kind: "animation", motionLabel: "walk", sourceSpriteId: "sp" });
    expect(s.latestSprite?.id).toBe("sp");
    expect(s.lastCreatedAt?.toISOString()).toBe("2026-10-12T00:00:00.000Z");
  });

  it("only allows absolute https images", () => {
    expect(emailSafeImage("https://cdn.x/a.png")).toBe("https://cdn.x/a.png");
    expect(emailSafeImage("http://cdn.x/a.png")).toBeNull();
    expect(emailSafeImage("data:image/png;base64,AAA")).toBeNull();
    expect(emailSafeImage("/showcase/a.png")).toBeNull();
  });

  it("picks community sprites, max 2 per author, and only says 'this week' when true", () => {
    const now = new Date("2026-10-13T00:00:00Z");
    const c = (i: number, userId: string, daysOld: number): CommunityRow => ({
      ...row({ id: `c${i}`, userId, prompt: `sprite number ${i}`, createdAt: new Date(now.getTime() - daysOld * 86_400_000) }), likes: 10 - i,
    });
    const fresh = pickInspiration([c(1, "a", 1), c(2, "a", 2), c(3, "a", 2), c(4, "b", 3), c(5, "c", 3), c(6, "d", 4), c(7, "e", 5)], now);
    expect(fresh?.items.map((i) => i.id)).toEqual(["c1", "c2", "c4", "c5", "c6", "c7"]);
    expect(fresh?.thisWeek).toBe(true);
    const mixed = pickInspiration([c(1, "a", 1), c(2, "b", 20), c(3, "c", 25)], now);
    expect(mixed?.thisWeek).toBe(false);
    expect(pickInspiration([c(1, "a", 1), c(2, "b", 2)], now)).toBeNull();
  });
});
