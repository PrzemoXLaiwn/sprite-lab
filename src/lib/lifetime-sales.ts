// Lifetime deals grant credits every month with no end date, so new sales are
// paused (Oct 2026 profitability audit). Existing lifetime customers keep
// everything: paid intents are still fulfilled, webhooks and the monthly
// credit cron are untouched. Re-open with LIFETIME_SALES_ENABLED=true.
export function lifetimeSalesEnabled(): boolean {
  return process.env.LIFETIME_SALES_ENABLED === "true";
}

export const LIFETIME_PAUSED_MESSAGE = "Lifetime deals aren't available right now. Monthly plans and credit packs are.";
