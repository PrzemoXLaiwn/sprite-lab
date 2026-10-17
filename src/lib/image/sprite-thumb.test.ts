import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { integerDownsample, nearestPixelBox, thumbUrl } from "./sprite-thumb";

describe("nearestPixelBox", () => {
  it("uses an integer factor when the source divides evenly", () => {
    expect(nearestPixelBox(1024, 1024, 512, 512)).toEqual({ width: 512, height: 512 });
    expect(nearestPixelBox(1024, 1024, 40, 40)).toEqual({ width: 32, height: 32 });
    // 384 / 12 = 32, which fits in 40. A 40px lanczos scale is what looked blurry.
    expect(nearestPixelBox(384, 384, 40, 40)).toEqual({ width: 32, height: 32 });
  });

  it("does not enlarge and falls back to nearest when no integer factor fits", () => {
    expect(nearestPixelBox(34, 34, 40, 40)).toEqual({ width: 34, height: 34 });
    expect(nearestPixelBox(47, 47, 40, 40)).toEqual({ width: 40, height: 40 });
  });
});

describe("integerDownsample", () => {
  it("keeps the top-left pixel of each block", () => {
    const src = Buffer.from([
      1, 2, 3, 4,
      5, 6, 7, 8,
    ]);
    expect([...integerDownsample(src, 4, 2, 1, 2)]).toEqual([1, 3]);
  });
});

describe("committed 40px icons", () => {
  it("keeps fox-mage on a 32px integer grid and does not enlarge smaller sprites", async () => {
    const fox = await sharp("public/showcase/w40/fox-mage.webp").metadata();
    const potion = await sharp("public/showcase/w40/health-potion.webp").metadata();
    expect(fox.width).toBe(32);
    expect(fox.height).toBe(32);
    expect(potion.width).toBe(34);
    expect(potion.height).toBe(34);
  });
});

describe("thumbUrl", () => {
  it("always asks for nearest, including painted styles", () => {
    expect(thumbUrl("/showcase/fox-mage.png", 40, false)).toBe(
      "/api/sprite-thumb?src=%2Fshowcase%2Ffox-mage.png&w=40&k=nearest",
    );
  });
});
