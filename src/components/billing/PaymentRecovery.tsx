"use client";

import Link from "next/link";
import { CREDIT_PACK_CARDS, formatPence } from "@/app/(public-app)/pricing/pricing-data";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/app/(dashboard)/checkout/_components/checkout-ui";

const BLAZE = CREDIT_PACK_CARDS.find((pack) => pack.slug === "blaze") ?? CREDIT_PACK_CARDS[1];

/** Shown when a card payment fails, instead of a message with nowhere to go. */
export function PaymentRecovery({
  message,
  onTryAnother,
}: {
  message: string;
  onTryAnother?: () => void;
}) {
  return (
    <div role="alert" className="space-y-3">
      <p className="rounded-xl border border-red-400/20 bg-red-500/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-red-200">
        {message}
      </p>
      <p className="text-[13px] leading-relaxed text-[#C8CCE8]">
        Buy the {BLAZE.name} pack instead: {BLAZE.credits} credits for {formatPence(BLAZE.price)}, paid once. Or use a different card on this subscription.
      </p>
      <Link
        href={`/checkout/credits/${BLAZE.slug}`}
        className={`flex h-11 w-full items-center justify-center text-[14px] ${BTN_PRIMARY}`}
      >
        Buy {BLAZE.credits} credits · {formatPence(BLAZE.price)}
      </Link>
      {onTryAnother && (
        <button
          type="button"
          onClick={onTryAnother}
          className={`flex h-11 w-full items-center justify-center text-[14px] ${BTN_SECONDARY}`}
        >
          Try another payment method
        </button>
      )}
    </div>
  );
}
