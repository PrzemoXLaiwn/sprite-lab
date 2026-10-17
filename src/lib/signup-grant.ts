// =============================================================================
// What a brand-new account row is inserted with
// =============================================================================
// credits is SIGNUP_CREDITS (the flat grant). relaunchBonusAt is set in the
// same write so claimRelaunchBonus cannot add the campaign new-user bonus
// on top. Returning accounts are never inserted here — they already exist
// and still claim RETURNING_BONUS once, unchanged.

import { SIGNUP_CREDITS } from "@/config/signup";

export function newAccountGrant(now = new Date()): {
  credits: number;
  emailPreferences: { relaunchBonusAt: string; signupCredits: number };
} {
  return {
    credits: SIGNUP_CREDITS,
    emailPreferences: {
      relaunchBonusAt: now.toISOString(),
      signupCredits: SIGNUP_CREDITS,
    },
  };
}
