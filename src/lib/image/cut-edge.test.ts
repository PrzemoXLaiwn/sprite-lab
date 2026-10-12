import { describe, expect, it } from "vitest";
import { hasCutEdge, type Raw } from "./animation";

/** An oval figure: its outline touches the bounding box at only a few pixels. */
function oval(w = 60, h = 120): Raw {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2);
    if (dx * dx + dy * dy <= 1) data[(y * w + x) * 4 + 3] = 255;
  }
  return { data, width: w, height: h };
}

/** Columns [x0, x1) of a frame — what a straight grid cut leaves behind. */
function slice(f: Raw, x0: number, x1: number): Raw {
  const w = x1 - x0, data = Buffer.alloc(w * f.height * 4);
  for (let y = 0; y < f.height; y++) f.data.copy(data, y * w * 4, (y * f.width + x0) * 4, (y * f.width + x1) * 4);
  return { data, width: w, height: f.height };
}

describe("hasCutEdge", () => {
  it("accepts a whole figure", () => {
    expect(hasCutEdge(oval())).toBe(false);
  });

  it("flags either half of a figure sliced down the middle", () => {
    const f = oval();
    expect(hasCutEdge(slice(f, 0, 30))).toBe(true);
    expect(hasCutEdge(slice(f, 30, 60))).toBe(true);
  });
});
