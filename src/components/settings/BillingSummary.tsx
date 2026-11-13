"use client";

import Link from "next/link";
import { Coins, CreditCard, Loader2, Sparkles } from "lucide-react";
import type { PlanAccess } from "@/lib/billing/plan-access";

const BTN_PRIMARY =
  "px-corners inline-flex min-h-10 items-center justify-center gap-2 bg-[#FFA300] px-4 py-2.5 text-[13px] font-semibold text-[#131A31] transition hover:bg-[#FFB733] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[13px] font-medium text-[#C8CCE8] transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

/** Renewal sentence and billing actions. Credits stay in the page that has them. */
export function BillingSummary({
  summary,
  status,
  canManage,
  portal,
  onManage,
  onCancel,
}: {
  summary: string;
  status: PlanAccess["status"] | "loading";
  canManage: boolean;
  portal: "idle" | "opening" | "error";
  onManage: () => void;
  onCancel?: () => void;
}) {
  const showUpgrade = status === "free" || status === "loading";
  return (
    <div data-billing-status={status}>
      <p className="mt-4 text-[14px] leading-relaxed text-[#FFF1E8]" role="status">{summary}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {showUpgrade && (
          <Link href="/pricing" className={BTN_PRIMARY}>
            <Sparkles className="h-4 w-4" aria-hidden /> Upgrade
          </Link>
        )}
        {canManage && (
          <button type="button" onClick={onManage} disabled={portal === "opening"} className={BTN_SECONDARY}>
            {portal === "opening" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CreditCard className="h-4 w-4" aria-hidden />}
            {portal === "opening" ? "Opening billing…" : "Manage billing"}
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
            Cancel plan
          </button>
        )}
        <Link href="/pricing" className={BTN_SECONDARY}>
          <Coins className="h-4 w-4" aria-hidden /> {status === "free" || status === "loading" ? "Buy credits" : "Plans"}
        </Link>
      </div>
      {canManage && (
        <p className="mt-3 text-[12px] leading-relaxed text-[#9AA1CC]">
          Manage billing opens Stripe, where you can change card or switch plan. Cancel plan asks why you are leaving and offers a pause before that. A cancelled plan keeps working until the date already paid for.
        </p>
      )}
      {portal === "error" && (
        <p role="alert" className="mt-2 text-[13px] text-[#FFC857]">Couldn&apos;t open billing. Try again in a moment.</p>
      )}
    </div>
  );
}
