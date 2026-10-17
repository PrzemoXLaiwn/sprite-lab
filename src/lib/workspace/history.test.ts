import { describe, expect, it } from "vitest";
import {
  animationSheetGeometry,
  classifyGeneration,
  cleanGenerationPrompt,
  defaultAnimationFps,
  historyBadge,
  historyWhere,
  matchesHistoryFilter,
  normalizeHistoryQuery,
  parseAnimationPrompt,
  TOOL_HISTORY_FILTERS,
} from "./history";

describe("classifyGeneration", () => {
  it("recognises every kind the tools save", () => {
    expect(classifyGeneration({ prompt: "[Animation: walk, 8f] knight", subcategoryId: "ANIMATION" })).toBe("animation");
    expect(classifyGeneration({ prompt: "[Edited] make the armor golden", subcategoryId: "HEROES" })).toBe("edit");
    expect(classifyGeneration({ prompt: "[Upscaled 2x] knight" })).toBe("variant");
    expect(classifyGeneration({ prompt: "[No BG] knight" })).toBe("variant");
    expect(classifyGeneration({ prompt: "[Variation 1/4] knight" })).toBe("variant");
    expect(classifyGeneration({ prompt: "knight", styleId: "3D_TRIPO" })).toBe("model");
    expect(classifyGeneration({ prompt: "knight", imageUrl: "https://x/m.glb" })).toBe("model");
    expect(classifyGeneration({ prompt: "knight in armor", subcategoryId: "HEROES" })).toBe("sprite");
  });

  it("treats an ANIMATION row as an animation even without the prompt tag", () => {
    expect(classifyGeneration({ prompt: "knight", subcategoryId: "ANIMATION" })).toBe("animation");
  });
});

describe("parseAnimationPrompt", () => {
  it("reads label, frames and the source prompt", () => {
    expect(parseAnimationPrompt("[Animation: walk, 8f] knight in armor, red cape")).toEqual({
      label: "walk", frameCount: 8, sourcePrompt: "knight in armor, red cape", walkSet: false, directions: null,
    });
  });

  it("detects walk sets and direction sheets", () => {
    expect(parseAnimationPrompt("[Animation: 4-direction walk, 16f] knight")).toMatchObject({ walkSet: true, directions: 4, frameCount: 16 });
    expect(parseAnimationPrompt("[Animation: 8 directions, 8f] knight")).toMatchObject({ walkSet: false, directions: 8 });
  });

  it("returns null for anything else", () => {
    expect(parseAnimationPrompt("knight")).toBeNull();
    expect(parseAnimationPrompt("[Animation: walk] knight")).toBeNull();
    expect(parseAnimationPrompt(null)).toBeNull();
    expect(parseAnimationPrompt("[Animation: walk, 0f] knight")).toBeNull();
  });
});

describe("cleanGenerationPrompt / historyBadge", () => {
  it("strips tool tags", () => {
    expect(cleanGenerationPrompt("[Animation: idle, 6f] dragon")).toBe("dragon");
    expect(cleanGenerationPrompt("[No BG] [Upscaled 2x] dragon")).toBe("dragon");
    expect(cleanGenerationPrompt("[Edited] add a cape")).toBe("add a cape");
    expect(cleanGenerationPrompt("  dragon ")).toBe("dragon");
  });

  it("labels tiles", () => {
    expect(historyBadge({ prompt: "[Animation: walk, 8f] x", subcategoryId: "ANIMATION" })).toBe("Walk · 8f");
    expect(historyBadge({ prompt: "[Animation: 4-direction walk, 16f] x", subcategoryId: "ANIMATION" })).toBe("4-direction walk");
    expect(historyBadge({ prompt: "[Edited] x" })).toBe("Edit");
    expect(historyBadge({ prompt: "[No BG] x" })).toBe("No BG");
    expect(historyBadge({ prompt: "x" })).toBeNull();
  });
});

describe("animationSheetGeometry", () => {
  it("splits a one-row sheet into equal frames", () => {
    expect(animationSheetGeometry({ frameCount: 8, walkSet: false }, 2048, 256)).toEqual({
      frameCount: 8, frameWidth: 256, frameHeight: 256, rows: 1, cols: 8,
    });
  });

  it("reads walk sets as a 4-row grid", () => {
    expect(animationSheetGeometry({ frameCount: 16, walkSet: true }, 1024, 1024)).toEqual({
      frameCount: 16, frameWidth: 256, frameHeight: 256, sheetCols: 4, rows: 4, cols: 4,
    });
  });

  it("rejects an image that hasn't loaded", () => {
    expect(animationSheetGeometry({ frameCount: 8, walkSet: false }, 0, 0)).toBeNull();
  });
});

describe("defaultAnimationFps", () => {
  it("matches the Animate page defaults", () => {
    expect(defaultAnimationFps({ frameCount: 16, walkSet: true, directions: 4 })).toBe(6);
    expect(defaultAnimationFps({ frameCount: 8, walkSet: false, directions: 8 })).toBe(2);
    expect(defaultAnimationFps({ frameCount: 6, walkSet: false, directions: null }, "rig:breathe")).toBe(12);
    expect(defaultAnimationFps({ frameCount: 12, walkSet: false, directions: null })).toBe(12);
    expect(defaultAnimationFps({ frameCount: 9, walkSet: false, directions: null })).toBe(10);
    expect(defaultAnimationFps({ frameCount: 4, walkSet: false, directions: null })).toBe(8);
  });
});

describe("historyWhere", () => {
  it("adds nothing for no filter and no query", () => {
    expect(historyWhere(null, null)).toEqual([]);
    expect(historyWhere(null, "   ")).toEqual([]);
  });

  it("filters animations by subcategory", () => {
    expect(historyWhere("animations", null)).toEqual([{ subcategoryId: "ANIMATION" }]);
  });

  it("keeps edits out of sprites and animations out of images", () => {
    const sprites = JSON.stringify(historyWhere("sprites", null));
    expect(sprites).toContain("[Edited]");
    expect(sprites).toContain("ANIMATION");
    expect(JSON.stringify(historyWhere("all-images", null))).not.toContain("[Edited]");
  });

  it("searches the prompt case-insensitively with a normalised query", () => {
    expect(historyWhere(null, "  Red   knight ")).toEqual([{ prompt: { contains: "Red knight", mode: "insensitive" } }]);
  });

  it("caps the query length", () => {
    expect(normalizeHistoryQuery("a".repeat(200))).toHaveLength(80);
  });
});

describe("matchesHistoryFilter", () => {
  const anim = { prompt: "[Animation: walk, 8f] red knight", subcategoryId: "ANIMATION" };
  const sprite = { prompt: "red knight", subcategoryId: "HEROES" };
  const edit = { prompt: "[Edited] make it blue", subcategoryId: "HEROES" };

  it("mirrors the server filter", () => {
    expect(matchesHistoryFilter(anim, "animations")).toBe(true);
    expect(matchesHistoryFilter(sprite, "animations")).toBe(false);
    expect(matchesHistoryFilter(edit, "sprites")).toBe(false);
    expect(matchesHistoryFilter(edit, "edits")).toBe(true);
    expect(matchesHistoryFilter(edit, "all-images")).toBe(true);
    expect(matchesHistoryFilter(anim, "all-images")).toBe(false);
  });

  it("applies the search text", () => {
    expect(matchesHistoryFilter(sprite, null, "KNIGHT")).toBe(true);
    expect(matchesHistoryFilter(sprite, null, "dragon")).toBe(false);
  });

  it("gives every tool at least one filter", () => {
    for (const filters of Object.values(TOOL_HISTORY_FILTERS)) expect(filters.length).toBeGreaterThan(0);
  });
});
