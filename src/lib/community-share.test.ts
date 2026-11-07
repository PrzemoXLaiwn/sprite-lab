import { describe, expect, it } from "vitest";
import {
  idleShare,
  shareActionLabel,
  shareCaption,
  shareFailed,
  shareRequested,
  shareSucceeded,
  shareToast,
  visibilityFromHistory,
} from "./community-share";

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

  it("does not call an unknown sprite private", () => {
    expect(visibilityFromHistory(undefined)).toBeNull();
    expect(visibilityFromHistory(true)).toBe(true);
    expect(visibilityFromHistory(false)).toBe(false);
    expect(shareCaption(null).body).not.toMatch(/only you can see it/i);
    expect(shareCaption(null).title).not.toMatch(/in the community gallery/i);
    expect(shareActionLabel(null)).toBeNull();
  });
});

describe("share request keeps the confirmed visibility", () => {
  it("a failed hide still says the sprite is public and offers hide again", () => {
    const failed = shareFailed(shareRequested(idleShare(true)), "HTTP 500");
    expect(failed.published).toBe(true);
    expect(failed.pending).toBe(false);
    expect(failed.error).toBe("HTTP 500");
    expect(shareCaption(failed.published).title).toBe("In the community gallery");
    expect(shareActionLabel(failed.published)).toBe("Make private again");
    const hidden = shareSucceeded(shareRequested(failed), false);
    expect(hidden.published).toBe(false);
    expect(hidden.error).toBeNull();
  });

  it("a failed publish still says the sprite is private and offers share again", () => {
    const failed = shareFailed(shareRequested(idleShare(false)), "network");
    expect(failed.published).toBe(false);
    expect(shareCaption(failed.published).title).toBe("Saved privately in Assets");
    expect(shareActionLabel(failed.published)).toBe("Share to the community gallery");
  });

  it("pending does not flip the confirmed label", () => {
    const pending = shareRequested(idleShare(true));
    expect(pending.pending).toBe(true);
    expect(pending.published).toBe(true);
    expect(shareActionLabel(pending.published)).toBe("Make private again");
  });
});
