import { describe, expect, it } from "vitest";
import { MIN_INDEXED_PROFILE_ASSETS, shouldIndexProfile } from "./profile-indexing";

describe("shouldIndexProfile", () => {
  it("keeps thin profiles out of the index", () => {
    expect(shouldIndexProfile(0)).toBe(false);
    expect(shouldIndexProfile(MIN_INDEXED_PROFILE_ASSETS - 1)).toBe(false);
  });
  it("indexes profiles with enough public work", () => {
    expect(shouldIndexProfile(MIN_INDEXED_PROFILE_ASSETS)).toBe(true);
    expect(shouldIndexProfile(40)).toBe(true);
  });
});
