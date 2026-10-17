// Server-only promo codes for special-offer mail.
// Missing, blank, or the literal "undefined" means the message goes out
// without a code section. Never interpolate an unset env var into the body.

const UNSET = new Set(["", "undefined"]);

/** Drop values that would render as an empty or bogus code. */
export function visiblePromoCode(raw: string | undefined | null): string | undefined {
  const value = (raw ?? "").trim();
  if (UNSET.has(value.toLowerCase())) return undefined;
  return value;
}

/** Comeback offer (inactive more than 30 days). */
export function comebackPromoCode(): string | undefined {
  return visiblePromoCode(process.env.PROMO_CODE_COMEBACK);
}

/** Shorter-absence offer (inactive more than 14 days). */
export function welcomePromoCode(): string | undefined {
  return visiblePromoCode(process.env.PROMO_CODE_WELCOME);
}
