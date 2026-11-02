import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { healTileSeams, seamAxes, SEAM_LIMIT, type RgbaImage } from "./tile-seam";
import { postprocessTile } from "./sprite-postprocess";

function solid(w: number, h: number, rgb: [number, number, number]): RgbaImage {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = rgb[0]; data[i * 4 + 1] = rgb[1]; data[i * 4 + 2] = rgb[2]; data[i * 4 + 3] = 255;
  }
  return { data, width: w, height: h };
}

function put(raw: RgbaImage, x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number]) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * raw.width + x) * 4;
    raw.data[i] = rgb[0]; raw.data[i + 1] = rgb[1]; raw.data[i + 2] = rgb[2];
  }
}

describe("healTileSeams", () => {
  it("leaves an already seamless tile untouched", () => {
    const tile = solid(64, 64, [40, 90, 50]);
    const healed = healTileSeams(tile);
    expect(healed).toBe(tile);
    expect(seamAxes(tile).x).toBeLessThanOrEqual(SEAM_LIMIT);
  });

  it("closes a hard left/right seam without cloning the centre motif", () => {
    const tile = solid(64, 64, [180, 40, 40]);
    for (let y = 0; y < 64; y++) {
      for (let x = 32; x < 64; x++) {
        const i = (y * 64 + x) * 4;
        tile.data[i] = 30; tile.data[i + 1] = 40; tile.data[i + 2] = 160;
      }
    }
    put(tile, 4, 4, 12, 12, [0, 220, 40]);
    expect(seamAxes(tile).x).toBeGreaterThan(SEAM_LIMIT);
    const healed = healTileSeams(tile);
    expect(seamAxes(healed).x).toBeLessThanOrEqual(SEAM_LIMIT);
    expect(seamAxes(healed).y).toBeLessThanOrEqual(SEAM_LIMIT);
    let green = 0;
    for (let i = 0; i < healed.data.length; i += 4) {
      if (healed.data[i + 1] > 180 && healed.data[i] < 40) green++;
    }
    expect(green).toBe(64);
  });
});

describe("postprocessTile", () => {
  it("returns a square png for a seamed input", async () => {
    const raw = solid(32, 32, [200, 200, 200]);
    for (let y = 0; y < 32; y++) raw.data[(y * 32 + 31) * 4] = 0;
    const png = await sharp(raw.data, { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer();
    const out = await postprocessTile(png, { outputSize: 64 });
    const meta = await sharp(out.png).metadata();
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(64);
  });
});
