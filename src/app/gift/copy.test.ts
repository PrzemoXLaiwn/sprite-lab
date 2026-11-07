import { describe, expect, it } from "vitest";
import { giftPageCopy } from "./copy";

describe("gift page copy", () => {
  it("shows the amount only when credits were actually added", () => {
    expect(giftPageCopy("claimed", 15).title).toBe("+15 credits added");
  });

  it("does not celebrate a second click, or a visit with no gift, as +0 credits", () => {
    expect(giftPageCopy("claimed", 0).title).toBe("Already claimed");
    expect(giftPageCopy("already", 0).title).toBe("Already claimed");
    expect(giftPageCopy(undefined, 0).title).toBe("This link isn't valid");
    expect(giftPageCopy("invalid", 0).title).toBe("This link isn't valid");
  });
});
