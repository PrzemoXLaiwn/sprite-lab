// Synthetic before/after for the quality pass. No provider calls.

import {
  alignFrames,
  bboxHeight,
  cleanupAlpha,
  centerOffset,
  encodeRgba,
  footY,
  lightFringeCount,
  lockPalette,
  recenter,
  uniqueOpaqueColors,
  type RawImage,
} from "@/lib/image/quality-postprocess";
import { contactSheet } from "./contact-sheet";

export interface OfflineRow {
  id: string;
  before: Record<string, number>;
  after: Record<string, number>;
}

function empty(w: number, h: number): RawImage {
  return { data: Buffer.alloc(w * h * 4), width: w, height: h };
}

function rect(img: RawImage, x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number]) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const i = (y * img.width + x) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = 255;
    }
  }
}

function haloSprite(): RawImage {
  const img = empty(64, 64);
  rect(img, 22, 16, 42, 50, [180, 36, 36]);
  rect(img, 20, 14, 44, 16, [248, 248, 248]);
  rect(img, 20, 50, 44, 52, [248, 248, 248]);
  rect(img, 20, 16, 22, 50, [248, 248, 248]);
  rect(img, 42, 16, 44, 50, [248, 248, 248]);
  return img;
}

function shiftedPair(): [RawImage, RawImage] {
  const a = empty(48, 64);
  rect(a, 6, 12, 20, 52, [40, 90, 180]);
  const b = empty(56, 72);
  // 44px tall vs 40px: inside the 12% scale band, so alignment should match heights.
  rect(b, 28, 14, 46, 58, [40, 90, 180]);
  return [a, b];
}

function palettePair(): [RawImage, RawImage] {
  const a = empty(16, 16);
  rect(a, 2, 2, 14, 14, [200, 30, 30]);
  const b = empty(16, 16);
  rect(b, 2, 2, 14, 14, [207, 36, 33]);
  return [a, b];
}

function crouchPair(): [RawImage, RawImage] {
  const stand = empty(32, 48);
  rect(stand, 8, 6, 24, 42, [60, 140, 70]);
  const crouch = empty(32, 48);
  rect(crouch, 8, 28, 24, 42, [60, 140, 70]);
  return [stand, crouch];
}

async function png(raw: RawImage): Promise<Buffer> {
  return encodeRgba(raw);
}

export async function runOffline(): Promise<{ rows: OfflineRow[]; sheet: Buffer }> {
  const halo = haloSprite();
  const haloAfter = recenter(cleanupAlpha(halo).image);
  const [shiftA, shiftB] = shiftedPair();
  const aligned = alignFrames([shiftA, shiftB]);
  const [palA, palB] = palettePair();
  const locked = lockPalette([palA, palB]);
  const [stand, crouch] = crouchPair();
  const crouched = alignFrames([stand, crouch, stand]);

  const rows: OfflineRow[] = [
    {
      id: "white-halo",
      before: { lightFringe: lightFringeCount(halo), centerOffset: round(centerOffset(halo)) },
      after: { lightFringe: lightFringeCount(haloAfter), centerOffset: round(centerOffset(haloAfter)) },
    },
    {
      id: "frame-align",
      before: {
        footDelta: Math.abs(footY(shiftA) - footY(shiftB)),
        heightDelta: Math.abs(bboxHeight(shiftA) - bboxHeight(shiftB)),
        sameCanvas: shiftA.width === shiftB.width && shiftA.height === shiftB.height ? 1 : 0,
      },
      after: {
        footDelta: Math.abs(footY(aligned[0]) - footY(aligned[1])),
        heightDelta: Math.abs(bboxHeight(aligned[0]) - bboxHeight(aligned[1])),
        sameCanvas: aligned[0].width === aligned[1].width && aligned[0].height === aligned[1].height ? 1 : 0,
      },
    },
    {
      id: "palette-lock",
      before: { uniqueColors: uniqueOpaqueColors([palA, palB]) },
      after: { uniqueColors: uniqueOpaqueColors(locked) },
    },
    {
      id: "crouch-kept",
      before: { crouchOverStand: round(bboxHeight(crouch) / bboxHeight(stand)) },
      after: { crouchOverStand: round(bboxHeight(crouched[1]) / bboxHeight(crouched[0])) },
    },
  ];

  const sheet = await contactSheet([
    {
      title: "White halo",
      cells: [
        { title: "Before", png: await png(halo) },
        { title: "After", png: await png(haloAfter) },
      ],
    },
    {
      title: "Frame align",
      cells: [
        { title: "Frame A", png: await png(shiftA) },
        { title: "Frame B", png: await png(shiftB) },
        { title: "A aligned", png: await png(aligned[0]) },
        { title: "B aligned", png: await png(aligned[1]) },
      ],
    },
    {
      title: "Palette lock",
      cells: [
        { title: "Red 200", png: await png(palA) },
        { title: "Red 207", png: await png(palB) },
        { title: "Locked A", png: await png(locked[0]) },
        { title: "Locked B", png: await png(locked[1]) },
      ],
    },
  ]);

  return { rows, sheet };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
