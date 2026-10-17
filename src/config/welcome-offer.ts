// =============================================================================
// Welcome offer — bonus credits on credit packs in the first 72 hours
// =============================================================================
// New accounts get each pack's `bonus` credits (CREDIT_PACKS in
// src/lib/stripe.ts, +20–30%) on packs bought within WELCOME_OFFER_HOURS of
// signing up. The countdown is real (per account), never a fake timer.
// Profitability: the economics report models every pack WITH its bonus
// (PACK_*+BONUS rows) — still above every subscription plan per credit.
// The bonus is part of the purchase's credits (PaymentIntent metadata), so a
// refund or dispute reverses it together with the pack.
// =============================================================================

export const WELCOME_OFFER_HOURS = 72;

export function welcomeOfferEndsAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + WELCOME_OFFER_HOURS * 3_600_000);
}

export function welcomeOfferActive(createdAt: Date | null | undefined, now = new Date()): boolean {
  return Boolean(createdAt) && now < welcomeOfferEndsAt(createdAt as Date);
}
