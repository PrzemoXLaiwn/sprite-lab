import { describe, expect, it } from "vitest";
import { parseCancelNote, parseCancelReason, retentionOffer } from "./cancellation";

describe("cancellation reasons", () => {
  it("accepts the listed reasons and rejects anything else", () => {
    expect(parseCancelReason("too_expensive")).toBe("too_expensive");
    expect(parseCancelReason("other")).toBe("other");
    expect(parseCancelReason("refund")).toBeNull();
    expect(parseCancelReason(1)).toBeNull();
  });

  it("trims a note and drops an empty one", () => {
    expect(parseCancelNote("  too many credits  ")).toBe("too many credits");
    expect(parseCancelNote("   ")).toBeNull();
    expect(parseCancelNote(null)).toBeNull();
    expect(parseCancelNote("a".repeat(600))?.length).toBe(500);
  });
});

describe("retention offer", () => {
  it("pauses when no save coupon is configured", () => {
    expect(retentionOffer({})).toEqual({ kind: "pause_30", days: 30 });
    expect(retentionOffer({ STRIPE_COUPON_CANCEL_SAVE: "  " })).toEqual({ kind: "pause_30", days: 30 });
  });

  it("offers the server coupon and never a browser-supplied id", () => {
    expect(retentionOffer({ STRIPE_COUPON_CANCEL_SAVE: "  coupon_save  " })).toEqual({
      kind: "discount",
      couponId: "coupon_save",
    });
  });
});
