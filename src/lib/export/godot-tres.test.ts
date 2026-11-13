import { describe, expect, it } from "vitest";
import { godotSpriteFramesTres } from "./godot-tres";

describe("godotSpriteFramesTres", () => {
  it("lists one region per frame on a horizontal strip", () => {
    const text = godotSpriteFramesTres({
      name: "walk",
      frameCount: 4,
      frameWidth: 64,
      frameHeight: 64,
      fps: 8,
      loop: true,
      sheetFile: "res://walk.png",
    });
    expect(text).toContain('type="SpriteFrames"');
    expect(text).toContain("res://walk.png");
    expect(text.match(/Rect2\(/g)?.length).toBe(4);
    expect(text).toContain("Rect2(192, 0, 64, 64)");
    expect(text).toContain('"loop": true');
  });
});
