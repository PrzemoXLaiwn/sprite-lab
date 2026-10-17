// =============================================================================
// Relaunch campaign ("SpriteLab is back") — client-safe constants
// =============================================================================
// Accounts created before STARTS_AT get RETURNING_BONUS credits the first time
// they open the app during the campaign. That +15 is unchanged.
//
// Accounts created during the campaign but before the flat signup grant
// (no relaunchBonusAt stamp yet) still get NEW_USER_BONUS once: they were
// inserted with the old default of 10 and the welcome mail promised 20.
// Accounts created by src/lib/signup-grant.ts already have SIGNUP_CREDITS
// and are stamped, so this bonus cannot stack into 30.
// Each account can claim once (enforced atomically in src/lib/relaunch.ts).
// =============================================================================

import { SIGNUP_CREDITS } from "@/config/signup";

export const RELAUNCH = {
  STARTS_AT: new Date("2026-10-07T00:00:00Z"),
  ENDS_AT: new Date("2026-12-31T23:59:59Z"),
  RETURNING_BONUS: 15,
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
