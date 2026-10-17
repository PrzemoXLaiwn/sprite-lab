// The server path end to end on synthetic PNGs (data: URLs, no network):
// sheet → frames with sharp → spectacle score.
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { analyseAnimation } from "./skill-analyse";

const FW = 32, FH = 32;

async function png(width: number, height: number, paint: (x: number, y: number) => [number, number, number, number] | null): Promise<string> {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const c = paint(x, y);
    if (c) data.set(c, (y * width + x) * 4);
  }
  const buf = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

const knight = (x: number, y: number, dx = 0): [number, number, number, number] | null =>
  x >= 11 + dx && x < 21 + dx && y >= 14 && y < 30 ? [120, 120, 130, 255] : null;

describe("analyseAnimation", () => {
  it("a still sheet is Common; a moving fire attack scores far higher", async () => {
    const sprite = await png(FW, FH, (x, y) => knight(x, y));
    const still = await png(FW * 4, FH, (x, y) => knight(x % FW, y));
    const fire = await png(FW * 6, FH, (x, y) => {
      const f = Math.floor(x / FW), lx = x % FW;
      return knight(lx, y, f % 3) ?? (y >= 16 && y < 24 && lx >= 21 && lx < 21 + f * 2 ? ([255, 90 + f * 20, 0, 255] as [number, number, number, number]) : null);
    });
    const a = await analyseAnimation({ prompt: "[Animation: attack, 4f] knight", imageUrl: still }, sprite);
    const b = await analyseAnimation({ prompt: "[Animation: fire breath, 6f] knight", imageUrl: fire }, sprite);
    expect(a.tier).toBe("common");
    expect(a.metrics.motion).toBe(0);
    expect(b.score).toBeGreaterThan(a.score + 20);
    expect(b.metrics.reach).toBeGreaterThan(1);
    expect(b.metrics.newColours).toBeGreaterThan(0);
  });

  it("refuses prompts that aren't animations", async () => {
    await expect(analyseAnimation({ prompt: "a knight", imageUrl: "data:image/png;base64,AAAA" }, null)).rejects.toThrow();
  });
});
