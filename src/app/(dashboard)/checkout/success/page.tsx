"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Sparkles, Rocket } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Single source of truth for plan-name + credits + price metadata. Mirrors
// `PLANS` in `src/lib/stripe.ts` exactly — kept in sync because this page is
// the receipt the user reads after paying. Drift here means showing the
// wrong credit count or price after a successful charge ⇒ refunds.
const planNames: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  UNLIMITED: "Studio",
};

const planCredits: Record<string, number> = {
  STARTER: 250,
  PRO: 500,
  UNLIMITED: 1200,
};

// Plan prices in GBP — used for Google Ads conversion value, must match
// the actual Stripe charge.
const planPrices: Record<string, number> = {
  STARTER: 5.0,
  PRO: 12.0,
  UNLIMITED: 25.0,
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan")?.toUpperCase() || "STARTER";
  const sessionId = searchParams.get("session_id") || "";
  const [countdown, setCountdown] = useState(5);
  const [conversionTracked, setConversionTracked] = useState(false);

  // Google Ads Conversion Tracking with retry
  useEffect(() => {
    if (conversionTracked) return;

    const value = planPrices[plan] || 5.0;

    const trackConversion = () => {
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "conversion", {
          send_to: "AW-17802754923/dTASCOXAhtIbEOv2galC",
          value: value,
          currency: "GBP",
          transaction_id: sessionId,
        });
        console.log("[SpriteLab] Google Ads conversion tracked:", { value, sessionId, plan });
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
  }, [plan, sessionId, conversionTracked]);

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
          <h1 className="text-2xl font-bold mb-2">Welcome to {planNames[plan] || "Your Plan"}!</h1>

          {/* Description */}
          <p className="text-muted-foreground mb-2">
            Your subscription is now active.
          </p>
          <p className="text-primary font-semibold mb-6">
            +{planCredits[plan] ?? 250} credits added to your account
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
            <Link href="/assets" className="text-muted-foreground hover:text-foreground">
              My Assets
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              View Plans
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Rocket className="w-8 h-8 animate-pulse text-primary" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
