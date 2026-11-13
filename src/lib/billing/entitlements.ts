// What a paid plan can do that Free cannot. Pure. Server routes enforce it.
// ADMIN and OWNER are treated as paid so staff can check the exports.

import { SIGNUP_CREDITS } from "@/config/signup";
import { animationCredits } from "@/config/animations";

const PAID_PLANS = new Set(["STARTER", "PRO", "UNLIMITED", "LIFETIME"]);

export function hasPaidPerks(plan: string | null | undefined, role?: string | null): boolean {
  if (role === "ADMIN" || role === "OWNER") return true;
  return PAID_PLANS.has(plan ?? "");
}

/** Hourly generation cap. Paid plans get the higher limit; Free stays well above a normal session. */
export function generationHourlyLimit(plan: string | null | undefined, role?: string | null): number {
  return hasPaidPerks(plan, role) ? 120 : 20;
}

/** Standard sprite + one 4-frame animation with smooth off. Must fit the free grant. */
export const FIRST_RUN_SPRITE_CREDITS = 1;
export const FIRST_RUN_FRAMES = 4;

export function firstRunCreditCost(): number {
  return FIRST_RUN_SPRITE_CREDITS + animationCredits(FIRST_RUN_FRAMES, false);
}

export function firstRunFitsFreeGrant(grant = SIGNUP_CREDITS): boolean {
  return firstRunCreditCost() <= grant;
}
