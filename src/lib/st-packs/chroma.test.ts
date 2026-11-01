import { describe, expect, it } from "vitest";
import { CHROMA_GREEN, CHROMA_MAGENTA, chromaHex, keyChromaFrames, pickChromaKey } from "./chroma";
import { makeFrame, pixel } from "./test-fixtures";
import type { Frame } from "./types";

function fill(frame: Frame, rgb: [number, number, number]): void {
  for (let o = 0; o < frame.data.length; o += 4) {
    frame.data[o] = rgb[0];
    frame.data[o + 1] = rgb[1];
    frame.data[o + 2] = rgb[2];
    frame.data[o + 3] = 255;
  }
}

function rect(frame: Frame, x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number]): void {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * frame.width + x) * 4;
      frame.data[o] = rgb[0];
      frame.data[o + 1] = rgb[1];
      frame.data[o + 2] = rgb[2];
      frame.data[o + 3] = 255;
    }
  }
}

describe("chroma key", () => {
  it("picks green, and magenta when the character is green", () => {
    const plain = makeFrame(40, 40, [236, 236, 236, 255]);
    rect(plain, 12, 8, 28, 34, [230, 210, 190]);
    expect(pickChromaKey(plain)).toEqual(CHROMA_GREEN);
    const leafy = makeFrame(40, 40, [236, 236, 236, 255]);
    rect(leafy, 8, 6, 32, 36, [20, 180, 30]);
    expect(pickChromaKey(leafy)).toEqual(CHROMA_MAGENTA);
    expect(chromaHex(CHROMA_GREEN)).toBe("#00FF00");
  });

  it("clears an enclosed green pocket and keeps a white shirt and a grey coat", () => {
    const shirt = makeFrame(48, 48);
    fill(shirt, CHROMA_GREEN);
    rect(shirt, 10, 8, 38, 42, [244, 244, 244]);
    rect(shirt, 18, 16, 28, 30, CHROMA_GREEN);
    const coat = makeFrame(48, 48);
    fill(coat, CHROMA_GREEN);
    rect(coat, 10, 8, 38, 42, [206, 205, 210]);
    rect(coat, 20, 18, 30, 32, CHROMA_GREEN);
    // Frame 0 has no pocket, so its interior covers where the pocket opens.
    const shirt0 = makeFrame(48, 48);
    fill(shirt0, CHROMA_GREEN);
    rect(shirt0, 10, 8, 38, 42, [244, 244, 244]);
    const coat0 = makeFrame(48, 48);
    fill(coat0, CHROMA_GREEN);
    rect(coat0, 10, 8, 38, 42, [206, 205, 210]);
    const [s0, s1] = keyChromaFrames([shirt0, shirt], CHROMA_GREEN);
    const [, c1] = keyChromaFrames([coat0, coat], CHROMA_GREEN);
    expect(pixel(s1, 1, 1)[3]).toBe(0);
    expect(pixel(s1, 22, 22)[3]).toBe(0);
    expect(pixel(s1, 14, 36)[3]).toBe(255);
    expect(pixel(s0, 24, 24)[3]).toBe(255);
    expect(pixel(c1, 1, 1)[3]).toBe(0);
    expect(pixel(c1, 24, 24)[3]).toBe(0);
    expect(pixel(c1, 14, 36)[3]).toBe(255);
  });

  it("clears a darkened green edge sampled from the corners", () => {
    const frame = makeFrame(40, 40);
    fill(frame, [13, 77, 9]);
    rect(frame, 12, 10, 28, 32, [244, 244, 244]);
    const [out] = keyChromaFrames([frame], CHROMA_GREEN);
    expect(pixel(out, 2, 2)[3]).toBe(0);
    expect(pixel(out, 20, 20)[3]).toBe(255);
  });

  it("despills a green fringe without painting the shirt", () => {
    const frame = makeFrame(16, 16);
    fill(frame, CHROMA_GREEN);
    rect(frame, 4, 4, 12, 12, [250, 250, 250]);
    const fringe = (8 * 16 + 4) * 4;
    frame.data[fringe] = 30;
    frame.data[fringe + 1] = 200;
    frame.data[fringe + 2] = 30;
    const [out] = keyChromaFrames([frame], CHROMA_GREEN);
    const edge = pixel(out, 4, 8);
    expect(edge[1]).toBeLessThanOrEqual(Math.max(edge[0], edge[2]));
    expect(pixel(out, 8, 8)[0]).toBe(250);
  });
});
