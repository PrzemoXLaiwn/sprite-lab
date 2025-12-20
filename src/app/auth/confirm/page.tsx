"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, Rocket } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function EmailConfirmedPage() {
  const [countdown, setCountdown] = useState(5);

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
    <div className="min-h-screen flex items-center justify-center bg-[#030305]">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#c084fc]/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-md w-full mx-4">
        <div className="glass-card border border-[#2a2a3d] rounded-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-[#00ff88]/30 rounded-full blur-xl animate-pulse" />
            <div className="relative w-full h-full rounded-full bg-[#00ff88]/10 flex items-center justify-center border-2 border-[#00ff88]">
              <CheckCircle className="w-12 h-12 text-[#00ff88]" />
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold">15 free credits ready to use!</span>
          </div>

          {/* What's next */}
          <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d] mb-6 text-left">
            <div className="flex items-center gap-2 text-white font-medium mb-2">
              <Rocket className="w-4 h-4 text-[#c084fc]" />
              What's next?
            </div>
            <p className="text-sm text-[#a0a0b0]">
              We'll guide you through creating your first game asset in just 30 seconds!
            </p>
          </div>

          {/* Countdown */}
          <p className="text-sm text-[#606070] mb-4">
            Starting your journey in <span className="text-[#00ff88] font-mono font-bold">{countdown}</span>...
          </p>

          {/* CTA Button */}
          <Button asChild className="w-full h-12 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-[#030305] font-bold hover:opacity-90">
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
