import { describe, expect, it } from "vitest";
import { animationCredits } from "./animations";
import { PLAN_MONTHLY_CREDITS, PLAN_MONTHLY_PRICE_GBP } from "./plan-features";
import { fourFrameAnimationsPerMonth, pickAffordableAnimation } from "./animation-affordability";
import { SIGNUP_CREDITS } from "./signup";

describe("pickAffordableAnimation", () => {
  it("names the cheapest animation when a free grant cannot pay for one", () => {
    const choice = pickAffordableAnimation(SIGNUP_CREDITS, 4);
    expect(choice).toEqual({ frames: 4, smooth: false });
    expect(animationCredits(choice.frames, choice.smooth)).toBeGreaterThan(SIGNUP_CREDITS);
    expect(animationCredits(4, true)).toBeGreaterThan(SIGNUP_CREDITS);
  });

  it("steps a 6-frame request down when even the unsmoothed price is over the balance", () => {
    expect(pickAffordableAnimation(12, 6)).toEqual({ frames: 4, smooth: false });
  });

  it("keeps smooth on when the balance covers it", () => {
    expect(pickAffordableAnimation(animationCredits(6, true), 6)).toEqual({ frames: 6, smooth: true });
  });

  it("drops only smooth when the key frames fit and the in-betweens do not", () => {
    expect(pickAffordableAnimation(animationCredits(6, false), 6)).toEqual({ frames: 6, smooth: false });
  });

  it("still names the cheapest animation when nothing fits", () => {
    expect(pickAffordableAnimation(0, 9)).toEqual({ frames: 4, smooth: false });
    expect(pickAffordableAnimation(3, 9)).toEqual({ frames: 4, smooth: false });
  });
});

describe("fourFrameAnimationsPerMonth", () => {
  it("counts whole 4-frame animations in each paid allowance", () => {
    expect(fourFrameAnimationsPerMonth(PLAN_MONTHLY_CREDITS.STARTER)).toBe(22);
    expect(fourFrameAnimationsPerMonth(PLAN_MONTHLY_CREDITS.PRO)).toBe(63);
    expect(fourFrameAnimationsPerMonth(PLAN_MONTHLY_CREDITS.UNLIMITED)).toBe(145);
    expect(PLAN_MONTHLY_PRICE_GBP.PRO).toBe(12);
  });
});
