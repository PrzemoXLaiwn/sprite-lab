// Background keying must keep light clothing: white shirt highlights are not
// "gaps", and cream trousers are not a "ground shadow".
import { describe, expect, it } from "vitest";
import { keySpriteBackground } from "./sprite-postprocess";

type RGB = [number, number, number];
function canvas(w: number, h: number, fill: RGB = [255, 255, 255]) {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = fill[0]; data[i * 4 + 1] = fill[1]; data[i * 4 + 2] = fill[2]; data[i * 4 + 3] = 255; }
  const rect = (x0: number, y0: number, x1: number, y1: number, c: RGB) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; }
  };
  const alpha = (x: number, y: number) => data[(y * w + x) * 4 + 3];
  return { raw: { data, width: w, height: h }, rect, alpha };
}
const OUTLINE: RGB = [25, 20, 30], CREAM: RGB = [236, 228, 212], SHADE: RGB = [205, 198, 186], WHITE: RGB = [252, 252, 252], SKIN: RGB = [200, 140, 100];

describe("keySpriteBackground", () => {
  it("keeps a large white highlight on a cream shirt", () => {
    const c = canvas(200, 300);
    c.rect(40, 40, 160, 260, OUTLINE);
    c.rect(44, 44, 156, 256, CREAM);
    c.rect(70, 80, 130, 150, WHITE); // big highlight, bordered by cream
    keySpriteBackground(c.raw);
    expect(c.alpha(100, 115)).toBe(255);
    expect(c.alpha(5, 5)).toBe(0); // real background is gone
  });

  it("still removes a gap between dark-outlined legs", () => {
    const c = canvas(200, 300);
    c.rect(40, 40, 160, 260, OUTLINE);
    c.rect(44, 44, 156, 256, SKIN);
    c.rect(90, 150, 110, 256, OUTLINE);
    c.rect(94, 150, 106, 252, WHITE); // background seen between the legs
    keySpriteBackground(c.raw);
    expect(c.alpha(100, 200)).toBe(0);
  });

  it("removes a flat grey contact shadow but not tall shaded trousers", () => {
    const c = canvas(200, 300);
    // body with an opening at the bottom so trousers touch the background
    c.rect(60, 20, 140, 200, SKIN);
    c.rect(60, 200, 140, 280, SHADE); // tall shaded trousers reaching the bottom
    c.rect(20, 282, 180, 292, SHADE); // thin shadow smear under the feet
    keySpriteBackground(c.raw);
    expect(c.alpha(100, 240)).toBe(255); // trousers stay
    expect(c.alpha(30, 287)).toBe(0); // shadow goes
  });

  it("removes a realistic studio floor under and between the legs, rim included", () => {
    const c = canvas(300, 400);
    c.rect(80, 40, 220, 300, OUTLINE); // body down to a skirt hem at y=300
    c.rect(40, 320, 260, 372, SHADE); // floor plane: wider than the body, deep
    c.rect(100, 300, 200, 320, SHADE); // floor seen between the legs, up to the hem
    c.rect(90, 300, 120, 360, OUTLINE); // left leg standing on the floor
    c.rect(180, 300, 210, 360, OUTLINE); // right leg
    for (let x = 40; x < 260; x += 3) c.rect(x, 372, x + 1, 373, [228, 222, 214]); // rough pale rim
    keySpriteBackground(c.raw);
    expect(c.alpha(50, 350)).toBe(0); // floor beside the feet
    expect(c.alpha(150, 310)).toBe(0); // floor between the legs
    expect(c.alpha(40, 372)).toBe(0); // dotted rim
    expect(c.alpha(100, 340)).toBe(255); // legs stay
    expect(c.alpha(150, 200)).toBe(255); // body stays
  });

  it("keeps pale trousers that run up past the bottom band", () => {
    const c = canvas(300, 400);
    c.rect(100, 40, 200, 180, SKIN);
    c.rect(100, 180, 200, 372, SHADE); // long pale trousers down to the bottom
    keySpriteBackground(c.raw);
    expect(c.alpha(150, 360)).toBe(255);
    expect(c.alpha(150, 250)).toBe(255);
  });

  it("painted styles: removes a flat key-colour gap fenced by mid tones, keeps a white highlight on cream", () => {
    const c = canvas(200, 300);
    c.rect(40, 40, 160, 260, SKIN);
    c.rect(60, 60, 90, 120, [255, 255, 255]); // background seen between arm and body
    c.rect(110, 60, 150, 120, CREAM);
    c.rect(118, 70, 142, 110, WHITE); // highlight on cream cloth
    keySpriteBackground(c.raw, { flatGaps: true });
    expect(c.alpha(75, 90)).toBe(0);
    expect(c.alpha(130, 90)).toBe(255);
  });

  it("magenta key (pale subjects): removes every enclosed key patch, keeps flat white cloth", () => {
    const KEY: RGB = [192, 46, 190];
    const c = canvas(200, 300, KEY);
    c.rect(40, 40, 160, 260, OUTLINE);
    c.rect(44, 44, 156, 256, [255, 255, 255]); // flat white shirt
    c.rect(60, 120, 80, 200, OUTLINE);
    c.rect(64, 124, 76, 196, KEY); // key colour seen through a gap (bow and string)
    keySpriteBackground(c.raw);
    expect(c.alpha(70, 160)).toBe(0);
    expect(c.alpha(120, 100)).toBe(255);
    expect(c.alpha(5, 5)).toBe(0);
  });

  it("removes a white gap behind a grey anti-aliased rim inside a dark cloak (Pixel HD lantern case)", () => {
    const c = canvas(300, 300);
    const CLOAK: RGB = [40, 42, 48], RIM: RGB = [200, 202, 205];
    c.rect(40, 40, 260, 260, CLOAK);
    c.rect(100, 80, 160, 200, RIM); // 2 px grey rim around the gap
    c.rect(102, 82, 158, 198, WHITE); // background seen between cloak and arm
    keySpriteBackground(c.raw);
    expect(c.alpha(130, 140)).toBe(0);
  });

  it("keeps white cloth shaded with a wide grey band", () => {
    const c = canvas(300, 300);
    const GREY: RGB = [190, 192, 196];
    c.rect(40, 40, 260, 260, OUTLINE);
    c.rect(44, 44, 256, 256, GREY); // wide shading band (> 3 px) around the white
    c.rect(60, 60, 240, 240, WHITE);
    keySpriteBackground(c.raw);
    expect(c.alpha(150, 150)).toBe(255);
  });
});
