"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, Rocket } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function EmailConfirmedPage() {
  const [countdown, setCountdown] = useState(5);

  // Track registration conversion for TikTok
  useEffect(() => {
    // TikTok tracking removed
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to dashboard where onboarding wizard will show
          window.location.href = "/dashboard";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c10]">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF6B2C]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#8b5cf6]/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-md w-full mx-4">
        <div className="glass-card border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-[#FF6B2C]/30 rounded-full blur-xl animate-pulse" />
            <div className="relative w-full h-full rounded-full bg-[#FF6B2C]/10 flex items-center justify-center border-2 border-[#FF6B2C]">
              <CheckCircle className="w-12 h-12 text-[#FF6B2C]" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            You're In! 🎉
          </h1>

          {/* Description */}
          <p className="text-[#a0a0b0] mb-4">
            Your account is now active.
          </p>

          {/* Credits badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6B2C]/10 border border-[#FF6B2C]/30 text-[#FF6B2C] mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold">5 free credits ready to use!</span>
          </div>

          {/* What's next */}
          <div className="p-4 rounded-xl bg-[#11151b] border border-[rgba(255,255,255,0.06)] mb-6 text-left">
            <div className="flex items-center gap-2 text-white font-medium mb-2">
              <Rocket className="w-4 h-4 text-[#8b5cf6]" />
              What's next?
            </div>
            <p className="text-sm text-[#a0a0b0]">
              We'll guide you through creating your first game asset in just 30 seconds!
            </p>
          </div>

          {/* Countdown */}
          <p className="text-sm text-[#606070] mb-4">
            Starting your journey in <span className="text-[#FF6B2C] font-mono font-bold">{countdown}</span>...
          </p>

          {/* CTA Button */}
          <Button asChild className="w-full h-12 bg-gradient-to-r from-[#FF6B2C] to-[#FF6B2C] text-[#0a0c10] font-bold hover:opacity-90">
            <Link href="/dashboard">
              <Sparkles className="w-4 h-4 mr-2" />
              Let's Go!
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
