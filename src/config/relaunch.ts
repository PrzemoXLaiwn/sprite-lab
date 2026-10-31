// =============================================================================
// Relaunch campaign ("SpriteLab is back") — client-safe constants
// =============================================================================
// Accounts created before STARTS_AT get RETURNING_BONUS credits the first time
// they open the app during the campaign. Accounts created during the campaign
// before NEW_USER_BONUS_UNTIL got NEW_USER_BONUS on top of the usual 10 free
// credits; accounts created after it start with 10 and no bonus (owner's
// decision, 2026-10-19: 20 free credits meant nobody ever needed to buy).
// Each account can claim once (enforced atomically in src/lib/relaunch.ts).
// =============================================================================

export const RELAUNCH = {
  STARTS_AT: new Date("2026-10-07T00:00:00Z"),
  ENDS_AT: new Date("2026-12-31T23:59:59Z"),
  RETURNING_BONUS: 15,
  NEW_USER_BONUS: 10,
  /** New accounts created from this moment on get no relaunch bonus. */
  NEW_USER_BONUS_UNTIL: new Date("2026-10-19T20:00:00Z"),
  /** Credits every new account starts with (users.credits default). */
  SIGNUP_CREDITS: 10,
} as const;

export function relaunchActive(now = new Date()): boolean {
  return now >= RELAUNCH.STARTS_AT && now <= RELAUNCH.ENDS_AT;
}

/** Which bonus an account gets, by when it was created. */
export function relaunchBonusFor(createdAt: Date): { amount: number; kind: "returning" | "new" } {
  if (createdAt < RELAUNCH.STARTS_AT) return { amount: RELAUNCH.RETURNING_BONUS, kind: "returning" };
  return { amount: createdAt < RELAUNCH.NEW_USER_BONUS_UNTIL ? RELAUNCH.NEW_USER_BONUS : 0, kind: "new" };
}

/** Bonus a brand-new account gets on top of SIGNUP_CREDITS if it signs up now. */
export function newSignupBonus(now = new Date()): number {
  return relaunchActive(now) ? relaunchBonusFor(now).amount : 0;
}
