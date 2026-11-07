import { describe, expect, it } from "vitest";
import { trapIndex } from "./focus-trap";

describe("trapIndex", () => {
  it("wraps Tab from the last control to the first, and Shift+Tab the other way", () => {
    expect(trapIndex(2, 3, false)).toBe(0);
    expect(trapIndex(0, 3, true)).toBe(2);
    expect(trapIndex(1, 3, false)).toBe(2);
    expect(trapIndex(1, 3, true)).toBe(0);
  });

  it("stays put when a dialog has a single control", () => {
    expect(trapIndex(0, 1, false)).toBe(0);
    expect(trapIndex(-1, 4, false)).toBe(0);
  });
});
