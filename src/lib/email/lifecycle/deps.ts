// Real wiring for the lifecycle run (tests pass their own LifecycleDeps).

import { claimLifecycleDay, mergeEmailPreferences } from "@/app/api/_lib/email-prefs";
import { unsubscribeUrl } from "../unsubscribe";
import { loadLifecycleAudience, loadSendStats } from "./data";
import { sendLifecycleEmail } from "./send";
import type { LifecycleDeps } from "./run";

/** Master switch for every marketing email (see ../flags.ts). Off unless exactly "true". */
export { marketingEmailsEnabled } from "../flags";

export const lifecycleDeps: LifecycleDeps = {
  loadAudience: loadLifecycleAudience,
  loadSendStats,
  unsubscribeUrl,
  claimDay: claimLifecycleDay,
  send: sendLifecycleEmail,
  markSent: mergeEmailPreferences,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
