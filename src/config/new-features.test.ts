import { describe, expect, it } from "vitest";
import { isNewFeature } from "./new-features";

describe("isNewFeature", () => {
  it("shows the dungeon badge for two weeks, then hides it", () => {
    expect(isNewFeature("/play", new Date("2026-10-17T12:00:00Z"))).toBe(true);
    expect(isNewFeature("/play", new Date("2026-10-31T23:00:00Z"))).toBe(true);
    expect(isNewFeature("/play", new Date("2026-11-01T00:00:01Z"))).toBe(false);
  });

  it("is false for anything not listed", () => {
    expect(isNewFeature("/generate", new Date("2026-10-20T00:00:00Z"))).toBe(false);
  });
});
