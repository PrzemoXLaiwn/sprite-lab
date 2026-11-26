// Runware reports an empty prepaid balance as concurrentRequestLimitExceeded
// with the text "Insufficient available balance". That is not a bad model
// output and must not be retried or described as one.

export const PROVIDER_BALANCE_MESSAGE = "This is temporarily unavailable.";

export function isProviderBalanceMessage(msg: string): boolean {
  return /insufficient available balance|insufficientCredits|\binsufficient credits\b|top-?up/i.test(msg);
}

/** What the person using the feature sees. The owner gets a separate ops alert. */
export function providerUnavailableMessage(feature: string, charged: boolean): string {
  return charged
    ? `${feature} — temporarily unavailable. Your credits were refunded.`
    : `${feature} — temporarily unavailable. Nothing was charged.`;
}
