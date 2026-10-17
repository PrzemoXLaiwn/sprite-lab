// Weapons and items are animated by moving the real drawing (no AI redraw):
// the right motions are routed here, and the grip is found at the lower end.
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { rigMotionFor } from "@/config/animations";
import { itemAxis, makeItemMotion } from "./item-motion";

/** A diagonal "sword": grip at the bottom-left, tip at the top-right. */
function sword(size = 64): { data: Buffer; width: number; height: number } {
  const data = Buffer.alloc(size * size * 4);
  for (let t = 8; t < 56; t++) for (let w = -1; w <= 1; w++) {
    const x = t + w, y = size - 1 - t;
    const i = (y * size + x) * 4;
    data[i] = 200; data[i + 1] = 200; data[i + 2] = 210; data[i + 3] = 255;
  }
  return { data, width: size, height: size };
}

describe("rigMotionFor", () => {
  it("routes weapon motions to rigid item rigs", () => {
    expect(rigMotionFor("ai-swing", "Swing", "WEAPONS")).toBe("swing");
    expect(rigMotionFor("ai-thrust", "Thrust", "WEAPONS")).toBe("thrust");
    expect(rigMotionFor("ai-spin", "Spin", "WEAPONS")).toBe("spin");
    expect(rigMotionFor("ai-blade-shine", "Blade Shine", "WEAPONS")).toBe("shine");
    expect(rigMotionFor("ai-gem-glow", "Gem Glow", "WEAPONS")).toBe("pulse");
    expect(rigMotionFor("ai-power-up", "Power Up", "WEAPONS")).toBe("pulse");
    expect(rigMotionFor("ai-pickup", "Pickup Float", "CONSUMABLES")).toBe("float");
  });
  it("leaves characters and unknown item motions to the AI", () => {
    expect(rigMotionFor("ai-swing", "Sword Swing", "CHARACTERS")).toBeNull();
    expect(rigMotionFor("ai-shatter", "Shatter", "WEAPONS")).toBeNull();
    expect(rigMotionFor("idle", "Idle", "CHARACTERS")).toBe("breathe");
  });
});

describe("item motion", () => {
  it("finds the grip at the lower end of a diagonal blade", () => {
    const a = itemAxis(sword())!;
    expect(a.dx).toBeGreaterThan(0); // grip → tip goes right…
    expect(a.dy).toBeLessThan(0); // …and up
  });

  it("swing keeps the sprite's own colours and returns one frame per pose", async () => {
    const s = sword();
    const png = await sharp(s.data, { raw: { width: 64, height: 64, channels: 4 } }).png().toBuffer();
    const anim = await makeItemMotion(png, { kind: "swing", pixel: true, frameSize: 128 });
    expect(anim.frameCount).toBe(10);
    const { data } = await sharp(anim.frames[5]).raw().toBuffer({ resolveWithObject: true });
    const colours = new Set<string>();
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) colours.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    expect([...colours]).toEqual(["200,200,210"]); // no blending, no new colours
  });
});
