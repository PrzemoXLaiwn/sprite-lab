// =============================================================================
// Signup credits — the only number for what a new account starts with
// =============================================================================
// Permanent. Not tied to the relaunch dates in src/config/relaunch.ts.
// Every registration path, welcome email, and public mention of the free
// grant reads this constant. Do not add a second "bonus on top" for new
// accounts: src/lib/signup-grant.ts stamps the relaunch marker at insert
// so the campaign +10 cannot stack.
// =============================================================================

export const SIGNUP_CREDITS = 20;

/** "20 free credits" */
export const SIGNUP_FREE_CREDITS = `${SIGNUP_CREDITS} free credits`;

/** CTA button on tool, guide and compare pages. */
export const SIGNUP_CTA = `Get ${SIGNUP_CREDITS} free credits`;

/** Trust chip / short label. */
export const SIGNUP_ON_SIGNUP = `${SIGNUP_CREDITS} credits on signup`;

/** JSON-LD Offer description and similar one-liners. */
export const SIGNUP_OFFER = `${SIGNUP_CREDITS} free credits on signup`;
