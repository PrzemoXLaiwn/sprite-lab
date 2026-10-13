// Real wiring for the lifecycle run (tests pass their own LifecycleDeps).

import { claimLifecycleDay, mergeEmailPreferences } from "@/app/api/_lib/email-prefs";
import { unsubscribeUrl } from "../unsubscribe";
import { loadLifecycleAudience } from "./data";
import { sendLifecycleEmail } from "./send";
import type { LifecycleDeps } from "./run";

/** Master switch for every lifecycle email. Off unless exactly "true". */
export function marketingEmailsEnabled(): boolean {
  return process.env.MARKETING_EMAILS_ENABLED === "true";
}

export const lifecycleDeps: LifecycleDeps = {
  loadAudience: loadLifecycleAudience,
  unsubscribeUrl,
  claimDay: claimLifecycleDay,
  send: sendLifecycleEmail,
  markSent: mergeEmailPreferences,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
