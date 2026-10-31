// Direction sheets ask for one figure per direction in a single row (4) or two rows (8):
// a 2×2 request came back as 8-figure turnarounds with mirrored copies.
import { describe, expect, it } from "vitest";
import { buildRotationPrompt, ROTATIONS } from "./animations";

describe("buildRotationPrompt", () => {
  it("4 directions: one row, exactly four figures, no duplicates", () => {
    const r = ROTATIONS.find((x) => x.id === "rotate4")!;
    expect([r.cols, r.rows]).toEqual([4, 1]);
    const p = buildRotationPrompt({ directions: 4, cols: r.cols, rows: r.rows, pixel: true, subject: "a knight" });
    expect(p).toMatch(/ONE row of exactly 4 views/);
    expect(p).toMatch(/Exactly 4 figures on the page, each direction drawn once/);
    expect(p).toMatch(/never add mirrored copies/);
    expect(p).not.toMatch(/Leave the last/);
  });

  it("8 directions: two rows of four, nothing left empty", () => {
    const r = ROTATIONS.find((x) => x.id === "rotate8")!;
    expect([r.cols, r.rows]).toEqual([4, 2]);
    const p = buildRotationPrompt({ directions: 8, cols: r.cols, rows: r.rows, pixel: false, subject: "a knight" });
    expect(p).toMatch(/2 rows of 4 views/);
    expect(p).toMatch(/Exactly 8 figures/);
    expect(p).not.toMatch(/Leave the last/);
  });
});
