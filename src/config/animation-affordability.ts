// Whether the default animation fits the credits the account has right now.
// Free signup is 10 credits. Smooth motion on 4 frames costs 12, so a first
// animation with smooth left on is refused before it starts. Callers that
// have not been touched by the user should use pickAffordableAnimation.

import { ANIMATION_FRAME_OPTIONS, animationCredits, animationFrameOption } from "@/config/animations";

export interface AffordableAnimation {
  frames: number;
  smooth: boolean;
}

/**
 * Prefer the requested frame count with smooth motion when the balance covers
 * it. Otherwise drop smooth, then step down to a cheaper frame count. When
 * nothing fits, return the cheapest option with smooth off so the paywall can
 * name a real price.
 */
export function pickAffordableAnimation(balance: number, preferredFrames: number): AffordableAnimation {
  const preferred = animationFrameOption(preferredFrames).frames;
  if (balance >= animationCredits(preferred, true)) return { frames: preferred, smooth: true };
  if (balance >= animationCredits(preferred, false)) return { frames: preferred, smooth: false };
  const cheaper = [...ANIMATION_FRAME_OPTIONS].sort((a, b) => a.credits - b.credits);
  for (const option of cheaper) {
    if (balance >= animationCredits(option.frames, false)) return { frames: option.frames, smooth: false };
  }
  const cheapest = cheaper[0] ?? ANIMATION_FRAME_OPTIONS[0];
  return { frames: cheapest.frames, smooth: false };
}

/** Four-frame animations (smooth off) a monthly allowance covers. */
export function fourFrameAnimationsPerMonth(credits: number): number {
  const each = ANIMATION_FRAME_OPTIONS[0].credits;
  if (each <= 0) return 0;
  return Math.max(0, Math.floor(credits / each));
}
