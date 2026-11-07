import { describe, expect, it } from "vitest";
import { publicGenerationWhere } from "@/lib/moderation/visibility";
import { galleryAllCount, normalizeCommunitySearch } from "@/lib/community-gallery-types";
import { communityListWhere } from "@/lib/community-gallery";

describe("community gallery filters", () => {
  it("searches the prompt and keeps the public-gallery rule in AND (that rule already sets NOT)", () => {
    expect(communityListWhere({ category: "WEAPONS", type: "2d", q: "  knight   sword  " })).toEqual({
      AND: [
        publicGenerationWhere(),
        { categoryId: "WEAPONS" },
        { prompt: { contains: "knight sword", mode: "insensitive" } },
        { styleId: { not: { startsWith: "3D_" } } },
      ],
    });
  });

  it("leaves the type filter off the 2D/3D breakdown so the two counts still add up", () => {
    const where = communityListWhere({ category: "all", type: "2d", q: "slime" }, { type: false });
    expect(where).toEqual({
      AND: [
        publicGenerationWhere(),
        { prompt: { contains: "slime", mode: "insensitive" } },
      ],
    });
  });

  it("ignores a blank search and an unfiltered gallery", () => {
    expect(normalizeCommunitySearch("   ")).toBeNull();
    expect(normalizeCommunitySearch("a".repeat(100))).toHaveLength(80);
    expect(communityListWhere({ category: "all", type: "all", q: "  " })).toEqual(publicGenerationWhere());
  });

  it("keeps the All chip on the whole gallery when a filter shrinks the page total", () => {
    expect(galleryAllCount({ CHARACTERS: 40, WEAPONS: 22 }, 12)).toBe(62);
    expect(galleryAllCount({}, 12)).toBe(12);
  });
});
