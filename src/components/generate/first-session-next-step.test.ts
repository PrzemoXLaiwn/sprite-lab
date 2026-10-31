import { describe, expect, it } from "vitest";
import { shouldShowFirstSessionNext } from "@/components/generate/first-session-next-step";

describe("first-session next step", () => {
  it("shows once, after the first successful generation", () => {
    expect(shouldShowFirstSessionNext({ firstSuccess: true, alreadyShown: false })).toBe(true);
    expect(shouldShowFirstSessionNext({ firstSuccess: true, alreadyShown: true })).toBe(false);
    expect(shouldShowFirstSessionNext({ firstSuccess: false, alreadyShown: false })).toBe(false);
  });
});
