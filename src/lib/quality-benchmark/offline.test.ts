import { describe, expect, it } from "vitest";
import { currentPrompt, strictPrompt, BENCHMARK_CASES, DEFAULT_CAP_USD } from "./cases";
import { runOffline } from "./offline";

describe("quality benchmark fixtures", () => {
  it("builds a current prompt and a longer strict variant for every case", () => {
    for (const c of BENCHMARK_CASES) {
      const current = currentPrompt(c);
      const strict = strictPrompt(c);
      expect(current).toContain(c.subject.split(" ").slice(0, 3).join(" "));
      expect(current.toLowerCase()).toContain("background");
      expect(strict.startsWith(current)).toBe(true);
      expect(strict.length).toBeGreaterThan(current.length);
    }
  });

  it("caps a live run at three dollars", () => {
    expect(DEFAULT_CAP_USD).toBe(3);
  });

  it("improves halo, alignment and palette on synthetic images", async () => {
    const { rows, sheet } = await runOffline();
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId["white-halo"].after.lightFringe).toBeLessThan(byId["white-halo"].before.lightFringe);
    expect(byId["white-halo"].after.centerOffset).toBeLessThan(byId["white-halo"].before.centerOffset);
    expect(byId["frame-align"].before.sameCanvas).toBe(0);
    expect(byId["frame-align"].after.sameCanvas).toBe(1);
    expect(byId["frame-align"].after.footDelta).toBe(0);
    expect(byId["frame-align"].after.heightDelta).toBeLessThanOrEqual(1);
    expect(byId["palette-lock"].after.uniqueColors).toBeLessThan(byId["palette-lock"].before.uniqueColors);
    expect(byId["crouch-kept"].after.crouchOverStand).toBeLessThan(0.8);
    expect(sheet.length).toBeGreaterThan(500);
  });
});
