// Synthetic sprites for the offline benchmark. No network, no model.

import sharp from "sharp";

function fill(data: Buffer, width: number, x0: number, y0: number, w: number, h: number, rgb: [number, number, number]): void {
  const x1 = Math.min(width, x0 + w);
  const y1 = y0 + h;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0) continue;
      const i = (y * width + x) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
}

async function pngOf(data: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * White page, red figure, a 2px grey rim the white-key fringe pass leaves
 * behind (it is farther than 64 levels from white), and one green speck.
 */
export async function syntheticSpritePng(): Promise<Buffer> {
  const w = 220, h = 260;
  const data = Buffer.alloc(w * h * 4, 255);
  const body: [number, number, number] = [180, 40, 40];
  const halo: [number, number, number] = [185, 188, 190];
  fill(data, w, 58, 48, 84, 150, halo);
  fill(data, w, 60, 50, 80, 146, body);
  fill(data, w, 16, 18, 1, 1, [0, 220, 0]);
  return pngOf(data, w, h);
}

/** 2×2 white sheet. Four figures, same feet, different heights, near-duplicate reds, grey rims. */
export async function syntheticAnimGridPng(): Promise<Buffer> {
  const size = 400;
  const cell = 200;
  const data = Buffer.alloc(size * size * 4, 255);
  const heights = [60, 110, 80, 130];
  const reds = [180, 188, 176, 196];
  const greens = [40, 46, 36, 44];
  const halo: [number, number, number] = [185, 188, 190];
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const left = col * cell + 78;
    const bottom = row * cell + 170;
    const bh = heights[i];
    const top = bottom - bh;
    fill(data, size, left - 2, top - 2, 44, bh + 4, halo);
    fill(data, size, left, top, 40, bh, [reds[i], greens[i], 40]);
  }
  return pngOf(data, size, size);
}
