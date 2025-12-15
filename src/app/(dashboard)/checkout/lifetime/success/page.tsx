"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Sparkles, Infinity, Crown } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Lifetime deal prices in GBP for conversion tracking
const dealPrices: Record<string, number> = {
  forge: 49,
  apex: 99,
  titan: 249,
};

function LifetimeSuccessContent() {
  const searchParams = useSearchParams();
  const deal = searchParams.get("deal") || "Lifetime";
  const credits = searchParams.get("credits") || "75";
  const dealId = searchParams.get("dealId") || "";
  const sessionId = searchParams.get("session_id") || "";
  const priceParam = searchParams.get("price");
  const [countdown, setCountdown] = useState(5);
  const [conversionTracked, setConversionTracked] = useState(false);

  // Google Ads Conversion Tracking with retry
  useEffect(() => {
    if (conversionTracked) return;

    // Try to get price from URL param, then from dealPrices, then default
    const value = priceParam
      ? parseFloat(priceParam)
      : dealPrices[dealId.toLowerCase()] || 49;

    const trackConversion = () => {
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "conversion", {
          send_to: "AW-17802754923/dTASCOXAhtIbEOv2galC",
          value: value,
          currency: "GBP",
          transaction_id: sessionId,
        });
        console.log("[SpriteLab] Google Ads conversion tracked:", { value, sessionId, deal });
        setConversionTracked(true);
        return true;
      }
      return false;
    };

    // Try immediately
    if (trackConversion()) return;

    // Retry every 500ms for up to 5 seconds (gtag may not be loaded yet)
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      if (trackConversion() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts) {
          console.warn("[SpriteLab] Could not track conversion - gtag not available");
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [dealId, sessionId, priceParam, conversionTracked, deal]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/generate";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-yellow-500/30 bg-gradient-to-b from-yellow-500/5 to-transparent">
        <CardContent className="pt-8 pb-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <div className="relative">
              <Crown className="w-10 h-10 text-yellow-500" />
              <Infinity className="w-5 h-5 text-yellow-500 absolute -bottom-1 -right-1" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
            Welcome to {deal}!
          </h1>

          {/* Description */}
          <p className="text-muted-foreground mb-2">
            Your lifetime access is now active.
          </p>
          <p className="text-primary font-semibold mb-2">
            +{credits} credits added to your account
          </p>
          <p className="text-sm text-yellow-500/80 mb-6">
            You'll receive {credits} credits every month, forever!
          </p>

          {/* Countdown */}
          <p className="text-sm text-muted-foreground mb-6">
            Redirecting to generator in <span className="text-primary font-medium">{countdown}</span> seconds...
          </p>

          {/* CTA Button */}
          <Button asChild className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:opacity-90 mb-4">
            <Link href="/generate">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Creating
            </Link>
          </Button>

          {/* Secondary Links */}
          <div className="flex gap-4 justify-center text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Go to Dashboard
            </Link>
            <Link href="/settings" className="text-muted-foreground hover:text-foreground">
              Account Settings
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LifetimeSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Crown className="w-8 h-8 animate-pulse text-yellow-500" />
      </div>
    }>
      <LifetimeSuccessContent />
    </Suspense>
  );
}
