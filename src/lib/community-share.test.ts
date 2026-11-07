import { describe, expect, it } from "vitest";
import { shareActionLabel, shareCaption, shareToast } from "./community-share";

describe("community share copy", () => {
  it("keeps a new sprite private until the person publishes it", () => {
    expect(shareActionLabel(false)).toBe("Share to the community gallery");
    expect(shareCaption(false).title).toMatch(/privately/i);
    expect(shareCaption(false).body).toMatch(/optional/i);
    expect(shareCaption(false).body).toMatch(/prompt/);
  });

  it("says what leaving the gallery does", () => {
    expect(shareActionLabel(true)).toBe("Make private again");
    expect(shareToast(false).title).toBe("Private again");
    expect(shareToast(true).body).toMatch(/other sprites stay private/i);
  });
});
