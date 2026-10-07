"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Users, Coins, Share2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// =============================================================================
// ReferralCard — surface the referral system that already exists in the API
// =============================================================================
// /api/referral has been live for a while: it generates a per-user code,
// tracks referredBy on signup, and pays out 10 credits to the referrer when
// their referee makes their first purchase. There was no UI for any of it,
// which made the whole feature dead from the user's POV.
//
// This card mounts on /settings and exposes:
//   - The user's share link with copy-to-clipboard
//   - Referral count + credits earned counter
//   - Quick "share to Twitter / X" button
// =============================================================================

interface ReferralData {
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
  referredBy: string | null;
  referredUsers?: Array<{ id: string; email: string; createdAt: string; referralRewardClaimed: boolean }>;
}

const REFERRAL_REWARD = 10;

export function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/referral");
        if (!res.ok) throw new Error("Failed to load referral data");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        console.error("[ReferralCard] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shareUrl =
    data && typeof window !== "undefined"
      ? `${window.location.origin}/?ref=${data.referralCode}`
      : "";

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        variant: "success",
        title: "Link copied",
        description: "Your referral link is in the clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Couldn't copy",
        description: "Copy the link manually instead.",
      });
    }
  };

  const tweetUrl =
    "https://twitter.com/intent/tweet?" +
    new URLSearchParams({
      text: `I'm using SpriteLab to generate game-ready sprites in seconds. Sign up with my link and we both get bonus credits.`,
      url: shareUrl,
    }).toString();

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-6">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-white">Refer a friend</h2>
        <p className="mt-1 text-[13px] text-[#8B93A5]">
          Both of you get bonus credits when they make their first purchase.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-10 w-full animate-pulse rounded-xl bg-[#151922]" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-[76px] animate-pulse rounded-xl bg-[#151922]" />
            <div className="h-[76px] animate-pulse rounded-xl bg-[#151922]" />
          </div>
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-200">
          Couldn&apos;t load your referral data. Refresh and try again.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Share link */}
          <div>
            <label htmlFor="referral-link" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">
              Your share link
            </label>
            <div className="flex gap-2">
              <input
                id="referral-link"
                readOnly
                value={shareUrl}
                onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#151922] px-3 py-2.5 font-mono text-[12px] text-white outline-none transition-colors focus:border-[#FF8A3D]/50"
              />
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy referral link"
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-medium transition-colors ${
                  copied
                    ? "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-200"
                    : "border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="mt-2 text-[12px] text-[#8B93A5]">
              Code: <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-[#C9CFDB]">{data.referralCode}</span>
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-[#151922] p-4">
              <p className="flex items-center gap-1.5 text-[12px] text-[#8B93A5]">
                <Users className="h-3.5 w-3.5" />
                Referred
              </p>
              <p className="mt-1 font-sans tracking-tight text-[24px] font-semibold tabular-nums text-white">{data.referralCount}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#151922] p-4">
              <p className="flex items-center gap-1.5 text-[12px] text-[#8B93A5]">
                <Coins className="h-3.5 w-3.5 text-[#FF8A3D]" />
                Credits earned
              </p>
              <p className="mt-1 font-sans tracking-tight text-[24px] font-semibold tabular-nums text-[#FFB27A]">
                {data.referralEarnings}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] leading-relaxed text-[#8B93A5]">
              You earn <span className="font-mono text-[#FFB27A]">{REFERRAL_REWARD} credits</span> the first time a friend
              you referred makes a purchase. They get bonus credits at signup too.
            </p>
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <Share2 className="h-4 w-4" />
              Share on X
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
