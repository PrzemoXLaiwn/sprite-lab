// Runware reports an empty prepaid balance as concurrentRequestLimitExceeded
// with the text "Insufficient available balance". That is not a bad model
// output and must not be retried or described as one.

export const PROVIDER_BALANCE_MESSAGE = "Provider balance too low";

export function isProviderBalanceMessage(msg: string): boolean {
  return /insufficient available balance|insufficientCredits|\binsufficient credits\b|top-?up/i.test(msg);
}
