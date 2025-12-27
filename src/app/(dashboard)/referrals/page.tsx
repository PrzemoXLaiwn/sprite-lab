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
  Clock,
  TrendingUp,
  UserPlus,
  ShoppingCart,
  Sparkles,
  ArrowRight,
  Trophy,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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

  const handleCopyLink = async () => {
    if (!data?.referralLink) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleCopyCode = async () => {
    if (!data?.referralCode) return;
    try {
      await navigator.clipboard.writeText(data.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
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
          text: "Create amazing pixel art sprites with AI! Use my referral link and we both get rewards:",
          url: data.referralLink,
        });
      } catch {
        console.log("Share cancelled");
      }
    } else {
      handleCopyLink();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#c084fc] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center py-20">
          <p className="text-white/60">Failed to load referral data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c084fc] to-[#00d4ff] flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Referral Program</h1>
            <p className="text-white/60">Invite friends, earn credits together</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
            <Users className="w-4 h-4" />
            <span>Total Referred</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.stats.totalReferred}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
            <Coins className="w-4 h-4" />
            <span>Credits Earned</span>
          </div>
          <p className="text-3xl font-bold text-[#00ff88]">{data.stats.totalEarnings}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
            <Clock className="w-4 h-4" />
            <span>Pending Rewards</span>
          </div>
          <p className="text-3xl font-bold text-[#ffd93d]">{data.stats.pendingRewards}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
            <Check className="w-4 h-4" />
            <span>Completed</span>
          </div>
          <p className="text-3xl font-bold text-[#00d4ff]">{data.stats.completedRewards}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Share Tools */}
        <div className="lg:col-span-2 space-y-6">
          {/* Referral Link Card */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#c084fc]" />
              Your Referral Link
            </h2>

            <div className="space-y-4">
              {/* Link */}
              <div>
                <label className="text-xs text-white/50 mb-2 block">Share this link with friends</label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-sm text-white/70 truncate font-mono">
                    {data.referralLink}
                  </div>
                  <Button
                    onClick={handleCopyLink}
                    className={`px-4 ${
                      copied
                        ? "bg-[#00ff88] text-[#030305]"
                        : "bg-white/10 text-white hover:bg-white/20"
                    } transition-all`}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              {/* Code */}
              <div>
                <label className="text-xs text-white/50 mb-2 block">Or share your code</label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#c084fc]/20 to-[#00d4ff]/20 border border-[#c084fc]/30 text-center">
                    <span className="text-2xl font-bold text-white tracking-widest">{data.referralCode}</span>
                  </div>
                  <Button
                    onClick={handleCopyCode}
                    className={`px-4 ${
                      copiedCode
                        ? "bg-[#00ff88] text-[#030305]"
                        : "bg-white/10 text-white hover:bg-white/20"
                    } transition-all`}
                  >
                    {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <Button
                  onClick={handleShare}
                  className="bg-gradient-to-r from-[#c084fc] to-[#00d4ff] text-white font-medium"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Create amazing pixel art sprites with AI! ✨ Use my link and we both get free credits:\n\n" + data.referralLink)}`, "_blank")}
                  className="bg-[#1DA1F2]/20 border border-[#1DA1F2]/40 text-[#1DA1F2] hover:bg-[#1DA1F2]/30"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
                <Button
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.referralLink)}`, "_blank")}
                  className="bg-[#4267B2]/20 border border-[#4267B2]/40 text-[#4267B2] hover:bg-[#4267B2]/30"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Facebook
                </Button>
                <Button
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Check out SpriteLab! Create amazing pixel art sprites with AI: " + data.referralLink)}`, "_blank")}
                  className="bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/30"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>

          {/* Referred Users */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#00d4ff]" />
              Your Referrals
              <span className="ml-auto text-sm font-normal text-white/50">
                {data.referredUsers.length} total
              </span>
            </h2>

            {data.referredUsers.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/50 mb-2">No referrals yet</p>
                <p className="text-sm text-white/30">Share your link to start earning credits!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.referredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        user.rewardClaimed
                          ? "bg-[#00ff88]/20"
                          : user.hasPurchased
                            ? "bg-[#ffd93d]/20"
                            : "bg-white/10"
                      }`}>
                        {user.rewardClaimed ? (
                          <Check className="w-5 h-5 text-[#00ff88]" />
                        ) : user.hasPurchased ? (
                          <ShoppingCart className="w-5 h-5 text-[#ffd93d]" />
                        ) : (
                          <Clock className="w-5 h-5 text-white/40" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.email}</p>
                        <p className="text-xs text-white/40">
                          Joined {new Date(user.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      {user.rewardClaimed ? (
                        <span className="px-3 py-1.5 rounded-full bg-[#00ff88]/20 text-[#00ff88] text-sm font-medium flex items-center gap-1">
                          <Coins className="w-4 h-4" />
                          +{data.rewardAmount} earned
                        </span>
                      ) : user.hasPurchased ? (
                        <span className="px-3 py-1.5 rounded-full bg-[#ffd93d]/20 text-[#ffd93d] text-sm font-medium">
                          Processing...
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/50 text-sm">
                          Awaiting purchase
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - How it Works & Rewards */}
        <div className="space-y-6">
          {/* Reward Highlight */}
          <div className="relative glass-card rounded-2xl p-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#c084fc]/20 to-[#00d4ff]/20 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ffd93d] to-[#ff9500] flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Earn Rewards</h3>
                  <p className="text-2xl font-bold text-[#ffd93d]">{data.rewardAmount} credits</p>
                </div>
              </div>
              <p className="text-sm text-white/60">
                For each friend who signs up and makes their first purchase!
              </p>
            </div>
          </div>

          {/* How it Works */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#ffd93d]" />
              How It Works
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#c084fc]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#c084fc] font-bold">1</span>
                </div>
                <div>
                  <p className="text-white font-medium">Share your link</p>
                  <p className="text-sm text-white/50">Send to friends, post on social media</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00d4ff]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#00d4ff] font-bold">2</span>
                </div>
                <div>
                  <p className="text-white font-medium">Friend signs up</p>
                  <p className="text-sm text-white/50">They create a free account</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#ffd93d]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#ffd93d] font-bold">3</span>
                </div>
                <div>
                  <p className="text-white font-medium">They make a purchase</p>
                  <p className="text-sm text-white/50">Any credit pack or subscription</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00ff88]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#00ff88] font-bold">4</span>
                </div>
                <div>
                  <p className="text-white font-medium">You get rewarded!</p>
                  <p className="text-sm text-white/50">{data.rewardAmount} credits added automatically</p>
                </div>
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#00ff88]" />
              Milestones
            </h3>
            <div className="space-y-3">
              {[
                { count: 5, reward: "50 bonus credits", reached: data.stats.completedRewards >= 5 },
                { count: 10, reward: "1 month Pro free", reached: data.stats.completedRewards >= 10 },
                { count: 25, reward: "Lifetime badge", reached: data.stats.completedRewards >= 25 },
              ].map((milestone) => (
                <div
                  key={milestone.count}
                  className={`p-3 rounded-xl border ${
                    milestone.reached
                      ? "bg-[#00ff88]/10 border-[#00ff88]/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {milestone.reached ? (
                        <Check className="w-4 h-4 text-[#00ff88]" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-white/30" />
                      )}
                      <span className={milestone.reached ? "text-[#00ff88]" : "text-white/60"}>
                        {milestone.count} referrals
                      </span>
                    </div>
                    <span className={`text-sm ${milestone.reached ? "text-[#00ff88]" : "text-white/40"}`}>
                      {milestone.reward}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/generate"
            className="block w-full p-4 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-center text-black font-bold hover:opacity-90 transition-opacity"
          >
            <span className="flex items-center justify-center gap-2">
              Start Creating
              <ArrowRight className="w-5 h-5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
