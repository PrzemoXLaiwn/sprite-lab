import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source check, not a live crawl. Locks the facts assistants repeat.
// Do not import the route here: it pulls the generation service.
const src = readFileSync(join(process.cwd(), "src/app/llms.txt/route.ts"), "utf8");

describe("llms.txt facts", () => {
  it("describes a game-asset platform, not a pixel-only tool", () => {
    expect(src).toContain("AI game asset platform");
    expect(src).toContain("realistic");
    expect(src).toContain("Pixel art is one of the styles, not the whole product");
  });

  it("does not deny the walks the product actually makes", () => {
    expect(src).not.toContain("per-direction walk animations");
    expect(src).toContain("4-direction walk");
    expect(src).toContain("side-view walk");
    expect(src).toContain("animated 8-direction walk");
  });
});
