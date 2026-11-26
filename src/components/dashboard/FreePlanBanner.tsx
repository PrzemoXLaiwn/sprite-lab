"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { starterCheckoutHref } from "@/config/starter-first-month";

const HIDE_KEY = "sl:free-plan-banner:hidden";

/** In-app nudge for a free account. No email is sent. */
export function FreePlanBanner({ offerEnabled }: { offerEnabled: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(HIDE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);
  if (!visible) return null;
  return (
    <div className="border-b border-white/[0.06] bg-[#19223F] px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13.5px] leading-snug text-[#C8CCE8]">
          <span className="font-medium text-[#FFF1E8]">Free credits make static sprites.</span>
          {" "}Animations, directions and edits are on Starter or a one-time credit pack.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={starterCheckoutHref(offerEnabled)} className="btn btn-primary h-10 px-4 text-[13px]">Get Starter</Link>
          <Link href="/pricing#credit-packs" className="btn btn-secondary h-10 px-4 text-[13px]">Credit packs</Link>
          <button
            type="button"
            className="btn btn-ghost h-10 px-3 text-[13px]"
            onClick={() => {
              try { window.localStorage.setItem(HIDE_KEY, "1"); } catch { /* ignore */ }
              setVisible(false);
            }}
          >
            Hide
          </button>
        </div>
      </div>
    </div>
  );
}
