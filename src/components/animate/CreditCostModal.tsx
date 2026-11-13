"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { X } from "lucide-react";
import { CREDIT_PACK_CARDS, formatPence } from "@/app/(public-app)/pricing/pricing-data";
import { starterCheckoutHref } from "@/config/starter-first-month";
import { recordFunnel } from "@/lib/funnel-client";

const BLAZE = CREDIT_PACK_CARDS.find((pack) => pack.slug === "blaze") ?? CREDIT_PACK_CARDS[1];

export interface CheaperAnimationChoice {
  label: string;
  credits: number;
}

/**
 * Balance is above zero but short of this animation. Names both numbers,
 * offers the cheaper setup, and puts the £2.99 pack ahead of Starter.
 */
export function CreditCostModal({
  open,
  cost,
  balance,
  cheaper,
  offerEnabled,
  onUseCheaper,
  onClose,
}: {
  open: boolean;
  cost: number;
  balance: number;
  cheaper: CheaperAnimationChoice | null;
  offerEnabled: boolean;
  onUseCheaper: () => void;
  onClose: () => void;
}) {
  const [tracked, setTracked] = useState(false);
  useEffect(() => {
    if (!open) {
      setTracked(false);
      return;
    }
    if (tracked) return;
    setTracked(true);
    recordFunnel("paywall_shown", { surface: "animate", cost, balance });
  }, [open, tracked, cost, balance]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/[0.08] bg-[#19223F] p-5 text-[#FFF1E8] shadow-2xl outline-none sm:p-6">
          <Dialog.Close asChild>
            <button type="button" aria-label="Close" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-[#9AA1CC] hover:bg-white/[0.06] hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
          <Dialog.Title className="pr-10 font-display text-[22px] font-semibold tracking-tight text-white">
            Not enough credits for this animation
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[15px] leading-relaxed text-[#FFF1E8]">
            This costs {cost} credits. You have {balance}.
          </Dialog.Description>
          {cheaper && (
            <button
              type="button"
              onClick={onUseCheaper}
              className="mt-4 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/[0.1] bg-[#212B4E] px-3 py-2.5 text-left text-[13px] text-[#C8CCE8] hover:border-[#FFA300]/50"
            >
              <span>{cheaper.label}</span>
              <span className="font-mono text-[#FFC857]">{cheaper.credits} credits</span>
            </button>
          )}
          <Link
            href={`/checkout/credits/${BLAZE.slug}`}
            className="px-corners mt-4 flex h-11 w-full items-center justify-center bg-[#FFA300] text-[14px] font-semibold text-[#131A31] hover:bg-[#FFB733]"
          >
            Buy {BLAZE.credits} credits · {formatPence(BLAZE.price)}
          </Link>
          <Link
            href={starterCheckoutHref(offerEnabled)}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-[14px] font-medium text-[#C8CCE8] hover:bg-white/[0.08] hover:text-white"
          >
            Get Starter instead
          </Link>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
