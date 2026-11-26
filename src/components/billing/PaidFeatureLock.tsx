"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { starterCheckoutHref } from "@/config/starter-first-month";

export function useAccountAccess() {
  const [access, setAccess] = useState({ ready: false, paidGeneration: true, starterOffer: false });
  useEffect(() => {
    let cancel = false;
    fetch("/api/user/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((stats) => {
        if (cancel) return;
        const upsell = stats?.starterUpsell ?? {};
        setAccess({
          ready: true,
          paidGeneration: stats?.paidGeneration !== false,
          starterOffer: upsell.offerEnabled === true && upsell.eligible === true,
        });
      })
      .catch(() => {
        if (!cancel) setAccess((current) => ({ ...current, ready: true }));
      });
    return () => {
      cancel = true;
    };
  }, []);
  return access;
}

/** Replaces a paid action so a free account never presses a button that fails. */
export function PaidFeatureLock({ feature, offer = false }: { feature: string; offer?: boolean }) {
  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-[#212B4E] p-3">
      <p className="text-[13.5px] font-medium leading-snug text-[#FFF1E8]">{feature} needs a paid plan or a credit pack.</p>
      <p className="mt-1 text-[12.5px] leading-snug text-[#A7ADD4]">
        Static sprites stay free. Pack credits do not expire. A commercial licence is on the monthly plans.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <Link href={starterCheckoutHref(offer)} className="btn btn-primary">Get Starter</Link>
        <Link href="/pricing#credit-packs" className="btn btn-secondary">Buy a credit pack</Link>
      </div>
    </div>
  );
}
