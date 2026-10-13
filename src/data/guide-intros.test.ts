import { describe, expect, it } from "vitest";
import { GUIDES, guideReadingMinutes, guideWordCount } from "./guides";
import { GUIDE_INTROS } from "./guide-intros";
import { AD_MIN_WORDS } from "@/lib/ads-policy";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("guides", () => {
  it("every guide has a what-you'll-learn box", () => {
    for (const g of GUIDES) {
      const intro = GUIDE_INTROS[g.slug];
      expect(intro, g.slug).toBeDefined();
      expect(intro.learn.length, g.slug).toBeGreaterThanOrEqual(3);
      expect(intro.needs.length, g.slug).toBeGreaterThanOrEqual(1);
    }
    expect(Object.keys(GUIDE_INTROS).sort()).toEqual(GUIDES.map((g) => g.slug).sort());
  });

  it("every guide is long enough to carry ads and has a reading time", () => {
    for (const g of GUIDES) {
      expect(guideWordCount(g), g.slug).toBeGreaterThanOrEqual(AD_MIN_WORDS);
      expect(guideReadingMinutes(g), g.slug).toBeGreaterThanOrEqual(4);
    }
  });

  it("images exist in public/showcase and have real alt text", () => {
    for (const g of GUIDES) {
      for (const s of g.sections) {
        if (!s.image) continue;
        expect(s.image.src.startsWith("/showcase/"), s.image.src).toBe(true);
        expect(existsSync(join(process.cwd(), "public", s.image.src)), s.image.src).toBe(true);
        expect(s.image.alt.split(" ").length, s.image.src).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("descriptions fit in a search snippet", () => {
    for (const g of GUIDES) expect(g.description.length, g.slug).toBeLessThanOrEqual(160);
  });
});
