"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Copy, Check, Users, Coins } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-[#FF6B2C]" />
          Refer a friend
        </CardTitle>
        <CardDescription>
          Both of you get bonus credits when they make their first purchase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-10 w-full bg-white/5 rounded animate-pulse" />
            <div className="h-16 w-full bg-white/5 rounded animate-pulse" />
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load your referral data. Refresh and try again.
          </p>
        ) : (
          <>
            {/* Share link */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Your share link
              </label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                  className="flex-1 font-mono text-xs"
                />
                <Button variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Code: <span className="font-mono">{data.referralCode}</span>
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Users className="w-3.5 h-3.5" />
                  Referred
                </div>
                <p className="text-2xl font-bold tabular-nums">{data.referralCount}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Coins className="w-3.5 h-3.5" />
                  Credits earned
                </div>
                <p className="text-2xl font-bold tabular-nums text-[#FF6B2C]">
                  {data.referralEarnings}
                </p>
              </div>
            </div>

            {/* Share button */}
            <Button
              asChild
              variant="outline"
              className="w-full"
            >
              <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
                Share on X / Twitter
              </a>
            </Button>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              You earn <strong>{REFERRAL_REWARD} credits</strong> the first time a friend
              you referred makes a purchase. They get bonus credits at signup too.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
