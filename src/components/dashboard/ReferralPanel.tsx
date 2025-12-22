"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Gift,
  Copy,
  Check,
  Users,
  Coins,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferredUser {
  id: string;
  email: string;
  name: string | null;
  joinedAt: string;
  hasPurchased: boolean;
  rewardClaimed: boolean;
}

interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: {
    totalReferred: number;
    totalEarnings: number;
    pendingRewards: number;
    completedRewards: number;
  };
  referredUsers: ReferredUser[];
  rewardAmount: number;
  message: string;
}

export function ReferralPanel() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

  const fetchReferralData = useCallback(async () => {
    try {
      const response = await fetch("/api/referral");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch referral data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  const handleCopy = async () => {
    if (!data?.referralLink) return;

    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleShare = async () => {
    if (!data?.referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join SpriteLab!",
          text: "Create amazing pixel art sprites with AI! Use my referral link:",
          url: data.referralLink,
        });
      } catch (error) {
        // User cancelled or share failed
        console.log("Share cancelled");
      }
    } else {
      handleCopy();
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#c084fc]/10 to-[#00d4ff]/10 border border-[#c084fc]/20">
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-[#c084fc] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="relative p-4 rounded-xl bg-gradient-to-br from-[#c084fc]/10 to-[#00d4ff]/10 border border-[#c084fc]/20 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#c084fc]/5 to-transparent pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c084fc] to-[#00d4ff] flex items-center justify-center">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Invite Friends</h3>
            <p className="text-xs text-white/50">Earn {data.rewardAmount} credits per referral</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
              <Users className="w-3 h-3" />
              <span>Referred</span>
            </div>
            <p className="text-xl font-bold text-white">{data.stats.totalReferred}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
              <Coins className="w-3 h-3" />
              <span>Earned</span>
            </div>
            <p className="text-xl font-bold text-[#00ff88]">{data.stats.totalEarnings}</p>
          </div>
        </div>

        {/* Pending rewards indicator */}
        {data.stats.pendingRewards > 0 && (
          <div className="mb-4 p-2 rounded-lg bg-[#ffd93d]/10 border border-[#ffd93d]/30">
            <div className="flex items-center gap-2 text-[#ffd93d] text-xs">
              <Clock className="w-3 h-3" />
              <span>{data.stats.pendingRewards} pending reward{data.stats.pendingRewards > 1 ? "s" : ""} (waiting for purchase)</span>
            </div>
          </div>
        )}

        {/* Referral Link */}
        <div className="mb-4">
          <label className="text-xs text-white/50 mb-1.5 block">Your Referral Link</label>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-xs text-white/70 truncate">
              {data.referralLink}
            </div>
            <Button
              onClick={handleCopy}
              size="sm"
              className={`px-3 ${
                copied
                  ? "bg-[#00ff88]/20 border-[#00ff88]/40 text-[#00ff88]"
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"
              } border transition-all`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button
            onClick={handleShare}
            className="bg-gradient-to-r from-[#c084fc] to-[#00d4ff] text-white font-medium text-sm py-2"
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            Share Link
          </Button>
          <Button
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Create amazing pixel art sprites with AI! ✨\n\n" + data.referralLink)}`, "_blank")}
            className="bg-[#1DA1F2]/20 border border-[#1DA1F2]/40 text-[#1DA1F2] font-medium text-sm py-2 hover:bg-[#1DA1F2]/30"
          >
            <ExternalLink className="w-4 h-4 mr-1.5" />
            Tweet
          </Button>
        </div>

        {/* Referred Users List */}
        {data.referredUsers.length > 0 && (
          <div>
            <button
              onClick={() => setShowUsers(!showUsers)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 transition-colors"
            >
              <span>Referred Users ({data.referredUsers.length})</span>
              {showUsers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showUsers && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {data.referredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-black/20 text-xs"
                  >
                    <div>
                      <span className="text-white/70">{user.email}</span>
                      <span className="text-white/30 ml-2">
                        {new Date(user.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      {user.rewardClaimed ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#00ff88]/20 text-[#00ff88] text-[10px]">
                          +{data.rewardAmount} earned!
                        </span>
                      ) : user.hasPurchased ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#ffd93d]/20 text-[#ffd93d] text-[10px]">
                          processing...
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/40 text-[10px]">
                          pending purchase
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* How it works */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-[10px] text-white/40 text-center">
            Share your link → Friend signs up → They make a purchase → You get {data.rewardAmount} credits!
          </p>
        </div>
      </div>
    </div>
  );
}
