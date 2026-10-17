/** Fixed date the paid-only commercial licence took effect. Do not derive this from "today". */
export const LICENCE_CHANGE_DATE = "17 October 2026";

/**
 * One answer for FAQs, comparisons and other public copy.
 * Commercial use is included only on Starter, Pro and Studio.
 * Free-plan assets made before LICENCE_CHANGE_DATE keep the licence
 * that applied when they were created.
 */
export const COMMERCIAL_LICENCE_ANSWER =
  `Commercial use is included on the Starter, Pro and Studio plans, with no attribution required, for assets generated while that plan is active. The Free plan, and tries made without an account, are for personal, non-commercial use only. Assets generated on the Free plan before ${LICENCE_CHANGE_DATE} keep the licence that applied when they were created. You may not sell generated assets on their own as stock packs or a sprite library. The full rules are in the terms.`;

/** Short label for trust lines and plan-feature chips. */
export const COMMERCIAL_LICENCE_SHORT = "commercial licence on paid plans";
