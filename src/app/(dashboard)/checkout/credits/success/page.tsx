"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Sparkles, Coins } from "lucide-react";
import Link from "next/link";

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Credit pack prices in GBP for conversion tracking
const packPrices: Record<string, number> = {
  ember: 1.19,
  blaze: 2.99,
  inferno: 7.99,
  supernova: 19.99,
  "forge-lifetime": 49,
  "apex-lifetime": 99,
  "titan-lifetime": 249,
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const credits = searchParams.get("credits") || "25";
  const packName = searchParams.get("pack") || "Credit Pack";
  const packId = searchParams.get("packId") || "";
  const sessionId = searchParams.get("session_id") || "";
  const priceParam = searchParams.get("price"); // Price passed from checkout
  const [countdown, setCountdown] = useState(5);
  const [conversionTracked, setConversionTracked] = useState(false);

  // Google Ads Conversion Tracking with retry
  useEffect(() => {
    if (conversionTracked) return;

    // Try to get price from URL param, then from packPrices, then default
    const value = priceParam
      ? parseFloat(priceParam)
      : packPrices[packId.toLowerCase()] || 1.19;

    const trackConversion = () => {
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "conversion", {
          send_to: "AW-17802754923/dTASCOXAhtIbEOv2galC",
          value: value,
          currency: "GBP",
          transaction_id: sessionId,
        });
        console.log("[SpriteLab] Google Ads conversion tracked:", { value, sessionId });
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
  }, [packId, sessionId, priceParam, conversionTracked]);

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
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">Credits Added!</h1>

          {/* Description */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-orange-500" />
            <span className="text-lg font-semibold text-orange-500">+{credits} credits</span>
          </div>
          <p className="text-muted-foreground mb-6">
            Your {packName} pack has been added to your account.
          </p>

          {/* Countdown */}
          <p className="text-sm text-muted-foreground mb-6">
            Redirecting to generator in <span className="text-primary font-medium">{countdown}</span> seconds...
          </p>

          {/* CTA Button */}
          <Button asChild className="w-full bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 mb-4">
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
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              Buy More Credits
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreditSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Coins className="w-8 h-8 animate-pulse text-orange-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
