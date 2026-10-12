// =============================================================================
// Relaunch campaign ("SpriteLab is back") — client-safe constants
// =============================================================================
// Accounts created before STARTS_AT get RETURNING_BONUS credits the first time
// they open the app during the campaign. Accounts created during the campaign
// get NEW_USER_BONUS on top of the usual 10 free credits. Each account can
// claim once (enforced atomically in src/lib/relaunch.ts).
// =============================================================================

export const RELAUNCH = {
  STARTS_AT: new Date("2026-10-07T00:00:00Z"),
  ENDS_AT: new Date("2026-12-31T23:59:59Z"),
  RETURNING_BONUS: 15,
  NEW_USER_BONUS: 10,
  /** Credits every new account starts with (users.credits default). */
  SIGNUP_CREDITS: 10,
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
