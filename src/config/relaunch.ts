// =============================================================================
// Relaunch campaign ("SpriteLab is back") — client-safe constants
// =============================================================================
// Accounts created before STARTS_AT get RETURNING_BONUS (20) the first time
// they open the app during the campaign. Accounts that already received the
// old 15 get RETURNING_TOP_UP (5) once, so the welcome-back total is 20.
// Accounts created during the campaign but before the flat signup grant
// (no relaunchBonusAt stamp yet) still get NEW_USER_BONUS once: they were
// inserted with the old default of 10 and the welcome mail promised 20.
// Accounts created by src/lib/signup-grant.ts already have SIGNUP_CREDITS
// and are stamped, so this bonus cannot stack into 30.
// Each grant is once (enforced atomically in src/lib/relaunch.ts).
// The window is still through 31 December 2026 — production's main uses the
// same ENDS_AT.
// =============================================================================

import { SIGNUP_CREDITS } from "@/config/signup";

/** Welcome-back amount that was granted before this change. */
export const PREVIOUS_RETURNING_BONUS = 15;

export const RELAUNCH = {
  STARTS_AT: new Date("2026-10-07T00:00:00Z"),
  ENDS_AT: new Date("2026-12-31T23:59:59Z"),
  RETURNING_BONUS: 20,
  PREVIOUS_RETURNING_BONUS,
  /** One-time top-up so someone who already took 15 ends on 20. */
  RETURNING_TOP_UP: 20 - PREVIOUS_RETURNING_BONUS,
  /** Legacy top-up for accounts inserted with the old 10, not for new signups. */
  NEW_USER_BONUS: 10,
  /**
   * @deprecated Import SIGNUP_CREDITS from @/config/signup. Kept so older
   * call sites that still read RELAUNCH.SIGNUP_CREDITS cannot drift back to 10.
   */
  SIGNUP_CREDITS,
} as const;

export function relaunchActive(now = new Date()): boolean {
  return now >= RELAUNCH.STARTS_AT && now <= RELAUNCH.ENDS_AT;
}

/** Which bonus an account gets, by when it was created. */
export function relaunchBonusFor(createdAt: Date): { amount: number; kind: "returning" | "new" } {
  return createdAt < RELAUNCH.STARTS_AT
    ? { amount: RELAUNCH.RETURNING_BONUS, kind: "returning" }
    : { amount: RELAUNCH.NEW_USER_BONUS, kind: "new" };
}

type BonusPrefs = {
  relaunchBonusAt?: string;
  relaunchBonusAmount?: number | string;
  returningTopUpAt?: string;
} | null;

/** True when the next app visit should grant the one-time +5. */
export function needsReturningTopUp(createdAt: Date, prefs: BonusPrefs): boolean {
  if (!prefs?.relaunchBonusAt || prefs.returningTopUpAt) return false;
  if (createdAt >= RELAUNCH.STARTS_AT) return false;
  if (prefs.relaunchBonusAmount == null || prefs.relaunchBonusAmount === "") return true;
  return Number(prefs.relaunchBonusAmount) === RELAUNCH.PREVIOUS_RETURNING_BONUS;
}
